/*
  # PHASE 2: Multi-Entity Support - Company-Scoped Master Data

  ## Overview
  Ensures ALL master data tables are company-scoped per user decision.
  Each company can configure their own master data independently.

  ## Changes

  1. Add company_id to Master Data Tables
    - cosmetic_grades
    - functional_statuses
    - processing_stages
    - warranty_types
    - return_reasons
    - payment_terms
    - lead_sources
    - opportunity_stages

  2. Update RLS Policies
    - Enforce company isolation
    - Users only see their company's data

  3. Data Migration
    - Duplicate existing global data for each company
    - Maintain backward compatibility

  Note: refurbishment_cost_categories is already company-scoped through product_types relationship
*/

-- =====================================================
-- 1. ADD COMPANY_ID TO COSMETIC_GRADES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cosmetic_grades' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE cosmetic_grades ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    -- Migrate existing data: duplicate for each company
    INSERT INTO cosmetic_grades (company_id, name, description, color, sort_order)
    SELECT c.id, cg.name, cg.description, cg.color, cg.sort_order
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, description, color, sort_order FROM cosmetic_grades WHERE company_id IS NULL) cg
    ON CONFLICT DO NOTHING;
    
    -- Remove old global records
    DELETE FROM cosmetic_grades WHERE company_id IS NULL;
    
    -- Make company_id required
    ALTER TABLE cosmetic_grades ALTER COLUMN company_id SET NOT NULL;
    
    -- Add unique constraint
    ALTER TABLE cosmetic_grades DROP CONSTRAINT IF EXISTS cosmetic_grades_name_key;
    ALTER TABLE cosmetic_grades ADD CONSTRAINT cosmetic_grades_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_cosmetic_grades_company ON cosmetic_grades(company_id);
  END IF;
END $$;

-- =====================================================
-- 2. ADD COMPANY_ID TO FUNCTIONAL_STATUSES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'functional_statuses' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE functional_statuses ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO functional_statuses (company_id, name, description, sort_order)
    SELECT c.id, fs.name, fs.description, fs.sort_order
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, description, sort_order FROM functional_statuses WHERE company_id IS NULL) fs
    ON CONFLICT DO NOTHING;
    
    DELETE FROM functional_statuses WHERE company_id IS NULL;
    
    ALTER TABLE functional_statuses ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE functional_statuses DROP CONSTRAINT IF EXISTS functional_statuses_name_key;
    ALTER TABLE functional_statuses ADD CONSTRAINT functional_statuses_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_functional_statuses_company ON functional_statuses(company_id);
  END IF;
END $$;

-- =====================================================
-- 3. ADD COMPANY_ID TO PROCESSING_STAGES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_stages' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE processing_stages ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO processing_stages (company_id, name, description, sort_order, color)
    SELECT c.id, ps.name, ps.description, ps.sort_order, ps.color
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, description, sort_order, color FROM processing_stages WHERE company_id IS NULL) ps
    ON CONFLICT DO NOTHING;
    
    DELETE FROM processing_stages WHERE company_id IS NULL;
    
    ALTER TABLE processing_stages ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE processing_stages DROP CONSTRAINT IF EXISTS processing_stages_name_key;
    ALTER TABLE processing_stages ADD CONSTRAINT processing_stages_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_processing_stages_company ON processing_stages(company_id);
  END IF;
END $$;

-- =====================================================
-- 4. ADD COMPANY_ID TO WARRANTY_TYPES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_types' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE warranty_types ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO warranty_types (company_id, name, description, duration_months, is_default)
    SELECT c.id, wt.name, wt.description, wt.duration_months, wt.is_default
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, description, duration_months, is_default FROM warranty_types WHERE company_id IS NULL) wt
    ON CONFLICT DO NOTHING;
    
    DELETE FROM warranty_types WHERE company_id IS NULL;
    
    ALTER TABLE warranty_types ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE warranty_types DROP CONSTRAINT IF EXISTS warranty_types_name_key;
    ALTER TABLE warranty_types ADD CONSTRAINT warranty_types_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_warranty_types_company ON warranty_types(company_id);
  END IF;
END $$;

-- =====================================================
-- 5. ADD COMPANY_ID TO RETURN_REASONS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_reasons' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE return_reasons ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO return_reasons (company_id, reason, description, requires_approval)
    SELECT c.id, rr.reason, rr.description, rr.requires_approval
    FROM companies c
    CROSS JOIN (SELECT DISTINCT reason, description, requires_approval FROM return_reasons WHERE company_id IS NULL) rr
    ON CONFLICT DO NOTHING;
    
    DELETE FROM return_reasons WHERE company_id IS NULL;
    
    ALTER TABLE return_reasons ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE return_reasons DROP CONSTRAINT IF EXISTS return_reasons_reason_key;
    ALTER TABLE return_reasons ADD CONSTRAINT return_reasons_company_reason_key UNIQUE(company_id, reason);
    
    CREATE INDEX IF NOT EXISTS idx_return_reasons_company ON return_reasons(company_id);
  END IF;
END $$;

-- =====================================================
-- 6. ADD COMPANY_ID TO PAYMENT_TERMS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_terms' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE payment_terms ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO payment_terms (company_id, name, days, description)
    SELECT c.id, pt.name, pt.days, pt.description
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, days, description FROM payment_terms WHERE company_id IS NULL) pt
    ON CONFLICT DO NOTHING;
    
    DELETE FROM payment_terms WHERE company_id IS NULL;
    
    ALTER TABLE payment_terms ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE payment_terms DROP CONSTRAINT IF EXISTS payment_terms_name_key;
    ALTER TABLE payment_terms ADD CONSTRAINT payment_terms_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_payment_terms_company ON payment_terms(company_id);
  END IF;
END $$;

-- =====================================================
-- 7. ADD COMPANY_ID TO LEAD_SOURCES (CRM)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_sources' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE lead_sources ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO lead_sources (company_id, name, description)
    SELECT c.id, ls.name, ls.description
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, description FROM lead_sources WHERE company_id IS NULL) ls
    ON CONFLICT DO NOTHING;
    
    DELETE FROM lead_sources WHERE company_id IS NULL;
    
    ALTER TABLE lead_sources ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE lead_sources DROP CONSTRAINT IF EXISTS lead_sources_name_key;
    ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_lead_sources_company ON lead_sources(company_id);
  END IF;
END $$;

-- =====================================================
-- 8. ADD COMPANY_ID TO OPPORTUNITY_STAGES (CRM)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_stages' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE opportunity_stages ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    INSERT INTO opportunity_stages (company_id, name, description, probability, sort_order)
    SELECT c.id, os.name, os.description, os.probability, os.sort_order
    FROM companies c
    CROSS JOIN (SELECT DISTINCT name, description, probability, sort_order FROM opportunity_stages WHERE company_id IS NULL) os
    ON CONFLICT DO NOTHING;
    
    DELETE FROM opportunity_stages WHERE company_id IS NULL;
    
    ALTER TABLE opportunity_stages ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE opportunity_stages DROP CONSTRAINT IF EXISTS opportunity_stages_name_key;
    ALTER TABLE opportunity_stages ADD CONSTRAINT opportunity_stages_company_name_key UNIQUE(company_id, name);
    
    CREATE INDEX IF NOT EXISTS idx_opportunity_stages_company ON opportunity_stages(company_id);
  END IF;
END $$;

-- =====================================================
-- 9. UPDATE RLS POLICIES FOR COMPANY ISOLATION
-- =====================================================

-- Cosmetic Grades
DROP POLICY IF EXISTS "Users can view cosmetic grades in their company" ON cosmetic_grades;
DROP POLICY IF EXISTS "Admins can manage cosmetic grades" ON cosmetic_grades;

CREATE POLICY "Users can view cosmetic grades in their company"
  ON cosmetic_grades FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage cosmetic grades"
  ON cosmetic_grades FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Functional Statuses
DROP POLICY IF EXISTS "Users can view functional statuses in their company" ON functional_statuses;
DROP POLICY IF EXISTS "Admins can manage functional statuses" ON functional_statuses;

CREATE POLICY "Users can view functional statuses in their company"
  ON functional_statuses FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage functional statuses"
  ON functional_statuses FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Processing Stages
DROP POLICY IF EXISTS "Users can view processing stages in their company" ON processing_stages;
DROP POLICY IF EXISTS "Admins can manage processing stages" ON processing_stages;

CREATE POLICY "Users can view processing stages in their company"
  ON processing_stages FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage processing stages"
  ON processing_stages FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Warranty Types
DROP POLICY IF EXISTS "Users can view warranty types in their company" ON warranty_types;
DROP POLICY IF EXISTS "Admins can manage warranty types" ON warranty_types;

CREATE POLICY "Users can view warranty types in their company"
  ON warranty_types FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage warranty types"
  ON warranty_types FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Return Reasons
DROP POLICY IF EXISTS "Users can view return reasons in their company" ON return_reasons;
DROP POLICY IF EXISTS "Admins can manage return reasons" ON return_reasons;

CREATE POLICY "Users can view return reasons in their company"
  ON return_reasons FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage return reasons"
  ON return_reasons FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Payment Terms
DROP POLICY IF EXISTS "Users can view payment terms in their company" ON payment_terms;
DROP POLICY IF EXISTS "Admins can manage payment terms" ON payment_terms;

CREATE POLICY "Users can view payment terms in their company"
  ON payment_terms FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage payment terms"
  ON payment_terms FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Lead Sources
DROP POLICY IF EXISTS "Users can view lead sources in their company" ON lead_sources;
DROP POLICY IF EXISTS "Admins can manage lead sources" ON lead_sources;

CREATE POLICY "Users can view lead sources in their company"
  ON lead_sources FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage lead sources"
  ON lead_sources FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Opportunity Stages
DROP POLICY IF EXISTS "Users can view opportunity stages in their company" ON opportunity_stages;
DROP POLICY IF EXISTS "Admins can manage opportunity stages" ON opportunity_stages;

CREATE POLICY "Users can view opportunity stages in their company"
  ON opportunity_stages FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage opportunity stages"
  ON opportunity_stages FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
