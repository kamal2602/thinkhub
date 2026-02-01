/*
  # Party Links System - Unified Identity Foundation

  1. Overview
    This migration creates the foundation for a unified Party identity system that prevents
    identity fragmentation across multiple engines (CRM, Auction, Website, etc.).

  2. New Tables
    - `party_links` - Mapping layer connecting source records to Party (customers/suppliers)
      - Links leads, buyer_accounts, and other identity records to core Party tables
      - Supports manual and auto-linking with confidence scores
      - One source record maps to exactly one Party (enforced by unique constraint)

  3. Entity Types Seed Data
    - Seeds `entity_types` table with standard buyer-side and seller-side roles
    - Enables flexible Party classification (prospect, customer, buyer, vendor, etc.)
    - Global types (company_id = NULL) available to all tenants

  4. Security
    - RLS enabled on party_links
    - Users can only link Parties within their company
    - Validation trigger ensures party_id references valid customer/supplier

  5. Indexes
    - Optimized for source lookup (source_type, source_id)
    - Optimized for Party lookup (party_type, party_id)
    - Supports fast resolution queries

  Notes:
    - This is ADDITIVE ONLY - no existing tables are modified
    - No data migration performed - linking is manual/optional in Phase 3
    - Backward compatible with all existing workflows
*/

-- =====================================================
-- PARTY LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS party_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Source record being linked
  source_type text NOT NULL,
  source_id uuid NOT NULL,

  -- Target Party (customer or supplier)
  party_type text NOT NULL CHECK (party_type IN ('customer', 'supplier')),
  party_id uuid NOT NULL,

  -- Link metadata
  linked_at timestamptz DEFAULT now(),
  linked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  link_method text DEFAULT 'manual' CHECK (link_method IN ('manual', 'auto', 'import', 'suggested')),
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  notes text,

  created_at timestamptz DEFAULT now(),

  -- One source record can only link to one Party
  UNIQUE(company_id, source_type, source_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_party_links_company ON party_links(company_id);
CREATE INDEX IF NOT EXISTS idx_party_links_source ON party_links(company_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_party_links_party ON party_links(company_id, party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_party_links_method ON party_links(link_method) WHERE link_method = 'suggested';

-- =====================================================
-- VALIDATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION validate_party_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that party_id references an actual customer or supplier in the same company
  IF NEW.party_type = 'customer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM customers
      WHERE id = NEW.party_id
        AND company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Invalid customer party_id: % for company: %', NEW.party_id, NEW.company_id;
    END IF;
  ELSIF NEW.party_type = 'supplier' THEN
    IF NOT EXISTS (
      SELECT 1 FROM suppliers
      WHERE id = NEW.party_id
        AND company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Invalid supplier party_id: % for company: %', NEW.party_id, NEW.company_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid party_type: %', NEW.party_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_party_link_trigger
  BEFORE INSERT OR UPDATE ON party_links
  FOR EACH ROW EXECUTE FUNCTION validate_party_link();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE party_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view party links in their company"
  ON party_links FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create party links in their company"
  ON party_links FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update party links in their company"
  ON party_links FOR UPDATE
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

CREATE POLICY "Users can delete party links in their company"
  ON party_links FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- SEED ENTITY TYPES (STANDARD PARTY CLASSIFICATIONS)
-- =====================================================

-- Buyer-side entity types (customer roles)
INSERT INTO entity_types (company_id, entity_class, business_type, description, is_active)
VALUES
  (NULL, 'customer', 'sales_customer', 'Direct B2B customer purchasing equipment', true),
  (NULL, 'customer', 'itad_client', 'Customer using ITAD services for asset disposal', true),
  (NULL, 'customer', 'prospect', 'Potential customer (CRM lead, not yet converted)', true),
  (NULL, 'customer', 'auction_buyer', 'Registered auction participant/bidder', true),
  (NULL, 'customer', 'website_customer', 'eCommerce online customer', true),
  (NULL, 'customer', 'distributor', 'Resale partner or distribution channel', true),
  (NULL, 'customer', 'end_user', 'Final consumer of products', true),
  (NULL, 'customer', 'consignment_client', 'Customer selling equipment on consignment', true)
ON CONFLICT DO NOTHING;

-- Seller-side entity types (supplier roles)
INSERT INTO entity_types (company_id, entity_class, business_type, description, is_active)
VALUES
  (NULL, 'supplier', 'purchase_vendor', 'Direct equipment supplier', true),
  (NULL, 'supplier', 'consignment_vendor', 'Consignment partner providing goods', true),
  (NULL, 'supplier', 'downstream_recycler', 'Materials/components buyer for recycling', true),
  (NULL, 'supplier', 'service_provider', 'External service contractor', true),
  (NULL, 'supplier', 'manufacturer', 'Original equipment manufacturer (OEM)', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- HELPER VIEWS (OPTIONAL)
-- =====================================================

-- View to see Party with all linked source records
CREATE OR REPLACE VIEW party_unified_view AS
SELECT
  c.id AS party_id,
  'customer' AS party_type,
  c.company_id,
  c.name,
  c.email,
  c.phone,
  c.entity_type,
  json_agg(
    json_build_object(
      'link_id', pl.id,
      'source_type', pl.source_type,
      'source_id', pl.source_id,
      'linked_at', pl.linked_at,
      'link_method', pl.link_method,
      'confidence_score', pl.confidence_score
    )
  ) FILTER (WHERE pl.id IS NOT NULL) AS linked_records
FROM customers c
LEFT JOIN party_links pl ON pl.party_id = c.id AND pl.party_type = 'customer'
GROUP BY c.id, c.company_id, c.name, c.email, c.phone, c.entity_type

UNION ALL

SELECT
  s.id AS party_id,
  'supplier' AS party_type,
  s.company_id,
  s.name,
  s.email,
  s.phone,
  s.entity_type,
  json_agg(
    json_build_object(
      'link_id', pl.id,
      'source_type', pl.source_type,
      'source_id', pl.source_id,
      'linked_at', pl.linked_at,
      'link_method', pl.link_method,
      'confidence_score', pl.confidence_score
    )
  ) FILTER (WHERE pl.id IS NOT NULL) AS linked_records
FROM suppliers s
LEFT JOIN party_links pl ON pl.party_id = s.id AND pl.party_type = 'supplier'
GROUP BY s.id, s.company_id, s.name, s.email, s.phone, s.entity_type;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE party_links IS 'Mapping layer connecting source identity records (leads, buyer_accounts, etc.) to core Party tables (customers/suppliers). Prevents identity fragmentation across engines.';
COMMENT ON COLUMN party_links.source_type IS 'Type of source record: lead, buyer_account, portal_user, website_customer, etc.';
COMMENT ON COLUMN party_links.source_id IS 'Primary key of the source record being linked';
COMMENT ON COLUMN party_links.party_type IS 'Target Party type: customer (buyer-side) or supplier (seller-side)';
COMMENT ON COLUMN party_links.party_id IS 'Primary key of the target Party (customers.id or suppliers.id)';
COMMENT ON COLUMN party_links.link_method IS 'How the link was created: manual (admin), auto (system), import (batch), suggested (pending review)';
COMMENT ON COLUMN party_links.confidence_score IS 'For auto/suggested links: matching confidence from 0.00 to 1.00';

COMMENT ON VIEW party_unified_view IS 'Unified view of all Parties (customers + suppliers) with their linked source records. Use for reporting and analytics.';