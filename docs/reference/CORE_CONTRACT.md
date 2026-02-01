# CORE CONTRACT

**Status:** Architecture Constitution
**Version:** 1.0
**Last Updated:** February 1, 2026
**Authority:** NON-NEGOTIABLE

---

## Purpose

This document defines the **inviolable boundaries** of the Core system. The Core owns fundamental business entities and guarantees their integrity. Engines MUST respect these boundaries or risk data corruption, identity fragmentation, and architectural collapse.

**RULE:** If it's in Core, engines cannot redefine it. If engines need it, Core must provide it.

---

## 1. Core-Owned Entities (EXCLUSIVE OWNERSHIP)

### 1.1 Company (Multi-Tenancy Primitive)

**Table:** `companies`

**Core Owns:**
- Company identity (id, name, code)
- Multi-tenancy isolation
- Engine toggles (reseller_enabled, itad_enabled, etc.)

**Core Guarantees:**
- Every record in the system belongs to exactly one company
- Company deletion cascades safely
- RLS policies enforce company_id isolation
- Engine toggles control feature visibility

**Engines MUST NOT:**
- Create company-like entities
- Bypass company_id in any table
- Store company-level configuration outside `companies` table or JSONB metadata fields

**Engines MAY:**
- Read `companies.{engine}_enabled` flags
- Add JSONB metadata fields for engine-specific config (e.g., `crm_settings jsonb`)

---

### 1.2 Party (Identity Abstraction)

**Tables:** `customers`, `suppliers` (with `entity_type` classification)

**Core Owns:**
- **THE SINGLE SOURCE OF TRUTH FOR ALL BUSINESS IDENTITIES**
- Contact information (name, email, phone, address)
- Party classification via `entity_type` field
- Party lifecycle (active/inactive status)

**Core Guarantees:**
- No duplicate identities (same email/company cannot exist twice)
- Every business relationship maps to a Party
- Party data is normalized and deduplicated
- Changes to contact info propagate everywhere

**Entity Type Classification:**
```
customers.entity_type:
  - 'sales_customer'    (Core: direct buyer)
  - 'itad_client'       (ITAD: service customer)
  - 'prospect'          (CRM: not yet customer)
  - 'reseller'          (Reseller: wholesale buyer)
  - 'website_customer'  (Website: eCommerce buyer)
  - 'consignment_client' (Consignment: inventory owner)

suppliers.entity_type:
  - 'purchase_vendor'    (Core: direct supplier)
  - 'consignment_vendor' (Reseller: consignment supplier)
  - 'downstream_recycler' (Recycling: material buyer)
```

**Engines MUST NOT:**
- Create separate identity tables (NO `leads`, `bidders`, `website_users`, `contacts` tables)
- Store contact information (email, phone, address) outside Party tables
- Create duplicate person/organization records
- Bypass Party for any business relationship

**Engines MAY:**
- Add JSONB metadata to Party for engine-specific attributes
- Link engine records to `customer_id` or `supplier_id`
- Create junction tables (e.g., `buyer_accounts` links to `customer_id`)
- Use `entity_type` to classify Party for their domain

**CRITICAL RULE:**
> **If it has a name, email, or phone number, it MUST be a Party (customer or supplier), not a separate table.**

---

### 1.3 Asset / Item (Physical Entity Tracking)

**Table:** `assets` (individual serialized items), `inventory_items` (bulk stock)

**Core Owns:**
- Asset identity (serial number, internal IDs)
- Asset lifecycle (status, processing stage, location)
- Asset specifications (model, brand, specs)
- Asset financial tracking (cost, value, margins)
- Asset history (complete audit trail)
- Component tracking (harvested parts)

**Core Guarantees:**
- Every physical item has ONE canonical record in `assets`
- Serial numbers are unique per company
- Asset status transitions are tracked
- Asset cannot be in two places at once
- Asset cannot belong to two owners simultaneously
- Financial truth (cost, value) is immutable history

**Engines MUST NOT:**
- Create parallel asset tables
- Store asset specifications outside Core
- Modify asset.cost_amount (financial history is immutable)
- Change asset.serial_number (identity is immutable)
- Delete assets (mark inactive instead)

**Engines MAY:**
- Add workflow-specific fields (e.g., `business_source`, `ownership_type`, `project_id`)
- Store engine-specific metadata in JSONB fields
- Create related records (e.g., `asset_data_sanitization`, `auction_lot_items`)
- Read asset data for business logic

**Extension Pattern (Correct):**
```sql
-- Core table
assets (
  id, serial_number, cost_amount, status, location_id, ...
  business_source,    -- 'purchase', 'itad_intake', 'consignment'
  ownership_type,     -- 'owned', 'customer_owned', 'consignment'
  project_id,         -- Generic FK to itad_projects, etc.
  itad_metadata jsonb -- Engine-specific data
)

-- Engine extension (Correct)
asset_data_sanitization (
  id,
  asset_id REFERENCES assets(id),  -- Links to Core
  sanitization_method,
  certificate_id
)
```

**Anti-Pattern (WRONG):**
```sql
-- NEVER DO THIS
itad_assets (
  id,
  serial_number,  -- Duplicates assets.serial_number
  model,          -- Duplicates assets.model
  cost            -- Duplicates assets.cost_amount
)
```

---

### 1.4 Component (Sub-Asset Entity)

**Tables:** `asset_components`, `harvested_components_inventory`, `component_sales`

**Core Owns:**
- Component identity (type, specs, serial if applicable)
- Component relationships (which asset it came from)
- Component inventory (quantity, location)
- Component financial tracking (allocated cost, market value, sale price)
- Component transactions (harvest, sale, scrap)

**Core Guarantees:**
- Components maintain parent asset relationship
- Component cost allocation is traceable
- Component inventory is accurate
- Component sales integrate with accounting

**Engines MUST NOT:**
- Create separate component tracking systems
- Store component inventory outside Core tables
- Bypass component cost allocation

**Engines MAY:**
- Add market pricing data (`component_market_prices`)
- Create component-specific workflows
- Link components to engine records (e.g., auction lots)

---

### 1.5 Transaction (Abstract Financial Event)

**Tables:** `purchase_orders`, `sales_invoices`, `journal_entries`

**Core Owns:**
- **THE SINGLE SOURCE OF FINANCIAL TRUTH**
- Purchase transactions (buying inventory)
- Sales transactions (selling inventory)
- Financial accounting (general ledger)
- Payment tracking
- Transaction integrity

**Core Guarantees:**
- Every financial event is recorded
- Debits = Credits (accounting equation preserved)
- Transactions are immutable once posted
- Revenue/cost/profit calculations are consistent
- Audit trail is complete

**Engines MUST NOT:**
- Create parallel financial records
- Store amounts outside Core transaction tables
- Bypass accounting integration
- Modify posted transactions
- Create invoices/orders without Core tables

**Engines MAY:**
- Extend transactions with metadata (e.g., `order_type`, `sales_channel`)
- Create settlement records that reference Core transactions
- Trigger transactions from engine workflows
- Add transaction sources (e.g., 'auction', 'website', 'consignment')

**Transaction Type Classification:**
```
purchase_orders.order_type:
  - 'purchase'      (Core: buying inventory)
  - 'consignment'   (Reseller: consignment agreement)
  - 'transfer_in'   (Core: inter-location)

sales_invoices.order_type:
  - 'direct_sale'   (Core: direct B2B sale)
  - 'auction_settlement' (Auction: final sale record)
  - 'component_sale' (Recycling: parts sale)
  - 'wholesale'     (Reseller: bulk sale)
  - 'website_order' (Website: eCommerce order)

sales_invoices.sales_channel:
  - 'direct'        (Core: direct sales)
  - 'auction'       (Auction: eBay, etc.)
  - 'website'       (Website: storefront)
  - 'marketplace'   (Website: Amazon, etc.)
```

---

### 1.6 Document (Abstract Artifact)

**Table:** `documents` (universal document registry)

**Core Owns:**
- Document metadata (type, number, entity reference)
- Document storage (file URL)
- Document lifecycle (status, generation)
- Document association (which entity it belongs to)

**Core Guarantees:**
- Every document is cataloged
- Documents link to their business entity
- Document numbers are unique per company
- Document history is preserved

**Engines MUST NOT:**
- Store documents outside Core system (unless domain-specific like certificates)
- Create parallel document registries

**Engines MAY:**
- Create specialized document tables for domain artifacts (e.g., `data_destruction_certificates`)
- Reference documents table for general attachments
- Generate documents programmatically

**Design Decision:**
- **Generic documents** (quotes, packing slips, attachments) → `documents` table
- **Domain-specific certificates** (ITAD compliance, data destruction) → Specialized tables with full schema

---

### 1.7 Money / Accounting Primitives

**Tables:** `chart_of_accounts`, `journal_entries`, `journal_entry_lines`

**Core Owns:**
- **THE ABSOLUTE FINANCIAL TRUTH**
- Chart of accounts (GL structure)
- Double-entry bookkeeping
- Financial reporting
- Currency and multi-currency support
- Payment terms

**Core Guarantees:**
- All financial activity flows through accounting
- Accounting equation always balanced: Assets = Liabilities + Equity
- Transactions are immutable once posted
- Financial reports are accurate
- Audit trail is complete

**Engines MUST NOT:**
- Store financial amounts outside Core accounting or transaction tables
- Create parallel revenue/cost tracking
- Bypass journal entry creation
- Modify posted entries
- Implement custom accounting logic

**Engines MAY:**
- Trigger journal entries from business events
- Add transaction metadata
- Create account categories for engine purposes
- Query accounting for reporting

---

### 1.8 State Machine Primitives

**Tables:** `processing_stages`, `asset_statuses`, `functional_statuses`, `cosmetic_grades`

**Core Owns:**
- Workflow state definitions (stages, statuses)
- State transition rules
- State metadata (colors, descriptions)
- State lifecycle

**Core Guarantees:**
- States are company-specific configuration
- State transitions are tracked in asset_history
- States are extensible per company

**Engines MUST NOT:**
- Hardcode state values in application logic
- Create parallel state systems
- Bypass state configuration

**Engines MAY:**
- Add engine-specific states via configuration
- Use states to drive workflow logic
- Create state-driven views

---

## 2. Core Responsibilities

Core must provide these services to Engines:

### 2.1 Identity Resolution
- Deduplicate parties by email/company
- Merge duplicate records
- Provide party search/lookup

### 2.2 Financial Integration
- Accept transaction requests from engines
- Generate journal entries
- Provide financial queries (revenue, cost, profit)

### 2.3 Asset Lifecycle
- Track asset location, status, ownership
- Maintain asset history
- Provide asset search/filtering

### 2.4 Multi-Tenancy
- Enforce company isolation
- Provide company context
- Control engine toggles

---

## 3. Explicit Prohibitions

### Engines CANNOT:

1. **Identity Management**
   - Create tables with email/phone fields (that's Party data)
   - Store duplicate contact information
   - Create user/customer/vendor identity tables
   - Example: NO `leads`, `bidders`, `website_users`, `contacts` tables

2. **Asset Management**
   - Create parallel asset tracking
   - Store asset specifications
   - Track asset location outside Core
   - Modify asset cost (financial history is immutable)

3. **Financial Recording**
   - Store amounts outside Core transaction tables
   - Create revenue/cost records outside accounting
   - Bypass journal entry system
   - Modify posted transactions

4. **Multi-Tenancy**
   - Bypass company_id in RLS
   - Store cross-company data
   - Ignore engine toggle flags

5. **State Management**
   - Hardcode status/stage values
   - Create parallel state systems
   - Ignore configured workflows

---

## 4. Extension Patterns (How Engines Should Extend Core)

### Pattern 1: JSONB Metadata (Recommended for simple cases)
```sql
-- Add engine-specific fields without schema changes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS crm_metadata jsonb;

-- Store CRM data
UPDATE customers
SET crm_metadata = '{"lead_source": "website", "qualification_score": 85}'
WHERE id = '...';
```

### Pattern 2: Related Tables (Recommended for complex cases)
```sql
-- Link to Core entity
CREATE TABLE asset_data_sanitization (
  id uuid PRIMARY KEY,
  asset_id uuid REFERENCES assets(id),  -- Links to Core
  sanitization_method text,
  completed_at timestamptz
);
```

### Pattern 3: Classification Fields (Recommended for type discrimination)
```sql
-- Core provides classification field
ALTER TABLE customers ADD COLUMN entity_type text DEFAULT 'sales_customer';

-- Engines use it for filtering
SELECT * FROM customers WHERE entity_type = 'itad_client';
```

### Pattern 4: Generic Foreign Keys (Use sparingly)
```sql
-- Core provides generic reference
ALTER TABLE assets ADD COLUMN project_id uuid;

-- Engines populate with their IDs
UPDATE assets SET project_id = itad_project.id WHERE ...;
```

---

## 5. Contract Enforcement

### Violation Examples (WRONG):

#### Example 1: Identity Duplication (CRM Engine)
```sql
-- WRONG: Creating a separate identity table
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  lead_name text,
  contact_email text,  -- Duplicates Party identity
  contact_phone text,  -- Duplicates Party identity
  company_name text
);

-- CORRECT: Use Core Party
INSERT INTO customers (name, email, phone, entity_type)
VALUES ('John Doe', 'john@example.com', '555-1234', 'prospect');

-- Store CRM-specific data in related table
CREATE TABLE crm_prospect_metadata (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  lead_source text,
  qualification_score int,
  assigned_to uuid
);
```

#### Example 2: Financial Bypass (Auction Engine)
```sql
-- WRONG: Storing financial truth outside Core
CREATE TABLE auction_sales (
  id uuid PRIMARY KEY,
  item_id uuid,
  sale_price numeric,  -- Duplicates transaction truth
  commission numeric
);

-- CORRECT: Create Core transaction + metadata
INSERT INTO sales_invoices (order_type, sales_channel, ...)
VALUES ('auction_settlement', 'auction', ...);

-- Store auction-specific data separately
CREATE TABLE auction_settlements (
  id uuid PRIMARY KEY,
  sales_invoice_id uuid REFERENCES sales_invoices(id),
  auction_lot_id uuid,
  commission_percent numeric,
  commission_amount numeric  -- Derived from invoice
);
```

#### Example 3: Asset Duplication (ITAD Engine)
```sql
-- WRONG: Creating parallel asset tracking
CREATE TABLE itad_equipment (
  id uuid PRIMARY KEY,
  serial_number text,  -- Duplicates assets.serial_number
  model text,          -- Duplicates assets.model
  sanitization_status text
);

-- CORRECT: Extend Core asset
UPDATE assets
SET business_source = 'itad_intake',
    project_id = itad_project.id
WHERE id = '...';

-- Store ITAD workflow in related table
CREATE TABLE asset_data_sanitization (
  id uuid PRIMARY KEY,
  asset_id uuid REFERENCES assets(id),
  sanitization_method text,
  certificate_id uuid
);
```

---

## 6. Core API Requirements

Core must expose these capabilities to Engines:

### Identity API
```typescript
// Find or create party (deduplication)
findOrCreateParty(email: string, name: string, type: 'customer' | 'supplier'): Promise<Party>

// Update party contact info (single source of truth)
updatePartyContact(partyId: uuid, contact: ContactInfo): Promise<void>

// Search parties
searchParties(query: string, entityType?: string): Promise<Party[]>
```

### Asset API
```typescript
// Create asset with engine context
createAsset(data: AssetCreate, businessSource: string, projectId?: uuid): Promise<Asset>

// Update asset status/location
updateAssetStatus(assetId: uuid, status: string, stage: string): Promise<void>

// Asset lifecycle queries
getAssetsByStatus(companyId: uuid, status: string): Promise<Asset[]>
getAssetHistory(assetId: uuid): Promise<AssetHistory[]>
```

### Transaction API
```typescript
// Create purchase transaction
createPurchase(data: PurchaseCreate, orderType: string): Promise<PurchaseOrder>

// Create sales transaction
createSale(data: SaleCreate, orderType: string, channel: string): Promise<SalesInvoice>

// Query financials
getRevenue(companyId: uuid, filters: FinancialFilters): Promise<RevenueReport>
getCost(companyId: uuid, filters: FinancialFilters): Promise<CostReport>
```

### Accounting API
```typescript
// Record journal entry
recordJournalEntry(entry: JournalEntryCreate): Promise<JournalEntry>

// Query accounting
getAccountBalance(accountId: uuid): Promise<Balance>
getGeneralLedger(companyId: uuid, filters: GLFilters): Promise<GLReport>
```

---

## 7. Backward Compatibility

### Current Violations (To Be Remediated):

1. **CRM Engine:**
   - `leads` table stores identity data (should use `customers` with `entity_type = 'prospect'`)
   - `opportunities` has both `lead_id` and `customer_id` (should only have `customer_id`)

2. **Website Engine:**
   - `shopping_carts` uses `customer_email` (should link to `customer_id`)

3. **Auction Engine:**
   - `buyer_accounts` partially correct (links to `customer_id` but should enforce it)

4. **Customer Portal:**
   - `customer_portal_users` separate from main auth (acceptable for separate auth domain)

### Remediation Strategy:
- Mark violations in ARCHITECTURAL_GAPS.md
- Plan migration path
- Implement gradually without breaking existing features

---

## 8. Summary: The Core Constitution

**Core = Identity + Assets + Money + State**

Engines borrow identity, extend assets, trigger transactions, and follow state machines.

**The Golden Rule:**
> If Core owns it, engines cannot redefine it.
> If engines need it, Core must provide it.
> When in doubt, add it to Core, not engines.

**Violation Consequences:**
- Identity fragmentation (duplicate contacts)
- Financial inconsistency (revenue doesn't match)
- Data integrity issues (asset in two places)
- Reporting impossibility (data scattered)
- Architectural collapse (impossible to maintain)

**This contract is NON-NEGOTIABLE and MUST be enforced in all future development.**

---

**End of Core Contract**
