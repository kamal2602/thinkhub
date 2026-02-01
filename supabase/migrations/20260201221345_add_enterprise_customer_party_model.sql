/*
  # Enterprise Customer (Party) Model Enhancement
  
  1. Enhanced Customers Table (ADDITIVE)
    - Adds enterprise fields to existing customers table
    - legal_name, trade_name, entity_type
    - registration_number, tax_id, industry
    - website, status, billing details
    - payment_terms_id, credit_limit, currency
  
  2. New Contacts Table
    - id (uuid, primary key)
    - customer_id and supplier_id (support both)
    - full_name, email, phone, mobile
    - role, department
    - is_primary, is_billing, is_shipping flags
    - notes, timestamps
  
  3. New Addresses Table
    - id (uuid, primary key)
    - customer_id and supplier_id (support both)
    - address_type (billing, shipping, physical, registered)
    - is_primary flag
    - Full address fields with lat/long support
    - notes, timestamps
  
  4. Security
    - Enable RLS on new tables
    - Company-scoped access policies
    - Admin and user-level permissions
*/

-- =====================================================
-- 1. ENHANCE CUSTOMERS TABLE (ADDITIVE ONLY)
-- =====================================================

-- Add enterprise fields to customers table
DO $$
BEGIN
  -- Legal entity fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'legal_name') THEN
    ALTER TABLE customers ADD COLUMN legal_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'trade_name') THEN
    ALTER TABLE customers ADD COLUMN trade_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'entity_type') THEN
    ALTER TABLE customers ADD COLUMN entity_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'registration_number') THEN
    ALTER TABLE customers ADD COLUMN registration_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tax_id') THEN
    ALTER TABLE customers ADD COLUMN tax_id text;
  END IF;
  
  -- Business details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'industry') THEN
    ALTER TABLE customers ADD COLUMN industry text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'website') THEN
    ALTER TABLE customers ADD COLUMN website text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
    ALTER TABLE customers ADD COLUMN status text DEFAULT 'active';
  END IF;
  
  -- Commercial details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_email') THEN
    ALTER TABLE customers ADD COLUMN billing_email text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_phone') THEN
    ALTER TABLE customers ADD COLUMN billing_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'payment_terms_id') THEN
    ALTER TABLE customers ADD COLUMN payment_terms_id uuid REFERENCES payment_terms(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
    ALTER TABLE customers ADD COLUMN credit_limit numeric(15, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'currency') THEN
    ALTER TABLE customers ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

-- Add the same fields to suppliers for consistency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'legal_name') THEN
    ALTER TABLE suppliers ADD COLUMN legal_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'trade_name') THEN
    ALTER TABLE suppliers ADD COLUMN trade_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'entity_type') THEN
    ALTER TABLE suppliers ADD COLUMN entity_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'registration_number') THEN
    ALTER TABLE suppliers ADD COLUMN registration_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'tax_id') THEN
    ALTER TABLE suppliers ADD COLUMN tax_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'industry') THEN
    ALTER TABLE suppliers ADD COLUMN industry text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'website') THEN
    ALTER TABLE suppliers ADD COLUMN website text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'status') THEN
    ALTER TABLE suppliers ADD COLUMN status text DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'payment_terms_id') THEN
    ALTER TABLE suppliers ADD COLUMN payment_terms_id uuid REFERENCES payment_terms(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'currency') THEN
    ALTER TABLE suppliers ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

-- =====================================================
-- 2. CREATE CONTACTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Contact details
  full_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  
  -- Role information
  role text,
  department text,
  
  -- Flags
  is_primary boolean DEFAULT false,
  is_billing boolean DEFAULT false,
  is_shipping boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Additional info
  notes text,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT contact_must_belong_to_customer_or_supplier 
    CHECK (customer_id IS NOT NULL OR supplier_id IS NOT NULL)
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_supplier ON contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts in their company"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts in their company"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their company"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their company"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 3. CREATE ADDRESSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Address type and flags
  address_type text NOT NULL, -- billing, shipping, physical, registered
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Address details
  address_line1 text NOT NULL,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text DEFAULT 'US',
  
  -- Geo coordinates (for route optimization, etc)
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  
  -- Additional info
  notes text,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT address_must_belong_to_customer_or_supplier 
    CHECK (customer_id IS NOT NULL OR supplier_id IS NOT NULL)
);

-- Indexes for addresses
CREATE INDEX IF NOT EXISTS idx_addresses_company ON addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_supplier ON addresses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_addresses_is_primary ON addresses(is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addresses
CREATE POLICY "Users can view addresses in their company"
  ON addresses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create addresses in their company"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update addresses in their company"
  ON addresses FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete addresses in their company"
  ON addresses FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 4. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. HELPFUL VIEWS
-- =====================================================

-- View for customer primary contact
CREATE OR REPLACE VIEW customer_primary_contacts AS
SELECT 
  c.customer_id,
  c.full_name,
  c.email,
  c.phone,
  c.mobile,
  c.role
FROM contacts c
WHERE c.is_primary = true AND c.customer_id IS NOT NULL;

-- View for customer primary address
CREATE OR REPLACE VIEW customer_primary_addresses AS
SELECT 
  a.customer_id,
  a.address_type,
  a.address_line1,
  a.address_line2,
  a.city,
  a.state_province,
  a.postal_code,
  a.country
FROM addresses a
WHERE a.is_primary = true AND a.customer_id IS NOT NULL;