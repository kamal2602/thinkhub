/*
  # Enhance Module Registry and Add Missing Modules

  ## Changes
  1. Create module_categories table for better organization
  2. Add missing modules (CRM, Auctions, Recycling, Customer Portal, Website, ESG, AI Valuation)
  3. Add color coding and routes for modules
  4. Create company_modules table for per-company module enablement
  5. Create onboarding_status table
  6. Create unified parties table (customers + suppliers + partners)

  ## Module Categories
  - Core: Dashboard, Settings
  - Operations: Procurement, Processing, Inventory, Sales
  - Sales Channels: Auctions, Website/Storefront
  - Business Development: CRM, Customer Portal
  - Compliance: ITAD, ESG Reporting, Recycling
  - Intelligence: AI Valuation, Reports
  - Finance: Accounting

  ## Security
  - RLS enabled on all new tables
  - Company-scoped access by default
*/

-- Create module categories
CREATE TABLE IF NOT EXISTS module_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE module_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view module categories"
  ON module_categories FOR SELECT
  TO authenticated
  USING (true);

-- Insert module categories
INSERT INTO module_categories (code, name, icon, color, sort_order) VALUES
  ('core', 'Core', 'Home', 'blue', 1),
  ('operations', 'Operations', 'Package', 'green', 2),
  ('channels', 'Sales Channels', 'ShoppingBag', 'purple', 3),
  ('business', 'Business Development', 'Users', 'orange', 4),
  ('compliance', 'Compliance & ESG', 'Shield', 'red', 5),
  ('intelligence', 'Intelligence', 'Brain', 'cyan', 6),
  ('finance', 'Finance', 'DollarSign', 'emerald', 7)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- Add color and route columns to modules
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'modules' AND column_name = 'color'
  ) THEN
    ALTER TABLE modules ADD COLUMN color text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'modules' AND column_name = 'route'
  ) THEN
    ALTER TABLE modules ADD COLUMN route text;
  END IF;
END $$;

-- Update existing modules with routes and colors
UPDATE modules SET route = '/dashboard', color = 'blue' WHERE name = 'dashboard';
UPDATE modules SET route = '/procurement', color = 'green', category = 'operations' WHERE name = 'procurement';
UPDATE modules SET route = '/sales', color = 'blue', category = 'operations' WHERE name = 'sales';
UPDATE modules SET route = '/inventory', color = 'green', category = 'operations' WHERE name = 'inventory';
UPDATE modules SET route = '/processing', color = 'yellow', category = 'operations' WHERE name = 'processing';
UPDATE modules SET route = '/itad', color = 'red', category = 'compliance' WHERE name = 'itad';
UPDATE modules SET route = '/accounting', color = 'emerald', category = 'finance' WHERE name = 'accounting';
UPDATE modules SET route = '/reports', color = 'cyan', category = 'intelligence' WHERE name = 'reports';
UPDATE modules SET route = '/settings', color = 'gray', category = 'core' WHERE name = 'settings';

-- Insert new modules
INSERT INTO modules (name, display_name, category, is_enabled, is_core, depends_on, icon, route, color, sort_order, version, description) VALUES
  ('crm', 'CRM', 'business', true, false, ARRAY['customers'], 'Users', '/crm', 'orange', 10, '1.0.0', 'Customer Relationship Management - leads, opportunities, and activities'),
  ('auctions', 'Auctions', 'channels', true, false, ARRAY['inventory'], 'Gavel', '/auctions', 'purple', 11, '1.0.0', 'Online auction platform for selling inventory'),
  ('website', 'Website/Storefront', 'channels', true, false, ARRAY['inventory'], 'Globe', '/website', 'purple', 12, '1.0.0', 'Public website and e-commerce storefront'),
  ('customer_portal', 'Customer Portal', 'business', true, false, ARRAY['itad'], 'UserCircle', '/portal', 'orange', 13, '1.0.0', 'Self-service portal for customers'),
  ('recycling', 'Recycling', 'compliance', true, false, ARRAY['processing'], 'Recycle', '/recycling', 'red', 14, '1.0.0', 'Waste stream management and recycling operations'),
  ('esg', 'ESG Reporting', 'compliance', true, false, ARRAY['inventory'], 'Leaf', '/esg', 'red', 15, '1.0.0', 'Environmental, Social, Governance reporting'),
  ('ai_valuation', 'AI Valuation', 'intelligence', true, false, ARRAY['inventory'], 'Sparkles', '/ai-valuation', 'cyan', 16, '1.0.0', 'AI-powered pricing recommendations')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  depends_on = EXCLUDED.depends_on,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  color = EXCLUDED.color,
  description = EXCLUDED.description;

-- Create company_modules table
CREATE TABLE IF NOT EXISTS company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  enabled_at timestamptz DEFAULT now(),
  enabled_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, module_name)
);

ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company modules"
  ON company_modules FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage company modules"
  ON company_modules FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Auto-enable all modules for existing companies
INSERT INTO company_modules (company_id, module_name, is_enabled, enabled_at)
SELECT 
  c.id,
  m.name,
  m.is_enabled,
  now()
FROM companies c
CROSS JOIN modules m
ON CONFLICT (company_id, module_name) DO NOTHING;

-- Create onboarding_status table
CREATE TABLE IF NOT EXISTS onboarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  is_completed boolean DEFAULT false,
  current_step text DEFAULT 'welcome',
  completed_steps text[] DEFAULT '{}',
  modules_selected text[] DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company onboarding status"
  ON onboarding_status FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage onboarding status"
  ON onboarding_status FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Create onboarding status for existing companies
INSERT INTO onboarding_status (company_id, is_completed)
SELECT id, true FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- Create unified parties table
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  party_code text NOT NULL,
  name text NOT NULL,
  legal_name text,
  party_type text NOT NULL,
  is_customer boolean DEFAULT false,
  is_supplier boolean DEFAULT false,
  is_carrier boolean DEFAULT false,
  is_broker boolean DEFAULT false,
  is_active boolean DEFAULT true,
  tax_id text,
  website text,
  email text,
  phone text,
  credit_limit decimal(15,2),
  payment_terms text,
  tags text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(company_id, party_code)
);

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parties in their company"
  ON parties FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage parties"
  ON parties FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Migrate existing customers to parties (generate codes)
INSERT INTO parties (
  company_id,
  party_code,
  name,
  legal_name,
  party_type,
  is_customer,
  email,
  phone,
  credit_limit,
  tax_id,
  created_at,
  updated_at
)
SELECT 
  c.company_id,
  'CUST-' || LPAD(ROW_NUMBER() OVER (PARTITION BY c.company_id ORDER BY c.created_at)::text, 5, '0'),
  c.name,
  COALESCE(c.legal_name, c.name),
  'customer',
  true,
  COALESCE(c.email, c.billing_email),
  COALESCE(c.phone, c.billing_phone),
  c.credit_limit,
  c.tax_id,
  c.created_at,
  c.updated_at
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM parties p 
  WHERE p.company_id = c.company_id 
    AND p.email = COALESCE(c.email, c.billing_email)
    AND p.is_customer = true
);

-- Migrate existing suppliers to parties (generate codes)
INSERT INTO parties (
  company_id,
  party_code,
  name,
  legal_name,
  party_type,
  is_supplier,
  email,
  phone,
  created_at,
  updated_at
)
SELECT 
  s.company_id,
  'SUPP-' || LPAD(ROW_NUMBER() OVER (PARTITION BY s.company_id ORDER BY s.created_at)::text, 5, '0'),
  s.name,
  s.name,
  'supplier',
  true,
  s.email,
  s.phone,
  s.created_at,
  s.updated_at
FROM suppliers s
WHERE NOT EXISTS (
  SELECT 1 FROM parties p 
  WHERE p.company_id = s.company_id 
    AND p.email = s.email
    AND p.is_supplier = true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parties_company ON parties(company_id);
CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(party_type);
CREATE INDEX IF NOT EXISTS idx_parties_customer ON parties(company_id, is_customer) WHERE is_customer = true;
CREATE INDEX IF NOT EXISTS idx_parties_supplier ON parties(company_id, is_supplier) WHERE is_supplier = true;
CREATE INDEX IF NOT EXISTS idx_company_modules_company ON company_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_company_modules_enabled ON company_modules(company_id, is_enabled) WHERE is_enabled = true;
