/*
  # Create Field Aliases for Intelligent Column Mapping

  1. New Tables
    - `field_aliases`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `system_field` (text) - The internal field name (e.g., 'serial_number', 'manufacturer')
      - `alias` (text) - Alternative column name (e.g., 'Serial #', 'SN', 'Brand', 'Make')
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)

  2. Purpose
    - Universal intelligent matching for ALL import columns
    - Map variations like "Serial #", "SN", "Serial Number" to "serial_number"
    - Map "Brand", "Make", "Vendor" to "manufacturer"
    - System-wide learning from imports

  3. Security
    - Enable RLS
    - Users can view aliases for their company
    - Admins can manage aliases

  4. Pre-populated Common Aliases
    - Serial Number variations
    - Manufacturer/Brand variations
    - Model variations
    - Specifications variations
    - And more...
*/

-- Create field_aliases table
CREATE TABLE IF NOT EXISTS field_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  system_field text NOT NULL,
  alias text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Add unique constraint on company_id + system_field + lowercase alias
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_aliases_unique
  ON field_aliases(company_id, system_field, LOWER(alias));

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_field_aliases_company_field
  ON field_aliases(company_id, system_field);

CREATE INDEX IF NOT EXISTS idx_field_aliases_alias
  ON field_aliases(company_id, LOWER(alias));

-- Enable RLS
ALTER TABLE field_aliases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view aliases for their company
CREATE POLICY "Users can view company field aliases"
  ON field_aliases
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can insert aliases
CREATE POLICY "Admins can insert field aliases"
  ON field_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admins can update aliases
CREATE POLICY "Admins can update field aliases"
  ON field_aliases
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admins can delete aliases
CREATE POLICY "Admins can delete field aliases"
  ON field_aliases
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Pre-populate common aliases for all companies
DO $$
DECLARE
  company_rec RECORD;
BEGIN
  FOR company_rec IN SELECT id FROM companies LOOP

    -- Serial Number aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'serial_number', a
    FROM unnest(ARRAY[
      'Serial', 'SN', 'Serial #', 'Serial No', 'Serial Number',
      'Asset Serial', 'Device Serial', 'Serial Tag', 'S/N'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'serial_number'
      AND LOWER(alias) = LOWER(a)
    );

    -- Manufacturer aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'manufacturer', a
    FROM unnest(ARRAY[
      'Brand', 'Make', 'Vendor', 'Mfg', 'OEM', 'Maker'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'manufacturer'
      AND LOWER(alias) = LOWER(a)
    );

    -- Model aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'model', a
    FROM unnest(ARRAY[
      'Model Number', 'Model #', 'Part Number', 'SKU', 'Product Model'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'model'
      AND LOWER(alias) = LOWER(a)
    );

    -- Product Type aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'product_type', a
    FROM unnest(ARRAY[
      'Type', 'Category', 'Product Category', 'Item Type', 'Device Type'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'product_type'
      AND LOWER(alias) = LOWER(a)
    );

    -- Processor aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'specs.processor', a
    FROM unnest(ARRAY[
      'CPU', 'Processor', 'Chip', 'CPU Type', 'Processor Type'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'specs.processor'
      AND LOWER(alias) = LOWER(a)
    );

    -- RAM aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'specs.ram', a
    FROM unnest(ARRAY[
      'Memory', 'RAM Size', 'System Memory', 'Memory Capacity'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'specs.ram'
      AND LOWER(alias) = LOWER(a)
    );

    -- Storage aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'specs.storage', a
    FROM unnest(ARRAY[
      'HDD', 'SSD', 'Hard Drive', 'Drive Size', 'Storage Capacity',
      'Disk Size', 'Storage Size'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'specs.storage'
      AND LOWER(alias) = LOWER(a)
    );

    -- Condition aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'cosmetic_grade', a
    FROM unnest(ARRAY[
      'Grade', 'Cosmetic Condition', 'Physical Condition', 'Exterior Condition'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'cosmetic_grade'
      AND LOWER(alias) = LOWER(a)
    );

    -- Unit Cost aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'unit_cost', a
    FROM unnest(ARRAY[
      'Price', 'Cost', 'Unit Price', 'Purchase Price', 'Cost Per Unit'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'unit_cost'
      AND LOWER(alias) = LOWER(a)
    );

    -- Quantity aliases
    INSERT INTO field_aliases (company_id, system_field, alias)
    SELECT company_rec.id, 'quantity_ordered', a
    FROM unnest(ARRAY[
      'Qty', 'Quantity', 'Qty Ordered', 'Order Quantity', 'Amount'
    ]) AS a
    WHERE NOT EXISTS (
      SELECT 1 FROM field_aliases
      WHERE company_id = company_rec.id
      AND system_field = 'quantity_ordered'
      AND LOWER(alias) = LOWER(a)
    );

  END LOOP;
END $$;
