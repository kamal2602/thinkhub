/*
  # Extend Receiving System for Category/Weight Lines

  1. Changes to expected_receiving_items
    - Add `line_type` column: 'serial' (default) or 'category_weight'
    - Add `product_category_id` for category-based items
    - Add `material_category` for recycling material types
    - Add `expected_weight` for bulk weight tracking
    - Add `expected_qty` for quantity tracking
    - Add `receiving_batch_id` for batch grouping
    - Make `serial_number` nullable to support category lines

  2. Purpose
    - Support serial-based intake (existing)
    - Support category/weight intake (recycling)
    - Enable unified intake wizard for Purchase/ITAD/Recycling

  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns to expected_receiving_items
ALTER TABLE expected_receiving_items 
  ADD COLUMN IF NOT EXISTS line_type text DEFAULT 'serial' CHECK (line_type IN ('serial', 'category_weight')),
  ADD COLUMN IF NOT EXISTS product_category_id uuid REFERENCES product_types(id),
  ADD COLUMN IF NOT EXISTS material_category text,
  ADD COLUMN IF NOT EXISTS expected_weight numeric(10,2),
  ADD COLUMN IF NOT EXISTS expected_qty integer,
  ADD COLUMN IF NOT EXISTS receiving_batch_id uuid;

-- Make serial_number nullable for category lines
ALTER TABLE expected_receiving_items 
  ALTER COLUMN serial_number DROP NOT NULL;

-- Add index for batch lookups
CREATE INDEX IF NOT EXISTS idx_expected_receiving_batch 
  ON expected_receiving_items(receiving_batch_id);

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_expected_receiving_category 
  ON expected_receiving_items(product_category_id);
