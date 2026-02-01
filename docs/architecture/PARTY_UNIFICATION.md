# PARTY UNIFICATION STRATEGY

**Status:** ✅ Phase 3 Foundation COMPLETE - Implementation Live
**Version:** 2.0 - Implementation Complete
**Last Updated:** February 1, 2026
**Priority:** CRITICAL (Prevents Identity Fragmentation)

**🎉 IMPLEMENTATION COMPLETE:** Database, service layer, and admin UI are live and functional.

---

## Implementation Summary (Phase 3 Complete)

### ✅ What Was Built

1. **Database Layer**
   - `party_links` table with validation triggers and RLS
   - Seeded `entity_types` with 13 standard Party roles
   - Helper view `party_unified_view` for reporting
   - Full indexing for performance

2. **Service Layer**
   - `partyService.ts` with 10+ operations
   - Link/resolve/suggest/unlink functionality
   - Statistics and profile queries
   - Exported and ready to use

3. **UI Components**
   - `PartyLinksWidget` - Reusable component for showing/managing links
   - `PartyDirectory` - Admin UI for unified identity management
   - Integrated into Settings → System → Party Directory

4. **Navigation**
   - Added to Settings menu (admin-only)
   - Accessible via: Settings → System → Party Directory

### 🎯 How to Use

**For Admins:**
- Go to Settings → System → Party Directory
- Search and select a customer or supplier
- Click "Add Link" to manually connect source records
- View complete unified profile with all linked identities

**For Developers:**
```typescript
import { partyService } from './services/partyService';

// Link a source to a Party
await partyService.linkToParty(companyId, 'lead', leadId, 'customer', customerId);

// Resolve source to Party
const party = await partyService.resolveParty(companyId, 'lead', leadId);

// Suggest matches
const matches = await partyService.suggestPartyMatches(companyId, { email: 'john@example.com' });
```

### 📊 Success Metrics

- ✅ Zero breaking changes
- ✅ Build passes successfully
- ✅ RLS security enforced
- ✅ Admin UI functional
- ✅ Documentation complete
- ✅ Ready for production use

### 🚀 Next Steps (Phase 4 - Future)

- Migrate CRM leads → customers
- Auto-linking background job
- Unified reporting dashboards
- Party merge tool

---

## Problem Statement

Multiple engines are creating separate identity tables instead of using Core's Party system:
- CRM creates `leads` with contact info
- Auction creates `buyer_accounts` (partially correct)
- Website uses `shopping_carts.customer_email` (not linked to Party)
- Customer Portal has `customer_portal_users` (separate auth, acceptable)

**Without Party unification, we will have:**
- Same person in 5 different tables
- No way to see complete customer journey
- Duplicate data entry
- Inconsistent contact information
- Impossible reporting ("Who are my top customers across all channels?")

---

## Party Concept: Single Identity, Multiple Roles

### The Party Model

A **Party** is a person or organization that has ANY business relationship with the company. One Party can have multiple roles:

```
John Doe <john@example.com>
├─ Prospect (CRM lead)
├─ Sales Customer (bought laptops)
├─ ITAD Client (using data sanitization services)
├─ Auction Buyer (bidding on lots)
└─ Website Customer (eCommerce orders)
```

**Key Insight:** It's ONE person, ONE email, ONE Party record. The roles are classification metadata, not separate identities.

---

## Current State Analysis

### Core Party Tables (Authoritative):

#### 1. `customers` - Buyer Side
```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY,
  company_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  entity_type text DEFAULT 'sales_customer',  -- Classification
  is_active boolean DEFAULT true,
  created_at timestamptz
);
```

**Entity Types Currently Used:**
- `sales_customer` - Direct B2B buyer
- `itad_client` - ITAD service customer
- (Need to add: `prospect`, `auction_buyer`, `website_customer`)

#### 2. `suppliers` - Seller Side
```sql
CREATE TABLE suppliers (
  id uuid PRIMARY KEY,
  company_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  entity_type text DEFAULT 'purchase_vendor',  -- Classification
  is_active boolean DEFAULT true,
  created_at timestamptz
);
```

**Entity Types Currently Used:**
- `purchase_vendor` - Direct supplier
- `consignment_vendor` - Consignment supplier
- (Need to add: `downstream_recycler`)

---

### Current Violations:

#### 1. CRM Engine: `leads` Table (DUPLICATE IDENTITY)

**Current Schema:**
```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  company_id uuid,
  lead_name text NOT NULL,           -- Duplicates customers.name
  company_name text,
  contact_email text,                 -- Duplicates customers.email
  contact_phone text,                 -- Duplicates customers.phone
  lead_source text,
  status text DEFAULT 'new',
  qualification_score int,
  assigned_to uuid,
  notes text,
  created_at timestamptz
);
```

**Problems:**
- Stores contact info (email, phone) - violates Party contract
- Separate from `customers` - no single source of truth
- When lead becomes customer, data is duplicated

**Correct Architecture:**
```sql
-- Remove leads table entirely
DROP TABLE leads;

-- Use customers with entity_type classification
INSERT INTO customers (name, email, phone, entity_type)
VALUES ('John Doe', 'john@example.com', '555-1234', 'prospect');

-- Store CRM-specific metadata in related table
CREATE TABLE crm_prospect_metadata (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  lead_source text,
  qualification_score int,
  assigned_to uuid REFERENCES profiles(id),
  status text DEFAULT 'new',
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);
```

#### 2. CRM Engine: `opportunities` Double Reference

**Current Schema:**
```sql
CREATE TABLE opportunities (
  id uuid PRIMARY KEY,
  company_id uuid,
  lead_id uuid REFERENCES leads(id),        -- Wrong: should not exist
  customer_id uuid REFERENCES customers(id), -- Correct
  opportunity_name text NOT NULL,
  value_estimate numeric,
  stage text,
  ...
);
```

**Problems:**
- Can reference EITHER lead_id OR customer_id
- Unclear which is authoritative
- Reporting nightmare (join to both tables?)

**Correct Architecture:**
```sql
-- Remove lead_id entirely
ALTER TABLE opportunities DROP COLUMN lead_id;

-- Always use customer_id
-- Prospect opportunities link to customers with entity_type = 'prospect'
```

#### 3. Website Engine: `shopping_carts` Email-Only

**Current Schema:**
```sql
CREATE TABLE shopping_carts (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  customer_email text,    -- Wrong: should link to customer_id
  items jsonb,
  expires_at timestamptz
);
```

**Problems:**
- No link to Party
- Anonymous users ok, but registered users should link
- Can't track customer shopping history

**Correct Architecture:**
```sql
-- Add customer_id link
ALTER TABLE shopping_carts
  ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Migrate existing data
UPDATE shopping_carts
SET customer_id = c.id
FROM customers c
WHERE shopping_carts.customer_email = c.email;

-- Make customer_id required for authenticated sessions
-- Keep email for anonymous (guest checkout)
```

#### 4. Auction Engine: `buyer_accounts` (Partially Correct)

**Current Schema:**
```sql
CREATE TABLE buyer_accounts (
  id uuid PRIMARY KEY,
  company_id uuid,
  customer_id uuid REFERENCES customers(id),  -- ✅ Good!
  auction_house_id uuid,
  external_buyer_id text,
  username text,
  rating_score numeric,
  ...
);
```

**Status:** CORRECT pattern! ✅
- Links to `customers` (Party)
- Stores auction-specific metadata separately
- Allows customer_id to be NULL for unknown bidders
- This is the model others should follow

**Minor Improvement:**
```sql
-- Enforce customer link for won auctions
-- Add constraint: winning bidders must be identified (have customer_id)
ALTER TABLE bids
  ADD CONSTRAINT winning_bid_must_have_customer
  CHECK (
    NOT is_winning OR
    EXISTS (
      SELECT 1 FROM buyer_accounts
      WHERE buyer_accounts.id = bids.buyer_account_id
      AND buyer_accounts.customer_id IS NOT NULL
    )
  );
```

#### 5. Customer Portal: `customer_portal_users` (Acceptable)

**Current Schema:**
```sql
CREATE TABLE customer_portal_users (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),  -- ✅ Links to Party
  portal_email text UNIQUE,
  hashed_password text,
  last_login timestamptz,
  ...
);
```

**Status:** ACCEPTABLE ✅
- Separate authentication domain (different from internal users)
- Links to `customers` (Party)
- Portal-specific credentials
- This pattern is fine for separate auth systems

---

## Party Unification Plan

### Phase 1: Extend Core Party Tables (Non-Breaking)

#### 1.1 Add New Entity Types
```sql
-- Customers: Add prospect and buyer types
-- No schema change needed, just document allowed values
COMMENT ON COLUMN customers.entity_type IS
'Entity classification:
  - sales_customer (direct buyer)
  - itad_client (ITAD service customer)
  - prospect (CRM lead, not yet customer)
  - auction_buyer (auction platform bidder)
  - website_customer (eCommerce shopper)
  - reseller (wholesale buyer)
  - consignment_client (owns inventory we sell)';

-- Suppliers: Add downstream recycler type
COMMENT ON COLUMN suppliers.entity_type IS
'Entity classification:
  - purchase_vendor (direct supplier)
  - consignment_vendor (consignment supplier)
  - downstream_recycler (material buyer)';
```

#### 1.2 Add Multi-Role Support
```sql
-- Allow Party to have multiple roles via JSONB array
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS roles jsonb DEFAULT '[]';

-- Example: Party who is both prospect and customer
UPDATE customers
SET roles = '["prospect", "sales_customer"]'
WHERE id = '...';

-- Query: Find all prospects
SELECT * FROM customers
WHERE roles @> '["prospect"]';
```

#### 1.3 Add Classification Helpers
```sql
-- View: All prospects (for CRM)
CREATE VIEW crm_prospects AS
SELECT c.*
FROM customers c
WHERE c.entity_type = 'prospect'
   OR c.roles @> '["prospect"]';

-- View: All buyers (for Auction)
CREATE VIEW auction_buyers AS
SELECT c.*
FROM customers c
WHERE c.entity_type = 'auction_buyer'
   OR c.roles @> '["auction_buyer"]';
```

---

### Phase 2: Create Engine Metadata Tables (Non-Breaking)

Instead of duplicate identity tables, engines create metadata tables that link to Party:

#### 2.1 CRM Metadata
```sql
-- Replace leads table with prospect metadata
CREATE TABLE IF NOT EXISTS crm_prospect_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- CRM-specific fields
  lead_source text,                    -- 'website', 'referral', 'cold_call'
  qualification_score int CHECK (qualification_score BETWEEN 0 AND 100),
  assigned_to uuid REFERENCES profiles(id),
  status text DEFAULT 'new',           -- 'new', 'contacted', 'qualified', 'lost'
  lost_reason text,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(company_id, customer_id)
);

-- Index for CRM queries
CREATE INDEX idx_crm_metadata_company ON crm_prospect_metadata(company_id);
CREATE INDEX idx_crm_metadata_status ON crm_prospect_metadata(company_id, status);
```

#### 2.2 Website Metadata
```sql
-- Website-specific customer data
CREATE TABLE IF NOT EXISTS website_customer_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- eCommerce-specific fields
  customer_tier text DEFAULT 'standard',  -- 'standard', 'premium', 'wholesale'
  loyalty_points int DEFAULT 0,
  preferred_payment_method text,
  billing_address jsonb,
  shipping_addresses jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(company_id, customer_id)
);
```

---

### Phase 3: Migration Strategy (Data Preservation)

#### 3.1 Migration for CRM Leads

**Goal:** Convert leads → customers + crm_prospect_metadata **without data loss**

```sql
-- Step 1: Create prospect_metadata table (done in Phase 2)

-- Step 2: Migrate lead data to customers (if not already exists)
INSERT INTO customers (
  company_id,
  name,
  email,
  phone,
  entity_type,
  created_at
)
SELECT
  l.company_id,
  l.lead_name,
  l.contact_email,
  l.contact_phone,
  'prospect',
  l.created_at
FROM leads l
ON CONFLICT (company_id, email) DO NOTHING;  -- Skip if already exists

-- Step 3: Create prospect metadata for all leads
INSERT INTO crm_prospect_metadata (
  company_id,
  customer_id,
  lead_source,
  qualification_score,
  assigned_to,
  status,
  notes,
  created_at,
  updated_at
)
SELECT
  l.company_id,
  c.id,  -- Link to customer
  l.lead_source,
  l.qualification_score,
  l.assigned_to,
  l.status,
  l.notes,
  l.created_at,
  l.updated_at
FROM leads l
JOIN customers c ON c.company_id = l.company_id AND c.email = l.contact_email;

-- Step 4: Update opportunities to reference customer_id
UPDATE opportunities o
SET customer_id = c.id
FROM leads l
JOIN customers c ON c.company_id = l.company_id AND c.email = l.contact_email
WHERE o.lead_id = l.id
  AND o.customer_id IS NULL;

-- Step 5: Drop lead_id column from opportunities
ALTER TABLE opportunities DROP COLUMN IF EXISTS lead_id;

-- Step 6: Archive leads table (don't delete immediately)
ALTER TABLE leads RENAME TO leads_archived_20260201;

-- Step 7: After confirming migration success, drop archived table
-- DROP TABLE leads_archived_20260201;
```

#### 3.2 Migration for Shopping Carts

```sql
-- Step 1: Add customer_id to shopping_carts (done in Phase 2 violations)

-- Step 2: Link existing carts to customers where possible
UPDATE shopping_carts sc
SET customer_id = c.id
FROM customers c
WHERE sc.customer_email = c.email
  AND sc.customer_id IS NULL;

-- Step 3: For anonymous carts, leave customer_id NULL (guest checkout)

-- Step 4: Update app logic to always set customer_id for authenticated users
```

---

### Phase 4: Enforce Party Contract (Breaking Change Protection)

#### 4.1 Database Constraints

```sql
-- Ensure email uniqueness per company (prevent duplicates)
CREATE UNIQUE INDEX idx_customers_company_email
  ON customers(company_id, LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX idx_suppliers_company_email
  ON suppliers(company_id, LOWER(email))
  WHERE email IS NOT NULL;
```

#### 4.2 Application-Level Checks

```typescript
// Service layer: Enforce Party usage
async function findOrCreateParty(
  companyId: string,
  email: string,
  name: string,
  partyType: 'customer' | 'supplier',
  entityType: string
): Promise<Party> {
  // Check if Party already exists
  const existing = await supabase
    .from(partyType === 'customer' ? 'customers' : 'suppliers')
    .select('*')
    .eq('company_id', companyId)
    .ilike('email', email)
    .maybeSingle();

  if (existing.data) {
    // Update roles if needed
    const roles = existing.data.roles || [];
    if (!roles.includes(entityType)) {
      roles.push(entityType);
      await supabase
        .from(partyType === 'customer' ? 'customers' : 'suppliers')
        .update({ roles })
        .eq('id', existing.data.id);
    }
    return existing.data;
  }

  // Create new Party
  const { data, error } = await supabase
    .from(partyType === 'customer' ? 'customers' : 'suppliers')
    .insert({
      company_id: companyId,
      name,
      email,
      entity_type: entityType,
      roles: [entityType]
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Usage in CRM:
const party = await findOrCreateParty(
  companyId,
  'john@example.com',
  'John Doe',
  'customer',
  'prospect'
);

// Create CRM metadata
await supabase.from('crm_prospect_metadata').insert({
  company_id: companyId,
  customer_id: party.id,
  lead_source: 'website',
  qualification_score: 75
});
```

---

## Party Lifecycle Management

### Prospect → Customer Conversion

**Scenario:** CRM prospect becomes paying customer

```typescript
async function convertProspectToCustomer(customerId: string) {
  // Update customer roles
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  const roles = customer.roles || [];
  if (!roles.includes('sales_customer')) {
    roles.push('sales_customer');
  }

  await supabase
    .from('customers')
    .update({
      entity_type: 'sales_customer',  // Primary type changes
      roles
    })
    .eq('id', customerId);

  // CRM metadata remains linked (historical lead data preserved)
  // Can now create sales invoices, purchase orders, etc.
}
```

### Customer → ITAD Client (Multi-Role)

**Scenario:** Existing customer starts using ITAD services

```typescript
async function enrollInITADServices(customerId: string) {
  // Add ITAD role to existing customer
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  const roles = customer.roles || [];
  if (!roles.includes('itad_client')) {
    roles.push('itad_client');
  }

  await supabase
    .from('customers')
    .update({ roles })
    .eq('id', customerId);

  // Create ITAD project linking to this customer
  await supabase.from('itad_projects').insert({
    customer_id: customerId,
    project_name: '...',
    revenue_share_percent: 70
  });
}
```

---

## Reporting Benefits: Unified View

### Before Party Unification (Fragmented):

```sql
-- Impossible query: "Who are my top customers?"
-- Data scattered across leads, customers, buyer_accounts, shopping_carts

-- Attempt 1: Only shows direct sales
SELECT c.name, SUM(si.total_amount) as revenue
FROM customers c
JOIN sales_invoices si ON si.customer_id = c.id
GROUP BY c.name;

-- Missing: Auction revenue, component sales, ITAD revenue, website orders
```

### After Party Unification (Complete):

```sql
-- Single query: All revenue sources
SELECT
  c.id,
  c.name,
  c.email,
  c.roles,

  -- Direct sales
  COALESCE(SUM(si.total_amount) FILTER (WHERE si.order_type = 'direct_sale'), 0) as direct_sales,

  -- Auction sales
  COALESCE(SUM(si.total_amount) FILTER (WHERE si.order_type = 'auction_settlement'), 0) as auction_sales,

  -- Component sales
  COALESCE(SUM(cs.sale_price), 0) as component_sales,

  -- Website orders
  COALESCE(SUM(si.total_amount) FILTER (WHERE si.sales_channel = 'website'), 0) as website_sales,

  -- ITAD revenue share paid out
  COALESCE(SUM(rst.settlement_amount), 0) as itad_revenue_share,

  -- Total across all channels
  COALESCE(
    SUM(si.total_amount) +
    SUM(cs.sale_price) +
    SUM(rst.settlement_amount),
    0
  ) as total_revenue

FROM customers c
LEFT JOIN sales_invoices si ON si.customer_id = c.id
LEFT JOIN component_sales cs ON cs.buyer_id = c.id
LEFT JOIN revenue_share_transactions rst ON rst.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.roles
ORDER BY total_revenue DESC
LIMIT 10;
```

---

## Migration Timeline

### ✅ Phase 1: Immediate (Non-Breaking)
- Document entity_type classifications
- Add roles jsonb column to customers/suppliers
- Create views for engine filtering

### ✅ Phase 2: Next Sprint (Non-Breaking)
- Create `crm_prospect_metadata` table
- Create `website_customer_metadata` table
- Implement findOrCreateParty() service

### 🔄 Phase 3: Following Sprint (Data Migration)
- Migrate leads → customers + metadata
- Update opportunities to drop lead_id
- Link shopping_carts to customer_id
- Archive old tables

### 🔒 Phase 4: Final (Enforcement)
- Add unique constraints (email per company)
- Remove archived tables
- Update documentation
- Train team on Party model

---

## Implementation Checklist

### For Each Engine Adding Identity:

- [ ] Check if Party already exists (customers or suppliers)
- [ ] Use `findOrCreateParty()` to create/link
- [ ] Store engine-specific data in metadata table
- [ ] Link metadata table to customer_id or supplier_id
- [ ] NEVER store email/phone in engine tables
- [ ] NEVER create duplicate identity records

### Code Review Checklist:

- [ ] No tables with `email` columns (except Party tables)
- [ ] No tables with `phone` columns (except Party tables)
- [ ] No tables with `address` columns (except Party tables)
- [ ] All business relationships link to customer_id or supplier_id
- [ ] Engine tables store ONLY engine-specific metadata

---

## Summary

**Party = Single Identity, Multiple Roles**

One person, one record, many contexts. Engines borrow identity, don't create it.

**The migration preserves all data while establishing the correct architecture for infinite scaling.**

---

**End of Party Unification Strategy**
