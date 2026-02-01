/*
  # Create Recycling and Website Tables

  This migration creates tables for recycling enhancements and website/eCommerce engine.

  ## Tables Created
  1. recycling_shipments - Batch shipments to recyclers
  2. commodity_prices - Market rates for materials
  3. website_settings - Storefront configuration
  4. shopping_carts - Customer shopping carts
  5. documents - Universal document system

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
*/

-- Create recycling_shipments table
CREATE TABLE IF NOT EXISTS recycling_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  shipment_number text NOT NULL,
  downstream_vendor_id uuid REFERENCES downstream_vendors(id) NOT NULL,
  shipment_date date NOT NULL,
  total_weight_kg numeric(10,2),
  estimated_value numeric(12,2),
  actual_settlement numeric(12,2),
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, shipment_number)
);

-- Create commodity_prices table
CREATE TABLE IF NOT EXISTS commodity_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  material_type text NOT NULL,
  price_per_kg numeric(10,4),
  currency text DEFAULT 'USD',
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create website_settings table
CREATE TABLE IF NOT EXISTS website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL UNIQUE,
  site_name text,
  logo_url text,
  theme_color text DEFAULT '#3b82f6',
  policies jsonb,
  payment_methods jsonb,
  shipping_zones jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shopping_carts table
CREATE TABLE IF NOT EXISTS shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  customer_email text,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

-- Create universal documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  document_type text NOT NULL,
  document_number text NOT NULL,
  entity_type text,
  entity_id uuid,
  file_url text,
  status text DEFAULT 'draft',
  generated_by uuid REFERENCES profiles(id),
  generated_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb,
  UNIQUE(company_id, document_number)
);

-- Enable RLS
ALTER TABLE recycling_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recycling_shipments
CREATE POLICY "Users can view recycling shipments in their company"
  ON recycling_shipments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recycling shipments in their company"
  ON recycling_shipments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can update recycling shipments in their company"
  ON recycling_shipments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can delete recycling shipments in their company"
  ON recycling_shipments FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for commodity_prices
CREATE POLICY "Users can view commodity prices in their company"
  ON commodity_prices FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create commodity prices in their company"
  ON commodity_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can update commodity prices in their company"
  ON commodity_prices FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for website_settings
CREATE POLICY "Users can view website settings in their company"
  ON website_settings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage website settings"
  ON website_settings FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for shopping_carts (public access for anonymous users)
CREATE POLICY "Anyone can view their own shopping cart"
  ON shopping_carts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create a shopping cart"
  ON shopping_carts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own shopping cart"
  ON shopping_carts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their own shopping cart"
  ON shopping_carts FOR DELETE
  USING (true);

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in their company"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their company"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete documents in their company"
  ON documents FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recycling_shipments_company_id ON recycling_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_commodity_prices_company_id ON commodity_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_website_settings_company_id ON website_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_session_id ON shopping_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);