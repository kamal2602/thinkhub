/*
  # Add Engine Toggle Flags to Companies

  This migration adds boolean flags to the companies table to enable/disable
  different business engines (modules) per company.

  ## Changes
  1. Add engine toggle columns to companies table
  2. Set intelligent defaults based on existing data
  3. Add indexes for performance

  ## Backward Compatibility
  - All new columns have default values
  - Existing queries continue to work
  - No breaking changes
*/

-- Add engine toggle columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reseller_enabled boolean DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS itad_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS recycling_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auction_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS crm_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS consignment_enabled boolean DEFAULT false;

-- Intelligently enable flags based on existing usage
-- If company has ITAD projects, enable ITAD engine
UPDATE companies
SET itad_enabled = true
WHERE id IN (
  SELECT DISTINCT company_id
  FROM itad_projects
  WHERE company_id IS NOT NULL
);

-- If company has auction lots, enable auction engine
UPDATE companies
SET auction_enabled = true
WHERE id IN (
  SELECT DISTINCT company_id
  FROM auction_lots
  WHERE company_id IS NOT NULL
);

-- If company has harvested components, enable recycling engine
UPDATE companies
SET recycling_enabled = true
WHERE id IN (
  SELECT DISTINCT company_id
  FROM harvested_components_inventory
  WHERE company_id IS NOT NULL
  GROUP BY company_id
  HAVING COUNT(*) > 0
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_engine_flags
ON companies(reseller_enabled, itad_enabled, recycling_enabled, auction_enabled);

-- Add comments for documentation
COMMENT ON COLUMN companies.reseller_enabled IS 'Enable IT reseller features (purchases, refurbishment, sales)';
COMMENT ON COLUMN companies.itad_enabled IS 'Enable ITAD service features (data sanitization, certificates, compliance)';
COMMENT ON COLUMN companies.recycling_enabled IS 'Enable recycling features (component harvesting, material tracking)';
COMMENT ON COLUMN companies.auction_enabled IS 'Enable auction features (lot management, bid tracking)';
COMMENT ON COLUMN companies.website_enabled IS 'Enable eCommerce storefront (public catalog, shopping cart)';
COMMENT ON COLUMN companies.crm_enabled IS 'Enable CRM features (leads, opportunities, activities)';
COMMENT ON COLUMN companies.consignment_enabled IS 'Enable consignment features (customer-owned inventory)';