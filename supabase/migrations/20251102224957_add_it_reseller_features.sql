/*
  # IT Reseller Enhanced Features

  ## New Tables
  
  1. **product_types**
     - Manages different types of IT products (Laptops, Desktops, Phones, etc.)
     - Custom testing checklists per product type
     - Custom refurbishment cost categories per product type
  
  2. **testing_checklist_templates**
     - Checklist items specific to each product type
     - Examples: Screen, Battery, Ports, Keyboard, etc.
  
  3. **refurbishment_cost_categories**
     - Cost categories per product type
     - Examples: RAM, SSD, Battery, Paintwork, etc.
  
  4. **assets**
     - Individual tracked items with serial numbers
     - Condition grading and functional status
     - Links to inventory items for stock management
  
  5. **asset_testing_results**
     - Testing checklist results for each asset
  
  6. **asset_refurbishment_costs**
     - Refurbishment costs per asset
  
  7. **asset_specifications**
     - Model specifications (CPU, RAM, Storage, etc.)
  
  8. **asset_photos**
     - Multiple photos per asset
  
  9. **purchase_lots**
     - Batch tracking for bulk purchases
  
  10. **lot_assets**
      - Links assets to purchase lots
  
  11. **rma_requests**
      - Return merchandise authorization tracking
  
  12. **asset_history**
      - Complete purchase/sales/movement history per serial number

  ## Security
  - RLS enabled on all tables
  - Company-based access control
  - Staff and above can manage most data
  - Viewers can only read data
*/

-- Product Types
CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product types in their companies"
  ON product_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = product_types.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage product types"
  ON product_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = product_types.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Testing Checklist Templates
CREATE TABLE IF NOT EXISTS testing_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id uuid REFERENCES product_types(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE testing_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view testing templates"
  ON testing_checklist_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = testing_checklist_templates.product_type_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage testing templates"
  ON testing_checklist_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = testing_checklist_templates.product_type_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- Refurbishment Cost Categories
CREATE TABLE IF NOT EXISTS refurbishment_cost_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id uuid REFERENCES product_types(id) ON DELETE CASCADE NOT NULL,
  category_name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE refurbishment_cost_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refurbishment categories"
  ON refurbishment_cost_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = refurbishment_cost_categories.product_type_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage refurbishment categories"
  ON refurbishment_cost_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = refurbishment_cost_categories.product_type_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- Purchase Lots
CREATE TABLE IF NOT EXISTS purchase_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  lot_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date date NOT NULL,
  total_items int DEFAULT 0,
  total_cost decimal(15,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(company_id, lot_number)
);

ALTER TABLE purchase_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase lots in their companies"
  ON purchase_lots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_lots.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage purchase lots"
  ON purchase_lots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_lots.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Assets (Individual Tracked Items)
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  product_type_id uuid REFERENCES product_types(id) ON DELETE SET NULL,
  serial_number text NOT NULL,
  imei text,
  
  -- Condition & Status
  cosmetic_grade text CHECK (cosmetic_grade IN ('A', 'B', 'C', 'For Parts')) DEFAULT 'B',
  functional_status text CHECK (functional_status IN ('Fully Working', 'Minor Issues', 'For Parts')) DEFAULT 'Fully Working',
  refurbishment_status text CHECK (refurbishment_status IN ('Pending', 'In Progress', 'Completed', 'Not Required')) DEFAULT 'Not Required',
  
  -- Specifications
  brand text,
  model text,
  cpu text,
  ram text,
  storage text,
  screen_size text,
  other_specs jsonb,
  
  -- Pricing
  purchase_price decimal(15,2),
  refurbishment_cost decimal(15,2) DEFAULT 0,
  market_price decimal(15,2),
  selling_price decimal(15,2),
  
  -- Warranty
  warranty_months int DEFAULT 0,
  warranty_start_date date,
  warranty_end_date date,
  
  -- Status
  status text CHECK (status IN ('In Stock', 'Refurbishment', 'Listed', 'Reserved', 'Sold', 'RMA')) DEFAULT 'In Stock',
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Dates
  purchase_date date,
  manufacture_date date,
  listed_date date,
  sold_date date,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, serial_number)
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assets in their companies"
  ON assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = assets.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage assets"
  ON assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = assets.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Asset Testing Results
CREATE TABLE IF NOT EXISTS asset_testing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  checklist_item text NOT NULL,
  result text CHECK (result IN ('Pass', 'Fail', 'N/A')) DEFAULT 'N/A',
  notes text,
  tested_at timestamptz DEFAULT now(),
  tested_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asset_testing_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view testing results"
  ON asset_testing_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_testing_results.asset_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage testing results"
  ON asset_testing_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_testing_results.asset_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- Asset Refurbishment Costs
CREATE TABLE IF NOT EXISTS asset_refurbishment_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  cost decimal(15,2) NOT NULL,
  description text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asset_refurbishment_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refurbishment costs"
  ON asset_refurbishment_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_refurbishment_costs.asset_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage refurbishment costs"
  ON asset_refurbishment_costs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_refurbishment_costs.asset_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- Asset Photos
CREATE TABLE IF NOT EXISTS asset_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  caption text,
  sort_order int DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asset_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset photos"
  ON asset_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_photos.asset_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage asset photos"
  ON asset_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_photos.asset_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- Lot Assets (Links assets to purchase lots)
CREATE TABLE IF NOT EXISTS lot_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid REFERENCES purchase_lots(id) ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  unit_cost decimal(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lot_id, asset_id)
);

ALTER TABLE lot_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lot assets"
  ON lot_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_lots pl
      JOIN user_company_access uca ON uca.company_id = pl.company_id
      WHERE pl.id = lot_assets.lot_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage lot assets"
  ON lot_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_lots pl
      JOIN user_company_access uca ON uca.company_id = pl.company_id
      WHERE pl.id = lot_assets.lot_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- RMA Requests
CREATE TABLE IF NOT EXISTS rma_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  rma_number text NOT NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE SET NULL,
  
  reason text NOT NULL,
  status text CHECK (status IN ('Pending', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Refunded')) DEFAULT 'Pending',
  
  requested_date date DEFAULT CURRENT_DATE,
  approved_date date,
  completed_date date,
  
  resolution text,
  refund_amount decimal(15,2),
  replacement_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, rma_number)
);

ALTER TABLE rma_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view RMA requests in their companies"
  ON rma_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = rma_requests.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage RMA requests"
  ON rma_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = rma_requests.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Asset History (Complete audit trail)
CREATE TABLE IF NOT EXISTS asset_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  event_type text CHECK (event_type IN ('Purchase', 'Testing', 'Refurbishment', 'Listed', 'Reserved', 'Sale', 'RMA', 'Status Change', 'Location Change')) NOT NULL,
  event_date timestamptz DEFAULT now(),
  description text NOT NULL,
  reference_id uuid,
  reference_type text,
  performed_by uuid REFERENCES auth.users(id),
  metadata jsonb
);

ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset history"
  ON asset_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_history.asset_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can create asset history"
  ON asset_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assets a
      JOIN user_company_access uca ON uca.company_id = a.company_id
      WHERE a.id = asset_history.asset_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(company_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_product_type ON assets(product_type_id);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_company ON purchase_lots(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_history(asset_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_rma_requests_company ON rma_requests(company_id, status);

-- Function to update asset total refurbishment cost
CREATE OR REPLACE FUNCTION update_asset_refurbishment_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assets
  SET refurbishment_cost = (
    SELECT COALESCE(SUM(cost), 0)
    FROM asset_refurbishment_costs
    WHERE asset_id = NEW.asset_id
  ),
  updated_at = now()
  WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_refurb_cost
  AFTER INSERT OR UPDATE OR DELETE ON asset_refurbishment_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_refurbishment_total();

-- Function to log asset history on status change
CREATE OR REPLACE FUNCTION log_asset_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_history (asset_id, event_type, description, performed_by)
    VALUES (
      NEW.id,
      'Status Change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_asset_status
  AFTER UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION log_asset_status_change();
