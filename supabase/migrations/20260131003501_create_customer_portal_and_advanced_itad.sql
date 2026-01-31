/*
  # Customer Portal and Advanced ITAD Features

  ## Overview
  This migration adds comprehensive customer portal functionality and advanced ITAD features
  including customer self-service, compliance tracking, downstream vendor management,
  and environmental reporting.

  ## 1. Customer Portal Users
  
  Creates a separate authentication system for ITAD customers to access their portal:
  - Email-based authentication
  - Link to customer records
  - Portal-specific permissions
  - Access tokens and session management

  ## 2. Collection Requests
  
  Allows customers to request asset pickups:
  - Upload asset lists
  - Schedule pickup dates
  - Track logistics status
  - Auto-create ITAD projects from requests

  ## 3. Downstream Vendors
  
  Track recycling vendors and where materials go:
  - Vendor certifications (R2, e-Stewards, ISO 14001)
  - Material shipments tracking
  - Compliance documentation
  - Chain of custody

  ## 4. Compliance Certifications
  
  Track company certifications and renewals:
  - R2v3, e-Stewards, ISO 14001, etc.
  - Expiration tracking and renewal alerts
  - Audit history
  - Document storage

  ## 5. Environmental Impact Tracking
  
  Detailed environmental metrics per project:
  - CO2 emissions saved
  - E-waste diverted from landfill
  - Materials recycled by type
  - Water and energy savings

  ## 6. Revenue Share Tracking
  
  Financial transparency for ITAD customers:
  - Asset-level revenue tracking
  - Cost breakdowns
  - Net revenue calculations
  - Settlement statements

  ## 7. Notification System
  
  Automated notifications for customers:
  - Email preferences
  - Notification history
  - Event triggers (asset received, sanitized, sold, etc.)

  ## Security
  - All tables have RLS enabled
  - Customer portal users can only see their own data
  - Separate from internal user authentication
  - API keys for programmatic access
*/

-- =====================================================
-- 1. CUSTOMER PORTAL USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  job_title TEXT,
  
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token TEXT,
  email_verification_sent_at TIMESTAMPTZ,
  
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  is_primary_contact BOOLEAN DEFAULT false,
  
  notification_preferences JSONB DEFAULT '{"email_on_asset_received": true, "email_on_sanitization_complete": true, "email_on_certificate_ready": true, "email_on_revenue_update": true}'::jsonb,
  
  api_key TEXT,
  api_key_created_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT customer_portal_users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_customer_portal_users_customer ON customer_portal_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_users_company ON customer_portal_users(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_users_email ON customer_portal_users(email);
CREATE INDEX IF NOT EXISTS idx_customer_portal_users_api_key ON customer_portal_users(api_key) WHERE api_key IS NOT NULL;

ALTER TABLE customer_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer portal users can view their own record"
  ON customer_portal_users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Company users can manage customer portal users"
  ON customer_portal_users FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- 2. COLLECTION REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS collection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  request_number TEXT NOT NULL,
  
  requested_by_portal_user_id UUID REFERENCES customer_portal_users(id),
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  requested_by_phone TEXT,
  
  pickup_location_address TEXT NOT NULL,
  pickup_location_city TEXT,
  pickup_location_state TEXT,
  pickup_location_zip TEXT,
  pickup_location_country TEXT DEFAULT 'USA',
  
  pickup_contact_name TEXT NOT NULL,
  pickup_contact_phone TEXT NOT NULL,
  pickup_contact_email TEXT,
  
  requested_pickup_date DATE,
  estimated_quantity INTEGER,
  estimated_weight_kg DECIMAL(10,2),
  
  asset_types TEXT[],
  special_instructions TEXT,
  
  uploaded_asset_list_path TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending_review',
  
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  scheduled_pickup_date DATE,
  carrier TEXT,
  tracking_number TEXT,
  
  itad_project_id UUID REFERENCES itad_projects(id),
  
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT collection_requests_unique_number UNIQUE (company_id, request_number),
  CONSTRAINT collection_requests_status_check CHECK (
    status IN ('pending_review', 'approved', 'scheduled', 'in_transit', 'received', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_collection_requests_company ON collection_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_collection_requests_customer ON collection_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_collection_requests_status ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_collection_requests_project ON collection_requests(itad_project_id);

ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own collection requests"
  ON collection_requests FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT customer_id FROM customer_portal_users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Company users can manage collection requests"
  ON collection_requests FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Customer portal users can create collection requests"
  ON collection_requests FOR INSERT
  TO authenticated
  WITH CHECK (customer_id IN (SELECT customer_id FROM customer_portal_users WHERE id = auth.uid()));

-- =====================================================
-- 3. DOWNSTREAM VENDORS (RECYCLERS)
-- =====================================================

CREATE TABLE IF NOT EXISTS downstream_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'recycler',
  
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  
  certifications TEXT[],
  r2_certified BOOLEAN DEFAULT false,
  r2_cert_number TEXT,
  r2_expiration_date DATE,
  
  e_stewards_certified BOOLEAN DEFAULT false,
  e_stewards_cert_number TEXT,
  e_stewards_expiration_date DATE,
  
  iso_14001_certified BOOLEAN DEFAULT false,
  iso_14001_cert_number TEXT,
  iso_14001_expiration_date DATE,
  
  epa_id TEXT,
  
  accepted_materials TEXT[],
  services_offered TEXT[],
  
  notes TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT downstream_vendors_type_check CHECK (
    vendor_type IN ('recycler', 'smelter', 'refiner', 'destruction_facility', 'donation_partner', 'reseller')
  )
);

CREATE INDEX IF NOT EXISTS idx_downstream_vendors_company ON downstream_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_downstream_vendors_type ON downstream_vendors(vendor_type);

ALTER TABLE downstream_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view downstream vendors in their company"
  ON downstream_vendors FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage downstream vendors in their company"
  ON downstream_vendors FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- 4. DOWNSTREAM SHIPMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS downstream_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  shipment_number TEXT NOT NULL,
  
  downstream_vendor_id UUID NOT NULL REFERENCES downstream_vendors(id) ON DELETE RESTRICT,
  itad_project_id UUID REFERENCES itad_projects(id),
  
  shipment_date DATE NOT NULL,
  carrier TEXT,
  tracking_number TEXT,
  
  asset_ids UUID[],
  total_assets INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10,2) DEFAULT 0,
  
  material_type TEXT,
  disposal_method TEXT NOT NULL,
  
  certificate_received BOOLEAN DEFAULT false,
  certificate_number TEXT,
  certificate_date DATE,
  certificate_file_path TEXT,
  
  payment_amount DECIMAL(12,2),
  payment_currency TEXT DEFAULT 'USD',
  
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT downstream_shipments_unique_number UNIQUE (company_id, shipment_number),
  CONSTRAINT downstream_shipments_disposal_check CHECK (
    disposal_method IN ('recycle', 'physical_destruction', 'smelting', 'refining', 'donation', 'resale', 'landfill')
  )
);

CREATE INDEX IF NOT EXISTS idx_downstream_shipments_company ON downstream_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_downstream_shipments_vendor ON downstream_shipments(downstream_vendor_id);
CREATE INDEX IF NOT EXISTS idx_downstream_shipments_project ON downstream_shipments(itad_project_id);

ALTER TABLE downstream_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view downstream shipments in their company"
  ON downstream_shipments FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage downstream shipments in their company"
  ON downstream_shipments FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- 5. COMPLIANCE CERTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS company_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  certification_type TEXT NOT NULL,
  certification_number TEXT,
  
  issued_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  
  issuing_organization TEXT NOT NULL,
  audit_date DATE,
  auditor_name TEXT,
  
  status TEXT NOT NULL DEFAULT 'active',
  
  certificate_file_path TEXT,
  
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT company_certifications_type_check CHECK (
    certification_type IN ('R2v3', 'e-Stewards', 'ISO-14001', 'ISO-9001', 'OHSAS-18001', 'NAID-AAA', 'RIOS', 'custom')
  ),
  CONSTRAINT company_certifications_status_check CHECK (
    status IN ('active', 'expired', 'suspended', 'in_renewal')
  )
);

CREATE INDEX IF NOT EXISTS idx_company_certifications_company ON company_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_company_certifications_type ON company_certifications(certification_type);
CREATE INDEX IF NOT EXISTS idx_company_certifications_expiration ON company_certifications(expiration_date);

ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certifications for their company"
  ON company_certifications FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage certifications for their company"
  ON company_certifications FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- 6. PROJECT ENVIRONMENTAL IMPACT
-- =====================================================

CREATE TABLE IF NOT EXISTS project_environmental_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  itad_project_id UUID NOT NULL REFERENCES itad_projects(id) ON DELETE CASCADE,
  
  total_weight_processed_kg DECIMAL(10,2) DEFAULT 0,
  
  weight_reused_kg DECIMAL(10,2) DEFAULT 0,
  weight_recycled_kg DECIMAL(10,2) DEFAULT 0,
  weight_donated_kg DECIMAL(10,2) DEFAULT 0,
  weight_scrapped_kg DECIMAL(10,2) DEFAULT 0,
  weight_landfill_kg DECIMAL(10,2) DEFAULT 0,
  
  co2_emissions_saved_kg DECIMAL(12,2) DEFAULT 0,
  water_saved_liters DECIMAL(12,2) DEFAULT 0,
  energy_saved_kwh DECIMAL(12,2) DEFAULT 0,
  
  materials_aluminum_kg DECIMAL(10,2) DEFAULT 0,
  materials_copper_kg DECIMAL(10,2) DEFAULT 0,
  materials_steel_kg DECIMAL(10,2) DEFAULT 0,
  materials_plastic_kg DECIMAL(10,2) DEFAULT 0,
  materials_gold_g DECIMAL(10,3) DEFAULT 0,
  materials_silver_g DECIMAL(10,3) DEFAULT 0,
  materials_palladium_g DECIMAL(10,3) DEFAULT 0,
  
  landfill_diversion_rate DECIMAL(5,2) DEFAULT 0,
  reuse_rate DECIMAL(5,2) DEFAULT 0,
  recycling_rate DECIMAL(5,2) DEFAULT 0,
  
  calculation_methodology TEXT DEFAULT 'EPA WARM Model',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT project_environmental_impact_unique UNIQUE (itad_project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_environmental_impact_company ON project_environmental_impact(company_id);
CREATE INDEX IF NOT EXISTS idx_project_environmental_impact_project ON project_environmental_impact(itad_project_id);

ALTER TABLE project_environmental_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view environmental impact for their company projects"
  ON project_environmental_impact FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR itad_project_id IN (
      SELECT id FROM itad_projects 
      WHERE itad_customer_id IN (SELECT customer_id FROM customer_portal_users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage environmental impact for their company"
  ON project_environmental_impact FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- 7. REVENUE SHARE TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS revenue_share_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  itad_project_id UUID NOT NULL REFERENCES itad_projects(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  transaction_date TIMESTAMPTZ DEFAULT now(),
  
  asset_id UUID REFERENCES assets(id),
  sales_invoice_id UUID,
  
  sale_price DECIMAL(12,2) DEFAULT 0,
  sale_currency TEXT DEFAULT 'USD',
  
  processing_cost DECIMAL(12,2) DEFAULT 0,
  refurbishment_cost DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  other_costs DECIMAL(12,2) DEFAULT 0,
  total_costs DECIMAL(12,2) DEFAULT 0,
  
  gross_profit DECIMAL(12,2) DEFAULT 0,
  
  revenue_share_percentage DECIMAL(5,2) NOT NULL,
  customer_share_amount DECIMAL(12,2) DEFAULT 0,
  company_share_amount DECIMAL(12,2) DEFAULT 0,
  
  settlement_status TEXT NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  settlement_reference TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT revenue_share_settlement_check CHECK (
    settlement_status IN ('pending', 'accrued', 'settled', 'disputed')
  )
);

CREATE INDEX IF NOT EXISTS idx_revenue_share_company ON revenue_share_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_share_project ON revenue_share_transactions(itad_project_id);
CREATE INDEX IF NOT EXISTS idx_revenue_share_customer ON revenue_share_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_revenue_share_asset ON revenue_share_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_revenue_share_status ON revenue_share_transactions(settlement_status);

ALTER TABLE revenue_share_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own revenue share transactions"
  ON revenue_share_transactions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT customer_id FROM customer_portal_users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Company users can manage revenue share transactions"
  ON revenue_share_transactions FOR ALL
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- 8. NOTIFICATION HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  recipient_type TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  
  notification_type TEXT NOT NULL,
  
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  related_entity_type TEXT,
  related_entity_id UUID,
  
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent',
  delivery_error TEXT,
  
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT notification_recipient_type_check CHECK (
    recipient_type IN ('internal_user', 'customer_portal_user', 'external')
  ),
  CONSTRAINT notification_type_check CHECK (
    notification_type IN (
      'asset_received', 'sanitization_complete', 'testing_complete', 
      'asset_sold', 'certificate_ready', 'revenue_share_update',
      'collection_request_approved', 'collection_request_scheduled',
      'shipment_in_transit', 'shipment_received', 'certification_expiring',
      'project_complete', 'settlement_ready'
    )
  ),
  CONSTRAINT notification_delivery_status_check CHECK (
    delivery_status IN ('sent', 'delivered', 'bounced', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_history_company ON notification_history(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_recipient ON notification_history(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent ON notification_history(sent_at);

ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications sent to them"
  ON notification_history FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid()
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_collection_request_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_request_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM collection_requests
  WHERE company_id = p_company_id
    AND request_number LIKE 'CR-' || v_year || '%';
  
  v_request_number := 'CR-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  
  RETURN v_request_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_downstream_shipment_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_shipment_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM downstream_shipments
  WHERE company_id = p_company_id
    AND shipment_number LIKE 'DS-' || v_year || '%';
  
  v_shipment_number := 'DS-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  
  RETURN v_shipment_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. UPDATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_portal_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_portal_users ON customer_portal_users;
CREATE TRIGGER trigger_update_customer_portal_users
  BEFORE UPDATE ON customer_portal_users
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_users_updated_at();

DROP TRIGGER IF EXISTS trigger_update_collection_requests ON collection_requests;
CREATE TRIGGER trigger_update_collection_requests
  BEFORE UPDATE ON collection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_users_updated_at();

DROP TRIGGER IF EXISTS trigger_update_downstream_vendors ON downstream_vendors;
CREATE TRIGGER trigger_update_downstream_vendors
  BEFORE UPDATE ON downstream_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_users_updated_at();

DROP TRIGGER IF EXISTS trigger_update_company_certifications ON company_certifications;
CREATE TRIGGER trigger_update_company_certifications
  BEFORE UPDATE ON company_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_users_updated_at();

DROP TRIGGER IF EXISTS trigger_update_project_environmental_impact ON project_environmental_impact;
CREATE TRIGGER trigger_update_project_environmental_impact
  BEFORE UPDATE ON project_environmental_impact
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_users_updated_at();

-- =====================================================
-- 11. ADD DOWNSTREAM VENDOR TO ASSETS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'downstream_vendor_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN downstream_vendor_id UUID REFERENCES downstream_vendors(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'downstream_shipment_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN downstream_shipment_id UUID REFERENCES downstream_shipments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assets_downstream_vendor ON assets(downstream_vendor_id);
CREATE INDEX IF NOT EXISTS idx_assets_downstream_shipment ON assets(downstream_shipment_id);

COMMENT ON TABLE customer_portal_users IS 'Customer-facing portal login accounts for ITAD customers to track their projects';
COMMENT ON TABLE collection_requests IS 'Customer-initiated requests for asset pickup/collection';
COMMENT ON TABLE downstream_vendors IS 'Recycling facilities and downstream processors where materials are sent';
COMMENT ON TABLE downstream_shipments IS 'Shipments of materials to downstream vendors with chain of custody';
COMMENT ON TABLE company_certifications IS 'Company compliance certifications (R2, e-Stewards, ISO, etc.) with expiration tracking';
COMMENT ON TABLE project_environmental_impact IS 'Detailed environmental metrics and impact calculations per ITAD project';
COMMENT ON TABLE revenue_share_transactions IS 'Revenue sharing transactions between company and ITAD customers';
COMMENT ON TABLE notification_history IS 'History of all notifications sent to customers and internal users';
