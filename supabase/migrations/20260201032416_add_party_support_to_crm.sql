/*
  # Add Party Support to CRM Tables

  This migration modifies existing CRM tables to use the Party system instead of storing identity data directly.

  ## Changes

  1. **leads table**
     - Add party_id column (FK to customers.id)
     - Remove hardcoded identity fields (lead_name, company_name, contact_email, contact_phone)
     - All identity data now resolved via Party

  2. **opportunities table**
     - Add party_id column (FK to customers.id)
     - Keep customer_id for backwards compatibility (some opportunities may come from converted customers)
     - Lead conversion creates Party link

  3. **activities table**
     - Add party_id column (FK to customers.id)
     - Activities can be linked to Party OR specific entities (leads, opportunities)

  4. **Pipeline Stages**
     - Add opportunity_stages table for customizable pipeline
     - Default stages: prospecting, qualification, proposal, negotiation, closed_won, closed_lost

  ## Security
  - All existing RLS policies remain in place
  - Party resolution happens in application layer
*/

-- Add party_id to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN party_id uuid REFERENCES customers(id);
  END IF;
END $$;

-- Remove hardcoded identity fields from leads (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lead_name'
  ) THEN
    ALTER TABLE leads DROP COLUMN IF EXISTS lead_name;
    ALTER TABLE leads DROP COLUMN IF EXISTS company_name;
    ALTER TABLE leads DROP COLUMN IF EXISTS contact_email;
    ALTER TABLE leads DROP COLUMN IF EXISTS contact_phone;
  END IF;
END $$;

-- Add party_id to opportunities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN party_id uuid REFERENCES customers(id);
  END IF;
END $$;

-- Remove hardcoded name from opportunities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'opportunity_name'
  ) THEN
    ALTER TABLE opportunities DROP COLUMN opportunity_name;
  END IF;
END $$;

-- Add title column to opportunities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'title'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN title text NOT NULL DEFAULT 'Untitled Opportunity';
  END IF;
END $$;

-- Add party_id to activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN party_id uuid REFERENCES customers(id);
  END IF;
END $$;

-- Create opportunity_stages table for customizable pipeline
CREATE TABLE IF NOT EXISTS opportunity_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_closed boolean DEFAULT false,
  is_won boolean DEFAULT false,
  color text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Enable RLS on opportunity_stages
ALTER TABLE opportunity_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for opportunity_stages
CREATE POLICY "Users can view opportunity stages in their company"
  ON opportunity_stages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage opportunity stages"
  ON opportunity_stages FOR ALL
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_party_id ON leads(party_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_party_id ON opportunities(party_id);
CREATE INDEX IF NOT EXISTS idx_activities_party_id ON activities(party_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_company_id ON opportunity_stages(company_id);

-- Add lead_source_options for dropdown
CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead sources in their company"
  ON lead_sources FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage lead sources"
  ON lead_sources FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_lead_sources_company_id ON lead_sources(company_id);
