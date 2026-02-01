# Party System - Analysis & Implementation Plan

**Date:** February 1, 2026
**Status:** Foundation Analysis Complete
**Goal:** Implement unified Party identity layer for CRM, Website, Auction engines

---

## Executive Summary

The codebase **already has a Party foundation** but lacks:
1. **Mapping layer** to link disparate identity records
2. **Party service** abstraction for unified operations
3. **UI** to view and manage unified identities
4. **Guardrails** to prevent new identity table proliferation

**Key Insight:** We do NOT need a new `parties` table. The `customers` + `suppliers` tables with `entity_type` classification already serve as the Party layer.

---

## Current State Analysis

### ✅ Existing Party Foundation (Good)

#### 1. Core Party Tables

**`customers` Table** (Buyer-side identity)
```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  name text NOT NULL,
  code text GENERATED,
  email text,
  phone text,
  website text,
  billing_address text,
  shipping_address text,
  tax_id text,
  payment_terms text,
  credit_limit numeric,
  currency text,
  notes text,
  is_active boolean DEFAULT true,
  entity_type text DEFAULT 'sales_customer',  -- ✅ Role classification
  entity_type_id uuid REFERENCES entity_types(id),  -- ✅ FK to master data
  customer_type text,  -- Legacy field
  created_at timestamptz,
  created_by uuid
);
```

**`suppliers` Table** (Seller-side identity)
```sql
CREATE TABLE suppliers (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  name text NOT NULL,
  code text GENERATED,
  email text,
  phone text,
  website text,
  address text,
  tax_id text,
  payment_terms text,
  currency text,
  notes text,
  is_active boolean DEFAULT true,
  entity_type text DEFAULT 'purchase_vendor',  -- ✅ Role classification
  entity_type_id uuid REFERENCES entity_types(id),  -- ✅ FK to master data
  created_at timestamptz,
  created_by uuid
);
```

**Conclusion:** These two tables form the Party identity layer. A person/company can be BOTH a customer AND a supplier.

#### 2. Entity Types Master Data

**`entity_types` Table**
```sql
CREATE TABLE entity_types (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),  -- Tenant-specific types
  category text NOT NULL,  -- 'customer', 'supplier', 'prospect', etc.
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz,
  UNIQUE(company_id, code)
);
```

**Status:** Table exists, RLS enabled, but **NO SEED DATA** yet.

**Required Standard Types:**
```
Buyer-side (category: 'customer'):
  - sales_customer - Direct B2B buyer
  - itad_client - ITAD service customer
  - prospect - CRM lead/prospect
  - auction_buyer - Auction participant
  - website_customer - eCommerce customer
  - distributor - Resale partner
  - end_user - Final consumer

Seller-side (category: 'supplier'):
  - purchase_vendor - Direct supplier
  - consignment_vendor - Consignment partner
  - downstream_recycler - Materials buyer
  - service_provider - External services
```

---

### ❌ Identity Fragmentation Issues (Bad)

#### 1. CRM `leads` Table - DUPLICATE IDENTITY

**Current Schema:**
```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  company_id uuid,
  lead_name text NOT NULL,        -- ❌ Duplicates customers.name
  company_name text,
  contact_email text,              -- ❌ Duplicates customers.email
  contact_phone text,              -- ❌ Duplicates customers.phone
  lead_source text,
  status text DEFAULT 'new',
  qualification_score int,
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz
);
```

**Problems:**
- Stores identity fields (name, email, phone)
- No link to `customers` table
- When lead converts, data is duplicated into `customers`
- No single source of truth

**Solution:** Link `leads` to `customers` via `party_links`, remove identity fields from `leads`.

#### 2. CRM `opportunities` - Double Reference

**Current Schema:**
```sql
CREATE TABLE opportunities (
  id uuid PRIMARY KEY,
  company_id uuid,
  lead_id uuid REFERENCES leads(id),        -- ❌ Wrong
  customer_id uuid REFERENCES customers(id), -- ✅ Correct
  opportunity_name text NOT NULL,
  value_estimate numeric,
  stage text,
  ...
);
```

**Problem:** Can reference EITHER lead_id OR customer_id. Ambiguous.

**Solution:** Remove `lead_id`, always use `customer_id`. Prospects are `customers` with `entity_type = 'prospect'`.

#### 3. Auction `buyer_accounts` - Partially Correct

**Current Schema:**
```sql
CREATE TABLE buyer_accounts (
  id uuid PRIMARY KEY,
  company_id uuid,
  customer_id uuid REFERENCES customers(id),  -- ✅ Correct FK
  buyer_number text GENERATED,
  buyer_name text,           -- ❌ Should come from customers.name
  email text,                -- ❌ Should come from customers.email
  phone text,                -- ❌ Should come from customers.phone
  paddle_number text,        -- ✅ Auction-specific metadata (OK)
  is_approved boolean,       -- ✅ Auction-specific metadata (OK)
  deposit_amount numeric,    -- ✅ Auction-specific metadata (OK)
  ...
);
```

**Status:** Has correct FK to `customers`, but duplicates identity fields.

**Solution:** Use `party_links` to connect, remove duplicate fields, rely on JOIN to `customers`.

#### 4. Website (Future) - No Table Yet

**Expected Issue:** Will create `website_customers` table with email, phone, address.

**Solution:** Use `customers` with `entity_type = 'website_customer'`. Create `website_customer_metadata` for web-specific data (shopping cart preferences, wishlists, etc.).

---

## Proposed Architecture

### Phase 3 Implementation: Party Links Mapping Layer

**Goal:** Connect existing identity tables to Party (customers/suppliers) without data migration.

#### 1. Create `party_links` Mapping Table

```sql
CREATE TABLE party_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Source record being linked
  source_type text NOT NULL,  -- 'lead', 'buyer_account', 'customer_portal_user', etc.
  source_id uuid NOT NULL,

  -- Target Party (customer or supplier)
  party_type text NOT NULL CHECK (party_type IN ('customer', 'supplier')),
  party_id uuid NOT NULL,  -- FK checked via trigger

  -- Metadata
  linked_at timestamptz DEFAULT now(),
  linked_by uuid REFERENCES profiles(id),
  link_method text DEFAULT 'manual' CHECK (link_method IN ('manual', 'auto', 'import', 'suggested')),
  confidence_score numeric(3,2),  -- For auto-matching: 0.00-1.00
  notes text,

  -- Constraints
  UNIQUE(company_id, source_type, source_id),  -- One source → one Party

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_party_links_source ON party_links(company_id, source_type, source_id);
CREATE INDEX idx_party_links_party ON party_links(company_id, party_type, party_id);
```

**Trigger to validate party_id exists:**
```sql
CREATE OR REPLACE FUNCTION validate_party_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.party_type = 'customer' THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.party_id AND company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Invalid customer party_id: %', NEW.party_id;
    END IF;
  ELSIF NEW.party_type = 'supplier' THEN
    IF NOT EXISTS (SELECT 1 FROM suppliers WHERE id = NEW.party_id AND company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Invalid supplier party_id: %', NEW.party_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_party_link_trigger
  BEFORE INSERT OR UPDATE ON party_links
  FOR EACH ROW EXECUTE FUNCTION validate_party_link();
```

#### 2. Seed Entity Types

```sql
-- Standard buyer-side entity types
INSERT INTO entity_types (company_id, category, name, code, description) VALUES
(NULL, 'customer', 'Sales Customer', 'sales_customer', 'Direct B2B customer purchasing equipment'),
(NULL, 'customer', 'ITAD Client', 'itad_client', 'Customer using ITAD services'),
(NULL, 'customer', 'Prospect', 'prospect', 'Potential customer (CRM lead)'),
(NULL, 'customer', 'Auction Buyer', 'auction_buyer', 'Registered auction participant'),
(NULL, 'customer', 'Website Customer', 'website_customer', 'eCommerce online customer'),
(NULL, 'customer', 'Distributor', 'distributor', 'Resale partner'),
(NULL, 'customer', 'End User', 'end_user', 'Final consumer');

-- Standard seller-side entity types
INSERT INTO entity_types (company_id, category, name, code, description) VALUES
(NULL, 'supplier', 'Purchase Vendor', 'purchase_vendor', 'Direct equipment supplier'),
(NULL, 'supplier', 'Consignment Vendor', 'consignment_vendor', 'Consignment partner'),
(NULL, 'supplier', 'Downstream Recycler', 'downstream_recycler', 'Materials/components buyer'),
(NULL, 'supplier', 'Service Provider', 'service_provider', 'External service contractor');

-- Note: company_id = NULL means global/default types
-- Tenants can override by creating company-specific types
```

#### 3. Create Party Service

**File:** `src/services/partyService.ts`

```typescript
import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface PartyLink {
  id: string;
  company_id: string;
  source_type: string;
  source_id: string;
  party_type: 'customer' | 'supplier';
  party_id: string;
  linked_at: string;
  linked_by?: string;
  link_method: 'manual' | 'auto' | 'import' | 'suggested';
  confidence_score?: number;
  notes?: string;
}

export interface PartyResolution {
  found: boolean;
  party_type?: 'customer' | 'supplier';
  party_id?: string;
  party?: any;  // Customer or Supplier record
}

export interface PartySuggestion {
  party_type: 'customer' | 'supplier';
  party_id: string;
  party: any;
  match_score: number;
  match_reason: string;
}

export class PartyService extends BaseService {
  /**
   * Link a source record to a Party
   */
  async linkToParty(
    companyId: string,
    sourceType: string,
    sourceId: string,
    partyType: 'customer' | 'supplier',
    partyId: string,
    options?: {
      linkedBy?: string;
      method?: 'manual' | 'auto' | 'import' | 'suggested';
      notes?: string;
    }
  ): Promise<PartyLink> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('party_links')
        .insert({
          company_id: companyId,
          source_type: sourceType,
          source_id: sourceId,
          party_type: partyType,
          party_id: partyId,
          linked_by: options?.linkedBy,
          link_method: options?.method || 'manual',
          notes: options?.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to link to party');
  }

  /**
   * Resolve a source record to its Party
   */
  async resolveParty(
    companyId: string,
    sourceType: string,
    sourceId: string
  ): Promise<PartyResolution> {
    return this.executeQuery(async () => {
      // Check party_links
      const { data: link, error: linkError } = await supabase
        .from('party_links')
        .select('party_type, party_id')
        .eq('company_id', companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle();

      if (linkError) throw linkError;

      if (!link) {
        return { found: false };
      }

      // Fetch Party record
      const table = link.party_type === 'customer' ? 'customers' : 'suppliers';
      const { data: party, error: partyError } = await supabase
        .from(table)
        .select('*')
        .eq('id', link.party_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (partyError) throw partyError;

      return {
        found: true,
        party_type: link.party_type,
        party_id: link.party_id,
        party: party,
      };
    }, 'Failed to resolve party');
  }

  /**
   * Find suggested Party matches for a source record
   */
  async suggestPartyMatches(
    companyId: string,
    searchCriteria: {
      email?: string;
      phone?: string;
      name?: string;
    }
  ): Promise<PartySuggestion[]> {
    return this.executeQuery(async () => {
      const suggestions: PartySuggestion[] = [];

      // Search customers by email (highest confidence)
      if (searchCriteria.email) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .ilike('email', searchCriteria.email)
          .eq('is_active', true);

        if (customers) {
          customers.forEach((c) => {
            suggestions.push({
              party_type: 'customer',
              party_id: c.id,
              party: c,
              match_score: 0.95,
              match_reason: 'Email match',
            });
          });
        }
      }

      // Search customers by name (medium confidence)
      if (searchCriteria.name && suggestions.length === 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', `%${searchCriteria.name}%`)
          .eq('is_active', true)
          .limit(5);

        if (customers) {
          customers.forEach((c) => {
            suggestions.push({
              party_type: 'customer',
              party_id: c.id,
              party: c,
              match_score: 0.70,
              match_reason: 'Name similarity',
            });
          });
        }
      }

      return suggestions.sort((a, b) => b.match_score - a.match_score);
    }, 'Failed to suggest party matches');
  }

  /**
   * Get all Party links for a specific Party
   */
  async getPartyLinks(
    companyId: string,
    partyType: 'customer' | 'supplier',
    partyId: string
  ): Promise<PartyLink[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('party_links')
        .select('*')
        .eq('company_id', companyId)
        .eq('party_type', partyType)
        .eq('party_id', partyId)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch party links');
  }

  /**
   * Unlink a source record from its Party
   */
  async unlinkFromParty(
    companyId: string,
    sourceType: string,
    sourceId: string
  ): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('party_links')
        .delete()
        .eq('company_id', companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

      if (error) throw error;
    }, 'Failed to unlink from party');
  }
}

export const partyService = new PartyService();
```

---

## Implementation Checklist

### Phase 3A: Foundation (Database)

- [ ] Create `party_links` table migration
- [ ] Add validation trigger for party_id
- [ ] Seed `entity_types` with standard types
- [ ] Add RLS policies to `party_links`
- [ ] Create indexes for performance

**Migration File:** `supabase/migrations/YYYYMMDDHHMMSS_create_party_links_system.sql`

### Phase 3B: Service Layer

- [ ] Create `src/services/partyService.ts`
- [ ] Add to `src/services/index.ts` exports
- [ ] Write unit tests (if applicable)

### Phase 3C: UI (Admin-Only)

- [ ] Create `src/components/settings/PartyDirectory.tsx`
  - List all customers/suppliers
  - Search by name/email
  - View Party detail with linked records
  - Manual linking interface (dropdown source_type, select source record, confirm link)
- [ ] Add "Parties" to Settings menu (admin-only)
- [ ] Create "Link to Party" button on relevant pages

**Safe Integration Point:** Add to Customer detail view:
```tsx
// In src/components/customers/Customers.tsx
<div className="mt-4 border-t pt-4">
  <h4 className="text-sm font-medium text-slate-700 mb-2">
    Unified Identity Links
  </h4>
  <PartyLinksWidget
    partyType="customer"
    partyId={customer.id}
  />
</div>
```

### Phase 3D: Documentation & Guardrails

- [ ] Update `PARTY_UNIFICATION.md` with implementation status
- [ ] Create `PARTY_DEVELOPER_GUIDE.md` with:
  - When to use Party vs separate tables
  - How to link new modules
  - Code examples
- [ ] Add code comments to CRM tables:
```sql
-- ⚠️ DEPRECATED APPROACH: This table stores identity fields.
-- New modules should NOT create separate identity tables.
-- Use customers/suppliers + party_links instead.
COMMENT ON TABLE leads IS 'Legacy CRM leads table. New modules should use customers with entity_type="prospect" instead.';
```

### Phase 3E: Testing

- [ ] Test manual linking flow (lead → customer)
- [ ] Test Party resolution (fetch lead, resolve to customer)
- [ ] Test suggested matches (find customer by email)
- [ ] Test unlinking
- [ ] Verify RLS (users can only link Parties in their company)

---

## Deferred to Phase 4 (Data Migration)

**Do NOT implement in Phase 3:**

- Migrating existing `leads` data to `customers`
- Removing `lead_id` from `opportunities`
- Removing duplicate fields from `buyer_accounts`
- Restructuring CRM tables

**Phase 3 Goal:** Foundation only. Existing tables remain unchanged. Linking is manual and optional.

---

## Success Criteria for Phase 3

✅ `party_links` table exists and is functional
✅ `entity_types` table has seed data
✅ `partyService.ts` can link/resolve/suggest
✅ Admin UI can manually link records
✅ Documentation prevents new identity table creation
✅ Zero breaking changes to existing workflows

---

## Long-Term Vision (Phase 4+)

Once Party Links are proven:

1. **Migrate CRM leads** → customers with entity_type='prospect'
2. **Clean up buyer_accounts** → Remove duplicate fields, rely on JOIN
3. **Enforce at DB level** → Make party_links mandatory for new records
4. **Auto-linking** → Background job to suggest matches based on email
5. **Unified reporting** → "Top customers across all channels" query

**Timeline:** Phase 4 = After engine system stabilizes and adoption is validated.

---

## Files to Create/Modify

### New Files
1. `supabase/migrations/YYYYMMDDHHMMSS_create_party_links_system.sql`
2. `src/services/partyService.ts`
3. `src/components/settings/PartyDirectory.tsx`
4. `src/components/common/PartyLinksWidget.tsx`
5. `PARTY_DEVELOPER_GUIDE.md`

### Modified Files
1. `src/services/index.ts` - Export partyService
2. `src/components/customers/Customers.tsx` - Add Party links widget
3. `PARTY_UNIFICATION.md` - Update status

### No Changes
- All existing tables remain untouched
- All existing services unchanged
- All existing UI flows work as-is

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Users forget to link records | Phase 3 is optional; no enforcement yet |
| Complex UI confuses users | Start with admin-only, simple search interface |
| Performance impact | Indexed queries, no JOINs on hot paths |
| Data inconsistency | Validation triggers prevent invalid links |
| Migration complexity | Deferred to Phase 4 after validation |

**Overall Risk:** **LOW** - Phase 3 is additive, no breaking changes.

---

## Recommendation

**PROCEED** with Phase 3 implementation as specified:

1. **Week 1:** Database (party_links, entity_types seed, RLS)
2. **Week 2:** Service layer (partyService.ts)
3. **Week 3:** Admin UI (PartyDirectory + linking widget)
4. **Week 4:** Documentation, testing, validation

**Expected Outcome:** Unified Party identity system ready for CRM, Website, Auction engines to adopt without identity fragmentation.

---

**Status:** Ready for implementation
**Approval:** Pending
**Next Step:** Create `party_links` migration
