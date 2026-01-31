/*
  # Add Quick-Click Refurbishment Cost Categories System
  
  1. New Tables
    - `refurbishment_cost_presets`
      - Predefined cost categories with default prices
      - Company-specific presets
      - Easy one-click addition to assets
  
  2. Changes
    - Adds presets for common refurbishment items
    - Links to product types for context-aware presets
    - Includes default cost amounts for quick selection
  
  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users to manage their company's presets
*/

CREATE TABLE IF NOT EXISTS refurbishment_cost_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  product_type_id uuid REFERENCES product_types(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  default_cost decimal(10,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE refurbishment_cost_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's cost presets"
  ON refurbishment_cost_presets FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage cost presets"
  ON refurbishment_cost_presets FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_refurbishment_cost_presets_company ON refurbishment_cost_presets(company_id);
CREATE INDEX IF NOT EXISTS idx_refurbishment_cost_presets_product_type ON refurbishment_cost_presets(product_type_id);
