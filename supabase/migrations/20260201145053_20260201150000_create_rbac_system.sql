/*
  # PHASE 1: Role-Based Access Control (RBAC) System

  ## Overview
  This migration creates a comprehensive RBAC system with granular permissions
  scoped to engine.resource.action for enterprise-grade access control.

  ## Changes

  1. New Tables
    - `permissions` - Defines all available permissions in the system
    - `role_permissions` - Maps permissions to roles
    - `user_permissions` - Direct user permission grants (overrides)
    - `permission_groups` - Logical grouping of permissions for easier management

  2. Core Concepts
    - Permission format: `{engine}:{resource}:{action}`
    - Examples: `inventory:assets:read`, `crm:leads:create`, `admin:users:delete`
    - Roles can have multiple permissions
    - Users can have role-based + direct permissions
    - Company-scoped permission enforcement

  3. Security
    - RLS policies enforce permission checks
    - Helper functions for permission validation
    - Audit trail for permission changes
*/

-- =====================================================
-- 1. PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- Format: engine:resource:action
  name text NOT NULL,
  description text DEFAULT '',
  engine text, -- NULL = core system permission
  resource text NOT NULL,
  action text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT permissions_code_format CHECK (code ~ '^[a-z_]+:[a-z_]+:[a-z_]+$')
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_engine ON permissions(engine);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);

COMMENT ON TABLE permissions IS 'Defines all available permissions in the system';
COMMENT ON COLUMN permissions.code IS 'Unique permission code: engine:resource:action';
COMMENT ON COLUMN permissions.engine IS 'Engine this permission belongs to (NULL for core system)';

-- =====================================================
-- 2. PERMISSION GROUPS (For easier management)
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_permission_groups_company ON permission_groups(company_id);

COMMENT ON TABLE permission_groups IS 'Logical grouping of permissions for easier role management';

-- =====================================================
-- 3. PERMISSION GROUP MEMBERSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(group_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_group_members_group ON permission_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_permission_group_members_permission ON permission_group_members(permission_id);

-- =====================================================
-- 4. ROLE PERMISSIONS (Maps permissions to roles)
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL, -- References user_company_access.role
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_company ON role_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

COMMENT ON TABLE role_permissions IS 'Maps permissions to roles within a company';

-- =====================================================
-- 5. USER PERMISSIONS (Direct grants, overrides role)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted boolean DEFAULT true, -- false = explicitly deny
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- NULL = never expires
  reason text DEFAULT '',
  
  UNIQUE(user_id, company_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company ON user_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON user_permissions(expires_at);

COMMENT ON TABLE user_permissions IS 'Direct permission grants to users (overrides role permissions)';
COMMENT ON COLUMN user_permissions.granted IS 'true = grant, false = explicitly deny';
COMMENT ON COLUMN user_permissions.expires_at IS 'Temporary permission expiration';

-- =====================================================
-- 6. SEED DEFAULT PERMISSIONS
-- =====================================================

-- Core System Permissions
INSERT INTO permissions (code, name, description, engine, resource, action) VALUES
  -- Company Management
  ('core:companies:read', 'View Companies', 'View company information', NULL, 'companies', 'read'),
  ('core:companies:create', 'Create Companies', 'Create new companies', NULL, 'companies', 'create'),
  ('core:companies:update', 'Update Companies', 'Modify company settings', NULL, 'companies', 'update'),
  ('core:companies:delete', 'Delete Companies', 'Delete companies', NULL, 'companies', 'delete'),
  
  -- User Management
  ('core:users:read', 'View Users', 'View user accounts', NULL, 'users', 'read'),
  ('core:users:create', 'Create Users', 'Create new user accounts', NULL, 'users', 'create'),
  ('core:users:update', 'Update Users', 'Modify user accounts', NULL, 'users', 'update'),
  ('core:users:delete', 'Delete Users', 'Delete user accounts', NULL, 'users', 'delete'),
  
  -- Role & Permission Management
  ('core:permissions:read', 'View Permissions', 'View permission settings', NULL, 'permissions', 'read'),
  ('core:permissions:manage', 'Manage Permissions', 'Modify role permissions', NULL, 'permissions', 'manage'),
  
  -- Audit Logs
  ('core:audit:read', 'View Audit Logs', 'View audit trail', NULL, 'audit', 'read'),
  ('core:audit:export', 'Export Audit Logs', 'Export audit data', NULL, 'audit', 'export'),
  
  -- Engine Management
  ('core:engines:read', 'View Engines', 'View enabled engines', NULL, 'engines', 'read'),
  ('core:engines:toggle', 'Toggle Engines', 'Enable/disable engines', NULL, 'engines', 'toggle'),
  
  -- Inventory Engine Permissions
  ('inventory:assets:read', 'View Assets', 'View inventory assets', 'inventory', 'assets', 'read'),
  ('inventory:assets:create', 'Create Assets', 'Add new assets', 'inventory', 'assets', 'create'),
  ('inventory:assets:update', 'Update Assets', 'Modify asset information', 'inventory', 'assets', 'update'),
  ('inventory:assets:delete', 'Delete Assets', 'Delete assets', 'inventory', 'assets', 'delete'),
  ('inventory:assets:bulk', 'Bulk Asset Operations', 'Perform bulk updates', 'inventory', 'assets', 'bulk'),
  ('inventory:assets:export', 'Export Assets', 'Export asset data', 'inventory', 'assets', 'export'),
  ('inventory:movements:read', 'View Movements', 'View stock movements', 'inventory', 'movements', 'read'),
  ('inventory:movements:create', 'Create Movements', 'Record stock movements', 'inventory', 'movements', 'create'),
  ('inventory:lots:read', 'View Lots', 'View purchase lots', 'inventory', 'lots', 'read'),
  ('inventory:lots:create', 'Create Lots', 'Create purchase lots', 'inventory', 'lots', 'create'),
  ('inventory:lots:close', 'Close Lots', 'Close/finalize lots', 'inventory', 'lots', 'close'),
  ('inventory:components:read', 'View Components', 'View harvested components', 'inventory', 'components', 'read'),
  ('inventory:components:harvest', 'Harvest Components', 'Record component harvesting', 'inventory', 'components', 'harvest'),
  ('inventory:components:sell', 'Sell Components', 'Sell harvested components', 'inventory', 'components', 'sell'),
  
  -- Purchasing Permissions
  ('purchasing:orders:read', 'View Purchase Orders', 'View purchase orders', 'purchasing', 'orders', 'read'),
  ('purchasing:orders:create', 'Create Purchase Orders', 'Create new POs', 'purchasing', 'orders', 'create'),
  ('purchasing:orders:update', 'Update Purchase Orders', 'Modify POs', 'purchasing', 'orders', 'update'),
  ('purchasing:orders:delete', 'Delete Purchase Orders', 'Delete draft POs', 'purchasing', 'orders', 'delete'),
  ('purchasing:orders:submit', 'Submit Purchase Orders', 'Submit POs to suppliers', 'purchasing', 'orders', 'submit'),
  ('purchasing:orders:approve', 'Approve Purchase Orders', 'Approve large POs', 'purchasing', 'orders', 'approve'),
  ('purchasing:receiving:read', 'View Receiving', 'View receiving records', 'purchasing', 'receiving', 'read'),
  ('purchasing:receiving:create', 'Process Receiving', 'Process received items', 'purchasing', 'receiving', 'create'),
  ('purchasing:suppliers:read', 'View Suppliers', 'View supplier information', 'purchasing', 'suppliers', 'read'),
  ('purchasing:suppliers:create', 'Create Suppliers', 'Add new suppliers', 'purchasing', 'suppliers', 'create'),
  ('purchasing:suppliers:update', 'Update Suppliers', 'Modify supplier info', 'purchasing', 'suppliers', 'update'),
  
  -- Sales Permissions
  ('sales:orders:read', 'View Sales Orders', 'View sales orders', 'sales', 'orders', 'read'),
  ('sales:orders:create', 'Create Sales Orders', 'Create new orders', 'sales', 'orders', 'create'),
  ('sales:orders:update', 'Update Sales Orders', 'Modify orders', 'sales', 'orders', 'update'),
  ('sales:orders:cancel', 'Cancel Sales Orders', 'Cancel orders', 'sales', 'orders', 'cancel'),
  ('sales:invoices:read', 'View Invoices', 'View sales invoices', 'sales', 'invoices', 'read'),
  ('sales:invoices:create', 'Create Invoices', 'Create invoices', 'sales', 'invoices', 'create'),
  ('sales:invoices:update', 'Update Invoices', 'Modify draft invoices', 'sales', 'invoices', 'update'),
  ('sales:invoices:void', 'Void Invoices', 'Void posted invoices', 'sales', 'invoices', 'void'),
  ('sales:customers:read', 'View Customers', 'View customer information', 'sales', 'customers', 'read'),
  ('sales:customers:create', 'Create Customers', 'Add new customers', 'sales', 'customers', 'create'),
  ('sales:customers:update', 'Update Customers', 'Modify customer info', 'sales', 'customers', 'update'),
  
  -- Financial/Accounting Permissions
  ('accounting:accounts:read', 'View Chart of Accounts', 'View accounting accounts', 'accounting', 'accounts', 'read'),
  ('accounting:accounts:manage', 'Manage Chart of Accounts', 'Modify account structure', 'accounting', 'accounts', 'manage'),
  ('accounting:journal:read', 'View Journal Entries', 'View journal entries', 'accounting', 'journal', 'read'),
  ('accounting:journal:create', 'Create Journal Entries', 'Create journal entries', 'accounting', 'journal', 'create'),
  ('accounting:journal:post', 'Post Journal Entries', 'Post to ledger', 'accounting', 'journal', 'post'),
  ('accounting:journal:void', 'Void Journal Entries', 'Void posted entries', 'accounting', 'journal', 'void'),
  ('accounting:reports:read', 'View Financial Reports', 'View financial reports', 'accounting', 'reports', 'read'),
  ('accounting:reports:export', 'Export Financial Reports', 'Export financial data', 'accounting', 'reports', 'export'),
  
  -- CRM Permissions
  ('crm:leads:read', 'View Leads', 'View leads', 'crm', 'leads', 'read'),
  ('crm:leads:create', 'Create Leads', 'Create new leads', 'crm', 'leads', 'create'),
  ('crm:leads:update', 'Update Leads', 'Modify leads', 'crm', 'leads', 'update'),
  ('crm:leads:convert', 'Convert Leads', 'Convert to opportunities', 'crm', 'leads', 'convert'),
  ('crm:opportunities:read', 'View Opportunities', 'View opportunities', 'crm', 'opportunities', 'read'),
  ('crm:opportunities:create', 'Create Opportunities', 'Create opportunities', 'crm', 'opportunities', 'create'),
  ('crm:opportunities:update', 'Update Opportunities', 'Modify opportunities', 'crm', 'opportunities', 'update'),
  ('crm:opportunities:close', 'Close Opportunities', 'Win/lose opportunities', 'crm', 'opportunities', 'close'),
  ('crm:activities:read', 'View Activities', 'View CRM activities', 'crm', 'activities', 'read'),
  ('crm:activities:create', 'Create Activities', 'Log activities', 'crm', 'activities', 'create'),
  
  -- Auction Permissions
  ('auction:lots:read', 'View Auction Lots', 'View auction lots', 'auction', 'lots', 'read'),
  ('auction:lots:create', 'Create Auction Lots', 'Create auction lots', 'auction', 'lots', 'create'),
  ('auction:lots:update', 'Update Auction Lots', 'Modify lots', 'auction', 'lots', 'update'),
  ('auction:lots:publish', 'Publish Auction Lots', 'Publish lots for bidding', 'auction', 'lots', 'publish'),
  ('auction:lots:cancel', 'Cancel Auction Lots', 'Cancel auctions', 'auction', 'lots', 'cancel'),
  ('auction:bids:read', 'View Bids', 'View bid information', 'auction', 'bids', 'read'),
  ('auction:bids:place', 'Place Bids', 'Place bids on lots', 'auction', 'bids', 'place'),
  ('auction:settlements:read', 'View Settlements', 'View auction settlements', 'auction', 'settlements', 'read'),
  ('auction:settlements:process', 'Process Settlements', 'Settle auctions', 'auction', 'settlements', 'process'),
  
  -- ITAD Permissions
  ('itad:projects:read', 'View ITAD Projects', 'View ITAD projects', 'itad', 'projects', 'read'),
  ('itad:projects:create', 'Create ITAD Projects', 'Create projects', 'itad', 'projects', 'create'),
  ('itad:projects:update', 'Update ITAD Projects', 'Modify projects', 'itad', 'projects', 'update'),
  ('itad:certificates:read', 'View Certificates', 'View compliance certificates', 'itad', 'certificates', 'read'),
  ('itad:certificates:issue', 'Issue Certificates', 'Issue certificates', 'itad', 'certificates', 'issue'),
  ('itad:sanitization:read', 'View Data Sanitization', 'View sanitization records', 'itad', 'sanitization', 'read'),
  ('itad:sanitization:perform', 'Perform Data Sanitization', 'Perform data wipes', 'itad', 'sanitization', 'perform'),
  ('itad:compliance:read', 'View Compliance Reports', 'View environmental reports', 'itad', 'compliance', 'read'),
  ('itad:compliance:generate', 'Generate Compliance Reports', 'Generate reports', 'itad', 'compliance', 'generate'),
  
  -- Website/CMS Permissions
  ('website:pages:read', 'View Pages', 'View website pages', 'website', 'pages', 'read'),
  ('website:pages:create', 'Create Pages', 'Create pages', 'website', 'pages', 'create'),
  ('website:pages:update', 'Update Pages', 'Modify pages', 'website', 'pages', 'update'),
  ('website:pages:publish', 'Publish Pages', 'Publish pages live', 'website', 'pages', 'publish'),
  ('website:settings:read', 'View Website Settings', 'View settings', 'website', 'settings', 'read'),
  ('website:settings:update', 'Update Website Settings', 'Modify settings', 'website', 'settings', 'update')

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 7. SEED DEFAULT ROLE PERMISSIONS
-- =====================================================

-- Helper function to map permissions to all companies for a role
CREATE OR REPLACE FUNCTION seed_role_permissions(p_role text, p_permission_codes text[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id uuid;
  v_permission_code text;
  v_permission_id uuid;
BEGIN
  FOR v_company_id IN SELECT id FROM companies LOOP
    FOREACH v_permission_code IN ARRAY p_permission_codes LOOP
      SELECT id INTO v_permission_id FROM permissions WHERE code = v_permission_code;
      
      IF v_permission_id IS NOT NULL THEN
        INSERT INTO role_permissions (company_id, role, permission_id)
        VALUES (v_company_id, p_role, v_permission_id)
        ON CONFLICT (company_id, role, permission_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Seed all role permissions
DO $$
DECLARE
  v_all_permissions text[];
BEGIN
  -- ADMIN role gets all permissions
  SELECT array_agg(code) INTO v_all_permissions FROM permissions WHERE is_active = true;
  PERFORM seed_role_permissions('admin', v_all_permissions);
  
  -- MANAGER role
  PERFORM seed_role_permissions('manager', ARRAY[
    'core:companies:read', 'core:users:read', 'core:engines:read', 'core:audit:read',
    'inventory:assets:read', 'inventory:assets:create', 'inventory:assets:update', 'inventory:assets:bulk', 'inventory:assets:export',
    'inventory:movements:read', 'inventory:movements:create',
    'inventory:lots:read', 'inventory:lots:create', 'inventory:lots:close',
    'inventory:components:read', 'inventory:components:harvest', 'inventory:components:sell',
    'purchasing:orders:read', 'purchasing:orders:create', 'purchasing:orders:update', 'purchasing:orders:submit', 'purchasing:orders:approve',
    'purchasing:receiving:read', 'purchasing:receiving:create',
    'purchasing:suppliers:read', 'purchasing:suppliers:create', 'purchasing:suppliers:update',
    'sales:orders:read', 'sales:orders:create', 'sales:orders:update',
    'sales:invoices:read', 'sales:invoices:create', 'sales:invoices:update',
    'sales:customers:read', 'sales:customers:create', 'sales:customers:update',
    'accounting:accounts:read', 'accounting:journal:read', 'accounting:journal:create', 'accounting:reports:read',
    'crm:leads:read', 'crm:leads:create', 'crm:leads:update', 'crm:leads:convert',
    'crm:opportunities:read', 'crm:opportunities:create', 'crm:opportunities:update', 'crm:opportunities:close',
    'crm:activities:read', 'crm:activities:create',
    'auction:lots:read', 'auction:lots:create', 'auction:lots:update', 'auction:lots:publish',
    'auction:bids:read', 'auction:settlements:read',
    'itad:projects:read', 'itad:projects:create', 'itad:projects:update',
    'itad:certificates:read', 'itad:certificates:issue',
    'itad:sanitization:read', 'itad:sanitization:perform'
  ]);
  
  -- STAFF role
  PERFORM seed_role_permissions('staff', ARRAY[
    'core:companies:read', 'core:engines:read',
    'inventory:assets:read', 'inventory:assets:create', 'inventory:assets:update',
    'inventory:movements:read', 'inventory:movements:create',
    'inventory:lots:read',
    'inventory:components:read', 'inventory:components:harvest',
    'purchasing:orders:read', 'purchasing:orders:create', 'purchasing:orders:update',
    'purchasing:receiving:read', 'purchasing:receiving:create',
    'purchasing:suppliers:read',
    'sales:orders:read', 'sales:orders:create',
    'sales:invoices:read', 'sales:invoices:create',
    'sales:customers:read',
    'crm:leads:read', 'crm:leads:create', 'crm:leads:update',
    'crm:opportunities:read',
    'crm:activities:read', 'crm:activities:create',
    'itad:projects:read',
    'itad:sanitization:read', 'itad:sanitization:perform'
  ]);
  
  -- VIEWER role
  PERFORM seed_role_permissions('viewer', ARRAY[
    'core:companies:read', 'core:engines:read',
    'inventory:assets:read', 'inventory:movements:read', 'inventory:lots:read', 'inventory:components:read',
    'purchasing:orders:read', 'purchasing:receiving:read', 'purchasing:suppliers:read',
    'sales:orders:read', 'sales:invoices:read', 'sales:customers:read',
    'accounting:accounts:read', 'accounting:journal:read', 'accounting:reports:read',
    'crm:leads:read', 'crm:opportunities:read', 'crm:activities:read',
    'auction:lots:read', 'auction:bids:read',
    'itad:projects:read', 'itad:certificates:read'
  ]);
END;
$$;

-- =====================================================
-- 8. PERMISSION CHECK FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id uuid,
  p_company_id uuid,
  p_permission_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_permission boolean := false;
  v_is_super_admin boolean := false;
  v_user_role text;
  v_permission_id uuid;
BEGIN
  SELECT is_super_admin INTO v_is_super_admin
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_is_super_admin THEN
    RETURN true;
  END IF;
  
  SELECT id INTO v_permission_id FROM permissions WHERE code = p_permission_code;
  
  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT granted INTO v_has_permission
  FROM user_permissions
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND permission_id = v_permission_id
    AND (expires_at IS NULL OR expires_at > now());
  
  IF FOUND THEN
    RETURN v_has_permission;
  END IF;
  
  SELECT role INTO v_user_role
  FROM user_company_access
  WHERE user_id = p_user_id AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions
    WHERE company_id = p_company_id
      AND role = v_user_role
      AND permission_id = v_permission_id
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid, p_company_id uuid)
RETURNS TABLE(permission_code text, permission_name text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.code, p.name
  FROM permissions p
  WHERE p.is_active = true
    AND (
      EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id AND is_super_admin = true)
      OR EXISTS(
        SELECT 1 FROM user_permissions up
        WHERE up.user_id = p_user_id AND up.company_id = p_company_id AND up.permission_id = p.id
          AND up.granted = true AND (up.expires_at IS NULL OR up.expires_at > now())
      )
      OR (
        EXISTS(
          SELECT 1 FROM user_company_access uca
          JOIN role_permissions rp ON rp.company_id = uca.company_id AND rp.role = uca.role
          WHERE uca.user_id = p_user_id AND uca.company_id = p_company_id AND rp.permission_id = p.id
        )
        AND NOT EXISTS(
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = p_user_id AND up.company_id = p_company_id AND up.permission_id = p.id
            AND up.granted = false AND (up.expires_at IS NULL OR up.expires_at > now())
        )
      )
    )
  ORDER BY p.code;
END;
$$;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "All users can view active permissions"
  ON permissions FOR SELECT TO authenticated
  USING (is_active = true);

ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permission groups in their company"
  ON permission_groups FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage permission groups"
  ON permission_groups FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE permission_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members"
  ON permission_group_members FOR SELECT TO authenticated
  USING (group_id IN (SELECT id FROM permission_groups WHERE company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())));

CREATE POLICY "Admins can manage group members"
  ON permission_group_members FOR ALL TO authenticated
  USING (group_id IN (SELECT id FROM permission_groups WHERE company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role = 'admin')));

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role permissions"
  ON role_permissions FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage user permissions"
  ON user_permissions FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permission_groups_updated_at BEFORE UPDATE ON permission_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
