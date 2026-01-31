/*
  # Add Product Type ID to Expected Receiving Items

  1. Changes
    - Add `product_type_id` column to `expected_receiving_items` table
    - Add foreign key constraint to `product_types` table
    - Create index for faster lookups
    - Update existing records to populate product_type_id from purchase_order_lines

  2. Purpose
    - Connect expected receiving items to product types
    - Enable automatic testing checklist loading based on product type
    - Transfer product type to assets during receiving process
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expected_receiving_items' AND column_name = 'product_type_id'
  ) THEN
    ALTER TABLE expected_receiving_items ADD COLUMN product_type_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_expected_receiving_items_product_type'
  ) THEN
    ALTER TABLE expected_receiving_items
    ADD CONSTRAINT fk_expected_receiving_items_product_type
    FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expected_receiving_items_product_type 
  ON expected_receiving_items(product_type_id);

UPDATE expected_receiving_items eri
SET product_type_id = pol.product_type_id
FROM purchase_order_lines pol
WHERE eri.po_line_id = pol.id
  AND eri.product_type_id IS NULL
  AND pol.product_type_id IS NOT NULL;