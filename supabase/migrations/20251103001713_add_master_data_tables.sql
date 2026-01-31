/*
  # Master Data Tables for Settings

  ## Overview
  Creates customizable master data tables for Settings section to improve flexibility
  and allow users to configure their own reference data instead of hardcoded values.

  ## New Tables

  1. **asset_statuses**
     - Customizable asset statuses (replaces hardcoded CHECK constraints)
     - Examples: In Stock, Refurbishment, Listed, Reserved, Sold, RMA
     - Allows companies to add their own custom statuses

  2. **cosmetic_grades**
     - Customizable cosmetic condition grades
     - Examples: A, B, C, For Parts, Pristine, Good, Fair
     - Each company can define their own grading system

  3. **functional_statuses**
     - Customizable functional condition statuses
     - Examples: Fully Working, Minor Issues, Major Issues, For Parts
     - Flexible functionality descriptions

  4. **payment_terms**
     - Payment terms for invoices
     - Examples: Net 30, Net 60, COD, Due on Receipt, Net 90
     - Can include custom terms and descriptions

  5. **return_reasons**
     - Common return/RMA reasons
     - Examples: DOA, Customer Changed Mind, Defective, Wrong Item
     - Helps standardize return processing

  6. **warranty_types**
     - Warranty type definitions
     - Examples: Manufacturer, Extended, In-house, None
     - Track different warranty options

  7. **invoice_templates**
     - Saved invoice templates for quick creation
     - Store frequently used invoice configurations
     - Speed up recurring orders

  ## Changes to Existing Tables

  - Assets table constraints will be relaxed in future migration
  - Payment terms will be added to sales invoices

  ## Security
  - RLS enabled on all tables
  - Company-based access control
  - Staff and above can manage master data
  - All users can view master data in their company
*/

-- Asset Statuses (customizable)
CREATE TABLE IF NOT EXISTS asset_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  is_default boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE asset_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset statuses in their companies"
  ON asset_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = asset_statuses.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage asset statuses"
  ON asset_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = asset_statuses.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Cosmetic Grades (customizable)
CREATE TABLE IF NOT EXISTS cosmetic_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  grade text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, grade)
);

ALTER TABLE cosmetic_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cosmetic grades in their companies"
  ON cosmetic_grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = cosmetic_grades.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage cosmetic grades"
  ON cosmetic_grades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = cosmetic_grades.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Functional Statuses (customizable)
CREATE TABLE IF NOT EXISTS functional_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, status)
);

ALTER TABLE functional_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view functional statuses in their companies"
  ON functional_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = functional_statuses.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage functional statuses"
  ON functional_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = functional_statuses.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Payment Terms
CREATE TABLE IF NOT EXISTS payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  days int NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment terms in their companies"
  ON payment_terms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = payment_terms.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage payment terms"
  ON payment_terms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = payment_terms.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Return Reasons
CREATE TABLE IF NOT EXISTS return_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  description text,
  requires_approval boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, reason)
);

ALTER TABLE return_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view return reasons in their companies"
  ON return_reasons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = return_reasons.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage return reasons"
  ON return_reasons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = return_reasons.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Warranty Types
CREATE TABLE IF NOT EXISTS warranty_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  default_months int DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE warranty_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warranty types in their companies"
  ON warranty_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = warranty_types.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage warranty types"
  ON warranty_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = warranty_types.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Invoice Templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  payment_terms_id uuid REFERENCES payment_terms(id) ON DELETE SET NULL,
  notes text,
  template_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice templates in their companies"
  ON invoice_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = invoice_templates.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage invoice templates"
  ON invoice_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = invoice_templates.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Add payment_terms_id to sales_invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'payment_terms_id'
  ) THEN
    ALTER TABLE sales_invoices ADD COLUMN payment_terms_id uuid REFERENCES payment_terms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add payment_due_date to sales_invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'payment_due_date'
  ) THEN
    ALTER TABLE sales_invoices ADD COLUMN payment_due_date date;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_statuses_company ON asset_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_cosmetic_grades_company ON cosmetic_grades(company_id);
CREATE INDEX IF NOT EXISTS idx_functional_statuses_company ON functional_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_company ON payment_terms(company_id);
CREATE INDEX IF NOT EXISTS idx_return_reasons_company ON return_reasons(company_id);
CREATE INDEX IF NOT EXISTS idx_warranty_types_company ON warranty_types(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_company ON invoice_templates(company_id);

-- Insert default asset statuses
INSERT INTO asset_statuses (company_id, name, description, color, sort_order)
SELECT 
  c.id,
  status_data.name,
  status_data.description,
  status_data.color,
  status_data.sort_order
FROM companies c
CROSS JOIN (
  VALUES
    ('In Stock', 'Asset is in warehouse/storage', '#10B981', 1),
    ('Refurbishment', 'Asset is being refurbished', '#F59E0B', 2),
    ('Listed', 'Asset is listed for sale', '#3B82F6', 3),
    ('Reserved', 'Asset is reserved for customer', '#8B5CF6', 4),
    ('Sold', 'Asset has been sold', '#6B7280', 5),
    ('RMA', 'Asset is under RMA process', '#EF4444', 6)
) AS status_data(name, description, color, sort_order)
ON CONFLICT (company_id, name) DO NOTHING;

-- Insert default cosmetic grades
INSERT INTO cosmetic_grades (company_id, grade, description, sort_order)
SELECT 
  c.id,
  grade_data.grade,
  grade_data.description,
  grade_data.sort_order
FROM companies c
CROSS JOIN (
  VALUES
    ('A', 'Excellent condition, minimal wear', 1),
    ('B', 'Good condition, minor cosmetic wear', 2),
    ('C', 'Fair condition, visible wear and tear', 3),
    ('For Parts', 'Not suitable for resale as-is', 4)
) AS grade_data(grade, description, sort_order)
ON CONFLICT (company_id, grade) DO NOTHING;

-- Insert default functional statuses
INSERT INTO functional_statuses (company_id, status, description, sort_order)
SELECT 
  c.id,
  status_data.status,
  status_data.description,
  status_data.sort_order
FROM companies c
CROSS JOIN (
  VALUES
    ('Fully Working', 'All functions tested and working', 1),
    ('Minor Issues', 'Minor functional issues present', 2),
    ('For Parts', 'Not functional, for parts only', 3)
) AS status_data(status, description, sort_order)
ON CONFLICT (company_id, status) DO NOTHING;

-- Insert default payment terms
INSERT INTO payment_terms (company_id, name, days, description, is_default)
SELECT 
  c.id,
  terms_data.name,
  terms_data.days,
  terms_data.description,
  terms_data.is_default
FROM companies c
CROSS JOIN (
  VALUES
    ('Due on Receipt', 0, 'Payment due immediately', true),
    ('Net 15', 15, 'Payment due within 15 days', false),
    ('Net 30', 30, 'Payment due within 30 days', false),
    ('Net 60', 60, 'Payment due within 60 days', false),
    ('Net 90', 90, 'Payment due within 90 days', false),
    ('COD', 0, 'Cash on delivery', false)
) AS terms_data(name, days, description, is_default)
ON CONFLICT (company_id, name) DO NOTHING;

-- Insert default return reasons
INSERT INTO return_reasons (company_id, reason, description, requires_approval, sort_order)
SELECT 
  c.id,
  reason_data.reason,
  reason_data.description,
  reason_data.requires_approval,
  reason_data.sort_order
FROM companies c
CROSS JOIN (
  VALUES
    ('DOA', 'Dead on arrival', false, 1),
    ('Defective', 'Product is defective or not working', false, 2),
    ('Wrong Item', 'Wrong item was shipped', false, 3),
    ('Customer Changed Mind', 'Customer no longer wants the item', true, 4),
    ('Damaged in Transit', 'Item was damaged during shipping', false, 5),
    ('Not as Described', 'Item does not match description', false, 6)
) AS reason_data(reason, description, requires_approval, sort_order)
ON CONFLICT (company_id, reason) DO NOTHING;

-- Insert default warranty types
INSERT INTO warranty_types (company_id, name, default_months, description)
SELECT 
  c.id,
  warranty_data.name,
  warranty_data.default_months,
  warranty_data.description
FROM companies c
CROSS JOIN (
  VALUES
    ('None', 0, 'No warranty provided'),
    ('30 Day In-house', 1, '30 day in-house warranty'),
    ('90 Day In-house', 3, '90 day in-house warranty'),
    ('6 Month In-house', 6, '6 month in-house warranty'),
    ('1 Year In-house', 12, '1 year in-house warranty'),
    ('Manufacturer', 12, 'Original manufacturer warranty')
) AS warranty_data(name, default_months, description)
ON CONFLICT (company_id, name) DO NOTHING;
