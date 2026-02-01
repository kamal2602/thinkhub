/*
  # Block Parallel Financial Truth Writes

  ## Summary
  Enforces ZERO PARALLEL TRUTH principle by blocking direct writes to financial fields
  that should only exist in canonical locations (sales_orders, sales_order_lines).
  
  This prevents data inconsistency bugs where the same financial value exists in
  multiple tables with different values.

  ## Changes

  ### 1. Blocked Fields in `auction_lots` table
  **BLOCKED:**
  - hammer_price → Use sales_orders.total_amount (canonical source)
  - total_price → Derive from sales_orders
  - commission_amount → Calculate from sales_orders

  **ALLOWED:**
  - reserve_price (pre-sale setting, not actual transaction)
  - starting_price (pre-sale setting, not actual transaction)

  ### 2. Blocked Fields in `assets` table
  **BLOCKED:**
  - selling_price → Use sales_order_lines.unit_price (canonical source)
  - profit_amount → Calculate on-demand from cost vs. revenue
  - profit_margin → Calculate on-demand from profit_amount / revenue

  **ALLOWED:**
  - purchase_price (cost basis tracking)
  - refurbishment_cost (cost accumulation)
  - market_price (pricing guidance, not financial truth)
  - po_unit_cost (cost tracking)

  ### 3. Trigger Strategy
  - BEFORE INSERT/UPDATE triggers
  - Raises informative errors directing to canonical location
  - Includes SQL comments for future developers
  - Non-bypassable (only way to bypass is DROP TRIGGER)

  ## Important Notes
  - This is a DATA INTEGRITY enforcement mechanism
  - Errors include exact table.column to use instead
  - Does NOT block existing data (uses BEFORE trigger, not CHECK constraint)
  - Triggers can be disabled if absolutely necessary for migration
  - Zero performance impact on read operations
*/

-- =====================================================
-- PART 1: Block auction_lots parallel truth fields
-- =====================================================

CREATE OR REPLACE FUNCTION block_auction_lots_parallel_truth()
RETURNS TRIGGER AS $$
BEGIN
  -- Block hammer_price (actual sale price)
  IF (TG_OP = 'INSERT' AND NEW.hammer_price IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.hammer_price IS DISTINCT FROM OLD.hammer_price) THEN
    RAISE EXCEPTION 
      'PARALLEL TRUTH VIOLATION: Cannot set auction_lots.hammer_price. '
      'Use sales_orders.total_amount as the canonical source of financial truth. '
      'Create a sales_order record instead.';
  END IF;

  -- Block total_price (derived from sale)
  IF (TG_OP = 'INSERT' AND NEW.total_price IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.total_price IS DISTINCT FROM OLD.total_price) THEN
    RAISE EXCEPTION 
      'PARALLEL TRUTH VIOLATION: Cannot set auction_lots.total_price. '
      'Use sales_orders.total_amount as the canonical source. '
      'Total price should be derived from sales_orders, not stored here.';
  END IF;

  -- Block commission_amount (derived from sale)
  IF (TG_OP = 'INSERT' AND NEW.commission_amount IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.commission_amount IS DISTINCT FROM OLD.commission_amount) THEN
    RAISE EXCEPTION 
      'PARALLEL TRUTH VIOLATION: Cannot set auction_lots.commission_amount. '
      'Calculate commission from sales_orders.total_amount in application logic.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_block_auction_lots_parallel_truth ON auction_lots;

-- Create trigger on auction_lots
CREATE TRIGGER trigger_block_auction_lots_parallel_truth
  BEFORE INSERT OR UPDATE ON auction_lots
  FOR EACH ROW
  EXECUTE FUNCTION block_auction_lots_parallel_truth();

-- =====================================================
-- PART 2: Block assets parallel truth fields
-- =====================================================

CREATE OR REPLACE FUNCTION block_assets_parallel_truth()
RETURNS TRIGGER AS $$
BEGIN
  -- Block selling_price (actual sale price)
  IF (TG_OP = 'INSERT' AND NEW.selling_price IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.selling_price IS DISTINCT FROM OLD.selling_price) THEN
    RAISE EXCEPTION 
      'PARALLEL TRUTH VIOLATION: Cannot set assets.selling_price. '
      'Use sales_order_lines.unit_price as the canonical source of financial truth. '
      'Create a sales_order_line record instead.';
  END IF;

  -- Block profit_amount (derived value)
  IF (TG_OP = 'INSERT' AND NEW.profit_amount IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.profit_amount IS DISTINCT FROM OLD.profit_amount) THEN
    RAISE EXCEPTION 
      'PARALLEL TRUTH VIOLATION: Cannot set assets.profit_amount. '
      'Calculate profit on-demand: (sales_order_lines.unit_price - assets.total_cost). '
      'Do not store derived financial values.';
  END IF;

  -- Block profit_margin (derived value)
  IF (TG_OP = 'INSERT' AND NEW.profit_margin IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.profit_margin IS DISTINCT FROM OLD.profit_margin) THEN
    RAISE EXCEPTION 
      'PARALLEL TRUTH VIOLATION: Cannot set assets.profit_margin. '
      'Calculate margin on-demand: profit_amount / sales_order_lines.unit_price. '
      'Do not store derived financial values.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_block_assets_parallel_truth ON assets;

-- Create trigger on assets
CREATE TRIGGER trigger_block_assets_parallel_truth
  BEFORE INSERT OR UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION block_assets_parallel_truth();

-- =====================================================
-- PART 3: Add helpful comments to blocked columns
-- =====================================================

COMMENT ON COLUMN auction_lots.hammer_price IS 
  'DEPRECATED - DO NOT USE. Use sales_orders.total_amount instead. '
  'This field is blocked by trigger to prevent parallel truth.';

COMMENT ON COLUMN auction_lots.total_price IS 
  'DEPRECATED - DO NOT USE. Derive from sales_orders.total_amount instead. '
  'This field is blocked by trigger to prevent parallel truth.';

COMMENT ON COLUMN auction_lots.commission_amount IS 
  'DEPRECATED - DO NOT USE. Calculate from sales_orders.total_amount in application. '
  'This field is blocked by trigger to prevent parallel truth.';

COMMENT ON COLUMN assets.selling_price IS 
  'DEPRECATED - DO NOT USE. Use sales_order_lines.unit_price instead. '
  'This field is blocked by trigger to prevent parallel truth.';

COMMENT ON COLUMN assets.profit_amount IS 
  'DEPRECATED - DO NOT USE. Calculate on-demand from revenue - costs. '
  'This field is blocked by trigger to prevent parallel truth.';

COMMENT ON COLUMN assets.profit_margin IS 
  'DEPRECATED - DO NOT USE. Calculate on-demand from profit / revenue. '
  'This field is blocked by trigger to prevent parallel truth.';
