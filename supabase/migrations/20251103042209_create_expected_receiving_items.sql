/*
  # Create Expected Receiving Items Table
  
  1. New Table
    - `expected_receiving_items` - Pre-loaded items from supplier packing list
  
  2. Modifications
    - Enhance `receiving_logs` with workflow columns
    - Add receiving columns to `assets` and `purchase_orders`
  
  3. Security
    - Enable RLS
*/

-- Table: expected_receiving_items
CREATE TABLE IF NOT EXISTS expected_receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL,
  
  serial_number TEXT NOT NULL,
  supplier_sku TEXT,
  
  brand TEXT,
  model TEXT,
  expected_specs JSONB DEFAULT '{}'::jsonb,
  expected_grade TEXT,
  expected_condition TEXT,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  
  po_line_id UUID,
  match_confidence TEXT DEFAULT 'manual',
  
  status TEXT DEFAULT 'awaiting',
  receiving_log_id UUID,
  received_at TIMESTAMPTZ,
  received_by UUID,
  
  actual_specs JSONB DEFAULT '{}'::jsonb,
  physical_condition TEXT,
  physical_grade TEXT,
  
  has_discrepancy BOOLEAN DEFAULT false,
  discrepancies JSONB DEFAULT '[]'::jsonb,
  
  is_bonus BOOLEAN DEFAULT false,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expected_serial ON expected_receiving_items(serial_number);
CREATE INDEX IF NOT EXISTS idx_expected_po ON expected_receiving_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_expected_status ON expected_receiving_items(status);
CREATE INDEX IF NOT EXISTS idx_expected_receiving_log ON expected_receiving_items(receiving_log_id);
CREATE INDEX IF NOT EXISTS idx_expected_company ON expected_receiving_items(company_id);

-- Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_expected_company'
  ) THEN
    ALTER TABLE expected_receiving_items 
    ADD CONSTRAINT fk_expected_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_expected_po'
  ) THEN
    ALTER TABLE expected_receiving_items 
    ADD CONSTRAINT fk_expected_po 
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_expected_po_line'
  ) THEN
    ALTER TABLE expected_receiving_items 
    ADD CONSTRAINT fk_expected_po_line 
    FOREIGN KEY (po_line_id) REFERENCES purchase_order_lines(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_expected_receiving_log'
  ) THEN
    ALTER TABLE expected_receiving_items 
    ADD CONSTRAINT fk_expected_receiving_log 
    FOREIGN KEY (receiving_log_id) REFERENCES receiving_logs(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_expected_received_by'
  ) THEN
    ALTER TABLE expected_receiving_items 
    ADD CONSTRAINT fk_expected_received_by 
    FOREIGN KEY (received_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enhance receiving_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'shipment_number'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN shipment_number INT DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'total_bonus'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN total_bonus INT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'total_missing'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN total_missing INT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'total_discrepancies'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN total_discrepancies INT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'total_cost_expected'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN total_cost_expected NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'total_cost_actual'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN total_cost_actual NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_logs' AND column_name = 'purchase_lot_id'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN purchase_lot_id UUID REFERENCES purchase_lots(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Modify assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'expected_receiving_item_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN expected_receiving_item_id UUID REFERENCES expected_receiving_items(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'is_bonus_item'
  ) THEN
    ALTER TABLE assets ADD COLUMN is_bonus_item BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'has_discrepancy'
  ) THEN
    ALTER TABLE assets ADD COLUMN has_discrepancy BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'discrepancy_summary'
  ) THEN
    ALTER TABLE assets ADD COLUMN discrepancy_summary JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Modify purchase_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'total_shipments'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN total_shipments INT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'shipments_received'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN shipments_received INT DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE expected_receiving_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's expected receiving items"
  ON expected_receiving_items FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert expected receiving items"
  ON expected_receiving_items FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's expected receiving items"
  ON expected_receiving_items FOR UPDATE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's expected receiving items"
  ON expected_receiving_items FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));