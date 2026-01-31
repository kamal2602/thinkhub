/*
  # Create Unified Import Intelligence System

  1. Purpose
    - Merge import_field_mappings (column mapping) and product_type_aliases (value normalization)
    - Add component parsing rules configuration
    - Single table for ALL import intelligence
    - Support for both column header matching AND value transformation

  2. New Tables
    - `import_intelligence_rules`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `rule_type` (text) - 'column_mapping', 'value_lookup', 'component_pattern'
      - `applies_to_field` (text) - Which field this rule applies to (e.g., 'product_type', 'specifications.ram')
      - `input_keywords` (jsonb) - Keywords/patterns to match against
      - `output_value` (text) - Target value/field name
      - `output_reference_id` (uuid) - Foreign key ID (e.g., product_type_id)
      - `output_reference_table` (text) - Which table the reference ID points to
      - `parse_with_function` (text) - Optional: 'parseComponentPattern', 'parseRAM', 'parseStorage'
      - `priority` (integer) - Higher priority rules match first
      - `is_active` (boolean)
      - `metadata` (jsonb) - Additional configuration
      - `created_at`, `updated_at`, `created_by`

  3. Rule Types Explained

    A. column_mapping (replaces import_field_mappings)
       - Maps supplier column headers to system fields
       - Example: "Memory" → "specifications.ram"
       - input_keywords: ["memory", "ram", "memory size"]
       - output_value: "specifications.ram"

    B. value_lookup (replaces product_type_aliases)
       - Maps supplier values to database records
       - Example: "Dell Laptop" → Laptop product type
       - applies_to_field: "product_type"
       - input_keywords: ["dell laptop", "laptop", "notebooks"]
       - output_reference_id: <laptop_product_type_id>
       - output_reference_table: "product_types"

    C. component_pattern (new!)
       - Configures how to parse component specifications
       - Example: RAM field should use parseComponentPattern()
       - applies_to_field: "specifications.ram"
       - parse_with_function: "parseComponentPattern"
       - metadata: {"extract_technology": true, "validate_format": "DDR[3-5]"}

  4. Migration Strategy
    - Copy all import_field_mappings → import_intelligence_rules (rule_type='column_mapping')
    - Copy all product_type_aliases → import_intelligence_rules (rule_type='value_lookup')
    - Keep old tables for now (will drop in future migration after validation)

  5. Security
    - Enable RLS
    - Users can view rules for their company
    - Admins can create/update/delete rules
*/

-- Create the unified import intelligence rules table
CREATE TABLE IF NOT EXISTS import_intelligence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Rule classification
  rule_type text NOT NULL CHECK (rule_type IN ('column_mapping', 'value_lookup', 'component_pattern')),
  applies_to_field text NOT NULL,

  -- Matching logic
  input_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority integer DEFAULT 50,

  -- Output configuration
  output_value text,
  output_reference_id uuid,
  output_reference_table text,
  parse_with_function text,

  -- Additional configuration
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT check_output_value_or_reference CHECK (
    (output_value IS NOT NULL) OR
    (output_reference_id IS NOT NULL AND output_reference_table IS NOT NULL) OR
    (parse_with_function IS NOT NULL)
  )
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_import_intelligence_company
  ON import_intelligence_rules(company_id);

CREATE INDEX IF NOT EXISTS idx_import_intelligence_rule_type
  ON import_intelligence_rules(company_id, rule_type, is_active);

CREATE INDEX IF NOT EXISTS idx_import_intelligence_field
  ON import_intelligence_rules(company_id, applies_to_field, is_active);

CREATE INDEX IF NOT EXISTS idx_import_intelligence_priority
  ON import_intelligence_rules(company_id, rule_type, priority DESC);

-- Create GIN index for fast keyword search
CREATE INDEX IF NOT EXISTS idx_import_intelligence_keywords
  ON import_intelligence_rules USING gin(input_keywords);

-- Enable RLS
ALTER TABLE import_intelligence_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view rules for their company
CREATE POLICY "Users can view import intelligence rules in their companies"
  ON import_intelligence_rules
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can insert rules
CREATE POLICY "Admins can insert import intelligence rules"
  ON import_intelligence_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admins can update rules
CREATE POLICY "Admins can update import intelligence rules"
  ON import_intelligence_rules
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

-- Policy: Admins can delete rules
CREATE POLICY "Admins can delete import intelligence rules"
  ON import_intelligence_rules
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_import_intelligence_timestamp
  BEFORE UPDATE ON import_intelligence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_import_intelligence_updated_at();

-- Migrate existing import_field_mappings to column_mapping rules
INSERT INTO import_intelligence_rules (
  company_id,
  rule_type,
  applies_to_field,
  input_keywords,
  output_value,
  priority,
  is_active,
  created_at
)
SELECT
  company_id,
  'column_mapping' as rule_type,
  field_name as applies_to_field,
  auto_map_keywords as input_keywords,
  field_name as output_value,
  sort_order as priority,
  is_active,
  created_at
FROM import_field_mappings
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Migrate existing product_type_aliases to value_lookup rules
INSERT INTO import_intelligence_rules (
  company_id,
  rule_type,
  applies_to_field,
  input_keywords,
  output_reference_id,
  output_reference_table,
  priority,
  is_active,
  created_at,
  created_by
)
SELECT
  company_id,
  'value_lookup' as rule_type,
  'product_type' as applies_to_field,
  jsonb_build_array(LOWER(alias)) as input_keywords,
  product_type_id as output_reference_id,
  'product_types' as output_reference_table,
  100 as priority,
  true as is_active,
  created_at,
  created_by
FROM product_type_aliases
ON CONFLICT DO NOTHING;

-- Add default component parsing rules for common fields
DO $$
DECLARE
  company_rec RECORD;
BEGIN
  FOR company_rec IN SELECT id FROM companies LOOP

    -- Rule: Parse RAM components
    INSERT INTO import_intelligence_rules (
      company_id,
      rule_type,
      applies_to_field,
      input_keywords,
      parse_with_function,
      priority,
      metadata
    )
    VALUES (
      company_rec.id,
      'component_pattern',
      'specifications.ram',
      '["ram", "memory"]'::jsonb,
      'parseComponentPattern',
      100,
      '{"extract_technology": true, "component_type": "RAM"}'::jsonb
    )
    ON CONFLICT DO NOTHING;

    -- Rule: Parse Storage components
    INSERT INTO import_intelligence_rules (
      company_id,
      rule_type,
      applies_to_field,
      input_keywords,
      parse_with_function,
      priority,
      metadata
    )
    VALUES (
      company_rec.id,
      'component_pattern',
      'specifications.storage',
      '["storage", "hdd", "ssd", "drive"]'::jsonb,
      'parseComponentPattern',
      100,
      '{"extract_technology": true, "component_type": "Storage"}'::jsonb
    )
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;

-- Create a helper view for easier querying
CREATE OR REPLACE VIEW import_intelligence_view AS
SELECT
  r.id,
  r.company_id,
  r.rule_type,
  r.applies_to_field,
  r.input_keywords,
  r.priority,
  r.output_value,
  r.output_reference_id,
  r.output_reference_table,
  r.parse_with_function,
  r.metadata,
  r.is_active,
  -- For value_lookup rules, join to get the referenced value
  CASE
    WHEN r.rule_type = 'value_lookup' AND r.output_reference_table = 'product_types'
    THEN (SELECT name FROM product_types WHERE id = r.output_reference_id)
    ELSE NULL
  END as referenced_name,
  r.created_at,
  r.updated_at,
  p.email as created_by_email
FROM import_intelligence_rules r
LEFT JOIN profiles p ON r.created_by = p.id;

-- Grant access to the view
ALTER VIEW import_intelligence_view OWNER TO postgres;
GRANT SELECT ON import_intelligence_view TO authenticated;