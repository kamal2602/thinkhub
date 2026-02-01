# ENGINES

**Status:** Feature Registry & Ownership Map
**Version:** 1.0
**Last Updated:** February 1, 2026

---

## Purpose

This document defines the **complete registry** of business engines and maps every feature in the application to exactly ONE engine. This prevents feature sprawl, overlapping functionality, and architectural ambiguity.

**RULE:** Every feature belongs to exactly one engine. Every engine has clear boundaries and dependencies.

---

## Engine System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CORE SYSTEM                          │
│  (Company, Party, Asset, Transaction, Accounting, State)    │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ (uses)
      ┌────────────────────┼────────────────────┐
      │                    │                    │
┌─────▼─────┐   ┌─────────▼──────┐   ┌────────▼────────┐
│ Reseller  │   │      ITAD      │   │   Recycling     │
│  Engine   │   │     Engine     │   │     Engine      │
└───────────┘   └────────────────┘   └─────────────────┘
      │                    │                    │
      └────────────────────┼────────────────────┘
                            │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
┌─────▼─────┐   ┌─────────▼──────┐   ┌────────▼────────┐
│    CRM    │   │    Website     │   │    Auction      │
│  Engine   │   │    Engine      │   │    Engine       │
└───────────┘   └────────────────┘   └─────────────────┘
                            │
                     ┌──────▼──────┐
                     │ Accounting  │
                     │   Engine    │
                     └─────────────┘
```

---

## 1. RESELLER ENGINE (Base Engine)

**Purpose:** IT hardware trading business (buy, refurbish, sell)

**Toggle:** `companies.reseller_enabled` (default: true)

**Enabled By Default:** YES (all companies have this)

### Core Entities Used (Read + Write):
- Assets (creates, updates, tracks lifecycle)
- Purchase Orders (creates purchases)
- Sales Invoices (creates direct sales)
- Customers (direct buyers)
- Suppliers (purchase vendors)
- Inventory (stock levels)

### Core Entities Used (Read Only):
- Accounting (queries revenue/cost/profit)
- Processing Stages (workflow states)
- Product Types (device categories)

### Database Tables Owned:
- `purchase_lots` - Batch tracking for bulk purchases
- `expected_receiving_items` - Pre-receiving planning
- `receiving_logs`, `receiving_line_items` - Purchase receiving workflow
- `receiving_discrepancies` - Variance tracking
- `supplier_column_mappings` - Import intelligence
- `test_result_options` - Testing checklist options
- `testing_checklist_templates` - Device testing templates
- `rma_requests` - Return merchandise authorization

### Features Owned:
1. **Purchase Order Management**
   - Create/edit/submit purchase orders
   - Smart PO import from Excel
   - Receive inventory against POs
   - Track receiving discrepancies
   - Cost allocation

2. **Purchase Lot Tracking**
   - Batch purchase management
   - Lot profitability analysis
   - Lot closure (prevent further allocation)

3. **Asset Processing Workflow**
   - Receiving → Testing → Refurbishment → Ready for Sale
   - Barcode/serial scanning
   - Asset details editing
   - Testing checklist per device type
   - Refurbishment cost tracking
   - Bulk updates
   - Asset grid/kanban/list views

4. **Direct Sales**
   - Sales invoice creation
   - Customer assignment
   - Margin calculation
   - Serial number tracking in sales

5. **Saleable Inventory Catalog**
   - Ready-for-sale asset listing
   - Inventory search/filtering
   - Quick sale creation

6. **Supplier Management**
   - Supplier CRUD
   - Supplier statistics
   - Import intelligence (column mapping learning)

7. **Master Data Configuration**
   - Product types (Laptop, Desktop, Phone, etc.)
   - Testing checklists per product type
   - Processing stages (workflow states)
   - Cosmetic grades
   - Functional statuses
   - Warranty types
   - Return reasons
   - Payment terms

### UI Surfaces:
- Dashboard (Reseller metrics: inventory value, aging, margin)
- Purchases → Purchase Orders
- Purchases → Receiving
- Purchases → Purchase Lots
- Processing → Asset Workflow
- Inventory → Saleable Inventory
- Sales → Sales Invoices
- Settings → Product Setup
- Settings → Processing Stages
- Settings → Grades & Conditions

### Dependencies:
- **Core:** Company, Party, Asset, Transaction, Accounting (foundational)
- **None:** Reseller is the base engine

### Background Jobs:
- Aging inventory calculations
- Low stock alerts
- Purchase lot profitability updates

---

## 2. ITAD ENGINE (Service Provider)

**Purpose:** IT Asset Disposition service business (intake, sanitize, certify, settle)

**Toggle:** `companies.itad_enabled` (default: false)

**Depends On:** Reseller (uses asset processing infrastructure)

### Core Entities Used (Read + Write):
- Assets (links via `business_source = 'itad_intake'`, `project_id`)
- Customers (ITAD clients, `entity_type = 'itad_client'`)
- Sales Invoices (creates revenue settlements)

### Core Entities Used (Read Only):
- Processing Stages (uses for ITAD-specific workflows)
- Accounting (revenue tracking)

### Database Tables Owned:
- `itad_projects` - Service engagement tracking
- `collection_requests` - Customer pickup requests
- `itad_intakes` - Receiving workflow for customer equipment
- `itad_revenue_settlements` - Financial settlement records
- `asset_data_sanitization` - Data destruction tracking
- `data_destruction_certificates` - Compliance certificates
- `recycling_certificates` - Environmental certificates
- `environmental_reports` - Impact reporting
- `downstream_vendors` - Recycler/reseller partnerships
- `downstream_shipments` - Asset disposition shipments
- `company_certifications` - ITAD compliance certs (R2, e-Stewards)
- `project_environmental_impact` - Sustainability metrics
- `revenue_share_transactions` - Customer payout tracking
- `customer_portal_users` - Customer portal authentication

### Features Owned:
1. **ITAD Project Management**
   - Create/manage service engagements
   - Link customer to project
   - Track project status
   - Revenue share configuration (% to customer)

2. **Collection Request Management**
   - Customer requests equipment pickup
   - Schedule collections
   - Link to projects
   - Track fulfillment

3. **ITAD Intake Workflow**
   - Receive customer equipment (separate from purchase receiving)
   - Asset registration (becomes `business_source = 'itad_intake'`)
   - Link to project and customer

4. **Data Sanitization & Compliance**
   - Track sanitization method per asset
   - Generate data destruction certificates
   - Generate recycling certificates
   - Environmental impact reporting
   - Compliance documentation

5. **Revenue Settlement**
   - Calculate customer share based on project %
   - Create settlement invoices
   - Track payout history
   - Settlement reporting

6. **Customer Portal**
   - Separate authentication for ITAD clients
   - View project status
   - Download certificates
   - Request collections
   - View revenue reports

7. **Downstream Vendor Management**
   - Manage recycler/reseller partnerships
   - Track shipments to downstream
   - Vendor compliance tracking

8. **Compliance Tracking**
   - Company certifications (R2, e-Stewards, ISO)
   - Certification expiry alerts
   - Audit trail maintenance

### UI Surfaces:
- Dashboard (ITAD metrics: projects, revenue, compliance)
- ITAD → Projects
- ITAD → Collection Requests
- ITAD → Data Sanitization
- ITAD → Certificates
- ITAD → Revenue Settlements
- ITAD → Downstream Vendors
- ITAD → Environmental Compliance
- Customer Portal (separate app)
- Settings → Company Certifications

### Dependencies:
- **Core:** Company, Party, Asset, Transaction, Accounting
- **Reseller:** Asset processing infrastructure, sales invoicing

### Background Jobs:
- Certificate expiry alerts
- Project status updates
- Revenue settlement calculations
- Environmental impact aggregation

---

## 3. RECYCLING ENGINE (Material Recovery)

**Purpose:** Component harvesting and material recovery business

**Toggle:** `companies.recycling_enabled` (default: false)

**Depends On:** Reseller (uses asset infrastructure)

### Core Entities Used (Read + Write):
- Assets (harvests components from)
- Harvested Components Inventory (creates/manages)
- Component Sales (creates sales transactions)
- Suppliers (downstream recyclers, `entity_type = 'downstream_recycler'`)
- Sales Invoices (component sales revenue)

### Core Entities Used (Read Only):
- Accounting (material revenue tracking)

### Database Tables Owned:
- `component_harvesting` - Harvesting job records
- `component_harvesting_items` - Components harvested (with cost allocation)
- `component_market_prices` - Market rates for components (CPU, RAM, SSD, etc.)
- `recycling_shipments` - Batch shipments to recyclers
- `commodity_prices` - Scrap material pricing (per kg)

### Features Owned:
1. **Component Harvesting**
   - Mark asset for disassembly
   - Extract components (CPU, RAM, SSD, HDD, battery, screen, etc.)
   - Allocate asset cost to components
   - Track component serial numbers
   - Store component specs

2. **Harvested Component Inventory**
   - Track component stock levels
   - Component condition tracking
   - Location management
   - Component search/filtering

3. **Component Sales**
   - Sell individual components
   - Bulk component sales
   - Calculate component margins
   - Link to sales invoices

4. **Component Market Pricing**
   - Maintain market rates for components
   - Price per condition grade
   - Update pricing periodically
   - Used for valuation and margins

5. **Material Recovery**
   - Track material weight (plastic, metal, glass, PCB, battery)
   - Calculate scrap value
   - Commodity pricing updates

6. **Recycler Shipments**
   - Batch shipments to downstream recyclers
   - Weight tracking
   - Estimated vs actual settlement
   - Material categorization

### UI Surfaces:
- Dashboard (Recycling metrics: component inventory, harvest value)
- Inventory → Harvested Components
- Inventory → Component Sales
- Recycling → Component Harvesting (workflow)
- Recycling → Recycler Shipments
- Settings → Component Market Prices
- Settings → Commodity Prices

### Dependencies:
- **Core:** Company, Asset, Transaction, Accounting
- **Reseller:** Asset infrastructure

### Background Jobs:
- Component market price updates
- Component inventory valuation
- Commodity price updates

---

## 4. CRM ENGINE (Sales Pipeline)

**Purpose:** Lead management and sales pipeline tracking

**Toggle:** `companies.crm_enabled` (default: false)

**Depends On:** Core Party system (VIOLATES - currently duplicates identity)

### Core Entities Used (Read + Write):
- Customers (should use for all identities, currently bypassed by leads table)

### Core Entities Used (Read Only):
- Sales Invoices (view sales history)

### Database Tables Owned:
- `leads` - **VIOLATION:** Duplicates Party identity (should be removed)
- `opportunities` - Sales pipeline tracking
- `activities` - CRM interactions (calls, emails, meetings)
- `quotes` - Pre-sales quote documents

### Features Owned:
1. **Lead Management** (NEEDS REFACTORING)
   - Capture prospects
   - Lead qualification
   - Lead source tracking
   - Lead assignment
   - **PROBLEM:** Currently stores contact info in leads table (should use customers)

2. **Opportunity Management**
   - Sales pipeline tracking
   - Stage management (prospecting → negotiation → closing)
   - Value estimation
   - Win probability
   - Expected close date
   - **PROBLEM:** Links to both lead_id and customer_id (should only use customer_id)

3. **Activity Tracking**
   - Log calls, emails, meetings
   - Link to any entity (customer, opportunity, asset, etc.)
   - Task management
   - Follow-up reminders

4. **Quote Management**
   - Pre-sales quotes
   - Link to opportunity or customer
   - Quote versioning
   - Quote-to-order conversion

### UI Surfaces (Not Yet Implemented):
- Dashboard (CRM metrics: pipeline value, conversion rates)
- CRM → Leads
- CRM → Opportunities
- CRM → Activities
- CRM → Quotes

### Dependencies:
- **Core:** Company, Party (customers)
- **Reseller:** Sales invoices

### Current Violations:
1. `leads` table stores identity data (name, email, phone) - should use `customers` with `entity_type = 'prospect'`
2. `opportunities.lead_id` should be removed, only use `customer_id`

### Correct Architecture (To Be Implemented):
```sql
-- Remove leads table
-- Use customers for all identities
INSERT INTO customers (name, email, phone, entity_type)
VALUES ('John Doe', 'john@example.com', '555-1234', 'prospect');

-- Store CRM metadata
CREATE TABLE crm_prospect_metadata (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),  -- Links to Core Party
  lead_source text,
  qualification_score int,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz
);

-- Opportunities only reference customer_id
ALTER TABLE opportunities DROP COLUMN lead_id;
```

### Background Jobs:
- Activity reminders
- Opportunity aging alerts
- Lead scoring updates

---

## 5. WEBSITE ENGINE (eCommerce)

**Purpose:** Public storefront and online sales

**Toggle:** `companies.website_enabled` (default: false)

**Depends On:** Reseller (product catalog), CRM (customer engagement)

### Core Entities Used (Read + Write):
- Customers (creates web customers, `entity_type = 'website_customer'`)
- Sales Invoices (creates web orders)
- Assets (reads catalog for product listings)

### Core Entities Used (Read Only):
- Inventory (product availability)

### Database Tables Owned:
- `website_settings` - Storefront configuration (branding, theme, policies)
- `shopping_carts` - Customer shopping sessions
- `documents` - General document attachments (partially shared with Core)

### Features Owned:
1. **Storefront Configuration**
   - Site name, logo, theme colors
   - Shipping zones and rates
   - Payment method configuration
   - Return policies, terms of service

2. **Product Catalog (Public)**
   - Display saleable inventory
   - Product search/filtering
   - Product details
   - Real-time availability

3. **Shopping Cart**
   - Anonymous cart management
   - Session-based storage
   - Cart expiry (7 days)
   - **PROBLEM:** Uses email, should link to customer_id

4. **Checkout**
   - Customer account creation
   - Payment processing
   - Order creation (→ sales_invoice)
   - Order confirmation

5. **Customer Account Portal**
   - Order history
   - Track shipments
   - Manage account info
   - Re-order functionality

### UI Surfaces (Not Yet Implemented):
- Public Storefront (separate frontend)
- Admin → Website Settings
- Admin → Product Publishing
- Customer Account Portal

### Current Violations:
1. `shopping_carts.customer_email` - should use `customer_id` instead

### Correct Architecture (To Be Implemented):
```sql
-- Link shopping carts to customers
ALTER TABLE shopping_carts
  ADD COLUMN customer_id uuid REFERENCES customers(id),
  DROP COLUMN customer_email;

-- For anonymous carts, create temp customer record
-- Or maintain session-based carts until checkout
```

### Dependencies:
- **Core:** Company, Party, Asset, Transaction
- **Reseller:** Product catalog, sales processing
- **CRM:** Customer engagement (optional)

### Background Jobs:
- Cart expiry cleanup
- Inventory sync
- Order notification emails

---

## 6. AUCTION ENGINE (Online Auctions)

**Purpose:** Auction platform integration (eBay, TeraPeak, etc.)

**Toggle:** `companies.auction_enabled` (default: false)

**Depends On:** Reseller (uses inventory)

### Core Entities Used (Read + Write):
- Assets (links auction lots)
- Harvested Components (can auction components)
- Sales Invoices (creates auction settlements)
- Customers (auction buyers, `entity_type = 'auction_buyer'`)

### Core Entities Used (Read Only):
- Inventory (selects items for auction)

### Database Tables Owned:
- `auction_houses` - Auction platforms (eBay, TeraPeak, Bring A Trailer, etc.)
- `auction_events` - Scheduled auction dates/batches
- `auction_lots` - Batches of items for sale
- `auction_lot_items` - Individual assets/components in lots
- `buyer_accounts` - Auction bidder profiles (links to customers)
- `bids` - Bid history tracking
- `auction_settlements` - Final sale records with commission

### Features Owned:
1. **Auction House Management**
   - Configure platforms (eBay, TeraPeak, etc.)
   - Commission rates
   - API integration settings

2. **Auction Event Scheduling**
   - Create auction dates
   - Batch preparation
   - Event status tracking

3. **Lot Creation**
   - Select assets/components for auction
   - Set reserve prices
   - Lot descriptions
   - Photo uploads
   - Publish to auction house

4. **Bid Tracking**
   - Record bids
   - Proxy bidding
   - Winning bid determination
   - Buyer notifications

5. **Auction Settlements**
   - Final sale price recording
   - Commission calculation
   - Create sales invoice (order_type = 'auction_settlement')
   - Buyer invoicing
   - Payout processing

6. **Buyer Account Management**
   - Bidder profiles
   - Link to customers (for known buyers)
   - Bidding history
   - Payment tracking

### UI Surfaces:
- Dashboard (Auction metrics: lots, bids, settlement value)
- Auctions → Auction Houses
- Auctions → Events
- Auctions → Lots
- Auctions → Bids
- Auctions → Settlements

### Dependencies:
- **Core:** Company, Party, Asset, Transaction, Accounting
- **Reseller:** Inventory catalog

### Background Jobs:
- Auction event reminders
- Bid notifications
- Settlement processing
- Auction house API sync

---

## 7. ACCOUNTING ENGINE (Financial Management)

**Purpose:** Financial reporting, accounts payable/receivable, general ledger

**Toggle:** Always enabled (part of Core financial system)

**Depends On:** All engines (consumes transactions from all)

### Core Entities Used (Read + Write):
- Chart of Accounts (manages GL structure)
- Journal Entries (records all financial events)
- Purchase Orders (payment tracking)
- Sales Invoices (payment tracking)

### Core Entities Used (Read Only):
- All transactions from all engines

### Database Tables Owned:
- `chart_of_accounts` - General ledger structure (Core table)
- `journal_entries` - Double-entry bookkeeping (Core table)
- `journal_entry_lines` - Journal entry details (Core table)

### Features Owned:
1. **Chart of Accounts**
   - Account hierarchy (Assets, Liabilities, Equity, Revenue, Expenses)
   - Account creation/editing
   - Account types and categories
   - Multi-currency support

2. **Journal Entry Management**
   - Manual journal entries
   - Auto-generated entries from transactions
   - Entry approval workflow
   - Entry reversal

3. **Accounts Payable**
   - Supplier invoice tracking
   - Payment due dates
   - Payment processing
   - Aging reports

4. **Accounts Receivable**
   - Customer invoice tracking
   - Payment collection
   - Aging reports
   - Credit management

5. **Financial Reporting**
   - Balance Sheet
   - Income Statement (P&L)
   - Cash Flow Statement
   - General Ledger reports
   - Trial Balance
   - Custom reports

6. **Financial Close**
   - Period close process
   - Year-end close
   - Reconciliation

### UI Surfaces:
- Dashboard (Accounting metrics: cash, A/R, A/P, profit)
- Accounting → Chart of Accounts
- Accounting → Journal Entries
- Accounting → Accounts Payable
- Accounting → Accounts Receivable
- Reports → Financial Reports

### Dependencies:
- **Core:** Company, Transaction primitives
- **All Engines:** Consumes transactions from all

### Background Jobs:
- Automatic journal entry generation
- Payment due reminders
- Aging calculations
- Period-end processes

---

## Engine Dependency Graph

```
Core (Foundation)
  │
  ├─ Reseller (Base)
  │    │
  │    ├─ ITAD (extends Reseller)
  │    │
  │    ├─ Recycling (extends Reseller)
  │    │
  │    ├─ Auction (uses Reseller inventory)
  │    │
  │    └─ Website (uses Reseller catalog)
  │
  ├─ CRM (uses Core Party)
  │
  └─ Accounting (consumes from all)
```

---

## Feature Ownership Summary

### Currently Implemented Features:

| Feature | Engine | Status |
|---------|--------|--------|
| Purchase Orders | Reseller | ✅ Complete |
| Asset Processing | Reseller | ✅ Complete |
| Sales Invoices | Reseller | ✅ Complete |
| Purchase Lots | Reseller | ✅ Complete |
| Component Harvesting | Recycling | ✅ Complete |
| Component Sales | Recycling | ✅ Complete |
| ITAD Projects | ITAD | ✅ Complete |
| Data Sanitization | ITAD | ✅ Complete |
| Certificates | ITAD | ✅ Complete |
| Revenue Settlements | ITAD | ✅ Complete |
| Customer Portal | ITAD | ✅ Complete |
| Auction Management | Auction | ✅ Complete |
| Accounting/GL | Accounting | ✅ Complete |
| Engine Toggles | Core | ✅ Complete |

### Not Yet Implemented (Tables Exist):

| Feature | Engine | Status |
|---------|--------|--------|
| CRM Leads | CRM | 🚧 Schema exists, UI pending |
| CRM Opportunities | CRM | 🚧 Schema exists, UI pending |
| CRM Activities | CRM | 🚧 Schema exists, UI pending |
| CRM Quotes | CRM | 🚧 Schema exists, UI pending |
| Website Storefront | Website | 🚧 Schema exists, UI pending |
| Shopping Cart | Website | 🚧 Schema exists, UI pending |
| Recycler Shipments | Recycling | 🚧 Schema exists, UI pending |

---

## Engine Toggle Behavior

### How Toggles Work:

1. **Engine Disabled:**
   - UI surfaces hidden
   - Navigation items removed
   - Database tables remain (data preserved)
   - RLS still enforced (data protected)
   - APIs return 403 if toggle is off

2. **Engine Enabled:**
   - UI surfaces appear
   - Navigation items visible
   - Full functionality available

3. **Toggle Changes:**
   - No data migration required
   - Instant enable/disable
   - No breaking changes to Core

### Toggle Checking (Service Layer):
```typescript
// Check if engine is enabled before operations
async function checkEngineEnabled(companyId: string, engine: string) {
  const { data: company } = await supabase
    .from('companies')
    .select(`${engine}_enabled`)
    .eq('id', companyId)
    .single();

  if (!company[`${engine}_enabled`]) {
    throw new Error(`${engine} engine is not enabled for this company`);
  }
}
```

---

## Engine Extension Guidelines

### Adding a New Engine:

1. **Add toggle column to companies:**
   ```sql
   ALTER TABLE companies ADD COLUMN {engine}_enabled boolean DEFAULT false;
   ```

2. **Create engine-specific tables** (follow naming: `{engine}_{noun}`)

3. **Link to Core entities** (customer_id, asset_id, NOT duplicates)

4. **Implement service layer** with toggle checks

5. **Add UI surfaces** that respect toggle

6. **Document in this file** (purpose, dependencies, features)

7. **Update CORE_CONTRACT.md** if Core changes needed

### Anti-Patterns to Avoid:

- Creating duplicate identity tables
- Bypassing Core for financial records
- Storing asset data outside Core
- Hardcoding business logic (use configuration)
- Cross-engine dependencies (engines should be independent)

---

**End of Engine Registry**
