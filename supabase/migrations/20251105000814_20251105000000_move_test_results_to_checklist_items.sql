/*
  # Move Test Results to Checklist Item Level

  ## Overview
  Changes test result options from being product-type-wide to being configured
  per individual checklist item. This allows different test items to have
  different result options.

  ## Changes

  1. **Add checklist_template_id to test_result_options**
     - Links results directly to specific checklist items
     - Makes product_type_id optional (for backward compatibility)

  2. **Update Constraints**
     - Change unique constraint from (product_type_id, name) to (checklist_template_id, name)
     - Allow NULL product_type_id for new item-specific results

  3. **Update RLS Policies**
     - Policies now check access through checklist templates

  ## Migration Strategy
  - Existing product-type-level results are preserved (product_type_id remains)
  - New item-specific results use checklist_template_id
  - Both can coexist during transition

  ## Use Cases

  ### Example: Laptop Testing
  - Screen item: "Excellent", "Cracked", "Dead Pixels", "Scratches"
  - Battery item: "Excellent", "Good", "Degraded", "Failed"
  - Keyboard item: "Fully Functional", "Some Keys Stuck", "Non-Functional"

  Each test item gets its own relevant result options!
*/

-- Add checklist_template_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'test_result_options' AND column_name = 'checklist_template_id'
  ) THEN
    ALTER TABLE test_result_options
      ADD COLUMN checklist_template_id uuid REFERENCES testing_checklist_templates(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make product_type_id nullable (for new item-specific results)
ALTER TABLE test_result_options ALTER COLUMN product_type_id DROP NOT NULL;

-- Drop old unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_result_options_product_type_id_name_key'
  ) THEN
    ALTER TABLE test_result_options DROP CONSTRAINT test_result_options_product_type_id_name_key;
  END IF;
END $$;

-- Add new unique constraint for checklist-item-specific results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_result_options_checklist_name_unique'
  ) THEN
    ALTER TABLE test_result_options
      ADD CONSTRAINT test_result_options_checklist_name_unique
      UNIQUE (checklist_template_id, name);
  END IF;
END $$;

-- Add check constraint: must have either product_type_id OR checklist_template_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_result_options_parent_check'
  ) THEN
    ALTER TABLE test_result_options
      ADD CONSTRAINT test_result_options_parent_check
      CHECK (
        (product_type_id IS NOT NULL AND checklist_template_id IS NULL) OR
        (product_type_id IS NULL AND checklist_template_id IS NOT NULL)
      );
  END IF;
END $$;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view test result options" ON test_result_options;
DROP POLICY IF EXISTS "Users can insert test result options" ON test_result_options;
DROP POLICY IF EXISTS "Users can update test result options" ON test_result_options;
DROP POLICY IF EXISTS "Users can delete test result options" ON test_result_options;

-- Create new RLS policies that handle both product-type and checklist-item results
CREATE POLICY "Users can view test result options"
  ON test_result_options FOR SELECT
  TO authenticated
  USING (
    -- Product-type level results
    (product_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
    ))
    OR
    -- Checklist-item level results
    (checklist_template_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM testing_checklist_templates tct
      JOIN product_types pt ON pt.id = tct.product_type_id
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE tct.id = test_result_options.checklist_template_id
      AND uca.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert test result options"
  ON test_result_options FOR INSERT
  TO authenticated
  WITH CHECK (
    (product_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
    ))
    OR
    (checklist_template_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM testing_checklist_templates tct
      JOIN product_types pt ON pt.id = tct.product_type_id
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE tct.id = test_result_options.checklist_template_id
      AND uca.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update test result options"
  ON test_result_options FOR UPDATE
  TO authenticated
  USING (
    (product_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
    ))
    OR
    (checklist_template_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM testing_checklist_templates tct
      JOIN product_types pt ON pt.id = tct.product_type_id
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE tct.id = test_result_options.checklist_template_id
      AND uca.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (product_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
    ))
    OR
    (checklist_template_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM testing_checklist_templates tct
      JOIN product_types pt ON pt.id = tct.product_type_id
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE tct.id = test_result_options.checklist_template_id
      AND uca.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete test result options"
  ON test_result_options FOR DELETE
  TO authenticated
  USING (
    (product_type_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM product_types pt
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE pt.id = test_result_options.product_type_id
      AND uca.user_id = auth.uid()
    ))
    OR
    (checklist_template_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM testing_checklist_templates tct
      JOIN product_types pt ON pt.id = tct.product_type_id
      JOIN user_company_access uca ON uca.company_id = pt.company_id
      WHERE tct.id = test_result_options.checklist_template_id
      AND uca.user_id = auth.uid()
    ))
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_result_options_checklist_template
  ON test_result_options(checklist_template_id);

-- Add helpful comments
COMMENT ON COLUMN test_result_options.checklist_template_id IS 'Links result to specific checklist item (NULL for product-type-wide results)';
COMMENT ON COLUMN test_result_options.product_type_id IS 'Links result to entire product type (NULL for item-specific results)';
