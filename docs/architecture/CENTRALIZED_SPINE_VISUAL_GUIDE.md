# Visual Guide: Centralized Procurement Spine

## The Problem: Parallel Inbound Truths

### BEFORE (Current - WRONG) ❌

```
┌─────────────────────────────────────────────────────┐
│          THREE SEPARATE INBOUND SYSTEMS             │
└─────────────────────────────────────────────────────┘

System 1: Resale Purchasing
┌──────────────────┐
│ purchase_orders  │  ← For buying from suppliers
│ + purchase_lots  │
│ + receiving      │
│ + assets         │
└──────────────────┘
        ↓
    ✅ Works well


System 2: ITAD Projects
┌──────────────────┐
│ itad_projects    │  ← Separate inbound header!
│ (no lots)        │
│ (no std recv)    │
│ + ??? assets     │
└──────────────────┘
        ↓
    ❌ Disconnected


System 3: Recycling Orders
┌──────────────────┐
│ recycling_orders │  ← Separate inbound header!
│ (no lots)        │
│ (no std recv)    │
│ + ??? commodities│
└──────────────────┘
        ↓
    ❌ Disconnected
```

**Issues:**
- ❌ Can't answer "When did this arrive?" universally
- ❌ No unified receiving workflow
- ❌ Three different cost tracking systems
- ❌ Reports can't aggregate across types
- ❌ Duplicate code for each type

---

### AFTER (Required - CORRECT) ✅

```
┌─────────────────────────────────────────────────────┐
│         SINGLE CENTRALIZED PROCUREMENT SPINE        │
└─────────────────────────────────────────────────────┘

                  purchase_orders
                  (MASTER HEADER)
        ┌────────────────┴────────────────┐
        │         intake_type:            │
        │   resale | itad | recycling     │
        └────────────────┬────────────────┘
                         │
                         ├─► purchase_lots
                         │      (physical batches)
                         │           └─► Receiving
                         │                  └─► assets
                         │
                         ├─► itad_projects
                         │      (DETAIL, not header)
                         │
                         └─► recycling_orders
                                (DETAIL, not header)

ALL PATHS START WITH PROCUREMENT
```

**Benefits:**
- ✅ Single source of truth for "what arrived when"
- ✅ Unified receiving workflow
- ✅ Consistent cost/yield tracking
- ✅ Reports work across all types
- ✅ Reuse existing advanced import logic

---

## Data Flow Comparison

### Resale Flow: BEFORE vs AFTER

**BEFORE (Current - Works Well):**
```
User Action:
  Create Purchase Order
  ↓
purchase_orders created
  intake_type: (missing) → assume "resale"
  supplier_id: XYZ
  ↓
Trigger: auto_create_purchase_lots_for_pos
  ↓
purchase_lots created
  ↓
User: Navigate to Receiving
  ↓
SmartReceivingWorkflow
  Select PO/Lot → Import Excel → Scan → Complete
  ↓
assets created
  purchase_lot_id: ✓
  supplier_id: ✓
  intake_type: (missing)
  ↓
Processing queue
```

**AFTER (Enhanced):**
```
User Action:
  Procurement → Create Intake → Select "Resale"
  ↓
purchase_orders created
  intake_type: 'resale' ✓
  commercial_model: 'we_buy' ✓
  supplier_id: XYZ
  ↓
Trigger: auto_create_purchase_lots_for_pos
  ↓
purchase_lots created
  purchase_order_id: ✓
  receiving_status: 'waiting'
  ↓
User: Navigate to Receiving
  ↓
SmartReceivingWorkflow (UNCHANGED)
  Select Lot → Import Excel → Scan → Complete
  ↓
assets created
  purchase_lot_id: ✓
  purchase_order_id: ✓
  intake_type: 'resale' ✓ (inherited)
  ↓
Processing queue
  Filter: Resale ✓
```

**Impact:** ✅ Backward compatible + adds clarity

---

### ITAD Flow: BEFORE vs AFTER

**BEFORE (Current - Disconnected):**
```
User Action:
  ITAD Workspace → Create Project
  ↓
itad_projects created
  itad_customer_id: ABC
  expected_quantity: 100
  (NO purchase_order)
  (NO purchase_lot)
  ↓
??? How does equipment arrive? ???
  No standard receiving
  No cost tracking
  No traceability
  ↓
assets created somehow
  itad_project_id: ✓
  (No purchase_lot_id)
  (No purchase_order_id)
  (No intake_type)
  ↓
Processing queue
  Can't filter by ITAD
```

**AFTER (Integrated):**
```
User Action:
  Procurement → Create Intake → Select "ITAD"
  ↓
purchase_orders created
  intake_type: 'itad' ✓
  commercial_model: 'client_pays' ✓
  client_party_id: ABC (the customer sending equipment)
  supplier_id: NULL
  ↓
itad_projects created (DETAIL)
  purchase_order_id: ✓ (links to procurement)
  project_name: "ABC Corp Data Center Decom"
  commercial terms, service fees, etc.
  ↓
Trigger: auto_create_purchase_lots_for_pos
  ↓
purchase_lots created
  purchase_order_id: ✓
  receiving_status: 'waiting'
  ↓
User: Navigate to Receiving
  ↓
SmartReceivingWorkflow
  See "Incoming Batch: ITAD - ABC Corp"
  Select Lot → Scan serials → Complete
  ↓
assets created
  purchase_lot_id: ✓
  purchase_order_id: ✓
  intake_type: 'itad' ✓
  itad_project_id: ✓ (optional detail link)
  ↓
Processing queue
  Filter: ITAD ✓
  Wiping stage shown ✓
```

**Impact:** ✅ Fully integrated + traceable

---

### Recycling Flow: BEFORE vs AFTER

**BEFORE (Current - Disconnected):**
```
User Action:
  Recycling Workspace → Create Order
  ↓
recycling_orders created
  contact_id: DEF
  expected_weight: 500 kg
  (NO purchase_order)
  (NO purchase_lot)
  ↓
??? How does material arrive? ???
  ↓
commodities/outputs created somehow
  (No traceability to inbound)
```

**AFTER (Integrated):**
```
User Action:
  Procurement → Create Intake → Select "Recycling"
  ↓
purchase_orders created
  intake_type: 'recycling' ✓
  commercial_model: 'we_buy' or 'client_pays'
  supplier_id: DEF (commodity supplier)
    OR
  client_party_id: DEF (client sending scrap)
  ↓
recycling_orders created (DETAIL)
  purchase_order_id: ✓
  expected_weight: 500 kg
  processing_intent: 'recycle_only'
  ↓
Trigger: auto_create_purchase_lots_for_pos
  ↓
purchase_lots created
  purchase_order_id: ✓
  expected_weight_kg: 500
  receiving_status: 'waiting'
  ↓
User: Navigate to Receiving
  ↓
SmartReceivingWorkflow
  See "Incoming Batch: Recycling - DEF"
  Weigh batch → Scan items → Complete
  ↓
assets/commodities created
  purchase_lot_id: ✓
  purchase_order_id: ✓
  intake_type: 'recycling' ✓
  recycling_order_id: ✓
  ↓
Processing / Recycling queue
  Filter: Recycling ✓
  Dismantle → Commodities output
```

**Impact:** ✅ Unified receiving + weight tracking

---

## Schema Changes Visual

### purchase_orders (Extended)

**BEFORE:**
```sql
purchase_orders
├── id
├── company_id
├── po_number
├── supplier_id          ← Only for "suppliers"
├── order_date
├── status
├── total_amount
└── notes
```

**AFTER:**
```sql
purchase_orders
├── id
├── company_id
├── po_number
├── supplier_id          ← For resale (we_buy)
├── client_party_id      ← NEW: For ITAD/Recycling (client_pays)
├── intake_type          ← NEW: resale | itad | recycling
├── commercial_model     ← NEW: we_buy | client_pays | hybrid
├── processing_intent    ← NEW: resale | recycle | hybrid
├── source_channel       ← NEW: manual | excel | portal
├── compliance_profile   ← NEW: india | eu | us
├── order_date
├── status
├── total_amount
└── notes
```

**Impact:** ✅ Supports all inbound types

---

### purchase_lots (Enhanced)

**BEFORE:**
```sql
purchase_lots
├── id
├── company_id
├── lot_number
├── supplier_id          ← Direct link (redundant)
├── purchase_date
├── total_items
└── total_cost
```

**AFTER:**
```sql
purchase_lots
├── id
├── company_id
├── lot_number
├── purchase_order_id    ← NEW: Link to header
├── receiving_status     ← NEW: waiting | partial | complete
├── expected_qty         ← NEW: For reconciliation
├── expected_weight_kg   ← NEW: For recycling
├── actual_weight_kg     ← NEW: Actual received
├── purchase_date
├── total_items
└── total_cost
```

**Impact:** ✅ Traceable + receivable

---

### assets (Context Added)

**BEFORE:**
```sql
assets
├── id
├── company_id
├── serial_number
├── purchase_lot_id      ← Links to lot
├── supplier_id          ← Redundant (via lot)
├── brand, model, specs
└── processing_stage
```

**AFTER:**
```sql
assets
├── id
├── company_id
├── serial_number
├── purchase_lot_id      ← Links to lot
├── purchase_order_id    ← NEW: Direct procurement link
├── intake_type          ← NEW: resale | itad | recycling
├── itad_project_id      ← NEW: Optional detail link
├── recycling_order_id   ← NEW: Optional detail link
├── brand, model, specs
└── processing_stage
```

**Impact:** ✅ Full traceability + filtering

---

### itad_projects (Becomes DETAIL)

**BEFORE:**
```sql
itad_projects
├── id
├── company_id
├── project_number
├── itad_customer_id     ← No link to procurement!
├── expected_quantity
├── service_fee
└── status
```

**AFTER:**
```sql
itad_projects
├── id
├── company_id
├── purchase_order_id    ← NEW: Links to procurement!
├── project_number
├── project_name
├── expected_quantity
├── service_fee
├── revenue_share_percentage
└── status
```

**Semantic Change:**
- Before: itad_project = inbound header ❌
- After: itad_project = commercial detail linked to procurement ✅

---

### recycling_orders (Becomes DETAIL)

**BEFORE:**
```sql
recycling_orders
├── id
├── company_id
├── order_number
├── contact_id           ← No link to procurement!
├── expected_weight
└── status
```

**AFTER:**
```sql
recycling_orders
├── id
├── company_id
├── purchase_order_id    ← NEW: Links to procurement!
├── order_number
├── expected_weight
├── total_weight
├── processing_intent
└── status
```

**Semantic Change:**
- Before: recycling_order = inbound header ❌
- After: recycling_order = processing detail linked to procurement ✅

---

## UI Flow Comparison

### Creating an Intake: BEFORE vs AFTER

**BEFORE (Fragmented):**
```
For Resale:
  Go to: Purchase Orders
  Click: + Create PO
  Form: Supplier, items, cost
  Result: purchase_order created

For ITAD:
  Go to: ITAD Workspace
  Click: + Create Project
  Form: Client, service type, fees
  Result: itad_project created (disconnected)

For Recycling:
  Go to: Recycling Workspace
  Click: + Create Order
  Form: Contact, weight
  Result: recycling_order created (disconnected)
```

**User confusion:** "Where do I go to record incoming equipment?"

---

**AFTER (Unified):**
```
For ANY type:
  Go to: Procurement
  Click: + Create Intake
  Wizard:
    Step 1: Select Type
      ○ Resale (buy from supplier)
      ○ ITAD (client sends for destruction)
      ○ Recycling (commodity intake)

    Step 2: Enter Details
      If Resale: Supplier, expected delivery, pricing
      If ITAD: Client, project name, service terms
      If Recycling: Source, expected weight, intent

    Step 3: Import (optional)
      Excel with serials/specs

  Result:
    → purchase_order created (intake_type set)
    → detail record created (itad_project OR recycling_order)
    → purchase_lot auto-created
    → Ready for receiving
```

**User clarity:** "One place for all inbound!"

---

### Receiving: BEFORE vs AFTER

**BEFORE (Resale only):**
```
Receiving App:
  Show: Purchase orders with status != received
  Select: PO-001
  Scan: Serials
  Result: Assets created
```

For ITAD/Recycling: ???

---

**AFTER (All types):**
```
Receiving App:
  Show: Incoming Batches (purchase_lots)

  Filter:
    ☐ Resale
    ☐ ITAD
    ☐ Recycling

  Batch List:
    ┌────────────────────────────────────┐
    │ [RESALE] LOT-001                   │
    │ From: Dell Supplier                │
    │ Expected: 50 units                 │
    │ Status: Waiting                    │
    └────────────────────────────────────┘

    ┌────────────────────────────────────┐
    │ [ITAD] LOT-002                     │
    │ Client: ABC Corp                   │
    │ Expected: 100 units                │
    │ Status: Partial (30/100)           │
    └────────────────────────────────────┘

    ┌────────────────────────────────────┐
    │ [RECYCLING] LOT-003                │
    │ From: E-Waste Collector            │
    │ Expected: 500 kg                   │
    │ Status: Waiting                    │
    └────────────────────────────────────┘

  Select Any → Same Workflow:
    Scan/Import → Reconcile → Complete
```

**Warehouse worker:** "I just pick a batch and receive it. Simple!"

---

### Processing: BEFORE vs AFTER

**BEFORE (Mixed, no context):**
```
Processing Queue:
  [Asset A - Laptop] Received
  [Asset B - Server] Testing
  [Asset C - Laptop] Received
  [Asset D - HDD] Grading

Can't tell:
  - Which is ITAD (needs wiping)?
  - Which is recycling (skip grading)?
  - Which is resale (needs sales pricing)?
```

---

**AFTER (Filtered, clear context):**
```
Processing Queue:
  Filter: [All] [Resale] [ITAD] [Recycling]

When filtering "ITAD":
  ┌────────────────────────────────────┐
  │ [ITAD] Asset B - Dell Server       │
  │ Serial: ABC123                     │
  │ Project: ABC Corp Decom            │
  │ Stage: Testing → Wiping → QA       │
  │                    ^                │
  │               (shown per policy)   │
  └────────────────────────────────────┘

When filtering "Recycling":
  ┌────────────────────────────────────┐
  │ [RECYCLING] Asset D - HDD 2TB      │
  │ Serial: XYZ789                     │
  │ Order: REC-005                     │
  │ Stage: Received → Dismantle        │
  │         (skip testing/grading)     │
  └────────────────────────────────────┘

When filtering "Resale":
  ┌────────────────────────────────────┐
  │ [RESALE] Asset A - HP Laptop       │
  │ Serial: DEF456                     │
  │ Lot: LOT-001                       │
  │ Stage: Testing → Grading → QA      │
  │         (normal flow)              │
  └────────────────────────────────────┘
```

**Technician:** "I can focus on my type of work!"

---

## Traceability Comparison

### Question: "Where did this asset come from?"

**BEFORE:**
```
If asset.purchase_lot_id exists:
  → Query purchase_lots
    → Query supplier (if exists)
    → Answer: "Bought from XYZ on date"

If asset.itad_project_id exists:
  → Query itad_projects
    → Query customer
    → Answer: "ITAD project from ABC Corp"
    → BUT: No purchase_order link
    → Can't answer: "When arrived?" "How much cost?"

If neither:
  → Answer: "Unknown origin" ❌
```

---

**AFTER:**
```
Every asset has:
  - purchase_order_id (direct or via lot)
  - intake_type

Query:
  asset → purchase_order → intake_type check

If intake_type = 'resale':
  → supplier.name + order_date + cost

If intake_type = 'itad':
  → client.name + order_date
  → itad_project.project_name
  → service_fee (revenue, not cost)

If intake_type = 'recycling':
  → supplier.name or client.name + order_date
  → recycling_order.order_number
  → weight_kg

Answer: "Full traceability from inbound to outbound" ✅
```

---

## Reports Comparison

### Report: "Yield by Inbound Batch"

**BEFORE:**
```sql
-- Can only do for resale
SELECT
  pl.lot_number,
  COUNT(a.id) AS units_received,
  SUM(a.unit_cost) AS total_cost,
  SUM(si.selling_price) AS total_revenue,
  (SUM(si.selling_price) - SUM(a.unit_cost)) AS profit
FROM purchase_lots pl
JOIN assets a ON a.purchase_lot_id = pl.id
LEFT JOIN sales_invoice_items si ON si.asset_id = a.id
GROUP BY pl.lot_number;

-- Can't do for ITAD (no lot)
-- Can't do for Recycling (no lot)
```

---

**AFTER:**
```sql
-- Works for ALL types
SELECT
  po.po_number,
  po.intake_type,
  pl.lot_number,

  -- Common metrics
  COUNT(a.id) AS units_received,
  SUM(a.unit_cost) AS cost_basis,

  -- Resale revenue
  SUM(CASE WHEN po.intake_type = 'resale'
    THEN si.selling_price ELSE 0 END) AS resale_revenue,

  -- ITAD service fees
  SUM(CASE WHEN po.intake_type = 'itad'
    THEN ip.service_fee ELSE 0 END) AS itad_service_revenue,

  -- Recycling commodity value
  SUM(CASE WHEN po.intake_type = 'recycling'
    THEN co.commodity_value ELSE 0 END) AS recycling_commodity_revenue,

  -- Unified profit
  (resale_revenue + itad_service_revenue + recycling_commodity_revenue - cost_basis) AS profit

FROM purchase_orders po
JOIN purchase_lots pl ON pl.purchase_order_id = po.id
JOIN assets a ON a.purchase_lot_id = pl.id
LEFT JOIN sales_invoice_items si ON si.asset_id = a.id
LEFT JOIN itad_projects ip ON ip.purchase_order_id = po.id
LEFT JOIN commodity_outputs co ON co.recycling_order_id IN (
  SELECT id FROM recycling_orders WHERE purchase_order_id = po.id
)
GROUP BY po.po_number, po.intake_type, pl.lot_number;
```

**Impact:** ✅ Unified P&L across all business models

---

## Key Architectural Principles

### 1. Single Source of Truth

```
❌ WRONG:
  Three inbound systems = three truths

✅ CORRECT:
  purchase_orders = THE inbound header
  Everything else links to it
```

---

### 2. Headers vs Details

```
❌ WRONG:
  itad_projects = inbound header
  recycling_orders = inbound header

✅ CORRECT:
  itad_projects = commercial detail (service terms)
  recycling_orders = processing detail (outputs)

  Both link to: purchase_order (the actual inbound event)
```

---

### 3. Unified Receiving

```
❌ WRONG:
  Receiving only works for purchase_orders
  ITAD/Recycling have separate receiving

✅ CORRECT:
  All inbound goes through purchase_lots
  SmartReceivingWorkflow handles all types
  Same scan/reconcile/complete process
```

---

### 4. Context Propagation

```
❌ WRONG:
  Assets don't know their intake_type
  Processing can't filter appropriately

✅ CORRECT:
  intake_type propagates:
    purchase_order → purchase_lot → asset

  Enables:
    - Filtered processing queues
    - Type-specific workflows
    - Accurate reporting
```

---

### 5. No Parallel Truths

```
❌ WRONG:
  "When did this arrive?"
    → Check purchase_orders
    → Check itad_projects
    → Check recycling_orders
    → ???

✅ CORRECT:
  "When did this arrive?"
    → purchase_orders.order_date
    → ONE answer, always
```

---

## Migration Path

### Step 1: Extend Schema (Safe)
```sql
-- Add columns to existing tables
-- All nullable initially
-- Backfill with defaults
-- Add NOT NULL constraints after backfill
```

### Step 2: Backfill Data
```sql
-- Create retroactive purchase_orders for orphaned records
-- Link existing itad_projects
-- Link existing recycling_orders
-- Propagate intake_type to assets
```

### Step 3: Update Services
```typescript
// Create ProcurementService
// Update ReceivingService to use intake_type
// Update ProcessingService to filter
```

### Step 4: Update UI
```typescript
// Create IntakeWizard
// Update Receiving to show badges
// Update Processing to filter
// Update ITAD/Recycling to link
```

### Step 5: Validate
```
- Run acceptance tests
- Verify no orphaned records
- Check report accuracy
- User testing
```

---

## Success Metrics

### Before Implementation:
- 3 inbound systems
- 2 disconnected (ITAD, Recycling)
- Reports incomplete
- User confusion

### After Implementation:
- ✅ 1 unified inbound system
- ✅ All types integrated
- ✅ Complete traceability
- ✅ Clear user paths
- ✅ Accurate reporting

---

## Conclusion

**The Rule:**
> Every inbound flow—resale, ITAD, or recycling—MUST create a purchase_order with intake_type.
>
> purchase_lots are the physical batches for receiving.
>
> Receiving ALWAYS starts from a lot.
>
> itad_projects and recycling_orders are DETAIL records, not headers.
>
> One truth for "what came in when" = purchase_orders.

**The Benefit:**
- Unified workflow
- Complete traceability
- Accurate reporting
- User clarity
- System maintainability

**Next Step:**
Approve and implement! 🚀
