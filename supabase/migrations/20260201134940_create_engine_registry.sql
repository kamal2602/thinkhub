/*
  # Create Engine Registry System

  1. New Tables
    - `engines`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Internal identifier (e.g., 'recycling', 'crm')
      - `title` (text) - Display name
      - `description` (text) - Brief description
      - `icon` (text) - Icon identifier
      - `category` (text) - operations, sales, business, system, admin
      - `is_core` (boolean) - Cannot be uninstalled
      - `is_installed` (boolean) - Installed status
      - `is_enabled` (boolean) - Enabled status
      - `depends_on` (jsonb) - Array of engine keys this depends on
      - `workspace_route` (text) - Primary route for this engine
      - `settings_route` (text) - Settings route
      - `version` (text) - Version number
      - `sort_order` (integer) - Display order
      - `company_id` (uuid) - Company-specific configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `engines` table
    - Add policies for authenticated users

  3. Initial Data
    - Seed core engines (Inventory, Parties, Accounting)
    - Seed optional engines (CRM, Auction, Website, etc.)
*/

-- Create engines table
CREATE TABLE IF NOT EXISTS engines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL,
  title text NOT NULL,
  description text,
  icon text NOT NULL,
  category text NOT NULL,
  is_core boolean DEFAULT false,
  is_installed boolean DEFAULT false,
  is_enabled boolean DEFAULT false,
  depends_on jsonb DEFAULT '[]'::jsonb,
  workspace_route text,
  settings_route text,
  version text DEFAULT '1.0.0',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Enable RLS
ALTER TABLE engines ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view engines for their company"
  ON engines FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage engines"
  ON engines FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Function to initialize engines for a company
CREATE OR REPLACE FUNCTION initialize_engines_for_company(target_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Core engines (always installed)
  INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
  VALUES
    (target_company_id, 'inventory', 'Inventory', 'Unified stock authority and movements', 'Package', 'operations', true, true, true, '/inventory', '/settings/inventory', 1, '[]'),
    (target_company_id, 'parties', 'Parties', 'Customers, suppliers, and contacts', 'Users', 'business', true, true, true, '/parties', '/settings/parties', 2, '[]'),
    (target_company_id, 'accounting', 'Accounting', 'Chart of accounts and financial records', 'Calculator', 'business', true, true, true, '/accounting', '/settings/accounting', 3, '[]')
  ON CONFLICT (company_id, key) DO NOTHING;

  -- Operations engines
  INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
  VALUES
    (target_company_id, 'recycling', 'Recycling', 'Asset processing and component harvesting', 'Recycle', 'operations', false, true, false, '/recycling', '/settings/recycling', 10, '["inventory"]'),
    (target_company_id, 'lots', 'Purchase Lots', 'Lot tracking and profitability', 'Archive', 'operations', false, true, false, '/lots', '/settings/lots', 11, '["inventory"]')
  ON CONFLICT (company_id, key) DO NOTHING;

  -- Sales engines
  INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
  VALUES
    (target_company_id, 'reseller', 'Reseller', 'Fixed-price sales and order management', 'Store', 'sales', false, true, false, '/reseller', '/settings/reseller', 20, '["inventory", "parties"]'),
    (target_company_id, 'auction', 'Auction', 'Live and timed auction management', 'Gavel', 'sales', false, true, false, '/auction', '/settings/auction', 21, '["inventory", "parties"]'),
    (target_company_id, 'website', 'Website', 'Public website and CMS', 'Globe', 'sales', false, true, false, '/website', '/settings/website', 22, '[]')
  ON CONFLICT (company_id, key) DO NOTHING;

  -- Business engines
  INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
  VALUES
    (target_company_id, 'crm', 'CRM', 'Customer relationship management', 'UserCheck', 'business', false, true, false, '/crm', '/settings/crm', 30, '["parties"]'),
    (target_company_id, 'orders', 'Orders', 'Sales orders and commitments', 'ShoppingCart', 'business', false, true, false, '/orders', '/settings/orders', 31, '["parties", "inventory"]'),
    (target_company_id, 'invoices', 'Invoices', 'Financial invoicing', 'FileText', 'business', false, true, false, '/invoices', '/settings/invoices', 32, '["parties", "accounting"]'),
    (target_company_id, 'payments', 'Payments', 'Receipts and payouts', 'DollarSign', 'business', false, true, false, '/payments', '/settings/payments', 33, '["accounting"]')
  ON CONFLICT (company_id, key) DO NOTHING;

  -- System engines
  INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
  VALUES
    (target_company_id, 'users', 'Users & Roles', 'User management and permissions', 'Shield', 'system', false, true, true, '/users', '/settings/users', 40, '[]'),
    (target_company_id, 'automation', 'Automation', 'Workflows and automation rules', 'Zap', 'system', false, false, false, '/automation', '/settings/automation', 41, '[]'),
    (target_company_id, 'reports', 'Reports', 'Business intelligence and analytics', 'BarChart3', 'system', false, true, false, '/reports', '/settings/reports', 42, '[]')
  ON CONFLICT (company_id, key) DO NOTHING;

  -- Admin engines (always enabled)
  INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
  VALUES
    (target_company_id, 'apps', 'Apps', 'Install and manage engines', 'Layers', 'admin', true, true, true, '/apps', NULL, 50, '[]'),
    (target_company_id, 'settings', 'Settings', 'System configuration', 'Settings', 'admin', true, true, true, '/settings', NULL, 51, '[]'),
    (target_company_id, 'company', 'Company', 'Company profile and branding', 'Building2', 'admin', true, true, true, '/company', NULL, 52, '[]')
  ON CONFLICT (company_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize engines when a company is created
CREATE OR REPLACE FUNCTION trigger_initialize_engines()
RETURNS trigger AS $$
BEGIN
  PERFORM initialize_engines_for_company(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_company_created_initialize_engines
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_engines();

-- Initialize engines for existing companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM initialize_engines_for_company(company_record.id);
  END LOOP;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_engines_company_enabled ON engines(company_id, is_enabled) WHERE is_installed = true;
