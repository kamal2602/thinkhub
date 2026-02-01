/*
  # Populate Reference Tables and Auto-Create for New Companies

  ## Summary
  This migration resolves the critical blocker preventing FK constraint addition by:
  1. Populating default values for existing company
  2. Creating trigger to auto-populate for new companies
  3. Ensuring all companies have standard reference data

  ## Changes

  ### 1. Reference Data Population
  Populates three critical reference tables:
  
  **asset_statuses:**
  - In Stock (default) - Available inventory
  - Sold - Sold to customer
  - Reserved - Reserved for sale
  - Scrapped - Scrapped/Recycled
  - In Transit - Being shipped
  - Processing - Being processed/tested
  - Quarantine - Quality hold

  **functional_statuses:**
  - Fully Working (default) - All functions operational
  - Partially Working - Some functions impaired
  - Not Working - Non-functional
  - Untested - Not yet tested
  - Cosmetic Damage Only - Functional but cosmetic issues

  **cosmetic_grades:**
  - A - Excellent condition (minimal wear)
  - B (default) - Good condition (light wear)
  - C - Fair condition (moderate wear)
  - D - Poor condition (heavy wear)
  - E - Salvage condition (parts only)

  ### 2. Auto-Population System
  Creates trigger function that automatically populates reference tables when:
  - New company is created
  - Ensures consistency across all companies
  - Prevents FK constraint failures

  ### 3. Data Integrity
  - Uses IF NOT EXISTS pattern for safety
  - Maintains sort_order for UI consistency
  - Sets appropriate default flags
  - Includes color coding for status visualization

  ## Important Notes
  - This migration is IDEMPOTENT (safe to run multiple times)
  - Does NOT modify existing reference data
  - Required before adding FK constraints
  - Existing company receives defaults immediately
  - New companies receive defaults automatically
*/

-- =====================================================
-- PART 1: Create trigger function for auto-population
-- =====================================================

CREATE OR REPLACE FUNCTION populate_company_reference_tables()
RETURNS TRIGGER AS $$
BEGIN
  -- Populate asset_statuses
  INSERT INTO asset_statuses (company_id, name, description, color, is_default, sort_order)
  VALUES
    (NEW.id, 'In Stock', 'Available inventory', '#10B981', true, 1),
    (NEW.id, 'Sold', 'Sold to customer', '#3B82F6', false, 2),
    (NEW.id, 'Reserved', 'Reserved for sale', '#F59E0B', false, 3),
    (NEW.id, 'Scrapped', 'Scrapped/Recycled', '#6B7280', false, 4),
    (NEW.id, 'In Transit', 'Being shipped', '#8B5CF6', false, 5),
    (NEW.id, 'Processing', 'Being processed/tested', '#06B6D4', false, 6),
    (NEW.id, 'Quarantine', 'Quality hold', '#EF4444', false, 7);

  -- Populate functional_statuses
  INSERT INTO functional_statuses (company_id, status, description, sort_order)
  VALUES
    (NEW.id, 'Fully Working', 'All functions operational', 1),
    (NEW.id, 'Partially Working', 'Some functions impaired', 2),
    (NEW.id, 'Not Working', 'Non-functional', 3),
    (NEW.id, 'Untested', 'Not yet tested', 4),
    (NEW.id, 'Cosmetic Damage Only', 'Functional but cosmetic issues', 5);

  -- Populate cosmetic_grades
  INSERT INTO cosmetic_grades (company_id, grade, description, sort_order)
  VALUES
    (NEW.id, 'A', 'Excellent condition (minimal wear)', 1),
    (NEW.id, 'B', 'Good condition (light wear)', 2),
    (NEW.id, 'C', 'Fair condition (moderate wear)', 3),
    (NEW.id, 'D', 'Poor condition (heavy wear)', 4),
    (NEW.id, 'E', 'Salvage condition (parts only)', 5);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: Create trigger on companies table
-- =====================================================

DROP TRIGGER IF EXISTS trigger_populate_company_reference_tables ON companies;

CREATE TRIGGER trigger_populate_company_reference_tables
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION populate_company_reference_tables();

-- =====================================================
-- PART 3: Populate existing company's reference tables
-- =====================================================

DO $$
DECLARE
  company_record RECORD;
BEGIN
  -- Loop through all existing companies
  FOR company_record IN SELECT id FROM companies
  LOOP
    -- Check if reference data already exists
    IF NOT EXISTS (SELECT 1 FROM asset_statuses WHERE company_id = company_record.id) THEN
      -- Populate asset_statuses
      INSERT INTO asset_statuses (company_id, name, description, color, is_default, sort_order)
      VALUES
        (company_record.id, 'In Stock', 'Available inventory', '#10B981', true, 1),
        (company_record.id, 'Sold', 'Sold to customer', '#3B82F6', false, 2),
        (company_record.id, 'Reserved', 'Reserved for sale', '#F59E0B', false, 3),
        (company_record.id, 'Scrapped', 'Scrapped/Recycled', '#6B7280', false, 4),
        (company_record.id, 'In Transit', 'Being shipped', '#8B5CF6', false, 5),
        (company_record.id, 'Processing', 'Being processed/tested', '#06B6D4', false, 6),
        (company_record.id, 'Quarantine', 'Quality hold', '#EF4444', false, 7);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM functional_statuses WHERE company_id = company_record.id) THEN
      -- Populate functional_statuses
      INSERT INTO functional_statuses (company_id, status, description, sort_order)
      VALUES
        (company_record.id, 'Fully Working', 'All functions operational', 1),
        (company_record.id, 'Partially Working', 'Some functions impaired', 2),
        (company_record.id, 'Not Working', 'Non-functional', 3),
        (company_record.id, 'Untested', 'Not yet tested', 4),
        (company_record.id, 'Cosmetic Damage Only', 'Functional but cosmetic issues', 5);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM cosmetic_grades WHERE company_id = company_record.id) THEN
      -- Populate cosmetic_grades
      INSERT INTO cosmetic_grades (company_id, grade, description, sort_order)
      VALUES
        (company_record.id, 'A', 'Excellent condition (minimal wear)', 1),
        (company_record.id, 'B', 'Good condition (light wear)', 2),
        (company_record.id, 'C', 'Fair condition (moderate wear)', 3),
        (company_record.id, 'D', 'Poor condition (heavy wear)', 4),
        (company_record.id, 'E', 'Salvage condition (parts only)', 5);
    END IF;
  END LOOP;
END $$;
