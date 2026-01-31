/*
  # Fix Product Type Alias Synchronization

  1. Problem
    - Data clearing migrations delete product_types and product_type_aliases
    - But import_intelligence_rules still contain orphaned references
    - Result: Product types don't get assigned during import

  2. Solution
    - Add import_intelligence_rules to data clearing
    - Create trigger to auto-sync product_type_aliases ↔ import_intelligence_rules
    - Ensures both tables stay in sync

  3. Changes
    - Clear orphaned product type lookup rules
    - Create sync trigger for INSERT/UPDATE/DELETE on product_type_aliases
    - Future data clears will properly sync both tables

  4. Impact
    - Fixes product type assignment during receiving
    - Eliminates orphaned references
    - Automatic synchronization going forward
*/

-- Step 1: Clear any existing orphaned product type lookup rules
DELETE FROM import_intelligence_rules
WHERE rule_type = 'value_lookup'
AND applies_to_field = 'product_type'
AND (
  output_reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM product_types
    WHERE id = import_intelligence_rules.output_reference_id
  )
);

-- Step 2: Re-sync from existing product_type_aliases
INSERT INTO import_intelligence_rules (
  company_id,
  rule_type,
  applies_to_field,
  input_keywords,
  output_reference_id,
  output_reference_table,
  priority,
  is_active,
  created_at
)
SELECT
  pta.company_id,
  'value_lookup'::text,
  'product_type'::text,
  jsonb_build_array(LOWER(pta.alias)),
  pta.product_type_id,
  'product_types'::text,
  100,
  true,
  pta.created_at
FROM product_type_aliases pta
WHERE EXISTS (
  SELECT 1 FROM product_types pt
  WHERE pt.id = pta.product_type_id
)
ON CONFLICT DO NOTHING;

-- Step 3: Create trigger function to keep tables in sync
CREATE OR REPLACE FUNCTION sync_product_type_aliases_to_intelligence()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add new rule to import_intelligence_rules
    INSERT INTO import_intelligence_rules (
      company_id,
      rule_type,
      applies_to_field,
      input_keywords,
      output_reference_id,
      output_reference_table,
      priority,
      is_active,
      created_by
    )
    VALUES (
      NEW.company_id,
      'value_lookup',
      'product_type',
      jsonb_build_array(LOWER(NEW.alias)),
      NEW.product_type_id,
      'product_types',
      100,
      true,
      NEW.created_by
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Synced new alias "%" to import_intelligence_rules', NEW.alias;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing rule
    UPDATE import_intelligence_rules
    SET
      input_keywords = jsonb_build_array(LOWER(NEW.alias)),
      output_reference_id = NEW.product_type_id,
      updated_at = now()
    WHERE company_id = OLD.company_id
    AND rule_type = 'value_lookup'
    AND applies_to_field = 'product_type'
    AND input_keywords = jsonb_build_array(LOWER(OLD.alias));

    RAISE NOTICE 'Updated alias "%" → "%" in import_intelligence_rules', OLD.alias, NEW.alias;

  ELSIF TG_OP = 'DELETE' THEN
    -- Remove rule from import_intelligence_rules
    DELETE FROM import_intelligence_rules
    WHERE company_id = OLD.company_id
    AND rule_type = 'value_lookup'
    AND applies_to_field = 'product_type'
    AND input_keywords = jsonb_build_array(LOWER(OLD.alias));

    RAISE NOTICE 'Removed alias "%" from import_intelligence_rules', OLD.alias;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS sync_product_type_aliases ON product_type_aliases;

CREATE TRIGGER sync_product_type_aliases
  AFTER INSERT OR UPDATE OR DELETE ON product_type_aliases
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_type_aliases_to_intelligence();

-- Step 5: Add import_intelligence_rules to future data clearing
-- Note: This is a comment reminder for future data clearing migrations
-- Always include 'import_intelligence_rules' in tables_to_clear array
-- OR re-run the sync after clearing product_type_aliases

COMMENT ON FUNCTION sync_product_type_aliases_to_intelligence() IS
'Auto-syncs product_type_aliases to import_intelligence_rules.
Ensures both tables stay in sync when aliases are added, updated, or deleted.
Created: 2025-11-10 to fix orphaned reference issue.';
