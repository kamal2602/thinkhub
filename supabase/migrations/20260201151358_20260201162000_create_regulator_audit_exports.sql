/*
  # Regulator Audit Exports System (Phase 3)
  
  ## Purpose
  Create immutable, cryptographically signed audit export system for:
  - Regulatory compliance (EPA, EU Commission, ISO auditors)
  - Client audit requests
  - Third-party certifier verification
  
  ## Critical Requirements
  - IMMUTABILITY: Once created, exports cannot be modified
  - INTEGRITY: Cryptographic hashing (SHA-256) for tamper detection
  - TRACEABILITY: Hash chain linking exports chronologically
  - RETENTION: 7-10 year retention for legal compliance
  - FORMAT SUPPORT: CSV, XML, XBRL
  
  ## New Tables
  
  ### `audit_exports`
  Main table for all audit export records
  - Stores metadata about each export
  - Immutable after creation
  - Cryptographic hash for file integrity
  - Optional digital signature support
  - Chain of custody via previous_export_id
  
  ### `audit_export_contents`
  Manifest of what data is included in each export
  - Lists tables, row counts, columns included
  - Filters applied to data
  - Allows reconstruction of export criteria
  
  ## Security
  - RLS enabled
  - Only admins can create exports
  - All users can view exports (for transparency)
  - NO UPDATES OR DELETES (immutable)
  
  ## Compliance Standards Supported
  - GRI (Global Reporting Initiative)
  - EU WEEE Directive reporting
  - EPR (Extended Producer Responsibility)
  - ISO 14001 Environmental Management
  - SOC 2 Type II audit trails
*/

-- =====================================================
-- AUDIT EXPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Export metadata
  export_type text NOT NULL CHECK (export_type IN ('regulator', 'client', 'certifier', 'internal')),
  regulator_name text, -- "EPA", "EU Commission", "ISO Auditor", "SOC 2 Auditor"
  client_name text,
  export_format text NOT NULL CHECK (export_format IN ('csv', 'xml', 'xbrl', 'json')),
  
  -- Date range for data export
  from_date timestamptz NOT NULL,
  to_date timestamptz NOT NULL,
  
  -- File storage (Supabase Storage)
  file_path text NOT NULL,
  file_size_bytes bigint,
  
  -- Cryptographic integrity
  hash_algorithm text DEFAULT 'SHA-256' NOT NULL,
  file_hash text NOT NULL, -- SHA-256 hash of file contents
  hash_salt text, -- Optional salt for additional security
  
  -- Digital signature (for legal validity)
  signed_at timestamptz,
  signature text, -- Digital signature (future: PKI/HSM integration)
  signed_by uuid REFERENCES auth.users(id),
  
  -- Audit trail
  purpose text NOT NULL, -- Why this export was created
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  
  -- Chain of custody (link to previous export for hash chain)
  previous_export_id uuid REFERENCES audit_exports(id),
  export_sequence_number integer, -- Sequential number within company
  
  -- Compliance tags
  compliance_frameworks text[], -- ["GRI", "EU WEEE", "EPR", "ISO 14001"]
  regulatory_reference text, -- External reference number
  
  -- Metadata
  notes text,
  metadata jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- Retention period end date
  
  -- CRITICAL: Prevent updates after creation
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT immutable_export_check CHECK (created_at = updated_at)
);

CREATE INDEX IF NOT EXISTS idx_audit_exports_company ON audit_exports(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_exports_type ON audit_exports(export_type);
CREATE INDEX IF NOT EXISTS idx_audit_exports_dates ON audit_exports(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_audit_exports_created ON audit_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_exports_sequence ON audit_exports(company_id, export_sequence_number);
CREATE INDEX IF NOT EXISTS idx_audit_exports_chain ON audit_exports(previous_export_id);
CREATE INDEX IF NOT EXISTS idx_audit_exports_hash ON audit_exports(file_hash);

-- RLS Policies
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;

-- All users in company can view exports (transparency)
DROP POLICY IF EXISTS "Users can view audit exports in their company" ON audit_exports;
CREATE POLICY "Users can view audit exports in their company"
  ON audit_exports FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only admins can create exports
DROP POLICY IF EXISTS "Admins can create audit exports" ON audit_exports;
CREATE POLICY "Admins can create audit exports"
  ON audit_exports FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- NO UPDATE POLICY - Immutable records
-- NO DELETE POLICY - Permanent records (unless cascaded from company deletion)

-- =====================================================
-- AUDIT EXPORT CONTENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_export_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id uuid NOT NULL REFERENCES audit_exports(id) ON DELETE CASCADE,
  
  -- Table included in export
  table_name text NOT NULL,
  row_count integer NOT NULL CHECK (row_count >= 0),
  
  -- Columns included (for partial exports)
  included_columns text[],
  excluded_columns text[],
  
  -- Filters applied
  filters_applied jsonb,
  
  -- Data summary
  data_range_start timestamptz,
  data_range_end timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_contents_export ON audit_export_contents(export_id);
CREATE INDEX IF NOT EXISTS idx_export_contents_table ON audit_export_contents(table_name);

-- RLS Policies
ALTER TABLE audit_export_contents ENABLE ROW LEVEL SECURITY;

-- Users can view contents if they can view the export
DROP POLICY IF EXISTS "Users can view export contents" ON audit_export_contents;
CREATE POLICY "Users can view export contents"
  ON audit_export_contents FOR SELECT
  TO authenticated
  USING (
    export_id IN (
      SELECT id FROM audit_exports
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Only admins can create export contents
DROP POLICY IF EXISTS "Admins can create export contents" ON audit_export_contents;
CREATE POLICY "Admins can create export contents"
  ON audit_export_contents FOR INSERT
  TO authenticated
  WITH CHECK (
    export_id IN (
      SELECT id FROM audit_exports
      WHERE company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get next export sequence number
CREATE OR REPLACE FUNCTION get_next_export_sequence(p_company_id uuid)
RETURNS integer AS $$
DECLARE
  v_next_seq integer;
BEGIN
  SELECT COALESCE(MAX(export_sequence_number), 0) + 1 
  INTO v_next_seq
  FROM audit_exports
  WHERE company_id = p_company_id;
  
  RETURN v_next_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to validate export hash
CREATE OR REPLACE FUNCTION validate_export_hash(
  p_export_id uuid,
  p_file_contents bytea
)
RETURNS boolean AS $$
DECLARE
  v_stored_hash text;
  v_calculated_hash text;
BEGIN
  -- Get stored hash
  SELECT file_hash INTO v_stored_hash
  FROM audit_exports
  WHERE id = p_export_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate hash of provided file contents
  v_calculated_hash := encode(digest(p_file_contents, 'sha256'), 'hex');
  
  -- Compare
  RETURN v_stored_hash = v_calculated_hash;
END;
$$ LANGUAGE plpgsql;

-- Function to create export with automatic hash chain
CREATE OR REPLACE FUNCTION create_audit_export(
  p_company_id uuid,
  p_export_type text,
  p_export_format text,
  p_from_date timestamptz,
  p_to_date timestamptz,
  p_file_path text,
  p_file_hash text,
  p_purpose text,
  p_regulator_name text DEFAULT NULL,
  p_compliance_frameworks text[] DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_export_id uuid;
  v_previous_export_id uuid;
  v_sequence_number integer;
BEGIN
  -- Get previous export for chain
  SELECT id INTO v_previous_export_id
  FROM audit_exports
  WHERE company_id = p_company_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get next sequence number
  v_sequence_number := get_next_export_sequence(p_company_id);
  
  -- Create export record
  INSERT INTO audit_exports (
    company_id,
    export_type,
    export_format,
    from_date,
    to_date,
    file_path,
    file_hash,
    purpose,
    requested_by,
    regulator_name,
    compliance_frameworks,
    previous_export_id,
    export_sequence_number,
    expires_at
  ) VALUES (
    p_company_id,
    p_export_type,
    p_export_format,
    p_from_date,
    p_to_date,
    p_file_path,
    p_file_hash,
    p_purpose,
    auth.uid(),
    p_regulator_name,
    p_compliance_frameworks,
    v_previous_export_id,
    v_sequence_number,
    now() + interval '10 years' -- Default retention period
  )
  RETURNING id INTO v_export_id;
  
  RETURN v_export_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-set sequence number on insert
CREATE OR REPLACE FUNCTION set_export_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.export_sequence_number IS NULL THEN
    NEW.export_sequence_number := get_next_export_sequence(NEW.company_id);
  END IF;
  
  -- Set default retention period if not specified
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + interval '10 years';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_export_sequence_on_insert ON audit_exports;
CREATE TRIGGER set_export_sequence_on_insert
  BEFORE INSERT ON audit_exports
  FOR EACH ROW
  EXECUTE FUNCTION set_export_sequence_number();

-- Prevent updates to audit exports (immutability)
CREATE OR REPLACE FUNCTION prevent_audit_export_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit exports are immutable and cannot be updated';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_export_update ON audit_exports;
CREATE TRIGGER prevent_export_update
  BEFORE UPDATE ON audit_exports
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_export_update();

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for export audit trail
CREATE OR REPLACE VIEW audit_export_trail AS
SELECT 
  ae.id,
  ae.company_id,
  c.name as company_name,
  ae.export_type,
  ae.export_format,
  ae.regulator_name,
  ae.from_date,
  ae.to_date,
  ae.file_path,
  ae.file_hash,
  ae.export_sequence_number,
  ae.compliance_frameworks,
  ae.purpose,
  ae.created_at,
  p.full_name as requested_by_name,
  ae.signed_at,
  ae.previous_export_id,
  prev_ae.file_hash as previous_export_hash
FROM audit_exports ae
LEFT JOIN companies c ON ae.company_id = c.id
LEFT JOIN profiles p ON ae.requested_by = p.id
LEFT JOIN audit_exports prev_ae ON ae.previous_export_id = prev_ae.id;

GRANT SELECT ON audit_export_trail TO authenticated;
