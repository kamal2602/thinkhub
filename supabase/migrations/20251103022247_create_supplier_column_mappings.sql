/*
  # Create Supplier Column Mappings Table

  1. New Table
    - `supplier_column_mappings`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `supplier_id` (uuid, references suppliers, nullable for generic templates)
      - `template_name` (text, name for the mapping template)
      - `mapping_config` (jsonb, stores column mappings)
      - `last_used` (timestamptz, track usage)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Purpose
    - Store reusable column mappings for supplier files
    - Auto-suggest mappings based on previous imports
    - Support multiple templates per supplier

  3. Security
    - Enable RLS
    - Users can only access mappings for their company
*/

CREATE TABLE IF NOT EXISTS supplier_column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  mapping_config jsonb NOT NULL DEFAULT '{}',
  last_used timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_mappings_company_id ON supplier_column_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_mappings_supplier_id ON supplier_column_mappings(supplier_id);

ALTER TABLE supplier_column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company mappings"
  ON supplier_column_mappings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mappings for own company"
  ON supplier_column_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company mappings"
  ON supplier_column_mappings FOR UPDATE
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

CREATE POLICY "Users can delete own company mappings"
  ON supplier_column_mappings FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );
