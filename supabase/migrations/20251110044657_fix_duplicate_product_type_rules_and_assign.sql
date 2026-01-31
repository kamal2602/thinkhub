/*
  # Fix Duplicate Product Type Rules and Assign to Existing Assets

  1. Problem
    - Duplicate import_intelligence_rules for product_type
    - Some rules have NULL output_reference_id (orphaned)
    - Existing assets don't have product_type_id assigned

  2. Solution
    - Delete all orphaned rules (NULL references)
    - Delete duplicate rules (keep only one per keyword)
    - Create product_type_aliases if missing
    - Update existing assets with product_type_id

  3. Impact
    - Clean intelligence rules
    - Proper product type aliases
    - All HP EliteBook assets will be assigned to Laptop type
*/

-- Step 1: Delete orphaned rules (NULL references)
DELETE FROM import_intelligence_rules
WHERE rule_type = 'value_lookup'
AND applies_to_field = 'product_type'
AND output_reference_id IS NULL;

-- Step 2: Delete duplicate rules (keep highest priority)
DELETE FROM import_intelligence_rules
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, rule_type, applies_to_field, input_keywords 
        ORDER BY priority DESC, created_at ASC
      ) as rn
    FROM import_intelligence_rules
    WHERE rule_type = 'value_lookup'
    AND applies_to_field = 'product_type'
  ) t
  WHERE rn > 1
);

-- Step 3: Ensure product_type_aliases exist
INSERT INTO product_type_aliases (company_id, product_type_id, alias, created_by)
SELECT 
  pt.company_id,
  pt.id,
  'Notebooks',
  (SELECT id FROM profiles WHERE company_id = pt.company_id LIMIT 1)
FROM product_types pt
WHERE LOWER(pt.name) = 'laptop'
ON CONFLICT DO NOTHING;

INSERT INTO product_type_aliases (company_id, product_type_id, alias, created_by)
SELECT 
  pt.company_id,
  pt.id,
  'Notebook',
  (SELECT id FROM profiles WHERE company_id = pt.company_id LIMIT 1)
FROM product_types pt
WHERE LOWER(pt.name) = 'laptop'
ON CONFLICT DO NOTHING;

INSERT INTO product_type_aliases (company_id, product_type_id, alias, created_by)
SELECT 
  pt.company_id,
  pt.id,
  'Laptop',
  (SELECT id FROM profiles WHERE company_id = pt.company_id LIMIT 1)
FROM product_types pt
WHERE LOWER(pt.name) = 'laptop'
ON CONFLICT DO NOTHING;

-- Step 4: Update existing HP EliteBook assets to Laptop product type
UPDATE assets
SET product_type_id = (
  SELECT pt.id 
  FROM product_types pt
  WHERE pt.company_id = assets.company_id
  AND LOWER(pt.name) = 'laptop'
  LIMIT 1
)
WHERE product_type_id IS NULL
AND brand = 'HP'
AND model LIKE '%EliteBook%';

-- Step 5: Update other laptop-like models
UPDATE assets
SET product_type_id = (
  SELECT pt.id 
  FROM product_types pt
  WHERE pt.company_id = assets.company_id
  AND LOWER(pt.name) = 'laptop'
  LIMIT 1
)
WHERE product_type_id IS NULL
AND (
  model ILIKE '%laptop%'
  OR model ILIKE '%notebook%'
  OR model ILIKE '%probook%'
  OR model ILIKE '%latitude%'
  OR model ILIKE '%thinkpad%'
  OR model ILIKE '%macbook%'
);

-- Log the changes
DO $$
DECLARE
  v_updated_count INTEGER;
  v_rules_cleaned INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM assets
  WHERE product_type_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_rules_cleaned
  FROM import_intelligence_rules
  WHERE rule_type = 'value_lookup'
  AND applies_to_field = 'product_type';
  
  RAISE NOTICE 'Updated % assets with product_type_id', v_updated_count;
  RAISE NOTICE 'Cleaned to % intelligence rules', v_rules_cleaned;
END $$;
