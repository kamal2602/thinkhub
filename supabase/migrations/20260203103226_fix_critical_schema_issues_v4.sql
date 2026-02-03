/*
  # Fix Critical Schema Issues - Complete System Repair
  
  ## Changes Made
  
  ### 1. Add Missing Columns
    - Assets: `processing_stage`, `is_sales_ready`
    - Contacts: `business_type` (for ITAD customer classification)
    
  ### 2. Create Missing Tables
    - `import_field_mappings` - Custom field mapping configurations
    - `suppliers` VIEW - Backward compatibility view to contacts table
    - `customers` VIEW - Backward compatibility view to contacts table
    
  ### 3. Seed Critical Reference Data
    - Processing stages (receiving → testing → refurbishment → grading → ready_to_sell)
    
  ### 4. Security
    - Enable RLS on all new tables
    - Add appropriate policies for company-scoped access
*/

-- ============================================================================
-- 1. ADD MISSING COLUMNS
-- ============================================================================

DO $$
BEGIN
  -- Add processing_stage column to assets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'processing_stage'
  ) THEN
    ALTER TABLE assets ADD COLUMN processing_stage TEXT;
    COMMENT ON COLUMN assets.processing_stage IS 'Current processing workflow stage';
  END IF;

  -- Add is_sales_ready column to assets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'is_sales_ready'
  ) THEN
    ALTER TABLE assets ADD COLUMN is_sales_ready BOOLEAN DEFAULT false;
    COMMENT ON COLUMN assets.is_sales_ready IS 'Whether asset is ready for sale';
  END IF;

  -- Add business_type column to contacts (for ITAD customers, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE contacts ADD COLUMN business_type TEXT;
    COMMENT ON COLUMN contacts.business_type IS 'Business classification (e.g., itad_service_customer, wholesale_buyer)';
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE IMPORT_FIELD_MAPPINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, field_name)
);

ALTER TABLE import_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company field mappings"
  ON import_field_mappings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage field mappings"
  ON import_field_mappings FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 3. CREATE BACKWARD COMPATIBILITY VIEWS
-- ============================================================================

-- Suppliers VIEW (contacts with type='supplier')
CREATE OR REPLACE VIEW suppliers AS
SELECT 
  id,
  company_id,
  name,
  email,
  phone,
  website,
  tax_id,
  payment_terms,
  created_at,
  updated_at,
  created_by
FROM contacts
WHERE type = 'supplier' OR type = 'both';

-- Customers VIEW (contacts with type='customer')
CREATE OR REPLACE VIEW customers AS
SELECT 
  id,
  company_id,
  name,
  email,
  phone,
  website,
  tax_id,
  business_type,
  created_at,
  updated_at,
  created_by
FROM contacts
WHERE type = 'customer' OR type = 'both';

-- ============================================================================
-- 4. SEED PROCESSING STAGES (using correct column names)
-- ============================================================================

INSERT INTO processing_stages (stage_key, stage_name, stage_order, stage_color, description, company_id, is_system_stage, is_active)
SELECT 
  stage.stage_key,
  stage.stage_name,
  stage.stage_order,
  stage.stage_color,
  stage.description,
  c.id as company_id,
  true as is_system_stage,
  true as is_active
FROM (
  SELECT 'receiving' as stage_key, 'Receiving' as stage_name, 1 as stage_order, '#3b82f6' as stage_color, 
         'Items being received and logged' as description
  UNION ALL
  SELECT 'testing', 'Testing', 2, '#8b5cf6', 'Items undergoing testing and diagnostics'
  UNION ALL
  SELECT 'refurbishment', 'Refurbishment', 3, '#f59e0b', 'Items being refurbished or repaired'
  UNION ALL
  SELECT 'grading', 'Grading', 4, '#10b981', 'Items being graded and valued'
  UNION ALL
  SELECT 'ready_to_sell', 'Ready to Sell', 5, '#06b6d4', 'Items ready for sale'
  UNION ALL
  SELECT 'sold', 'Sold', 6, '#22c55e', 'Items that have been sold'
  UNION ALL
  SELECT 'scrapped', 'Scrapped', 7, '#ef4444', 'Items scrapped or recycled'
) stage
CROSS JOIN companies c
WHERE NOT EXISTS (
  SELECT 1 FROM processing_stages WHERE company_id = c.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. UPDATE EXISTING ASSETS WITH DEFAULT VALUES
-- ============================================================================

UPDATE assets 
SET processing_stage = CASE 
  WHEN status = 'available' THEN 'ready_to_sell'
  WHEN status = 'in_testing' THEN 'testing'
  WHEN status = 'in_refurbishment' THEN 'refurbishment'
  WHEN status = 'sold' THEN 'sold'
  ELSE 'receiving'
END
WHERE processing_stage IS NULL;

UPDATE assets 
SET is_sales_ready = (
  status = 'available' 
  AND market_price IS NOT NULL 
  AND market_price > 0
)
WHERE is_sales_ready IS NULL;

-- ============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assets_processing_stage ON assets(processing_stage);
CREATE INDEX IF NOT EXISTS idx_assets_is_sales_ready ON assets(is_sales_ready);
CREATE INDEX IF NOT EXISTS idx_assets_company_processing ON assets(company_id, processing_stage);
CREATE INDEX IF NOT EXISTS idx_import_field_mappings_company ON import_field_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_business_type ON contacts(business_type);
