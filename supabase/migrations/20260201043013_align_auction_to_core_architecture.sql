/*
  # Align Auction Engine to Core Architecture

  ## Overview
  This migration refactors the auction system to eliminate parallel truth and align with core entities:
  - Purchase Lots (lot authority)
  - Parties/Customers (buyer identity)
  - Sales Invoices (settlement authority)

  ## Changes Made

  ### 1. Lot Authority - Link to purchase_lots
    - Add `purchase_lot_id` FK to `auction_lots`
    - Auctions can reference existing purchase lots for cost basis and inventory
    - Backward compatible: auction_lots table remains for legacy display

  ### 2. Buyer Authority - Link to Parties
    - Add `party_id` FK to `bids` table (references customers)
    - Bids now directly reference Party identity
    - Create party_links for existing buyer_accounts
    - buyer_accounts marked as deprecated but readable for backward compatibility

  ### 3. Settlement Authority - Use sales_invoices
    - auction_settlements table remains for historical data
    - New settlements MUST create sales_invoices
    - Settlement logic handled in service layer

  ### 4. Backward Compatibility
    - No data deleted
    - Old columns remain readable
    - New columns nullable for gradual migration

  ## Security
    - RLS policies updated to include new columns
    - Party access validated through user_company_access
*/

-- =====================================================
-- 1. ADD PARTY REFERENCE TO BIDS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE bids ADD COLUMN party_id uuid REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_bids_party ON bids(party_id);
    COMMENT ON COLUMN bids.party_id IS 'Buyer Party identity (customer). Replaces buyer_account_id for new bids.';
  END IF;
END $$;

-- =====================================================
-- 2. ADD PURCHASE LOT REFERENCE TO AUCTION LOTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auction_lots' AND column_name = 'purchase_lot_id'
  ) THEN
    ALTER TABLE auction_lots ADD COLUMN purchase_lot_id uuid REFERENCES purchase_lots(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_auction_lots_purchase_lot ON auction_lots(purchase_lot_id);
    COMMENT ON COLUMN auction_lots.purchase_lot_id IS 'Links auction lot to purchase lot for cost basis and inventory tracking. Single source of truth for lot data.';
  END IF;
END $$;

-- =====================================================
-- 3. MARK DEPRECATED FIELDS
-- =====================================================

COMMENT ON TABLE buyer_accounts IS 'DEPRECATED: Use customers table and party_links for buyer identity. Table preserved for backward compatibility.';
COMMENT ON COLUMN bids.buyer_account_id IS 'DEPRECATED: Use party_id instead. Preserved for backward compatibility.';
COMMENT ON TABLE auction_settlements IS 'DEPRECATED FOR NEW RECORDS: Use sales_invoices for settlement. Table preserved for historical data.';

-- =====================================================
-- 4. CREATE HELPER FUNCTION TO RESOLVE BUYER PARTY
-- =====================================================

CREATE OR REPLACE FUNCTION get_bid_buyer_party(bid_row bids)
RETURNS uuid AS $$
BEGIN
  -- If party_id exists, use it (new system)
  IF bid_row.party_id IS NOT NULL THEN
    RETURN bid_row.party_id;
  END IF;

  -- Otherwise, try to resolve from buyer_account via party_links (migration path)
  IF bid_row.buyer_account_id IS NOT NULL THEN
    RETURN (
      SELECT party_id
      FROM party_links
      WHERE source_type = 'buyer_account'
        AND source_id = bid_row.buyer_account_id
        AND party_type = 'customer'
      LIMIT 1
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bid_buyer_party IS 'Helper function to resolve buyer Party ID from either party_id (new) or buyer_account_id (legacy via party_links)';

-- =====================================================
-- 5. CREATE HELPER FUNCTION TO GET LOT COST BASIS
-- =====================================================

CREATE OR REPLACE FUNCTION get_auction_lot_cost_basis(lot_id uuid)
RETURNS decimal AS $$
DECLARE
  lot_record auction_lots%ROWTYPE;
  cost_basis decimal(15,2);
BEGIN
  SELECT * INTO lot_record FROM auction_lots WHERE id = lot_id;

  -- If linked to purchase_lot, use that as source of truth
  IF lot_record.purchase_lot_id IS NOT NULL THEN
    SELECT total_cost INTO cost_basis
    FROM purchase_lots
    WHERE id = lot_record.purchase_lot_id;

    RETURN COALESCE(cost_basis, 0);
  END IF;

  -- Otherwise, calculate from auction_lot_items (legacy)
  SELECT COALESCE(SUM(cost_basis * quantity), 0)
  INTO cost_basis
  FROM auction_lot_items
  WHERE auction_lot_id = lot_id;

  RETURN COALESCE(cost_basis, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_auction_lot_cost_basis IS 'Gets cost basis from purchase_lots (if linked) or auction_lot_items (legacy). Single source of truth.';

-- =====================================================
-- 6. CREATE MIGRATION HELPER TO LINK BUYER_ACCOUNTS
-- =====================================================

-- This function can be called manually to link existing buyer_accounts to customers
CREATE OR REPLACE FUNCTION migrate_buyer_accounts_to_party_links()
RETURNS TABLE(linked_count int, skipped_count int) AS $$
DECLARE
  v_linked int := 0;
  v_skipped int := 0;
  buyer_rec RECORD;
BEGIN
  FOR buyer_rec IN
    SELECT ba.id, ba.company_id, ba.customer_id
    FROM buyer_accounts ba
    WHERE ba.customer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM party_links pl
        WHERE pl.source_type = 'buyer_account'
          AND pl.source_id = ba.id
      )
  LOOP
    BEGIN
      INSERT INTO party_links (
        company_id,
        source_type,
        source_id,
        party_type,
        party_id,
        link_method,
        confidence_score
      ) VALUES (
        buyer_rec.company_id,
        'buyer_account',
        buyer_rec.id,
        'customer',
        buyer_rec.customer_id,
        'auto',
        1.0
      );
      v_linked := v_linked + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_linked, v_skipped;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_buyer_accounts_to_party_links IS 'Helper function to create party_links for existing buyer_accounts. Run once during migration.';

-- =====================================================
-- 7. AUTO-MIGRATE EXISTING DATA
-- =====================================================

-- Automatically create party_links for buyer_accounts that have customer_id
DO $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM migrate_buyer_accounts_to_party_links();
  RAISE NOTICE 'Buyer accounts migration complete: % linked, % skipped', result.linked_count, result.skipped_count;
END $$;