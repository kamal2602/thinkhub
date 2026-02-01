# Migration Test Suite
**Phase 0 Schema Stabilization**
**Created:** 2026-02-01

---

## Test Overview

This document provides manual test scripts to verify all Phase 0 migrations are working correctly.

---

## Test 1: Reference Tables Population

### Objective
Verify that reference tables are populated with default values for all companies.

### Test SQL
```sql
-- Test 1.1: Check reference tables are populated
SELECT
  'asset_statuses' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT company_id) as company_count
FROM asset_statuses
UNION ALL
SELECT
  'functional_statuses' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT company_id) as company_count
FROM functional_statuses
UNION ALL
SELECT
  'cosmetic_grades' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT company_id) as company_count
FROM cosmetic_grades;

-- Expected Results:
-- asset_statuses: 7 rows per company
-- functional_statuses: 5 rows per company
-- cosmetic_grades: 5 rows per company
```

### Test SQL
```sql
-- Test 1.2: Verify default values exist
SELECT
  name,
  is_default,
  sort_order
FROM asset_statuses
WHERE company_id = (SELECT id FROM companies LIMIT 1)
ORDER BY sort_order;

-- Expected: 'In Stock' should have is_default = true
```

### Test SQL
```sql
-- Test 1.3: Verify all statuses have unique names per company
SELECT
  company_id,
  name,
  COUNT(*) as duplicate_count
FROM asset_statuses
GROUP BY company_id, name
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)
```

### Pass Criteria
- ✅ Each company has 7 asset_statuses
- ✅ Each company has 5 functional_statuses
- ✅ Each company has 5 cosmetic_grades
- ✅ 'In Stock' is marked as default
- ✅ No duplicate values per company

---

## Test 2: FK Constraints on Assets Table

### Objective
Verify that FK constraints prevent invalid status values.

### Test SQL
```sql
-- Test 2.1: Verify FK constraints exist
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'assets'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name IN (
    'assets_status_fkey',
    'assets_functional_status_fkey',
    'assets_cosmetic_grade_fkey'
  );

-- Expected: 3 rows showing FK constraints
```

### Test SQL
```sql
-- Test 2.2: Try to insert asset with invalid status (should FAIL)
DO $$
DECLARE
  test_company_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  BEGIN
    INSERT INTO assets (company_id, serial_number, status)
    VALUES (test_company_id, 'TEST-INVALID-STATUS', 'Invalid Status');

    RAISE EXCEPTION 'TEST FAILED: Insert with invalid status should have been blocked';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST PASSED: Invalid status correctly blocked by FK constraint';
  END;
END $$;

-- Expected: "TEST PASSED" message
```

### Test SQL
```sql
-- Test 2.3: Try to insert asset with valid status (should SUCCEED)
DO $$
DECLARE
  test_company_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  INSERT INTO assets (company_id, serial_number, status, functional_status, cosmetic_grade)
  VALUES (test_company_id, 'TEST-VALID-STATUS', 'In Stock', 'Fully Working', 'B');

  DELETE FROM assets WHERE serial_number = 'TEST-VALID-STATUS';

  RAISE NOTICE 'TEST PASSED: Valid status correctly accepted';
END $$;

-- Expected: "TEST PASSED" message
```

### Test SQL
```sql
-- Test 2.4: Try to delete reference data that's in use (should FAIL)
DO $$
DECLARE
  test_company_id uuid;
  test_asset_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  -- Create test asset
  INSERT INTO assets (company_id, serial_number, status)
  VALUES (test_company_id, 'TEST-DELETE-PROTECTION', 'In Stock')
  RETURNING id INTO test_asset_id;

  BEGIN
    -- Try to delete the status
    DELETE FROM asset_statuses
    WHERE company_id = test_company_id AND name = 'In Stock';

    RAISE EXCEPTION 'TEST FAILED: Should not be able to delete in-use status';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST PASSED: In-use status correctly protected from deletion';
  END;

  -- Cleanup
  DELETE FROM assets WHERE id = test_asset_id;
END $$;

-- Expected: "TEST PASSED" message
```

### Pass Criteria
- ✅ Three FK constraints exist on assets table
- ✅ Invalid status values are rejected
- ✅ Valid status values are accepted
- ✅ In-use reference data cannot be deleted

---

## Test 3: Parallel Truth Blocking Triggers

### Objective
Verify that triggers prevent writes to parallel truth fields.

### Test SQL
```sql
-- Test 3.1: Verify triggers exist
SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_block_auction_lots_parallel_truth',
  'trigger_block_assets_parallel_truth'
)
ORDER BY event_object_table, event_manipulation;

-- Expected: 4 rows (2 tables × 2 operations each)
```

### Test SQL
```sql
-- Test 3.2: Try to set assets.selling_price (should FAIL)
DO $$
DECLARE
  test_company_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  BEGIN
    INSERT INTO assets (company_id, serial_number, status, selling_price)
    VALUES (test_company_id, 'TEST-PARALLEL-TRUTH', 'In Stock', 100.00);

    RAISE EXCEPTION 'TEST FAILED: selling_price should have been blocked';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE '%PARALLEL TRUTH VIOLATION%' THEN
        RAISE NOTICE 'TEST PASSED: selling_price correctly blocked';
      ELSE
        RAISE;
      END IF;
  END;
END $$;

-- Expected: "TEST PASSED" message
```

### Test SQL
```sql
-- Test 3.3: Try to set assets.profit_amount (should FAIL)
DO $$
DECLARE
  test_company_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  BEGIN
    INSERT INTO assets (company_id, serial_number, status, profit_amount)
    VALUES (test_company_id, 'TEST-PROFIT', 'In Stock', 50.00);

    RAISE EXCEPTION 'TEST FAILED: profit_amount should have been blocked';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE '%PARALLEL TRUTH VIOLATION%' THEN
        RAISE NOTICE 'TEST PASSED: profit_amount correctly blocked';
      ELSE
        RAISE;
      END IF;
  END;
END $$;

-- Expected: "TEST PASSED" message
```

### Test SQL
```sql
-- Test 3.4: Verify allowed fields still work (should SUCCEED)
DO $$
DECLARE
  test_company_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  INSERT INTO assets (
    company_id,
    serial_number,
    status,
    purchase_price,
    refurbishment_cost,
    market_price
  )
  VALUES (
    test_company_id,
    'TEST-ALLOWED-FIELDS',
    'In Stock',
    100.00,
    20.00,
    150.00
  );

  DELETE FROM assets WHERE serial_number = 'TEST-ALLOWED-FIELDS';

  RAISE NOTICE 'TEST PASSED: Allowed financial fields work correctly';
END $$;

-- Expected: "TEST PASSED" message
```

### Test SQL
```sql
-- Test 3.5: Check column comments are set
SELECT
  c.table_name,
  c.column_name,
  pgd.description
FROM pg_catalog.pg_statio_all_tables st
JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
JOIN information_schema.columns c ON (
  pgd.objsubid = c.ordinal_position AND
  c.table_schema = st.schemaname AND
  c.table_name = st.relname
)
WHERE c.table_name IN ('assets', 'auction_lots')
  AND c.column_name IN (
    'selling_price',
    'profit_amount',
    'profit_margin',
    'hammer_price',
    'total_price',
    'commission_amount'
  )
ORDER BY c.table_name, c.column_name;

-- Expected: 6 rows with "DEPRECATED - DO NOT USE" comments
```

### Pass Criteria
- ✅ Blocking triggers exist on both tables
- ✅ Writes to selling_price are blocked
- ✅ Writes to profit_amount are blocked
- ✅ Writes to profit_margin are blocked
- ✅ Allowed fields (purchase_price, refurbishment_cost, market_price) work
- ✅ Helpful column comments are present

---

## Test 4: Auto-Population for New Companies

### Objective
Verify that new companies automatically receive reference data.

### Test SQL
```sql
-- Test 4.1: Create test company and verify auto-population
DO $$
DECLARE
  new_company_id uuid;
  status_count int;
  functional_count int;
  grade_count int;
BEGIN
  -- Create test company
  INSERT INTO companies (name, settings)
  VALUES ('Test Company Auto-Population', '{}')
  RETURNING id INTO new_company_id;

  -- Check reference tables were auto-populated
  SELECT COUNT(*) INTO status_count
  FROM asset_statuses
  WHERE company_id = new_company_id;

  SELECT COUNT(*) INTO functional_count
  FROM functional_statuses
  WHERE company_id = new_company_id;

  SELECT COUNT(*) INTO grade_count
  FROM cosmetic_grades
  WHERE company_id = new_company_id;

  -- Verify counts
  IF status_count != 7 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 7 asset_statuses, got %', status_count;
  END IF;

  IF functional_count != 5 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 5 functional_statuses, got %', functional_count;
  END IF;

  IF grade_count != 5 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 5 cosmetic_grades, got %', grade_count;
  END IF;

  -- Cleanup
  DELETE FROM cosmetic_grades WHERE company_id = new_company_id;
  DELETE FROM functional_statuses WHERE company_id = new_company_id;
  DELETE FROM asset_statuses WHERE company_id = new_company_id;
  DELETE FROM companies WHERE id = new_company_id;

  RAISE NOTICE 'TEST PASSED: New company automatically received all reference data';
END $$;

-- Expected: "TEST PASSED" message
```

### Pass Criteria
- ✅ New company automatically receives 7 asset_statuses
- ✅ New company automatically receives 5 functional_statuses
- ✅ New company automatically receives 5 cosmetic_grades

---

## Test 5: End-to-End Asset Creation

### Objective
Verify complete asset creation workflow with new constraints.

### Test SQL
```sql
-- Test 5.1: Create asset with all required fields
DO $$
DECLARE
  test_company_id uuid;
  test_product_type_id uuid;
  test_asset_id uuid;
BEGIN
  SELECT id INTO test_company_id FROM companies LIMIT 1;

  -- Create test product type if needed
  INSERT INTO product_types (company_id, name, category)
  VALUES (test_company_id, 'Test Laptop', 'Electronics')
  ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO test_product_type_id;

  -- Create asset with valid reference data
  INSERT INTO assets (
    company_id,
    serial_number,
    product_type_id,
    status,
    functional_status,
    cosmetic_grade,
    purchase_price
  )
  VALUES (
    test_company_id,
    'E2E-TEST-001',
    test_product_type_id,
    'In Stock',
    'Fully Working',
    'B',
    100.00
  )
  RETURNING id INTO test_asset_id;

  -- Verify asset was created
  IF test_asset_id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Asset was not created';
  END IF;

  -- Verify can read asset back
  IF NOT EXISTS (
    SELECT 1 FROM assets
    WHERE id = test_asset_id
      AND status = 'In Stock'
      AND functional_status = 'Fully Working'
      AND cosmetic_grade = 'B'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Asset data mismatch';
  END IF;

  -- Cleanup
  DELETE FROM assets WHERE id = test_asset_id;

  RAISE NOTICE 'TEST PASSED: End-to-end asset creation successful';
END $$;

-- Expected: "TEST PASSED" message
```

### Pass Criteria
- ✅ Asset can be created with valid reference values
- ✅ Asset data persists correctly
- ✅ All FK constraints are satisfied

---

## Test 6: Migration Rollback Safety

### Objective
Verify that migrations can be safely rolled back if needed.

### Important Notes
**DO NOT RUN THESE IN PRODUCTION**

These are documentation of rollback procedures for emergency use only.

### Rollback Procedure

#### Step 1: Remove Blocking Triggers
```sql
-- Only if absolutely necessary
DROP TRIGGER IF EXISTS trigger_block_auction_lots_parallel_truth ON auction_lots;
DROP TRIGGER IF EXISTS trigger_block_assets_parallel_truth ON assets;
DROP FUNCTION IF EXISTS block_auction_lots_parallel_truth();
DROP FUNCTION IF EXISTS block_assets_parallel_truth();
```

#### Step 2: Remove FK Constraints
```sql
-- Only if absolutely necessary
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_functional_status_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_cosmetic_grade_fkey;
```

#### Step 3: Remove Auto-Population Trigger
```sql
-- Only if absolutely necessary
DROP TRIGGER IF EXISTS trigger_populate_company_reference_tables ON companies;
DROP FUNCTION IF EXISTS populate_company_reference_tables();
```

#### Step 4: Remove Reference Data
```sql
-- DANGER: Only if you need to start fresh
-- This will fail if any assets exist
DELETE FROM asset_statuses;
DELETE FROM functional_statuses;
DELETE FROM cosmetic_grades;
```

---

## Test 7: Performance Impact

### Objective
Measure performance impact of new constraints and triggers.

### Test SQL
```sql
-- Test 7.1: Baseline insert performance
EXPLAIN ANALYZE
INSERT INTO assets (company_id, serial_number, status)
SELECT
  (SELECT id FROM companies LIMIT 1),
  'PERF-TEST-' || generate_series,
  'In Stock'
FROM generate_series(1, 1000);

-- Delete test data
DELETE FROM assets WHERE serial_number LIKE 'PERF-TEST-%';

-- Expected: Should complete in < 1 second
```

### Pass Criteria
- ✅ Bulk insert of 1000 assets completes in reasonable time
- ✅ No significant performance degradation
- ✅ Query plan shows FK validation is efficient

---

## Final Verification Checklist

Run this query to get an overall system health check:

```sql
-- System Health Check
SELECT
  'Reference Tables Populated' as check_name,
  CASE
    WHEN (SELECT COUNT(*) FROM asset_statuses) > 0
      AND (SELECT COUNT(*) FROM functional_statuses) > 0
      AND (SELECT COUNT(*) FROM cosmetic_grades) > 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
UNION ALL
SELECT
  'FK Constraints Exist' as check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.table_constraints
      WHERE table_name = 'assets'
        AND constraint_name IN (
          'assets_status_fkey',
          'assets_functional_status_fkey',
          'assets_cosmetic_grade_fkey'
        )
    ) = 3
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
UNION ALL
SELECT
  'Blocking Triggers Exist' as check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.triggers
      WHERE trigger_name IN (
        'trigger_block_auction_lots_parallel_truth',
        'trigger_block_assets_parallel_truth'
      )
    ) >= 2
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
UNION ALL
SELECT
  'Auto-Population Trigger Exists' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_populate_company_reference_tables'
    )
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;
```

Expected output:
```
✅ PASS - Reference Tables Populated
✅ PASS - FK Constraints Exist
✅ PASS - Blocking Triggers Exist
✅ PASS - Auto-Population Trigger Exists
```

---

## Summary

### What Was Tested
1. ✅ Reference tables population
2. ✅ FK constraints enforcement
3. ✅ Parallel truth blocking
4. ✅ Auto-population for new companies
5. ✅ End-to-end asset creation
6. ✅ Performance impact
7. ✅ System health check

### Expected Results
All tests should pass with zero failures.

### If Tests Fail
1. Check error messages for specific constraint violations
2. Verify migrations were applied in correct order
3. Check that no manual data modifications broke constraints
4. Review rollback procedures if needed

---

**END OF TEST SUITE**
