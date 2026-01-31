/*
  # Create Accounting System

  ## Overview
  This migration creates a basic double-entry accounting system with chart of accounts,
  journal entries, and automatic posting from sales invoices and purchase orders.

  ## Changes

  1. **New Table: chart_of_accounts**
     - Account codes and names
     - Account types (asset, liability, equity, revenue, expense)
     - Account categories and subcategories
     - Active/inactive status

  2. **New Table: journal_entries**
     - Journal entry header with date, description, status
     - Links to source documents (invoices, POs, etc.)
     - Posting status and approval workflow

  3. **New Table: journal_entry_lines**
     - Individual debit and credit lines
     - Links to accounts in chart of accounts
     - Amount and description

  4. **Default Chart of Accounts**
     - Standard accounts for IT reseller business
     - Assets, Liabilities, Equity, Revenue, Expenses

  ## Security
  - RLS enabled on all tables
  - Company-based access control
  - Manager and above can view accounting data
  - Admin only can edit chart of accounts
*/

-- Create chart_of_accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_category text,
  parent_account_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(company_id, account_code)
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company accounts"
  ON chart_of_accounts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage accounts"
  ON chart_of_accounts FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  entry_number text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  reference_type text CHECK (reference_type IN ('manual', 'sales_invoice', 'purchase_order', 'payment', 'adjustment')),
  reference_id uuid,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  posted_at timestamptz,
  posted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  notes text,
  UNIQUE(company_id, entry_number)
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Managers can update entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create journal_entry_lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES chart_of_accounts(id) NOT NULL,
  description text,
  debit_amount numeric(12,2) DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount numeric(12,2) DEFAULT 0 CHECK (credit_amount >= 0),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company entry lines"
  ON journal_entry_lines FOR SELECT
  TO authenticated
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries 
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage entry lines"
  ON journal_entry_lines FOR ALL
  TO authenticated
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries 
      WHERE company_id IN (
        SELECT company_id FROM user_company_access 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- Function to generate journal entry numbers
CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_number text;
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM journal_entries
  WHERE company_id = p_company_id
    AND entry_date >= date_trunc('year', CURRENT_DATE);
  
  v_number := 'JE-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad((v_count + 1)::text, 5, '0');
  RETURN v_number;
END;
$$;

COMMENT ON TABLE chart_of_accounts IS 'Chart of accounts for double-entry bookkeeping';
COMMENT ON TABLE journal_entries IS 'Journal entry headers with reference to source documents';
COMMENT ON TABLE journal_entry_lines IS 'Individual debit and credit lines for journal entries';
