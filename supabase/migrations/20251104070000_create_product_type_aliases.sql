/*
  # Create Product Type Aliases for Intelligent Mapping

  1. New Tables
    - `product_type_aliases`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `product_type_id` (uuid, references product_types)
      - `alias` (text) - Alternative name for the product type
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)

  2. Purpose
    - Allows mapping of "Laptop", "Laptops", "Notebook", "Notebooks" to the same product type
    - System learns from imports and automatically creates aliases
    - Users can manually add common aliases

  3. Security
    - Enable RLS on `product_type_aliases` table
    - Users can view aliases for their company
    - Only admins can create/update/delete aliases

  4. Indexes
    - Index on company_id and alias for fast lookups
    - Unique constraint on company_id + alias (case-insensitive)
*/

-- Create product_type_aliases table
CREATE TABLE IF NOT EXISTS product_type_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_type_id uuid NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Add unique constraint on company_id + lowercase alias
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_type_aliases_unique_alias
  ON product_type_aliases(company_id, LOWER(alias));

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_type_aliases_company_alias
  ON product_type_aliases(company_id, LOWER(alias));

CREATE INDEX IF NOT EXISTS idx_product_type_aliases_product_type
  ON product_type_aliases(product_type_id);

-- Enable RLS
ALTER TABLE product_type_aliases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view aliases for their company
CREATE POLICY "Users can view company product type aliases"
  ON product_type_aliases
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can insert aliases
CREATE POLICY "Admins can insert product type aliases"
  ON product_type_aliases
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
CREATE POLICY "Admins can update product type aliases"
  ON product_type_aliases
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
CREATE POLICY "Admins can delete product type aliases"
  ON product_type_aliases
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add some common default aliases for existing product types
-- This will help with initial imports
DO $$
DECLARE
  laptop_type_id uuid;
  desktop_type_id uuid;
  tablet_type_id uuid;
  phone_type_id uuid;
  company_rec RECORD;
BEGIN
  -- For each company, add common aliases
  FOR company_rec IN SELECT id FROM companies LOOP

    -- Find product type IDs for this company
    SELECT id INTO laptop_type_id
    FROM product_types
    WHERE company_id = company_rec.id
    AND LOWER(name) = 'laptop'
    LIMIT 1;

    SELECT id INTO desktop_type_id
    FROM product_types
    WHERE company_id = company_rec.id
    AND LOWER(name) = 'desktop'
    LIMIT 1;

    SELECT id INTO tablet_type_id
    FROM product_types
    WHERE company_id = company_rec.id
    AND LOWER(name) = 'tablet'
    LIMIT 1;

    SELECT id INTO phone_type_id
    FROM product_types
    WHERE company_id = company_rec.id
    AND LOWER(name) IN ('phone', 'mobile phone', 'smartphone')
    LIMIT 1;

    -- Add laptop aliases (check if exists before inserting)
    IF laptop_type_id IS NOT NULL THEN
      INSERT INTO product_type_aliases (company_id, product_type_id, alias)
      SELECT company_rec.id, laptop_type_id, unnest(ARRAY['Laptops', 'Notebook', 'Notebooks', 'Portable Computer', 'Mobile Computer'])
      WHERE NOT EXISTS (
        SELECT 1 FROM product_type_aliases
        WHERE company_id = company_rec.id
        AND LOWER(alias) = LOWER(unnest(ARRAY['Laptops', 'Notebook', 'Notebooks', 'Portable Computer', 'Mobile Computer']))
      );
    END IF;

    -- Add desktop aliases
    IF desktop_type_id IS NOT NULL THEN
      INSERT INTO product_type_aliases (company_id, product_type_id, alias)
      SELECT company_rec.id, desktop_type_id, a
      FROM unnest(ARRAY['Desktops', 'PC', 'PCs', 'Workstation', 'Workstations', 'Tower']) AS a
      WHERE NOT EXISTS (
        SELECT 1 FROM product_type_aliases
        WHERE company_id = company_rec.id AND LOWER(alias) = LOWER(a)
      );
    END IF;

    -- Add tablet aliases
    IF tablet_type_id IS NOT NULL THEN
      INSERT INTO product_type_aliases (company_id, product_type_id, alias)
      SELECT company_rec.id, tablet_type_id, a
      FROM unnest(ARRAY['Tablets', 'iPad', 'iPads', 'Slate']) AS a
      WHERE NOT EXISTS (
        SELECT 1 FROM product_type_aliases
        WHERE company_id = company_rec.id AND LOWER(alias) = LOWER(a)
      );
    END IF;

    -- Add phone aliases
    IF phone_type_id IS NOT NULL THEN
      INSERT INTO product_type_aliases (company_id, product_type_id, alias)
      SELECT company_rec.id, phone_type_id, a
      FROM unnest(ARRAY['Phones', 'Mobile', 'Mobiles', 'Smartphone', 'Smartphones', 'Cell Phone', 'iPhone', 'iPhones']) AS a
      WHERE NOT EXISTS (
        SELECT 1 FROM product_type_aliases
        WHERE company_id = company_rec.id AND LOWER(alias) = LOWER(a)
      );
    END IF;

  END LOOP;
END $$;
