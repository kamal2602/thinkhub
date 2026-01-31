/*
  # Add Scrap Tracking and Lot Closure System
  
  1. Asset Scrap Tracking
    - Add scrap_date, scrap_reason, scrap_value columns to assets
    - Support tracking when assets are scrapped for parts or disposal
  
  2. Lot Closure Management
    - Add status field to purchase_lots (open, processing, closed)
    - Add closed_date, final_profit, final_roi_percent for lot finalization
    - Track when a lot is fully processed and closed
  
  3. Processing Stages Management
    - Create processing_stages table for customizable workflow stages
    - Allow companies to define their own processing workflow
    - Support ordering, color coding, and stage types
    - Pre-populate with default stages including new "Awaiting Parts" and "Scrapped"
  
  4. Security
    - Enable RLS on processing_stages
    - Add policies for company-specific stage management
*/

-- Add scrap tracking to assets
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS scrap_date DATE,
ADD COLUMN IF NOT EXISTS scrap_reason TEXT,
ADD COLUMN IF NOT EXISTS scrap_value NUMERIC DEFAULT 0;

-- Add lot closure tracking
ALTER TABLE purchase_lots
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
ADD COLUMN IF NOT EXISTS closed_date DATE,
ADD COLUMN IF NOT EXISTS final_profit NUMERIC,
ADD COLUMN IF NOT EXISTS final_roi_percent NUMERIC;

-- Add check constraint for lot status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'purchase_lots_status_check'
  ) THEN
    ALTER TABLE purchase_lots 
    ADD CONSTRAINT purchase_lots_status_check 
    CHECK (status IN ('open', 'processing', 'closed'));
  END IF;
END $$;

-- Create processing_stages table
CREATE TABLE IF NOT EXISTS processing_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  stage_color TEXT NOT NULL DEFAULT 'gray',
  stage_type TEXT NOT NULL DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  is_system_stage BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, stage_key)
);

-- Add check constraint for stage type
ALTER TABLE processing_stages
ADD CONSTRAINT processing_stages_stage_type_check 
CHECK (stage_type IN ('standard', 'awaiting', 'complete', 'scrapped'));

-- Enable RLS
ALTER TABLE processing_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for processing_stages
CREATE POLICY "Users can view own company processing stages"
  ON processing_stages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert processing stages"
  ON processing_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update processing stages"
  ON processing_stages FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete non-system processing stages"
  ON processing_stages FOR DELETE
  TO authenticated
  USING (
    is_system_stage = false AND
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Function to populate default processing stages for new companies
CREATE OR REPLACE FUNCTION create_default_processing_stages(p_company_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO processing_stages (company_id, stage_name, stage_key, stage_order, stage_color, stage_type, is_system_stage, created_by)
  VALUES
    (p_company_id, 'Received', 'received', 1, 'blue', 'standard', true, p_user_id),
    (p_company_id, 'Testing', 'testing', 2, 'yellow', 'standard', true, p_user_id),
    (p_company_id, 'Refurbishing', 'refurbishing', 3, 'orange', 'standard', true, p_user_id),
    (p_company_id, 'Awaiting Parts', 'awaiting_parts', 4, 'purple', 'awaiting', true, p_user_id),
    (p_company_id, 'QC/Grading', 'qc_grading', 5, 'teal', 'standard', true, p_user_id),
    (p_company_id, 'Ready for Sale', 'ready', 6, 'green', 'complete', true, p_user_id),
    (p_company_id, 'Scrapped', 'scrapped', 7, 'red', 'scrapped', true, p_user_id)
  ON CONFLICT (company_id, stage_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Populate default stages for existing companies
DO $$
DECLARE
  company_record RECORD;
  first_user_id UUID;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    SELECT user_id INTO first_user_id
    FROM user_company_access
    WHERE company_id = company_record.id
    AND role IN ('admin', 'manager')
    LIMIT 1;
    
    IF first_user_id IS NULL THEN
      SELECT user_id INTO first_user_id
      FROM user_company_access
      WHERE company_id = company_record.id
      LIMIT 1;
    END IF;
    
    IF first_user_id IS NOT NULL THEN
      PERFORM create_default_processing_stages(company_record.id, first_user_id);
    END IF;
  END LOOP;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_stages_company_id ON processing_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_processing_stages_stage_order ON processing_stages(company_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_assets_scrap_date ON assets(scrap_date) WHERE scrap_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_lots_status ON purchase_lots(status);