# ARCHITECTURAL DOCUMENTATION

**Status:** Complete Foundation Documents
**Version:** 1.0
**Created:** February 1, 2026
**Purpose:** Lock architectural contracts before scaling

---

## Overview

This collection of documents establishes the **architectural constitution** of the platform. They define inviolable boundaries, ownership contracts, and extension patterns that prevent technical debt, identity fragmentation, and data duplication as the system scales.

**These are not optional guidelines - they are non-negotiable contracts.**

---

## The Five Documents

### 1. [CORE_CONTRACT.md](./CORE_CONTRACT.md) - The Constitution

**Purpose:** Define what Core owns and what Engines cannot redefine

**Key Concepts:**
- Core owns: Company, Party, Asset, Transaction, Accounting, State
- Engines: Borrow identity, extend assets, trigger transactions
- Explicit prohibitions (no duplicate identity tables)
- Extension patterns (JSONB metadata, related tables)

**Critical Rules:**
```
If Core owns it → Engines cannot redefine it
If Engines need it → Core must provide it
Identity duplication → FORBIDDEN
Financial bypass → FORBIDDEN
Asset duplication → FORBIDDEN
```

**Read This If:**
- Adding a new engine
- Creating any table with email/phone fields
- Storing financial data
- Tracking assets or components
- Implementing any business entity

---

### 2. [ENGINES.md](./ENGINES.md) - The Feature Registry

**Purpose:** Map every feature to exactly one engine and define engine boundaries

**Engines Defined:**
1. **Reseller** (Base) - Buy, refurbish, sell IT hardware
2. **ITAD** - IT asset disposition services (data sanitization, compliance)
3. **Recycling** - Component harvesting and material recovery
4. **CRM** - Sales pipeline and lead management
5. **Website** - eCommerce storefront
6. **Auction** - Auction platform integration
7. **Accounting** - Financial management and GL

**Key Concepts:**
- Engine dependencies (who depends on whom)
- Feature ownership (one feature = one engine)
- Database table ownership
- Engine toggle behavior
- Extension guidelines

**Read This If:**
- Building a new feature (which engine owns it?)
- Enabling/disabling engines
- Understanding feature dependencies
- Planning engine extensions

---

### 3. [PARTY_UNIFICATION.md](./PARTY_UNIFICATION.md) - The Identity Solution

**Purpose:** Prevent identity fragmentation by unifying all business relationships under Party

**The Problem:**
- CRM creates `leads` with contact info
- Auction creates `buyer_accounts`
- Website uses email strings
- Result: Same person in 5 tables, no single source of truth

**The Solution:**
- **Party = Single Identity, Multiple Roles**
- One person, one email, one Party record
- Roles tracked via `entity_type` and `roles` jsonb
- Engine metadata in related tables (not duplicate identity)

**Key Concepts:**
- Party as abstraction (customers + suppliers)
- Entity type classification (prospect, sales_customer, itad_client, etc.)
- Multi-role support (one Party, many contexts)
- Migration strategy (leads → customers + metadata)

**Read This If:**
- Adding any business relationship (customer, vendor, contact)
- Storing contact information (email, phone, address)
- Converting leads to customers
- Reporting across multiple channels

---

### 4. [WORKSPACES.md](./WORKSPACES.md) - The Navigation Blueprint

**Purpose:** Organize UI into business-context workspaces, not flat menus

**Workspaces Defined:**
1. **Operations** - Daily workflow (purchasing, processing, inventory)
2. **Sales** - Revenue generation (invoices, customers)
3. **ITAD** - Service delivery (projects, certificates, settlements)
4. **Recycling** - Material recovery (harvesting, shipments)
5. **Auctions** - Auction management (lots, bids, settlements)
6. **CRM** - Sales pipeline (prospects, opportunities, activities)
7. **Website** - Storefront (catalog, orders, settings)
8. **Finance** - Accounting (GL, A/R, A/P, reports)
9. **Reports** - Business intelligence (analytics, dashboards)
10. **Admin** - System configuration (users, settings, master data)

**Key Concepts:**
- Workspace-based navigation (not flat menus)
- Engine-driven visibility (show only enabled engines)
- Role-appropriate access (hide what users don't need)
- Progressive disclosure (reveal complexity gradually)

**Read This If:**
- Adding new UI screens
- Refactoring navigation
- Implementing role-based access
- Organizing features by business context

---

### 5. [ARCHITECTURAL_GAPS.md](./ARCHITECTURAL_GAPS.md) - The Honest Assessment

**Purpose:** Identify where current implementation violates contracts and plan remediation

**Assessment:** 🟡 MOSTLY COMPLIANT

**Critical Violations (3):**
1. CRM `leads` table duplicates identity (should use `customers`)
2. `opportunities` has both `lead_id` and `customer_id` (should only have `customer_id`)
3. `shopping_carts` uses email string (should link to `customer_id`)

**Minor Violations (5):**
4. Inconsistent entity_type usage
5. Generic project_id lacks FK constraint
6. Duplicate component tracking migrations
7. Unused import intelligence tables
8. Testing tables duplication

**Missing Implementations (7):**
- CRM UI (tables exist, no components)
- Website UI (tables exist, no components)
- Recycling UI (partial)
- Workspace navigation refactor needed

**Risk:** 🟢 LOW
- All remediation is data-preserving
- Changes are additive, not destructive
- Can be done incrementally
- No downtime required

**Read This If:**
- Planning next sprint (what to fix first)
- Assessing system health
- Understanding technical debt
- Reviewing remediation priorities

---

## How to Use These Documents

### For New Developers:

**Day 1: Onboarding**
1. Read CORE_CONTRACT.md (understand what you can't do)
2. Skim ENGINES.md (see what engines exist)
3. Review ARCHITECTURAL_GAPS.md (understand current state)

**Week 1: First Feature**
1. Check ENGINES.md (which engine owns this feature?)
2. Reference CORE_CONTRACT.md (am I violating boundaries?)
3. Check PARTY_UNIFICATION.md (am I creating identity correctly?)
4. Reference WORKSPACES.md (where does this UI go?)

### For Code Reviews:

**Review Checklist:**
- [ ] Does this table have email/phone fields? (If yes, should use Party)
- [ ] Does this create a new identity table? (FORBIDDEN)
- [ ] Does this store financial data outside Core? (FORBIDDEN)
- [ ] Does this respect engine toggles?
- [ ] Which engine owns this feature? (Check ENGINES.md)
- [ ] Which workspace does this UI belong to? (Check WORKSPACES.md)
- [ ] Does this violate any CORE_CONTRACT rules?

### For Architecture Decisions:

**Decision Framework:**
1. Check CORE_CONTRACT.md - Does Core already own this?
2. Check ENGINES.md - Which engine should own this?
3. Check PARTY_UNIFICATION.md - Does this involve identity?
4. Check WORKSPACES.md - Where does the UI belong?
5. Update ARCHITECTURAL_GAPS.md if violation introduced

### For Sprint Planning:

**Priority Framework:**
1. **P1 Critical:** Identity violations (PARTY_UNIFICATION.md)
2. **P2 Important:** UX and integrity issues (ARCHITECTURAL_GAPS.md)
3. **P3 Nice to Have:** Quality improvements (ARCHITECTURAL_GAPS.md)
4. **P4 Future:** Cleanup tasks (ARCHITECTURAL_GAPS.md)

---

## Document Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE_CONTRACT.md                          │
│                   (The Constitution)                         │
│  • Defines Core boundaries                                   │
│  • Establishes extension patterns                            │
│  • Lists explicit prohibitions                               │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           │                           │
┌──────────▼──────────┐    ┌──────────▼───────────┐
│    ENGINES.md       │    │ PARTY_UNIFICATION.md │
│  (Feature Map)      │    │  (Identity Solution) │
│  • Engine registry  │    │  • Party concept     │
│  • Feature ownership│    │  • Migration plan    │
│  • Dependencies     │    │  • Unified reporting │
└──────────┬──────────┘    └──────────┬───────────┘
           │                           │
           └─────────────┬─────────────┘
                         │
           ┌─────────────┼─────────────┐
           │                           │
┌──────────▼──────────┐    ┌──────────▼───────────┐
│   WORKSPACES.md     │    │ARCHITECTURAL_GAPS.md │
│  (UI Organization)  │    │ (Current State)      │
│  • Navigation       │    │  • Violations        │
│  • Feature grouping │    │  • Remediation plan  │
│  • Role access      │    │  • Risk assessment   │
└─────────────────────┘    └──────────────────────┘
```

---

## Key Principles (The Golden Rules)

### 1. Single Source of Truth
- **Identity:** One Party per email per company
- **Financial:** One transaction record per event
- **Asset:** One asset record per serial number
- **State:** One status per asset at any time

### 2. Core Ownership
- If Core owns it, Engines cannot redefine it
- If Engines need it, Core must provide it
- When in doubt, add to Core, not Engines

### 3. Extension Patterns
- **JSONB metadata:** Simple engine-specific fields
- **Related tables:** Complex engine-specific data (links to Core entity)
- **Classification fields:** Type discrimination (entity_type, roles)
- **Generic FKs:** Sparingly, document clearly

### 4. Identity Management
- **NEVER** create tables with email/phone/address (use Party)
- **ALWAYS** link to customer_id or supplier_id
- **USE** entity_type for classification
- **STORE** engine metadata separately

### 5. Progressive Disclosure
- Show only what's relevant
- Hide complexity until needed
- Organize by business context (workspaces)
- Respect engine toggles

---

## Success Metrics

### Architectural Health Indicators:

**🟢 HEALTHY:**
- Zero identity duplication
- All features mapped to engines
- Engine toggles respected
- Party linking consistent
- Workspace navigation clear

**🟡 NEEDS ATTENTION:**
- Some identity duplication exists
- Feature ownership unclear
- Inconsistent toggle enforcement
- Mixed Party/non-Party patterns
- Flat navigation growing

**🔴 UNHEALTHY:**
- Identity fragmentation widespread
- Feature sprawl (no ownership)
- Toggles ignored
- No Party usage
- Navigation chaos

**Current Status:** 🟡 → 🟢 (After Remediation)

---

## Implementation Timeline

### Week 1: Document Review
- ✅ Create all 5 documents
- ✅ Review with team
- ✅ Identify critical violations
- ✅ Plan remediation sprints

### Week 2-3: Critical Fixes (P1)
- 🔄 Migrate CRM leads → customers
- 🔄 Remove opportunities.lead_id
- 🔄 Implement Party unification services

### Week 4-5: Important Fixes (P2)
- ⏳ Add shopping_carts.customer_id
- ⏳ Create entity_type views
- ⏳ Implement workspace navigation
- ⏳ Add engine toggle enforcement
- ⏳ Add email uniqueness constraints

### Week 6+: Quality & Cleanup (P3-P4)
- ⏳ Data validation constraints
- ⏳ Performance audit
- ⏳ Migration consolidation
- ⏳ Documentation improvements

---

## Team Responsibilities

### Architects:
- Maintain these documents
- Review PRs for contract compliance
- Approve new engines/features
- Update ARCHITECTURAL_GAPS.md

### Developers:
- Read CORE_CONTRACT.md before coding
- Reference ENGINES.md for feature placement
- Follow PARTY_UNIFICATION.md for identity
- Use WORKSPACES.md for UI placement
- Check code against ARCHITECTURAL_GAPS.md

### Product Managers:
- Understand engine boundaries (ENGINES.md)
- Plan features within workspaces (WORKSPACES.md)
- Prioritize remediation (ARCHITECTURAL_GAPS.md)
- Respect architectural constraints (CORE_CONTRACT.md)

### QA:
- Test Party deduplication (PARTY_UNIFICATION.md)
- Verify engine toggle behavior (ENGINES.md)
- Test workspace navigation (WORKSPACES.md)
- Validate architectural compliance (CORE_CONTRACT.md)

---

## Maintenance Schedule

### Weekly:
- Review new PRs against contracts
- Update ARCHITECTURAL_GAPS.md if violations introduced

### Monthly:
- Audit new tables for contract compliance
- Review engine toggle enforcement
- Check Party usage consistency

### Quarterly:
- Full architectural review
- Update documents if patterns evolve
- Re-assess gaps and priorities

### Annually:
- Major architectural health check
- Update contracts if business model changes
- Comprehensive gap analysis

---

## FAQ

### Q: Can I create a new table with an email field?
**A:** NO. Unless it's a Core Party table (customers, suppliers). Store email in Party, link your table to customer_id or supplier_id.

### Q: Can I store revenue/cost outside Core transaction tables?
**A:** NO. All financial truth lives in Core (sales_invoices, purchase_orders, journal_entries). Engines can create settlement records that *reference* Core transactions.

### Q: Can I duplicate asset data in my engine?
**A:** NO. Assets live in Core. Your engine links to asset_id and stores engine-specific metadata separately.

### Q: How do I add engine-specific fields to a customer?
**A:** Two options:
1. Simple: Add JSONB field (e.g., customers.crm_metadata)
2. Complex: Create related table (e.g., crm_prospect_metadata with customer_id FK)

### Q: Where does my new feature belong?
**A:** Check ENGINES.md. Find the engine that owns this business domain. If unclear, ask in architecture review.

### Q: How do I organize my new UI screen?
**A:** Check WORKSPACES.md. Assign to the workspace that matches the business context.

### Q: What if I need to violate a contract?
**A:** Bring it to architecture review. Either:
1. There's a pattern you missed (read docs again)
2. We need to update the contract (rare)
3. The feature needs redesign

### Q: Are these contracts forever?
**A:** They evolve, but slowly and deliberately. Major changes require team consensus and migration planning.

---

## Conclusion

**These documents provide the architectural foundation for infinite scaling.**

With clear boundaries, ownership contracts, and extension patterns, the platform can grow to 100+ features without descending into chaos.

**The cost:** 2-3 hours to read and understand these documents
**The value:** Prevention of 1000+ hours of refactoring and bug fixes

**Read them. Follow them. Update them when needed. Enforce them in code review.**

---

## Document Status

| Document | Status | Last Updated | Next Review |
|----------|--------|--------------|-------------|
| CORE_CONTRACT.md | ✅ Complete | 2026-02-01 | 2026-03-01 |
| ENGINES.md | ✅ Complete | 2026-02-01 | 2026-03-01 |
| PARTY_UNIFICATION.md | ✅ Complete | 2026-02-01 | 2026-03-01 |
| WORKSPACES.md | ✅ Complete | 2026-02-01 | 2026-03-01 |
| ARCHITECTURAL_GAPS.md | ✅ Complete | 2026-02-01 | 2026-02-08 |

---

**This is the architectural constitution of the platform. Respect it, and it will serve you well.**

**End of Documentation Overview**
