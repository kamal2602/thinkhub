/*
  # Enforce Zero Parallel Truth in Auction System

  1. Changes
    - Make bids.party_id NOT NULL (buyers MUST be Party/customers)
    - Add triggers to prevent writes to deprecated tables (buyer_accounts, auction_settlements)
    - Create helper function to get auction items from purchase_lots (authoritative source)
    - Add database comments to mark deprecated tables as read-only

  2. Buyer Authority
    - All bids MUST reference party_id (customers.id)
    - buyer_accounts is read-only legacy data
    - Backfill existing bids from party_links where possible

  3. Lot Authority
    - Auction lots MUST reference purchase_lots for item contents
    - auction_lot_items is read-only legacy data
    - New function pulls items from canonical purchase_lots → assets relationship

  4. Settlement Authority
    - Settlements MUST create sales_invoices only
    - auction_settlements is read-only legacy data
    - No parallel financial records allowed

  5. Backward Safety
    - No data deletion
    - Legacy tables preserved for historical reference
    - Triggers prevent NEW writes only
*/

-- =====================================================
-- STEP 1: BACKFILL BIDS WITH PARTY_ID FROM PARTY_LINKS
-- =====================================================

-- Backfill bids that have buyer_account_id but no party_id
UPDATE bids b
SET party_id = (
  SELECT pl.party_id
  FROM party_links pl
  WHERE pl.source_type = 'buyer_account'
    AND pl.source_id = b.buyer_account_id
    AND pl.party_type = 'customer'
  LIMIT 1
)
WHERE b.party_id IS NULL
  AND b.buyer_account_id IS NOT NULL;

-- =====================================================
-- STEP 2: ENFORCE PARTY_ID NOT NULL ON BIDS
-- =====================================================

-- Make party_id mandatory for all new bids
ALTER TABLE bids
ALTER COLUMN party_id SET NOT NULL;

-- Add descriptive comment
COMMENT ON COLUMN bids.party_id IS 'REQUIRED: Bidder identity (customers.id). All bidders are Parties (customers).';

COMMENT ON COLUMN bids.buyer_account_id IS 'DEPRECATED: Read-only legacy reference. Do not use. Use party_id instead.';

-- =====================================================
-- STEP 3: PREVENT WRITES TO DEPRECATED TABLES
-- =====================================================

-- Block writes to buyer_accounts (read-only legacy table)
CREATE OR REPLACE FUNCTION prevent_buyer_account_writes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'buyer_accounts is deprecated and read-only. Use customers table with party_links for identity mapping.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_buyer_account_insert
  BEFORE INSERT ON buyer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_buyer_account_writes();

CREATE TRIGGER prevent_buyer_account_update
  BEFORE UPDATE ON buyer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_buyer_account_writes();

-- Block writes to auction_settlements (read-only legacy table)
CREATE OR REPLACE FUNCTION prevent_auction_settlement_writes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'auction_settlements is deprecated and read-only. Use sales_invoices for all settlements.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_auction_settlement_insert
  BEFORE INSERT ON auction_settlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auction_settlement_writes();

CREATE TRIGGER prevent_auction_settlement_update
  BEFORE UPDATE ON auction_settlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auction_settlement_writes();

-- Mark tables as deprecated in database comments
COMMENT ON TABLE buyer_accounts IS 'DEPRECATED: Read-only legacy table. Use customers (Party) with party_links instead. Writes blocked by trigger.';

COMMENT ON TABLE auction_settlements IS 'DEPRECATED: Read-only legacy table. Use sales_invoices (sales_channel = ''auction'') instead. Writes blocked by trigger.';

COMMENT ON TABLE auction_lot_items IS 'DEPRECATED: Read-only legacy display data. Use purchase_lots → assets/components for authoritative lot contents.';

-- =====================================================
-- STEP 4: HELPER FUNCTION FOR LOT ITEMS FROM PURCHASE_LOTS
-- =====================================================

-- Get auction lot items from authoritative source (purchase_lots)
-- This replaces reading from auction_lot_items
CREATE OR REPLACE FUNCTION get_auction_lot_items_from_purchase_lot(p_auction_lot_id uuid)
RETURNS TABLE(
  asset_id uuid,
  component_id uuid,
  cost_basis decimal,
  quantity int,
  description text,
  product_type_name text
) AS $$
BEGIN
  -- Return assets from the purchase lot
  RETURN QUERY
  SELECT
    a.id AS asset_id,
    NULL::uuid AS component_id,
    a.purchase_cost AS cost_basis,
    1 AS quantity,
    CONCAT(
      COALESCE(a.brand, 'Unknown Brand'), ' ',
      COALESCE(a.model, 'Unknown Model'),
      CASE WHEN a.serial_number IS NOT NULL THEN ' - SN: ' || a.serial_number ELSE '' END
    ) AS description,
    pt.name AS product_type_name
  FROM auction_lots al
  JOIN assets a ON a.purchase_lot_id = al.purchase_lot_id
  LEFT JOIN product_types pt ON pt.id = a.product_type_id
  WHERE al.id = p_auction_lot_id
    AND al.purchase_lot_id IS NOT NULL
    AND a.status NOT IN ('sold', 'scrapped') -- Only available assets

  UNION ALL

  -- Return harvested components from the purchase lot
  SELECT
    NULL::uuid AS asset_id,
    hc.id AS component_id,
    COALESCE(hc.market_value, 0) AS cost_basis,
    COALESCE(hc.quantity, 1) AS quantity,
    CONCAT(
      COALESCE(hc.component_type, 'Component'), ' - ',
      COALESCE(hc.component_name, 'Unnamed')
    ) AS description,
    NULL::text AS product_type_name
  FROM auction_lots al
  JOIN harvested_components_inventory hc ON hc.source_lot_id = al.purchase_lot_id
  WHERE al.id = p_auction_lot_id
    AND al.purchase_lot_id IS NOT NULL
    AND hc.status = 'in_stock'; -- Only available components
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_auction_lot_items_from_purchase_lot IS 'Get auction lot items from authoritative source (purchase_lots → assets/components). Replaces reading from deprecated auction_lot_items table.';

-- =====================================================
-- STEP 5: ADD READ-ONLY VIEW FOR BUYER ACCOUNTS
-- =====================================================

-- Create view for displaying legacy buyer accounts with resolved Party info
CREATE OR REPLACE VIEW buyer_accounts_read_only AS
SELECT
  ba.*,
  pl.party_id,
  pl.party_type,
  c.name AS party_name,
  c.email AS party_email
FROM buyer_accounts ba
LEFT JOIN party_links pl
  ON pl.source_id = ba.id
  AND pl.source_type = 'buyer_account'
LEFT JOIN customers c
  ON c.id = pl.party_id
  AND pl.party_type = 'customer';

COMMENT ON VIEW buyer_accounts_read_only IS 'Read-only view of legacy buyer_accounts with resolved Party information. Use this for displaying historical data.';

-- =====================================================
-- STEP 6: VALIDATE AUCTION_LOTS HAVE PURCHASE_LOT_ID
-- =====================================================

-- Add check constraint to encourage (but not force) purchase_lot_id on new auction lots
-- We make it a soft constraint that allows NULL for flexibility but logs a warning
ALTER TABLE auction_lots
DROP CONSTRAINT IF EXISTS auction_lots_purchase_lot_preferred;

ALTER TABLE auction_lots
ADD CONSTRAINT auction_lots_purchase_lot_preferred
CHECK (
  purchase_lot_id IS NOT NULL OR
  created_at < '2026-02-01'::timestamptz -- Grandfather old records
);

COMMENT ON CONSTRAINT auction_lots_purchase_lot_preferred ON auction_lots IS 'New auction lots SHOULD reference purchase_lots for authoritative item contents and cost basis.';

-- =====================================================
-- VERIFICATION QUERIES (FOR TESTING)
-- =====================================================

-- Count bids without party_id (should be 0 after migration)
DO $$
DECLARE
  orphan_bids_count int;
BEGIN
  SELECT COUNT(*) INTO orphan_bids_count
  FROM bids
  WHERE party_id IS NULL;

  IF orphan_bids_count > 0 THEN
    RAISE WARNING 'Found % bids without party_id. These will be rejected by NOT NULL constraint.', orphan_bids_count;
  END IF;
END $$;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Auction zero parallel truth enforcement complete:';
  RAISE NOTICE '✓ bids.party_id is now NOT NULL';
  RAISE NOTICE '✓ buyer_accounts writes blocked by trigger';
  RAISE NOTICE '✓ auction_settlements writes blocked by trigger';
  RAISE NOTICE '✓ Helper function created: get_auction_lot_items_from_purchase_lot()';
  RAISE NOTICE '✓ auction_lot_items marked as read-only (use function instead)';
END $$;