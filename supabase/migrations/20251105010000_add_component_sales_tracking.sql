/*
  # Add Component Sales and Transfer Tracking

  ## Overview
  Track sales of harvested components to customers and transfers to other assets
  for accurate P/L calculation by purchase lot.

  ## Changes

  1. **Update: harvested_components_inventory**
     - Add sale/transfer tracking fields
     - Track cost and revenue per component

  2. **New Table: component_sales**
     - Track component sales to customers
     - Link to invoices and customers
     - Calculate profit per sale

  3. **Enhanced: component_transactions**
     - Add financial tracking fields
     - Link to sales records

  ## Security
  - RLS enabled on all tables
  - Company-based access control
*/

-- Add sales and cost tracking to harvested_components_inventory
DO $$
BEGIN
  -- Sale tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvested_components_inventory'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE harvested_components_inventory
      ADD COLUMN status text DEFAULT 'available' CHECK (status IN ('available', 'sold', 'installed', 'reserved', 'scrapped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvested_components_inventory'
    AND column_name = 'cost_basis'
  ) THEN
    ALTER TABLE harvested_components_inventory
      ADD COLUMN cost_basis decimal(15,2),
      ADD COLUMN selling_price decimal(15,2),
      ADD COLUMN profit decimal(15,2),
      ADD COLUMN sold_date timestamptz,
      ADD COLUMN sold_to_customer_id uuid REFERENCES customers(id),
      ADD COLUMN installed_to_asset_id uuid REFERENCES assets(id),
      ADD COLUMN installed_date timestamptz;
  END IF;
END $$;

-- Component Sales (tracks sales to customers)
CREATE TABLE IF NOT EXISTS component_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Component Reference
  harvested_component_id uuid REFERENCES harvested_components_inventory(id) ON DELETE SET NULL,
  component_type text NOT NULL,
  component_name text NOT NULL,
  component_serial text,
  capacity text,

  -- Customer & Order
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE SET NULL,

  -- Financial
  cost_basis decimal(15,2) NOT NULL,
  selling_price decimal(15,2) NOT NULL,
  profit decimal(15,2) GENERATED ALWAYS AS (selling_price - cost_basis) STORED,

  -- Source Tracking (for P/L by lot)
  source_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  source_lot_id uuid REFERENCES purchase_lots(id) ON DELETE SET NULL,

  -- Metadata
  quantity int DEFAULT 1 NOT NULL,
  sale_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE component_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view component sales in their companies"
  ON component_sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_sales.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage component sales"
  ON component_sales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_sales.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff', 'sales')
    )
  );

-- Add financial fields to component_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'component_transactions'
    AND column_name = 'cost_basis'
  ) THEN
    ALTER TABLE component_transactions
      ADD COLUMN cost_basis decimal(15,2),
      ADD COLUMN selling_price decimal(15,2),
      ADD COLUMN customer_id uuid REFERENCES customers(id),
      ADD COLUMN sales_record_id uuid REFERENCES component_sales(id);
  END IF;
END $$;

-- Function to calculate total component profit by lot
CREATE OR REPLACE FUNCTION calculate_lot_component_profit(
  p_lot_id uuid
) RETURNS json AS $$
DECLARE
  v_total_harvested_value decimal(15,2);
  v_total_sold_revenue decimal(15,2);
  v_total_sold_cost decimal(15,2);
  v_total_profit decimal(15,2);
  v_components_sold int;
  v_components_harvested int;
  v_result json;
BEGIN
  -- Get harvested component market values
  SELECT
    COALESCE(SUM(hci.market_value_at_harvest), 0),
    COUNT(*)
  INTO v_total_harvested_value, v_components_harvested
  FROM harvested_components_inventory hci
  JOIN assets a ON a.id = hci.source_asset_id
  WHERE a.purchase_lot_id = p_lot_id
    AND hci.market_value_at_harvest IS NOT NULL;

  -- Get sold component revenue and costs
  SELECT
    COALESCE(SUM(cs.selling_price), 0),
    COALESCE(SUM(cs.cost_basis), 0),
    COUNT(*)
  INTO v_total_sold_revenue, v_total_sold_cost, v_components_sold
  FROM component_sales cs
  WHERE cs.source_lot_id = p_lot_id;

  v_total_profit := v_total_sold_revenue - v_total_sold_cost;

  v_result := json_build_object(
    'total_harvested_value', ROUND(v_total_harvested_value, 2),
    'total_sold_revenue', ROUND(v_total_sold_revenue, 2),
    'total_sold_cost', ROUND(v_total_sold_cost, 2),
    'total_profit', ROUND(v_total_profit, 2),
    'components_harvested', v_components_harvested,
    'components_sold', v_components_sold
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update component status after sale
CREATE OR REPLACE FUNCTION update_component_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Update harvested_components_inventory
  UPDATE harvested_components_inventory
  SET
    status = 'sold',
    selling_price = NEW.selling_price,
    profit = NEW.selling_price - NEW.cost_basis,
    sold_date = NEW.sale_date,
    sold_to_customer_id = NEW.customer_id,
    quantity_available = quantity_available - NEW.quantity
  WHERE id = NEW.harvested_component_id;

  -- Create transaction record
  INSERT INTO component_transactions (
    company_id,
    transaction_type,
    component_type,
    component_name,
    quantity,
    cost_basis,
    selling_price,
    customer_id,
    sales_record_id,
    reason,
    performed_by,
    performed_at
  ) VALUES (
    NEW.company_id,
    'sell',
    NEW.component_type,
    NEW.component_name,
    NEW.quantity,
    NEW.cost_basis,
    NEW.selling_price,
    NEW.customer_id,
    NEW.id,
    'Sold to customer',
    NEW.created_by,
    NEW.sale_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_component_sale
  AFTER INSERT ON component_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_component_after_sale();

-- Function to cost component transfer to asset
CREATE OR REPLACE FUNCTION cost_component_transfer()
RETURNS TRIGGER AS $$
DECLARE
  v_component_record RECORD;
  v_cost_basis decimal(15,2);
BEGIN
  -- Only process 'install' transactions
  IF NEW.transaction_type = 'install' THEN
    -- Get the harvested component details
    SELECT
      hci.id,
      hci.market_value_at_harvest,
      hci.cost_basis,
      a.purchase_lot_id
    INTO v_component_record
    FROM harvested_components_inventory hci
    LEFT JOIN assets a ON a.id = hci.source_asset_id
    WHERE hci.component_serial = NEW.notes -- Assuming serial is in notes
      AND hci.company_id = NEW.company_id
      AND hci.status = 'available'
    LIMIT 1;

    IF FOUND THEN
      -- Use market value at harvest as cost basis
      v_cost_basis := COALESCE(v_component_record.market_value_at_harvest, v_component_record.cost_basis, 0);

      -- Update the transaction with cost
      UPDATE component_transactions
      SET cost_basis = v_cost_basis
      WHERE id = NEW.id;

      -- Update harvested inventory
      UPDATE harvested_components_inventory
      SET
        status = 'installed',
        installed_to_asset_id = NEW.destination_asset_id,
        installed_date = NEW.performed_at,
        quantity_available = quantity_available - 1
      WHERE id = v_component_record.id;

      -- Add cost to destination asset's refurbishment cost
      UPDATE assets
      SET refurbishment_cost = COALESCE(refurbishment_cost, 0) + v_cost_basis
      WHERE id = NEW.destination_asset_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cost_component_on_install
  AFTER INSERT ON component_transactions
  FOR EACH ROW
  EXECUTE FUNCTION cost_component_transfer();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_sales_lot ON component_sales(source_lot_id);
CREATE INDEX IF NOT EXISTS idx_component_sales_customer ON component_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_component_sales_date ON component_sales(company_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_harvested_inventory_status ON harvested_components_inventory(company_id, status);
CREATE INDEX IF NOT EXISTS idx_component_transactions_type ON component_transactions(company_id, transaction_type);

-- Comments
COMMENT ON TABLE component_sales IS
  'Tracks sales of harvested components to customers. Used for P/L calculation by purchase lot.';

COMMENT ON COLUMN harvested_components_inventory.cost_basis IS
  'Cost to acquire/harvest this component. Usually the market_value_at_harvest.';

COMMENT ON COLUMN harvested_components_inventory.selling_price IS
  'Price component was sold for to customer.';

COMMENT ON COLUMN harvested_components_inventory.profit IS
  'Profit from selling component (selling_price - cost_basis).';
