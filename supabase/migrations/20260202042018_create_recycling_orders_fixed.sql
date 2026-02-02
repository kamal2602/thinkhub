/*
  # Create Recycling Orders Table

  1. New Table: recycling_orders
    - `id` (uuid, primary key)
    - `company_id` (uuid, references companies)
    - `order_number` (text, unique per company)
    - `contact_id` (uuid, references contacts) - the client
    - `order_date` (date)
    - `processing_intent` ('recycle_only' or 'hybrid_resale')
    - `status` ('pending', 'in_progress', 'completed', 'cancelled')
    - `total_weight` (numeric) - actual weight received
    - `expected_weight` (numeric) - expected weight from manifest
    - `notes` (text)
    - `created_at`, `updated_at`

  2. Purpose
    - Support recycling workflow distinct from purchase orders
    - Enable category/weight-based intake
    - Support India hybrid model (resale if possible, else recycle)

  3. Security
    - Enable RLS
    - Company-scoped access
*/

CREATE TABLE IF NOT EXISTS recycling_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  processing_intent text DEFAULT 'recycle_only' CHECK (processing_intent IN ('recycle_only', 'hybrid_resale')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  expected_weight numeric(10,2),
  total_weight numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, order_number)
);

-- RLS
ALTER TABLE recycling_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recycling orders in their company"
  ON recycling_orders FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recycling orders in their company"
  ON recycling_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recycling orders in their company"
  ON recycling_orders FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recycling orders in their company"
  ON recycling_orders FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recycling_orders_company 
  ON recycling_orders(company_id);

CREATE INDEX IF NOT EXISTS idx_recycling_orders_contact 
  ON recycling_orders(contact_id);

CREATE INDEX IF NOT EXISTS idx_recycling_orders_status 
  ON recycling_orders(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_recycling_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recycling_orders_updated_at
  BEFORE UPDATE ON recycling_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_recycling_orders_updated_at();
