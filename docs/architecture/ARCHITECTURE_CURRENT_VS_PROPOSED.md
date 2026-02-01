# Stock Pro: Current vs Proposed Architecture

## CURRENT ARCHITECTURE (Monolithic)

```
┌─────────────────────────────────────────────────────────────────┐
│                        STOCK PRO v1.0                           │
│                    (Single Flat Structure)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ├── Dashboard
                                 │
                                 ├── Operations
                                 │   ├── Assets (Processing)
                                 │   ├── Receiving
                                 │   └── Locations
                                 │
                                 ├── Business (Mixed)
                                 │   ├── Purchases
                                 │   ├── Sales
                                 │   ├── Suppliers
                                 │   ├── Customers
                                 │   └── Lots
                                 │
                                 ├── Inventory (Mixed)
                                 │   ├── Saleable Inventory
                                 │   ├── Harvested Components
                                 │   └── Component Sales
                                 │
                                 ├── ITAD (Separate Silo)
                                 │   ├── Projects
                                 │   ├── Compliance
                                 │   └── Certificates
                                 │
                                 ├── Auctions (Separate Silo)
                                 │   └── Auction Management
                                 │
                                 ├── Accounting
                                 │   ├── Chart of Accounts
                                 │   └── Journal Entries
                                 │
                                 ├── Reports
                                 │
                                 └── Settings
                                     └── (Everything else)

PROBLEMS:
❌ Flat navigation - no logical grouping
❌ Mixed concerns (sales + purchases in same menu)
❌ Siloed features (ITAD separate from operations)
❌ Hard-coded business model (reseller-centric)
❌ Duplicate inventory screens
❌ No feature toggles
❌ Not scalable
```

---

## PROPOSED ARCHITECTURE (Modular Engine-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│                        STOCK PRO v2.0                           │
│              (Engine-Based Modular Platform)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   CORE DATA MODEL       │
                    │   (Shared by All)       │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
    ┌────▼────┐            ┌────▼────┐            ┌────▼────┐
    │ Parties │            │ Assets  │            │ Orders  │
    └────┬────┘            └────┬────┘            └────┬────┘
         │                      │                      │
         │   ┌──────────────────┼──────────────────┐   │
         │   │                  │                  │   │
         │   │    ENGINES (Toggleable Modules)    │   │
         │   │                                     │   │
         │   │  ┌──────────┐  ┌──────────┐       │   │
         │   │  │ RESELLER │  │   ITAD   │       │   │
         │   │  │  ENGINE  │  │  ENGINE  │       │   │
         │   │  └────┬─────┘  └────┬─────┘       │   │
         │   │       │             │              │   │
         │   │  ┌────▼─────┐  ┌───▼──────┐       │   │
         │   │  │RECYCLING │  │ AUCTIONS │       │   │
         │   │  │  ENGINE  │  │  ENGINE  │       │   │
         │   │  └────┬─────┘  └────┬─────┘       │   │
         │   │       │             │              │   │
         │   │  ┌────▼─────┐  ┌───▼──────┐       │   │
         │   │  │ WEBSITE  │  │   CRM    │       │   │
         │   │  │  ENGINE  │  │  ENGINE  │       │   │
         │   │  └──────────┘  └──────────┘       │   │
         │   │                                     │   │
         │   └─────────────────────────────────────┘   │
         │                                             │
         └─────────────────┬───────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ WORKSPACES  │
                    │  (UI Layer) │
                    └─────────────┘


WORKSPACE STRUCTURE:

🏠 DASHBOARD (Universal)
   └── Metrics for active engines only

📦 OPERATIONS (reseller OR itad enabled)
   ├── Assets
   ├── Receiving
   ├── Locations
   └── Stock Movements

💰 SALES (reseller OR website enabled)
   ├── Sales Catalog
   ├── Sales Invoices
   ├── Returns & RMA
   └── Warranties

🛒 PURCHASING (reseller enabled)
   ├── Purchase Orders
   ├── Suppliers
   └── Lots & P&L

♻️ RECYCLING (recycling enabled)
   ├── Component Inventory
   ├── Component Sales
   ├── Disassembly Queue
   ├── Scrap Shipments
   └── Material Pricing

🔐 ITAD (itad enabled)
   ├── Projects
   ├── Collection Requests
   ├── Data Sanitization
   ├── Certificates
   ├── Revenue Settlements
   ├── Compliance
   └── Downstream Vendors

🔨 AUCTIONS (auction enabled)
   ├── Auction Lots
   ├── Auction Houses
   ├── Events
   └── Settlements

🌐 WEBSITE (website enabled)
   ├── Storefront Settings
   ├── Product Catalog
   ├── Online Orders
   ├── Customer Accounts
   └── Shipping Rules

👥 CRM (crm enabled)
   ├── Leads
   ├── Opportunities
   ├── Activities
   ├── Quotes
   └── Customers

📊 REPORTS (Universal)
   └── Engine-specific reports

💼 ACCOUNTING (Universal)
   └── Books for all engines

⚙️ SETTINGS (Admin)
   └── Engine toggles + config

BENEFITS:
✅ Clear workspace separation
✅ Contextual navigation
✅ Toggleable engines
✅ Scalable to new business models
✅ Shared core data
✅ No duplication
✅ Consistent UX
```

---

## DATA MODEL EVOLUTION

### CURRENT STATE (Fragmented)

```
Customers ──────┐
                │
Suppliers ──────┼──── (Separate silos)
                │
Downstream ─────┤
Vendors         │
                │
Buyer ──────────┘
Accounts


Assets ──────────┐
                 ├── (Disconnected tracking)
Components ──────┘


Purchase ────────┐
Orders           ├── (Parallel transaction systems)
                 │
Sales ───────────┤
Invoices         │
                 │
Auction ─────────┘
Settlements
```

### PROPOSED STATE (Unified)

```
                    ┌────────────┐
                    │   PARTY    │
                    │  (Unified) │
                    └──────┬─────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │Customer │       │Supplier │      │Recycler │
    │(view)   │       │(view)   │      │(view)   │
    └─────────┘       └─────────┘      └─────────┘


                    ┌────────────┐
                    │   ASSET    │
                    │   (Core)   │
                    └──────┬─────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │business │       │ownership│      │project  │
    │_source  │       │_type    │      │_id      │
    └─────────┘       └─────────┘      └─────────┘


                    ┌────────────┐
                    │   ORDER    │
                    │ (Universal)│
                    └──────┬─────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │Purchase │       │  Sales  │      │Auction  │
    │Order    │       │ Invoice │      │Settlement│
    └─────────┘       └─────────┘      └─────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                      (All share
                    accounting system)
```

---

## ENGINE INTERACTION DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                       │
└────────┬────────────────────────────────────────────────┬───────┘
         │                                                │
         │        ┌───────────────────┐                  │
         │        │ ENGINE TOGGLES    │                  │
         │        │ (Company Level)   │                  │
         │        └────────┬──────────┘                  │
         │                 │                             │
         ├─────────────────┼─────────────────────────────┤
         │                 │                             │
┌────────▼─────┐  ┌────────▼─────┐  ┌─────────▼────────┐
│   RESELLER   │  │     ITAD     │  │    RECYCLING     │
│    ENGINE    │  │    ENGINE    │  │     ENGINE       │
└────────┬─────┘  └────────┬─────┘  └─────────┬────────┘
         │                 │                   │
         │        ┌────────▼─────┐             │
         │        │   AUCTIONS   │             │
         │        │    ENGINE    │             │
         │        └────────┬─────┘             │
         │                 │                   │
         │        ┌────────▼─────┐             │
         │        │   WEBSITE    │             │
         │        │    ENGINE    │             │
         │        └────────┬─────┘             │
         │                 │                   │
         │        ┌────────▼─────┐             │
         │        │     CRM      │             │
         │        │    ENGINE    │             │
         │        └────────┬─────┘             │
         │                 │                   │
         └─────────────────┼───────────────────┘
                           │
         ┌─────────────────▼───────────────────┐
         │        CORE DATA MODEL              │
         │  (Assets, Parties, Orders, Docs)    │
         └─────────────────┬───────────────────┘
                           │
         ┌─────────────────▼───────────────────┐
         │      ACCOUNTING LAYER               │
         │   (Journal Entries for All)         │
         └─────────────────────────────────────┘

DATA FLOW EXAMPLE (Purchase → Sell → Recycle):

1. RESELLER ENGINE:
   PO → Receiving → Asset Created
   └─→ Journal Entry (Inventory Debit, AP Credit)

2. SALES ENGINE:
   Asset → Sales Invoice → Fulfillment
   └─→ Journal Entry (AR Debit, Revenue Credit)
        └─→ Journal Entry (COGS Debit, Inventory Credit)

3. RECYCLING ENGINE:
   Asset → Component Harvest → Component Sale
   └─→ Journal Entry (Component Inventory Debit, Asset Inventory Credit)
        └─→ Journal Entry (Cash Debit, Component Revenue Credit)

ALL ENGINES write to the SAME core tables and accounting system.
NO PARALLEL SYSTEMS. NO DUPLICATE DATA.
```

---

## COMPONENT ORGANIZATION

### CURRENT (Flat Structure)

```
src/components/
├── accounting/
├── assets/
├── auctions/
├── auth/
├── common/
├── companies/
├── customer-portal/
├── customers/
├── dashboard/
├── imports/
├── inventory/
├── itad/
├── layout/
├── locations/
├── movements/
├── processing/
├── product-types/
├── purchase-lots/
├── purchases/
├── receiving/
├── repairs/
├── reports/
├── returns/
├── sales/
├── settings/
├── suppliers/
└── users/

PROBLEMS:
❌ No grouping by workspace
❌ Hard to find related features
❌ No engine boundaries
```

### PROPOSED (Workspace-Organized)

```
src/components/
├── workspaces/
│   ├── operations/
│   │   ├── Assets.tsx (moved from processing/Processing.tsx)
│   │   ├── Receiving.tsx (moved from receiving/)
│   │   ├── Locations.tsx (moved from locations/)
│   │   └── StockMovements.tsx (moved from movements/)
│   │
│   ├── sales/
│   │   ├── SalesCatalog.tsx (moved from inventory/SaleableInventory.tsx)
│   │   ├── SalesInvoices.tsx (moved from sales/)
│   │   ├── Returns.tsx (moved from returns/)
│   │   └── Warranties.tsx (NEW)
│   │
│   ├── purchasing/
│   │   ├── PurchaseOrders.tsx (moved from purchases/)
│   │   ├── Suppliers.tsx (moved from suppliers/)
│   │   └── PurchaseLots.tsx (moved from purchase-lots/)
│   │
│   ├── recycling/
│   │   ├── ComponentInventory.tsx (moved from inventory/HarvestedComponents)
│   │   ├── ComponentSales.tsx (moved from inventory/ComponentSales)
│   │   ├── DisassemblyQueue.tsx (NEW)
│   │   ├── ScrapShipments.tsx (NEW)
│   │   └── MaterialPricing.tsx (moved from settings/ComponentMarketPrices)
│   │
│   ├── itad/
│   │   ├── Projects.tsx (moved from itad/ITADProjects)
│   │   ├── ProjectWizard.tsx (NEW)
│   │   ├── CollectionRequests.tsx (NEW)
│   │   ├── DataSanitization.tsx (moved from itad/)
│   │   ├── Certificates.tsx (moved from itad/)
│   │   ├── RevenueSettlements.tsx (moved from itad/)
│   │   ├── Compliance.tsx (moved from itad/)
│   │   └── DownstreamVendors.tsx (moved from itad/)
│   │
│   ├── auctions/
│   │   ├── AuctionLots.tsx (moved from auctions/AuctionManagement)
│   │   ├── LotWizard.tsx (NEW)
│   │   ├── AuctionHouses.tsx (NEW)
│   │   ├── Events.tsx (NEW)
│   │   └── Settlements.tsx (NEW)
│   │
│   ├── website/
│   │   ├── StorefrontSettings.tsx (NEW)
│   │   ├── ProductCatalog.tsx (NEW)
│   │   ├── OnlineOrders.tsx (NEW)
│   │   ├── CustomerAccounts.tsx (NEW)
│   │   └── ShippingRules.tsx (NEW)
│   │
│   ├── crm/
│   │   ├── LeadManagement.tsx (NEW)
│   │   ├── OpportunityPipeline.tsx (NEW)
│   │   ├── ActivityLog.tsx (NEW)
│   │   ├── Quotes.tsx (NEW)
│   │   └── Customers.tsx (moved from customers/)
│   │
│   ├── accounting/
│   │   ├── ChartOfAccounts.tsx (existing)
│   │   ├── JournalEntries.tsx (existing)
│   │   └── Reconciliation.tsx (NEW)
│   │
│   ├── reports/
│   │   └── Reports.tsx (existing)
│   │
│   └── settings/
│       ├── EngineToggles.tsx (NEW)
│       ├── ProductSetup.tsx (existing)
│       ├── BusinessRules.tsx (existing)
│       └── SystemConfig.tsx (existing)
│
├── common/ (shared UI components)
├── layout/ (navigation, headers)
└── auth/ (login, register)

BENEFITS:
✅ Clear workspace boundaries
✅ Easy to find related features
✅ Engine-aligned structure
✅ Scalable organization
```

---

## MIGRATION PATH (Zero Downtime)

```
PHASE 1: Foundation (Week 1)
┌─────────────────────────────────────┐
│ Add engine flags to companies table │
│ Create EngineToggles component      │
│ Add engineService                   │
│ ✅ Everything still works            │
└─────────────────────────────────────┘

PHASE 2: Navigation (Week 2)
┌─────────────────────────────────────┐
│ Add workspace structure to AppBar   │
│ Keep old navigation working         │
│ Add breadcrumb context              │
│ ✅ Both navigations work             │
└─────────────────────────────────────┘

PHASE 3: Component Moves (Week 3)
┌─────────────────────────────────────┐
│ Move components to workspace folders│
│ Update imports                      │
│ Keep old routes as aliases          │
│ ✅ Both paths work                   │
└─────────────────────────────────────┘

PHASE 4+: Add Engines (Weeks 4-10)
┌─────────────────────────────────────┐
│ Add new tables for missing engines  │
│ Build new components                │
│ Add new services                    │
│ ✅ Opt-in via toggles                │
└─────────────────────────────────────┘

At any point: Can roll back with ZERO data loss
```

---

## SUCCESS METRICS

### Before Refactoring
- ❌ 1 business model supported (reseller)
- ❌ Hard-coded feature set
- ❌ Flat navigation (25+ top-level items)
- ❌ Duplicate inventory screens
- ❌ Siloed ITAD features
- ❌ No CRM capability
- ❌ No website capability

### After Refactoring
- ✅ 6+ business models supported
- ✅ Toggleable engines per company
- ✅ Organized workspaces (8 top-level)
- ✅ Single source of truth for inventory
- ✅ Integrated ITAD workflows
- ✅ Full CRM capability
- ✅ eCommerce storefront

### Technical Quality
- ✅ Zero breaking changes
- ✅ 100% backward compatible
- ✅ No duplicate code
- ✅ Clear separation of concerns
- ✅ Maintainable architecture
- ✅ Scalable to new engines

---

**Document Version:** 1.0
**Created:** February 1, 2026
