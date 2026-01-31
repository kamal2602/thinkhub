/*
  # Add ITAD Compliance Features (Phase 1)

  This migration adds comprehensive ITAD (IT Asset Disposition) compliance features:

  1. Data Sanitization Tracking
    - `asset_data_sanitization` table to track data wipe methods, software, and verification
    - Supports multiple sanitization events per asset (for re-testing)
    - Tracks operator, method, software used, wipe passes, and verification status
    - Links to report files for audit trail

  2. Certificate Generation System
    - `data_destruction_certificates` table for certificate tracking
    - `recycling_certificates` table for recycling/disposition certificates
    - Certificate numbering, dates, and status tracking
    - Support for multi-asset certificates (batch processing)

  3. Environmental Compliance
    - Weight tracking on assets (kg)
    - Disposal method tracking (resale, recycle, scrap, landfill, donation)
    - Material breakdown (plastic, metal, glass, pcb, batteries, other)
    - `environmental_reports` table for periodic compliance reporting
    - R2/e-Stewards metric calculations

  4. Security
    - Enable RLS on all new tables
    - Company-based access control
    - Authenticated user policies for all operations
*/

-- =====================================================
-- 1. DATA SANITIZATION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_data_sanitization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sanitization_method TEXT NOT NULL, -- 'DOD 5220.22-M', 'NIST 800-88 Purge', 'NIST 800-88 Clear', 'Secure Erase', 'Cryptographic Erase', 'Physical Destruction', 'Degaussing', 'Other'
  software_used TEXT, -- 'DBAN', 'Blancco', 'Secure Erase', 'dd', 'shred', etc.
  wipe_passes INTEGER DEFAULT 1,
  sanitization_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'pending', -- 'passed', 'failed', 'pending', 'not_verified'
  verification_date TIMESTAMPTZ,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  report_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_asset_data_sanitization_asset_id ON asset_data_sanitization(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_data_sanitization_company_id ON asset_data_sanitization(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_data_sanitization_verification_status ON asset_data_sanitization(verification_status);

-- RLS Policies
ALTER TABLE asset_data_sanitization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sanitization records for their company"
  ON asset_data_sanitization FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sanitization records for their company"
  ON asset_data_sanitization FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update sanitization records for their company"
  ON asset_data_sanitization FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sanitization records for their company"
  ON asset_data_sanitization FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 2. CERTIFICATE GENERATION SYSTEM
-- =====================================================

-- Data Destruction Certificates
CREATE TABLE IF NOT EXISTS data_destruction_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  asset_ids UUID[] NOT NULL, -- Array of asset IDs covered by this certificate
  total_assets_count INTEGER NOT NULL DEFAULT 0,
  destruction_method TEXT NOT NULL, -- Summary of methods used
  compliance_standards TEXT[], -- e.g., ['NIST 800-88', 'DOD 5220.22-M', 'R2', 'e-Stewards']
  authorized_signature TEXT, -- Name of authorized person
  signature_title TEXT,
  notes TEXT,
  pdf_url TEXT, -- URL to generated PDF certificate
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for certificate lookups
CREATE INDEX IF NOT EXISTS idx_data_destruction_certificates_company_id ON data_destruction_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_data_destruction_certificates_customer_id ON data_destruction_certificates(customer_id);
CREATE INDEX IF NOT EXISTS idx_data_destruction_certificates_certificate_number ON data_destruction_certificates(certificate_number);

-- RLS Policies
ALTER TABLE data_destruction_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certificates for their company"
  ON data_destruction_certificates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert certificates for their company"
  ON data_destruction_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update certificates for their company"
  ON data_destruction_certificates FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete certificates for their company"
  ON data_destruction_certificates FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Recycling/Disposition Certificates
CREATE TABLE IF NOT EXISTS recycling_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  asset_ids UUID[] NOT NULL,
  total_weight_kg NUMERIC(10,2),
  recycled_weight_kg NUMERIC(10,2),
  resold_weight_kg NUMERIC(10,2),
  scrapped_weight_kg NUMERIC(10,2),
  landfill_weight_kg NUMERIC(10,2),
  recycling_percentage NUMERIC(5,2),
  downstream_vendor_name TEXT, -- Recycling facility name
  downstream_vendor_certification TEXT, -- R2, e-Stewards, ISO 14001, etc.
  compliance_standards TEXT[],
  authorized_signature TEXT,
  signature_title TEXT,
  notes TEXT,
  pdf_url TEXT,
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for certificate lookups
CREATE INDEX IF NOT EXISTS idx_recycling_certificates_company_id ON recycling_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_recycling_certificates_customer_id ON recycling_certificates(customer_id);
CREATE INDEX IF NOT EXISTS idx_recycling_certificates_certificate_number ON recycling_certificates(certificate_number);

-- RLS Policies
ALTER TABLE recycling_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recycling certificates for their company"
  ON recycling_certificates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recycling certificates for their company"
  ON recycling_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update recycling certificates for their company"
  ON recycling_certificates FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recycling certificates for their company"
  ON recycling_certificates FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 3. ENVIRONMENTAL COMPLIANCE TRACKING
-- =====================================================

-- Add weight and disposal fields to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE assets ADD COLUMN weight_kg NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'disposal_method'
  ) THEN
    ALTER TABLE assets ADD COLUMN disposal_method TEXT; -- 'resale', 'recycle', 'scrap', 'landfill', 'donation', 'pending'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'disposal_date'
  ) THEN
    ALTER TABLE assets ADD COLUMN disposal_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'material_breakdown'
  ) THEN
    ALTER TABLE assets ADD COLUMN material_breakdown JSONB; -- {"plastic_kg": 0.5, "metal_kg": 2.3, "glass_kg": 0.1, "pcb_kg": 0.3, "battery_kg": 0.2, "other_kg": 0.1}
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'contains_hazmat'
  ) THEN
    ALTER TABLE assets ADD COLUMN contains_hazmat BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'hazmat_types'
  ) THEN
    ALTER TABLE assets ADD COLUMN hazmat_types TEXT[]; -- ['battery', 'crt', 'mercury', 'lead', 'other']
  END IF;
END $$;

-- Environmental Reports (periodic compliance reports)
CREATE TABLE IF NOT EXISTS environmental_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  total_assets_processed INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(10,2) DEFAULT 0,
  resold_weight_kg NUMERIC(10,2) DEFAULT 0,
  recycled_weight_kg NUMERIC(10,2) DEFAULT 0,
  scrapped_weight_kg NUMERIC(10,2) DEFAULT 0,
  landfill_weight_kg NUMERIC(10,2) DEFAULT 0,
  donated_weight_kg NUMERIC(10,2) DEFAULT 0,
  recycling_percentage NUMERIC(5,2) DEFAULT 0,
  landfill_diversion_percentage NUMERIC(5,2) DEFAULT 0,
  co2_offset_kg NUMERIC(10,2) DEFAULT 0, -- Calculated based on recycling vs landfill
  material_breakdown JSONB, -- Total materials by type
  notes TEXT,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for report lookups
CREATE INDEX IF NOT EXISTS idx_environmental_reports_company_id ON environmental_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_environmental_reports_period ON environmental_reports(report_period_start, report_period_end);

-- RLS Policies
ALTER TABLE environmental_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view environmental reports for their company"
  ON environmental_reports FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert environmental reports for their company"
  ON environmental_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update environmental reports for their company"
  ON environmental_reports FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete environmental reports for their company"
  ON environmental_reports FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to generate certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number(cert_type TEXT, company_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  count_part TEXT;
  next_number INTEGER;
BEGIN
  -- Determine prefix based on certificate type
  prefix := CASE
    WHEN cert_type = 'destruction' THEN 'DD'
    WHEN cert_type = 'recycling' THEN 'RC'
    ELSE 'CERT'
  END;

  -- Get current year
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get next number for this year and type
  IF cert_type = 'destruction' THEN
    SELECT COUNT(*) + 1 INTO next_number
    FROM data_destruction_certificates
    WHERE certificate_number LIKE prefix || '-' || year_part || '-%'
    AND data_destruction_certificates.company_id = generate_certificate_number.company_id;
  ELSE
    SELECT COUNT(*) + 1 INTO next_number
    FROM recycling_certificates
    WHERE certificate_number LIKE prefix || '-' || year_part || '-%'
    AND recycling_certificates.company_id = generate_certificate_number.company_id;
  END IF;

  -- Format count with leading zeros (4 digits)
  count_part := LPAD(next_number::TEXT, 4, '0');

  -- Return formatted certificate number: DD-2025-0001
  RETURN prefix || '-' || year_part || '-' || count_part;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. ENABLE REALTIME (optional but useful)
-- =====================================================

-- Enable realtime for new tables if needed for live updates
DO $$
BEGIN
  -- Enable realtime for asset_data_sanitization
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE asset_data_sanitization';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Enable realtime for data_destruction_certificates
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE data_destruction_certificates';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Enable realtime for recycling_certificates
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE recycling_certificates';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Enable realtime for environmental_reports
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE environmental_reports';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
