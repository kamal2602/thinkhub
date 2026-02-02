/*
  # Eliminate Parallel Truth: Rename Party to Contacts (Odoo-Style)
  
  This migration eliminates parallel truth by:
  1. DROPPING legacy tables (contacts, customers, suppliers)  
  2. Renaming parties → contacts (single source of truth)
  3. Adding Odoo-style fields (type: company/individual, parent_contact_id)
  4. Creating contact_roles table (replaces boolean flags)
  5. Updating all foreign keys and references
  
  ## Tables Being Eliminated (Legacy Parallel Truth)
    - contacts (person contacts - DROPPING)
    - customers (companies - DROPPING)
    - suppliers (companies - DROPPING)
  
  ## Single Source of Truth
    - parties (unified) → contacts (renamed)
    - contact_roles (new role system)
  
  ## Odoo-Style Behavior
    - type: 'company' or 'individual'
    - parent_contact_id: individuals can belong to companies
    - Roles via contact_roles table (customer, vendor, etc.)
  
  IMPORTANT: No data exists, safe to DROP and RENAME
*/

-- ============================================================================
-- STEP 1: DROP ALL VIEWS THAT MIGHT DEPEND ON TABLES WE'RE MODIFYING
-- ============================================================================

DROP VIEW IF EXISTS party_unified_view CASCADE;
DROP VIEW IF EXISTS buyer_accounts_read_only CASCADE;
DROP VIEW IF EXISTS contacts_with_roles CASCADE;

-- ============================================================================
-- STEP 2: DROP LEGACY PARALLEL TRUTH TABLES
-- ============================================================================

-- These are the old separate tables that violate "NO PARALLEL TRUTH"
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- ============================================================================
-- STEP 3: RENAME PARTIES → CONTACTS (SINGLE SOURCE OF TRUTH)
-- ============================================================================

ALTER TABLE parties RENAME TO contacts;

-- Rename columns
ALTER TABLE contacts RENAME COLUMN party_code TO contact_code;
ALTER TABLE contacts RENAME COLUMN party_type TO type;

-- ============================================================================
-- STEP 4: RENAME PARTY_LINKS → CONTACT_LINKS
-- ============================================================================

ALTER TABLE party_links RENAME TO contact_links;
ALTER TABLE contact_links RENAME COLUMN party_id TO contact_id;
ALTER TABLE contact_links RENAME COLUMN party_type TO contact_type;

-- ============================================================================
-- STEP 5: RENAME PARTY_ID → CONTACT_ID IN ALL REFERENCING TABLES
-- ============================================================================

-- CRM tables
ALTER TABLE IF EXISTS activities RENAME COLUMN party_id TO contact_id;
ALTER TABLE IF EXISTS leads RENAME COLUMN party_id TO contact_id;
ALTER TABLE IF EXISTS opportunities RENAME COLUMN party_id TO contact_id;

-- Auction tables
ALTER TABLE IF EXISTS bids RENAME COLUMN party_id TO contact_id;

-- ============================================================================
-- STEP 6: ADD ODOO-STYLE FIELDS TO CONTACTS
-- ============================================================================

-- Parent contact for individuals under companies
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS parent_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- Soft delete
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false NOT NULL;

-- Display name (auto-computed)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS display_name text;

-- ============================================================================
-- STEP 7: UPDATE TYPE COLUMN TO USE ODOO VALUES
-- ============================================================================

-- Set default to 'company'
ALTER TABLE contacts
ALTER COLUMN type SET DEFAULT 'company';

-- Drop existing constraint if it exists
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;

-- Add new constraint for Odoo-style types
ALTER TABLE contacts
ADD CONSTRAINT contacts_type_check
CHECK (type IN ('company', 'individual'));

-- ============================================================================
-- STEP 8: CREATE CONTACT_ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role_key text NOT NULL CHECK (role_key IN (
    'customer',
    'vendor',
    'carrier',
    'broker',
    'recycler',
    'bidder',
    'consignor',
    'internal'
  )),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id),
  CONSTRAINT contact_roles_unique_contact_role UNIQUE(contact_id, role_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_roles_contact_id ON contact_roles(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_roles_role_key ON contact_roles(role_key);
CREATE INDEX IF NOT EXISTS idx_contact_roles_company_id ON contact_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_contact_roles_active ON contact_roles(contact_id, role_key) WHERE is_active = true;

-- ============================================================================
-- STEP 9: DROP OLD BOOLEAN ROLE COLUMNS FROM CONTACTS
-- ============================================================================

ALTER TABLE contacts DROP COLUMN IF EXISTS is_customer;
ALTER TABLE contacts DROP COLUMN IF EXISTS is_supplier;
ALTER TABLE contacts DROP COLUMN IF EXISTS is_carrier;
ALTER TABLE contacts DROP COLUMN IF EXISTS is_broker;

-- ============================================================================
-- STEP 10: CREATE INDEXES FOR CONTACTS
-- ============================================================================

-- Unique constraint on contact_code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_company_contact_code 
ON contacts(company_id, contact_code);

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_contacts_parent_contact_id ON contacts(parent_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_archived ON contacts(is_archived);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active) WHERE NOT is_archived;

-- ============================================================================
-- STEP 11: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 12: DROP OLD POLICIES AND CREATE NEW ONES
-- ============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view parties in their company" ON contacts;
DROP POLICY IF EXISTS "Users can insert parties in their company" ON contacts;
DROP POLICY IF EXISTS "Users can update parties in their company" ON contacts;
DROP POLICY IF EXISTS "Users can delete parties in their company" ON contacts;

DROP POLICY IF EXISTS "Users can view contacts in their company" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their company" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their company" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their company" ON contacts;

-- Contacts policies
CREATE POLICY "Users can view contacts in their company"
ON contacts FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert contacts in their company"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update contacts in their company"
ON contacts FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete contacts in their company"
ON contacts FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Contact Links policies
DROP POLICY IF EXISTS "Users can view contact links in their company" ON contact_links;
DROP POLICY IF EXISTS "Users can insert contact links in their company" ON contact_links;
DROP POLICY IF EXISTS "Users can update contact links in their company" ON contact_links;
DROP POLICY IF EXISTS "Users can delete contact links in their company" ON contact_links;

CREATE POLICY "Users can view contact links in their company"
ON contact_links FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert contact links in their company"
ON contact_links FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update contact links in their company"
ON contact_links FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete contact links in their company"
ON contact_links FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Contact Roles policies
CREATE POLICY "Users can view contact roles in their company"
ON contact_roles FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert contact roles in their company"
ON contact_roles FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update contact roles in their company"
ON contact_roles FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete contact roles in their company"
ON contact_roles FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- STEP 13: CREATE HELPER VIEWS
-- ============================================================================

-- View: Contacts with their roles aggregated
CREATE OR REPLACE VIEW contacts_with_roles AS
SELECT 
  c.*,
  COALESCE(
    array_agg(DISTINCT cr.role_key ORDER BY cr.role_key) FILTER (WHERE cr.role_key IS NOT NULL AND cr.is_active = true),
    ARRAY[]::text[]
  ) as roles
FROM contacts c
LEFT JOIN contact_roles cr ON c.id = cr.contact_id
GROUP BY c.id;

-- View: Companies only
CREATE OR REPLACE VIEW companies_view AS
SELECT * FROM contacts
WHERE type = 'company' AND NOT is_archived;

-- View: Individuals only
CREATE OR REPLACE VIEW individuals_view AS
SELECT * FROM contacts
WHERE type = 'individual' AND NOT is_archived;

-- View: Customers (with customer role)
CREATE OR REPLACE VIEW customers_view AS
SELECT DISTINCT c.*
FROM contacts c
JOIN contact_roles cr ON c.id = cr.contact_id
WHERE cr.role_key = 'customer'
  AND cr.is_active = true
  AND NOT c.is_archived;

-- View: Vendors (with vendor role)
CREATE OR REPLACE VIEW vendors_view AS
SELECT DISTINCT c.*
FROM contacts c
JOIN contact_roles cr ON c.id = cr.contact_id
WHERE cr.role_key = 'vendor'
  AND cr.is_active = true
  AND NOT c.is_archived;

-- ============================================================================
-- STEP 14: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Get display name (auto-computed if not set)
CREATE OR REPLACE FUNCTION get_contact_display_name(contact_row contacts)
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    contact_row.display_name,
    contact_row.name,
    contact_row.legal_name,
    contact_row.contact_code
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if contact has specific role
CREATE OR REPLACE FUNCTION contact_has_role(
  p_contact_id uuid,
  p_role_key text
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM contact_roles
    WHERE contact_id = p_contact_id
      AND role_key = p_role_key
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get child contacts (individuals under a company)
CREATE OR REPLACE FUNCTION get_child_contacts(p_contact_id uuid)
RETURNS TABLE (
  id uuid,
  contact_code text,
  name text,
  email text,
  phone text,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.contact_code,
    c.name,
    c.email,
    c.phone,
    c.is_active
  FROM contacts c
  WHERE c.parent_contact_id = p_contact_id
    AND NOT c.is_archived
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 15: CREATE TRIGGERS
-- ============================================================================

-- Trigger: Auto-update display_name
CREATE OR REPLACE FUNCTION update_contact_display_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := COALESCE(NEW.name, NEW.legal_name, NEW.contact_code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_display_name ON contacts;
CREATE TRIGGER trigger_update_contact_display_name
BEFORE INSERT OR UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_contact_display_name();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contacts_updated_at ON contacts;
CREATE TRIGGER trigger_update_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- ELIMINATED (Parallel Truth):
--   contacts table (person contacts)
--   customers table (companies)
--   suppliers table (companies)

-- SINGLE SOURCE OF TRUTH:
--   parties → contacts (renamed, unified)
--   contact_roles (role-based system)

-- ODOO-STYLE FEATURES:
--   type: 'company' or 'individual'
--   parent_contact_id: individuals can belong to companies
--   Roles via contact_roles (customer, vendor, etc.)

-- RENAMED COLUMNS:
--   party_code → contact_code
--   party_type → type
--   party_id → contact_id (in all referencing tables)

-- NEW FIELDS:
--   parent_contact_id, is_archived, display_name

-- HELPERS:
--   Views: contacts_with_roles, companies_view, individuals_view, customers_view, vendors_view
--   Functions: get_contact_display_name(), contact_has_role(), get_child_contacts()
