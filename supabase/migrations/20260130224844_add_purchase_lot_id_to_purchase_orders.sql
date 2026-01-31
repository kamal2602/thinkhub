/*
  # Add purchase_lot_id to purchase_orders table
  
  1. Changes
    - Add purchase_lot_id column to purchase_orders table
    - Create foreign key relationship to purchase_lots
    - Backfill existing purchase orders with their auto-created lots
  
  2. Purpose
    - Links purchase orders to purchase lots for P&L tracking
    - Enables receiving workflow to associate assets with lots
    - Fixes missing column error in Smart Receiving workflow
*/

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'purchase_lot_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN purchase_lot_id uuid REFERENCES purchase_lots(id);
  END IF;
END $$;

-- Backfill: Link existing POs to their lots (lots have same number as PO)
UPDATE purchase_orders po
SET purchase_lot_id = pl.id
FROM purchase_lots pl
WHERE po.company_id = pl.company_id
  AND po.po_number = pl.lot_number
  AND po.purchase_lot_id IS NULL;
