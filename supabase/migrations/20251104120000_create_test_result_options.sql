/*
  # Test Result Options Table

  ## Overview
  Creates customizable test result options per product type, allowing companies to
  define their own testing result values instead of hardcoded Pass/Fail/N/A.

  ## New Table

  **test_result_options**
  - Product-type-specific test result options
  - Examples: Pass, Fail, N/A, Marginal, Excellent, Needs Repair, etc.
  - Each option has a color for visual distinction
  - Result type (pass/fail/neutral) for reporting and logic
  - Display order for consistent UI presentation

  ## Features
  - Different product types can have different result options
  - Laptops: Pass, Fail, Marginal, Needs Repair
  - Phones: Excellent, Good, Fair, Poor, Failed
  - Servers: Pass, Fail, Warning
  - Flexible enough for any testing workflow

  ## Security
  - RLS enabled
  - Company-based access control via product types
  - Staff and above can manage
  - All users can view in their company
*/

-- Test Result Options (per product type)
CREATE TABLE IF NOT EXISTS test_result_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id uuid REFERENCES product_types(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  result_type text NOT NULL DEFAULT 'neutral',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_type_id, name),
  CONSTRAINT valid_result_type CHECK (result_type IN ('pass', 'fail', 'neutral'))
);

ALTER TABLE test_result_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test result options"
  ON test_result_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage test result options"
  ON test_result_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE INDEX IF NOT EXISTS idx_test_result_options_product_type ON test_result_options(product_type_id);

-- Insert default test result options for existing product types
INSERT INTO test_result_options (product_type_id, name, color, result_type, sort_order)
SELECT
  pt.id,
  option_data.name,
  option_data.color,
  option_data.result_type,
  option_data.sort_order
FROM product_types pt
CROSS JOIN (
  VALUES
    ('Pass', '#10B981', 'pass', 1),
    ('Fail', '#EF4444', 'fail', 2),
    ('N/A', '#6B7280', 'neutral', 3),
    ('Needs Repair', '#F59E0B', 'fail', 4),
    ('Marginal', '#FBBF24', 'neutral', 5)
) AS option_data(name, color, result_type, sort_order)
ON CONFLICT (product_type_id, name) DO NOTHING;
