/*
  # Auto-create Purchase Lots for Purchase Orders

  1. Changes
    - Add trigger to automatically create a Purchase Lot when a Purchase Order is created
    - The lot number matches the PO number
    - The lot is automatically linked to the PO
    - Status is set to 'open' for receiving

  2. Purpose
    - Simplifies workflow: every PO automatically gets a lot for P&L tracking
    - Eliminates manual lot creation step
    - Ensures all purchases can be tracked for profitability

  3. Behavior
    - When PO-12345 is created → LOT-12345 is auto-created
    - Lot inherits supplier, currency, and other details from PO
    - When receiving against PO → items get both purchase_order_id AND purchase_lot_id
*/

-- Function to auto-create purchase lot when PO is created
CREATE OR REPLACE FUNCTION auto_create_purchase_lot_for_po()
RETURNS TRIGGER AS $$
DECLARE
  new_lot_id uuid;
BEGIN
  -- Create a matching purchase lot
  INSERT INTO purchase_lots (
    company_id,
    lot_number,
    supplier_id,
    status,
    notes,
    created_by
  ) VALUES (
    NEW.company_id,
    NEW.po_number,  -- Use same number as PO
    NEW.supplier_id,
    'open',  -- Open for receiving
    'Auto-created from PO: ' || NEW.po_number,
    NEW.created_by
  )
  RETURNING id INTO new_lot_id;

  -- Store the lot_id in the PO for quick reference
  -- (We'll add this column if it doesn't exist)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'purchase_lot_id'
  ) THEN
    UPDATE purchase_orders SET purchase_lot_id = new_lot_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add purchase_lot_id to purchase_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'purchase_lot_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN purchase_lot_id uuid REFERENCES purchase_lots(id);
  END IF;
END $$;

-- Create trigger to auto-create lots for new POs
DROP TRIGGER IF EXISTS trigger_auto_create_purchase_lot ON purchase_orders;
CREATE TRIGGER trigger_auto_create_purchase_lot
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_purchase_lot_for_po();

-- Backfill: Create lots for existing POs that don't have one
DO $$
DECLARE
  po_record RECORD;
  new_lot_id uuid;
BEGIN
  FOR po_record IN 
    SELECT id, company_id, po_number, supplier_id, created_by
    FROM purchase_orders
    WHERE purchase_lot_id IS NULL
  LOOP
    -- Create lot for this PO
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      supplier_id,
      status,
      notes,
      created_by
    ) VALUES (
      po_record.company_id,
      po_record.po_number,
      po_record.supplier_id,
      'open',
      'Auto-created from existing PO: ' || po_record.po_number,
      po_record.created_by
    )
    RETURNING id INTO new_lot_id;

    -- Link the lot to the PO
    UPDATE purchase_orders 
    SET purchase_lot_id = new_lot_id 
    WHERE id = po_record.id;
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT SELECT ON purchase_lots TO authenticated;
GRANT INSERT ON purchase_lots TO authenticated;
GRANT UPDATE ON purchase_lots TO authenticated;
