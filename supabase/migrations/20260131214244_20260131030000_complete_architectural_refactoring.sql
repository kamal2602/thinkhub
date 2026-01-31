/*
  # Complete Architectural Refactoring

  ## Overview
  This migration implements a comprehensive architectural overhaul to properly separate:
  - Buyer vs Vendor relationships
  - Purchase receiving vs ITAD intake workflows
  - Direct sales vs Auction sales
  - Component cost allocation and disposition tracking
  - ITAD revenue settlement financial tracking

  ## Changes

  ### 1. Entity Types System (Master Data)
    - `entity_types` - Master data for all business relationship types
    - Replaces hardcoded CHECK constraints with flexible configuration

  ### 2. Receiving Workflow Separation
    - Add `intake_type` to `receiving_logs` to distinguish flows
    - Add constraints to enforce data integrity
    - Link collection_requests to receiving

  ### 3. ITAD Revenue Settlement System
    - `itad_revenue_settlements` - Financial transaction records
    - `itad_intakes` - Explicit ITAD receiving workflow
    - Tracks actual payouts vs configured percentages

  ### 4. Component Cost Allocation System
    - `component_harvesting` - Tracks when assets are disassembled
    - `component_harvesting_items` - Explicit cost allocation per component
    - Add `disposition` to component_sales for semantic clarity

  ### 5. Auction System
    - `auction_houses` - Auction platforms (eBay, TeraPeak, etc)
    - `auction_events` - Scheduled auction dates
    - `auction_lots` - Batches of items for sale
    - `auction_lot_items` - Individual assets/components in lots
    - `bids` - Bid history tracking
    - `auction_settlements` - Final sale records with commission

  ### 6. Buyer Accounts
    - `buyer_accounts` - Separate table for auction buyers
    - Links to customers for known buyers, standalone for anonymous

  ### 7. Updates to Existing Tables
    - Add fields to support new workflows
    - Maintain backward compatibility where possible

  ## Security
    - All tables have RLS enabled
    - Policies restrict access to company_id
    - Admin users can manage all data
*/

-- =====================================================
-- 1. ENTITY TYPES SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  entity_class text NOT NULL CHECK (entity_class IN ('customer', 'supplier', 'vendor', 'partner')),
  business_type text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, entity_class, business_type)
);

ALTER TABLE entity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entity types in their company"
  ON entity_types FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage entity types"
  ON entity_types FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE entity_types IS 'Master data for business relationship types. Replaces hardcoded CHECK constraints.';

-- =====================================================
-- 2. RECEIVING WORKFLOW SEPARATION
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receiving_logs' AND column_name = 'intake_type'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN intake_type text NOT NULL DEFAULT 'purchase_order';
  END IF;
END $$;

ALTER TABLE receiving_logs
  DROP CONSTRAINT IF EXISTS receiving_logs_intake_type_check,
  ADD CONSTRAINT receiving_logs_intake_type_check
  CHECK (intake_type IN ('purchase_order', 'itad_intake', 'return', 'transfer', 'other'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receiving_logs' AND column_name = 'itad_project_id'
  ) THEN
    ALTER TABLE receiving_logs ADD COLUMN itad_project_id uuid REFERENCES itad_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN receiving_logs.intake_type IS
  'Distinguishes receiving flows: purchase_order (buying from supplier), itad_intake (customer sends equipment), return (RMA), transfer (inter-location)';

-- =====================================================
-- 3. ITAD INTAKE WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS itad_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  collection_request_id uuid REFERENCES collection_requests(id) ON DELETE SET NULL,
  itad_project_id uuid NOT NULL REFERENCES itad_projects(id) ON DELETE CASCADE,

  expected_quantity int DEFAULT 0,
  actual_quantity int DEFAULT 0,
  discrepancy_quantity int GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,

  scheduled_date date,
  intake_date date,
  completed_date timestamptz,

  receiving_log_id uuid REFERENCES receiving_logs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_transit', 'received', 'staged', 'assets_created', 'completed', 'cancelled')),

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE itad_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view intakes in their company"
  ON itad_intakes FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage intakes in their company"
  ON itad_intakes FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_itad_intakes_company ON itad_intakes(company_id);
CREATE INDEX IF NOT EXISTS idx_itad_intakes_project ON itad_intakes(itad_project_id);
CREATE INDEX IF NOT EXISTS idx_itad_intakes_status ON itad_intakes(status);

-- =====================================================
-- 4. ITAD REVENUE SETTLEMENT SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS itad_revenue_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  itad_project_id uuid NOT NULL REFERENCES itad_projects(id) ON DELETE CASCADE,

  settlement_period_start date,
  settlement_period_end date,
  settlement_date date NOT NULL,

  total_assets_received int DEFAULT 0,
  total_assets_refurbished int DEFAULT 0,
  total_assets_harvested int DEFAULT 0,
  total_assets_scrapped int DEFAULT 0,
  total_components_harvested int DEFAULT 0,

  refurbished_device_revenue decimal(15,2) DEFAULT 0,
  component_revenue decimal(15,2) DEFAULT 0,
  scrap_value decimal(15,2) DEFAULT 0,
  other_revenue decimal(15,2) DEFAULT 0,

  total_gross_revenue decimal(15,2) GENERATED ALWAYS AS (
    COALESCE(refurbished_device_revenue, 0) +
    COALESCE(component_revenue, 0) +
    COALESCE(scrap_value, 0) +
    COALESCE(other_revenue, 0)
  ) STORED,

  service_fee_amount decimal(15,2) DEFAULT 0,
  service_fee_percentage decimal(5,2),

  revenue_share_percentage decimal(5,2),
  revenue_share_threshold decimal(15,2) DEFAULT 0,

  revenue_subject_to_sharing decimal(15,2),
  customer_revenue_share decimal(15,2),
  our_net_revenue decimal(15,2),

  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  payment_date date,
  payment_method text,
  payment_reference text,

  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE itad_revenue_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settlements in their company"
  ON itad_revenue_settlements FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage settlements"
  ON itad_revenue_settlements FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_itad_settlements_company ON itad_revenue_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_itad_settlements_project ON itad_revenue_settlements(itad_project_id);
CREATE INDEX IF NOT EXISTS idx_itad_settlements_status ON itad_revenue_settlements(payment_status);

-- =====================================================
-- 5. COMPONENT COST ALLOCATION SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS component_harvesting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  source_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  source_purchase_lot_id uuid REFERENCES purchase_lots(id) ON DELETE SET NULL,

  total_asset_cost decimal(15,2) NOT NULL DEFAULT 0,
  total_refurb_cost decimal(15,2) DEFAULT 0,
  total_cost_to_allocate decimal(15,2) GENERATED ALWAYS AS (
    COALESCE(total_asset_cost, 0) + COALESCE(total_refurb_cost, 0)
  ) STORED,

  allocation_method text NOT NULL DEFAULT 'manual'
    CHECK (allocation_method IN ('manual', 'equal_split', 'by_weight', 'by_market_value', 'by_percentage')),

  harvest_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_date timestamptz,

  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'cancelled')),

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE component_harvesting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view harvesting in their company"
  ON component_harvesting FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage harvesting in their company"
  ON component_harvesting FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_component_harvesting_company ON component_harvesting(company_id);
CREATE INDEX IF NOT EXISTS idx_component_harvesting_asset ON component_harvesting(source_asset_id);

CREATE TABLE IF NOT EXISTS component_harvesting_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  harvesting_id uuid NOT NULL REFERENCES component_harvesting(id) ON DELETE CASCADE,

  component_id uuid NOT NULL REFERENCES harvested_components_inventory(id) ON DELETE CASCADE,

  allocated_cost decimal(15,2) NOT NULL DEFAULT 0,
  allocated_percentage decimal(5,2),

  market_value_at_harvest decimal(15,2),
  weight_kg decimal(10,3),

  notes text,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE component_harvesting_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view harvesting items in their company"
  ON component_harvesting_items FOR SELECT
  TO authenticated
  USING (
    harvesting_id IN (
      SELECT id FROM component_harvesting
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage harvesting items in their company"
  ON component_harvesting_items FOR ALL
  TO authenticated
  USING (
    harvesting_id IN (
      SELECT id FROM component_harvesting
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    harvesting_id IN (
      SELECT id FROM component_harvesting
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_harvesting_items_harvesting ON component_harvesting_items(harvesting_id);
CREATE INDEX IF NOT EXISTS idx_harvesting_items_component ON component_harvesting_items(component_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'component_sales' AND column_name = 'disposition'
  ) THEN
    ALTER TABLE component_sales ADD COLUMN disposition text NOT NULL DEFAULT 'sale';
  END IF;
END $$;

ALTER TABLE component_sales
  DROP CONSTRAINT IF EXISTS component_sales_disposition_check,
  ADD CONSTRAINT component_sales_disposition_check
  CHECK (disposition IN ('sale', 'internal_transfer', 'installed', 'scrap', 'donation', 'warranty_replacement'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'component_sales' AND column_name = 'harvesting_item_id'
  ) THEN
    ALTER TABLE component_sales ADD COLUMN harvesting_item_id uuid REFERENCES component_harvesting_items(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN component_sales.disposition IS
  'sale: sold to external customer | internal_transfer: moved between locations | installed: used in refurbished unit | scrap: sent to recycler | donation: donated | warranty_replacement: used for RMA';

-- =====================================================
-- 6. AUCTION SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS auction_houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name text NOT NULL,
  auction_type text NOT NULL CHECK (auction_type IN ('ebay', 'terapeak', 'catawiki', 'bring_a_trailer', 'live_auction', 'other')),

  contact_name text,
  contact_email text,
  contact_phone text,
  website text,

  commission_rate decimal(5,2),
  buyer_premium_rate decimal(5,2),
  listing_fee decimal(10,2),
  payment_terms text,

  api_enabled boolean DEFAULT false,
  api_key text,
  api_endpoint text,

  is_active boolean DEFAULT true,
  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE auction_houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction houses in their company"
  ON auction_houses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage auction houses"
  ON auction_houses FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_houses_company ON auction_houses(company_id);

CREATE TABLE IF NOT EXISTS auction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auction_house_id uuid NOT NULL REFERENCES auction_houses(id) ON DELETE CASCADE,

  event_name text NOT NULL,
  event_number text,

  start_date timestamptz NOT NULL,
  end_date timestamptz,
  preview_start_date timestamptz,

  location_type text CHECK (location_type IN ('online', 'physical', 'hybrid')),
  physical_address text,

  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'preview', 'live', 'closed', 'settled', 'cancelled')),

  total_lots int DEFAULT 0,
  total_items int DEFAULT 0,
  lots_sold int DEFAULT 0,
  total_hammer_price decimal(15,2) DEFAULT 0,
  total_commission decimal(15,2) DEFAULT 0,

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE auction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction events in their company"
  ON auction_events FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage auction events in their company"
  ON auction_events FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_events_company ON auction_events(company_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_house ON auction_events(auction_house_id);

CREATE TABLE IF NOT EXISTS auction_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auction_event_id uuid NOT NULL REFERENCES auction_events(id) ON DELETE CASCADE,

  lot_number text NOT NULL,
  title text NOT NULL,
  description text,

  category text,
  subcategory text,

  starting_price decimal(15,2),
  reserve_price decimal(15,2),
  estimate_low decimal(15,2),
  estimate_high decimal(15,2),

  hammer_price decimal(15,2),
  buyer_premium decimal(15,2),
  total_price decimal(15,2),

  commission_rate decimal(5,2),
  commission_amount decimal(15,2),
  net_proceeds decimal(15,2),

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'listed', 'live', 'sold', 'unsold', 'passed', 'withdrawn')),

  items_count int DEFAULT 0,
  total_weight_kg decimal(10,2),

  image_urls text[],
  video_url text,

  current_bid decimal(15,2),
  bid_count int DEFAULT 0,

  lot_order int,
  start_time timestamptz,
  end_time timestamptz,

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(auction_event_id, lot_number)
);

ALTER TABLE auction_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction lots in their company"
  ON auction_lots FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage auction lots in their company"
  ON auction_lots FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_lots_company ON auction_lots(company_id);
CREATE INDEX IF NOT EXISTS idx_auction_lots_event ON auction_lots(auction_event_id);
CREATE INDEX IF NOT EXISTS idx_auction_lots_status ON auction_lots(status);

CREATE TABLE IF NOT EXISTS auction_lot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_lot_id uuid NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,

  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  component_id uuid REFERENCES harvested_components_inventory(id) ON DELETE CASCADE,

  cost_basis decimal(15,2),

  quantity int DEFAULT 1,
  description text,

  notes text,

  created_at timestamptz DEFAULT now(),

  CONSTRAINT exactly_one_item_type CHECK (
    (asset_id IS NOT NULL AND component_id IS NULL) OR
    (asset_id IS NULL AND component_id IS NOT NULL)
  )
);

ALTER TABLE auction_lot_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction lot items in their company"
  ON auction_lot_items FOR SELECT
  TO authenticated
  USING (
    auction_lot_id IN (
      SELECT id FROM auction_lots
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage auction lot items in their company"
  ON auction_lot_items FOR ALL
  TO authenticated
  USING (
    auction_lot_id IN (
      SELECT id FROM auction_lots
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auction_lot_id IN (
      SELECT id FROM auction_lots
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_lot_items_lot ON auction_lot_items(auction_lot_id);
CREATE INDEX IF NOT EXISTS idx_auction_lot_items_asset ON auction_lot_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_auction_lot_items_component ON auction_lot_items(component_id);

CREATE TABLE IF NOT EXISTS buyer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,

  buyer_number text NOT NULL,
  buyer_name text NOT NULL,
  buyer_type text CHECK (buyer_type IN ('individual', 'business', 'dealer', 'anonymous')),

  email text,
  phone text,
  address text,

  credit_limit decimal(15,2),
  payment_terms text,

  total_purchases int DEFAULT 0,
  total_spent decimal(15,2) DEFAULT 0,

  is_active boolean DEFAULT true,
  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(company_id, buyer_number)
);

ALTER TABLE buyer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view buyer accounts in their company"
  ON buyer_accounts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage buyer accounts in their company"
  ON buyer_accounts FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_buyer_accounts_company ON buyer_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_buyer_accounts_customer ON buyer_accounts(customer_id);

CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auction_lot_id uuid NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
  buyer_account_id uuid REFERENCES buyer_accounts(id) ON DELETE SET NULL,

  bid_amount decimal(15,2) NOT NULL,
  max_bid_amount decimal(15,2),

  bid_type text CHECK (bid_type IN ('standard', 'proxy', 'autobid', 'phone', 'absentee')),

  is_winning boolean DEFAULT false,
  is_retracted boolean DEFAULT false,

  bid_time timestamptz NOT NULL DEFAULT now(),

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bids in their company"
  ON bids FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage bids in their company"
  ON bids FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_bids_company ON bids(company_id);
CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(auction_lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_buyer ON bids(buyer_account_id);
CREATE INDEX IF NOT EXISTS idx_bids_winning ON bids(is_winning) WHERE is_winning = true;

CREATE TABLE IF NOT EXISTS auction_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auction_lot_id uuid NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,

  buyer_account_id uuid REFERENCES buyer_accounts(id) ON DELETE SET NULL,

  hammer_price decimal(15,2) NOT NULL,
  buyer_premium decimal(15,2) DEFAULT 0,
  total_sale_price decimal(15,2) NOT NULL,

  total_cost_basis decimal(15,2) NOT NULL DEFAULT 0,
  auction_commission decimal(15,2) DEFAULT 0,
  listing_fees decimal(15,2) DEFAULT 0,
  other_fees decimal(15,2) DEFAULT 0,
  total_costs decimal(15,2) GENERATED ALWAYS AS (
    COALESCE(total_cost_basis, 0) +
    COALESCE(auction_commission, 0) +
    COALESCE(listing_fees, 0) +
    COALESCE(other_fees, 0)
  ) STORED,

  gross_proceeds decimal(15,2) GENERATED ALWAYS AS (
    COALESCE(hammer_price, 0) - COALESCE(auction_commission, 0) - COALESCE(listing_fees, 0) - COALESCE(other_fees, 0)
  ) STORED,
  net_profit decimal(15,2) GENERATED ALWAYS AS (
    COALESCE(hammer_price, 0) - COALESCE(auction_commission, 0) - COALESCE(listing_fees, 0) - COALESCE(other_fees, 0) - COALESCE(total_cost_basis, 0)
  ) STORED,
  profit_margin decimal(5,2),

  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue', 'defaulted')),
  payment_date date,
  payment_method text,

  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE SET NULL,

  settlement_date date NOT NULL DEFAULT CURRENT_DATE,

  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE auction_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction settlements in their company"
  ON auction_settlements FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage auction settlements in their company"
  ON auction_settlements FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_settlements_company ON auction_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_auction_settlements_lot ON auction_settlements(auction_lot_id);
CREATE INDEX IF NOT EXISTS idx_auction_settlements_buyer ON auction_settlements(buyer_account_id);

-- =====================================================
-- 7. UPDATES TO EXISTING TABLES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'entity_type_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN entity_type_id uuid REFERENCES entity_types(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'entity_type_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN entity_type_id uuid REFERENCES entity_types(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'auction_lot_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN auction_lot_id uuid REFERENCES auction_lots(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'sales_channel'
  ) THEN
    ALTER TABLE sales_invoices ADD COLUMN sales_channel text DEFAULT 'direct';
  END IF;
END $$;

ALTER TABLE sales_invoices
  DROP CONSTRAINT IF EXISTS sales_invoices_sales_channel_check,
  ADD CONSTRAINT sales_invoices_sales_channel_check
  CHECK (sales_channel IN ('direct', 'auction', 'marketplace', 'wholesale', 'consignment', 'other'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'auction_settlement_id'
  ) THEN
    ALTER TABLE sales_invoices ADD COLUMN auction_settlement_id uuid REFERENCES auction_settlements(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 8. HELPER FUNCTIONS AND TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_auction_lot_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auction_lots
  SET items_count = (
    SELECT COUNT(*) FROM auction_lot_items WHERE auction_lot_id = COALESCE(NEW.auction_lot_id, OLD.auction_lot_id)
  )
  WHERE id = COALESCE(NEW.auction_lot_id, OLD.auction_lot_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_auction_lot_counts ON auction_lot_items;
CREATE TRIGGER trigger_update_auction_lot_counts
  AFTER INSERT OR DELETE ON auction_lot_items
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_lot_counts();

CREATE OR REPLACE FUNCTION update_auction_event_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auction_events
  SET
    total_lots = (SELECT COUNT(*) FROM auction_lots WHERE auction_event_id = NEW.auction_event_id),
    lots_sold = (SELECT COUNT(*) FROM auction_lots WHERE auction_event_id = NEW.auction_event_id AND status = 'sold'),
    total_hammer_price = (SELECT COALESCE(SUM(hammer_price), 0) FROM auction_lots WHERE auction_event_id = NEW.auction_event_id),
    total_commission = (SELECT COALESCE(SUM(commission_amount), 0) FROM auction_lots WHERE auction_event_id = NEW.auction_event_id)
  WHERE id = NEW.auction_event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_auction_event_totals ON auction_lots;
CREATE TRIGGER trigger_update_auction_event_totals
  AFTER INSERT OR UPDATE ON auction_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_event_totals();