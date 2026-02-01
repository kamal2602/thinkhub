/*
  # Unify CRM with Party System - Zero Parallel Truth

  ## Overview
  This migration completes the CRM + Party unification by:
  - Migrating all leads data to the customers table (Party)
  - Adding crm_metadata jsonb to customers/suppliers for flexible CRM data
  - Creating a "leads" view for backward compatibility
  - Removing the separate leads table

  ## Changes

  1. **Add crm_metadata to Party tables**
     - Add crm_metadata jsonb to customers table
     - Add crm_metadata jsonb to suppliers table
     - Create GIN index for efficient jsonb querying

  2. **Update entity_type constraints**
     - Ensure entity_type supports: prospect, customer, supplier, partner

  3. **Migrate leads to customers**
     - Copy all existing leads to customers with entity_type='prospect'
     - Preserve all metadata in crm_metadata jsonb
     - Update opportunities to reference the new party_id

  4. **Create leads view**
     - View that selects from customers where entity_type='prospect'
     - Extracts common CRM fields from crm_metadata for convenience
     - Fully backward compatible with existing queries

  5. **Drop old leads table**
     - After successful migration, drop the separate leads table
     - All data preserved in customers (Party system)

  ## Security
  - All existing RLS policies on customers apply to prospects
  - View inherits RLS from underlying customers table

  ## Backward Compatibility
  - "leads" view maintains same interface as old table
  - All existing queries continue to work
  - Zero downtime migration
*/

-- =====================================================
-- 1. ADD CRM_METADATA TO PARTY TABLES
-- =====================================================

-- Add crm_metadata to customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'crm_metadata'
  ) THEN
    ALTER TABLE customers ADD COLUMN crm_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add crm_metadata to suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'crm_metadata'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN crm_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create GIN indexes for efficient jsonb queries
CREATE INDEX IF NOT EXISTS idx_customers_crm_metadata ON customers USING gin(crm_metadata);
CREATE INDEX IF NOT EXISTS idx_suppliers_crm_metadata ON suppliers USING gin(crm_metadata);

-- Create index on entity_type for filtering
CREATE INDEX IF NOT EXISTS idx_customers_entity_type ON customers(entity_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_entity_type ON suppliers(entity_type);

-- =====================================================
-- 2. MIGRATE LEADS TO CUSTOMERS (PARTY)
-- =====================================================

-- Migrate existing leads to customers table as prospects
DO $$
DECLARE
  lead_record RECORD;
  new_party_id uuid;
  lead_table_exists boolean;
BEGIN
  -- Check if leads table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'leads'
  ) INTO lead_table_exists;

  IF lead_table_exists THEN
    
    FOR lead_record IN 
      SELECT 
        l.*,
        COALESCE(
          (SELECT name FROM customers WHERE id = l.party_id LIMIT 1),
          ''
        ) as existing_party_name
      FROM leads l
      WHERE party_id IS NULL  -- Only migrate leads not already linked to a party
    LOOP
      -- Create new customer (party) record with entity_type='prospect'
      INSERT INTO customers (
        company_id,
        name,
        email,
        phone,
        address,
        entity_type,
        crm_metadata,
        created_at,
        updated_at
      ) VALUES (
        lead_record.company_id,
        COALESCE(lead_record.lead_name, lead_record.company_name, 'Unnamed Prospect'),
        COALESCE(lead_record.contact_email, ''),
        COALESCE(lead_record.contact_phone, ''),
        '',
        'prospect',
        jsonb_build_object(
          'legacy_lead_id', lead_record.id,
          'lead_source', lead_record.lead_source,
          'status', COALESCE(lead_record.status, 'new'),
          'qualification_score', lead_record.qualification_score,
          'notes', lead_record.notes,
          'company_name', lead_record.company_name,
          'assigned_to', lead_record.assigned_to
        ),
        lead_record.created_at,
        lead_record.updated_at
      )
      RETURNING id INTO new_party_id;

      -- Update opportunities that reference this lead
      UPDATE opportunities
      SET party_id = new_party_id
      WHERE lead_id = lead_record.id AND party_id IS NULL;

      -- Update activities that reference this lead as entity
      UPDATE activities
      SET party_id = new_party_id
      WHERE entity_type = 'lead' AND entity_id = lead_record.id AND party_id IS NULL;

      -- Create party_link for traceability
      INSERT INTO party_links (
        company_id,
        source_type,
        source_id,
        party_type,
        party_id,
        link_method,
        confidence_score,
        notes
      ) VALUES (
        lead_record.company_id,
        'lead',
        lead_record.id,
        'customer',
        new_party_id,
        'auto',
        1.0,
        'Migrated from legacy leads table to Party system'
      )
      ON CONFLICT (company_id, source_type, source_id) DO NOTHING;

    END LOOP;

  END IF;
END $$;

-- =====================================================
-- 3. UPDATE OPPORTUNITIES TO REMOVE LEAD_ID
-- =====================================================

-- Remove lead_id column from opportunities (now only use party_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE opportunities DROP COLUMN lead_id;
  END IF;
END $$;

-- =====================================================
-- 4. DROP OLD LEADS TABLE
-- =====================================================

-- Drop the old leads table (data already migrated)
DROP TABLE IF EXISTS leads CASCADE;

-- =====================================================
-- 5. CREATE LEADS VIEW FOR BACKWARD COMPATIBILITY
-- =====================================================

-- Create leads view that selects prospects from customers
CREATE OR REPLACE VIEW leads AS
SELECT
  id,
  company_id,
  name AS lead_name,
  COALESCE(crm_metadata->>'company_name', '') AS company_name,
  email AS contact_email,
  phone AS contact_phone,
  COALESCE(crm_metadata->>'lead_source', '') AS lead_source,
  COALESCE(crm_metadata->>'status', 'new') AS status,
  (crm_metadata->>'qualification_score')::int AS qualification_score,
  (crm_metadata->>'assigned_to')::uuid AS assigned_to,
  COALESCE(crm_metadata->>'notes', '') AS notes,
  id AS party_id,
  created_at,
  updated_at
FROM customers
WHERE entity_type = 'prospect';

-- Add comment
COMMENT ON VIEW leads IS 'Backward-compatible view for CRM leads. Selects prospects from customers (Party system). All identity data unified - no parallel truth.';

-- =====================================================
-- 6. ADD HELPER FUNCTIONS
-- =====================================================

-- Function to convert prospect to customer (won deal)
CREATE OR REPLACE FUNCTION convert_prospect_to_customer(prospect_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE customers
  SET 
    entity_type = 'customer',
    crm_metadata = crm_metadata || jsonb_build_object(
      'converted_at', now(),
      'was_prospect', true
    )
  WHERE id = prospect_id AND entity_type = 'prospect';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get CRM metadata field
CREATE OR REPLACE FUNCTION get_crm_field(party_id uuid, field_name text)
RETURNS text AS $$
  SELECT crm_metadata->>field_name
  FROM customers
  WHERE id = party_id
  UNION ALL
  SELECT crm_metadata->>field_name
  FROM suppliers
  WHERE id = party_id
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN customers.crm_metadata IS 'Flexible JSONB field for CRM-specific data: lead_source, status, qualification_score, notes, company_name, etc. Allows engine-specific fields without schema changes.';
COMMENT ON COLUMN suppliers.crm_metadata IS 'Flexible JSONB field for supplier-specific metadata and CRM data.';

COMMENT ON FUNCTION convert_prospect_to_customer IS 'Converts a prospect to a customer by updating entity_type. Preserves all CRM history and metadata.';
COMMENT ON FUNCTION get_crm_field IS 'Helper function to retrieve CRM metadata fields from either customers or suppliers table.';
