/*
  # Purchase Order & Receiving Workflow with Universal Mapping System

  ## Overview
  Complete implementation of professional inbound logistics workflow for IT resellers.
  Assets are ONLY created through receiving process (not manual creation).
  Includes intelligent supplier mapping system and comprehensive cost tracking.

  ## New Tables

  ### 1. Purchase Orders Management

  **purchase_orders**
  - Core PO tracking with supplier, dates, amounts
  - Status: draft, submitted, partial, received, closed, cancelled
  - Expected vs actual quantity tracking
  - Total cost calculations

  **purchase_order_lines**
  - Individual line items on PO
  - Product specifications expected
  - Quantity, unit cost, totals
  - Links to created assets after receiving

  ### 2. Universal Mapping System

  **field_dictionary**
  - Master dictionary of all possible column name variations
  - Supports fuzzy matching across suppliers
  - Multi-language support ready
  - Confidence scoring

  **supplier_mapping_templates**
  - Reusable mapping templates per supplier
  - Auto-detection rules (filename patterns, headers)
  - Version control for supplier format changes
  - Transformation rules for data normalization

  **mapping_history**
  - Learning system - tracks all user mappings
  - Identifies common patterns
  - Improves auto-suggestions over time
  - Audit trail for corrections

  ### 3. Receiving Process

  **receiving_logs**
  - Receiving sessions linked to POs
  - Track who received, when, where
  - Upload original supplier files
  - Status tracking (pending → completed)

  **receiving_line_items**
  - Staging area before asset creation
  - Individual items being inspected
  - Quality control data entry
  - Discrepancy tracking

  **receiving_discrepancies**
  - Track quantity/quality differences
  - Missing items, damaged items
  - Items not on PO
  - Resolution tracking

  ### 4. Supplier Management

  **suppliers** (enhanced)
  - Add mapping template references
  - Default terms, lead times
  - Performance tracking ready

  ## Cost Tracking Enhancement

  **Assets table additions:**
  - `purchase_order_id` - Source PO
  - `receiving_log_id` - Which receiving session
  - `po_unit_cost` - Original purchase price from supplier
  - `refurbishment_cost` - Cost of repairs/refurb (existing)
  - `total_cost` - Calculated: po_unit_cost + refurbishment_cost
  - `selling_price` - Final sale price
  - `profit_amount` - Calculated: selling_price - total_cost
  - `profit_margin` - Calculated: (profit_amount / selling_price) * 100
  - `received_date` - When physically received
  - `received_by` - User who inspected

  ## Workflow

  1. Create Purchase Order → Add lines with expected specs
  2. Supplier ships → Upload their Excel file
  3. System auto-maps columns using templates/AI
  4. Receive & inspect → Add grades, notes, location
  5. Create Assets → One click, all costs tracked
  6. Assets available → Ready for refurb/sale
  7. Calculate P&L → Full cost visibility

  ## Security
  - RLS enabled on all tables
  - Company-based isolation
  - Role-based permissions (staff+)
  - Audit trails
*/

-- =====================================================
-- SUPPLIERS TABLE ENHANCEMENTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'default_payment_terms'
  ) THEN
    ALTER TABLE suppliers
      ADD COLUMN default_payment_terms text,
      ADD COLUMN default_lead_time_days int,
      ADD COLUMN mapping_template_id uuid,
      ADD COLUMN contact_email text,
      ADD COLUMN contact_phone text,
      ADD COLUMN account_number text,
      ADD COLUMN notes text;
  END IF;
END $$;

-- =====================================================
-- FIELD DICTIONARY - Universal Mapping System
-- =====================================================

CREATE TABLE IF NOT EXISTS field_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  our_field_name text NOT NULL,
  variation_text text NOT NULL,
  language text DEFAULT 'en',
  confidence_weight int DEFAULT 100,
  match_type text CHECK (match_type IN ('exact', 'fuzzy', 'pattern', 'synonym')) DEFAULT 'exact',
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(our_field_name, variation_text, language)
);

CREATE INDEX IF NOT EXISTS idx_field_dictionary_field ON field_dictionary(our_field_name);
CREATE INDEX IF NOT EXISTS idx_field_dictionary_variation ON field_dictionary(variation_text);

-- Insert comprehensive field variations
INSERT INTO field_dictionary (our_field_name, variation_text, confidence_weight, match_type) VALUES
-- Serial Number variations
('serial_number', 'Serial Number', 100, 'exact'),
('serial_number', 'Serial No', 95, 'exact'),
('serial_number', 'S/N', 90, 'exact'),
('serial_number', 'SN', 85, 'exact'),
('serial_number', 'Service Tag', 95, 'exact'),
('serial_number', 'Asset Tag', 90, 'exact'),
('serial_number', 'Serial', 85, 'exact'),
('serial_number', 'Serial #', 90, 'exact'),
('serial_number', 'Device Serial', 90, 'exact'),

-- Brand variations
('brand', 'Brand', 100, 'exact'),
('brand', 'Manufacturer', 95, 'exact'),
('brand', 'Make', 90, 'exact'),
('brand', 'Vendor', 85, 'exact'),
('brand', 'OEM', 80, 'exact'),

-- Model variations
('model', 'Model', 100, 'exact'),
('model', 'Model Number', 95, 'exact'),
('model', 'Model Name', 95, 'exact'),
('model', 'System Model', 90, 'exact'),
('model', 'Product Model', 90, 'exact'),

-- Processor variations
('processor', 'Processor', 100, 'exact'),
('processor', 'CPU', 95, 'exact'),
('processor', 'Processor Type', 95, 'exact'),
('processor', 'CPU Type', 90, 'exact'),
('processor', 'Chip', 80, 'exact'),

-- RAM variations
('ram', 'RAM', 100, 'exact'),
('ram', 'Memory', 95, 'exact'),
('ram', 'System Memory', 90, 'exact'),
('ram', 'Installed Memory', 90, 'exact'),
('ram', 'Memory Size', 85, 'exact'),

-- Storage variations
('storage', 'Storage', 100, 'exact'),
('storage', 'Hard Drive', 95, 'exact'),
('storage', 'HDD', 90, 'exact'),
('storage', 'SSD', 90, 'exact'),
('storage', 'Drive', 85, 'exact'),
('storage', 'Disk', 85, 'exact'),
('storage', 'Storage Capacity', 90, 'exact'),

-- Screen variations
('screen', 'Screen', 100, 'exact'),
('screen', 'Display', 95, 'exact'),
('screen', 'Screen Size', 95, 'exact'),
('screen', 'Display Size', 95, 'exact'),
('screen', 'Monitor', 85, 'exact'),

-- Graphics variations
('graphics', 'Graphics', 100, 'exact'),
('graphics', 'GPU', 95, 'exact'),
('graphics', 'Video Card', 90, 'exact'),
('graphics', 'Graphics Card', 95, 'exact'),
('graphics', 'Video', 80, 'exact'),

-- OS variations
('os', 'OS', 100, 'exact'),
('os', 'Operating System', 100, 'exact'),
('os', 'Windows', 85, 'exact'),
('os', 'Software', 70, 'exact'),

-- Price variations
('unit_price', 'Price', 100, 'exact'),
('unit_price', 'Unit Price', 100, 'exact'),
('unit_price', 'Cost', 95, 'exact'),
('unit_price', 'Unit Cost', 95, 'exact'),
('unit_price', 'Purchase Price', 90, 'exact'),
('unit_price', 'Buying Price', 90, 'exact'),
('unit_price', 'Amount', 80, 'exact'),

-- Condition/Grade variations
('condition', 'Condition', 100, 'exact'),
('condition', 'Grade', 95, 'exact'),
('condition', 'Quality', 85, 'exact'),
('condition', 'Status', 80, 'exact')
ON CONFLICT (our_field_name, variation_text, language) DO NOTHING;

-- =====================================================
-- SUPPLIER MAPPING TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  version text DEFAULT '1.0',
  is_active boolean DEFAULT true,
  is_global boolean DEFAULT false,
  auto_detect_rules jsonb DEFAULT '{}',
  field_mappings jsonb DEFAULT '{}',
  transformation_rules jsonb DEFAULT '{}',
  usage_count int DEFAULT 0,
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_mapping_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their companies"
  ON supplier_mapping_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    ) OR is_global = true
  );

CREATE POLICY "Staff and above can manage templates"
  ON supplier_mapping_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = supplier_mapping_templates.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE INDEX IF NOT EXISTS idx_supplier_templates_supplier ON supplier_mapping_templates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_templates_company ON supplier_mapping_templates(company_id);

-- =====================================================
-- MAPPING HISTORY - Learning System
-- =====================================================

CREATE TABLE IF NOT EXISTS mapping_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  file_name text,
  supplier_column text NOT NULL,
  mapped_to_field text NOT NULL,
  was_auto_suggested boolean DEFAULT false,
  user_changed boolean DEFAULT false,
  confidence_score int,
  sample_values jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mapping_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mapping history in their companies"
  ON mapping_history FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mapping history"
  ON mapping_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_mapping_history_company ON mapping_history(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mapping_history_supplier ON mapping_history(supplier_id);

-- =====================================================
-- PURCHASE ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL NOT NULL,
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  status text CHECK (status IN ('draft', 'submitted', 'partial', 'received', 'closed', 'cancelled')) DEFAULT 'draft',
  payment_terms text,
  shipping_address text,
  billing_address text,
  subtotal decimal(15,2) DEFAULT 0,
  tax_amount decimal(15,2) DEFAULT 0,
  shipping_cost decimal(15,2) DEFAULT 0,
  total_amount decimal(15,2) DEFAULT 0,
  total_items_ordered int DEFAULT 0,
  total_items_received int DEFAULT 0,
  notes text,
  tracking_number text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, po_number)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view POs in their companies"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage POs"
  ON purchase_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_orders.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(company_id, status);

-- =====================================================
-- PURCHASE ORDER LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  line_number int NOT NULL,
  product_type_id uuid REFERENCES product_types(id) ON DELETE SET NULL,
  brand text,
  model text,
  description text,
  specifications jsonb DEFAULT '{}',
  quantity_ordered int NOT NULL DEFAULT 1,
  quantity_received int DEFAULT 0,
  unit_cost decimal(15,2) NOT NULL,
  line_total decimal(15,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  expected_condition text,
  supplier_sku text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PO lines in their companies"
  ON purchase_order_lines FOR SELECT
  TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff and above can manage PO lines"
  ON purchase_order_lines FOR ALL
  TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_company_access.user_id = auth.uid()
        AND user_company_access.role IN ('admin', 'manager', 'staff')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON purchase_order_lines(purchase_order_id);

-- =====================================================
-- RECEIVING LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS receiving_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL NOT NULL,
  receiving_number text NOT NULL,
  receiving_date date DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  received_by uuid REFERENCES auth.users(id),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  supplier_file_name text,
  supplier_file_url text,
  mapping_template_id uuid REFERENCES supplier_mapping_templates(id) ON DELETE SET NULL,
  total_items_expected int DEFAULT 0,
  total_items_received int DEFAULT 0,
  total_items_damaged int DEFAULT 0,
  has_discrepancies boolean DEFAULT false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, receiving_number)
);

ALTER TABLE receiving_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receiving logs in their companies"
  ON receiving_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage receiving logs"
  ON receiving_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = receiving_logs.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE INDEX IF NOT EXISTS idx_receiving_logs_company ON receiving_logs(company_id, receiving_date DESC);
CREATE INDEX IF NOT EXISTS idx_receiving_logs_po ON receiving_logs(purchase_order_id);

-- =====================================================
-- RECEIVING LINE ITEMS (Staging before Asset creation)
-- =====================================================

CREATE TABLE IF NOT EXISTS receiving_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_log_id uuid REFERENCES receiving_logs(id) ON DELETE CASCADE NOT NULL,
  po_line_id uuid REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  serial_number text NOT NULL,
  brand text,
  model text,
  processor text,
  ram text,
  storage text,
  screen text,
  graphics text,
  os text,
  other_specs jsonb DEFAULT '{}',
  unit_cost decimal(15,2) NOT NULL,
  cosmetic_grade text,
  functional_status text,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  is_damaged boolean DEFAULT false,
  matches_po boolean DEFAULT true,
  notes text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receiving_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receiving line items in their companies"
  ON receiving_line_items FOR SELECT
  TO authenticated
  USING (
    receiving_log_id IN (
      SELECT id FROM receiving_logs
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff and above can manage receiving line items"
  ON receiving_line_items FOR ALL
  TO authenticated
  USING (
    receiving_log_id IN (
      SELECT id FROM receiving_logs
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_company_access.user_id = auth.uid()
        AND user_company_access.role IN ('admin', 'manager', 'staff')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_receiving_items_log ON receiving_line_items(receiving_log_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_serial ON receiving_line_items(serial_number);

-- =====================================================
-- RECEIVING DISCREPANCIES
-- =====================================================

CREATE TABLE IF NOT EXISTS receiving_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_log_id uuid REFERENCES receiving_logs(id) ON DELETE CASCADE NOT NULL,
  po_line_id uuid REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  discrepancy_type text CHECK (discrepancy_type IN ('missing', 'damaged', 'extra', 'spec_mismatch', 'quantity')) NOT NULL,
  expected_value text,
  actual_value text,
  quantity_affected int DEFAULT 1,
  description text,
  resolution_status text CHECK (resolution_status IN ('pending', 'resolved', 'accepted', 'disputed')) DEFAULT 'pending',
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receiving_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discrepancies in their companies"
  ON receiving_discrepancies FOR SELECT
  TO authenticated
  USING (
    receiving_log_id IN (
      SELECT id FROM receiving_logs
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff and above can manage discrepancies"
  ON receiving_discrepancies FOR ALL
  TO authenticated
  USING (
    receiving_log_id IN (
      SELECT id FROM receiving_logs
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_company_access.user_id = auth.uid()
        AND user_company_access.role IN ('admin', 'manager', 'staff')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_discrepancies_receiving ON receiving_discrepancies(receiving_log_id);

-- =====================================================
-- ENHANCE ASSETS TABLE with Cost Tracking
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE assets
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
      ADD COLUMN receiving_log_id uuid REFERENCES receiving_logs(id) ON DELETE SET NULL,
      ADD COLUMN po_unit_cost decimal(15,2),
      ADD COLUMN total_cost decimal(15,2) GENERATED ALWAYS AS (COALESCE(po_unit_cost, 0) + COALESCE(refurbishment_cost, 0)) STORED,
      ADD COLUMN profit_amount decimal(15,2) GENERATED ALWAYS AS (COALESCE(selling_price, 0) - (COALESCE(po_unit_cost, 0) + COALESCE(refurbishment_cost, 0))) STORED,
      ADD COLUMN profit_margin decimal(5,2) GENERATED ALWAYS AS (
        CASE
          WHEN COALESCE(selling_price, 0) > 0
          THEN ((COALESCE(selling_price, 0) - (COALESCE(po_unit_cost, 0) + COALESCE(refurbishment_cost, 0))) / COALESCE(selling_price, 0) * 100)
          ELSE 0
        END
      ) STORED,
      ADD COLUMN received_date date,
      ADD COLUMN received_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assets_po ON assets(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_assets_receiving ON assets(receiving_log_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || LPAD(
      (SELECT COUNT(*) + 1 FROM purchase_orders WHERE company_id = NEW.company_id)::text,
      4, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_po_number_trigger ON purchase_orders;
CREATE TRIGGER generate_po_number_trigger
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_po_number();

-- Auto-generate receiving number
CREATE OR REPLACE FUNCTION generate_receiving_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receiving_number IS NULL OR NEW.receiving_number = '' THEN
    NEW.receiving_number := 'RCV-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || LPAD(
      (SELECT COUNT(*) + 1 FROM receiving_logs WHERE company_id = NEW.company_id)::text,
      4, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_receiving_number_trigger ON receiving_logs;
CREATE TRIGGER generate_receiving_number_trigger
  BEFORE INSERT ON receiving_logs
  FOR EACH ROW
  EXECUTE FUNCTION generate_receiving_number();

-- Update PO totals when lines change
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET
    subtotal = (SELECT COALESCE(SUM(line_total), 0) FROM purchase_order_lines WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)),
    total_amount = (SELECT COALESCE(SUM(line_total), 0) FROM purchase_order_lines WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)) + COALESCE(tax_amount, 0) + COALESCE(shipping_cost, 0),
    total_items_ordered = (SELECT COALESCE(SUM(quantity_ordered), 0) FROM purchase_order_lines WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)),
    total_items_received = (SELECT COALESCE(SUM(quantity_received), 0) FROM purchase_order_lines WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_po_totals_trigger ON purchase_order_lines;
CREATE TRIGGER update_po_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_po_totals();
