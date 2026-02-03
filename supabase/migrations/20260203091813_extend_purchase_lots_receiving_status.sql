/*
  # Extend purchase_lots for Receiving Status

  1. New Columns
    - `purchase_order_id` - Link to parent procurement record
    - `receiving_status` - Track receiving progress (waiting | partial | complete)
    - `expected_qty` - Expected quantity for reconciliation
    - `expected_weight_kg` - Expected weight for recycling intakes
    - `actual_weight_kg` - Actual weight received

  2. Changes
    - Add purchase_order_id foreign key
    - Backfill purchase_order_id by matching supplier and date
    - Add receiving status tracking
    - Add weight fields for recycling

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add purchase_order_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_lots' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE purchase_lots
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add receiving status and weight tracking columns
ALTER TABLE purchase_lots
  ADD COLUMN IF NOT EXISTS receiving_status text
    CHECK (receiving_status IN ('waiting', 'partial', 'complete'))
    DEFAULT 'waiting',

  ADD COLUMN IF NOT EXISTS expected_qty int,

  ADD COLUMN IF NOT EXISTS expected_weight_kg numeric(10,2),

  ADD COLUMN IF NOT EXISTS actual_weight_kg numeric(10,2);

-- Backfill purchase_order_id for existing lots
-- Strategy: Match lots to POs by supplier and date
UPDATE purchase_lots pl
SET purchase_order_id = (
  SELECT po.id
  FROM purchase_orders po
  WHERE po.supplier_id = pl.supplier_id
    AND po.order_date = pl.purchase_date
    AND po.company_id = pl.company_id
  ORDER BY po.created_at DESC
  LIMIT 1
)
WHERE purchase_order_id IS NULL
  AND supplier_id IS NOT NULL;

-- Backfill receiving_status based on whether assets exist
UPDATE purchase_lots pl
SET receiving_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM assets WHERE purchase_lot_id = pl.id
  ) THEN 'complete'
  ELSE 'waiting'
END
WHERE receiving_status IS NULL OR receiving_status = 'waiting';

-- Create index for purchase_order_id lookups
CREATE INDEX IF NOT EXISTS idx_purchase_lots_purchase_order_id ON purchase_lots(purchase_order_id);

-- Create index for receiving_status filtering
CREATE INDEX IF NOT EXISTS idx_purchase_lots_receiving_status ON purchase_lots(receiving_status);

-- Add helpful comments
COMMENT ON COLUMN purchase_lots.purchase_order_id IS
  'Link to parent procurement record (the commercial agreement). Every lot must belong to a purchase order.';

COMMENT ON COLUMN purchase_lots.receiving_status IS
  'Receiving progress: waiting (not started), partial (some items received), complete (all received or closed)';

COMMENT ON COLUMN purchase_lots.expected_qty IS
  'Expected quantity of items for this lot. Used for reconciliation during receiving.';

COMMENT ON COLUMN purchase_lots.expected_weight_kg IS
  'For recycling intakes: expected total weight in kilograms';

COMMENT ON COLUMN purchase_lots.actual_weight_kg IS
  'For recycling intakes: actual weight received in kilograms';