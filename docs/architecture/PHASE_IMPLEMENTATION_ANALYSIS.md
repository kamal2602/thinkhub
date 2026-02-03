# ThinkHub Odoo-Style Refactoring: Analysis & Implementation Plan

**Date:** 2026-02-02
**Status:** Pre-Implementation Analysis
**Goal:** Transform ThinkHub into Odoo-like app launcher with role-based landing and single-purpose apps

---

## Executive Summary

### Current State ✓
- ✅ Colorful app launcher (just implemented)
- ✅ Engine registry system exists
- ✅ Role-based landing service exists (not used)
- ✅ Processing, Receiving, ITAD, Recycling apps exist
- ✅ Basic routing via `/:engineKey/*`

### Gaps Identified ⚠️
- ❌ Role-based landing not integrated into login flow
- ❌ No "procurement" engine (using "orders" instead)
- ❌ Lots visible as top-level tile (should be hidden)
- ❌ Processing lacks intake_type filtering
- ❌ No wiping stage gating policy
- ❌ Recycling missing UOM/commodities
- ❌ No dedicated "Reports" app (ESG exists separately)
- ❌ Settings not modular per app

---

## Current Architecture Audit

### 1. Engine Registry (Database)

**Existing Engine Keys (from migrations):**
```
✓ processing      → /processing
✓ receiving       → /receiving
✓ inventory       → /inventory
✓ lots            → /lots (SHOULD HIDE)
✓ repairs         → /repairs
✓ recycling       → /recycling
✓ itad            → /itad
✓ crm             → /crm
✓ esg             → /esg
✓ contacts        → /contacts
✓ orders          → /orders (SHOULD RENAME to "procurement")
✓ invoices        → /invoices
✓ payments        → /payments
✓ accounting      → /accounting
✓ auction         → /auction
✓ reseller        → /reseller
✓ website         → /website
✓ reports         → /reports
✓ users           → /users
✓ company         → /company
✓ apps            → /apps
✓ settings        → /settings
```

**Status:** ✅ Most engines exist, but need normalization

### 2. Component Mapping

**File:** `src/config/engineComponentMap.tsx`

**Current Mappings:**
```typescript
'processing'  → Processing.tsx ✓
'receiving'   → SmartReceivingWorkflow.tsx ✓
'lots'        → PurchaseLots.tsx ✓ (should hide, not remove)
'orders'      → PurchaseOrders.tsx ✓ (rename to procurement)
'recycling'   → RecyclingWorkspace.tsx ✓
'itad'        → ITADWorkspace.tsx ✓
'contacts'    → ContactsDirectory.tsx ✓
'crm'         → CRMWorkspace.tsx ✓
'reports'     → Reports.tsx ✓
'settings'    → SystemConfig.tsx ✓
```

**Status:** ✅ All major components exist

### 3. Routing Architecture

**Current Flow:**
```
App.tsx
  └─ ModularAppShell.tsx
      ├─ Route "/" → OdooStyleLauncher ✓ (just implemented)
      ├─ Route "/dashboard" → EngineDrivenDashboard ✓
      └─ Route "/*" → EngineRouter
          └─ Route "/:engineKey/*" → DynamicEngineWorkspace
```

**Status:** ✅ Routing structure is correct

### 4. Role-Based Landing

**File:** `src/services/userLandingService.ts`

**Exists but NOT integrated:**
```typescript
warehouse   → /receiving
technician  → /processing
compliance  → /itad
sales       → /resale
admin       → /
manager     → /
```

**Status:** ⚠️ Service exists but never called on login

### 5. Existing Apps Analysis

#### Processing App
**File:** `src/components/processing/Processing.tsx`
- ✅ Kanban stages exist
- ❌ No intake_type filtering
- ❌ No wiping stage gating
- ❌ No policy configuration

#### Receiving App
**File:** `src/components/receiving/SmartReceivingWorkflow.tsx`
- ✅ 110KB comprehensive implementation
- ✅ Batch/PO receiving
- ✅ Discrepancy tracking
- ✅ Serial scanning
- **Status:** Already excellent, just needs routing

#### Recycling App
**File:** `src/components/recycling/RecyclingWorkspace.tsx`
- ✅ Basic structure exists
- ❌ No UOM support
- ❌ No commodities model
- ❌ No outputs tracking

#### ITAD App
**File:** `src/components/itad/ITADWorkspace.tsx`
- ✅ Projects, certificates exist
- ✅ Compliance-focused
- **Status:** Good, may need minor tweaks

#### Purchase Orders / "Procurement"
**File:** `src/components/purchases/PurchaseOrders.tsx`
- ✅ PO creation exists
- ✅ Excel import exists (`SmartPOImport.tsx`)
- ❌ Not branded as "Procurement"
- ❌ No intake type wizard

---

## Implementation Phases

### PHASE 1: Engine Keys + Routes Normalization ⚠️ LOW RISK

**Goal:** Standardize engine keys and routes

**Tasks:**
1. Create "procurement" engine (alias for "orders")
2. Hide "lots" from launcher (keep in DB)
3. Verify all workspace_route = "/{key}"
4. Update sort_order for proper flow

**Database Changes:**
```sql
-- Add procurement engine as alias/replacement for orders
INSERT INTO engines (company_id, key, title, ...)
VALUES (?, 'procurement', 'Procurement', ...);

-- Hide lots from launcher (set is_enabled = false or add hidden flag)
UPDATE engines SET is_shown_in_launcher = false WHERE key = 'lots';

-- Add is_shown_in_launcher column if needed
ALTER TABLE engines ADD COLUMN IF NOT EXISTS is_shown_in_launcher boolean DEFAULT true;
```

**Component Changes:**
```typescript
// Add to engineComponentMap.tsx
'procurement': lazy(() => import('../components/purchases/PurchaseOrders')),

// Update appColors.ts
'procurement': {
  bg: 'bg-blue-600',
  text: 'text-blue-600',
  gradient: 'from-blue-500 to-blue-700',
}
```

**Risk:** ⭐ Low - Non-breaking, additive changes

---

### PHASE 2: App Launcher Refinements ✅ ALREADY DONE

**Status:** ✅ Completed in previous work
- Grid layout ✓
- Unique colors ✓
- No section headers ✓
- Search bar ✓

**Minor additions needed:**
- Filter out engines where `is_shown_in_launcher = false`
- Show "disabled" state for `is_enabled = false` engines

**Code Change:**
```typescript
// OdooStyleLauncher.tsx
const filteredEngines = engines
  .filter(e => e.is_shown_in_launcher !== false) // Hide lots
  .filter(e =>
    searchQuery === '' ||
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  .sort(...);
```

**Risk:** ⭐ Very Low - UI only

---

### PHASE 3: Role-Based Landing Integration ⚠️ MEDIUM RISK

**Goal:** Redirect users to role-appropriate app on login

**Current Flow:**
```
Login → AuthPage → ModularAppShell → OdooStyleLauncher
```

**New Flow:**
```
Login → AuthPage → Check Role → Navigate to landing route
                                  ↓
                    warehouse → /receiving
                    technician → /processing
                    admin → /
```

**Implementation:**
```typescript
// ModularAppShell.tsx or AuthPage.tsx
useEffect(() => {
  if (user && !hasNavigated) {
    const landingRoute = await userLandingService.getUserLandingRoute(user.id);
    navigate(landingRoute, { replace: true });
    setHasNavigated(true);
  }
}, [user]);
```

**Critical:** Must include Apps button in all workspaces so users aren't trapped

**Risk:** ⭐⭐ Medium - Changes login flow, could confuse existing users

---

### PHASE 4: Receiving App Routing ✅ MINIMAL WORK

**Status:** ✅ App already exists and is comprehensive

**Only needed:**
1. Ensure `/receiving` route works
2. Test warehouse role lands here
3. Verify no missing dependencies

**Risk:** ⭐ Very Low - Already implemented

---

### PHASE 5: Processing App with Gating ⚠️⚠️ HIGH COMPLEXITY

**Goal:** Single processing queue with intake_type filtering and wiping stage policy

**Current Issues:**
- No intake_type field on assets
- No processing stage policy
- Wiping stage not configurable

**Database Changes:**
```sql
-- Add intake_type to assets if missing
ALTER TABLE assets ADD COLUMN IF NOT EXISTS intake_type text
  CHECK (intake_type IN ('resale', 'itad', 'recycling'));

-- Create processing_policy table
CREATE TABLE processing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  show_wiping_for_itad boolean DEFAULT true,
  show_wiping_for_recycling boolean DEFAULT false,
  recycling_wipe_trigger text DEFAULT 'hdd_detected',
  itad_wipe_mandatory boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Service Layer:**
```typescript
// src/services/processingPolicyService.ts
export class ProcessingPolicyService {
  async getPolicy(companyId: string) {
    // Fetch processing_policies
  }

  shouldShowWipingStage(assetIntakeType: string, policy: Policy) {
    if (assetIntakeType === 'resale') return false;
    if (assetIntakeType === 'itad') return policy.show_wiping_for_itad;
    if (assetIntakeType === 'recycling') {
      if (policy.recycling_wipe_trigger === 'never') return false;
      if (policy.recycling_wipe_trigger === 'always') return true;
      // 'hdd_detected' - check asset specs
      return asset.product_type?.includes('HDD');
    }
  }
}
```

**UI Changes:**
```typescript
// Processing.tsx
const stages = useMemo(() => {
  let allStages = ['received', 'testing', 'grading', 'qa', 'route'];

  if (shouldShowWipingStage(asset.intake_type, policy)) {
    allStages.splice(2, 0, 'wiping'); // Insert after testing
  }

  return allStages;
}, [asset, policy]);
```

**Risk:** ⭐⭐⭐ High - Complex logic, affects core workflow

---

### PHASE 6: Procurement App Branding ⚠️ LOW RISK

**Goal:** Rebrand "orders" → "procurement" with intake wizard

**Tasks:**
1. Update engine title in DB
2. Create intake wizard component
3. Link to existing PO import
4. Move normalization to Procurement settings

**Changes:**
```typescript
// Create ProcurementApp.tsx wrapper
export function ProcurementApp() {
  return (
    <div>
      <h1>Procurement</h1>
      <Tabs>
        <Tab label="Create Intake">
          <CreateIntakeWizard />
        </Tab>
        <Tab label="Purchase Orders">
          <PurchaseOrders />
        </Tab>
        <Tab label="Import">
          <SmartPOImport />
        </Tab>
      </Tabs>
    </div>
  );
}
```

**Risk:** ⭐ Low - Mostly UI reorganization

---

### PHASE 7: Recycling App UOM + Commodities ⚠️⚠️ MEDIUM RISK

**Goal:** Add UOM support and commodities tracking

**Database Changes:**
```sql
-- Add commodities table
CREATE TABLE commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  name text NOT NULL,
  uom text NOT NULL, -- 'kg', 'lbs', 'units'
  default_price_per_unit numeric,
  category text, -- 'metal', 'plastic', 'precious'
  created_at timestamptz DEFAULT now()
);

-- Add recycling_outputs table
CREATE TABLE recycling_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recycling_order_id uuid REFERENCES recycling_orders(id),
  commodity_id uuid REFERENCES commodities(id),
  quantity numeric NOT NULL,
  uom text NOT NULL,
  weight_kg numeric,
  created_at timestamptz DEFAULT now()
);
```

**UI Changes:**
- Add Commodities management in Settings → Recycling
- Add Outputs tab in RecyclingWorkspace
- UOM conversion utilities

**Risk:** ⭐⭐ Medium - New data model, needs testing

---

### PHASE 8: ITAD App Refinement ⚠️ LOW RISK

**Goal:** Ensure ITAD is compliance-focused, not operations

**Changes:**
- Verify tabs: Projects, Assets, Certificates, Settlements
- Remove any processing queue views (link to /processing instead)
- Ensure wipe certificates pull from processing data

**Risk:** ⭐ Low - Mostly UI refinement

---

### PHASE 9: Settings Modularization ⚠️⚠️ MEDIUM RISK

**Goal:** Settings organized by app, only show for installed engines

**Structure:**
```
Settings
├─ General (Company, Users, Roles)
├─ Procurement
│   ├─ Normalization
│   └─ Templates
├─ Processing
│   ├─ Stages
│   └─ Wiping Policy
├─ Recycling
│   ├─ Commodities
│   └─ TSDF Partners
└─ ITAD
    └─ Wipe Providers
```

**Implementation:**
```typescript
// SystemConfig.tsx
const installedEngines = await engineRegistryService.getInstalledEngines();
const settingsSections = installedEngines
  .filter(e => hasSettingsComponent(e.key))
  .map(e => ({
    key: e.key,
    title: `${e.title} Settings`,
    component: lazy(() => import(`./settings/${e.key}/SettingsPage`))
  }));
```

**Risk:** ⭐⭐ Medium - Needs file reorganization

---

### PHASE 10: Reports App Consolidation ⚠️ MEDIUM RISK

**Goal:** Single Reports app with all compliance reports

**Consolidate:**
- ESG reporting
- TSDF tracking
- Certificates (wipe, destruction, recycling)
- Audit exports

**Filters:**
- By lot/batch
- By client
- By date range
- By company (if multi-tenant)

**Implementation:**
```typescript
// ReportsApp.tsx
export function ReportsApp() {
  return (
    <div>
      <ReportFilters />
      <Tabs>
        <Tab label="ESG">
          <ESGDashboard />
        </Tab>
        <Tab label="Certificates">
          <CertificatesList />
        </Tab>
        <Tab label="TSDF">
          <TSDFTracking />
        </Tab>
        <Tab label="Audit">
          <AuditExports />
        </Tab>
      </Tabs>
    </div>
  );
}
```

**Risk:** ⭐⭐ Medium - Consolidating existing features

---

## Risk Assessment Matrix

| Phase | Risk Level | Complexity | User Impact | Recommendation |
|-------|-----------|------------|-------------|----------------|
| 1: Engine Keys | ⭐ Low | Low | None | ✅ Safe to implement |
| 2: Launcher | ⭐ Very Low | Low | Positive | ✅ Already done |
| 3: Role Landing | ⭐⭐ Medium | Medium | Medium | ⚠️ Needs user testing |
| 4: Receiving | ⭐ Very Low | Low | None | ✅ Safe to implement |
| 5: Processing | ⭐⭐⭐ High | High | High | ⚠️⚠️ Needs careful planning |
| 6: Procurement | ⭐ Low | Low | Low | ✅ Safe to implement |
| 7: Recycling | ⭐⭐ Medium | Medium | Medium | ⚠️ Needs testing |
| 8: ITAD | ⭐ Low | Low | Low | ✅ Safe to implement |
| 9: Settings | ⭐⭐ Medium | Medium | Low | ⚠️ Needs file reorganization |
| 10: Reports | ⭐⭐ Medium | Medium | Low | ⚠️ UI consolidation |

---

## Recommended Implementation Order

### Sprint 1: Foundation (Low Risk)
1. ✅ Phase 2: Launcher (DONE)
2. Phase 1: Engine keys normalization
3. Phase 4: Receiving routing verification
4. Phase 6: Procurement branding

**Goal:** Get foundation right with minimal risk

### Sprint 2: Role-Based Experience (Medium Risk)
1. Phase 3: Role-based landing
2. Phase 8: ITAD refinement
3. Phase 10: Reports consolidation

**Goal:** Improve UX without changing core logic

### Sprint 3: Processing Enhancement (High Risk)
1. Phase 5: Processing with gating policies

**Goal:** Tackle most complex feature separately

### Sprint 4: Recycling & Settings (Medium Risk)
1. Phase 7: Recycling UOM + commodities
2. Phase 9: Settings modularization

**Goal:** Complete specialized features

---

## Migration Strategy

### Zero Downtime Approach

**For Engine Keys:**
```sql
-- Add new engines without removing old ones
INSERT INTO engines (key, title, ...) VALUES ('procurement', ...);

-- Keep 'orders' working during transition
-- Both point to same component initially
```

**For Processing:**
```typescript
// Feature flag approach
const useNewProcessingFlow = company.feature_flags?.new_processing ?? false;

if (useNewProcessingFlow) {
  return <ProcessingWithGating />;
} else {
  return <ProcessingLegacy />;
}
```

### Rollback Plan

**Each phase should have:**
1. Feature flag to enable/disable
2. Database migration + down migration
3. Component version toggle
4. Monitoring metrics

---

## Testing Strategy

### Unit Tests Needed
- `processingPolicyService` logic
- `userLandingService` role mapping
- UOM conversion utilities
- Commodity calculations

### Integration Tests Needed
- Role-based landing flow
- Processing stage gating
- Receiving → Processing handoff
- Reports data aggregation

### User Acceptance Testing
- Warehouse user journey
- Technician user journey
- Compliance user journey
- Manager/admin journey

---

## Performance Considerations

### Potential Bottlenecks

1. **App Launcher:** 20+ engine queries per page load
   - **Solution:** Cache enabled engines in React context

2. **Processing Queue:** Large kanban boards (1000+ assets)
   - **Solution:** Virtual scrolling, pagination

3. **Reports:** Complex aggregations across lots
   - **Solution:** Pre-computed materialized views

### Optimization Strategies

```typescript
// Cache engine list in context
const EngineContext = createContext();

export function EngineProvider({ children }) {
  const [engines, setEngines] = useState([]);

  useEffect(() => {
    loadEngines().then(setEngines);
  }, [companyId]);

  return <EngineContext.Provider value={engines}>{children}</EngineContext.Provider>;
}
```

---

## Breaking Changes Audit

### None Expected! ✅

All changes are additive or UI-only:
- ✅ New engines don't break existing routes
- ✅ Role-based landing can be opt-in
- ✅ Processing gating is backward compatible
- ✅ Existing data models preserved

---

## Success Criteria

### Phase 1 Complete When:
- [ ] "procurement" engine exists and loads
- [ ] "lots" hidden from launcher
- [ ] All engines have workspace_route = "/{key}"

### Phase 3 Complete When:
- [ ] Warehouse user lands at /receiving on login
- [ ] Technician lands at /processing
- [ ] Apps button visible everywhere
- [ ] User can manually navigate to other apps

### Phase 5 Complete When:
- [ ] Processing shows single queue with filters
- [ ] Wiping stage visible only per policy
- [ ] Resale assets never see wiping
- [ ] ITAD assets see optional wiping
- [ ] Recycling respects HDD detection

### All Phases Complete When:
- [ ] App launcher looks like Odoo (DONE ✓)
- [ ] Warehouse can complete receiving without distractions
- [ ] Processing works for all intake types
- [ ] Procurement has intake wizard
- [ ] Recycling supports UOM + commodities
- [ ] Reports consolidates ESG/TSDF/certificates
- [ ] Settings organized by app
- [ ] No parallel data truths

---

## Open Questions for User

1. **Engine Keys:**
   - Keep "orders" as alias or fully migrate to "procurement"?
   - Should "lots" be completely hidden or just not shown in launcher?

2. **Role Landing:**
   - Should this be opt-in with a settings toggle?
   - What if user wants to override their default landing?

3. **Processing Stages:**
   - Should wiping stage be mandatory for ITAD or always optional?
   - What other stages need gating (e.g., QA only for certain types)?

4. **Recycling:**
   - Which UOM units should be supported? (kg, lbs, tons, units?)
   - Should commodities have min/max pricing?

5. **Reports:**
   - Should ESG be a tab in Reports or stay separate?
   - What other report types are needed?

6. **Priority:**
   - Which phases are most critical for your users?
   - Any phase that can be deferred?

---

## Conclusion

### What's Working Well ✅
- Colorful app launcher (just implemented)
- Engine registry architecture
- Existing comprehensive apps (Receiving, Processing, ITAD)
- Routing structure

### What Needs Work ⚠️
- Role-based landing integration
- Processing gating policies
- Procurement branding
- Recycling UOM support
- Settings modularization

### Biggest Risks ⚠️⚠️⚠️
1. Phase 5 (Processing gating) - Complex business logic
2. Phase 3 (Role landing) - Changes login experience
3. Phase 9 (Settings) - File reorganization overhead

### Recommended Start Point 🎯
**Begin with Sprint 1 (Low Risk):**
1. Phase 1: Engine normalization
2. Phase 4: Verify receiving
3. Phase 6: Procurement branding

This gets quick wins without touching risky areas.

---

**Next Steps:**
1. Review this analysis
2. Answer open questions
3. Prioritize phases
4. Approve Sprint 1 to begin implementation
