# Stock Pro: Refactoring Plan - Engine-Based Architecture
**Date:** February 1, 2026
**Status:** Analysis Complete - Implementation Pending Approval

---

## EXECUTIVE SUMMARY

This plan transforms the existing Stock Pro application from a monolithic structure into a **modular engine-based architecture** WITHOUT rebuilding the application. The goal is to support multiple business models (Reseller, ITAD, Recycling, Auctions, eCommerce, CRM) through **feature toggles** while maintaining a **single unified data model** and coherent UX.

**Key Principle:** EXTEND, DON'T DUPLICATE

---

## PART 1: CORE vs ENGINE MAPPING

### 1.1 CORE DATA MODEL (Already Exists - Keep & Consolidate)

#### ✅ **Party (Unified Entity)**
**Current State:**
- `customers` table (sales customers + ITAD clients)
- `suppliers` table (purchase vendors)
- `downstream_vendors` table (recycling partners)
- `buyer_accounts` table (auction buyers)

**Refactoring Action:**
- ✅ KEEP all existing tables (no breaking changes)
- ✅ ADD `entity_type` field to each table with values: `sales_customer`, `itad_client`, `purchase_vendor`, `consignment_vendor`, `recycling_partner`, `auction_buyer`, `prospect`
- ✅ ADD `is_prospect` boolean flag
- ✅ CREATE VIEW `unified_parties` that unions all party tables for reporting
- 🚫 DO NOT merge tables (would break existing foreign keys)

#### ✅ **Asset (Core Physical Item)**
**Current State:**
- `assets` table with comprehensive fields
- Supports serial tracking, cost tracking, status, grading, location, lot assignment

**Refactoring Action:**
- ✅ KEEP existing table (already well-designed)
- ✅ ADD `business_source` field: `purchase`, `itad_intake`, `consignment`, `return`, `transfer`
- ✅ ADD `ownership_type` field: `owned`, `consignment`, `customer_owned`
- ✅ ENSURE `disposal_method` field exists for recycling tracking
- ✅ ADD `project_id` generic reference (links to ITAD projects, consignment agreements, etc.)

#### ✅ **Component (Harvestable Parts)**
**Current State:**
- `asset_components` (installed components)
- `harvested_components_inventory` (extracted components)

**Refactoring Action:**
- ✅ KEEP both tables (serve different purposes)
- ✅ ADD `source_asset_id` to harvested components for traceability
- ✅ ADD `harvest_date` and `harvested_by` for audit
- ✅ UNIFY status values across both tables

#### ✅ **Lot (Aggregation)**
**Current State:**
- `purchase_lots` (batch purchase tracking)

**Refactoring Action:**
- ✅ RENAME to `lots` (generic)
- ✅ ADD `lot_type` field: `purchase`, `itad_project`, `consignment`, `auction`
- ✅ ADD `reference_id` (links to PO, ITAD project, auction event)
- ✅ KEEP all existing P&L fields

#### ✅ **Order (Universal Transaction)**
**Current State:**
- `purchase_orders` (inbound)
- `sales_invoices` (outbound)

**Refactoring Action:**
- ✅ KEEP both tables (represent different flows)
- ✅ ADD `order_type` to purchases: `purchase`, `consignment`, `transfer_in`
- ✅ ADD `order_type` to sales: `direct_sale`, `auction_settlement`, `component_sale`, `wholesale`
- ✅ ADD `channel` to sales: `direct`, `auction`, `website`, `marketplace`

#### ✅ **Document (Certificates, Reports)**
**Current State:**
- `data_destruction_certificates`
- `recycling_certificates`
- `environmental_reports`

**Refactoring Action:**
- ✅ KEEP existing tables
- ✅ CREATE `documents` universal table for OTHER document types
- ✅ ADD `document_type`, `entity_type`, `entity_id`, `file_url`, `generated_by`, `status`
- ✅ USE for: quotes, packing slips, COAs, inspection reports, customs docs

---

### 1.2 ENGINE FEATURE FLAGS (Add to `companies` table)

**Refactoring Action:**
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reseller_enabled boolean DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS itad_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS recycling_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auction_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS crm_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS consignment_enabled boolean DEFAULT false;
```

**Default State:** All existing companies get `reseller_enabled = true` (current behavior)

---

## PART 2: ENGINE BEHAVIOR DEFINITION

### 2.1 RESELLER ENGINE (Default - Already Built)

**Status:** ✅ Fully Implemented

**Features:**
- Purchase Order → Receiving → Asset Creation
- Testing & Refurbishment workflows
- Grading & condition assessment
- Sales invoicing with serial fulfillment
- Profit margin tracking
- Warranty & RMA

**Refactoring Action:**
- ✅ NO CHANGES to core flow
- ✅ ADD `reseller_enabled` check to hide menu items when disabled

---

### 2.2 ITAD ENGINE

**Status:** 🟡 Partially Implemented (70%)

**Existing Features:**
- `itad_projects` table
- `itad_intakes` workflow
- Data sanitization tracking
- Certificate generation
- Customer portal
- Revenue settlements

**Missing Features:**
- 🔴 ITAD project creation wizard (UI missing)
- 🔴 Customer-facing project dashboard
- 🔴 Automated certificate generation triggers
- 🔴 Integration with wiping software APIs (Blancco, WipeDrive)
- 🔴 Chain of custody tracking

**Refactoring Actions:**
1. ✅ EXTEND `itad_projects` with `service_agreement` JSONB field
2. ✅ CREATE `ITADProjectWizard` component (new)
3. ✅ ADD "ITAD Workspace" navigation section (when `itad_enabled = true`)
4. ✅ MOVE existing ITAD screens into this workspace
5. ✅ CREATE `data_sanitization_integrations` table for API configs
6. ✅ ADD certificate auto-generation on wipe completion
7. ✅ CREATE `chain_of_custody` table linking asset movements to ITAD projects

---

### 2.3 RECYCLING ENGINE

**Status:** 🟡 Partially Implemented (50%)

**Existing Features:**
- Component harvesting workflow
- `disposal_method` tracking
- `downstream_vendors` table
- Environmental reporting

**Missing Features:**
- 🔴 Material breakdown by weight (plastic, metal, glass)
- 🔴 Commodity pricing integration
- 🔴 Scrap value calculation
- 🔴 Recycler settlement workflow
- 🔴 Material shipping documents

**Refactoring Actions:**
1. ✅ ADD `material_breakdown` JSONB to assets: `{plastic_kg, metal_kg, glass_kg, pcb_kg, battery_kg, other_kg}`
2. ✅ CREATE `recycling_shipments` table (batch shipments to recyclers)
3. ✅ CREATE `commodity_prices` table (market rates for materials)
4. ✅ ADD scrap value auto-calculation trigger
5. ✅ CREATE `RecyclingWorkflow` component
6. ✅ ADD "Recycling Workspace" section (when `recycling_enabled = true`)

---

### 2.4 AUCTION ENGINE

**Status:** 🟡 Partially Implemented (60%)

**Existing Features:**
- `auction_houses`, `auction_events`, `auction_lots` tables
- Bid tracking
- Settlement recording

**Missing Features:**
- 🔴 Bulk lot creation wizard
- 🔴 Auction platform API integration (eBay, Hibid)
- 🔴 Automated listing generation
- 🔴 Auction performance analytics

**Refactoring Actions:**
1. ✅ CREATE `AuctionLotWizard` component (batch lot creation)
2. ✅ ADD `auction_integrations` table for API credentials
3. ✅ CREATE automated listing generator (description templates)
4. ✅ ADD "Auctions Workspace" section
5. ✅ MOVE `AuctionManagement` into workspace

---

### 2.5 WEBSITE/ECOMMERCE ENGINE

**Status:** 🔴 Not Implemented (0%)

**Required Features:**
- Public product catalog (filtered by `is_sales_ready = true`)
- Shopping cart & checkout
- Customer account creation
- Shipping calculation
- Payment gateway integration (Stripe)

**Refactoring Actions:**
1. ✅ CREATE `website_settings` table (theme, logo, policies)
2. ✅ CREATE `shopping_carts` table
3. ✅ CREATE `website_orders` (links to `sales_invoices` on completion)
4. ✅ CREATE `/storefront` route (public site)
5. ✅ REUSE `assets` + `harvested_components_inventory` for product data
6. ✅ ADD "Website Workspace" for admin (product management, order fulfillment)
7. ✅ CREATE `WebsiteBuilder` component (settings, theme)

---

### 2.6 CRM ENGINE

**Status:** 🟡 Partially Implemented (30%)

**Existing Features:**
- `customers` table with contact info
- Basic customer management

**Missing Features:**
- 🔴 Lead tracking & qualification
- 🔴 Sales pipeline stages
- 🔴 Activity logging (calls, emails, meetings)
- 🔴 Quote generation
- 🔴 Opportunity tracking

**Refactoring Actions:**
1. ✅ CREATE `leads` table (prospects not yet customers)
2. ✅ CREATE `opportunities` table (sales pipeline)
3. ✅ CREATE `activities` table (CRM interactions)
4. ✅ CREATE `quotes` table (pre-sales documents)
5. ✅ ADD `lead_source` to customers
6. ✅ CREATE "CRM Workspace" with: Leads, Opportunities, Activities, Quotes
7. ✅ CREATE `LeadManagement` component

---

## PART 3: UI REORGANIZATION (NO DUPLICATION)

### 3.1 NEW WORKSPACE STRUCTURE

**Replace current flat navigation with workspace-based organization:**

```
STOCK PRO
├── 🏠 Dashboard (universal - always visible)
│   └── Metrics, alerts, recent activity
│
├── 📦 OPERATIONS (when reseller_enabled OR itad_enabled)
│   ├── Assets (Processing) - MOVE from current "Operations"
│   ├── Receiving - KEEP existing SmartReceivingWorkflow
│   ├── Locations - KEEP existing
│   └── Stock Movements - KEEP existing
│
├── 💰 SALES (when reseller_enabled OR website_enabled)
│   ├── Sales Catalog - KEEP existing UnifiedSalesCatalog
│   ├── Sales Invoices - KEEP existing
│   ├── Returns & RMA - KEEP existing Returns component
│   └── Warranties - NEW (consolidate warranty tracking)
│
├── 🛒 PURCHASING (when reseller_enabled)
│   ├── Purchase Orders - KEEP existing
│   ├── Suppliers - KEEP existing
│   └── Lots & P&L - KEEP existing PurchaseLots
│
├── ♻️ RECYCLING (when recycling_enabled) - NEW WORKSPACE
│   ├── Component Inventory - MOVE HarvestedComponentsEnhanced
│   ├── Component Sales - MOVE ComponentSales
│   ├── Disassembly Queue - NEW (assets pending harvest)
│   ├── Scrap Shipments - NEW
│   └── Material Pricing - MOVE ComponentMarketPrices
│
├── 🔐 ITAD (when itad_enabled) - EXISTING BUT REORGANIZE
│   ├── Projects - KEEP ITADProjects
│   ├── Collection Requests - NEW (consolidate)
│   ├── Data Sanitization - KEEP DataSanitization
│   ├── Certificates - KEEP Certificates
│   ├── Revenue Settlements - KEEP ITADRevenueSettlements
│   ├── Compliance - KEEP ITADCompliance
│   └── Downstream Vendors - KEEP DownstreamVendors
│
├── 🔨 AUCTIONS (when auction_enabled)
│   ├── Auction Lots - MOVE AuctionManagement
│   ├── Auction Houses - NEW (manage platforms)
│   ├── Events - NEW (auction calendar)
│   └── Settlements - NEW (buyer payments)
│
├── 🌐 WEBSITE (when website_enabled) - NEW WORKSPACE
│   ├── Storefront Settings
│   ├── Product Catalog (asset/component publishing)
│   ├── Online Orders
│   ├── Customer Accounts
│   └── Shipping Rules
│
├── 👥 CRM (when crm_enabled) - NEW WORKSPACE
│   ├── Leads
│   ├── Opportunities
│   ├── Activities
│   ├── Quotes
│   └── Customers - MOVE from Business
│
├── 📊 REPORTS (universal)
│   ├── Financial Reports - MOVE from Accounting
│   ├── Inventory Reports
│   ├── Sales Analytics
│   ├── ITAD Metrics (if enabled)
│   └── Environmental Impact (if recycling enabled)
│
├── 💼 ACCOUNTING (always visible for admin/manager)
│   ├── Chart of Accounts - KEEP existing
│   ├── Journal Entries - KEEP existing
│   └── (Future: Reconciliation, Payments)
│
└── ⚙️ SETTINGS (admin only)
    ├── Company Profile
    ├── Locations
    ├── Users
    ├── Product Setup - KEEP ProductSetup
    ├── Processing Stages - KEEP ProcessingStages
    ├── Business Rules - KEEP BusinessRules
    ├── Import Intelligence - KEEP ImportIntelligence
    ├── System Config - KEEP SystemConfig
    └── Engine Toggles - NEW (enable/disable engines)
```

### 3.2 IMPLEMENTATION APPROACH

**Phase 1: Add Engine Flags (Non-Breaking)**
1. Add boolean columns to `companies` table
2. Set defaults to maintain current behavior
3. Create `EngineToggles` settings page

**Phase 2: Reorganize Navigation (Non-Breaking)**
1. Update `SimplifiedAppBar.tsx` with workspace structure
2. Conditionally render workspaces based on flags
3. Keep all existing page routes working
4. Add breadcrumb workspace context

**Phase 3: Move Components (Non-Breaking)**
1. Move existing components into workspace folders
2. Update imports
3. No functional changes to components
4. Keep backward-compatible routes

**Phase 4: Add Missing Features**
1. Build new components for gaps (wizards, workflows)
2. Create new tables for missing engines
3. Extend existing tables with engine-specific fields

---

## PART 4: DATABASE REFACTORING

### 4.1 MIGRATIONS REQUIRED

#### Migration 1: Engine Flags
```sql
-- Add engine toggles to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reseller_enabled boolean DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS itad_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS recycling_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auction_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS crm_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS consignment_enabled boolean DEFAULT false;

-- Enable flags for existing companies based on what they're using
UPDATE companies SET itad_enabled = true
WHERE id IN (SELECT DISTINCT company_id FROM itad_projects);

UPDATE companies SET auction_enabled = true
WHERE id IN (SELECT DISTINCT company_id FROM auction_lots);
```

#### Migration 2: Extend Core Tables
```sql
-- Add business source tracking to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS business_source text DEFAULT 'purchase';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'owned';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS project_id uuid;

-- Add entity type classification to parties
ALTER TABLE customers ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'sales_customer';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'purchase_vendor';

-- Rename purchase_lots to lots (more generic)
ALTER TABLE purchase_lots ADD COLUMN IF NOT EXISTS lot_type text DEFAULT 'purchase';
ALTER TABLE purchase_lots ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE purchase_lots ADD COLUMN IF NOT EXISTS reference_id uuid;

-- Add order type classification
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'purchase';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'direct_sale';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS sales_channel text DEFAULT 'direct';
```

#### Migration 3: New Tables for Missing Engines
```sql
-- Universal documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  document_type text NOT NULL,
  document_number text NOT NULL,
  entity_type text,
  entity_id uuid,
  file_url text,
  status text DEFAULT 'draft',
  generated_by uuid REFERENCES profiles(id),
  generated_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb,
  UNIQUE(company_id, document_number)
);

-- CRM tables
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  lead_name text NOT NULL,
  company_name text,
  contact_email text,
  contact_phone text,
  lead_source text,
  status text DEFAULT 'new',
  qualification_score int,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES customers(id),
  opportunity_name text NOT NULL,
  value_estimate numeric(12,2),
  probability_percent int,
  stage text DEFAULT 'prospecting',
  expected_close_date date,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  activity_type text NOT NULL,
  subject text NOT NULL,
  description text,
  entity_type text,
  entity_id uuid,
  assigned_to uuid REFERENCES profiles(id),
  completed_at timestamptz,
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Recycling tables
CREATE TABLE IF NOT EXISTS recycling_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  shipment_number text NOT NULL,
  downstream_vendor_id uuid REFERENCES downstream_vendors(id) NOT NULL,
  shipment_date date NOT NULL,
  total_weight_kg numeric(10,2),
  estimated_value numeric(12,2),
  actual_settlement numeric(12,2),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, shipment_number)
);

CREATE TABLE IF NOT EXISTS commodity_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  material_type text NOT NULL,
  price_per_kg numeric(10,4),
  currency text DEFAULT 'USD',
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Website tables
CREATE TABLE IF NOT EXISTS website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL UNIQUE,
  site_name text,
  logo_url text,
  theme_color text DEFAULT '#3b82f6',
  policies jsonb,
  payment_methods jsonb,
  shipping_zones jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  customer_email text,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);
```

### 4.2 NO-BREAK GUARANTEE

All migrations are **additive only**:
- ✅ New columns have defaults
- ✅ Existing foreign keys unchanged
- ✅ No data deletion
- ✅ Existing queries continue to work
- ✅ RLS policies remain intact

---

## PART 5: SERVICE LAYER REFACTORING

### 5.1 EXISTING SERVICES (Keep & Extend)

**No Changes Required:**
- `baseService` - Keep as-is
- `assetService` - Add engine-aware filtering methods
- `purchaseOrderService` - Add order type support
- `salesInvoiceService` - Add channel tracking
- `customerService` - Add entity type filtering
- `supplierService` - Keep as-is
- `inventoryService` - Keep as-is
- `dashboardService` - Add engine-specific metrics
- `accountingService` - Keep as-is
- `itadRevenueService` - Keep as-is
- `componentHarvestingService` - Keep as-is
- `auctionService` - Keep as-is

### 5.2 NEW SERVICES NEEDED

1. **`engineService.ts`** - Engine toggle management
2. **`crmService.ts`** - Lead, opportunity, activity management
3. **`recyclingService.ts`** - Shipment & commodity tracking
4. **`websiteService.ts`** - Storefront & cart management
5. **`documentService.ts`** - Universal document generation

---

## PART 6: COMPONENT REFACTORING

### 6.1 EXISTING COMPONENTS (Relocate, Don't Rebuild)

**File Moves (No Code Changes):**
```
FROM: src/components/processing/Processing.tsx
TO:   src/components/operations/Assets.tsx

FROM: src/components/inventory/SaleableInventory.tsx
TO:   src/components/sales/SalesCatalog.tsx

FROM: src/components/inventory/HarvestedComponentsEnhanced.tsx
TO:   src/components/recycling/ComponentInventory.tsx

FROM: src/components/inventory/ComponentSales.tsx
TO:   src/components/recycling/ComponentSales.tsx

FROM: src/components/auctions/AuctionManagement.tsx
TO:   src/components/auctions/AuctionLots.tsx
```

**Component Wrappers (Add Engine Checks):**
```typescript
// Example: Wrap existing components with engine checks
export function SalesWorkspace() {
  const { selectedCompany } = useCompany();

  if (!selectedCompany?.reseller_enabled && !selectedCompany?.website_enabled) {
    return <EngineDisabledMessage engine="Sales" />;
  }

  return <ExistingComponent />;
}
```

### 6.2 NEW COMPONENTS NEEDED

1. **`EngineToggles.tsx`** - Admin settings for engine management
2. **`LeadManagement.tsx`** - CRM lead tracking
3. **`OpportunityPipeline.tsx`** - CRM sales pipeline
4. **`ActivityLog.tsx`** - CRM activity tracking
5. **`RecyclingShipments.tsx`** - Scrap shipment tracking
6. **`WebsiteBuilder.tsx`** - Storefront configuration
7. **`StorefrontCatalog.tsx`** - Public product display
8. **`ITADProjectWizard.tsx`** - Guided ITAD project setup
9. **`AuctionLotWizard.tsx`** - Batch auction lot creation

---

## PART 7: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- ✅ Add engine flag columns to companies table
- ✅ Create `EngineToggles` settings component
- ✅ Add `engineService` for flag management
- ✅ Create workspace-based navigation structure
- ✅ Test with existing features (should work unchanged)

### Phase 2: Reorganization (Week 2)
- ✅ Move existing components into workspace folders
- ✅ Update all imports
- ✅ Add engine visibility checks to navigation
- ✅ Update breadcrumbs with workspace context
- ✅ Test all existing workflows

### Phase 3: Data Model Extensions (Week 3)
- ✅ Create migrations for core table extensions
- ✅ Add business_source, ownership_type to assets
- ✅ Add entity_type to party tables
- ✅ Rename purchase_lots to lots with type field
- ✅ Test data integrity

### Phase 4: CRM Engine (Week 4)
- ✅ Create CRM tables (leads, opportunities, activities)
- ✅ Create `crmService`
- ✅ Build `LeadManagement` component
- ✅ Build `OpportunityPipeline` component
- ✅ Add CRM workspace to navigation

### Phase 5: Recycling Engine (Week 5)
- ✅ Create recycling tables (shipments, commodity prices)
- ✅ Create `recyclingService`
- ✅ Build `RecyclingShipments` component
- ✅ Add material breakdown tracking to assets
- ✅ Add Recycling workspace to navigation

### Phase 6: Website Engine (Week 6-7)
- ✅ Create website tables (settings, carts)
- ✅ Create `websiteService`
- ✅ Build `WebsiteBuilder` admin component
- ✅ Build `StorefrontCatalog` public component
- ✅ Add payment gateway integration (Stripe)
- ✅ Add Website workspace to navigation

### Phase 7: ITAD Enhancement (Week 8)
- ✅ Create `ITADProjectWizard` component
- ✅ Add automated certificate generation
- ✅ Create `chain_of_custody` tracking table
- ✅ Add data sanitization API integrations
- ✅ Enhance customer portal

### Phase 8: Auction Enhancement (Week 9)
- ✅ Create `AuctionLotWizard` component
- ✅ Add auction platform API integrations
- ✅ Build automated listing generator
- ✅ Add auction analytics dashboard

### Phase 9: Universal Documents (Week 10)
- ✅ Create `documents` table
- ✅ Create `documentService`
- ✅ Migrate existing certificates to use universal system
- ✅ Add quote generation, COAs, etc.

### Phase 10: Testing & Polish (Week 11-12)
- ✅ End-to-end testing of all engines
- ✅ Performance optimization
- ✅ Documentation updates
- ✅ User training materials

---

## PART 8: BACKWARD COMPATIBILITY GUARANTEES

### 8.1 DATA SAFETY
- ✅ No data deletion
- ✅ All migrations are additive
- ✅ Existing foreign keys preserved
- ✅ RLS policies unchanged
- ✅ Default values maintain current behavior

### 8.2 API COMPATIBILITY
- ✅ Existing service methods unchanged
- ✅ New methods added, not modified
- ✅ Component props remain backward compatible
- ✅ Existing routes continue to work

### 8.3 UX CONTINUITY
- ✅ Default engine state matches current behavior
- ✅ Existing workflows unchanged
- ✅ New features opt-in via engine toggles
- ✅ No forced migrations

---

## PART 9: SUCCESS CRITERIA

### Functional Requirements
- ✅ All existing features work unchanged
- ✅ Engine toggles show/hide relevant workspaces
- ✅ No duplicate screens or data
- ✅ Single source of truth for all entities
- ✅ Clean workspace-based navigation

### Technical Requirements
- ✅ Zero breaking changes
- ✅ Build succeeds with no errors
- ✅ All tests pass
- ✅ Database migrations are reversible
- ✅ Performance not degraded

### User Experience Requirements
- ✅ Feels like one cohesive product
- ✅ Intuitive workspace organization
- ✅ No engine jargon in operator UI
- ✅ Clear primary actions on all screens
- ✅ Consistent design patterns

---

## PART 10: RISKS & MITIGATIONS

### Risk 1: Breaking Existing Workflows
**Mitigation:**
- Phased rollout with feature flags
- Comprehensive regression testing
- Parallel running old + new navigation
- Quick rollback plan

### Risk 2: Data Migration Errors
**Mitigation:**
- Migrations are additive only
- Defaults preserve current state
- Backup before each phase
- Dry-run in staging environment

### Risk 3: User Confusion
**Mitigation:**
- Gradual UI changes with notices
- In-app tutorials for new features
- Documentation and training
- Support team prepared for questions

### Risk 4: Performance Degradation
**Mitigation:**
- Add database indexes for new queries
- Lazy-load workspace components
- Monitor query performance
- Optimize expensive operations

---

## CONCLUSION

This refactoring plan transforms Stock Pro into a **modular, engine-based platform** while maintaining **100% backward compatibility**. The approach is:

1. **Conservative:** No breaking changes, additive only
2. **Incremental:** Small phases with testing between
3. **Reversible:** All changes can be rolled back
4. **User-Friendly:** Maintains current UX while adding power

The result will be a **single unified product** that serves multiple business models through **feature toggles**, not separate applications.

**Next Step:** Review and approve this plan before implementation begins.

---

**Document Version:** 1.0
**Last Updated:** February 1, 2026
**Status:** Awaiting Approval
