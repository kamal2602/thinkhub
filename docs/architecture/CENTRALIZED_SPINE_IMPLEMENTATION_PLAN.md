# Centralized Procurement Spine: Implementation Plan

**Date:** 2026-02-03
**Requirement:** Implement centralized procurement using existing advanced purchase system
**Status:** Ready for approval and implementation

---

## Executive Summary

### What We're Doing

**Converting this:**
```
3 disconnected inbound systems
├── purchase_orders (resale only)
├── itad_projects (separate, no receiving)
└── recycling_orders (separate, no receiving)
```

**Into this:**
```
1 unified procurement spine
└── purchase_orders (ALL types)
    ├── intake_type: resale | itad | recycling
    ├── purchase_lots (physical batches)
    │   └── Unified receiving
    ├── itad_projects (detail, linked)
    └── recycling_orders (detail, linked)
```

### Why This Matters

- ✅ One place to create any inbound
- ✅ Unified receiving workflow (reuse SmartReceivingWorkflow)
- ✅ Complete traceability (every asset → procurement)
- ✅ Accurate reporting (no parallel truths)
- ✅ Leverage existing advanced import logic (54KB SmartPOImport)

---

## Implementation Sprints

### Sprint 1: Database Foundation (2-3 days) ⚠️ CRITICAL PATH

**Goal:** Extend schema to support all intake types

#### Task 1.1: Extend purchase_orders Table

**File:** `supabase/migrations/20260203000001_extend_purchase_orders_intake_types.sql`

```sql
/*
  # Extend purchase_orders for All Intake Types

  1. New Columns
    - `intake_type` (resale | itad | recycling)
    - `commercial_model` (we_buy | client_pays | hybrid)
    - `processing_intent` (resale | recycle | hybrid)
    - `client_party_id` (for ITAD/Recycling customer-sends)
    - `source_channel` (manual | excel | portal | website)
    - `compliance_profile` (india | eu | us)

  2. Backward Compatibility
    - Default existing POs to resale/we_buy
    - All new columns nullable initially
    - Add NOT NULL after backfill
*/

-- Add new columns
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS intake_type text
    CHECK (intake_type IN ('resale', 'itad', 'recycling')),

  ADD COLUMN IF NOT EXISTS commercial_model text
    CHECK (commercial_model IN ('we_buy', 'client_pays', 'hybrid')),

  ADD COLUMN IF NOT EXISTS processing_intent text
    CHECK (processing_intent IN ('resale', 'recycle', 'hybrid')),

  ADD COLUMN IF NOT EXISTS client_party_id uuid
    REFERENCES contacts(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS source_channel text
    CHECK (source_channel IN ('manual', 'excel', 'portal', 'website', 'api'))
    DEFAULT 'manual',

  ADD COLUMN IF NOT EXISTS compliance_profile text
    DEFAULT 'india';

-- Backfill existing records
UPDATE purchase_orders
SET
  intake_type = 'resale',
  commercial_model = 'we_buy',
  processing_intent = 'resale',
  source_channel = CASE
    WHEN source_file_name IS NOT NULL THEN 'excel'
    ELSE 'manual'
  END
WHERE intake_type IS NULL;

-- Make intake_type required
ALTER TABLE purchase_orders
  ALTER COLUMN intake_type SET DEFAULT 'resale',
  ALTER COLUMN intake_type SET NOT NULL;

ALTER TABLE purchase_orders
  ALTER COLUMN commercial_model SET DEFAULT 'we_buy',
  ALTER COLUMN commercial_model SET NOT NULL;

ALTER TABLE purchase_orders
  ALTER COLUMN processing_intent SET DEFAULT 'resale',
  ALTER COLUMN processing_intent SET NOT NULL;

-- Comments
COMMENT ON COLUMN purchase_orders.intake_type IS
  'Type of inbound: resale (buying to resell), itad (client sends for destruction), recycling (bulk commodities)';

COMMENT ON COLUMN purchase_orders.commercial_model IS
  'Who pays: we_buy (we pay supplier), client_pays (client pays us for service), hybrid (revenue share)';

COMMENT ON COLUMN purchase_orders.processing_intent IS
  'What we do: resale (refurb & sell), recycle (dismantle for commodities), hybrid (cherry-pick then recycle)';

COMMENT ON COLUMN purchase_orders.client_party_id IS
  'For ITAD/Recycling: the customer/client sending equipment. For Resale: optional end-customer reference.';

COMMENT ON COLUMN purchase_orders.source_channel IS
  'How this intake was created: manual (UI), excel (bulk import), portal (customer self-service), website (public form)';
```

**Acceptance:**
- [ ] Migration runs without errors
- [ ] Existing POs have intake_type='resale'
- [ ] Can insert new PO with intake_type='itad'
- [ ] Check constraints enforced

---

#### Task 1.2: Extend purchase_lots Table

**File:** `supabase/migrations/20260203000002_extend_purchase_lots_receiving_status.sql`

```sql
/*
  # Extend purchase_lots for Receiving Status

  1. New Columns
    - `purchase_order_id` (link to header)
    - `receiving_status` (waiting | partial | complete)
    - `expected_qty`, `expected_weight_kg` (for reconciliation)

  2. Backfill
    - Link existing lots to POs where possible
*/

-- Add purchase_order_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_lots' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE purchase_lots
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add receiving status columns
ALTER TABLE purchase_lots
  ADD COLUMN IF NOT EXISTS receiving_status text
    CHECK (receiving_status IN ('waiting', 'partial', 'complete'))
    DEFAULT 'waiting',

  ADD COLUMN IF NOT EXISTS expected_qty int,

  ADD COLUMN IF NOT EXISTS expected_weight_kg numeric(10,2),

  ADD COLUMN IF NOT EXISTS actual_weight_kg numeric(10,2);

-- Backfill purchase_order_id
-- Strategy: Match lots to POs by supplier and date
UPDATE purchase_lots pl
SET purchase_order_id = (
  SELECT po.id
  FROM purchase_orders po
  WHERE po.supplier_id = pl.supplier_id
    AND po.order_date = pl.purchase_date
    AND po.company_id = pl.company_id
  ORDER BY po.created_at DESC
  LIMIT 1
)
WHERE purchase_order_id IS NULL
  AND supplier_id IS NOT NULL;

-- Backfill receiving_status based on assets
UPDATE purchase_lots pl
SET receiving_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM assets WHERE purchase_lot_id = pl.id
  ) THEN 'complete'
  ELSE 'waiting'
END
WHERE receiving_status IS NULL;

-- Comments
COMMENT ON COLUMN purchase_lots.purchase_order_id IS
  'Link to parent procurement record (the commercial agreement)';

COMMENT ON COLUMN purchase_lots.receiving_status IS
  'waiting (not started), partial (some items received), complete (all received or closed)';

COMMENT ON COLUMN purchase_lots.expected_weight_kg IS
  'For recycling intakes: expected total weight';
```

**Acceptance:**
- [ ] purchase_lots have purchase_order_id
- [ ] receiving_status trackable
- [ ] Weight columns available

---

#### Task 1.3: Extend assets Table

**File:** `supabase/migrations/20260203000003_add_intake_type_to_assets.sql`

```sql
/*
  # Add Intake Type to Assets

  1. New Columns
    - `intake_type` (inherited from procurement)
    - `purchase_order_id` (direct link, not just via lot)
    - `itad_project_id` (optional detail link)
    - `recycling_order_id` (optional detail link)

  2. Backfill
    - Propagate intake_type from purchase_order
*/

-- Add columns
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS intake_type text
    CHECK (intake_type IN ('resale', 'itad', 'recycling')),

  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS itad_project_id uuid
    REFERENCES itad_projects(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS recycling_order_id uuid
    REFERENCES recycling_orders(id) ON DELETE SET NULL;

-- Backfill intake_type and purchase_order_id
UPDATE assets a
SET
  purchase_order_id = COALESCE(
    a.purchase_order_id,
    (SELECT pl.purchase_order_id
     FROM purchase_lots pl
     WHERE pl.id = a.purchase_lot_id)
  ),
  intake_type = COALESCE(
    a.intake_type,
    (SELECT po.intake_type
     FROM purchase_orders po
     JOIN purchase_lots pl ON pl.purchase_order_id = po.id
     WHERE pl.id = a.purchase_lot_id)
  )
WHERE a.purchase_lot_id IS NOT NULL;

-- Default old assets to 'resale' if still null
UPDATE assets
SET intake_type = 'resale'
WHERE intake_type IS NULL;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_assets_intake_type ON assets(intake_type);

-- Comments
COMMENT ON COLUMN assets.intake_type IS
  'Inherited from purchase_order: resale (buy-to-resell), itad (client-owned for destruction), recycling (commodity)';

COMMENT ON COLUMN assets.purchase_order_id IS
  'Direct link to procurement record for traceability';
```

**Acceptance:**
- [ ] All assets have intake_type
- [ ] Assets link to purchase_order_id
- [ ] Can filter by intake_type (indexed)

---

#### Task 1.4: Link itad_projects to Procurement

**File:** `supabase/migrations/20260203000004_link_itad_projects_to_procurement.sql`

```sql
/*
  # Link ITAD Projects to Procurement

  1. Changes
    - Add purchase_order_id to itad_projects
    - Create retroactive POs for orphaned projects
    - Enforce link going forward

  2. Strategy
    - For each orphaned project, create a purchase_order with intake_type='itad'
    - Link project to new PO
*/

-- Add purchase_order_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itad_projects' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE itad_projects
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create retroactive purchase_orders for orphaned projects
DO $$
DECLARE
  project_rec RECORD;
  new_po_id uuid;
BEGIN
  FOR project_rec IN
    SELECT * FROM itad_projects WHERE purchase_order_id IS NULL
  LOOP
    -- Create purchase_order
    INSERT INTO purchase_orders (
      company_id,
      po_number,
      intake_type,
      commercial_model,
      processing_intent,
      client_party_id,
      order_date,
      status,
      source_channel,
      notes,
      created_by
    ) VALUES (
      project_rec.company_id,
      'ITAD-' || project_rec.project_number,
      'itad',
      'client_pays',
      'resale',  -- Default, can be updated
      project_rec.itad_customer_id,
      project_rec.start_date,
      CASE
        WHEN project_rec.status = 'completed' THEN 'closed'
        WHEN project_rec.status = 'in_progress' THEN 'submitted'
        ELSE 'draft'
      END,
      'manual',
      'Auto-created from legacy ITAD project: ' || COALESCE(project_rec.project_name, project_rec.project_number),
      project_rec.created_by
    )
    RETURNING id INTO new_po_id;

    -- Link project to PO
    UPDATE itad_projects
    SET purchase_order_id = new_po_id
    WHERE id = project_rec.id;

    -- Create purchase_lot for receiving
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      purchase_order_id,
      purchase_date,
      receiving_status,
      expected_qty,
      created_by
    ) VALUES (
      project_rec.company_id,
      'ITAD-LOT-' || project_rec.project_number,
      new_po_id,
      project_rec.start_date,
      CASE
        WHEN project_rec.actual_quantity > 0 THEN 'complete'
        ELSE 'waiting'
      END,
      project_rec.expected_quantity,
      project_rec.created_by
    );

    RAISE NOTICE 'Created PO % for ITAD project %', new_po_id, project_rec.id;
  END LOOP;
END $$;

-- Make purchase_order_id required going forward
-- (Comment out if you want to allow NULL for backward compat)
-- ALTER TABLE itad_projects
--   ALTER COLUMN purchase_order_id SET NOT NULL;

COMMENT ON COLUMN itad_projects.purchase_order_id IS
  'ITAD project is a DETAIL record linked to a procurement (intake_type=itad). The procurement represents the inbound event.';
```

**Acceptance:**
- [ ] All itad_projects have purchase_order_id
- [ ] Retroactive POs created with intake_type='itad'
- [ ] purchase_lots created for receiving

---

#### Task 1.5: Link recycling_orders to Procurement

**File:** `supabase/migrations/20260203000005_link_recycling_orders_to_procurement.sql`

```sql
/*
  # Link Recycling Orders to Procurement

  1. Changes
    - Add purchase_order_id to recycling_orders
    - Create retroactive POs for orphaned orders
    - Enforce link going forward
*/

-- Add purchase_order_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recycling_orders' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE recycling_orders
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create retroactive purchase_orders
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
      source_channel,
      notes,
      created_by,
      created_at
    ) VALUES (
      order_rec.company_id,
      'REC-' || order_rec.order_number,
      'recycling',
      CASE
        WHEN order_rec.contact_id IS NOT NULL THEN 'client_pays'
        ELSE 'we_buy'
      END,
      COALESCE(order_rec.processing_intent, 'recycle'),
      order_rec.contact_id,
      order_rec.order_date,
      CASE
        WHEN order_rec.status = 'completed' THEN 'closed'
        WHEN order_rec.status = 'in_progress' THEN 'submitted'
        ELSE 'draft'
      END,
      'manual',
      'Auto-created from legacy recycling order',
      (SELECT created_by FROM user_company_access WHERE company_id = order_rec.company_id LIMIT 1),
      order_rec.created_at
    )
    RETURNING id INTO new_po_id;

    UPDATE recycling_orders
    SET purchase_order_id = new_po_id
    WHERE id = order_rec.id;

    -- Create purchase_lot
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      purchase_order_id,
      purchase_date,
      receiving_status,
      expected_weight_kg,
      actual_weight_kg,
      created_at
    ) VALUES (
      order_rec.company_id,
      'REC-LOT-' || order_rec.order_number,
      new_po_id,
      order_rec.order_date,
      CASE
        WHEN order_rec.total_weight > 0 THEN 'complete'
        ELSE 'waiting'
      END,
      order_rec.expected_weight,
      order_rec.total_weight,
      order_rec.created_at
    );

    RAISE NOTICE 'Created PO % for recycling order %', new_po_id, order_rec.id;
  END LOOP;
END $$;

COMMENT ON COLUMN recycling_orders.purchase_order_id IS
  'Recycling order is a DETAIL record linked to a procurement (intake_type=recycling)';
```

**Acceptance:**
- [ ] All recycling_orders have purchase_order_id
- [ ] Retroactive POs created with intake_type='recycling'
- [ ] purchase_lots created with weight fields

---

### Sprint 2: Service Layer (2-3 days)

#### Task 2.1: Create ProcurementService

**File:** `src/services/procurementService.ts`

```typescript
import { supabase } from '../lib/supabase';

export type IntakeType = 'resale' | 'itad' | 'recycling';
export type CommercialModel = 'we_buy' | 'client_pays' | 'hybrid';
export type ProcessingIntent = 'resale' | 'recycle' | 'hybrid';
export type SourceChannel = 'manual' | 'excel' | 'portal' | 'website' | 'api';

export interface CreateIntakeParams {
  companyId: string;
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
  sourceChannel?: SourceChannel;

  // ITAD specific:
  itadProjectName?: string;
  serviceFee?: number;
  revenueSharePercentage?: number;

  // Recycling specific:
  expectedWeightKg?: number;

  // Optional: Excel data for immediate import
  excelData?: {
    fileName: string;
    parsedData: any;
    mappings: any[];
  };
}

export class ProcurementService {
  /**
   * Create a new intake (resale, ITAD, or recycling)
   * This is the SINGLE entry point for all inbound flows
   */
  async createIntake(params: CreateIntakeParams) {
    const {
      companyId,
      intakeType,
      commercialModel,
      processingIntent,
      supplierId,
      clientPartyId,
      expectedDeliveryDate,
      notes,
      sourceChannel = 'manual',
      itadProjectName,
      serviceFee,
      revenueSharePercentage,
      expectedWeightKg,
      excelData
    } = params;

    // 1. Generate PO number
    const poNumber = await this.generatePONumber(companyId, intakeType);

    // 2. Create purchase_order
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        company_id: companyId,
        po_number: poNumber,
        intake_type: intakeType,
        commercial_model: commercialModel,
        processing_intent: processingIntent,
        supplier_id: supplierId,
        client_party_id: clientPartyId,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: expectedDeliveryDate,
        status: 'draft',
        source_channel: sourceChannel,
        notes: notes,
        ...(excelData && {
          source_file_name: excelData.fileName,
          source_file_data: excelData.parsedData,
          source_file_mappings: excelData.mappings
        })
      })
      .select()
      .single();

    if (poError) throw poError;

    // 3. purchase_lot auto-created by trigger, but we can create explicitly too
    const { data: lot, error: lotError } = await supabase
      .from('purchase_lots')
      .insert({
        company_id: companyId,
        lot_number: `LOT-${poNumber}`,
        purchase_order_id: po.id,
        purchase_date: po.order_date,
        receiving_status: 'waiting',
        expected_weight_kg: expectedWeightKg
      })
      .select()
      .single();

    if (lotError) throw lotError;

    // 4. Create detail records based on type
    if (intakeType === 'itad') {
      await this.createITADProjectDetail(po.id, companyId, {
        projectName: itadProjectName,
        customerId: clientPartyId!,
        serviceFee,
        revenueSharePercentage
      });
    }

    if (intakeType === 'recycling') {
      await this.createRecyclingOrderDetail(po.id, companyId, {
        contactId: clientPartyId || supplierId,
        expectedWeightKg,
        processingIntent
      });
    }

    // 5. If Excel data provided, import expected items
    if (excelData) {
      // Reuse existing SmartPOImport logic
      // This would call the same backend that SmartPOImport uses
      // to create expected_receiving_items
    }

    return {
      purchaseOrder: po,
      purchaseLot: lot
    };
  }

  private async generatePONumber(companyId: string, intakeType: IntakeType) {
    const prefix = intakeType === 'itad' ? 'ITAD' : intakeType === 'recycling' ? 'REC' : 'PO';
    const { count } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('intake_type', intakeType);

    return `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`;
  }

  private async createITADProjectDetail(
    purchaseOrderId: string,
    companyId: string,
    params: {
      projectName?: string;
      customerId: string;
      serviceFee?: number;
      revenueSharePercentage?: number;
    }
  ) {
    const { data, error } = await supabase
      .from('itad_projects')
      .insert({
        company_id: companyId,
        purchase_order_id: purchaseOrderId,
        project_number: purchaseOrderId.slice(-5), // Use PO suffix
        project_name: params.projectName,
        itad_customer_id: params.customerId,
        service_fee: params.serviceFee || 0,
        revenue_share_percentage: params.revenueSharePercentage || 0,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async createRecyclingOrderDetail(
    purchaseOrderId: string,
    companyId: string,
    params: {
      contactId?: string;
      expectedWeightKg?: number;
      processingIntent: ProcessingIntent;
    }
  ) {
    const { data, error } = await supabase
      .from('recycling_orders')
      .insert({
        company_id: companyId,
        purchase_order_id: purchaseOrderId,
        order_number: purchaseOrderId.slice(-5),
        contact_id: params.contactId,
        expected_weight: params.expectedWeightKg,
        processing_intent: params.processingIntent === 'resale' ? 'hybrid_resale' : 'recycle_only',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get incoming batches for receiving
   * Used by Receiving app to show unified list
   */
  async getInboundBatches(companyId: string, filters?: {
    intakeType?: IntakeType;
    status?: string;
  }) {
    let query = supabase
      .from('purchase_lots')
      .select(`
        *,
        purchase_order:purchase_orders(
          id,
          po_number,
          intake_type,
          commercial_model,
          supplier:suppliers(id, name),
          client:contacts!client_party_id(id, name)
        )
      `)
      .eq('company_id', companyId)
      .order('purchase_date', { ascending: false });

    if (filters?.intakeType) {
      query = query.eq('purchase_order.intake_type', filters.intakeType);
    }

    if (filters?.status) {
      query = query.eq('receiving_status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((lot: any) => ({
      ...lot,
      counterpartyName: lot.purchase_order?.supplier?.name || lot.purchase_order?.client?.name || 'Unknown'
    }));
  }
}

export const procurementService = new ProcurementService();
```

**Acceptance:**
- [ ] Can create intake of any type via single method
- [ ] PO, lot, and detail records created
- [ ] Returns typed response

---

#### Task 2.2: Update ReceivingService

**File:** `src/services/receivingService.ts` (update existing)

```typescript
// Add method to get lot with intake context
async getReceivingContext(lotId: string) {
  const { data: lot, error } = await supabase
    .from('purchase_lots')
    .select(`
      *,
      purchase_order:purchase_orders(
        id,
        po_number,
        intake_type,
        commercial_model,
        processing_intent,
        supplier:suppliers(name),
        client:contacts!client_party_id(name)
      )
    `)
    .eq('id', lotId)
    .single();

  if (error) throw error;

  return {
    lot,
    intakeType: lot.purchase_order.intake_type,
    counterparty: lot.purchase_order.supplier?.name || lot.purchase_order.client?.name,
    isClientPays: lot.purchase_order.commercial_model === 'client_pays'
  };
}
```

---

#### Task 2.3: Update ProcessingService

**File:** `src/services/processingService.ts` (update existing)

```typescript
// Add intake_type filter support
async getProcessingQueue(companyId: string, filters: {
  intakeType?: IntakeType;
  stage?: string;
  // ... existing filters
}) {
  let query = supabase
    .from('assets')
    .select(`
      *,
      purchase_order:purchase_orders(intake_type, commercial_model),
      itad_project:itad_projects(project_name, project_number),
      recycling_order:recycling_orders(order_number)
    `)
    .eq('company_id', companyId);

  if (filters.intakeType) {
    query = query.eq('intake_type', filters.intakeType);
  }

  // ... existing filter logic

  return query;
}
```

---

### Sprint 3: UI Components (3-4 days)

#### Task 3.1: Create Intake Wizard

**File:** `src/components/procurement/IntakeWizard.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { ShoppingCart, Shield, Recycle, X } from 'lucide-react';
import { procurementService, IntakeType, CommercialModel, ProcessingIntent } from '../../services/procurementService';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface IntakeWizardProps {
  onClose: () => void;
  onSuccess: (poId: string) => void;
}

export function IntakeWizard({ onClose, onSuccess }: IntakeWizardProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [intakeType, setIntakeType] = useState<IntakeType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeSelection = (type: IntakeType) => {
    setIntakeType(type);
    setStep('details');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create New Intake</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'type' && (
            <div>
              <p className="text-gray-600 mb-6">
                Select the type of inbound material you're receiving:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <IntakeTypeCard
                  icon={<ShoppingCart className="w-12 h-12 text-blue-600" />}
                  title="Resale"
                  description="Purchasing equipment from suppliers to refurbish and resell"
                  color="blue"
                  onClick={() => handleTypeSelection('resale')}
                />
                <IntakeTypeCard
                  icon={<Shield className="w-12 h-12 text-purple-600" />}
                  title="ITAD Project"
                  description="Client sends equipment for secure data destruction and recycling"
                  color="purple"
                  onClick={() => handleTypeSelection('itad')}
                />
                <IntakeTypeCard
                  icon={<Recycle className="w-12 h-12 text-green-600" />}
                  title="Recycling"
                  description="Bulk material intake for commodity extraction"
                  color="green"
                  onClick={() => handleTypeSelection('recycling')}
                />
              </div>
            </div>
          )}

          {step === 'details' && intakeType && (
            <IntakeDetailsForm
              intakeType={intakeType}
              onBack={() => setStep('type')}
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  const result = await procurementService.createIntake({
                    companyId: selectedCompany!.id,
                    intakeType,
                    ...data
                  });
                  showToast('Intake created successfully', 'success');
                  onSuccess(result.purchaseOrder.id);
                } catch (error) {
                  showToast('Failed to create intake', 'error');
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function IntakeTypeCard({ icon, title, description, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-6 border-2 border-gray-200 rounded-lg hover:border-${color}-500 hover:shadow-lg transition-all text-left`}
    >
      <div className="flex flex-col items-center text-center">
        {icon}
        <h3 className="mt-4 text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
}

// IntakeDetailsForm would be a separate component with fields based on intake_type
```

**Acceptance:**
- [ ] Wizard shows 3 type options
- [ ] Selecting type shows appropriate form
- [ ] Can create intake via procurementService
- [ ] Success returns to procurement list

---

#### Task 3.2: Update Procurement App

**File:** `src/components/procurement/ProcurementApp.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { IntakeWizard } from './IntakeWizard';
import { PurchaseOrders } from '../purchases/PurchaseOrders';
import { SmartPOImport } from '../purchases/SmartPOImport';

export function ProcurementApp() {
  const [showWizard, setShowWizard] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Procurement & Intake</h1>
          <p className="text-gray-600 mt-1">
            Manage all inbound flows: resale, ITAD, and recycling
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Intake
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
          >
            <Upload className="w-5 h-5" />
            Import Excel
          </button>
        </div>
      </div>

      {showWizard && (
        <IntakeWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            // Refresh list
          }}
        />
      )}

      {showImport && (
        <SmartPOImport
          onClose={() => setShowImport(false)}
          onImport={() => {
            setShowImport(false);
            // Refresh list
          }}
        />
      )}

      <PurchaseOrders />
    </div>
  );
}
```

---

#### Task 3.3: Update Receiving UI

**File:** `src/components/receiving/SmartReceivingWorkflow.tsx` (update)

Add intake_type badge and filter:

```typescript
// In the PO selection screen
<div className="mb-4">
  <select
    value={intakeTypeFilter}
    onChange={(e) => setIntakeTypeFilter(e.target.value)}
    className="border rounded px-3 py-2"
  >
    <option value="">All Types</option>
    <option value="resale">Resale</option>
    <option value="itad">ITAD</option>
    <option value="recycling">Recycling</option>
  </select>
</div>

{filteredLots.map(lot => (
  <div key={lot.id} className="border rounded p-4">
    <IntakeTypeBadge type={lot.purchase_order.intake_type} />
    <h3>{lot.lot_number}</h3>
    <p>From: {lot.counterpartyName}</p>
    <span>Status: {lot.receiving_status}</span>
  </div>
))}
```

---

#### Task 3.4: Update Processing UI

**File:** `src/components/processing/Processing.tsx` (update)

Add intake_type filter:

```typescript
<FilterPanel>
  <Select
    label="Intake Type"
    value={filters.intakeType}
    onChange={(val) => setFilters({ ...filters, intakeType: val })}
    options={[
      { value: '', label: 'All' },
      { value: 'resale', label: 'Resale' },
      { value: 'itad', label: 'ITAD' },
      { value: 'recycling', label: 'Recycling' }
    ]}
  />
</FilterPanel>

// Show badge on asset cards
<AssetCard>
  <IntakeTypeBadge type={asset.intake_type} />
  {/* ... rest of card */}
</AssetCard>
```

---

#### Task 3.5: Create IntakeTypeBadge Component

**File:** `src/components/common/IntakeTypeBadge.tsx` (NEW)

```typescript
import React from 'react';
import { ShoppingCart, Shield, Recycle } from 'lucide-react';

interface IntakeTypeBadgeProps {
  type: 'resale' | 'itad' | 'recycling';
  size?: 'sm' | 'md';
}

export function IntakeTypeBadge({ type, size = 'sm' }: IntakeTypeBadgeProps) {
  const configs = {
    resale: {
      icon: ShoppingCart,
      label: 'Resale',
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    itad: {
      icon: Shield,
      label: 'ITAD',
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    recycling: {
      icon: Recycle,
      label: 'Recycling',
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200'
    }
  };

  const config = configs[type];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${config.bg} ${config.text} ${config.border} ${textSize}`}>
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
}
```

---

### Sprint 4: Engine & Routing (1 day)

#### Task 4.1: Update Engine Registry

```sql
-- Update engines table
UPDATE engines
SET
  key = 'procurement',
  title = 'Procurement',
  description = 'Centralized inbound management: resale, ITAD, recycling',
  workspace_route = '/procurement'
WHERE key = 'orders';

-- Hide lots
UPDATE engines
SET is_shown_in_launcher = false
WHERE key = 'lots';
```

---

#### Task 4.2: Update Component Map

**File:** `src/config/engineComponentMap.tsx`

```typescript
'procurement': lazy(() => import('../components/procurement/ProcurementApp')),
```

---

#### Task 4.3: Update App Colors

**File:** `src/config/appColors.ts`

```typescript
'procurement': {
  bg: 'bg-blue-600',
  text: 'text-blue-600',
  gradient: 'from-blue-500 to-blue-700',
  ring: 'ring-blue-500',
}
```

---

## Testing & Validation

### Test Suite

**Test 1: Create Resale Intake**
```
1. Navigate to /procurement
2. Click "Create Intake"
3. Select "Resale"
4. Enter supplier, delivery date
5. Submit
Expected:
  - purchase_order created (intake_type='resale')
  - purchase_lot auto-created
  - Appears in Receiving
```

**Test 2: Create ITAD Intake**
```
1. Navigate to /procurement
2. Click "Create Intake"
3. Select "ITAD"
4. Enter client, project details
5. Submit
Expected:
  - purchase_order created (intake_type='itad')
  - itad_project created (linked to PO)
  - purchase_lot created
  - Appears in Receiving with ITAD badge
  - Visible in ITAD workspace
```

**Test 3: Unified Receiving**
```
1. Navigate to /receiving
2. See mixed list (resale + ITAD + recycling)
3. Filter by "ITAD"
4. Select ITAD batch
5. Scan serials
6. Complete
Expected:
  - Assets created with intake_type='itad'
  - Assets link to purchase_order AND itad_project
  - Appear in Processing with ITAD filter
```

**Test 4: Processing Filters**
```
1. Navigate to /processing
2. Filter by "ITAD"
3. See only ITAD assets
4. Asset card shows ITAD badge
5. Check traceability
Expected:
  - Can link back to procurement
  - Can link to ITAD project detail
```

**Test 5: No Orphans**
```
SQL:
  SELECT * FROM itad_projects WHERE purchase_order_id IS NULL;
  SELECT * FROM recycling_orders WHERE purchase_order_id IS NULL;
  SELECT * FROM assets WHERE intake_type IS NULL AND purchase_lot_id IS NOT NULL;

Expected:
  - Zero orphaned records
```

---

## Success Criteria

### Sprint 1 Complete:
- [ ] All migrations run successfully
- [ ] purchase_orders has intake_type
- [ ] purchase_lots has purchase_order_id
- [ ] assets has intake_type
- [ ] itad_projects linked to POs
- [ ] recycling_orders linked to POs
- [ ] No data loss
- [ ] Build succeeds

### Sprint 2 Complete:
- [ ] ProcurementService.createIntake() works
- [ ] Can create intake of any type
- [ ] Services return typed responses
- [ ] Unit tests pass

### Sprint 3 Complete:
- [ ] IntakeWizard functional
- [ ] ProcurementApp shows unified list
- [ ] Receiving shows intake_type badges
- [ ] Processing filters by intake_type
- [ ] IntakeTypeBadge component works

### Sprint 4 Complete:
- [ ] "Procurement" tile in launcher
- [ ] "Lots" hidden from launcher
- [ ] Routes work: /procurement
- [ ] Build succeeds

### Overall Success:
- [ ] Can create any intake via Procurement
- [ ] All intakes go through purchase_orders
- [ ] Unified receiving workflow
- [ ] Processing filters work
- [ ] ITAD/Recycling link to procurement
- [ ] No parallel inbound truths
- [ ] Reports can aggregate across types

---

## Rollback Plan

If issues arise:

1. **Database:** Keep new columns nullable, can be dropped
2. **Services:** Feature flag to use old vs new
3. **UI:** Toggle to show old components
4. **Routes:** Keep both /orders and /procurement working

---

## Next Steps

1. ✅ Review this plan
2. ✅ Approve approach
3. ⏳ Begin Sprint 1 (database migrations)
4. ⏳ Test migrations on copy of data
5. ⏳ Implement Sprint 2-4
6. ⏳ User acceptance testing
7. ⏳ Deploy to production

---

**Ready to implement? Please confirm approval and I'll begin with Sprint 1 migrations.**
