/*
  # Add sort_order to product_types table

  1. Changes
    - Add sort_order column to product_types table
    - Set default values for existing records
    - Add index for performance

  2. Purpose
    - Enable drag-and-drop reordering of product types in the UI
*/

-- Add sort_order column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_types' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE product_types ADD COLUMN sort_order INTEGER DEFAULT 0;
    
    -- Set initial sort_order based on name
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY name) - 1 AS row_num
      FROM product_types
    )
    UPDATE product_types
    SET sort_order = numbered.row_num
    FROM numbered
    WHERE product_types.id = numbered.id;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_product_types_sort_order ON product_types(company_id, sort_order);
  END IF;
END $$;