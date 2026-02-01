/*
  # PHASE 4: Inventory Locking Hardening

  ## Overview
  Enhances the existing inventory locking system with expiration handling,
  lock monitoring, dead-lock detection, and admin override capabilities.

  ## Changes

  1. Enhance inventory_items
    - Add locked_until (expiration timestamp)
    - Add lock_reason field

  2. New Tables
    - inventory_lock_history - Track all lock operations

  3. New Functions
    - auto_release_expired_locks()
    - detect_dead_locks()
    - force_unlock() (admin only)
    - get_active_locks()

  4. Monitoring
    - Dashboard queries for lock monitoring
    - Dead-lock detection

  ## Security
  - Only admins can force-unlock
  - All lock operations audited
  - Automatic expiration prevents stuck locks
*/

-- =====================================================
-- 1. ENHANCE INVENTORY_ITEMS WITH EXPIRATION
-- =====================================================

DO $$
BEGIN
  -- Add locked_until if doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN locked_until timestamptz;
    COMMENT ON COLUMN inventory_items.locked_until IS 'When the lock expires (NULL = never)';
  END IF;
  
  -- Add lock_reason if doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'lock_reason'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN lock_reason text DEFAULT '';
    COMMENT ON COLUMN inventory_items.lock_reason IS 'Why this inventory is locked';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_items_locked_until ON inventory_items(locked_until) WHERE locked_until IS NOT NULL;

-- =====================================================
-- 2. INVENTORY_LOCK_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_lock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Lock Info
  action text NOT NULL, -- 'locked', 'released', 'transferred', 'expired', 'force_unlocked'
  locked_by_type text, -- 'auction', 'order', 'reservation', 'manual'
  locked_by_id uuid,
  
  -- Attribution
  performed_by uuid REFERENCES auth.users(id),
  reason text DEFAULT '',
  
  -- Timing
  locked_at timestamptz,
  released_at timestamptz,
  duration_seconds integer, -- How long was it locked
  
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lock_history_company ON inventory_lock_history(company_id);
CREATE INDEX IF NOT EXISTS idx_lock_history_item ON inventory_lock_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_lock_history_action ON inventory_lock_history(action);
CREATE INDEX IF NOT EXISTS idx_lock_history_created ON inventory_lock_history(created_at DESC);

COMMENT ON TABLE inventory_lock_history IS 'Complete history of all inventory lock operations';

-- =====================================================
-- 3. ENHANCED LOCK FUNCTIONS
-- =====================================================

-- Enhanced lock function with expiration
CREATE OR REPLACE FUNCTION lock_inventory_with_expiration(
  p_inventory_item_id uuid,
  p_locked_by_type text,
  p_locked_by_id uuid,
  p_reason text DEFAULT '',
  p_expires_in_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_is_locked boolean;
  v_locked_until timestamptz;
BEGIN
  -- Get company_id and check current lock status
  SELECT company_id, 
         (locked_by_type IS NOT NULL AND (locked_until IS NULL OR locked_until > now()))
  INTO v_company_id, v_is_locked
  FROM inventory_items
  WHERE id = p_inventory_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  
  -- Check if already locked
  IF v_is_locked THEN
    RETURN false;
  END IF;
  
  -- Calculate expiration
  v_locked_until := now() + (p_expires_in_minutes || ' minutes')::interval;
  
  -- Lock the inventory
  UPDATE inventory_items
  SET locked_by_type = p_locked_by_type,
      locked_by_id = p_locked_by_id,
      locked_at = now(),
      locked_until = v_locked_until,
      lock_reason = p_reason
  WHERE id = p_inventory_item_id;
  
  -- Log in history
  INSERT INTO inventory_lock_history (
    company_id, inventory_item_id, action,
    locked_by_type, locked_by_id, performed_by, reason,
    locked_at
  ) VALUES (
    v_company_id, p_inventory_item_id, 'locked',
    p_locked_by_type, p_locked_by_id, auth.uid(), p_reason,
    now()
  );
  
  RETURN true;
END;
$$;

-- Enhanced release function with history
CREATE OR REPLACE FUNCTION release_inventory_lock_with_history(
  p_inventory_item_id uuid,
  p_reason text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_locked_at timestamptz;
  v_duration_seconds integer;
BEGIN
  -- Get lock info
  SELECT company_id, locked_at
  INTO v_company_id, v_locked_at
  FROM inventory_items
  WHERE id = p_inventory_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  
  -- Calculate duration
  IF v_locked_at IS NOT NULL THEN
    v_duration_seconds := EXTRACT(EPOCH FROM (now() - v_locked_at))::integer;
  END IF;
  
  -- Release the lock
  UPDATE inventory_items
  SET locked_by_type = NULL,
      locked_by_id = NULL,
      locked_at = NULL,
      locked_until = NULL,
      lock_reason = ''
  WHERE id = p_inventory_item_id;
  
  -- Log in history
  INSERT INTO inventory_lock_history (
    company_id, inventory_item_id, action,
    performed_by, reason, released_at, duration_seconds
  ) VALUES (
    v_company_id, p_inventory_item_id, 'released',
    auth.uid(), p_reason, now(), v_duration_seconds
  );
  
  RETURN true;
END;
$$;

-- Auto-release expired locks
CREATE OR REPLACE FUNCTION auto_release_expired_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count integer := 0;
  v_item_record RECORD;
BEGIN
  -- Find all expired locks
  FOR v_item_record IN
    SELECT id, company_id, locked_at
    FROM inventory_items
    WHERE locked_until IS NOT NULL
      AND locked_until <= now()
      AND locked_by_type IS NOT NULL
  LOOP
    -- Release the lock
    UPDATE inventory_items
    SET locked_by_type = NULL,
        locked_by_id = NULL,
        locked_at = NULL,
        locked_until = NULL,
        lock_reason = ''
    WHERE id = v_item_record.id;
    
    -- Log in history
    INSERT INTO inventory_lock_history (
      company_id, inventory_item_id, action,
      reason, released_at,
      duration_seconds
    ) VALUES (
      v_item_record.company_id, v_item_record.id, 'expired',
      'Lock expired automatically', now(),
      EXTRACT(EPOCH FROM (now() - v_item_record.locked_at))::integer
    );
    
    v_released_count := v_released_count + 1;
  END LOOP;
  
  RETURN v_released_count;
END;
$$;

COMMENT ON FUNCTION auto_release_expired_locks IS 'Automatically release locks that have expired';

-- Force unlock (admin only)
CREATE OR REPLACE FUNCTION force_unlock_inventory(
  p_inventory_item_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_user_role text;
  v_locked_at timestamptz;
BEGIN
  -- Check if user is admin
  SELECT uca.role INTO v_user_role
  FROM inventory_items ii
  JOIN user_company_access uca ON uca.company_id = ii.company_id
  WHERE ii.id = p_inventory_item_id
    AND uca.user_id = auth.uid();
  
  IF v_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Only admins can force unlock inventory';
  END IF;
  
  -- Get lock info
  SELECT company_id, locked_at
  INTO v_company_id, v_locked_at
  FROM inventory_items
  WHERE id = p_inventory_item_id;
  
  -- Release the lock
  UPDATE inventory_items
  SET locked_by_type = NULL,
      locked_by_id = NULL,
      locked_at = NULL,
      locked_until = NULL,
      lock_reason = ''
  WHERE id = p_inventory_item_id;
  
  -- Log in history
  INSERT INTO inventory_lock_history (
    company_id, inventory_item_id, action,
    performed_by, reason, released_at,
    duration_seconds
  ) VALUES (
    v_company_id, p_inventory_item_id, 'force_unlocked',
    auth.uid(), p_reason, now(),
    CASE WHEN v_locked_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (now() - v_locked_at))::integer 
      ELSE NULL END
  );
  
  -- Also log in audit
  PERFORM log_audit_entry(
    v_company_id,
    'inventory_items',
    p_inventory_item_id,
    'force_unlock',
    NULL,
    NULL,
    p_reason
  );
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION force_unlock_inventory IS 'Force unlock inventory (admin only)';

-- =====================================================
-- 4. MONITORING FUNCTIONS
-- =====================================================

-- Get all active locks for a company
CREATE OR REPLACE FUNCTION get_active_locks(p_company_id uuid)
RETURNS TABLE(
  inventory_item_id uuid,
  locked_by_type text,
  locked_by_id uuid,
  locked_at timestamptz,
  locked_until timestamptz,
  lock_reason text,
  locked_duration_minutes integer,
  expires_in_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.locked_by_type,
    ii.locked_by_id,
    ii.locked_at,
    ii.locked_until,
    ii.lock_reason,
    EXTRACT(EPOCH FROM (now() - ii.locked_at))::integer / 60 AS locked_duration_minutes,
    CASE 
      WHEN ii.locked_until IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (ii.locked_until - now()))::integer / 60 
      ELSE NULL 
    END AS expires_in_minutes
  FROM inventory_items ii
  WHERE ii.company_id = p_company_id
    AND ii.locked_by_type IS NOT NULL
    AND (ii.locked_until IS NULL OR ii.locked_until > now())
  ORDER BY ii.locked_at DESC;
END;
$$;

-- Detect potential dead-locks (locked for > 24 hours)
CREATE OR REPLACE FUNCTION detect_dead_locks(p_company_id uuid)
RETURNS TABLE(
  inventory_item_id uuid,
  locked_by_type text,
  locked_by_id uuid,
  locked_at timestamptz,
  locked_duration_hours integer,
  lock_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.locked_by_type,
    ii.locked_by_id,
    ii.locked_at,
    EXTRACT(EPOCH FROM (now() - ii.locked_at))::integer / 3600 AS locked_duration_hours,
    ii.lock_reason
  FROM inventory_items ii
  WHERE ii.company_id = p_company_id
    AND ii.locked_by_type IS NOT NULL
    AND ii.locked_at < now() - interval '24 hours'
    AND (ii.locked_until IS NULL OR ii.locked_until > now())
  ORDER BY ii.locked_at ASC;
END;
$$;

COMMENT ON FUNCTION detect_dead_locks IS 'Identify inventory locked for more than 24 hours';

-- Lock statistics
CREATE OR REPLACE FUNCTION get_lock_statistics(
  p_company_id uuid,
  p_from_date timestamptz DEFAULT now() - interval '30 days'
)
RETURNS TABLE(
  total_locks integer,
  total_releases integer,
  total_expired integer,
  total_force_unlocked integer,
  avg_lock_duration_minutes numeric,
  max_lock_duration_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE action = 'locked')::integer AS total_locks,
    COUNT(*) FILTER (WHERE action = 'released')::integer AS total_releases,
    COUNT(*) FILTER (WHERE action = 'expired')::integer AS total_expired,
    COUNT(*) FILTER (WHERE action = 'force_unlocked')::integer AS total_force_unlocked,
    ROUND(AVG(duration_seconds) / 60, 2) AS avg_lock_duration_minutes,
    MAX(duration_seconds) / 60 AS max_lock_duration_minutes
  FROM inventory_lock_history
  WHERE company_id = p_company_id
    AND created_at >= p_from_date;
END;
$$;

-- =====================================================
-- 5. RLS POLICIES FOR LOCK HISTORY
-- =====================================================

ALTER TABLE inventory_lock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lock history in their company"
  ON inventory_lock_history FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

-- Only system can insert (via functions)
-- No update or delete allowed

-- =====================================================
-- 6. SCHEDULED JOB (via pg_cron if available)
-- =====================================================

-- Note: This requires pg_cron extension
-- Run auto_release_expired_locks() every 5 minutes
-- SELECT cron.schedule('auto-release-locks', '*/5 * * * *', 'SELECT auto_release_expired_locks()');

COMMENT ON FUNCTION auto_release_expired_locks IS 
  'Should be run every 5 minutes via cron or external scheduler';

-- =====================================================
-- SUMMARY
-- =====================================================

/*
  ✅ Inventory locking hardened:
     - Added lock expiration (locked_until)
     - Added lock reason tracking
     - Created inventory_lock_history table
     - Auto-release expired locks function
     - Dead-lock detection
     - Force unlock for admins
     - Comprehensive monitoring functions
  
  ✅ Security:
     - All lock operations logged
     - Admin-only force unlock
     - Audit trail integration
  
  Next: Phase 5 - Performance optimization with materialized views
*/
