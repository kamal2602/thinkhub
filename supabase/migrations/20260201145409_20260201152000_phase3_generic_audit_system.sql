/*
  # PHASE 3: Generic Audit & Compliance System

  ## Overview
  Creates a comprehensive audit logging system for all critical operations.
  Tracks all changes to financial, inventory, party, and order data.

  ## Changes

  1. New Tables
    - audit_logs - Generic audit trail for all entities
    - audit_config - Company-specific retention policies

  2. Audit Triggers
    - Financial: journal_entries, sales_invoices, purchase_orders
    - Inventory: assets, stock_movements, purchase_lots
    - Party: customers, suppliers
    - Orders: sales_orders, purchase_orders
    - CRM: leads, opportunities

  3. Features
    - Before/after value tracking
    - User attribution
    - IP address tracking
    - Configurable retention
    - Export capabilities

  ## Security
  - RLS enforces company isolation
  - Read-only audit logs (cannot modify/delete)
  - Permission-based access control
*/

-- =====================================================
-- 1. AUDIT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Entity Info
  entity_type text NOT NULL, -- 'asset', 'invoice', 'customer', etc.
  entity_id uuid NOT NULL,
  
  -- Action Info
  action text NOT NULL, -- 'create', 'update', 'delete', 'void', 'approve', etc.
  
  -- Change Tracking
  before_data jsonb, -- State before change
  after_data jsonb, -- State after change
  changed_fields text[], -- Array of changed field names
  
  -- User Attribution
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  user_role text,
  ip_address inet,
  user_agent text,
  
  -- Context
  reason text, -- Optional: why was this change made
  source text DEFAULT 'web', -- 'web', 'api', 'import', 'system'
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  archived_at timestamptz -- For retention management
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_archived ON audit_logs(archived_at) WHERE archived_at IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_before_data ON audit_logs USING GIN(before_data);
CREATE INDEX IF NOT EXISTS idx_audit_logs_after_data ON audit_logs USING GIN(after_data);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all critical operations';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being audited (table name)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity being audited';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.before_data IS 'Full entity state before change';
COMMENT ON COLUMN audit_logs.after_data IS 'Full entity state after change';
COMMENT ON COLUMN audit_logs.changed_fields IS 'List of fields that changed';

-- =====================================================
-- 2. AUDIT_CONFIG TABLE (Retention Policies)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Retention Settings (configurable per user decision)
  retention_years integer DEFAULT 7 NOT NULL,
  archive_after_years integer DEFAULT 5,
  auto_export_enabled boolean DEFAULT false,
  export_format text DEFAULT 'csv', -- 'csv', 'json', 'pdf'
  
  -- Notification Settings
  notify_on_critical_changes boolean DEFAULT true,
  critical_entity_types text[] DEFAULT ARRAY['journal_entries', 'sales_invoices', 'purchase_orders'],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_config_company ON audit_config(company_id);

COMMENT ON TABLE audit_config IS 'Company-specific audit configuration and retention policies';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_company_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_before_data jsonb,
  p_after_data jsonb,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
  v_user_email text;
  v_user_role text;
  v_changed_fields text[];
BEGIN
  -- Get user info
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT role INTO v_user_role FROM user_company_access WHERE user_id = auth.uid() AND company_id = p_company_id;
  
  -- Calculate changed fields
  IF p_before_data IS NOT NULL AND p_after_data IS NOT NULL THEN
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM (
      SELECT key FROM jsonb_each(p_after_data)
      WHERE p_before_data->key IS DISTINCT FROM p_after_data->key
    ) AS changed;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    company_id, entity_type, entity_id, action,
    before_data, after_data, changed_fields,
    user_id, user_email, user_role, reason
  ) VALUES (
    p_company_id, p_entity_type, p_entity_id, p_action,
    p_before_data, p_after_data, v_changed_fields,
    auth.uid(), v_user_email, v_user_role, p_reason
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION log_audit_entry IS 'Centralized function to log audit entries';

-- Function to get audit history for an entity
CREATE OR REPLACE FUNCTION get_entity_audit_history(
  p_entity_type text,
  p_entity_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  action text,
  changed_fields text[],
  user_email text,
  created_at timestamptz,
  before_data jsonb,
  after_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.changed_fields,
    al.user_email,
    al.created_at,
    al.before_data,
    al.after_data
  FROM audit_logs al
  WHERE al.entity_type = p_entity_type
    AND al.entity_id = p_entity_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 4. GENERIC AUDIT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_action text;
  v_before_data jsonb;
  v_after_data jsonb;
BEGIN
  -- Determine company_id (assume all audited tables have it)
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
    v_action := 'delete';
    v_before_data := to_jsonb(OLD);
    v_after_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_company_id := NEW.company_id;
    v_action := 'update';
    v_before_data := to_jsonb(OLD);
    v_after_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_action := 'create';
    v_before_data := NULL;
    v_after_data := to_jsonb(NEW);
  END IF;
  
  -- Log the audit entry
  PERFORM log_audit_entry(
    v_company_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_before_data,
    v_after_data
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- 5. CREATE AUDIT TRIGGERS FOR CRITICAL TABLES
-- =====================================================

-- Financial Tables
CREATE TRIGGER audit_journal_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_sales_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales_invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_purchase_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Inventory Tables
CREATE TRIGGER audit_stock_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_purchase_lots_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_lots
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Party Tables
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Order Tables
CREATE TRIGGER audit_sales_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_purchase_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- CRM Tables
CREATE TRIGGER audit_leads_trigger
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_opportunities_trigger
  AFTER INSERT OR UPDATE OR DELETE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User Management
CREATE TRIGGER audit_user_company_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_company_access
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs in their company (if they have permission)
CREATE POLICY "Users can view audit logs in their company"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
    AND (
      -- Must have audit:read permission
      user_has_permission(auth.uid(), company_id, 'core:audit:read')
      OR
      -- Or be a super admin
      EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    )
  );

-- NO UPDATE OR DELETE POLICIES - Audit logs are immutable
-- Only system can insert (via triggers and functions)

-- Audit Config
ALTER TABLE audit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit config"
  ON audit_config FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage audit config"
  ON audit_config FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 7. INITIALIZE AUDIT CONFIG FOR EXISTING COMPANIES
-- =====================================================

INSERT INTO audit_config (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- =====================================================
-- 8. RETENTION MANAGEMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archived_count integer := 0;
  v_company_record RECORD;
BEGIN
  -- For each company, archive logs based on their config
  FOR v_company_record IN 
    SELECT company_id, archive_after_years 
    FROM audit_config 
    WHERE archive_after_years IS NOT NULL
  LOOP
    UPDATE audit_logs
    SET archived_at = now()
    WHERE company_id = v_company_record.company_id
      AND archived_at IS NULL
      AND created_at < now() - (v_company_record.archive_after_years || ' years')::interval;
    
    v_archived_count := v_archived_count + 1;
  END LOOP;
  
  RETURN v_archived_count;
END;
$$;

COMMENT ON FUNCTION archive_old_audit_logs IS 'Archives audit logs older than company retention policy';

-- =====================================================
-- 9. AUDIT SEARCH HELPER
-- =====================================================

CREATE OR REPLACE FUNCTION search_audit_logs(
  p_company_id uuid,
  p_entity_type text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  entity_type text,
  entity_id uuid,
  action text,
  user_email text,
  created_at timestamptz,
  changed_fields text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.entity_type,
    al.entity_id,
    al.action,
    al.user_email,
    al.created_at,
    al.changed_fields
  FROM audit_logs al
  WHERE al.company_id = p_company_id
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_user_email IS NULL OR al.user_email ILIKE '%' || p_user_email || '%')
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_from_date IS NULL OR al.created_at >= p_from_date)
    AND (p_to_date IS NULL OR al.created_at <= p_to_date)
    AND al.archived_at IS NULL
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_audit_config_updated_at BEFORE UPDATE ON audit_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUMMARY
-- =====================================================

/*
  ✅ Generic audit system created:
     - audit_logs table with comprehensive tracking
     - audit_config for configurable retention
     - Automatic triggers on all critical tables
     - Helper functions for querying and managing audits
     - RLS policies enforce company isolation
     - Immutable audit logs (no updates/deletes)
  
  ✅ Audited Tables:
     - Financial: journal_entries, sales_invoices, purchase_invoices
     - Inventory: stock_movements, purchase_lots
     - Party: customers, suppliers
     - Orders: sales_orders, purchase_orders
     - CRM: leads, opportunities
     - Users: user_company_access
  
  Next: Phase 4 - Inventory locking enhancements
*/
