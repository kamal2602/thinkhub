/*
  # Fix Purchase Lot Auto-Creation Trigger
  
  1. Changes
    - Update auto_create_purchase_lot_for_po() to include purchase_date
    - Use order_date from PO as the purchase_date for the lot
    - Fix NOT NULL constraint violation
  
  2. Purpose
    - Fixes error: "null value in column purchase_date violates not-null constraint"
    - Ensures all auto-created lots have valid purchase dates
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_auto_create_purchase_lot ON purchase_orders;

-- Recreate the function with purchase_date included
CREATE OR REPLACE FUNCTION auto_create_purchase_lot_for_po()
RETURNS TRIGGER AS $$
DECLARE
  new_lot_id uuid;
BEGIN
  -- Create a matching purchase lot with purchase_date
  INSERT INTO purchase_lots (
    company_id,
    lot_number,
    supplier_id,
    purchase_date,
    status,
    notes,
    created_by
  ) VALUES (
    NEW.company_id,
    NEW.po_number,
    NEW.supplier_id,
    NEW.order_date,  -- Use PO order_date as purchase_date
    'open',
    'Auto-created from PO: ' || NEW.po_number,
    NEW.created_by
  )
  RETURNING id INTO new_lot_id;

  -- Store the lot_id in the PO for quick reference
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'purchase_lot_id'
  ) THEN
    UPDATE purchase_orders SET purchase_lot_id = new_lot_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trigger_auto_create_purchase_lot
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_purchase_lot_for_po();

-- Fix existing lots that have null purchase_date by using today's date
UPDATE purchase_lots
SET purchase_date = CURRENT_DATE
WHERE purchase_date IS NULL;
