/*
  # Fix Duplicate Purchase Lot Creation
  
  1. Changes
    - Update auto_create_purchase_lot_for_po() to check if lot already exists
    - Only create new lot if one doesn't exist with same company_id + lot_number
    - Return existing lot_id if found, preventing duplicate constraint violations
  
  2. Purpose
    - Fixes error: "duplicate key value violates unique constraint purchase_lots_company_id_lot_number_key"
    - Allows re-importing POs without creating duplicate lots
    - Makes the system more resilient to repeated imports
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_auto_create_purchase_lot ON purchase_orders;

-- Recreate the function with duplicate checking
CREATE OR REPLACE FUNCTION auto_create_purchase_lot_for_po()
RETURNS TRIGGER AS $$
DECLARE
  existing_lot_id uuid;
  new_lot_id uuid;
BEGIN
  -- Check if a lot with this number already exists for this company
  SELECT id INTO existing_lot_id
  FROM purchase_lots
  WHERE company_id = NEW.company_id
    AND lot_number = NEW.po_number
  LIMIT 1;

  -- If lot exists, use it
  IF existing_lot_id IS NOT NULL THEN
    new_lot_id := existing_lot_id;
  ELSE
    -- Create a new purchase lot
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
      NEW.order_date,
      'open',
      'Auto-created from PO: ' || NEW.po_number,
      NEW.created_by
    )
    RETURNING id INTO new_lot_id;
  END IF;

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
