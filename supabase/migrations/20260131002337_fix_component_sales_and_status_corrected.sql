/*
  # Fix Component Sales Tracking

  1. Add missing status column to harvested_components_inventory
  2. Create component_sales table if it doesn't exist
  3. Add all necessary fields for component sales tracking
  
  ## Changes
  
  1. **Update: harvested_components_inventory**
     - Add status column (available, sold, installed, reserved, scrapped)
     - Add sale tracking fields (cost_basis, selling_price, profit, sold_date)
     - Add installation tracking fields
  
  2. **New Table: component_sales**
     - Track component sales to customers
     - Link to invoices and purchase lots
     - Calculate profit per sale
  
  ## Security
  - RLS enabled on component_sales
  - Company-based access control
*/

-- Add status and sales tracking to harvested_components_inventory
DO $$
BEGIN
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

-- Component Sales table
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

DROP POLICY IF EXISTS "Users can view component sales in their companies" ON component_sales;
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

DROP POLICY IF EXISTS "Staff and above can manage component sales" ON component_sales;
CREATE POLICY "Staff and above can manage component sales"
  ON component_sales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_sales.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Add financial fields to component_transactions if they don't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_component_sales_lot ON component_sales(source_lot_id);
CREATE INDEX IF NOT EXISTS idx_component_sales_customer ON component_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_component_sales_date ON component_sales(company_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_harvested_inventory_status ON harvested_components_inventory(company_id, status);
