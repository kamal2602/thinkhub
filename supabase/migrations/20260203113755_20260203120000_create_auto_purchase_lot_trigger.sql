/*
  # Auto-Create Purchase Lots Trigger

  ## Overview
  This migration creates a trigger that automatically creates a purchase lot when a purchase order is submitted.

  ## Changes
  1. Creates function to auto-create purchase lots
  2. Creates trigger on purchase_orders table
  3. Trigger fires when status changes to 'submitted'

  ## Purpose
  - Eliminates manual purchase lot creation
  - Ensures every submitted PO has a tracking lot
  - Improves workflow automation
*/

-- Create function to auto-create purchase lot
CREATE OR REPLACE FUNCTION auto_create_purchase_lot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create lot if status is changing to 'submitted' and no lot exists yet
  IF NEW.status = 'submitted' AND NEW.purchase_lot_id IS NULL THEN
    DECLARE
      new_lot_id UUID;
      lot_number TEXT;
    BEGIN
      -- Generate lot number based on count
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
        NEW.total_items_ordered,
        NEW.total_amount,
        NEW.created_by
      )
      RETURNING id INTO new_lot_id;

      -- Update the PO with the new lot ID
      NEW.purchase_lot_id := new_lot_id;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on purchase_orders
DROP TRIGGER IF EXISTS trigger_auto_create_purchase_lot ON purchase_orders;

CREATE TRIGGER trigger_auto_create_purchase_lot
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_purchase_lot();
