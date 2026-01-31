/*
  # Add Lot Tracking to Assets

  1. Changes
    - Add `purchase_lot_id` column to `assets` table
    - Add foreign key constraint to `purchase_lots` table
    - Add index for faster lot-based queries
    - Update RLS policies to allow lot-based access

  2. Purpose
    - Link assets to their purchase lots for profit/loss tracking
    - Enable lot-wise reporting and analysis
    - Track which batch each asset came from
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'purchase_lot_id'
  ) THEN
    ALTER TABLE assets 
    ADD COLUMN purchase_lot_id uuid REFERENCES purchase_lots(id);
    
    CREATE INDEX IF NOT EXISTS idx_assets_purchase_lot_id 
    ON assets(purchase_lot_id);
  END IF;
END $$;
