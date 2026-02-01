/*
  # Sales Orders & Auction Alignment - Core Commitment Layer

  ## Summary
  Implements the sales order commitment layer and aligns auction engine to core architecture.
  Follows strict authority chain: purchase_lot → inventory_item → auction → sales_order_line → invoice

  ## Phase 1: Core Commitment Layer (Sales Orders)
  
  ### New Tables
  
  #### `sales_orders`
  - Core commitment layer between auction/cart and invoices
  - Represents customer commitment to purchase
  - Source engine tracking (auction, reseller, website)
  - Enables order → invoice separation (commitment vs billing)
  
  #### `sales_order_lines`
  - Individual line items in sales order
  - References inventory_items (catalog authority)
  - Optional asset_id for serialized items
  - Tracks cost_price for margin calculation
  
  ## Phase 2: Auction Inventory Junction
  
  #### `auction_inventory_items`
  - Replaces auction_lot_items (which referenced assets directly)
  - References inventory_items instead of assets
  - Supports mixing inventory from multiple purchase_lots
  - Quantity-aware for bulk items
  
  ## Phase 3: Deprecate Parallel Truth
  - Mark financial fields in auction_lots as deprecated
  - Block writes to auction_lot_items (preserve legacy data)
  - All financial truth flows through orders/invoices only
  
  ## Phase 4: Inventory Locking
  - Adds locked_by and locked_at to inventory_items
  - Prevents double-booking during live auctions
  - Locks transfer from auction → order → invoice
  
  ## Security
  - RLS enabled on all tables
  - Company isolation enforced
  - Authenticated users only
  
  ## Important Notes
  - NO data deletion - all legacy tables preserved
  - Additive only - existing flows continue working
  - New flows use new tables, old flows use legacy tables
*/

-- ============================================================================
-- PHASE 1: SALES ORDERS (Core Commitment Layer)
-- ============================================================================

-- Sales Orders: Commitment before billing
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  
  order_number text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'fulfilled', 'cancelled')),
  
  -- Source tracking (which engine created this order)
  source_engine text CHECK (source_engine IN ('auction', 'reseller', 'website', 'direct', 'itad')),
  source_id uuid, -- FK to auction_lot, website_order, etc.
  
  -- Totals (calculated from lines)
  subtotal_amount numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  shipping_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  
  -- Cost tracking (for margin analysis)
  total_cost_amount numeric(15,2) DEFAULT 0,
  
  currency text DEFAULT 'USD',
  
  notes text,
  metadata jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  
  UNIQUE(company_id, order_number)
);

-- Sales Order Lines: Individual items in order
CREATE TABLE IF NOT EXISTS sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  
  -- Inventory authority (NOT asset)
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  
  -- Optional asset link (for serialized items)
  asset_id uuid REFERENCES assets(id),
  
  -- Optional component link (for harvested components)
  component_id uuid REFERENCES harvested_components_inventory(id),
  
  -- Line item details
  description text,
  quantity numeric(15,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(15,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(15,2) NOT NULL,
  
  -- Cost basis (from inventory_item or asset)
  cost_price numeric(15,2) DEFAULT 0,
  
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Link sales_invoices to sales_orders
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES sales_orders(id);

COMMENT ON COLUMN sales_invoices.sales_order_id IS 'Optional link to sales order. Invoices can be created from orders or standalone.';

-- Indexes for sales orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_source ON sales_orders(source_engine, source_id) WHERE source_engine IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_order ON sales_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_inventory ON sales_order_lines(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_asset ON sales_order_lines(asset_id) WHERE asset_id IS NOT NULL;

-- RLS for sales_orders
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales orders in their company"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create sales orders in their company"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update sales orders in their company"
  ON sales_orders FOR UPDATE
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS for sales_order_lines
ALTER TABLE sales_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order lines for their company orders"
  ON sales_order_lines FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT id FROM sales_orders WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create order lines for their company orders"
  ON sales_order_lines FOR INSERT
  TO authenticated
  WITH CHECK (order_id IN (
    SELECT id FROM sales_orders WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update order lines for their company orders"
  ON sales_order_lines FOR UPDATE
  TO authenticated
  USING (order_id IN (
    SELECT id FROM sales_orders WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete order lines for their company orders"
  ON sales_order_lines FOR DELETE
  TO authenticated
  USING (order_id IN (
    SELECT id FROM sales_orders WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- ============================================================================
-- PHASE 2: AUCTION INVENTORY JUNCTION
-- ============================================================================

-- Auction Inventory Items: Link auctions to inventory (NOT assets)
CREATE TABLE IF NOT EXISTS auction_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  auction_lot_id uuid NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
  
  -- Inventory authority (single source of truth)
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  
  -- Optional asset reference (for serialized items)
  asset_id uuid REFERENCES assets(id),
  
  -- Optional component reference (for harvested parts)
  component_id uuid REFERENCES harvested_components_inventory(id),
  
  -- Quantity (for bulk items)
  quantity numeric(15,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  -- Display metadata (NOT financial truth)
  estimated_value numeric(15,2), -- For catalog display only
  display_description text, -- Override inventory_item name for auction catalog
  
  -- Lock status
  status text DEFAULT 'reserved' CHECK (status IN ('reserved', 'sold', 'released')),
  
  -- Audit
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES profiles(id),
  
  -- Prevent duplicates
  UNIQUE(auction_lot_id, inventory_item_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_inventory_items_auction ON auction_inventory_items(auction_lot_id);
CREATE INDEX IF NOT EXISTS idx_auction_inventory_items_inventory ON auction_inventory_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_auction_inventory_items_asset ON auction_inventory_items(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_inventory_items_status ON auction_inventory_items(status);

-- RLS for auction_inventory_items
ALTER TABLE auction_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction inventory in their company"
  ON auction_inventory_items FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create auction inventory in their company"
  ON auction_inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update auction inventory in their company"
  ON auction_inventory_items FOR UPDATE
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete auction inventory in their company"
  ON auction_inventory_items FOR DELETE
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- PHASE 3: DEPRECATE PARALLEL TRUTH
-- ============================================================================

-- Mark financial fields in auction_lots as deprecated (read-only)
COMMENT ON COLUMN auction_lots.hammer_price IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders/sales_invoices.';
COMMENT ON COLUMN auction_lots.buyer_premium IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders/sales_invoices.';
COMMENT ON COLUMN auction_lots.total_price IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders/sales_invoices.';
COMMENT ON COLUMN auction_lots.commission_rate IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders/sales_invoices.';
COMMENT ON COLUMN auction_lots.commission_amount IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders/sales_invoices.';
COMMENT ON COLUMN auction_lots.net_proceeds IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders/sales_invoices.';

-- Mark auction_lot_items as deprecated
COMMENT ON TABLE auction_lot_items IS 'DEPRECATED: Legacy table preserved for historical data. Use auction_inventory_items for new auctions.';

-- Create function to block writes to deprecated tables
CREATE OR REPLACE FUNCTION prevent_deprecated_table_write()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is deprecated. Use auction_inventory_items instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Block INSERT to auction_lot_items (preserve existing data)
DROP TRIGGER IF EXISTS prevent_auction_lot_items_insert ON auction_lot_items;
CREATE TRIGGER prevent_auction_lot_items_insert
  BEFORE INSERT ON auction_lot_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_deprecated_table_write();

-- Block UPDATE to auction_lot_items (preserve existing data)
DROP TRIGGER IF EXISTS prevent_auction_lot_items_update ON auction_lot_items;
CREATE TRIGGER prevent_auction_lot_items_update
  BEFORE UPDATE ON auction_lot_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_deprecated_table_write();

-- ============================================================================
-- PHASE 4: INVENTORY LOCKING
-- ============================================================================

-- Add locking fields to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS locked_by_type text CHECK (locked_by_type IN ('auction', 'order', 'reservation')),
  ADD COLUMN IF NOT EXISTS locked_by_id uuid,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_inventory_items_locked ON inventory_items(locked_by_type, locked_by_id) WHERE locked_by_type IS NOT NULL;

COMMENT ON COLUMN inventory_items.locked_by_type IS 'Type of entity that has locked this inventory (auction, order, reservation)';
COMMENT ON COLUMN inventory_items.locked_by_id IS 'ID of the entity that has locked this inventory';
COMMENT ON COLUMN inventory_items.locked_at IS 'When the inventory was locked';

-- Function: Lock inventory for auction
CREATE OR REPLACE FUNCTION lock_inventory_for_auction(
  p_inventory_item_id uuid,
  p_auction_lot_id uuid,
  p_quantity numeric
)
RETURNS void AS $$
BEGIN
  -- Decrease available quantity, increase reserved quantity
  UPDATE inventory_items
  SET
    available_quantity = available_quantity - p_quantity,
    reserved_quantity = reserved_quantity + p_quantity,
    locked_by_type = 'auction',
    locked_by_id = p_auction_lot_id,
    locked_at = now()
  WHERE id = p_inventory_item_id
    AND available_quantity >= p_quantity;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient inventory available for item %', p_inventory_item_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Release inventory lock (auction cancelled/closed without sale)
CREATE OR REPLACE FUNCTION release_inventory_lock(
  p_inventory_item_id uuid,
  p_quantity numeric
)
RETURNS void AS $$
BEGIN
  UPDATE inventory_items
  SET
    available_quantity = available_quantity + p_quantity,
    reserved_quantity = reserved_quantity - p_quantity,
    locked_by_type = NULL,
    locked_by_id = NULL,
    locked_at = NULL
  WHERE id = p_inventory_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Transfer inventory lock from auction to order
CREATE OR REPLACE FUNCTION transfer_inventory_lock_to_order(
  p_inventory_item_id uuid,
  p_order_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE inventory_items
  SET
    locked_by_type = 'order',
    locked_by_id = p_order_id,
    locked_at = now()
  WHERE id = p_inventory_item_id
    AND locked_by_type = 'auction';
END;
$$ LANGUAGE plpgsql;

-- Function: Complete order (convert reserved to sold)
CREATE OR REPLACE FUNCTION complete_order_inventory(
  p_inventory_item_id uuid,
  p_quantity numeric
)
RETURNS void AS $$
BEGIN
  UPDATE inventory_items
  SET
    reserved_quantity = reserved_quantity - p_quantity,
    sold_quantity = sold_quantity + p_quantity,
    locked_by_type = NULL,
    locked_by_id = NULL,
    locked_at = NULL
  WHERE id = p_inventory_item_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get inventory items for an auction (via auction_inventory_items)
CREATE OR REPLACE FUNCTION get_auction_inventory_items(p_auction_lot_id uuid)
RETURNS TABLE (
  id uuid,
  inventory_item_id uuid,
  asset_id uuid,
  component_id uuid,
  quantity numeric,
  cost_basis numeric,
  description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aii.id,
    aii.inventory_item_id,
    aii.asset_id,
    aii.component_id,
    aii.quantity,
    COALESCE(
      a.total_cost, -- From asset if serialized
      ii.cost_price, -- From inventory_item
      0
    ) as cost_basis,
    COALESCE(
      aii.display_description,
      ii.name,
      a.model || ' - ' || a.serial_number
    ) as description
  FROM auction_inventory_items aii
  LEFT JOIN inventory_items ii ON ii.id = aii.inventory_item_id
  LEFT JOIN assets a ON a.id = aii.asset_id
  WHERE aii.auction_lot_id = p_auction_lot_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-update sales_order totals when lines change
CREATE OR REPLACE FUNCTION update_sales_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric;
  v_total_cost numeric;
BEGIN
  -- Get order_id from NEW or OLD
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate totals from lines
  SELECT
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM(cost_price * quantity), 0)
  INTO v_subtotal, v_total_cost
  FROM sales_order_lines
  WHERE order_id = v_order_id;
  
  -- Update order
  UPDATE sales_orders
  SET
    subtotal_amount = v_subtotal,
    total_amount = v_subtotal + COALESCE(tax_amount, 0) - COALESCE(discount_amount, 0) + COALESCE(shipping_amount, 0),
    total_cost_amount = v_total_cost,
    updated_at = now()
  WHERE id = v_order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_totals_on_line_change ON sales_order_lines;
CREATE TRIGGER update_order_totals_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON sales_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_order_totals();

-- ============================================================================
-- DATA INTEGRITY
-- ============================================================================

-- Ensure sales_order_lines reference valid inventory
CREATE OR REPLACE FUNCTION validate_sales_order_line_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure inventory_item exists
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = NEW.inventory_item_id) THEN
    RAISE EXCEPTION 'Invalid inventory_item_id: %', NEW.inventory_item_id;
  END IF;
  
  -- If asset_id provided, ensure it belongs to the inventory_item
  IF NEW.asset_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM assets
      WHERE id = NEW.asset_id
        AND inventory_item_id = NEW.inventory_item_id
    ) THEN
      RAISE EXCEPTION 'Asset % does not belong to inventory_item %', NEW.asset_id, NEW.inventory_item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_order_line_inventory ON sales_order_lines;
CREATE TRIGGER validate_order_line_inventory
  BEFORE INSERT OR UPDATE ON sales_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION validate_sales_order_line_inventory();
