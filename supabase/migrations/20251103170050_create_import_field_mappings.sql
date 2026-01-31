/*
  # Create Import Field Mappings Table

  1. New Tables
    - `import_field_mappings`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `field_name` (text) - Database field name (e.g., 'brand', 'specifications.cpu')
      - `field_label` (text) - Display label shown to users (e.g., 'Brand', 'CPU / Processor')
      - `field_type` (text) - Type: 'direct' or 'specification'
      - `is_active` (boolean) - Whether field appears in import mapping dropdown
      - `sort_order` (integer) - Display order in dropdown
      - `auto_map_keywords` (jsonb) - Array of keywords for auto-detection
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `import_field_mappings` table
    - Add policies for users to manage field mappings in their companies
*/

CREATE TABLE IF NOT EXISTS import_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('direct', 'specification')) DEFAULT 'direct',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  auto_map_keywords jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_import_field_mappings_company'
  ) THEN
    ALTER TABLE import_field_mappings
    ADD CONSTRAINT fk_import_field_mappings_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_field_mappings_company ON import_field_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_import_field_mappings_active ON import_field_mappings(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_import_field_mappings_sort ON import_field_mappings(company_id, sort_order);

ALTER TABLE import_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view field mappings in their companies"
  ON import_field_mappings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert field mappings in their companies"
  ON import_field_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update field mappings in their companies"
  ON import_field_mappings FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete field mappings in their companies"
  ON import_field_mappings FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );
