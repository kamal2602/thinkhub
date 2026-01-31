/*
  # Add Serial Number Column to Purchase Order Lines

  1. Overview
    - Add serial_number column to purchase_order_lines table
    - Allows tracking individual serial numbers during PO import
    - Useful for suppliers who list items with serial numbers in their quotes

  2. Changes
    - Add `serial_number` (text) column to purchase_order_lines table
    - This is optional as not all suppliers provide serial numbers upfront

  3. Security
    - No RLS changes needed - inherits from existing policies

  4. Notes
    - Serial numbers can be added during PO import if supplier provides them
    - Will be copied to assets table during receiving process
*/

-- Add serial_number column to purchase_order_lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_lines' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN serial_number text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN purchase_order_lines.serial_number IS 'Serial number if provided by supplier in quote/invoice';

-- Create index for serial number lookups
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_serial_number ON purchase_order_lines(serial_number) WHERE serial_number IS NOT NULL;
