# Enterprise Readiness - Gap Analysis & Implementation Plan

**Date**: 2026-02-01
**Status**: Pre-Implementation Analysis

---

## CURRENT STATE ASSESSMENT

### ✅ Already Implemented

#### 1. Multi-Company Foundation
- ✅ `companies` table exists
- ✅ `user_company_access` table with role-based access
- ✅ Most core tables have `company_id` scoping
- ✅ RLS policies enforce company isolation
- ✅ Engine registry per company (`engines` table)

#### 2. Basic Role System
- ✅ `profiles.role` field (text: admin, manager, technician, sales)
- ✅ `user_company_access.role` field (enum: admin, manager, staff, viewer)
- ✅ `profiles.is_super_admin` flag for platform admins
- ⚠️ **Issue**: Two different role systems (profiles vs user_company_access)

#### 3. Partial Audit Trail
- ✅ `asset_history` - comprehensive asset change logging
- ✅ `bulk_import_logs` - import operation tracking
- ✅ `mapping_history` - field mapping changes
- ✅ Asset change triggers capture before/after values
- ❌ Missing: Generic audit for financial, party, order operations

#### 4. Inventory Locking (Basic)
- ✅ `inventory_items.locked_by_type` (auction, order, reservation)
- ✅ `inventory_items.locked_by_id`
- ✅ `inventory_items.locked_at`
- ✅ Functions: `lock_inventory_for_auction()`, `release_inventory_lock()`, `transfer_inventory_lock_to_order()`
- ❌ Missing: Expiration handling, lock monitoring, dead-lock detection

#### 5. Engine Isolation
- ✅ Engine toggles per company
- ✅ RLS policies check engine enablement
- ✅ Frontend guards for engine access

---

## GAP ANALYSIS BY PHASE

### 🔴 PHASE 1: Role & Permission Matrix - MAJOR GAPS

**Current State**: Simple role field, no granular permissions

**What's Missing**:
1. No `permissions` table defining available permissions
2. No `role_permissions` mapping for flexible RBAC
3. No resource-level permission scoping (engine.resource.action)
4. Inconsistent role definitions (profiles vs user_company_access)
5. No permission enforcement middleware
6. No audit trail for permission changes

**Risk Level**: HIGH - Current system allows broad access within roles

**Example Gaps**:
- All "managers" have same permissions across all engines
- Cannot restrict specific users from financial data
- Cannot create custom roles (e.g., "Warehouse Lead" with limited access)
- No way to grant temporary elevated permissions

---

### 🟡 PHASE 2: Multi-Entity Support - MODERATE GAPS

**Current State**: Company isolation mostly implemented

**What's Missing**:
1. Some tables missing `company_id`:
   - `cosmetic_grades` (shared? or company-specific?)
   - `functional_statuses` (shared? or company-specific?)
   - `warranty_types` (shared? or company-specific?)
   - `return_reasons` (shared? or company-specific?)
2. No company-level feature flags beyond engines
3. No inter-company transactions/transfers
4. No company hierarchy (parent/subsidiary)

**Risk Level**: MEDIUM - Data isolation works, but configuration sharing unclear

**Tables Needing Review**:
```sql
-- Need to determine: Global vs Company-specific
- cosmetic_grades
- functional_statuses
- processing_stages
- warranty_types
- return_reasons
- payment_terms
- lead_sources
- opportunity_stages
```

---

### 🔴 PHASE 3: Audit & Compliance - MAJOR GAPS

**Current State**: Asset history only, no generic audit system

**What's Missing**:
1. Generic `audit_logs` table for all entity changes
2. Financial transaction audit trail
3. Party (customer/supplier) change tracking
4. Order lifecycle audit
5. Lot creation/closure audit
6. User action audit (login, permission changes, exports)
7. Read-only audit viewer interface
8. Compliance reports (SOX, GDPR, etc.)
9. Retention policies for audit data

**Risk Level**: CRITICAL - Limited compliance evidence

**Must-Track Events**:
```
Financial:
- Journal entry creation/modification/void
- Invoice creation/modification/void
- Payment recording
- Refund processing

Inventory:
- Stock movements
- Lot creation/closure
- Asset status changes
- Component harvesting

Party:
- Customer/Supplier creation
- Contact information changes
- Payment term changes
- Credit limit changes

Orders:
- PO submission
- Receiving completion
- Sales order placement
- Order cancellation
```

---

### 🟢 PHASE 4: Inventory Locking - MINOR GAPS

**Current State**: Basic locking implemented

**What's Missing**:
1. Lock expiration/timeout handling
2. Dead-lock detection
3. Lock monitoring dashboard
4. Force-unlock capability for admins
5. Lock history/audit trail
6. Optimistic locking for concurrent updates

**Risk Level**: LOW - Basic protection exists, needs hardening

**Enhancement Needed**:
```sql
-- Add to inventory_items
ALTER TABLE inventory_items ADD COLUMN locked_until timestamptz;
ALTER TABLE inventory_items ADD COLUMN lock_reason text;

-- Create lock history
CREATE TABLE inventory_lock_history (
  id uuid PRIMARY KEY,
  inventory_item_id uuid,
  action text, -- 'locked', 'released', 'transferred', 'expired'
  locked_by_type text,
  locked_by_id uuid,
  performed_by uuid,
  timestamp timestamptz,
  reason text
);
```

---

### 🔴 PHASE 5: Performance Paths - MAJOR GAPS

**Current State**: Direct table queries, no optimization layer

**What's Missing**:
1. No materialized views for dashboards
2. No denormalized read models
3. No query result caching
4. Heavy joins in critical paths
5. No index optimization review
6. No query performance monitoring

**Risk Level**: HIGH - Will fail at scale (>10K assets, >1K daily transactions)

**Critical Queries to Optimize**:
```sql
Dashboard Queries:
- Total inventory value by status
- Available inventory count
- Open auction summary
- Open orders by status
- Lot profitability
- Top customers/suppliers
- Aging inventory

Search/Filter Queries:
- Asset search with filters (brand, model, grade, status)
- Customer search
- Inventory availability check
- Component pricing lookup
```

**Proposed Materialized Views**:
```sql
1. mv_inventory_summary
   - company_id, product_type_id, status, grade
   - count, total_cost, total_value, avg_age_days

2. mv_lot_profitability
   - lot_id, total_cost, total_revenue, profit, margin_pct, asset_count

3. mv_open_auctions
   - auction_id, lot_id, item_count, current_bid, reserve_price, ends_at

4. mv_open_orders
   - order_id, customer_id, status, total_amount, item_count, due_date

5. mv_customer_summary
   - customer_id, lifetime_value, order_count, last_order_date, avg_order_value
```

---

### 🟡 PHASE 6: Compliance Workflows - MODERATE GAPS

**Current State**: Basic status fields, no state machine

**What's Missing**:
1. No state transition validation
2. No required approvals for state changes
3. No workflow audit trail
4. No role-based workflow permissions
5. No automatic state timeouts/escalations

**Risk Level**: MEDIUM - Workflows exist but aren't enforced

**Workflows Needing State Machine**:
```
Asset Processing:
- Receiving → Inspection → Testing → Grading → Available
- Cannot skip testing for certain product types
- Manager approval required for direct-to-scrap

ITAD Compliance:
- Intake → Data Wipe → Certification → Disposition
- Cannot mark certified without wipe proof
- Must generate certificate before sale

Recycling:
- Asset → Disassembly → Component Harvest → Pricing → Available
- Must track environmental compliance
- Requires hazmat handling for certain types

Financial:
- Invoice Draft → Submitted → Approved → Posted → Paid
- Large invoices require dual approval
- Posted invoices cannot be edited
```

---

## RECOMMENDED IMPLEMENTATION PRIORITY

### Priority 1: CRITICAL (Do First) 🔴

**Phase 3: Audit & Compliance** (2-3 days)
- Generic audit_logs table
- Trigger-based audit for all critical tables
- Audit viewer UI
- **Justification**: Legal/compliance requirement, foundation for other features

**Phase 5: Performance (Critical Paths)** (2-3 days)
- Materialized views for dashboards
- Index optimization
- **Justification**: Prevents production issues at scale

### Priority 2: HIGH (Do Next) 🟠

**Phase 1: RBAC System** (3-4 days)
- Permissions table and role-permissions mapping
- Unify role systems (profiles vs user_company_access)
- Permission enforcement functions
- **Justification**: Security hardening, enables customer-specific access control

**Phase 4: Inventory Locking Hardening** (1-2 days)
- Lock expiration handling
- Lock monitoring
- Dead-lock detection
- **Justification**: Prevents double-sale issues in production

### Priority 3: MEDIUM (Can Wait) 🟡

**Phase 2: Multi-Entity Refinements** (1-2 days)
- Clarify shared vs company-specific master data
- Add company_id where needed
- **Justification**: Foundation works, this is cleanup

**Phase 6: Workflow State Machines** (2-3 days)
- State transition validation
- Approval workflows
- **Justification**: Improves UX and compliance, but not blocking

---

## IMPLEMENTATION ESTIMATES

| Phase | Priority | Est. Days | Risk if Skipped |
|-------|----------|-----------|-----------------|
| 3 - Audit & Compliance | P1 | 2-3 | CRITICAL - Legal exposure |
| 5 - Performance (Critical) | P1 | 2-3 | CRITICAL - Production failure |
| 1 - RBAC System | P2 | 3-4 | HIGH - Security gaps |
| 4 - Inventory Lock Hardening | P2 | 1-2 | HIGH - Double-sale risk |
| 2 - Multi-Entity Cleanup | P3 | 1-2 | LOW - Mostly works |
| 6 - Workflow State Machines | P3 | 2-3 | MEDIUM - UX/compliance |

**Total Estimated Time**: 11-17 days (2-3 weeks)

---

## PHASED ROLLOUT RECOMMENDATION

### Week 1: Foundation (P1 Items)
**Goal**: Production-safe audit and performance

1. Day 1-2: Generic audit system
   - audit_logs table
   - Trigger all critical tables
   - Basic audit viewer

2. Day 3-4: Performance critical path
   - Materialized views for dashboards
   - Index optimization
   - Refresh strategies

3. Day 5: Testing & validation
   - Performance benchmarks
   - Audit trail verification
   - Documentation

### Week 2: Security Hardening (P2 Items)
**Goal**: Enterprise-grade access control

1. Day 1-3: RBAC implementation
   - permissions + role_permissions tables
   - Unify role systems
   - Permission enforcement functions
   - RLS policy updates

2. Day 4-5: Inventory locking hardening
   - Expiration handling
   - Lock monitoring dashboard
   - Dead-lock detection
   - Force-unlock for admins

### Week 3: Polish & Optional Features (P3 Items)
**Goal**: Complete enterprise readiness

1. Day 1-2: Multi-entity cleanup
   - Review master data scoping
   - Add company_id where needed
   - Cross-company scenarios

2. Day 3-5: Workflow state machines
   - State transition validation
   - Approval workflows
   - Auto-escalations
   - Integration with audit system

---

## CRITICAL DECISIONS NEEDED

### Decision 1: Master Data Scoping
**Question**: Are these shared globally or company-specific?
- cosmetic_grades
- functional_statuses
- processing_stages
- warranty_types
- return_reasons
- payment_terms

**Options**:
A. **Global + Company Override**: Seed global defaults, companies can add their own
B. **Fully Company-Specific**: Each company manages entirely
C. **Hybrid**: Some global (cosmetic grades), some company (processing stages)

**Recommendation**: Option A - Global defaults with company customization

### Decision 2: Role System Unification
**Current**: profiles.role AND user_company_access.role exist

**Options**:
A. **Use profiles.role**: Single global role per user
B. **Use user_company_access.role**: Different role per company
C. **Unified RBAC**: Move to permissions system, deprecate both

**Recommendation**: Option C - Full RBAC migration

### Decision 3: Audit Retention
**Question**: How long to keep audit logs?

**Options**:
A. Forever (disk space grows)
B. Archive after 7 years (compliance standard)
C. Configurable per company

**Recommendation**: Option B - 7 year retention with archival strategy

### Decision 4: Performance Strategy
**Question**: Real-time vs Near-real-time dashboards?

**Options**:
A. **Real-time**: Live queries with caching
B. **Near-real-time**: Materialized views refreshed every 5-15 minutes
C. **Hybrid**: Critical data real-time, analytics near-real-time

**Recommendation**: Option C - Hybrid approach

---

## EXIT CONDITIONS (DEFINITION OF DONE)

### Phase 1: RBAC
- [ ] permissions table with 50+ defined permissions
- [ ] role_permissions mapping functional
- [ ] All RLS policies check permissions
- [ ] Permission denied shows proper error message
- [ ] Admin UI for role management

### Phase 2: Multi-Entity
- [ ] All 100+ tables have company_id or are documented as global
- [ ] RLS policies enforce company isolation
- [ ] Cross-company access explicitly granted/logged
- [ ] Company switching works in UI

### Phase 3: Audit & Compliance
- [ ] audit_logs captures all critical operations
- [ ] Audit viewer shows full history for any entity
- [ ] Audit export for compliance reporting
- [ ] 100% test coverage for audit triggers
- [ ] Performance: <50ms overhead for audited operations

### Phase 4: Inventory Locking
- [ ] Locks expire after configured timeout
- [ ] Dead-lock detection prevents infinite locks
- [ ] Admin dashboard shows all active locks
- [ ] Force-unlock requires approval + reason
- [ ] Lock history retained in audit

### Phase 5: Performance
- [ ] Dashboard loads <2s with 50K+ assets
- [ ] Materialized views refresh <5 minutes
- [ ] All list views use pagination
- [ ] Query plans reviewed and optimized
- [ ] Performance regression tests in CI

### Phase 6: Compliance Workflows
- [ ] Invalid state transitions are blocked
- [ ] Approval workflows functional
- [ ] State changes logged in audit
- [ ] Timeout/escalation automation works
- [ ] Workflow documentation complete

---

## RECOMMENDATIONS SUMMARY

**Proceed with Implementation**: YES, with phased approach

**Start with**:
1. Generic audit system (Phase 3)
2. Performance optimization (Phase 5)

**Key Success Factors**:
- Make decisions on master data scoping (Decision 1)
- Plan RBAC migration path (Decision 2)
- Set up performance monitoring before materialized views
- Include rollback plan for each phase

**Risk Mitigation**:
- Deploy to staging first with production-scale data
- Run performance benchmarks before/after
- Keep old systems parallel during RBAC migration
- Document breaking changes for API consumers

**Timeline**: 2-3 weeks for full implementation

---

## NEXT STEPS

1. **Review & Approve** this analysis
2. **Answer critical decisions** (1-4 above)
3. **Begin Phase 1**: Audit system implementation
4. **Parallel work**: Performance baseline measurements
5. **Weekly check-ins** to validate progress

Would you like to proceed with implementation based on this plan?
