# Party System - Architecture Visual Guide

**Date:** February 1, 2026

---

## Current State: Identity Fragmentation

```
┌─────────────────────────────────────────────────────────────────┐
│                      IDENTITY FRAGMENTATION                      │
│                    (Without Party System)                        │
└─────────────────────────────────────────────────────────────────┘

Customer: "John Doe <john@example.com>"


┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ CRM Engine   │     │Auction Engine│     │ ITAD Engine  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│              │     │              │     │              │
│ LEADS        │     │BUYER_ACCOUNTS│     │  CUSTOMERS   │
│ ───────────  │     │──────────────│     │  ────────────│
│ id: abc-123  │     │ id: def-456  │     │ id: ghi-789  │
│ name: John   │     │ name: John   │     │ name: John   │
│ email: john@ │     │ email: john@ │     │ email: john@ │
│ phone: 555-  │     │ phone: 555-  │     │ phone: 555-  │
│              │     │              │     │              │
│ lead_source  │     │ paddle_num   │     │ project_id   │
│ score: 85    │     │ deposit: $500│     │ revenue: $5K │
└──────────────┘     └──────────────┘     └──────────────┘

       ❌                    ❌                    ❌
   No Link              No Link              No Link


Problems:
• 3 separate records for same person
• Duplicate data entry (name, email, phone × 3)
• No unified customer view
• Can't answer: "What's John's total value across all engines?"
• Future engines will create MORE duplicate tables


When Website engine launches → 4th table: website_customers
When Mobile app launches → 5th table: app_users
When Partner portal launches → 6th table: partner_contacts
```

---

## Proposed State: Unified Party System

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED PARTY SYSTEM                        │
│                    (Phase 3 Architecture)                        │
└─────────────────────────────────────────────────────────────────┘

Customer: "John Doe <john@example.com>"


                    ┌──────────────────────────┐
                    │    PARTY (Core Identity) │
                    │                          │
                    │      CUSTOMERS           │
                    │      ──────────────      │
                    │      id: ghi-789         │
                    │      name: John Doe      │
                    │      email: john@ex.com  │ ← Single Source
                    │      phone: 555-1234     │    of Truth
                    │      entity_type: [...]  │
                    │                          │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
                    │     PARTY_LINKS          │
                    │     ───────────────      │
                    │     Mapping Layer        │
                    │                          │
                    └────┬─────────┬─────────┬─┘
                         │         │         │
          ┌──────────────┘         │         └──────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CRM Metadata   │    │Auction Metadata │    │  ITAD Metadata  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ party_links:    │    │ party_links:    │    │ party_links:    │
│ ─────────────── │    │ ─────────────── │    │ ─────────────── │
│ source_type:    │    │ source_type:    │    │ source_type:    │
│   'lead'        │    │   'buyer_account│    │   'itad_project'│
│ source_id:      │    │ source_id:      │    │ source_id:      │
│   abc-123       │    │   def-456       │    │   jkl-012       │
│ party_id:       │    │ party_id:       │    │ party_id:       │
│   ghi-789  ────┼────┼──▶ghi-789  ────┼────┼──▶ghi-789       │
│                 │    │                 │    │                 │
│ CRM-specific:   │    │ Auction-specific│    │ ITAD-specific:  │
│ • lead_source   │    │ • paddle_number │    │ • project_id    │
│ • qual_score: 85│    │ • deposit: $500 │    │ • revenue: $5K  │
│ • assigned_to   │    │ • is_approved   │    │ • compliance    │
└─────────────────┘    └─────────────────┘    └─────────────────┘


Benefits:
✅ Single source of truth for identity (customers table)
✅ Module-specific data in separate tables (no duplication)
✅ Links connect everything (party_links)
✅ Complete customer journey view
✅ Unified reporting across all engines
✅ Future engines reuse same pattern (no new identity tables)


Query Example:
"Show me John's complete profile"
→ SELECT * FROM customers WHERE id = 'ghi-789'
→ SELECT * FROM party_links WHERE party_id = 'ghi-789'
→ JOIN to each source table for metadata
→ Result: CRM lead + Auction buyer + ITAD client in one view
```

---

## Data Flow Comparison

### ❌ WITHOUT Party System (Current)

```
New CRM Lead Created:
1. User enters: John Doe, john@example.com, 555-1234
2. INSERT INTO leads (name, email, phone, ...)
3. Lead converts to customer
4. DUPLICATE INSERT INTO customers (name, email, phone, ...)
5. Now 2 records with same data
6. Customer bids in auction
7. DUPLICATE INSERT INTO buyer_accounts (name, email, phone, ...)
8. Now 3 records with same data
9. Customer uses ITAD service
10. Record already in customers, but linked to wrong entity_type
11. Confusion: Which "John Doe" record is correct?

Result: Data mess, reporting nightmare
```

### ✅ WITH Party System (Proposed)

```
New CRM Lead Created:
1. User enters: John Doe, john@example.com, 555-1234
2. Check if customer exists:
   SELECT * FROM customers WHERE email = 'john@example.com'
3. IF NOT EXISTS:
     INSERT INTO customers (name, email, phone, entity_type='prospect')
   ELSE:
     UPDATE customers SET entity_type = entity_type || 'prospect'
4. Store CRM metadata:
     INSERT INTO crm_prospect_metadata (customer_id, lead_source, ...)
5. Create link:
     INSERT INTO party_links (source_type='lead', party_id=customer.id)

Lead converts to customer:
6. UPDATE customers SET entity_type = entity_type || 'sales_customer'
7. No duplicate data entry needed!

Customer bids in auction:
8. Create auction metadata:
     INSERT INTO auction_buyer_metadata (customer_id, paddle_number, ...)
9. Create link:
     INSERT INTO party_links (source_type='buyer_account', party_id=customer.id)
10. UPDATE customers SET entity_type = entity_type || 'auction_buyer'

Customer uses ITAD service:
11. UPDATE customers SET entity_type = entity_type || 'itad_client'
12. Create ITAD project linked to same customer_id

Result: Clean data, complete journey tracking
```

---

## Entity Type Evolution

```
Timeline: John Doe's Relationship with Company

┌──────────────────────────────────────────────────────────────┐
│                    PARTY IDENTITY                            │
│                                                              │
│  Customer ID: ghi-789                                        │
│  Name: John Doe                                              │
│  Email: john@example.com                                     │
│  Phone: 555-1234                                             │
│                                                              │
│  Entity Types (Array, evolves over time):                   │
│  ───────────────────────────────────────────────────────    │
│                                                              │
│  Month 1: ['prospect']                                       │
│           └─ CRM lead, not yet a customer                    │
│                                                              │
│  Month 2: ['prospect', 'sales_customer']                     │
│           └─ Converted! Bought 10 laptops                    │
│                                                              │
│  Month 4: ['prospect', 'sales_customer', 'auction_buyer']    │
│           └─ Registered for auction, bought pallet           │
│                                                              │
│  Month 6: ['prospect', 'sales_customer', 'auction_buyer',    │
│            'itad_client']                                    │
│           └─ Now using ITAD services for IT disposal         │
│                                                              │
│  Month 12: ['prospect', 'sales_customer', 'auction_buyer',   │
│             'itad_client', 'website_customer']               │
│           └─ Made first eCommerce purchase online            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Key Insight: ONE PERSON, MULTIPLE ROLES, SINGLE RECORD

Query: "Find customers active in ≥3 channels"
→ SELECT * FROM customers
  WHERE array_length(entity_type, 1) >= 3
  Result: John Doe (high-value multi-channel customer)
```

---

## Database Schema Visual

```
┌────────────────────────────────────────────────────────────────┐
│                    PARTY SYSTEM SCHEMA                         │
└────────────────────────────────────────────────────────────────┘


┌─────────────────────────────┐
│       ENTITY_TYPES          │  ← Master Data (Classification)
│  (Master Data)              │
├─────────────────────────────┤
│ id         uuid PK          │
│ company_id uuid FK nullable │  (NULL = global types)
│ category   text             │  'customer', 'supplier'
│ code       text             │  'prospect', 'sales_customer', ...
│ name       text             │  'Prospect', 'Sales Customer', ...
│ description text            │
│ is_active  boolean          │
│ created_at timestamptz      │
└─────────────────────────────┘
         │
         │ Referenced by
         ▼
┌─────────────────────────────┐       ┌─────────────────────────────┐
│        CUSTOMERS            │       │        SUPPLIERS            │
│    (Buyer-side Party)       │       │    (Seller-side Party)      │
├─────────────────────────────┤       ├─────────────────────────────┤
│ id              uuid PK     │       │ id              uuid PK     │
│ company_id      uuid FK     │       │ company_id      uuid FK     │
│ name            text        │       │ name            text        │
│ code            text GEN    │       │ code            text GEN    │
│ email           text        │       │ email           text        │
│ phone           text        │       │ phone           text        │
│ website         text        │       │ website         text        │
│ billing_address text        │       │ address         text        │
│ tax_id          text        │       │ tax_id          text        │
│ payment_terms   text        │       │ payment_terms   text        │
│ credit_limit    numeric     │       │ currency        text        │
│ currency        text        │       │ notes           text        │
│ notes           text        │       │ is_active       boolean     │
│ is_active       boolean     │       │ entity_type     text        │
│ entity_type     text        │◀──────│ entity_type_id  uuid FK     │
│ entity_type_id  uuid FK     │       │ created_at      timestamptz │
│ customer_type   text        │       │ created_by      uuid FK     │
│ created_at      timestamptz │       └─────────────────────────────┘
│ created_by      uuid FK     │                  │
└─────────────────────────────┘                  │
         │                                       │
         │                                       │
         │ Referenced by                         │
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                             ▼
                ┌─────────────────────────────┐
                │       PARTY_LINKS           │  ← New! (Phase 3)
                │    (Mapping Layer)          │
                ├─────────────────────────────┤
                │ id           uuid PK        │
                │ company_id   uuid FK        │
                │ source_type  text           │  'lead', 'buyer_account', ...
                │ source_id    uuid           │  Points to source table PK
                │ party_type   text           │  'customer' or 'supplier'
                │ party_id     uuid           │  Points to customers/suppliers
                │ linked_at    timestamptz    │
                │ linked_by    uuid FK        │
                │ link_method  text           │  'manual', 'auto', 'import'
                │ confidence   numeric(3,2)   │  For auto-matching: 0.00-1.00
                │ notes        text           │
                │ created_at   timestamptz    │
                │                             │
                │ UNIQUE(company_id, source_type, source_id)
                └─────────────────────────────┘
                             │
                             │ Links to
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │   LEADS     │   │BUYER_ACCOUNTS   │ITAD_PROJECTS│
    │ (CRM)       │   │ (Auction)   │   │  (ITAD)     │
    ├─────────────┤   ├─────────────┤   ├─────────────┤
    │ id          │   │ id          │   │ id          │
    │ company_id  │   │ company_id  │   │ company_id  │
    │ lead_source │   │ paddle_num  │   │ project_num │
    │ qual_score  │   │ deposit_amt │   │ asset_count │
    │ assigned_to │   │ is_approved │   │ revenue_est │
    │ status      │   │ credit_limit│   │ status      │
    │ notes       │   │ notes       │   │ notes       │
    │             │   │             │   │             │
    │ ❌ name     │   │ ❌ name     │   │ ✅ No dup   │
    │ ❌ email    │   │ ❌ email    │   │    identity │
    │ ❌ phone    │   │ ❌ phone    │   │    fields   │
    └─────────────┘   └─────────────┘   └─────────────┘
       (Legacy)          (Legacy)          (Correct)


Notes:
• Customers/Suppliers = Core Party tables
• party_links = Connects module records to Party
• Source tables (leads, buyer_accounts, etc.) = Module-specific metadata only
• Phase 4 will clean up duplicate fields in legacy tables
```

---

## Queries Enabled by Party System

### Query 1: Complete Customer Profile

```sql
-- Get unified Party view with all linked records

SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  c.entity_type,
  json_agg(
    json_build_object(
      'source_type', pl.source_type,
      'source_id', pl.source_id,
      'linked_at', pl.linked_at
    )
  ) AS linked_records
FROM customers c
LEFT JOIN party_links pl ON pl.party_id = c.id AND pl.party_type = 'customer'
WHERE c.id = 'ghi-789'
  AND c.company_id = 'tenant-123'
GROUP BY c.id;

-- Result:
{
  "id": "ghi-789",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "entity_type": ["prospect", "sales_customer", "auction_buyer", "itad_client"],
  "linked_records": [
    {"source_type": "lead", "source_id": "abc-123", "linked_at": "2024-01-15"},
    {"source_type": "buyer_account", "source_id": "def-456", "linked_at": "2024-04-20"},
    {"source_type": "itad_project", "source_id": "jkl-012", "linked_at": "2024-06-10"}
  ]
}
```

### Query 2: Top Multi-Channel Customers

```sql
-- Find customers active in 3+ channels (high-value)

SELECT
  c.id,
  c.name,
  c.entity_type,
  array_length(c.entity_type, 1) AS channel_count,
  (
    SELECT SUM(total_amount)
    FROM sales_invoices si
    WHERE si.customer_id = c.id
  ) AS total_sales,
  (
    SELECT SUM(hammer_price)
    FROM auction_settlements ase
    JOIN buyer_accounts ba ON ba.id = ase.buyer_account_id
    JOIN party_links pl ON pl.source_id = ba.id AND pl.source_type = 'buyer_account'
    WHERE pl.party_id = c.id
  ) AS total_auction_purchases,
  (
    SELECT SUM(final_revenue)
    FROM itad_projects ip
    WHERE ip.customer_id = c.id
  ) AS total_itad_revenue
FROM customers c
WHERE c.company_id = 'tenant-123'
  AND array_length(c.entity_type, 1) >= 3
ORDER BY
  (total_sales + total_auction_purchases + total_itad_revenue) DESC
LIMIT 10;

-- Previously IMPOSSIBLE without Party system!
```

### Query 3: Find Duplicate Identities

```sql
-- Detect potential duplicate Parties (same email, different records)

SELECT
  email,
  COUNT(*) AS duplicate_count,
  array_agg(id) AS party_ids,
  array_agg(name) AS names
FROM customers
WHERE company_id = 'tenant-123'
  AND email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Use this to identify records to merge via party_links
```

---

## Migration Path (Phase 3 → Phase 4)

```
┌────────────────────────────────────────────────────────────────┐
│                    MIGRATION TIMELINE                          │
└────────────────────────────────────────────────────────────────┘

PHASE 3 (Now - 3 weeks):
├─ Create party_links table
├─ Seed entity_types
├─ Create partyService.ts
├─ Build admin UI for manual linking
└─ Documentation + guardrails

Result: Foundation ready, optional linking

▼

PHASE 3.5 (1 month validation):
├─ Admins manually link ~50-100 records
├─ Test unified Party view
├─ Gather feedback
└─ Prove the concept works

▼

PHASE 4A (2 months):
├─ Migrate leads → customers
│  • INSERT INTO customers SELECT * FROM leads WHERE ...
│  • INSERT INTO crm_prospect_metadata SELECT * FROM leads WHERE ...
│  • INSERT INTO party_links ...
│  • DROP TABLE leads
├─ Update opportunities: DROP COLUMN lead_id
└─ Update CRM UI to use customers directly

▼

PHASE 4B (2 months):
├─ Clean up buyer_accounts
│  • Remove duplicate fields (name, email, phone)
│  • Enforce party_links requirement
│  • Update Auction UI to JOIN customers
└─ Test auction flow end-to-end

▼

PHASE 4C (Ongoing):
├─ Auto-linking background job
│  • Suggest matches by email
│  • Admin reviews + approves
├─ Unified reporting dashboards
└─ Make party_links mandatory for new engines

Result: Complete Party unification
```

---

## Summary

**Before (Current):**
- Identity data scattered across 3+ tables
- Duplicate records for same person
- No unified customer view
- Each new engine creates new identity table

**After (Phase 3):**
- Single source of truth (customers/suppliers)
- party_links connects everything
- Complete customer journey visibility
- Future engines reuse same pattern

**Investment:** 3 weeks
**Risk:** Low (additive changes only)
**Value:** High (prevents identity fragmentation)

---

**Next Step:** Implement party_links migration

**See Also:**
- `PARTY_SYSTEM_ANALYSIS_AND_PLAN.md` - Technical details
- `PARTY_SYSTEM_RECOMMENDATIONS.md` - Business case
