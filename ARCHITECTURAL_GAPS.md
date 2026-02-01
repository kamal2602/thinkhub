# ARCHITECTURAL GAPS

**Status:** Current State Analysis & Remediation Plan
**Version:** 1.0
**Last Updated:** February 1, 2026
**Priority:** HIGH (Address Before Building More Features)

---

## Purpose

This document identifies where the current implementation violates the architectural contracts defined in CORE_CONTRACT.md, ENGINES.md, PARTY_UNIFICATION.md, and WORKSPACES.md.

**This is NOT a criticism** - it's an honest assessment to guide remediation. Many violations occurred because these contracts didn't exist when the features were built.

---

## Executive Summary

### Overall Assessment: 🟡 MOSTLY COMPLIANT

**Good News:**
- Core entities (Asset, Transaction, Accounting) are well-designed
- Engine toggle infrastructure is solid
- Most engines respect boundaries
- Security (RLS) is properly implemented
- Services layer follows good patterns

**Issues Found:**
- 3 Critical violations (identity duplication)
- 5 Minor violations (schema cleanups needed)
- 7 Missing implementations (tables exist, UI pending)
- Navigation needs workspace refactoring

**Risk Level:** MEDIUM
- Can operate safely as-is
- But continued development without remediation will compound issues
- Remediation is non-breaking and low-risk

---

## Critical Violations (MUST FIX)

### 1. CRM Engine: Identity Duplication

**Violation:** `leads` table stores contact information, bypassing Party system

**Contract Violated:** CORE_CONTRACT.md Section 1.2 (Party Ownership)

**Current Schema:**
```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  company_id uuid,
  lead_name text NOT NULL,           -- ❌ Duplicates customers.name
  company_name text,
  contact_email text,                 -- ❌ Duplicates customers.email
  contact_phone text,                 -- ❌ Duplicates customers.phone
  lead_source text,
  status text,
  qualification_score int,
  assigned_to uuid,
  notes text
);
```

**Impact:**
- Lead "John Doe <john@example.com>" exists separately from Customer "John Doe"
- When lead becomes customer, data is duplicated
- Email update in one place doesn't update the other
- Impossible to see complete customer journey
- Reporting can't aggregate across lead → customer lifecycle

**Evidence:**
- Migration: `20260201013512_create_crm_tables_v2.sql` (lines 18-32)
- No foreign key to `customers` table
- Stores identity fields directly

**Correct Architecture:**
```sql
-- Remove leads table
DROP TABLE leads;

-- Use customers with entity_type
INSERT INTO customers (name, email, phone, entity_type)
VALUES ('John Doe', 'john@example.com', '555-1234', 'prospect');

-- CRM metadata in related table
CREATE TABLE crm_prospect_metadata (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),  -- Links to Core
  lead_source text,
  qualification_score int,
  assigned_to uuid,
  status text,
  notes text
);
```

**Remediation Steps:**
1. Create `crm_prospect_metadata` table
2. Migrate data from `leads` to `customers` + `crm_prospect_metadata`
3. Update `opportunities` to remove `lead_id` column
4. Archive `leads` table
5. Update UI to use `customers` instead of `leads`
6. After 1 week, drop `leads` table

**Risk:** LOW
- Migration is data-preserving
- UI change is straightforward (same CRUD operations)
- Can be rolled back if issues found

**Priority:** P1 (Next Sprint)

---

### 2. CRM Engine: Opportunities Double Reference

**Violation:** `opportunities` has both `lead_id` and `customer_id`, unclear ownership

**Contract Violated:** CORE_CONTRACT.md Section 1.2 (Party as Single Source)

**Current Schema:**
```sql
CREATE TABLE opportunities (
  id uuid PRIMARY KEY,
  company_id uuid,
  lead_id uuid REFERENCES leads(id),        -- ❌ Should not exist
  customer_id uuid REFERENCES customers(id), -- ✅ Correct
  opportunity_name text,
  value_estimate numeric,
  stage text
);
```

**Impact:**
- Opportunity can reference lead OR customer (which is authoritative?)
- Reporting must join to both tables
- Conversion from lead → customer leaves lead_id dangling
- Violates single source of truth

**Evidence:**
- Migration: `20260201013512_create_crm_tables_v2.sql` (lines 38-39)
- Both foreign keys present

**Correct Architecture:**
```sql
-- Remove lead_id entirely
ALTER TABLE opportunities DROP COLUMN lead_id;

-- Always use customer_id (prospects are customers with entity_type = 'prospect')
```

**Remediation Steps:**
1. Migrate opportunities with lead_id to use customer_id
   ```sql
   UPDATE opportunities o
   SET customer_id = c.id
   FROM leads l
   JOIN customers c ON c.email = l.contact_email
   WHERE o.lead_id = l.id AND o.customer_id IS NULL;
   ```
2. Drop lead_id column
3. Update UI (should already be using customer relationship)

**Risk:** LOW
- Simple column removal
- No UI impact if using customer_id already

**Priority:** P1 (Same Sprint as #1)

---

### 3. Website Engine: Shopping Cart Identity

**Violation:** `shopping_carts` uses email string instead of customer_id

**Contract Violated:** CORE_CONTRACT.md Section 1.2 (Party Linking)

**Current Schema:**
```sql
CREATE TABLE shopping_carts (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  customer_email text,    -- ❌ Should link to customer_id
  items jsonb,
  expires_at timestamptz
);
```

**Impact:**
- No link to customer identity
- Can't track customer shopping history
- Email changes break cart association
- Duplicate carts for same customer

**Evidence:**
- Migration: `20260201013555_create_recycling_and_website_tables.sql` (line 63)
- Only email field, no foreign key

**Correct Architecture:**
```sql
-- Add customer_id link
ALTER TABLE shopping_carts
  ADD COLUMN customer_id uuid REFERENCES customers(id);

-- For anonymous users, customer_id is NULL (guest checkout)
-- For authenticated users, customer_id is set
```

**Remediation Steps:**
1. Add `customer_id` column
2. Migrate existing carts where possible
   ```sql
   UPDATE shopping_carts sc
   SET customer_id = c.id
   FROM customers c
   WHERE sc.customer_email = c.email;
   ```
3. Update UI to set customer_id for authenticated sessions
4. Keep email for guest checkout (customer_id = NULL)

**Risk:** LOW
- Backward compatible (keeps email for anonymous)
- UI change minimal

**Priority:** P2 (Following Sprint)

---

## Minor Violations (SHOULD FIX)

### 4. Inconsistent Entity Type Usage

**Issue:** `entity_type` field exists but not consistently used

**Contract Violated:** CORE_CONTRACT.md Section 1.2 (Classification Pattern)

**Current State:**
- `customers.entity_type` exists with default `'sales_customer'`
- `suppliers.entity_type` exists with default `'purchase_vendor'`
- But not all code respects these classifications
- No views or helpers for engine-specific filtering

**Impact:**
- Engines query `customers` without filtering by type
- Risk of showing ITAD clients in sales customer list
- No semantic separation of Party roles

**Correct Usage:**
```sql
-- Create views for engine filtering
CREATE VIEW sales_customers AS
SELECT * FROM customers
WHERE entity_type IN ('sales_customer', 'reseller');

CREATE VIEW itad_clients AS
SELECT * FROM customers
WHERE entity_type = 'itad_client';

CREATE VIEW crm_prospects AS
SELECT * FROM customers
WHERE entity_type = 'prospect';
```

**Remediation Steps:**
1. Create classification views
2. Update services to use views for filtering
3. Add UI filters for entity_type
4. Document allowed entity_type values

**Risk:** VERY LOW
- Additive change
- Improves semantic clarity

**Priority:** P2

---

### 5. Generic project_id Foreign Key

**Issue:** `assets.project_id` is uuid without FK constraint

**Contract Violated:** Best practices (referential integrity)

**Current Schema:**
```sql
ALTER TABLE assets ADD COLUMN project_id uuid;
-- No FK constraint, could point to itad_projects or anything
```

**Impact:**
- No referential integrity (project could be deleted, FK remains)
- Unclear what project_id references
- Can't CASCADE delete

**Trade-offs:**
- **Pro Generic:** Allows multiple engines to use project_id
- **Con Integrity:** No database-level validation

**Options:**

**Option A: Keep Generic (Current)**
```sql
-- Accept the lack of FK
-- Rely on application-level validation
-- Document that project_id can reference multiple table types
```

**Option B: Use Polymorphic FK**
```sql
-- Add project_type discriminator
ALTER TABLE assets
  ADD COLUMN project_type text,
  ADD CONSTRAINT project_reference CHECK (
    (project_id IS NULL AND project_type IS NULL) OR
    (project_id IS NOT NULL AND project_type IS NOT NULL)
  );

-- Application enforces: project_type = 'itad_project' → itad_projects.id
```

**Option C: Separate Columns**
```sql
-- Explicit columns per engine
ALTER TABLE assets
  ADD COLUMN itad_project_id uuid REFERENCES itad_projects(id),
  ADD COLUMN consignment_agreement_id uuid,
  ADD CONSTRAINT one_project_only CHECK (
    (itad_project_id IS NOT NULL)::int +
    (consignment_agreement_id IS NOT NULL)::int <= 1
  );
```

**Recommendation:** Keep Option A (Current) for flexibility
- Document that project_id is application-enforced
- Add migration note about multi-table reference
- Consider Option C if more project types added

**Priority:** P3 (Documentation Only)

---

### 6. Duplicate Component Tracking Tables

**Issue:** Multiple migrations created component tables, potential duplicates

**Contract Violated:** DRY principle

**Evidence:**
- `20251104000000_add_component_tracking.sql`
- `20251104062651_20251104_component_tracking_with_serials.sql`
- `20260131000407_20251104062651_component_tracking_with_serials.sql`

Multiple migrations with `CREATE TABLE IF NOT EXISTS` for same tables:
- `asset_components`
- `harvested_components_inventory`
- `component_transactions`

**Impact:**
- Migration confusion (which is authoritative?)
- Risk of schema drift if different definitions
- Cluttered migration history

**Remediation:**
1. Audit migrations to confirm schema consistency
2. Add comment to later migrations: "Duplicate of earlier migration, retained for compatibility"
3. In next major version, consolidate migrations

**Risk:** VERY LOW (IF NOT EXISTS prevents actual duplication)

**Priority:** P4 (Cleanup Task)

---

### 7. Unused/Duplicate Import Intelligence Tables

**Issue:** Multiple similar import intelligence tables

**Tables:**
- `import_field_mappings`
- `import_intelligence_rules`
- `field_aliases`
- `model_aliases`
- `product_type_aliases`

**Question:** Are all these needed or is there overlap?

**Recommendation:**
1. Audit which tables are actively used
2. Document purpose of each
3. Consolidate if overlapping
4. Archive unused tables

**Priority:** P4 (Future Cleanup)

---

### 8. Testing Tables Duplication

**Issue:** `test_result_options` created multiple times

**Evidence:**
- `20251104120000_create_test_result_options.sql`
- `20251104124657_20251104120000_create_test_result_options.sql`

**Impact:** Migration history clutter

**Remediation:** Document which is canonical

**Priority:** P5 (Non-Critical)

---

## Missing Implementations (UI Needed)

### 9. CRM Engine: No UI Components

**Status:** 🚧 Database schema exists, UI not implemented

**Tables Exist:**
- `leads` (will be migrated to customers)
- `opportunities`
- `activities`
- `quotes`

**Missing UI:**
- Prospects list (CRM workspace)
- Opportunities pipeline
- Activities timeline
- Quotes management

**Priority:** Feature backlog (after remediation)

---

### 10. Website Engine: No UI Components

**Status:** 🚧 Database schema exists, UI not implemented

**Tables Exist:**
- `website_settings`
- `shopping_carts`
- `documents` (partially used)

**Missing UI:**
- Website settings configuration
- Product publishing workflow
- Shopping cart management
- Public storefront (separate app)

**Priority:** Feature backlog

---

### 11. Recycling Engine: Partial UI

**Status:** 🟡 Some UI exists, more needed

**Existing UI:**
- Component harvesting ✅
- Harvested inventory ✅
- Component sales ✅

**Missing UI:**
- Recycler shipments
- Material tracking dashboard
- Commodity prices management

**Priority:** Feature backlog

---

## Workspace Gaps (Navigation Needs Refactoring)

### 12. Flat Navigation Structure

**Issue:** Current AppBar has flat list of 30+ menu items

**Contract Violated:** WORKSPACES.md (Workspace-based navigation)

**Current Structure:**
```
AppBar
├─ Dashboard
├─ Companies
├─ Users
├─ Purchases
├─ Receiving
├─ Processing
├─ Inventory (7 sub-items!)
├─ Sales
├─ Customers
├─ Suppliers
├─ Accounting
├─ ITAD (8 sub-items!)
├─ Auctions
├─ Reports
└─ Settings (15 sub-items!)
```

**Impact:**
- Overwhelming for new users
- Hard to find features
- No business context grouping
- Doesn't respect engine toggles well

**Correct Structure:** See WORKSPACES.md

**Remediation:**
1. Create workspace switcher component
2. Group features into workspaces
3. Implement workspace routing
4. Update AppBar to use workspaces
5. Add workspace context

**Priority:** P2 (UI Refactoring)

---

### 13. Engine Toggle Enforcement

**Issue:** UI doesn't consistently check engine toggles

**Contract Violated:** ENGINES.md (Toggle Behavior)

**Current State:**
- Some components check toggles
- Others show features regardless
- Inconsistent enforcement

**Correct Behavior:**
```typescript
// Every engine component should check
const { data: company } = await supabase
  .from('companies')
  .select('itad_enabled')
  .eq('id', companyId)
  .single();

if (!company.itad_enabled) {
  return <EngineDisabledMessage engine="ITAD" />;
}
```

**Remediation:**
1. Create `useEngineEnabled(engine)` hook
2. Wrap engine components with toggle check
3. Hide navigation items for disabled engines
4. Show "Enable this engine" prompt

**Priority:** P2

---

## Data Quality Gaps

### 14. Missing Data Validation

**Issue:** Some fields lack constraints

**Examples:**
- Email format validation (should be enforced at DB level)
- Phone number formats
- Postal code formats
- URL formats

**Recommendation:**
```sql
-- Add check constraints
ALTER TABLE customers
  ADD CONSTRAINT customers_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE customers
  ADD CONSTRAINT customers_phone_format
  CHECK (phone ~ '^\+?[0-9\s\-\(\)]+$');
```

**Priority:** P3 (Nice to Have)

---

### 15. Missing Unique Constraints

**Issue:** Some uniqueness not enforced

**Examples:**
- Customer email should be unique per company
- Supplier email should be unique per company
- Serial numbers unique per company (already done ✅)

**Recommendation:**
```sql
-- Prevent duplicate customers by email
CREATE UNIQUE INDEX idx_customers_company_email
  ON customers(company_id, LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX idx_suppliers_company_email
  ON suppliers(company_id, LOWER(email))
  WHERE email IS NOT NULL;
```

**Priority:** P2 (Data Integrity)

---

## Performance Gaps

### 16. Missing Indexes

**Issue:** Some foreign keys lack indexes

**Recommendation:** Audit all foreign keys and ensure indexes exist

**Example Check:**
```sql
-- Find foreign keys without indexes
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

**Priority:** P3 (Performance)

---

## Documentation Gaps

### 17. Migration Documentation

**Issue:** Some migrations lack detailed comments

**Recommendation:**
- All migrations should have markdown-style comments
- Explain WHY not just WHAT
- Document backward compatibility approach
- List affected tables and columns

**Priority:** P4 (Documentation Quality)

---

### 18. Service Layer Documentation

**Issue:** Services lack JSDoc comments

**Recommendation:**
```typescript
/**
 * Find or create a party (customer/supplier) with deduplication.
 *
 * This enforces the Party contract: one identity per email per company.
 *
 * @param companyId - Company UUID
 * @param email - Party email (used for deduplication)
 * @param name - Party name
 * @param partyType - 'customer' or 'supplier'
 * @param entityType - Classification (e.g., 'prospect', 'sales_customer')
 * @returns Party record (existing or newly created)
 * @throws If email format invalid or database error
 */
async function findOrCreateParty(
  companyId: string,
  email: string,
  name: string,
  partyType: 'customer' | 'supplier',
  entityType: string
): Promise<Party> {
  // ... implementation
}
```

**Priority:** P4 (Code Quality)

---

## Security Gaps

### 19. RLS Policy Audit

**Issue:** Need to verify all tables have RLS enabled

**Status:** ✅ Appears complete (all migrations include RLS)

**Recommendation:** Periodic audit
```sql
-- Find tables without RLS
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = pg_tables.tablename
  );
```

**Priority:** P3 (Security Audit)

---

### 20. Sensitive Data Logging

**Issue:** Ensure no sensitive data (emails, phone) in logs

**Recommendation:**
- Audit error handling to mask PII
- Review Supabase logs configuration
- Add data classification policy

**Priority:** P3 (Security Best Practice)

---

## Summary: Remediation Priority

### P1: Critical (Next Sprint) - Identity Fixes
1. ✅ **CRM Leads Migration** - Migrate to customers + metadata
2. ✅ **Opportunities Cleanup** - Remove lead_id column
3. ⏳ **Party Unification** - Implement findOrCreateParty() service

### P2: Important (Following Sprint) - UX & Integrity
4. ⏳ **Shopping Cart Fix** - Add customer_id link
5. ⏳ **Entity Type Views** - Create classification views
6. ⏳ **Workspace Navigation** - Implement workspace switcher
7. ⏳ **Engine Toggle Enforcement** - useEngineEnabled() hook
8. ⏳ **Email Uniqueness** - Add unique constraints

### P3: Nice to Have (Backlog) - Quality
9. ⏳ **Data Validation** - Add check constraints
10. ⏳ **Performance Audit** - Add missing indexes
11. ⏳ **Security Audit** - RLS verification
12. ⏳ **Documentation** - Generic FK explanation

### P4: Future - Cleanup
13. ⏳ **Migration Consolidation** - Document duplicates
14. ⏳ **Import Intelligence Audit** - Consolidate tables
15. ⏳ **JSDoc Comments** - Service layer documentation

### P5: Non-Critical
16. ⏳ **Migration History Cleanup** - Cosmetic improvements

---

## Migration Risk Assessment

### Overall Risk: 🟢 LOW

**Why Low Risk:**
1. All migrations are data-preserving
2. Changes are additive (not destructive)
3. Rollback strategies exist
4. Can be done incrementally
5. No production downtime required
6. Backward compatibility maintained

### Migration Approach:

**Phase 1: Non-Breaking Changes (Week 1)**
- Add new tables (crm_prospect_metadata)
- Add new columns (shopping_carts.customer_id)
- Add views (classification helpers)
- Deploy to production (no impact)

**Phase 2: Data Migration (Week 2)**
- Migrate leads → customers + metadata
- Link shopping carts to customers
- Verify data integrity
- Run in production (read-only queries to test)

**Phase 3: Schema Cleanup (Week 3)**
- Remove old columns (opportunities.lead_id)
- Archive old tables (leads → leads_archived)
- Update UI to use new structure
- Deploy incrementally

**Phase 4: Verification (Week 4)**
- Monitor for issues
- Fix edge cases
- Drop archived tables (after confirmation)
- Update documentation

---

## Testing Strategy

### For Each Remediation:

1. **Unit Tests**
   - Test new service functions
   - Test data migration scripts
   - Test edge cases

2. **Integration Tests**
   - Test UI with new data structure
   - Test cross-engine flows
   - Test reporting queries

3. **Manual QA**
   - Test lead → customer conversion
   - Test shopping cart linking
   - Test workspace navigation

4. **Production Verification**
   - Run migration on copy of prod data
   - Verify data integrity
   - Check performance impact

---

## Success Criteria

### Remediation Complete When:

- ✅ No identity duplication (one Party per email)
- ✅ All opportunities reference customer_id only
- ✅ Shopping carts link to customers
- ✅ Entity types consistently used
- ✅ Workspace navigation implemented
- ✅ Engine toggles enforced everywhere
- ✅ Email uniqueness constraints added
- ✅ Documentation updated
- ✅ Team trained on new patterns

### Metrics:

**Before:**
- 3 critical violations
- 5 minor violations
- 7 missing implementations

**Target:**
- 0 critical violations
- 0 minor violations
- Missing implementations in backlog (not violations)

---

## Long-Term Architectural Health

### Preventing Future Violations:

1. **Code Review Checklist**
   - Check for identity duplication
   - Verify engine toggle respect
   - Ensure Party linking
   - Confirm workspace assignment

2. **Linting Rules**
   - Flag tables with `email` columns (except Party)
   - Flag tables with `phone` columns (except Party)
   - Require JSDoc on service methods

3. **Architecture Review**
   - Monthly: Review new tables for contract compliance
   - Quarterly: Audit data quality
   - Annually: Full architecture review

4. **Team Training**
   - Onboarding: Review CORE_CONTRACT.md
   - New features: Reference ENGINES.md
   - PRs: Check ARCHITECTURAL_GAPS.md

---

## Conclusion

The current system is **solid and functional** with **minor architectural gaps** that can be remediated safely and incrementally.

**The good outweighs the gaps:**
- ✅ Core entities well-designed
- ✅ Security properly implemented
- ✅ Most engines respect boundaries
- ✅ Service layer follows patterns

**The gaps are fixable:**
- 🔧 3 critical fixes (1-2 weeks)
- 🔧 5 minor fixes (1 week)
- 📋 7 backlog items (not urgent)

**With remediation, this platform has a solid foundation for infinite scaling.**

---

**End of Architectural Gaps Analysis**
