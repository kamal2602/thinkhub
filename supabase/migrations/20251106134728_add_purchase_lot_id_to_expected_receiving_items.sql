/*
  # Add purchase_lot_id support to expected_receiving_items
  
  1. Changes
    - Add purchase_lot_id column to expected_receiving_items table
    - Allow receiving items to be linked to either a purchase order OR a purchase lot
*/

ALTER TABLE expected_receiving_items 
ADD COLUMN IF NOT EXISTS purchase_lot_id UUID REFERENCES purchase_lots(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expected_receiving_items_lot_id 
ON expected_receiving_items(purchase_lot_id);
