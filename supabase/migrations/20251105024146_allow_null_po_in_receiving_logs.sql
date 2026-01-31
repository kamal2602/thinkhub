/*
  # Allow Manual Receiving Without Purchase Orders

  1. Changes
    - Modify `receiving_logs.purchase_order_id` to allow NULL values
    - This enables manual receiving workflow where items can be received without a PO
    - Maintains referential integrity for PO-based receiving

  2. Security
    - No changes to RLS policies
    - All existing policies remain intact
*/

-- Allow NULL purchase_order_id for manual receiving
ALTER TABLE receiving_logs
  ALTER COLUMN purchase_order_id DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN receiving_logs.purchase_order_id IS
  'Optional: Links to purchase order. NULL for manual receiving without PO';
