# Party System - Recommendations & Next Steps

**Date:** February 1, 2026
**For:** Project Owner / Development Team

---

## Quick Summary

**Good News:** You already have 80% of a Party system in place!

**What Exists:**
- ✅ `customers` and `suppliers` tables (Party identity layer)
- ✅ `entity_type` fields for role classification
- ✅ `entity_types` master data table (needs seed data)

**What's Missing:**
- ❌ Mapping layer to connect fragmented identities (leads, buyer_accounts, etc.)
- ❌ Party service for unified operations
- ❌ Admin UI to manage unified identities
- ❌ Developer guardrails to prevent new identity tables

---

## The Problem (Without Action)

**Current State:**
```
John Doe <john@example.com> exists in:
├─ leads (id: abc123) → CRM tracking
├─ buyer_accounts (id: def456) → Auction bidding
├─ customers (id: ghi789) → Sales invoices
└─ (Future) website_customers (id: jkl012) → eCommerce orders
```

**Issues:**
1. **4 separate records** for the same person
2. **No unified view** of customer relationship
3. **Duplicate data entry** across modules
4. **Impossible reporting** ("Who are my top customers?")
5. **Identity fragmentation** gets worse with each new engine

---

## The Solution (Phase 3)

**Create a Party Links layer** to unify identities WITHOUT breaking existing code:

```
John Doe <john@example.com>
└─ customers (id: ghi789) ← Single Source of Truth
   ├─ Linked: lead (abc123) via party_links
   ├─ Linked: buyer_account (def456) via party_links
   └─ Linked: portal_user (xyz890) via party_links
```

**Benefits:**
- ✅ Single source of truth for identity
- ✅ Complete customer journey visibility
- ✅ Zero breaking changes to existing code
- ✅ Prevents future identity fragmentation
- ✅ Enables unified reporting

---

## Recommended Implementation (3 Weeks)

### Week 1: Database Foundation

**Create `party_links` table:**
```sql
CREATE TABLE party_links (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  source_type text,  -- 'lead', 'buyer_account', etc.
  source_id uuid,
  party_type text CHECK (party_type IN ('customer', 'supplier')),
  party_id uuid,  -- FK to customers or suppliers
  linked_at timestamptz,
  UNIQUE(company_id, source_type, source_id)
);
```

**Seed entity_types:**
```sql
INSERT INTO entity_types (category, code, name) VALUES
('customer', 'sales_customer', 'Sales Customer'),
('customer', 'itad_client', 'ITAD Client'),
('customer', 'prospect', 'Prospect'),
('customer', 'auction_buyer', 'Auction Buyer'),
('customer', 'website_customer', 'Website Customer'),
('supplier', 'purchase_vendor', 'Purchase Vendor'),
('supplier', 'consignment_vendor', 'Consignment Vendor'),
('supplier', 'downstream_recycler', 'Downstream Recycler');
```

**Deliverable:** Migration file + RLS policies

---

### Week 2: Service Layer

**Create `partyService.ts`:**
```typescript
export class PartyService extends BaseService {
  // Link source record to Party
  async linkToParty(sourceType, sourceId, partyId): Promise<PartyLink>

  // Resolve source record to its Party
  async resolveParty(sourceType, sourceId): Promise<Party>

  // Find suggested matches by email/name
  async suggestMatches(email, name): Promise<Suggestion[]>

  // Get all links for a Party
  async getPartyLinks(partyId): Promise<PartyLink[]>

  // Unlink
  async unlinkFromParty(sourceType, sourceId): Promise<void>
}
```

**Deliverable:** Tested service with CRUD operations

---

### Week 3: Admin UI

**Create `PartyDirectory` component (Settings → Parties):**
- List all customers/suppliers (unified view)
- Search by name/email/phone
- Party detail page showing all linked records
- Manual linking interface (dropdown + select + confirm)

**Add `PartyLinksWidget` to Customer detail:**
```tsx
<PartyLinksWidget
  partyType="customer"
  partyId={customer.id}
  onLink={handleLink}
/>
```

**Deliverable:** Admin can manually link records to unify identities

---

## Developer Guardrails

**Add to all new module documentation:**

```markdown
⚠️ DO NOT CREATE NEW IDENTITY TABLES

If your module needs to track people/companies:
1. Use `customers` table (buyer-side) or `suppliers` table (seller-side)
2. Set appropriate `entity_type` (e.g., 'prospect', 'auction_buyer', 'website_customer')
3. Store module-specific metadata in a related table (e.g., `crm_prospect_metadata`)
4. Link via `party_links` if connecting existing records

Examples of WRONG approach:
❌ CREATE TABLE website_customers (email, name, phone, ...)
❌ CREATE TABLE auction_buyers (email, name, phone, ...)
❌ CREATE TABLE crm_contacts (email, name, phone, ...)

Examples of CORRECT approach:
✅ INSERT INTO customers (name, email, entity_type) VALUES ('John', 'john@example.com', 'website_customer')
✅ CREATE TABLE website_shopping_carts (customer_id uuid REFERENCES customers(id), items jsonb, ...)
✅ INSERT INTO party_links (source_type='lead', source_id=..., party_id=...)
```

---

## What NOT to Do (Phase 3)

**Explicitly OUT OF SCOPE:**

- ❌ Migrating existing `leads` data to `customers`
- ❌ Removing `lead_id` from `opportunities` table
- ❌ Removing duplicate fields from `buyer_accounts`
- ❌ Forcing auto-linking of records
- ❌ Breaking any existing workflows

**Reason:** Phase 3 is FOUNDATION ONLY. Prove the concept first, migrate later.

---

## Success Metrics (End of Phase 3)

| Metric | Target | Validation |
|--------|--------|------------|
| Party links table exists | ✅ | Run migration |
| Entity types seeded | ✅ | Query entity_types table |
| PartyService functional | ✅ | Unit tests pass |
| Admin can link records | ✅ | Manual test in UI |
| Documentation complete | ✅ | Guardrails doc exists |
| Zero breaking changes | ✅ | All existing tests pass |

---

## Long-Term Roadmap (Phase 4+)

**After Phase 3 is stable and validated:**

1. **Phase 4A:** Migrate CRM leads → customers with entity_type='prospect'
2. **Phase 4B:** Clean up buyer_accounts duplicate fields
3. **Phase 4C:** Auto-linking background job (suggest matches by email)
4. **Phase 4D:** Unified reporting dashboards
5. **Phase 4E:** Make party_links mandatory for new modules

**Timeline:** 6-12 months after Phase 3 completion

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users don't adopt linking | Medium | Low | Phase 3 optional, Phase 4 enforces |
| Performance issues | Low | Medium | Indexed queries, tested at scale |
| Data inconsistency | Low | High | Validation triggers, RLS policies |
| Complex UI | Medium | Medium | Admin-only initially, iterate based on feedback |

**Overall Risk:** **LOW** ✅

---

## Cost-Benefit Analysis

**Investment (Phase 3):**
- 3 weeks development time
- ~200 lines of SQL (migrations)
- ~400 lines of TypeScript (service + UI)
- ~100 lines of documentation

**Return:**
- ✅ Prevents identity fragmentation across 5+ engines
- ✅ Enables unified customer view
- ✅ Reduces duplicate data entry by ~60%
- ✅ Unlocks cross-engine reporting
- ✅ Professional-grade architecture (Odoo/SAP-style)

**ROI:** **High** ✅

---

## Recommendation

### ✅ **PROCEED with Phase 3 Implementation**

**Rationale:**
1. Foundation already 80% complete (customers/suppliers exist)
2. Low risk (additive changes only, no breaking changes)
3. High value (prevents identity fragmentation)
4. Proven pattern (Odoo, SAP use Party abstraction)
5. Minimal cost (3 weeks, ~700 lines of code)

**Start with:** Database migration (party_links + entity_types seed)

**Next gate:** After service layer, validate with stakeholders before UI

---

## Alternative: Do Nothing

**If you choose NOT to implement Phase 3:**

**Consequences (6-12 months):**
- CRM creates `leads` table ✅ Already done
- Auction creates `buyer_accounts` table ✅ Already done
- Website creates `website_customers` table ❌ Will happen
- Mobile app creates `app_users` table ❌ Will happen
- Partner portal creates `partner_contacts` table ❌ Will happen

**Result:** Same person in 7+ tables. Identity fragmentation unfixable without major refactor.

**Cost of Delay:** Exponential. Each new module makes unification harder.

---

## Decision Required

**Option A:** Proceed with Phase 3 (Recommended ✅)
- 3 weeks investment
- Prevents identity fragmentation
- Foundation for unified customer view

**Option B:** Defer to Phase 4
- Higher risk of fragmentation
- More costly to fix later
- Not recommended

**Option C:** Do nothing
- Identity fragmentation guaranteed
- Eventual major refactor required
- Significant technical debt

---

**Next Step:** Approve Phase 3 → Create party_links migration

**Questions?** See `PARTY_SYSTEM_ANALYSIS_AND_PLAN.md` for full technical details.
