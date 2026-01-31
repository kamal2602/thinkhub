/*
  # Add cost_amount column to sales_invoices

  1. Changes
    - Add `cost_amount` column to `sales_invoices` table
      - Tracks the total cost basis for profit calculation
      - Defaults to 0
      - Cannot be negative
    
  2. Notes
    - This allows tracking profit margins on sales invoices
    - Cost amount is calculated from the sum of item costs
*/

-- Add cost_amount column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'cost_amount'
  ) THEN
    ALTER TABLE sales_invoices ADD COLUMN cost_amount numeric(10,2) DEFAULT 0 NOT NULL CHECK (cost_amount >= 0);
  END IF;
END $$;