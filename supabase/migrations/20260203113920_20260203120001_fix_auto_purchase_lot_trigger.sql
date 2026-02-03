/*
  # Fix Auto-Create Purchase Lots Trigger

  ## Changes
  - Change trigger from BEFORE to AFTER to avoid foreign key constraint issues
  - Split into two functions: one for INSERT, one for UPDATE
  - Handle purchase_lot_id linking properly

  ## Purpose
  - Fix foreign key constraint violation
  - Ensure PO exists before creating lot
*/

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_auto_create_purchase_lot ON purchase_orders;
DROP FUNCTION IF EXISTS auto_create_purchase_lot();

-- Create function for INSERT (after PO is created)
CREATE OR REPLACE FUNCTION auto_create_purchase_lot_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  new_lot_id UUID;
  lot_number TEXT;
BEGIN
  -- Only create lot if status is 'submitted' and no lot exists yet
  IF NEW.status = 'submitted' AND NEW.purchase_lot_id IS NULL THEN
    -- Generate lot number
    SELECT 'LOT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((COUNT(*) + 1)::TEXT, 3, '0')
    INTO lot_number
    FROM purchase_lots
    WHERE company_id = NEW.company_id;

    -- Create the purchase lot
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      purchase_order_id,
      supplier_id,
      purchase_date,
      status,
      receiving_status,
      expected_qty,
      total_cost,
      created_by
    )
    VALUES (
      NEW.company_id,
      lot_number,
      NEW.id,
      NEW.supplier_id,
      NEW.order_date,
      'open',
      'waiting',
      COALESCE(NEW.total_items_ordered, 0),
      COALESCE(NEW.total_amount, 0),
      NEW.created_by
    )
    RETURNING id INTO new_lot_id;

    -- Update the PO with the new lot ID
    UPDATE purchase_orders
    SET purchase_lot_id = new_lot_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for UPDATE (when status changes to submitted)
CREATE OR REPLACE FUNCTION auto_create_purchase_lot_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  new_lot_id UUID;
  lot_number TEXT;
BEGIN
  -- Only create lot if status is changing to 'submitted' and no lot exists yet
  IF OLD.status != 'submitted' AND NEW.status = 'submitted' AND NEW.purchase_lot_id IS NULL THEN
    -- Generate lot number
    SELECT 'LOT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((COUNT(*) + 1)::TEXT, 3, '0')
    INTO lot_number
    FROM purchase_lots
    WHERE company_id = NEW.company_id;

    -- Create the purchase lot
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      purchase_order_id,
      supplier_id,
      purchase_date,
      status,
      receiving_status,
      expected_qty,
      total_cost,
      created_by
    )
    VALUES (
      NEW.company_id,
      lot_number,
      NEW.id,
      NEW.supplier_id,
      NEW.order_date,
      'open',
      'waiting',
      COALESCE(NEW.total_items_ordered, 0),
      COALESCE(NEW.total_amount, 0),
      NEW.created_by
    )
    RETURNING id INTO new_lot_id;

    -- Update the PO with the new lot ID
    NEW.purchase_lot_id := new_lot_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
CREATE TRIGGER trigger_auto_create_purchase_lot_insert
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_purchase_lot_after_insert();

-- Create trigger for UPDATE
CREATE TRIGGER trigger_auto_create_purchase_lot_update
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_purchase_lot_on_submit();
