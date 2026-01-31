/*
  # Add ITAD Business Types and Projects System

  ## Overview
  This migration adds entity-level classification and ITAD project management to support
  both reseller and ITAD service business models within the same platform.

  ## 1. Entity Classification

  ### Customers Table
  - Add `business_type` field with options:
    - `sales_customer` (default) - Buys refurbished stock from us
    - `itad_service_customer` - Sends assets for ITAD, pays service fees, gets revenue share
    - `recycling_vendor` - Downstream recycler we send scrap to

  ### Suppliers Table
  - Add `business_type` field with options:
    - `purchase_vendor` (default) - We buy used/refurb stock from them
    - `consignment_vendor` - Provides stock on consignment terms

  ## 2. ITAD Projects Table

  New table to track ITAD service engagements (separate from Purchase Orders):
  - Project identification and tracking
  - Service type classification
  - Financial terms (service fees, revenue sharing)
  - Data sanitization requirements
  - Environmental compliance tracking
  - Certificate generation
  - Project lifecycle management

  ## 3. Data Sanitization Records

  Track data destruction activities per project:
  - Method used (software wipe, degauss, physical destruction)
  - Standards compliance (NIST 800-88, DoD 5220.22-M, etc.)
  - Verification and certification

  ## 4. ITAD Certificates

  Generate compliance certificates for customers:
  - Certificate of data destruction
  - Certificate of recycling
  - Environmental impact reports

  ## 5. Security
  - Enable RLS on all new tables
  - Restrict access to company_id matching
  - Only authenticated users with appropriate roles can access

  ## Notes
  - Existing data preserved (all fields have safe defaults)
  - Purchase Orders remain unchanged (reseller flow intact)
  - ITAD Projects are a parallel workflow, not a replacement
  - Operators see clear visual distinction via business_type
*/

-- =====================================================
-- 1. ADD BUSINESS TYPE TO CUSTOMERS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN business_type TEXT DEFAULT 'sales_customer';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_business_type_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_business_type_check
    CHECK (business_type IN ('sales_customer', 'itad_service_customer', 'recycling_vendor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers(business_type);

-- =====================================================
-- 2. ADD BUSINESS TYPE TO SUPPLIERS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN business_type TEXT DEFAULT 'purchase_vendor';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'suppliers_business_type_check'
  ) THEN
    ALTER TABLE suppliers
    ADD CONSTRAINT suppliers_business_type_check
    CHECK (business_type IN ('purchase_vendor', 'consignment_vendor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_business_type ON suppliers(business_type);

-- =====================================================
-- 3. CREATE ITAD PROJECTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS itad_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  project_number TEXT NOT NULL,
  project_name TEXT,

  itad_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  service_type TEXT NOT NULL DEFAULT 'full_itad',
  expected_quantity INTEGER DEFAULT 0,
  actual_quantity INTEGER DEFAULT 0,

  service_fee DECIMAL(12,2) DEFAULT 0.00,
  service_fee_currency TEXT DEFAULT 'USD',
  revenue_share_percentage DECIMAL(5,2) DEFAULT 0.00,
  revenue_share_threshold DECIMAL(12,2) DEFAULT 0.00,

  data_sanitization_required BOOLEAN DEFAULT true,
  data_sanitization_standard TEXT DEFAULT 'NIST-800-88',

  environmental_reporting_required BOOLEAN DEFAULT true,
  r2_certified_required BOOLEAN DEFAULT false,

  certificate_required BOOLEAN DEFAULT true,
  certificate_generated BOOLEAN DEFAULT false,
  certificate_generated_at TIMESTAMPTZ,
  certificate_file_path TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT itad_projects_unique_number UNIQUE (company_id, project_number),
  CONSTRAINT itad_projects_service_type_check CHECK (
    service_type IN ('full_itad', 'data_destruction_only', 'remarketing_only', 'recycling_only', 'asset_recovery')
  ),
  CONSTRAINT itad_projects_status_check CHECK (
    status IN ('pending', 'intake_scheduled', 'receiving', 'in_progress', 'sanitization', 'testing', 'disposition', 'completed', 'cancelled')
  ),
  CONSTRAINT itad_projects_sanitization_standard_check CHECK (
    data_sanitization_standard IN ('NIST-800-88', 'DOD-5220.22-M', 'HMG-IS5', 'CESG-CPA', 'ISOIEC-27040', 'custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_itad_projects_company ON itad_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_itad_projects_customer ON itad_projects(itad_customer_id);
CREATE INDEX IF NOT EXISTS idx_itad_projects_status ON itad_projects(status);
CREATE INDEX IF NOT EXISTS idx_itad_projects_number ON itad_projects(project_number);

ALTER TABLE itad_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ITAD projects in their company"
  ON itad_projects FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create ITAD projects in their company"
  ON itad_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update ITAD projects in their company"
  ON itad_projects FOR UPDATE
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

CREATE POLICY "Users can delete ITAD projects in their company"
  ON itad_projects FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 4. CREATE DATA SANITIZATION RECORDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS data_sanitization_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  itad_project_id UUID REFERENCES itad_projects(id) ON DELETE CASCADE,

  method TEXT NOT NULL,
  standard TEXT NOT NULL DEFAULT 'NIST-800-88',
  software_used TEXT,
  software_version TEXT,

  passes_completed INTEGER DEFAULT 1,
  verification_method TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  failure_reason TEXT,

  certificate_number TEXT,
  certificate_issued_at TIMESTAMPTZ,

  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT sanitization_method_check CHECK (
    method IN ('software_wipe', 'degauss', 'physical_destruction', 'crypto_erase', 'secure_erase', 'manual_wipe')
  ),
  CONSTRAINT sanitization_status_check CHECK (
    status IN ('pending', 'in_progress', 'passed', 'failed', 'not_applicable')
  ),
  CONSTRAINT sanitization_standard_check CHECK (
    standard IN ('NIST-800-88', 'DOD-5220.22-M', 'HMG-IS5', 'CESG-CPA', 'ISOIEC-27040', 'custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_sanitization_company ON data_sanitization_records(company_id);
CREATE INDEX IF NOT EXISTS idx_sanitization_asset ON data_sanitization_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_sanitization_project ON data_sanitization_records(itad_project_id);
CREATE INDEX IF NOT EXISTS idx_sanitization_status ON data_sanitization_records(status);

ALTER TABLE data_sanitization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sanitization records in their company"
  ON data_sanitization_records FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create sanitization records in their company"
  ON data_sanitization_records FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update sanitization records in their company"
  ON data_sanitization_records FOR UPDATE
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

-- =====================================================
-- 5. CREATE ITAD CERTIFICATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS itad_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  certificate_number TEXT NOT NULL,
  certificate_type TEXT NOT NULL,

  itad_project_id UUID REFERENCES itad_projects(id) ON DELETE CASCADE,
  itad_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  title TEXT NOT NULL,
  description TEXT,

  total_assets INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10,2) DEFAULT 0.00,

  co2_saved_kg DECIMAL(10,2) DEFAULT 0.00,
  e_waste_diverted_kg DECIMAL(10,2) DEFAULT 0.00,
  materials_recycled_kg DECIMAL(10,2) DEFAULT 0.00,

  data_destruction_method TEXT,
  data_destruction_standard TEXT,
  assets_sanitized INTEGER DEFAULT 0,

  pdf_file_path TEXT,
  pdf_generated_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT itad_cert_unique_number UNIQUE (company_id, certificate_number),
  CONSTRAINT itad_cert_type_check CHECK (
    certificate_type IN ('data_destruction', 'recycling', 'environmental_impact', 'comprehensive', 'chain_of_custody')
  ),
  CONSTRAINT itad_cert_status_check CHECK (
    status IN ('draft', 'issued', 'sent', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_itad_certs_company ON itad_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_itad_certs_project ON itad_certificates(itad_project_id);
CREATE INDEX IF NOT EXISTS idx_itad_certs_customer ON itad_certificates(itad_customer_id);
CREATE INDEX IF NOT EXISTS idx_itad_certs_number ON itad_certificates(certificate_number);

ALTER TABLE itad_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certificates in their company"
  ON itad_certificates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create certificates in their company"
  ON itad_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update certificates in their company"
  ON itad_certificates FOR UPDATE
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

-- =====================================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_itad_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_itad_projects_updated_at ON itad_projects;
CREATE TRIGGER trigger_update_itad_projects_updated_at
  BEFORE UPDATE ON itad_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_itad_projects_updated_at();

CREATE OR REPLACE FUNCTION update_itad_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_itad_certificates_updated_at ON itad_certificates;
CREATE TRIGGER trigger_update_itad_certificates_updated_at
  BEFORE UPDATE ON itad_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_itad_certificates_updated_at();

-- =====================================================
-- 7. ADD HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_itad_project_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_project_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM itad_projects
  WHERE company_id = p_company_id
    AND project_number LIKE 'ITAD-' || v_year || '%';

  v_project_number := 'ITAD-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_project_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_certificate_number(p_company_id UUID, p_cert_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_cert_number TEXT;
  v_prefix TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  v_prefix := CASE p_cert_type
    WHEN 'data_destruction' THEN 'DD'
    WHEN 'recycling' THEN 'RC'
    WHEN 'environmental_impact' THEN 'EI'
    WHEN 'comprehensive' THEN 'COMP'
    WHEN 'chain_of_custody' THEN 'COC'
    ELSE 'CERT'
  END;

  SELECT COUNT(*) + 1 INTO v_count
  FROM itad_certificates
  WHERE company_id = p_company_id
    AND certificate_number LIKE v_prefix || '-' || v_year || '%';

  v_cert_number := v_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');

  RETURN v_cert_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. LINK ASSETS TO ITAD PROJECTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'itad_project_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN itad_project_id UUID REFERENCES itad_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assets_itad_project ON assets(itad_project_id);

COMMENT ON TABLE itad_projects IS 'ITAD service projects - separate from purchase orders, tracks asset intake from ITAD customers';
COMMENT ON TABLE data_sanitization_records IS 'Data destruction and sanitization tracking for ITAD compliance';
COMMENT ON TABLE itad_certificates IS 'Compliance certificates issued to ITAD customers for data destruction, recycling, and environmental reporting';
COMMENT ON COLUMN customers.business_type IS 'Classifies customer type: sales_customer (buys from us), itad_service_customer (we service their assets), recycling_vendor (downstream recycler)';
COMMENT ON COLUMN suppliers.business_type IS 'Classifies supplier type: purchase_vendor (we buy from them), consignment_vendor (consignment terms)';
