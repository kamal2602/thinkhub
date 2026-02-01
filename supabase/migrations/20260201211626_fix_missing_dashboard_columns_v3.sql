/*
  # Fix Missing Dashboard Columns

  1. Adds Missing Columns
    - sales_invoices.cost_amount (numeric) - Total cost of goods sold
    - purchase_lots.total_revenue (numeric) - Total revenue from lot
    - purchase_lots.profit_margin (numeric) - Calculated profit percentage
  
  2. Creates CRM Tables
    - crm_leads table for lead tracking
    - crm_opportunities table for opportunity tracking
  
  3. Safety
    - Uses IF NOT EXISTS checks
    - Adds columns only if missing
    - No data deletion
*/

-- Add cost_amount to sales_invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'cost_amount'
  ) THEN
    ALTER TABLE sales_invoices 
    ADD COLUMN cost_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add total_revenue to purchase_lots if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_lots' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE purchase_lots 
    ADD COLUMN total_revenue numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add profit_margin to purchase_lots if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_lots' AND column_name = 'profit_margin'
  ) THEN
    ALTER TABLE purchase_lots 
    ADD COLUMN profit_margin numeric(5,2) DEFAULT 0;
  END IF;
END $$;

-- Create crm_leads table if not exists
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  status text DEFAULT 'new',
  source text,
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS for crm_leads
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view leads in their company" ON crm_leads;
CREATE POLICY "Users can view leads in their company"
  ON crm_leads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert leads in their company" ON crm_leads;
CREATE POLICY "Users can insert leads in their company"
  ON crm_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update leads in their company" ON crm_leads;
CREATE POLICY "Users can update leads in their company"
  ON crm_leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete leads in their company" ON crm_leads;
CREATE POLICY "Users can delete leads in their company"
  ON crm_leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create crm_opportunities table if not exists
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  customer_id uuid REFERENCES customers(id),
  value numeric(10,2),
  stage text DEFAULT 'qualification',
  probability numeric(3,0) DEFAULT 0,
  expected_close_date date,
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS for crm_opportunities
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view opportunities in their company" ON crm_opportunities;
CREATE POLICY "Users can view opportunities in their company"
  ON crm_opportunities FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert opportunities in their company" ON crm_opportunities;
CREATE POLICY "Users can insert opportunities in their company"
  ON crm_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update opportunities in their company" ON crm_opportunities;
CREATE POLICY "Users can update opportunities in their company"
  ON crm_opportunities FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete opportunities in their company" ON crm_opportunities;
CREATE POLICY "Users can delete opportunities in their company"
  ON crm_opportunities FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_company ON crm_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_company ON crm_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);
