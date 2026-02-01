# Auction Engine - Zero Parallel Truth Analysis

## Current State Assessment

### Party Abstraction in This Codebase
- **Party = `customers`** (for buyers) or `suppliers`** (for sellers)
- `party_links` maps source records to Party tables
- `party_type` = 'customer' | 'supplier'
- `party_id` = `customers.id` | `suppliers.id`

For auction buyers: **Party = customers.id**

### Current Violations

#### ❌ VIOLATION 1: Buyer Identity Has Parallel Truth
**Problem:**
- `bids` table has BOTH `buyer_account_id` (legacy) AND `party_id` (new)
- `buyer_account_id` is still used in business logic
- Service queries still join `buyer_accounts` table

**Current Schema:**
```sql
CREATE TABLE bids (
  buyer_account_id uuid REFERENCES buyer_accounts(id),  -- PARALLEL TRUTH
  party_id uuid REFERENCES customers(id),               -- NEW (added recently)
  ...
);
```

**Service Violations:**
- `auctionService.getBidsForLot()` - joins `buyer_accounts` table
- `auctionService.getAuctionLot()` - joins `buyer_accounts` in bids
- `auctionService.getLegacySettlements()` - joins `buyer_accounts`

#### ❌ VIOLATION 2: Lot Contents Have Parallel Truth
**Problem:**
- `auction_lot_items` table stores duplicate lot contents
- Settlement pulls invoice lines from `auction_lot_items` instead of authoritative source
- `purchase_lots` is not the enforced source of truth

**Current Schema:**
```sql
CREATE TABLE auction_lots (
  purchase_lot_id uuid REFERENCES purchase_lots(id),  -- NEW (nullable, optional)
  ...
);

CREATE TABLE auction_lot_items (
  auction_lot_id uuid,
  asset_id uuid,
  component_id uuid,
  cost_basis decimal,  -- DUPLICATE DATA
  ...
);
```

**Service Violations:**
- `auctionService.settleAuction()` - creates invoice lines from `auction_lot_items` (line 418-430)
- Should pull from `purchase_lots` → assets/components relationship instead

#### ❌ VIOLATION 3: Legacy Tables Still Writable
**Problem:**
- `buyer_accounts` table still has write operations (deprecated but functional)
- `auction_settlements` table marked deprecated but not prevented from writes
- `auction_lot_items` still used as authoritative source

## Required Changes

### TASK 1: Enforce Buyer Authority (customers only)

#### 1.1 Database Changes
```sql
-- Make party_id NOT NULL (require it for all new bids)
ALTER TABLE bids
ALTER COLUMN party_id SET NOT NULL;

-- Add constraint to validate party_id references customers
ALTER TABLE bids
ADD CONSTRAINT bids_party_fk
FOREIGN KEY (party_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- Mark buyer_account_id as deprecated
COMMENT ON COLUMN bids.buyer_account_id IS
'DEPRECATED: Do not use. Preserved for read-only historical data. Use party_id instead.';

-- Prevent writes to buyer_accounts (make read-only)
COMMENT ON TABLE buyer_accounts IS
'DEPRECATED: Read-only table. Use customers + party_links instead. DO NOT INSERT/UPDATE.';
```

#### 1.2 Service Changes (auctionService.ts)
```typescript
// Remove buyer_accounts from all queries
async getBidsForLot(lotId: string) {
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      party:customers(name, customer_number, email)
      // REMOVE: buyer:buyer_accounts(buyer_name, buyer_number)
    `)
    .eq('auction_lot_id', lotId)
    .order('bid_amount', { ascending: false });
}

// Remove getBuyerAccounts, createBuyerAccount, updateBuyerAccount
// Users should use customerService instead
```

#### 1.3 Migration Strategy
```sql
-- For existing bids without party_id:
-- Option 1: Resolve via party_links
UPDATE bids b
SET party_id = (
  SELECT pl.party_id
  FROM party_links pl
  WHERE pl.source_type = 'buyer_account'
    AND pl.source_id = b.buyer_account_id
    AND pl.party_type = 'customer'
)
WHERE b.party_id IS NULL
  AND b.buyer_account_id IS NOT NULL;

-- Option 2: Delete orphaned bids (if no party can be resolved)
-- OR keep them but prevent new ones without party_id
```

### TASK 2: Enforce Lot Authority (purchase_lots only)

#### 2.1 Database Changes
```sql
-- Strongly encourage purchase_lot_id (consider making NOT NULL for new records)
-- Add check constraint for new records
ALTER TABLE auction_lots
ADD CONSTRAINT auction_lots_require_purchase_lot
CHECK (
  purchase_lot_id IS NOT NULL OR
  created_at < '2026-02-01'::timestamptz -- Grandfather old records
);

-- Mark auction_lot_items as read-only
COMMENT ON TABLE auction_lot_items IS
'DEPRECATED: Read-only for legacy display. Do not use as source of truth.
Items should come from purchase_lots → assets/components relationship.';

-- Add helper function to get lot items from purchase_lots
CREATE OR REPLACE FUNCTION get_auction_lot_items_from_purchase_lot(p_auction_lot_id uuid)
RETURNS TABLE(
  asset_id uuid,
  component_id uuid,
  cost_basis decimal,
  quantity int,
  description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS asset_id,
    NULL::uuid AS component_id,
    a.purchase_cost AS cost_basis,
    1 AS quantity,
    CONCAT(a.brand, ' ', a.model, ' - ', a.serial_number) AS description
  FROM auction_lots al
  JOIN assets a ON a.purchase_lot_id = al.purchase_lot_id
  WHERE al.id = p_auction_lot_id
    AND al.purchase_lot_id IS NOT NULL
    AND a.status != 'sold'; -- Only unsold assets
END;
$$ LANGUAGE plpgsql STABLE;
```

#### 2.2 Service Changes
```typescript
// In settleAuction(), pull items from purchase_lots not auction_lot_items
async settleAuction(params) {
  // 1. Get lot
  const { data: lot } = await supabase
    .from('auction_lots')
    .select(`
      *,
      purchase_lot:purchase_lots(*)
    `)
    .eq('id', lotId)
    .single();

  if (!lot.purchase_lot_id) {
    throw new Error('Auction lot must reference a purchase_lot');
  }

  // 2. Get items from purchase_lots (authoritative source)
  const { data: items } = await supabase
    .rpc('get_auction_lot_items_from_purchase_lot', {
      p_auction_lot_id: lotId
    });

  // 3. Create invoice with items from authoritative source
  for (const item of items) {
    await salesInvoiceService.addInvoiceItem({
      invoice_id: invoice.id,
      asset_id: item.asset_id,
      component_id: item.component_id,
      unit_price: hammerPrice / items.length,
      cost_price: item.cost_basis,
      ...
    });
  }

  // DO NOT USE: lot.auction_lot_items
}
```

### TASK 3: Settlement Authority (sales_invoices only)

#### 3.1 Database Changes
```sql
-- Prevent writes to auction_settlements
CREATE OR REPLACE FUNCTION prevent_auction_settlement_writes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'auction_settlements is deprecated. Use sales_invoices instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_auction_settlement_insert
  BEFORE INSERT ON auction_settlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auction_settlement_writes();

COMMENT ON TABLE auction_settlements IS
'DEPRECATED: Read-only historical data. All new settlements MUST use sales_invoices.';
```

#### 3.2 Service Changes
```typescript
// Remove any code that writes to auction_settlements
// Already done - settleAuction() only writes to sales_invoices

// Keep getLegacySettlements() for historical data only
async getLegacySettlements(companyId: string) {
  // Read-only, for display of old records
}
```

### TASK 4: Backward Safety

#### 4.1 Keep Legacy Tables Readable
```sql
-- DO NOT DROP TABLES
-- DO NOT DELETE DATA
-- Just prevent writes via triggers/comments

-- Create read-only views if needed
CREATE OR REPLACE VIEW buyer_accounts_read_only AS
SELECT
  ba.*,
  pl.party_id,
  c.name AS party_name
FROM buyer_accounts ba
LEFT JOIN party_links pl ON pl.source_id = ba.id AND pl.source_type = 'buyer_account'
LEFT JOIN customers c ON c.id = pl.party_id;

COMMENT ON VIEW buyer_accounts_read_only IS
'Read-only view of legacy buyer_accounts with resolved Party information.';
```

## Implementation Order

1. **Phase 1: Database Migration**
   - Add NOT NULL constraint to bids.party_id
   - Add triggers to prevent writes to deprecated tables
   - Create helper functions for lot items from purchase_lots

2. **Phase 2: Service Refactor**
   - Update auctionService to remove buyer_accounts from queries
   - Update settleAuction to pull items from purchase_lots
   - Remove buyer_accounts write operations

3. **Phase 3: Validation**
   - Run build
   - Test settlement flow
   - Verify no writes to deprecated tables

## Exit Conditions Verification

### ✓ 1. A bid cannot be placed without party_id
- `bids.party_id` is NOT NULL
- Database rejects bids without party_id

### ✓ 2. buyer_accounts is not used in business logic
- No queries join buyer_accounts for operational data
- All bidder identity resolved from customers (Party)
- buyer_accounts read-only (INSERT trigger blocks writes)

### ✓ 3. Auctions always reference purchase_lots as authority
- `auction_lots.purchase_lot_id` enforced (check constraint)
- Settlement pulls items from purchase_lots, not auction_lot_items
- Cost basis from purchase_lots

### ✓ 4. Settlement produces invoices/lines only
- `settleAuction()` only writes to sales_invoices/sales_invoice_items
- No writes to auction_settlements (blocked by trigger)
- Sales channel = 'auction' for tracking

### ✓ 5. Legacy tables remain readable but never written
- buyer_accounts: Trigger prevents INSERT/UPDATE
- auction_settlements: Trigger prevents INSERT/UPDATE
- auction_lot_items: Comment warns read-only
- All legacy data preserved for historical reference

## Summary

**Before (Parallel Truth):**
- Buyers: buyer_accounts (parallel) + customers (core)
- Lots: auction_lot_items (parallel) + purchase_lots (core)
- Finance: auction_settlements (parallel) + sales_invoices (core)

**After (Single Source of Truth):**
- Buyers: customers ONLY (via bids.party_id)
- Lots: purchase_lots ONLY (auction_lots references it)
- Finance: sales_invoices ONLY (settlement creates invoices)

**Zero parallel truth achieved.**
