/*
  # Add unique constraint to import_field_mappings

  1. Changes
    - Add unique constraint on (company_id, field_name) to prevent duplicate field mappings
    - This ensures each company can only have one mapping per field name
  
  2. Security
    - No RLS changes needed
*/

-- Add unique constraint to prevent duplicate field mappings per company
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'import_field_mappings_company_field_unique'
  ) THEN
    ALTER TABLE import_field_mappings 
    ADD CONSTRAINT import_field_mappings_company_field_unique 
    UNIQUE (company_id, field_name);
  END IF;
END $$;
