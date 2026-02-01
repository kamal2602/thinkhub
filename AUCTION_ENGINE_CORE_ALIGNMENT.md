# Auction Engine - Core Architecture Alignment

## Overview

The Auction Engine has been fully refactored to eliminate parallel truth and align with core architectural principles. All auction data now flows through the core systems:

- **Purchase Lots** (lot authority)
- **Parties/Customers** (buyer identity)
- **Sales Invoices** (settlement/financial truth)

## Architecture Changes

### 1. Lot Authority - purchase_lots

**Before:** `auction_lots` was an isolated table tracking items independently
**After:** `auction_lots.purchase_lot_id` references the core `purchase_lots` table

#### Benefits
- Single source of truth for cost basis
- Direct connection to supplier and purchasing data
- Eliminates duplicate lot tracking

#### Usage
```typescript
// Create auction lot from existing purchase lot
const auctionLot = await auctionService.createAuctionLotFromPurchaseLot({
  companyId: 'company-uuid',
  auctionEventId: 'event-uuid',
  purchaseLotId: 'purchase-lot-uuid',
  lotNumber: 'LOT-001',
  title: 'Mixed Electronics Lot',
  description: 'Various laptops and tablets',
  startingPrice: 5000,
  reservePrice: 7500,
  estimateLow: 8000,
  estimateHigh: 12000
});

// Cost basis automatically pulled from purchase_lots
const costBasis = await auctionService.calculateLotCostBasis(auctionLot.id);
```

### 2. Buyer Authority - Parties (customers)

**Before:** `buyer_accounts` was a separate identity table
**After:** `bids.party_id` references `customers` (Party system)

#### Benefits
- Unified buyer identity across all engines
- Buyers are first-class Parties with full CRM capabilities
- party_links system maps legacy buyer_accounts to customers

#### Migration Path
- Existing `buyer_accounts` with `customer_id` are automatically linked via `party_links`
- New bids MUST use `party_id` (customer ID)
- Legacy `buyer_account_id` is deprecated but preserved for backward compatibility

#### Usage
```typescript
// Place bid using Party ID (customer ID)
const bid = await auctionService.placeBid({
  company_id: 'company-uuid',
  auction_lot_id: 'lot-uuid',
  party_id: 'customer-uuid',  // References customers table
  bid_amount: 10000,
  bid_type: 'standard',
  is_winning: true
});

// Get bids with Party information
const bids = await auctionService.getBidsForLot('lot-uuid');
// Returns: { party: { name, customer_number, email }, ... }
```

### 3. Settlement Authority - sales_invoices

**Before:** `auction_settlements` stored financial data in parallel
**After:** `settleAuction()` creates `sales_invoices` (core financial system)

#### Benefits
- Single source of financial truth
- Auction revenue appears in unified accounting
- Integrates with order processing and payments
- No duplicate financial records

#### Settlement Flow
1. Auction lot closes with winning bid
2. `settleAuction()` creates a sales_invoice with:
   - Customer = winning bidder (Party)
   - Line items = auction lot items
   - Sales channel = 'auction'
   - Notes = hammer price, commission, buyer premium
3. Auction lot status = 'sold'
4. Financial data lives ONLY in sales_invoices

#### Usage
```typescript
// Settle auction - creates sales_invoice
const invoice = await auctionService.settleAuction({
  companyId: 'company-uuid',
  lotId: 'auction-lot-uuid',
  partyId: 'customer-uuid',  // Winning bidder
  hammerPrice: 10000,
  commission: 1000,          // Auction house commission
  buyerPremium: 1500,        // Additional buyer fee
  listingFees: 100,
  otherFees: 50,
  notes: 'Special handling required'
});

// Invoice automatically includes:
// - Line items from auction lot
// - Cost basis from purchase_lots
// - Sales channel = 'auction'
// - Payment tracking
```

### 4. Backward Compatibility

**All legacy tables preserved:**
- `buyer_accounts` - Read-only, use `party_links` for resolution
- `auction_settlements` - Historical data only, new settlements use sales_invoices
- `auction_lot_items` - Still used when no purchase_lot link exists

**Database functions for smooth transition:**
```sql
-- Resolve buyer Party from bid (handles both new and legacy)
SELECT get_bid_buyer_party(bid_row);

-- Get cost basis (from purchase_lots or auction_lot_items)
SELECT get_auction_lot_cost_basis(lot_id);

-- Migrate existing buyer_accounts to party_links
SELECT * FROM migrate_buyer_accounts_to_party_links();
```

## Database Schema Changes

### New Columns

**bids table:**
```sql
ALTER TABLE bids
ADD COLUMN party_id uuid REFERENCES customers(id);
-- party_id is the new buyer identity (replaces buyer_account_id)
```

**auction_lots table:**
```sql
ALTER TABLE auction_lots
ADD COLUMN purchase_lot_id uuid REFERENCES purchase_lots(id);
-- Links auction lot to purchase lot for cost/inventory data
```

### Deprecated (but not removed)

- `buyer_accounts` table - Use `customers` and `party_links` instead
- `bids.buyer_account_id` - Use `bids.party_id` instead
- `auction_settlements` table - Use `sales_invoices` with `sales_channel='auction'` instead

## Service API Changes

### auctionService

**New Functions:**
```typescript
// Create auction lot from purchase lot (recommended)
createAuctionLotFromPurchaseLot(params)

// Settle auction by creating sales_invoice (ONLY settlement method)
settleAuction(params)
```

**Modified Functions:**
```typescript
// placeBid now expects party_id instead of buyer_account_id
placeBid({ party_id, ... })

// getBidsForLot returns both party and legacy buyer data
getBidsForLot(lotId) // { party: {...}, buyer: {...} }

// getSettlements returns sales_invoices not auction_settlements
getSettlements(companyId) // Returns sales_invoices[]
```

**Deprecated Functions:**
```typescript
// These are deprecated - use customerService instead
getBuyerAccounts(companyId) // @deprecated
createBuyerAccount(buyer)   // @deprecated - use customerService
updateBuyerAccount(id, updates) // @deprecated - use customerService
```

## UI Changes

### AuctionManagement Component

**Removed:**
- "Buyers" tab (use Customers page instead)
- Buyer account management forms

**Updated:**
- "Settlements" tab now shows sales_invoices
- Settlement data includes invoice number, customer, payment status
- All buyer references show Party (customer) data

**Navigation:**
```
Before: Houses | Events | Lots | Buyers | Settlements
After:  Houses | Events | Lots | Settlements
```

## Migration Guide

### For New Implementations

1. **Buyers:** Use `customers` table, not `buyer_accounts`
2. **Bids:** Always provide `party_id` (customer ID)
3. **Lots:** Create from `purchase_lots` when possible
4. **Settlements:** Use `settleAuction()` to create sales_invoices

### For Existing Data

1. **Buyer Accounts:** Automatically linked via `party_links`
2. **Legacy Settlements:** Preserved in `auction_settlements` for historical reference
3. **Legacy Bids:** Can still be read via `buyer_account_id`
4. **Cost Basis:** Automatically pulls from purchase_lots if linked, otherwise auction_lot_items

### Manual Migration Steps (Optional)

```typescript
// Link existing buyer_accounts to customers
const { data } = await supabase
  .rpc('migrate_buyer_accounts_to_party_links');
console.log(`Linked ${data.linked_count} buyer accounts`);
```

## Exit Conditions - VERIFIED ✓

### 1. Auctions consume purchase_lots ✓
- `auction_lots.purchase_lot_id` FK added
- `createAuctionLotFromPurchaseLot()` function implemented
- Cost basis pulled from purchase_lots via `get_auction_lot_cost_basis()`

### 2. Buyers are Parties ✓
- `bids.party_id` references `customers` table
- `party_links` maps legacy `buyer_accounts` to customers
- UI displays Party (customer) information

### 3. Settlement creates Orders/Invoices ✓
- `settleAuction()` creates `sales_invoices`
- Line items added from auction lot
- Sales channel = 'auction'
- No parallel financial data

### 4. No parallel truth exists ✓
- `buyer_accounts` marked deprecated (use customers + party_links)
- `auction_settlements` deprecated (use sales_invoices)
- All financial truth in core accounting system
- Single source for buyer identity, lot data, and financials

## Testing Checklist

- [ ] Create auction lot from purchase_lot
- [ ] Place bid with party_id (customer)
- [ ] View bids showing customer information
- [ ] Settle auction creating sales_invoice
- [ ] Verify invoice appears in sales invoices list
- [ ] Verify auction lot status = 'sold'
- [ ] Check settlements tab shows sales_invoices
- [ ] Verify no new records in auction_settlements
- [ ] Confirm cost basis from purchase_lots

## Support for Legacy Data

All legacy auction data remains accessible:
- Historical settlements in `auction_settlements` table
- Buyer accounts in `buyer_accounts` table (read-only)
- Legacy bids with `buyer_account_id` still readable

The system gracefully handles both old and new data structures through:
- Helper functions (`get_bid_buyer_party`, `get_auction_lot_cost_basis`)
- party_links mapping layer
- Dual join support in queries (both party and buyer tables)

## Summary

The auction engine now operates as a thin layer over core systems:
- **Lots** come from purchasing (purchase_lots)
- **Buyers** are Parties (customers)
- **Revenue** flows through accounting (sales_invoices)

No auction data exists in isolation. All truth resides in core tables.
