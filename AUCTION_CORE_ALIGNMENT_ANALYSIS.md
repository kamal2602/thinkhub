# Auction Engine - Core Alignment Analysis & Recommendations

## Executive Summary

**Current State:** Auction system has made progress toward zero parallel truth but still violates core architecture principles:
- ❌ Tied to single purchase_lot (cannot mix inventory from multiple lots)
- ❌ References `assets` directly instead of `inventory_items`
- ❌ Stores financial data (hammer_price, commission, net_proceeds) - parallel truth
- ❌ No sales order flow (jumps directly to invoices)
- ✅ Uses Party (customers) for buyer identity
- ✅ Blocks writes to legacy buyer_accounts

**Required State:** Auction must be a pure orchestration layer that references core entities:
- ✅ One auction can include items from multiple purchase_lots
- ✅ References `inventory_items` (not assets)
- ✅ Locks inventory during live auction
- ✅ Settlement creates Orders → Invoices (not direct invoices)
- ✅ Full traceability: purchase_lot → inventory_item → auction → order_line → invoice

---

## Critical Architecture Gap: Missing Sales Orders

### Problem
**User's Required Flow:**
```
purchase_lot → inventory_item → auction → order_line → invoice
```

**Current System:**
```
purchase_lot → assets → auction_lots → sales_invoice_items
                                     ↑ (NO ORDER LAYER)
```

**Tables Found:**
- ✅ `purchase_orders` + `purchase_order_lines` (for buying)
- ❌ `sales_orders` + `sales_order_lines` (MISSING - for selling)
- ✅ `sales_invoices` + `sales_invoice_items` (exists but premature)

### Impact
Without a sales order layer:
1. **No inventory reservation** - Items aren't locked for customer
2. **No order fulfillment workflow** - Direct invoice means direct payment requirement
3. **No order cancellation** - Cannot undo auction settlement without voiding invoices
4. **No order → invoice separation** - Order (commitment) vs Invoice (billing) collapsed
5. **Violates user's authority chain** - No `order_line` entity to reference

### Recommendation
**BEFORE implementing auction alignment, create sales order system:**

```sql
CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_number text NOT NULL,
  order_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'confirmed', 'fulfilled', 'cancelled')),
  sales_channel text, -- 'auction', 'direct', 'website', etc.
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, order_number)
);

CREATE TABLE sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  asset_id uuid REFERENCES assets(id), -- For serialized items
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL,
  cost_price numeric, -- From inventory_item or asset
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**Then update sales_invoices to reference orders:**
```sql
ALTER TABLE sales_invoices
  ADD COLUMN sales_order_id uuid REFERENCES sales_orders(id);
```

**Flow becomes:**
1. Auction settlement → Create `sales_order` (confirmed)
2. Order fulfillment → Create `sales_invoice` (billing)
3. Invoice payment → Update invoice.payment_status
4. Asset status update → Mark as 'sold'

---

## Current Auction Architecture Issues

### Issue 1: Single Purchase Lot Constraint

**Current Schema:**
```sql
auction_lots (
  id,
  purchase_lot_id uuid REFERENCES purchase_lots(id), -- ❌ ONE lot only
  ...
)
```

**Problem:**
- Cannot create auction with 10 laptops from Lot A + 5 monitors from Lot B
- Forces artificial lot consolidation or splitting
- Breaks natural inventory flow

**Solution:**
Remove `purchase_lot_id` from `auction_lots`, use junction table instead.

---

### Issue 2: Direct Asset References

**Current Schema:**
```sql
auction_lot_items (
  asset_id uuid REFERENCES assets(id),          -- ❌ Direct asset link
  component_id uuid REFERENCES harvested_components_inventory(id), -- ❌ Direct component link
  cost_basis numeric,  -- ❌ Duplicate cost data
  ...
)

assets (
  auction_lot_id uuid REFERENCES auction_lots(id)  -- ❌ Backward pointer
)
```

**Problems:**
1. **Bypasses inventory_items** - Assets should always go through inventory layer
2. **Duplicate cost tracking** - cost_basis stored in auction_lot_items AND assets
3. **Tight coupling** - Assets know about auctions, creates circular dependency
4. **Cannot handle bulk items** - Only works for serialized assets

**Core Architecture:**
```
✅ Correct:   purchase_lot → inventory_item → auction → order_line
❌ Current:   purchase_lot → asset → auction_lot_items
                                  ↑
                                  Bypass
```

**Solution:**
Reference `inventory_items` instead of `assets` directly.

---

### Issue 3: Financial Data in Auction Tables

**Current Schema:**
```sql
auction_lots (
  hammer_price numeric,        -- ❌ Financial truth
  buyer_premium numeric,        -- ❌ Financial truth
  total_price numeric,          -- ❌ Financial truth
  commission_rate numeric,      -- ❌ Financial truth
  commission_amount numeric,    -- ❌ Financial truth
  net_proceeds numeric,         -- ❌ Financial truth
  ...
)
```

**Problem:**
This is **parallel truth** - financial data exists in both:
- `auction_lots` (duplicate)
- `sales_invoices` (authoritative)

**Correct Architecture:**
- `auction_lots` = orchestration metadata only (status, timing, catalog info)
- `sales_orders` + `sales_invoices` = financial truth
- All pricing, costs, margins calculated from Core entities

**Solution:**
1. Mark these fields as deprecated (display-only for legacy data)
2. Stop writing to them in new settlements
3. Calculate all financial data from orders/invoices

---

### Issue 4: No Inventory Locking

**Current State:**
```sql
assets (
  status text,  -- Generic status, not reservation-aware
  reserved_for_order uuid  -- Exists but not used by auctions!
)

inventory_items (
  available_quantity int,
  reserved_quantity int  -- Exists but not updated by auctions!
)
```

**Problem:**
When auction goes live, inventory is not locked. Asset could be:
- Sold via direct sale while auction is running
- Added to another auction simultaneously
- Moved/scrapped while bids are active

**Solution:**
Implement proper inventory locking:

```sql
-- When auction status = 'live':
UPDATE inventory_items
SET
  reserved_quantity = reserved_quantity + qty,
  available_quantity = available_quantity - qty
WHERE id = auction_inventory_item_id;

UPDATE assets
SET
  reserved_for_order = auction_lot_id,
  reserved_at = now()
WHERE id IN (SELECT asset_id FROM auction_assets);

-- When auction closes (winner):
-- Lock transfers to sales_order via order_line

-- When auction closes (no sale):
-- Release lock back to available
```

---

## Recommended Architecture (Additive Only)

### Step 1: Create Sales Order System (PREREQUISITE)

See "Critical Architecture Gap" section above. This is **MANDATORY** before auction alignment.

---

### Step 2: Create Auction-Inventory Junction Table

**New Table:**
```sql
CREATE TABLE auction_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  auction_lot_id uuid NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),

  -- For serialized items (laptops, phones)
  asset_id uuid REFERENCES assets(id),

  -- Quantity (for bulk or components)
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Display metadata only (NOT financial truth)
  estimated_value numeric, -- For catalog display only
  description text, -- Override inventory_item name for auction catalog

  -- Tracking
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES profiles(id),

  UNIQUE(auction_lot_id, inventory_item_id, asset_id)
);

-- Enable RLS
ALTER TABLE auction_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auction items in their company"
  ON auction_inventory_items FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
```

**Why This Works:**
1. ✅ One auction can reference items from multiple purchase_lots
   - Inventory items already know their purchase_lot_id
   - Traceability preserved: auction → inventory_item → purchase_lot
2. ✅ Supports both serialized (assets) and bulk (inventory_items)
3. ✅ No cost duplication - all costing via inventory_items
4. ✅ Loose coupling - auction references inventory, not vice versa

---

### Step 3: Deprecate auction_lot_items (Read-Only)

**Database Changes:**
```sql
-- Prevent new writes (preserve legacy data)
CREATE TRIGGER prevent_auction_lot_items_insert
  BEFORE INSERT ON auction_lot_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_deprecated_table_write('auction_lot_items', 'Use auction_inventory_items instead');

CREATE TRIGGER prevent_auction_lot_items_update
  BEFORE UPDATE ON auction_lot_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_deprecated_table_write('auction_lot_items', 'Use auction_inventory_items instead');

-- Mark as deprecated
COMMENT ON TABLE auction_lot_items IS 'DEPRECATED: Read-only legacy table. Use auction_inventory_items instead. Writes blocked by trigger.';
```

**Service Layer:**
- Remove all INSERT/UPDATE to `auction_lot_items`
- Keep SELECT for legacy display only
- All new code uses `auction_inventory_items`

---

### Step 4: Remove Financial Fields from auction_lots

**Mark as Deprecated (Don't Delete):**
```sql
COMMENT ON COLUMN auction_lots.hammer_price IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders.';
COMMENT ON COLUMN auction_lots.buyer_premium IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders.';
COMMENT ON COLUMN auction_lots.total_price IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders.';
COMMENT ON COLUMN auction_lots.commission_amount IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders.';
COMMENT ON COLUMN auction_lots.net_proceeds IS 'DEPRECATED: Display-only legacy field. Financial truth in sales_orders.';
```

**Service Layer:**
- Stop writing to these fields in new settlements
- Read from sales_orders/invoices for financial data
- Keep fields for legacy data display only

---

### Step 5: Refactor settleAuction() to Use Orders

**New Settlement Flow:**

```typescript
async settleAuction(params: {
  companyId: string;
  auctionLotId: string;
  winnerId: string; // party_id (customer)
  hammerPrice: number;
  commission?: number;
  buyerPremium?: number;
}): Promise<SalesOrder> {
  const { companyId, auctionLotId, winnerId, hammerPrice, commission = 0, buyerPremium = 0 } = params;

  // 1. Get auction lot details
  const { data: lot, error: lotError } = await supabase
    .from('auction_lots')
    .select('*, auction_event:auction_events(event_name)')
    .eq('id', auctionLotId)
    .single();

  if (lotError) throw lotError;
  if (!lot) throw new Error('Auction lot not found');

  // 2. Get inventory items from junction table (authoritative source)
  const { data: auctionItems, error: itemsError } = await supabase
    .from('auction_inventory_items')
    .select(`
      *,
      inventory_item:inventory_items(
        id,
        name,
        cost_price,
        sku
      ),
      asset:assets(
        id,
        serial_number,
        purchase_cost
      )
    `)
    .eq('auction_lot_id', auctionLotId);

  if (itemsError) throw itemsError;
  if (!auctionItems || auctionItems.length === 0) {
    throw new Error('No items found for auction lot');
  }

  // 3. Calculate total cost basis from inventory items
  const totalCostBasis = auctionItems.reduce((sum, item) => {
    const costPerUnit = item.asset?.purchase_cost || item.inventory_item?.cost_price || 0;
    return sum + (costPerUnit * item.quantity);
  }, 0);

  // 4. Generate order number
  const orderNumber = await generateOrderNumber(companyId, 'AUC');

  // 5. Create sales order (financial truth)
  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert({
      company_id: companyId,
      customer_id: winnerId,
      order_number: orderNumber,
      order_date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      sales_channel: 'auction',
      total_amount: hammerPrice + buyerPremium,
      notes: `Auction Settlement - ${lot.auction_event?.event_name} - Lot ${lot.lot_number}`,
      metadata: {
        auction_lot_id: auctionLotId,
        hammer_price: hammerPrice,
        buyer_premium: buyerPremium,
        commission: commission,
        total_cost_basis: totalCostBasis
      }
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // 6. Create order lines for each inventory item
  const orderLines = auctionItems.map(item => ({
    order_id: order.id,
    inventory_item_id: item.inventory_item_id,
    asset_id: item.asset_id,
    quantity: item.quantity,
    unit_price: hammerPrice / auctionItems.length, // Distribute hammer price
    total_price: (hammerPrice / auctionItems.length) * item.quantity,
    cost_price: item.asset?.purchase_cost || item.inventory_item?.cost_price || 0
  }));

  const { error: linesError } = await supabase
    .from('sales_order_lines')
    .insert(orderLines);

  if (linesError) throw linesError;

  // 7. Transfer inventory locks from auction to order
  await supabase
    .from('assets')
    .update({
      reserved_for_order: order.id,
      status: 'sold'
    })
    .in('id', auctionItems.filter(i => i.asset_id).map(i => i.asset_id));

  // 8. Update auction lot status
  await supabase
    .from('auction_lots')
    .update({ status: 'sold' })
    .eq('id', auctionLotId);

  // 9. Mark winning bid
  await supabase
    .from('bids')
    .update({ is_winning: false })
    .eq('auction_lot_id', auctionLotId);

  await supabase
    .from('bids')
    .update({ is_winning: true })
    .eq('auction_lot_id', auctionLotId)
    .eq('party_id', winnerId)
    .order('bid_amount', { ascending: false })
    .limit(1);

  return order;
}
```

---

### Step 6: Implement Inventory Locking

**When Auction Goes Live:**
```typescript
async startAuction(auctionLotId: string): Promise<void> {
  // 1. Get all inventory items in this auction
  const { data: auctionItems } = await supabase
    .from('auction_inventory_items')
    .select('inventory_item_id, asset_id, quantity')
    .eq('auction_lot_id', auctionLotId);

  // 2. Lock assets (serialized items)
  const assetIds = auctionItems.filter(i => i.asset_id).map(i => i.asset_id);
  if (assetIds.length > 0) {
    await supabase
      .from('assets')
      .update({
        reserved_for_order: auctionLotId,
        reserved_at: new Date().toISOString()
      })
      .in('id', assetIds)
      .is('reserved_for_order', null); // Only lock if not already reserved
  }

  // 3. Lock inventory quantities (bulk items)
  for (const item of auctionItems) {
    await supabase.rpc('reserve_inventory', {
      p_inventory_item_id: item.inventory_item_id,
      p_quantity: item.quantity,
      p_reference_type: 'auction',
      p_reference_id: auctionLotId
    });
  }

  // 4. Mark auction as live
  await supabase
    .from('auction_lots')
    .update({
      status: 'live',
      start_time: new Date().toISOString()
    })
    .eq('id', auctionLotId);
}
```

**When Auction Ends Without Sale:**
```typescript
async closeAuctionNoSale(auctionLotId: string): Promise<void> {
  // 1. Release asset locks
  await supabase
    .from('assets')
    .update({
      reserved_for_order: null,
      reserved_at: null
    })
    .eq('reserved_for_order', auctionLotId);

  // 2. Release inventory locks
  const { data: auctionItems } = await supabase
    .from('auction_inventory_items')
    .select('inventory_item_id, quantity')
    .eq('auction_lot_id', auctionLotId);

  for (const item of auctionItems) {
    await supabase.rpc('release_inventory', {
      p_inventory_item_id: item.inventory_item_id,
      p_quantity: item.quantity
    });
  }

  // 3. Mark auction as closed
  await supabase
    .from('auction_lots')
    .update({
      status: 'closed',
      end_time: new Date().toISOString()
    })
    .eq('id', auctionLotId);
}
```

---

## Final Authority Chain (Target State)

```
PURCHASING FLOW:
1. purchase_order created with supplier (Party)
2. purchase_order_lines reference inventory_items (catalog)
3. Receiving creates assets (serialized) or updates inventory_items (bulk)
4. Assets linked to purchase_lot_id (cost basis authority)
5. Assets linked to inventory_item_id (catalog authority)

AUCTION FLOW:
6. Auction lot created (metadata only)
7. auction_inventory_items links to inventory_items + optional assets
8. Auction goes live → inventory locked (reserved_quantity updated)
9. Bids placed → bids.party_id references customers (Party)
10. Auction closes with winner → settleAuction()

SETTLEMENT FLOW:
11. sales_order created with customer (Party)
12. sales_order_lines created for each auction item
    - References inventory_item_id (catalog)
    - References asset_id (if serialized)
    - Cost from inventory_item or asset.purchase_cost
13. Inventory locks transfer from auction to order
14. sales_invoice created from sales_order (optional, for billing)
15. Assets marked as 'sold'

TRACEABILITY:
purchase_lot (cost source)
  ↓
inventory_item (catalog)
  ↓
auction_inventory_items (orchestration)
  ↓
sales_order_lines (commitment)
  ↓
sales_invoice_items (billing)
  ↓
asset status = 'sold'
```

---

## Migration Strategy (Safe, Additive)

### Phase 1: Foundation (PREREQUISITE)
1. ✅ Create `sales_orders` table
2. ✅ Create `sales_order_lines` table
3. ✅ Add `sales_order_id` to `sales_invoices`
4. ✅ Create inventory locking functions (`reserve_inventory`, `release_inventory`)

### Phase 2: Auction Tables
1. ✅ Create `auction_inventory_items` junction table
2. ✅ Add triggers to block writes to `auction_lot_items`
3. ✅ Add database comments marking financial fields as deprecated

### Phase 3: Service Layer
1. ✅ Refactor `settleAuction()` to create orders (not direct invoices)
2. ✅ Implement `startAuction()` with inventory locking
3. ✅ Implement `closeAuctionNoSale()` with lock release
4. ✅ Update all queries to use `auction_inventory_items` instead of `auction_lot_items`

### Phase 4: Data Migration (Optional)
1. ⚠️ Migrate existing `auction_lot_items` to `auction_inventory_items`
2. ⚠️ Create retroactive `sales_orders` for settled auctions (if needed)

### Phase 5: Cleanup (Future)
1. 🔮 Remove `assets.auction_lot_id` column (after verifying no dependencies)
2. 🔮 Remove `auction_lots.purchase_lot_id` column (after migration)

---

## Exit Conditions (Must All Be True)

### ✅ Data Model
- [ ] `auction_inventory_items` table exists
- [ ] `sales_orders` + `sales_order_lines` tables exist
- [ ] `auction_lot_items` writes blocked by trigger
- [ ] Financial fields in `auction_lots` marked deprecated

### ✅ Inventory Management
- [ ] Auction can include items from multiple purchase_lots
- [ ] Inventory locked when auction goes live
- [ ] Locks released if auction closes without sale
- [ ] Locks transferred to sales_order on settlement

### ✅ Settlement Flow
- [ ] `settleAuction()` creates sales_order (not direct invoice)
- [ ] Order lines reference inventory_items
- [ ] Cost basis from inventory_items or assets
- [ ] No financial data written to auction tables

### ✅ Traceability
- [ ] Full chain exists: purchase_lot → inventory_item → auction → order_line → invoice
- [ ] Each item traced back to original purchase_lot via inventory_item
- [ ] Costing always resolves to purchase_lot (via inventory_item)

### ✅ Party Integration
- [ ] All bids reference party_id (customers) ✅ DONE
- [ ] No buyer_accounts in business logic ✅ DONE
- [ ] party_links used for UI mapping only ✅ DONE

---

## Summary of Recommendations

### Immediate Actions Required:
1. **CREATE sales_orders system** - This is the critical missing piece
2. **CREATE auction_inventory_items** - Replaces auction_lot_items and asset references
3. **IMPLEMENT inventory locking** - Use reserved_quantity and reserved_for_order
4. **REFACTOR settleAuction()** - Create orders, not direct invoices
5. **DEPRECATE financial fields** - Mark as read-only in auction_lots

### Do NOT:
- ❌ Delete any tables (preserve legacy data)
- ❌ Modify purchase_lots (already authoritative for cost)
- ❌ Create parallel inventory tables
- ❌ Store financial truth in auction tables
- ❌ Reference assets directly (use inventory_items)

### Architecture Wins:
- ✅ Auction becomes pure orchestration layer
- ✅ One auction can sell from multiple purchase_lots
- ✅ Full traceability maintained
- ✅ Inventory properly locked and tracked
- ✅ Financial truth in core accounting (orders/invoices)
- ✅ Party abstraction respected throughout

This aligns auction engine with core architecture while preserving all existing data and functionality.
