/*
  # Create Unified Import Intelligence System

  1. Purpose
    - Merge import_field_mappings and product_type_aliases
    - Add component parsing rules configuration
    - Single table for ALL import intelligence
    - Support for both column header matching AND value transformation

  2. New Tables
    - `import_intelligence_rules`
      - Rule types: 'column_mapping', 'value_lookup', 'component_pattern'
      - Supports keyword matching and reference lookups
      - Configurable parsing functions

  3. Security
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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'import_field_mappings') THEN
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
  END IF;
END $$;

-- Migrate existing product_type_aliases to value_lookup rules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_type_aliases') THEN
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
  END IF;
END $$;

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

GRANT SELECT ON import_intelligence_view TO authenticated;
