/*
  # Create CRM Tables

  This migration creates tables for the CRM engine including leads, opportunities, and activities.

  ## Tables Created
  1. leads - Potential customers and prospects
  2. opportunities - Sales pipeline tracking
  3. activities - CRM interactions (calls, emails, meetings)
  4. quotes - Pre-sales quote documents

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  lead_name text NOT NULL,
  company_name text,
  contact_email text,
  contact_phone text,
  lead_source text,
  status text DEFAULT 'new',
  qualification_score int,
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES customers(id),
  opportunity_name text NOT NULL,
  value_estimate numeric(12,2),
  probability_percent int,
  stage text DEFAULT 'prospecting',
  expected_close_date date,
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  activity_type text NOT NULL,
  subject text NOT NULL,
  description text,
  entity_type text,
  entity_id uuid,
  assigned_to uuid REFERENCES profiles(id),
  completed_at timestamptz,
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  quote_number text NOT NULL,
  customer_id uuid REFERENCES customers(id),
  lead_id uuid REFERENCES leads(id),
  opportunity_id uuid REFERENCES opportunities(id),
  quote_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  total_amount numeric(12,2),
  status text DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, quote_number)
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Users can view leads in their company"
  ON leads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create leads in their company"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can update leads in their company"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can delete leads in their company"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for opportunities
CREATE POLICY "Users can view opportunities in their company"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create opportunities in their company"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can update opportunities in their company"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can delete opportunities in their company"
  ON opportunities FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for activities
CREATE POLICY "Users can view activities in their company"
  ON activities FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities in their company"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update activities in their company"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete activities in their company"
  ON activities FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for quotes
CREATE POLICY "Users can view quotes in their company"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quotes in their company"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can update quotes in their company"
  ON quotes FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can delete quotes in their company"
  ON quotes FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);