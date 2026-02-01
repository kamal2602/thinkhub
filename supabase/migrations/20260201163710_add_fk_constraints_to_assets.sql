/*
  # Add Foreign Key Constraints to Assets Table

  ## Summary
  Adds referential integrity constraints to the assets table, ensuring:
  - All status values reference valid asset_statuses
  - All functional_status values reference valid functional_statuses
  - All cosmetic_grade values reference valid cosmetic_grades
  - Company-scoped validation (assets can only use their company's reference data)

  ## Changes

  ### 1. Asset Status FK Constraint
  Links assets.status to asset_statuses.name:
  - Composite FK on (company_id, status)
  - Prevents invalid status values
  - Ensures company-scoped validation
  - Uses ON DELETE RESTRICT to prevent deletion of in-use statuses

  ### 2. Functional Status FK Constraint
  Links assets.functional_status to functional_statuses.status:
  - Composite FK on (company_id, functional_status)
  - Prevents invalid functional status values
  - Ensures company-scoped validation
  - Uses ON DELETE RESTRICT to prevent deletion of in-use statuses

  ### 3. Cosmetic Grade FK Constraint
  Links assets.cosmetic_grade to cosmetic_grades.grade:
  - Composite FK on (company_id, cosmetic_grade)
  - Prevents invalid grade values
  - Ensures company-scoped validation
  - Uses ON DELETE RESTRICT to prevent deletion of in-use grades

  ## Data Safety
  - Safe to apply: 0 assets exist in database
  - Uses IF NOT EXISTS for idempotency
  - ON DELETE RESTRICT prevents accidental reference data deletion
  - Validates company_id match for data isolation

  ## Important Notes
  - Reference tables MUST be populated before this migration
  - All three reference tables have compound UNIQUE constraints
  - Constraints enforce data quality at database level
  - Existing default values ('In Stock', 'Fully Working', 'B') are valid
*/

-- =====================================================
-- PART 1: Add FK constraint for assets.status
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'assets_status_fkey'
    AND table_name = 'assets'
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT assets_status_fkey
      FOREIGN KEY (company_id, status)
      REFERENCES asset_statuses(company_id, name)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- =====================================================
-- PART 2: Add FK constraint for assets.functional_status
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'assets_functional_status_fkey'
    AND table_name = 'assets'
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT assets_functional_status_fkey
      FOREIGN KEY (company_id, functional_status)
      REFERENCES functional_statuses(company_id, status)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- =====================================================
-- PART 3: Add FK constraint for assets.cosmetic_grade
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'assets_cosmetic_grade_fkey'
    AND table_name = 'assets'
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT assets_cosmetic_grade_fkey
      FOREIGN KEY (company_id, cosmetic_grade)
      REFERENCES cosmetic_grades(company_id, grade)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- =====================================================
-- PART 4: Verify constraints were added
-- =====================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'assets'
    AND constraint_name IN (
      'assets_status_fkey',
      'assets_functional_status_fkey',
      'assets_cosmetic_grade_fkey'
    );

  IF constraint_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 FK constraints but found %', constraint_count;
  END IF;

  RAISE NOTICE 'Successfully added 3 FK constraints to assets table';
END $$;
