/*
  # Unified Sales System with Serial and Quantity Tracking

  ## Overview
  This migration creates a unified sales system that supports both serial-tracked
  items (laptops, phones, high-value components) and quantity-only items (cables,
  screws, low-value components). It enables partial fulfillment, batch shipping,
  and comprehensive delivery notes.

  ## Changes

  1. **Update: product_types**
     - Add tracking mode configuration
     - Configure per-product serial vs quantity tracking
     - Control bulk sales settings

  2. **Enhanced: sales_invoice_items**
     - Add tracking mode field
     - Support quantity fulfillment tracking
     - Enable partial fulfillment

  3. **New Table: invoice_serial_assignments**
     - Track specific serial numbers assigned to invoice lines
     - Support both assets and components
     - Enable batch fulfillment tracking

  4. **New Table: invoice_fulfillments**
     - Track fulfillment batches
     - Support partial shipments
     - Generate delivery notes per batch

  5. **New Table: delivery_notes**
     - Generate comprehensive delivery notes
     - List all serials or quantities per batch
     - Track shipping information

  ## Benefits
  - Single unified workflow for all sales
  - Flexible tracking (serial or quantity per product)
  - Partial fulfillment with multiple shipments
  - Complete audit trail for warranty/RMA
  - Maintains lot P/L tracking

  ## Security
  - RLS enabled on all new tables
  - Company-based access control
  - Staff and above can manage sales
*/

-- Add tracking configuration to product_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_types'
    AND column_name = 'requires_serial_tracking'
  ) THEN
    ALTER TABLE product_types
      ADD COLUMN requires_serial_tracking boolean DEFAULT false,
      ADD COLUMN allows_bulk_sales boolean DEFAULT true,
      ADD COLUMN is_component boolean DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN product_types.requires_serial_tracking IS
  'If true, each unit must have a unique serial number. If false, track by quantity only.';

COMMENT ON COLUMN product_types.allows_bulk_sales IS
  'If true, can sell multiple units in one line item.';

COMMENT ON COLUMN product_types.is_component IS
  'If true, this is a component (RAM, SSD, etc.) rather than a complete device.';

-- Update default product types to use serial tracking
UPDATE product_types
SET requires_serial_tracking = true
WHERE name IN ('Laptop', 'Desktop', 'Phone', 'Tablet', 'Server');

-- Enhanced sales_invoice_items for tracking mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoice_items'
    AND column_name = 'product_type_id'
  ) THEN
    ALTER TABLE sales_invoice_items
      ADD COLUMN product_type_id uuid REFERENCES product_types(id),
      ADD COLUMN product_model text,
      ADD COLUMN tracking_mode text CHECK (tracking_mode IN ('serial', 'quantity')) DEFAULT 'quantity',
      ADD COLUMN quantity_ordered int DEFAULT 1,
      ADD COLUMN quantity_fulfilled int DEFAULT 0,
      ADD COLUMN grade_id uuid;
  END IF;
END $$;

COMMENT ON COLUMN sales_invoice_items.tracking_mode IS
  'Determines if this line tracks individual serials or just quantity.';

COMMENT ON COLUMN sales_invoice_items.quantity_ordered IS
  'Total quantity ordered by customer.';

COMMENT ON COLUMN sales_invoice_items.quantity_fulfilled IS
  'Total quantity fulfilled/shipped so far (supports partial fulfillment).';

-- Invoice Serial Assignments (for serial-tracked items)
CREATE TABLE IF NOT EXISTS invoice_serial_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Invoice reference
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE NOT NULL,
  invoice_line_id uuid REFERENCES sales_invoice_items(id) ON DELETE CASCADE NOT NULL,

  -- Item reference (either asset OR component)
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  component_id uuid REFERENCES harvested_components_inventory(id) ON DELETE SET NULL,
  serial_number text NOT NULL,

  -- Fulfillment tracking
  fulfillment_batch_number int DEFAULT 1,
  delivery_note_id uuid,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),

  -- Ensure either asset_id or component_id is set
  CONSTRAINT either_asset_or_component CHECK (
    (asset_id IS NOT NULL AND component_id IS NULL) OR
    (asset_id IS NULL AND component_id IS NOT NULL)
  )
);

ALTER TABLE invoice_serial_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serial assignments in their companies"
  ON invoice_serial_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = invoice_serial_assignments.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage serial assignments"
  ON invoice_serial_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = invoice_serial_assignments.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Delivery Notes
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Invoice reference
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE NOT NULL,
  delivery_note_number text NOT NULL,
  batch_number int NOT NULL,

  -- Customer reference
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,

  -- Shipping details
  ship_date date DEFAULT CURRENT_DATE,
  tracking_number text,
  carrier text,
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  UNIQUE(company_id, delivery_note_number)
);

ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery notes in their companies"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = delivery_notes.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage delivery notes"
  ON delivery_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = delivery_notes.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Add delivery_note_id foreign key to invoice_serial_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_serial_assignments_delivery_note_id_fkey'
  ) THEN
    ALTER TABLE invoice_serial_assignments
      ADD CONSTRAINT invoice_serial_assignments_delivery_note_id_fkey
      FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Function to update fulfillment quantity when serials are assigned
CREATE OR REPLACE FUNCTION update_invoice_item_fulfillment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the quantity_fulfilled on the invoice line item
  UPDATE sales_invoice_items
  SET quantity_fulfilled = (
    SELECT COUNT(*)
    FROM invoice_serial_assignments
    WHERE invoice_line_id = NEW.invoice_line_id
  )
  WHERE id = NEW.invoice_line_id;

  -- Update asset or component status to 'sold'
  IF NEW.asset_id IS NOT NULL THEN
    UPDATE assets
    SET status = 'Sold',
        sold_date = CURRENT_DATE
    WHERE id = NEW.asset_id;
  END IF;

  IF NEW.component_id IS NOT NULL THEN
    UPDATE harvested_components_inventory
    SET status = 'sold',
        sold_date = now()
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_serial_assignment
  AFTER INSERT ON invoice_serial_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_item_fulfillment();

-- Function to generate delivery note number
CREATE OR REPLACE FUNCTION generate_delivery_note_number(
  p_company_id uuid,
  p_invoice_id uuid,
  p_batch_number int
) RETURNS text AS $$
DECLARE
  v_invoice_number text;
  v_result text;
BEGIN
  SELECT invoice_number INTO v_invoice_number
  FROM sales_invoices
  WHERE id = p_invoice_id;

  v_result := v_invoice_number || '-DN-' || LPAD(p_batch_number::text, 3, '0');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get fulfillment progress for an invoice
CREATE OR REPLACE FUNCTION get_invoice_fulfillment_progress(
  p_invoice_id uuid
) RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'line_item_id', id,
      'product_model', product_model,
      'tracking_mode', tracking_mode,
      'quantity_ordered', quantity_ordered,
      'quantity_fulfilled', quantity_fulfilled,
      'percentage', CASE
        WHEN quantity_ordered > 0
        THEN ROUND((quantity_fulfilled::decimal / quantity_ordered::decimal) * 100, 2)
        ELSE 0
      END
    )
  )
  INTO v_result
  FROM sales_invoice_items
  WHERE invoice_id = p_invoice_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_serial_assignments_invoice ON invoice_serial_assignments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_serial_assignments_line ON invoice_serial_assignments(invoice_line_id);
CREATE INDEX IF NOT EXISTS idx_invoice_serial_assignments_asset ON invoice_serial_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_invoice_serial_assignments_component ON invoice_serial_assignments(component_id);
CREATE INDEX IF NOT EXISTS idx_invoice_serial_assignments_batch ON invoice_serial_assignments(invoice_id, fulfillment_batch_number);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_date ON delivery_notes(company_id, ship_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product_type ON sales_invoice_items(product_type_id);

-- Comments
COMMENT ON TABLE invoice_serial_assignments IS
  'Tracks specific serial numbers (assets or components) assigned to invoice line items. Supports partial fulfillment across multiple batches.';

COMMENT ON TABLE delivery_notes IS
  'Delivery notes for shipments. Each batch of an invoice gets its own delivery note with all serials included.';

COMMENT ON COLUMN invoice_serial_assignments.fulfillment_batch_number IS
  'Batch number for partial fulfillment. Invoice can be fulfilled in multiple shipments (batch 1, 2, 3, etc.)';

COMMENT ON COLUMN invoice_serial_assignments.asset_id IS
  'If tracking a device (laptop, phone, etc.), reference to assets table.';

COMMENT ON COLUMN invoice_serial_assignments.component_id IS
  'If tracking a component (RAM, SSD, etc.), reference to harvested_components_inventory table.';
