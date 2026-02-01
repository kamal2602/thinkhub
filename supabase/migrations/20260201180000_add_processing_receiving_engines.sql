/*
  # Add Processing and Receiving Engines

  1. New Engines
    - `processing` - Asset testing, grading, and workflow management
    - `receiving` - Smart receiving and PO processing

  2. Notes
    - Processing depends on inventory (manages assets)
    - Receiving depends on inventory (creates assets from POs)
    - Both are operations category engines
*/

-- Update initialization function to include Processing and Receiving
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
    (target_company_id, 'processing', 'Processing', 'Asset testing, grading, and refurbishment workflow', 'Wrench', 'operations', false, true, true, '/processing', '/settings/processing', 10, '["inventory"]'),
    (target_company_id, 'receiving', 'Receiving', 'Smart receiving and purchase order processing', 'PackageOpen', 'operations', false, true, true, '/smart-receiving', '/settings/receiving', 11, '["inventory"]'),
    (target_company_id, 'recycling', 'Recycling', 'Component harvesting and material recovery', 'Recycle', 'operations', false, true, false, '/recycling', '/settings/recycling', 12, '["inventory"]'),
    (target_company_id, 'lots', 'Purchase Lots', 'Lot tracking and profitability', 'Archive', 'operations', false, true, true, '/purchase-lots', '/settings/lots', 13, '["inventory"]')
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
    (target_company_id, 'itad', 'ITAD Compliance', 'Data sanitization, certificates, and compliance tracking', 'Shield', 'business', false, true, false, '/itad', '/settings/itad', 31, '["parties"]'),
    (target_company_id, 'orders', 'Orders', 'Sales orders and commitments', 'ShoppingCart', 'business', false, true, false, '/orders', '/settings/orders', 32, '["parties", "inventory"]'),
    (target_company_id, 'invoices', 'Invoices', 'Financial invoicing', 'FileText', 'business', false, true, false, '/invoices', '/settings/invoices', 33, '["parties", "accounting"]'),
    (target_company_id, 'payments', 'Payments', 'Receipts and payouts', 'DollarSign', 'business', false, true, false, '/payments', '/settings/payments', 34, '["accounting"]')
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

-- Add Processing and Receiving engines to existing companies
INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
SELECT
  id,
  'processing',
  'Processing',
  'Asset testing, grading, and refurbishment workflow',
  'Wrench',
  'operations',
  false,
  true,
  true,
  '/processing',
  '/settings/processing',
  10,
  '["inventory"]'::jsonb
FROM companies
ON CONFLICT (company_id, key) DO NOTHING;

INSERT INTO engines (company_id, key, title, description, icon, category, is_core, is_installed, is_enabled, workspace_route, settings_route, sort_order, depends_on)
SELECT
  id,
  'receiving',
  'Receiving',
  'Smart receiving and purchase order processing',
  'PackageOpen',
  'operations',
  false,
  true,
  true,
  '/smart-receiving',
  '/settings/receiving',
  11,
  '["inventory"]'::jsonb
FROM companies
ON CONFLICT (company_id, key) DO NOTHING;
