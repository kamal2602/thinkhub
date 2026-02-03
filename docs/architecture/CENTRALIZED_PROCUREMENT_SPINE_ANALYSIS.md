# Centralized Procurement Spine: Analysis & Implementation Plan

**Date:** 2026-02-03
**Critical Requirement:** Use existing advanced purchase module as SINGLE inbound spine

---

## Executive Summary

### The Problem: Parallel Inbound Truths ❌

**Current Architecture (WRONG):**
```
┌─────────────────────┐
│ purchase_orders     │  ← Resale purchasing
│ + purchase_lots     │
└─────────────────────┘

┌─────────────────────┐
│ itad_projects       │  ← ITAD inbound (parallel truth!)
└─────────────────────┘

┌─────────────────────┐
│ recycling_orders    │  ← Recycling inbound (parallel truth!)
└─────────────────────┘
```

**Issue:** Three separate inbound header systems = data chaos

---

### The Solution: Single Procurement Spine ✅

**Required Architecture:**
```
┌──────────────────────────────────────────────┐
│         purchase_orders (MASTER)             │
│  + intake_type: resale | itad | recycling    │
│  + commercial_model: we_buy | client_pays    │
│  + processing_intent: resale | recycle       │
└──────────┬───────────────────────────────────┘
           │
           ├─► purchase_lots (physical batches)
           │       └─► Receiving
           │              └─► Processing
           │
           ├─► itad_projects (DETAIL, not header)
           │       Links to: purchase_order_id
           │
           └─► recycling_orders (DETAIL, not header)
                   Links to: purchase_order_id
```

**Principle:** One inbound header to rule them all

---

## Current State Audit

### 1. Existing Tables Analysis

#### purchase_orders ✅ (Advanced System Exists)

**Schema:**
```sql
CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL,  -- ⚠️ Assumes "supplier" concept
  order_date date,
  expected_delivery_date date,
  status text, -- draft, submitted, partial, received, closed
  subtotal, tax_amount, shipping_cost, total_amount
  total_items_ordered, total_items_received
  notes, tracking_number
  created_at, created_by
);
```

**Missing Fields:**
- ❌ `intake_type` (resale | itad | recycling)
- ❌ `commercial_model` (we_buy | client_pays | hybrid)
- ❌ `processing_intent` (resale | recycle | hybrid)
- ❌ `client_party_id` (for ITAD/customer-sends scenarios)
- ❌ `source_channel` (manual | excel | portal | website)
- ❌ `compliance_profile` (india | eu | us)

**Current Usage:**
- ✅ SmartPOImport.tsx (110KB advanced Excel import)
- ✅ PurchaseOrders.tsx (list view)
- ✅ PurchaseOrderForm.tsx (creation)

---

#### purchase_lots ✅ (Batch/Shipment Container)

**Schema:**
```sql
CREATE TABLE purchase_lots (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  lot_number text NOT NULL,
  supplier_id uuid,  -- ⚠️ Direct supplier link (should be via PO)
  purchase_date date NOT NULL,
  total_items int DEFAULT 0,
  total_cost decimal DEFAULT 0,
  notes text,
  created_at, created_by
);
```

**Missing Fields:**
- ❌ `purchase_order_id` foreign key (⚠️ CRITICAL)
- ❌ `receiving_status` (waiting | partial | complete)
- ❌ `expected_qty`, `expected_weight` (for reconciliation)
- ❌ `intake_type` (inherited from PO)

**Current Auto-Creation:**
- ✅ Trigger exists: `auto_create_purchase_lots_for_pos`
- ✅ Creates lot automatically when PO submitted

---

#### expected_receiving_items ✅ (Line Item Detail)

**Schema:**
```sql
CREATE TABLE expected_receiving_items (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  purchase_order_id uuid NOT NULL,  -- ✅ Links to PO
  serial_number text NOT NULL,
  brand, model, expected_specs JSONB,
  unit_cost numeric,
  status text, -- awaiting | received | missing
  receiving_log_id uuid,  -- When received
  asset_id uuid,  -- Final asset created
  ...
);
```

**Status:** ✅ Good, already links to PO

---

#### assets ⚠️ (Final Inventory Record)

**Schema:**
```sql
CREATE TABLE assets (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  serial_number text UNIQUE,
  brand, model, product_type_id
  purchase_lot_id uuid,  -- ✅ Links to lot
  supplier_id uuid,  -- ⚠️ Redundant (via lot->PO)
  unit_cost numeric,
  processing_stage text,
  cosmetic_grade, functional_status
  specs JSONB,
  ...
);
```

**Missing Fields:**
- ❌ `intake_type` (resale | itad | recycling) ← CRITICAL
- ❌ `purchase_order_id` (direct link, not just via lot)
- ❌ `itad_project_id` (optional detail link)
- ❌ `recycling_order_id` (optional detail link)

---

#### itad_projects ❌ (PARALLEL INBOUND HEADER - WRONG!)

**Schema:**
```sql
CREATE TABLE itad_projects (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  project_number text NOT NULL,
  project_name text,
  itad_customer_id uuid NOT NULL,  -- ⚠️ Separate from procurement
  service_type text,
  expected_quantity int,
  actual_quantity int,
  service_fee decimal,
  revenue_share_percentage decimal,
  status text,
  start_date, completion_date,
  ...
);
```

**Issue:** Acts as inbound header, but should be DETAIL record

**What it should be:**
- Link to `purchase_order_id` (the actual inbound)
- Store ITAD-specific commercial terms
- NOT create separate inventory truth

---

#### recycling_orders ❌ (PARALLEL INBOUND HEADER - WRONG!)

**Schema:**
```sql
CREATE TABLE recycling_orders (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  order_number text NOT NULL,
  contact_id uuid,  -- ⚠️ Separate from procurement
  order_date date,
  processing_intent text,  -- recycle_only | hybrid_resale
  expected_weight numeric,
  total_weight numeric,
  status text,
  ...
);
```

**Issue:** Acts as inbound header, but should be DETAIL record

**What it should be:**
- Link to `purchase_order_id` (the actual inbound)
- Store recycling-specific details
- NOT create separate inventory truth

---

### 2. Data Flow Analysis

#### Current Flow: Resale (CORRECT) ✅
```
User creates PO
  ↓
SmartPOImport: Excel with serials + specs
  ↓
purchase_orders created (status: draft)
  ↓
Trigger auto-creates purchase_lot
  ↓
expected_receiving_items populated
  ↓
User goes to Receiving (SmartReceivingWorkflow)
  ↓
Selects purchase_lot
  ↓
Scans serials
  ↓
Creates assets with:
  - purchase_lot_id ✓
  - supplier_id (from PO) ✓
  - specs (from expected) ✓
  ↓
Processing queue
```

**Status:** ✅ This flow is correct and comprehensive

---

#### Current Flow: ITAD (WRONG) ❌
```
User creates itad_project
  ↓
Stores customer_id, service terms
  ↓
??? How does equipment arrive? ???
  ↓
No purchase_order created
No purchase_lot created
No standard receiving
  ↓
Assets created... how?
  - No lot traceability
  - No cost basis
  - Disconnected from procurement
```

**Status:** ❌ Parallel system, not integrated

---

#### Current Flow: Recycling (WRONG) ❌
```
User creates recycling_order
  ↓
Stores contact_id, weight expectations
  ↓
??? How does material arrive? ???
  ↓
No purchase_order created
No purchase_lot created
No standard receiving
  ↓
Assets/commodities created... how?
  - No lot traceability
  - No cost basis
  - Disconnected from procurement
```

**Status:** ❌ Parallel system, not integrated

---

### 3. UI Component Audit

#### Procurement Components ✅

**Files:**
- `PurchaseOrders.tsx` (18KB list view)
- `PurchaseOrderForm.tsx` (25KB creation)
- `SmartPOImport.tsx` (54KB advanced Excel import)
- `PurchaseOrdersList.tsx` (14KB)

**Current Limitations:**
- Only handles "resale" concept
- No intake_type selection
- No ITAD/Recycling mode
- Assumes "supplier" = vendor (not client)

---

#### Receiving Component ✅

**File:**
- `SmartReceivingWorkflow.tsx` (110KB comprehensive)

**Current Features:**
- ✅ Select PO or Lot
- ✅ Excel re-import with column mapping
- ✅ Serial scanning
- ✅ Discrepancy tracking
- ✅ Bonus item handling
- ✅ Auto-creates assets

**Limitations:**
- No intake_type awareness
- No ITAD/Recycling-specific fields

---

#### Processing Component ⚠️

**File:**
- `Processing.tsx` (115KB)

**Current Features:**
- ✅ Kanban stages
- ✅ Asset cards
- ✅ Filtering by various fields

**Missing:**
- ❌ Filter by intake_type
- ❌ Stage gating per type
- ❌ Wiping policy

---

#### ITAD Components ❌

**File:**
- `ITADWorkspace.tsx` (94KB)

**Current Features:**
- Projects list
- Certificates
- Data sanitization
- Revenue settlements

**Issue:**
- Creates itad_projects independently
- Not using procurement spine

---

#### Recycling Components ❌

**File:**
- `RecyclingWorkspace.tsx` (23KB)

**Current Features:**
- Order list
- Inspection
- Outcomes

**Issue:**
- Creates recycling_orders independently
- Not using procurement spine

---

## Required Changes

### Phase 1: Database Schema Alignment ⚠️ CRITICAL

#### 1.1: Extend purchase_orders

```sql
-- Migration: extend_purchase_orders_for_intake_types.sql

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS intake_type text
    CHECK (intake_type IN ('resale', 'itad', 'recycling'))
    DEFAULT 'resale',

  ADD COLUMN IF NOT EXISTS commercial_model text
    CHECK (commercial_model IN ('we_buy', 'client_pays', 'hybrid'))
    DEFAULT 'we_buy',

  ADD COLUMN IF NOT EXISTS processing_intent text
    CHECK (processing_intent IN ('resale', 'recycle', 'hybrid'))
    DEFAULT 'resale',

  ADD COLUMN IF NOT EXISTS client_party_id uuid
    REFERENCES contacts(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS source_channel text
    CHECK (source_channel IN ('manual', 'excel', 'portal', 'website', 'api'))
    DEFAULT 'manual',

  ADD COLUMN IF NOT EXISTS compliance_profile text
    DEFAULT 'india';

COMMENT ON COLUMN purchase_orders.intake_type IS
  'Type of inbound: resale (buying to resell), itad (client sends for destruction), recycling (bulk commodities)';

COMMENT ON COLUMN purchase_orders.commercial_model IS
  'Who pays: we_buy (we pay supplier), client_pays (client pays us for service), hybrid (rev share)';

COMMENT ON COLUMN purchase_orders.processing_intent IS
  'What we do: resale (refurb & sell), recycle (dismantle for commodities), hybrid (cherry-pick then recycle)';

COMMENT ON COLUMN purchase_orders.client_party_id IS
  'For ITAD/Recycling: the customer/client sending equipment. For Resale: optional end-customer reference.';

COMMENT ON COLUMN purchase_orders.source_channel IS
  'How this intake was created: manual (UI), excel (bulk import), portal (customer self-service), website (public form)';
```

**Acceptance:**
- [ ] All intake types can be created via purchase_orders
- [ ] supplier_id is NULL for client_pays models (use client_party_id instead)
- [ ] Existing resale POs unaffected (default values)

---

#### 1.2: Extend purchase_lots

```sql
-- Migration: extend_purchase_lots_for_receiving_status.sql

ALTER TABLE purchase_lots
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE CASCADE,

  ADD COLUMN IF NOT EXISTS receiving_status text
    CHECK (receiving_status IN ('waiting', 'partial', 'complete'))
    DEFAULT 'waiting',

  ADD COLUMN IF NOT EXISTS expected_qty int,

  ADD COLUMN IF NOT EXISTS expected_weight_kg numeric(10,2),

  ADD COLUMN IF NOT EXISTS actual_weight_kg numeric(10,2);

-- Backfill purchase_order_id if possible (via receiving_logs or assets)
UPDATE purchase_lots pl
SET purchase_order_id = (
  SELECT po.id
  FROM purchase_orders po
  WHERE po.supplier_id = pl.supplier_id
    AND po.order_date = pl.purchase_date
  LIMIT 1
)
WHERE purchase_order_id IS NULL;

COMMENT ON COLUMN purchase_lots.purchase_order_id IS
  'Link to parent procurement record (the commercial agreement)';

COMMENT ON COLUMN purchase_lots.receiving_status IS
  'waiting (not started), partial (some items received), complete (all received or closed)';
```

**Acceptance:**
- [ ] Every lot links to a PO
- [ ] Receiving status trackable
- [ ] Weight tracking for recycling

---

#### 1.3: Extend assets

```sql
-- Migration: add_intake_type_to_assets.sql

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS intake_type text
    CHECK (intake_type IN ('resale', 'itad', 'recycling')),

  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS itad_project_id uuid
    REFERENCES itad_projects(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS recycling_order_id uuid
    REFERENCES recycling_orders(id) ON DELETE SET NULL;

-- Backfill intake_type from purchase_lot -> purchase_order
UPDATE assets a
SET
  intake_type = COALESCE(
    (SELECT po.intake_type
     FROM purchase_orders po
     JOIN purchase_lots pl ON pl.purchase_order_id = po.id
     WHERE pl.id = a.purchase_lot_id),
    'resale'  -- Default for old data
  ),
  purchase_order_id = (
    SELECT pl.purchase_order_id
    FROM purchase_lots pl
    WHERE pl.id = a.purchase_lot_id
  )
WHERE intake_type IS NULL;

COMMENT ON COLUMN assets.intake_type IS
  'Inherited from purchase_order: resale (buy-to-resell), itad (client-owned for destruction), recycling (commodity)';

COMMENT ON COLUMN assets.purchase_order_id IS
  'Direct link to procurement record for traceability';
```

**Acceptance:**
- [ ] Every asset has intake_type
- [ ] Assets link to PO (not just lot)
- [ ] ITAD/Recycling projects link as DETAIL

---

#### 1.4: Refactor itad_projects ⚠️ BREAKING

```sql
-- Migration: refactor_itad_projects_as_detail.sql

-- Add link to procurement
ALTER TABLE itad_projects
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- For existing projects, try to create retroactive POs
DO $$
DECLARE
  project_rec RECORD;
  new_po_id uuid;
BEGIN
  FOR project_rec IN
    SELECT * FROM itad_projects WHERE purchase_order_id IS NULL
  LOOP
    -- Create a purchase_order for this ITAD project
    INSERT INTO purchase_orders (
      company_id,
      po_number,
      intake_type,
      commercial_model,
      client_party_id,
      order_date,
      status,
      notes
    ) VALUES (
      project_rec.company_id,
      'ITAD-' || project_rec.project_number,
      'itad',
      'client_pays',  -- Assume ITAD is client_pays
      project_rec.itad_customer_id,
      project_rec.start_date,
      CASE
        WHEN project_rec.status = 'completed' THEN 'closed'
        WHEN project_rec.status = 'in_progress' THEN 'submitted'
        ELSE 'draft'
      END,
      'Auto-created from legacy ITAD project: ' || project_rec.project_name
    )
    RETURNING id INTO new_po_id;

    -- Link project to PO
    UPDATE itad_projects
    SET purchase_order_id = new_po_id
    WHERE id = project_rec.id;
  END LOOP;
END $$;

-- Make it required going forward
ALTER TABLE itad_projects
  ALTER COLUMN purchase_order_id SET NOT NULL;

COMMENT ON COLUMN itad_projects.purchase_order_id IS
  'ITAD project is a DETAIL record linked to a procurement (intake_type=itad)';
```

**Acceptance:**
- [ ] Every itad_project links to a purchase_order
- [ ] New ITAD intakes create PO first, then project detail
- [ ] Assets created via ITAD link to both

---

#### 1.5: Refactor recycling_orders ⚠️ BREAKING

```sql
-- Migration: refactor_recycling_orders_as_detail.sql

-- Add link to procurement
ALTER TABLE recycling_orders
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- For existing orders, create retroactive POs
DO $$
DECLARE
  order_rec RECORD;
  new_po_id uuid;
BEGIN
  FOR order_rec IN
    SELECT * FROM recycling_orders WHERE purchase_order_id IS NULL
  LOOP
    INSERT INTO purchase_orders (
      company_id,
      po_number,
      intake_type,
      commercial_model,
      processing_intent,
      client_party_id,
      order_date,
      status,
      notes
    ) VALUES (
      order_rec.company_id,
      'REC-' || order_rec.order_number,
      'recycling',
      CASE
        WHEN order_rec.contact_id IS NOT NULL THEN 'client_pays'
        ELSE 'we_buy'
      END,
      order_rec.processing_intent,
      order_rec.contact_id,
      order_rec.order_date,
      CASE
        WHEN order_rec.status = 'completed' THEN 'closed'
        WHEN order_rec.status = 'in_progress' THEN 'submitted'
        ELSE 'draft'
      END,
      'Auto-created from legacy recycling order'
    )
    RETURNING id INTO new_po_id;

    UPDATE recycling_orders
    SET purchase_order_id = new_po_id
    WHERE id = order_rec.id;
  END LOOP;
END $$;

ALTER TABLE recycling_orders
  ALTER COLUMN purchase_order_id SET NOT NULL;

COMMENT ON COLUMN recycling_orders.purchase_order_id IS
  'Recycling order is a DETAIL record linked to a procurement (intake_type=recycling)';
```

**Acceptance:**
- [ ] Every recycling_order links to a purchase_order
- [ ] New recycling intakes create PO first, then detail
- [ ] Commodities/outputs link to recycling_order (which links to PO)

---

### Phase 2: Service Layer Updates

#### 2.1: ProcurementService (NEW)

```typescript
// src/services/procurementService.ts

export type IntakeType = 'resale' | 'itad' | 'recycling';
export type CommercialModel = 'we_buy' | 'client_pays' | 'hybrid';
export type ProcessingIntent = 'resale' | 'recycle' | 'hybrid';

export interface CreateIntakeParams {
  intakeType: IntakeType;
  commercialModel: CommercialModel;
  processingIntent: ProcessingIntent;

  // For resale (we_buy):
  supplierId?: string;

  // For ITAD/Recycling (client_pays):
  clientPartyId?: string;

  // Common:
  expectedDeliveryDate?: string;
  notes?: string;
  sourceChannel?: 'manual' | 'excel' | 'portal' | 'website';

  // Optional: Excel data for immediate import
  excelData?: {
    fileName: string;
    parsedData: any;
    mappings: any[];
  };
}

export class ProcurementService {
  async createIntake(params: CreateIntakeParams) {
    // 1. Create purchase_order with intake_type
    const po = await this.createPurchaseOrder({
      intake_type: params.intakeType,
      commercial_model: params.commercialModel,
      processing_intent: params.processingIntent,
      supplier_id: params.supplierId,
      client_party_id: params.clientPartyId,
      source_channel: params.sourceChannel || 'manual',
      ...
    });

    // 2. Auto-create purchase_lot (trigger handles this)

    // 3. If ITAD, create itad_project detail
    if (params.intakeType === 'itad') {
      await this.createITADProjectDetail(po.id, params);
    }

    // 4. If Recycling, create recycling_order detail
    if (params.intakeType === 'recycling') {
      await this.createRecyclingOrderDetail(po.id, params);
    }

    // 5. If Excel data provided, import immediately
    if (params.excelData) {
      await this.importExpectedItems(po.id, params.excelData);
    }

    return po;
  }

  async getInboundBatches(filters: {
    intakeType?: IntakeType;
    status?: string;
    dateRange?: [string, string];
  }) {
    // Query purchase_lots JOIN purchase_orders
    // Filter by intake_type, receiving_status
    // Return unified view for Receiving app
  }
}
```

---

#### 2.2: Update Receiving Service

```typescript
// src/services/receivingService.ts

// Ensure all receiving goes through purchase_lots
async startReceiving(lotId: string) {
  const lot = await supabase
    .from('purchase_lots')
    .select(`
      *,
      purchase_order:purchase_orders(
        id, po_number, intake_type, commercial_model,
        supplier:suppliers(name),
        client:contacts!client_party_id(name)
      )
    `)
    .eq('id', lotId)
    .single();

  // Return lot with intake_type context
  return {
    ...lot,
    intakeType: lot.purchase_order.intake_type,
    counterpartyName: lot.purchase_order.supplier?.name || lot.purchase_order.client?.name
  };
}

async completeReceiving(lotId: string) {
  // Update lot status
  await supabase
    .from('purchase_lots')
    .update({ receiving_status: 'complete' })
    .eq('id', lotId);

  // Assets already created, now ensure intake_type propagated
  await supabase.rpc('propagate_intake_type_to_assets', { lot_id: lotId });
}
```

---

#### 2.3: Update Processing Service

```typescript
// src/services/processingService.ts

async getProcessingQueue(filters: {
  intakeType?: IntakeType;
  stage?: string;
  ...
}) {
  let query = supabase
    .from('assets')
    .select(`
      *,
      purchase_order:purchase_orders(intake_type, commercial_model),
      itad_project:itad_projects(project_name),
      recycling_order:recycling_orders(order_number)
    `);

  if (filters.intakeType) {
    query = query.eq('intake_type', filters.intakeType);
  }

  return query;
}

async shouldShowWipingStage(asset: Asset, policy: ProcessingPolicy) {
  if (asset.intake_type === 'resale') return false;

  if (asset.intake_type === 'itad') {
    return policy.show_wiping_for_itad;
  }

  if (asset.intake_type === 'recycling') {
    if (policy.recycling_wipe_trigger === 'never') return false;
    if (policy.recycling_wipe_trigger === 'always') return true;
    // 'hdd_detected'
    return asset.product_type?.includes('HDD');
  }
}
```

---

### Phase 3: UI Component Updates

#### 3.1: Create Procurement Wrapper

```typescript
// src/components/procurement/ProcurementApp.tsx

export function ProcurementApp() {
  const [view, setView] = useState<'list' | 'create' | 'import'>('list');
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div>
      <header>
        <h1>Procurement & Intake</h1>
        <div className="actions">
          <button onClick={() => setShowWizard(true)}>
            + Create Intake
          </button>
          <button onClick={() => setView('import')}>
            Import Excel
          </button>
        </div>
      </header>

      {showWizard && (
        <IntakeWizard onClose={() => setShowWizard(false)} />
      )}

      {view === 'list' && <PurchaseOrdersList />}
      {view === 'import' && <SmartPOImport />}
    </div>
  );
}
```

---

#### 3.2: Create Intake Wizard

```typescript
// src/components/procurement/IntakeWizard.tsx

export function IntakeWizard({ onClose }: Props) {
  const [step, setStep] = useState<'type' | 'details' | 'import'>('type');
  const [intakeType, setIntakeType] = useState<IntakeType | null>(null);
  const [commercialModel, setCommercialModel] = useState<CommercialModel>('we_buy');

  return (
    <Modal onClose={onClose}>
      {step === 'type' && (
        <div>
          <h2>Select Intake Type</h2>
          <div className="cards">
            <Card
              title="Resale"
              description="Purchasing equipment to refurbish and resell"
              icon={<ShoppingCart />}
              onClick={() => {
                setIntakeType('resale');
                setCommercialModel('we_buy');
                setStep('details');
              }}
            />
            <Card
              title="ITAD Project"
              description="Client sends equipment for secure destruction/recycling"
              icon={<Shield />}
              onClick={() => {
                setIntakeType('itad');
                setCommercialModel('client_pays');
                setStep('details');
              }}
            />
            <Card
              title="Recycling"
              description="Bulk material for commodity extraction"
              icon={<Recycle />}
              onClick={() => {
                setIntakeType('recycling');
                setCommercialModel('client_pays');  // or we_buy
                setStep('details');
              }}
            />
          </div>
        </div>
      )}

      {step === 'details' && (
        <IntakeDetailsForm
          intakeType={intakeType!}
          commercialModel={commercialModel}
          onNext={() => setStep('import')}
        />
      )}

      {step === 'import' && (
        <SmartPOImport
          intakeType={intakeType!}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
```

---

#### 3.3: Update Receiving UI

```typescript
// src/components/receiving/SmartReceivingWorkflow.tsx

// Update PO/Lot selection screen
async function loadInboundBatches() {
  const { data } = await supabase
    .from('purchase_lots')
    .select(`
      *,
      purchase_order:purchase_orders(
        id, po_number, intake_type, commercial_model,
        supplier:suppliers(name),
        client:contacts!client_party_id(name)
      )
    `)
    .eq('receiving_status', 'waiting')
    .order('purchase_date', { ascending: false });

  // Display with intake_type badge
  return data.map(lot => ({
    ...lot,
    intakeTypeBadge: lot.purchase_order.intake_type,
    counterpartyName: lot.purchase_order.supplier?.name || lot.purchase_order.client?.name
  }));
}

// Render batch list
<div>
  {batches.map(batch => (
    <BatchCard key={batch.id}>
      <IntakeTypeBadge type={batch.intakeTypeBadge} />
      <h3>{batch.lot_number}</h3>
      <p>From: {batch.counterpartyName}</p>
      <span>Status: {batch.receiving_status}</span>
    </BatchCard>
  ))}
</div>
```

---

#### 3.4: Update Processing UI

```typescript
// src/components/processing/Processing.tsx

// Add intake_type filter
<FilterPanel>
  <Select
    label="Intake Type"
    options={[
      { value: '', label: 'All' },
      { value: 'resale', label: 'Resale' },
      { value: 'itad', label: 'ITAD' },
      { value: 'recycling', label: 'Recycling' }
    ]}
    value={filters.intakeType}
    onChange={(val) => setFilters({ ...filters, intakeType: val })}
  />
</FilterPanel>

// Show intake_type badge on asset cards
<AssetCard>
  <IntakeTypeBadge type={asset.intake_type} />
  <h3>{asset.serial_number}</h3>
  <p>{asset.brand} {asset.model}</p>
  <Stage current={asset.processing_stage} all={visibleStages} />
</AssetCard>

// Conditional stage visibility
const visibleStages = useMemo(() => {
  let stages = ['received', 'testing', 'grading', 'qa', 'route'];

  if (shouldShowWipingStage(asset, policy)) {
    stages.splice(2, 0, 'wiping');
  }

  return stages;
}, [asset, policy]);
```

---

#### 3.5: Update ITAD Workspace

```typescript
// src/components/itad/ITADWorkspace.tsx

// Change "Create Project" to "Create Intake"
<button onClick={handleCreateIntake}>
  + Create ITAD Intake
</button>

async function handleCreateIntake() {
  // Open procurement wizard with intakeType='itad' pre-selected
  navigate('/procurement?wizard=true&type=itad');
}

// Project list now shows linked procurement
<ProjectCard>
  <h3>{project.project_name}</h3>
  <p>PO: {project.purchase_order.po_number}</p>
  <p>Client: {project.purchase_order.client.name}</p>
  <Link to={`/procurement/${project.purchase_order_id}`}>
    View Procurement Record
  </Link>
</ProjectCard>
```

---

#### 3.6: Update Recycling Workspace

```typescript
// src/components/recycling/RecyclingWorkspace.tsx

// Change "Create Order" to "Create Intake"
<button onClick={handleCreateIntake}>
  + Create Recycling Intake
</button>

async function handleCreateIntake() {
  navigate('/procurement?wizard=true&type=recycling');
}

// Order list shows linked procurement
<OrderCard>
  <h3>{order.order_number}</h3>
  <p>PO: {order.purchase_order.po_number}</p>
  <p>Weight: {order.total_weight} kg</p>
  <Link to={`/procurement/${order.purchase_order_id}`}>
    View Procurement Record
  </Link>
</OrderCard>
```

---

### Phase 4: Engine Registry Updates

```sql
-- Update engine title
UPDATE engines
SET title = 'Procurement',
    description = 'Manage all inbound flows: resale purchasing, ITAD projects, recycling orders'
WHERE key = 'orders';

-- Or create new engine and deprecate old
INSERT INTO engines (company_id, key, title, description, workspace_route, sort_order)
VALUES (..., 'procurement', 'Procurement', 'Centralized inbound management', '/procurement', 10);

-- Hide lots from launcher
UPDATE engines
SET is_shown_in_launcher = false
WHERE key = 'lots';
```

---

## Acceptance Tests

### Test 1: Create Resale Intake ✅

**Steps:**
1. Navigate to Procurement
2. Click "Create Intake"
3. Select "Resale"
4. Enter supplier, expected delivery
5. Import Excel with serials + specs
6. Submit

**Expected:**
- [ ] purchase_order created with intake_type='resale'
- [ ] purchase_lot auto-created
- [ ] expected_receiving_items populated
- [ ] Appears in Receiving as "Incoming Batch"

---

### Test 2: Create ITAD Intake ✅

**Steps:**
1. Navigate to Procurement
2. Click "Create Intake"
3. Select "ITAD Project"
4. Enter client (contact), service terms
5. Expected qty
6. Submit

**Expected:**
- [ ] purchase_order created with intake_type='itad', commercial_model='client_pays'
- [ ] itad_project created, linked to purchase_order_id
- [ ] purchase_lot auto-created
- [ ] Appears in Receiving as "Incoming Batch" with ITAD badge
- [ ] Visible in ITAD Workspace linked to procurement

---

### Test 3: Create Recycling Intake ✅

**Steps:**
1. Navigate to Procurement
2. Click "Create Intake"
3. Select "Recycling"
4. Enter supplier or client
5. Expected weight
6. Submit

**Expected:**
- [ ] purchase_order created with intake_type='recycling'
- [ ] recycling_order created, linked to purchase_order_id
- [ ] purchase_lot auto-created
- [ ] Appears in Receiving with Recycling badge
- [ ] Visible in Recycling Workspace linked to procurement

---

### Test 4: Receiving Any Type ✅

**Steps:**
1. Navigate to Receiving
2. See list of incoming batches (mixed types)
3. Select ITAD batch
4. Scan serials
5. Complete receiving

**Expected:**
- [ ] Can receive any intake_type via same workflow
- [ ] Assets created with intake_type='itad'
- [ ] Assets link to purchase_order_id AND itad_project_id
- [ ] Receiving status updated to 'complete'
- [ ] Assets appear in Processing queue

---

### Test 5: Processing Filters ✅

**Steps:**
1. Navigate to Processing
2. Filter by "ITAD"
3. Select ITAD asset
4. Check available stages

**Expected:**
- [ ] Only ITAD assets shown
- [ ] Asset card shows ITAD badge
- [ ] Wiping stage visible (if policy enabled)
- [ ] Can process through stages
- [ ] Links back to ITAD project and procurement

---

### Test 6: No Parallel Truths ✅

**Steps:**
1. Query all inbound sources:
   - purchase_orders
   - itad_projects
   - recycling_orders
2. Verify linkage

**Expected:**
- [ ] Every itad_project has purchase_order_id
- [ ] Every recycling_order has purchase_order_id
- [ ] Every asset has purchase_order_id (directly or via lot)
- [ ] No orphaned inbound records
- [ ] Single source of truth for "when did it arrive" = purchase_order.order_date

---

## Migration Safety

### Backward Compatibility

**For existing resale POs:**
```sql
-- Existing POs default to resale
UPDATE purchase_orders
SET intake_type = 'resale',
    commercial_model = 'we_buy',
    processing_intent = 'resale'
WHERE intake_type IS NULL;
```

**For existing ITAD projects:**
```sql
-- Create retroactive POs for ITAD projects
-- (Script in 1.4 above)
```

**For existing recycling orders:**
```sql
-- Create retroactive POs for recycling orders
-- (Script in 1.5 above)
```

### Rollback Plan

If migrations fail:
1. Keep old tables intact
2. New columns are additive (can be dropped)
3. Triggers can be disabled
4. UI can toggle between old/new via feature flag

---

## Summary

### The Rule ✅

> **Every inbound flow MUST create a purchase_order with intake_type.**
>
> ITAD projects and recycling orders are DETAIL records, not headers.
>
> purchase_lots = physical batches for receiving.
>
> Receiving ALWAYS starts from a lot.
>
> Processing filters by intake_type.
>
> One truth for "what came in when" = purchase_orders.

### What Changes

**Database:**
- ✅ Add columns to purchase_orders (intake_type, commercial_model, etc.)
- ✅ Add purchase_order_id to purchase_lots
- ✅ Add intake_type + purchase_order_id to assets
- ✅ Add purchase_order_id to itad_projects
- ✅ Add purchase_order_id to recycling_orders

**Services:**
- ✅ Create ProcurementService.createIntake()
- ✅ Update ReceivingService to use lots + intake_type
- ✅ Update ProcessingService to filter by intake_type

**UI:**
- ✅ Rename "Orders" → "Procurement"
- ✅ Create IntakeWizard (type selection)
- ✅ Update Receiving to show intake_type badges
- ✅ Update Processing to filter + gate stages
- ✅ Update ITAD/Recycling to create via procurement

**Engines:**
- ✅ Hide "Lots" from launcher
- ✅ Procurement is primary inbound entry point

### What Doesn't Change

- ✅ SmartPOImport logic (reused for all types)
- ✅ SmartReceivingWorkflow logic (works for all types)
- ✅ Existing resale flow (backward compatible)
- ✅ Asset processing logic (just adds filtering)

---

**Next Steps:**
1. Review this analysis
2. Confirm architectural approach
3. Answer any questions
4. Approve for implementation
5. Start with Phase 1 (database migrations)
