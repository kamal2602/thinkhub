# WORKSPACES

**Status:** UI Navigation Architecture
**Version:** 1.0
**Last Updated:** February 1, 2026

---

## Purpose

This document defines the **workspace-based navigation system** that organizes features by business context. Workspaces provide role-appropriate groupings and engine-driven visibility.

**RULE:** Every UI screen belongs to exactly one workspace. Workspaces are enabled/disabled based on engine toggles and user roles.

---

## Workspace Philosophy

### Current Problem:
- Flat navigation with 30+ menu items
- Hard to find features
- No business context grouping
- Overwhelming for new users
- Doesn't scale as features grow

### Solution: Workspace-Based UI
- Group related features by business workflow
- Show only relevant workspaces (based on engines + roles)
- Progressive disclosure (hide complexity until needed)
- Business-oriented language (not technical terms)

---

## Workspace List

```
┌─────────────────────────────────────────────────────────────┐
│                        WORKSPACES                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. OPERATIONS      - Daily workflow (receiving, processing)│
│  2. SALES           - Revenue generation (orders, invoices) │
│  3. ITAD            - Service delivery (projects, certs)    │
│  4. RECYCLING       - Material recovery (harvest, shipments)│
│  5. AUCTIONS        - Auction platform (lots, bids)         │
│  6. CRM             - Sales pipeline (leads, opportunities) │
│  7. WEBSITE         - Storefront (catalog, orders)          │
│  8. FINANCE         - Accounting (GL, A/R, A/P)             │
│  9. REPORTS         - Business intelligence                 │
│  10. ADMIN          - System configuration                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. OPERATIONS WORKSPACE

**Purpose:** Daily operational workflow for processing inventory

**Enabled When:**
- Always enabled (reseller_enabled = true by default)

**Visible To Roles:**
- Admin, Manager, Staff

**Features:**

### 1.1 Purchasing
- **Purchase Orders** (list, create, edit, submit)
- **Receiving** (receive against POs, scan, discrepancies)
- **Purchase Lots** (lot tracking, profitability)
- **Suppliers** (supplier management, stats)

### 1.2 Asset Processing
- **Processing Dashboard** (workflow overview, stage counts)
- **Asset Workflow** (receiving → testing → refurb → ready)
  - Grid view (cards with photos)
  - Kanban view (drag-drop stages)
  - List view (table)
- **Scanner Bar** (quick serial lookup)
- **Asset Details** (full record edit)
- **Bulk Updates** (mass actions)

### 1.3 Inventory
- **Saleable Inventory** (ready-to-sell catalog)
- **Stock Levels** (quantity by location)
- **Stock Movements** (movement history)
- **Low Stock Alerts** (reorder notifications)

### Current Mapping:
```
Dashboard → Operations (Dashboard)
Purchases → Operations (Purchasing)
Receiving → Operations (Purchasing)
Processing → Operations (Asset Processing)
Inventory → Operations (Inventory)
Suppliers → Operations (Purchasing)
```

---

## 2. SALES WORKSPACE

**Purpose:** Revenue generation and customer management

**Enabled When:**
- Always enabled (reseller_enabled = true by default)

**Visible To Roles:**
- Admin, Manager, Staff

**Features:**

### 2.1 Direct Sales
- **Sales Invoices** (list, create, view, print)
- **Quick Sale** (from inventory catalog)
- **Payment Tracking** (payments, A/R aging)

### 2.2 Customer Management
- **Customers** (customer database, CRUD)
- **Customer Stats** (purchase history, revenue)
- **Customer Contacts** (multi-contact per customer)

### 2.3 Sales Analytics
- **Sales Dashboard** (daily/weekly/monthly revenue)
- **Top Customers** (by revenue)
- **Margin Analysis** (profit by product type)
- **Sales by Channel** (direct, auction, website)

### Current Mapping:
```
Sales → Sales (Direct Sales)
Customers → Sales (Customer Management)
Dashboard → Sales (Sales Analytics - partial)
```

---

## 3. ITAD WORKSPACE

**Purpose:** IT Asset Disposition service delivery

**Enabled When:**
- `companies.itad_enabled = true`

**Visible To Roles:**
- Admin, Manager, Staff

**Features:**

### 3.1 Project Management
- **ITAD Projects** (service engagements, revenue share config)
- **Collection Requests** (customer pickup scheduling)
- **Project Progress** (intake → sanitize → settle)
- **Project Dashboard** (active projects, status overview)

### 3.2 Compliance & Certification
- **Data Sanitization** (sanitization tracking per asset)
- **Certificates** (data destruction, recycling, R2)
- **Environmental Reports** (carbon offset, material recovery)
- **Company Certifications** (R2, e-Stewards, ISO)

### 3.3 Revenue Settlement
- **Revenue Settlements** (customer payout tracking)
- **Settlement Dashboard** (due payouts, paid amounts)
- **Downstream Vendors** (recycler/reseller partnerships)

### 3.4 Customer Portal
- **Portal Dashboard** (customer-facing overview)
- **Certificate Downloads** (customer access)
- **Collection Requests** (customer-initiated)
- **Revenue Reports** (customer payout history)

### Current Mapping:
```
ITAD → ITAD (Project Management)
Certificates → ITAD (Compliance)
Data Sanitization → ITAD (Compliance)
Downstream Vendors → ITAD (Revenue Settlement)
Environmental Compliance → ITAD (Compliance)
Customer Portal → ITAD (Customer Portal - separate app)
```

---

## 4. RECYCLING WORKSPACE

**Purpose:** Component harvesting and material recovery

**Enabled When:**
- `companies.recycling_enabled = true`

**Visible To Roles:**
- Admin, Manager, Staff

**Features:**

### 4.1 Component Harvesting
- **Harvesting Workflow** (select asset → extract components)
- **Harvested Inventory** (component stock levels)
- **Component Sales** (sell individual components)
- **Harvest Dashboard** (harvest value, inventory)

### 4.2 Material Recovery
- **Recycler Shipments** (batch shipments to downstream)
- **Material Tracking** (weight by material type)
- **Commodity Prices** (scrap pricing per kg)
- **Settlement Tracking** (estimated vs actual value)

### 4.3 Pricing & Valuation
- **Component Market Prices** (pricing by component + condition)
- **Component Valuation** (inventory value calculation)

### Current Mapping:
```
Inventory → Recycling (Harvested Components)
Inventory → Recycling (Component Sales)
Settings → Recycling (Component Market Prices)
```

**Screens to Create:**
- Recycler Shipments UI
- Material Tracking Dashboard
- Commodity Prices UI
- Harvest Workflow UI

---

## 5. AUCTIONS WORKSPACE

**Purpose:** Auction platform integration and management

**Enabled When:**
- `companies.auction_enabled = true`

**Visible To Roles:**
- Admin, Manager, Staff

**Features:**

### 5.1 Auction Management
- **Auction Houses** (platform configuration: eBay, TeraPeak)
- **Auction Events** (scheduled auction dates)
- **Lots** (lot creation, item assignment, reserve prices)
- **Lot Publishing** (publish to auction house)

### 5.2 Bidding & Sales
- **Bid Tracking** (bid history, current high bid)
- **Auction Dashboard** (active lots, ending soon)
- **Settlements** (final sale records, commission)
- **Buyer Management** (bidder profiles, ratings)

### 5.3 Analytics
- **Auction Performance** (sell-through rate, avg price)
- **House Comparison** (performance by platform)
- **Lot Success** (which lots performed best)

### Current Mapping:
```
Auctions → Auctions (Auction Management - exists)
```

**Note:** Auction UI already implemented in `components/auctions/AuctionManagement.tsx`

---

## 6. CRM WORKSPACE

**Purpose:** Sales pipeline and lead management

**Enabled When:**
- `companies.crm_enabled = true`

**Visible To Roles:**
- Admin, Manager, Staff

**Features:**

### 6.1 Lead Management
- **Prospects** (prospect list, qualification)
- **Lead Sources** (tracking: website, referral, cold call)
- **Lead Assignment** (assign to sales reps)
- **Lead Conversion** (convert to customer)

### 6.2 Opportunity Pipeline
- **Opportunities** (sales pipeline: prospecting → closing)
- **Pipeline Dashboard** (value by stage, forecast)
- **Win/Loss Analysis** (conversion rates, reasons)

### 6.3 Activity Tracking
- **Activities** (calls, emails, meetings)
- **Task Management** (follow-ups, reminders)
- **Activity Timeline** (customer interaction history)

### 6.4 Quoting
- **Quotes** (pre-sales quotes)
- **Quote Templates** (standardized pricing)
- **Quote-to-Order** (convert quote → sales invoice)

### Current Mapping:
```
(No current UI - tables exist)
```

**Screens to Create:**
- Prospects list (replaces leads)
- Opportunities pipeline
- Activities timeline
- Quotes list

---

## 7. WEBSITE WORKSPACE

**Purpose:** eCommerce storefront and online sales

**Enabled When:**
- `companies.website_enabled = true`

**Visible To Roles:**
- Admin, Manager (Staff: read-only)

**Features:**

### 7.1 Storefront Configuration
- **Website Settings** (branding, theme, policies)
- **Product Publishing** (publish inventory to web)
- **Catalog Management** (product descriptions, photos)
- **Shipping Zones** (rates by region)

### 7.2 Order Management
- **Web Orders** (eCommerce order list)
- **Order Fulfillment** (pick, pack, ship)
- **Order Tracking** (customer shipment tracking)

### 7.3 Customer Accounts
- **Website Customers** (customer accounts)
- **Shopping Carts** (abandoned cart recovery)
- **Customer Reviews** (product feedback)

### 7.4 Website Analytics
- **Traffic** (visitors, page views)
- **Conversion Rate** (visitors → buyers)
- **Top Products** (best sellers)

### Current Mapping:
```
(No current UI - tables exist)
```

**Screens to Create:**
- Website Settings UI
- Product Publishing UI
- Web Orders list
- Shopping Carts management

---

## 8. FINANCE WORKSPACE

**Purpose:** Financial management and accounting

**Enabled When:**
- Always enabled

**Visible To Roles:**
- Admin, Manager (Staff: read-only)

**Features:**

### 8.1 Accounting
- **Chart of Accounts** (GL structure)
- **Journal Entries** (manual entries, auto-generated)
- **General Ledger** (transaction history by account)

### 8.2 Accounts Receivable
- **Customer Invoices** (unpaid invoices)
- **Payment Collection** (record payments)
- **A/R Aging** (overdue analysis)
- **Customer Statements** (account statements)

### 8.3 Accounts Payable
- **Supplier Invoices** (unpaid bills)
- **Payment Processing** (pay suppliers)
- **A/P Aging** (payment due dates)
- **Vendor Statements** (reconciliation)

### 8.4 Financial Reports
- **Balance Sheet** (assets, liabilities, equity)
- **Income Statement** (revenue, expenses, profit)
- **Cash Flow** (cash movements)
- **Trial Balance** (account balances)

### Current Mapping:
```
Accounting → Finance (Accounting)
Dashboard → Finance (Financial Reports - partial)
```

**Screens to Create:**
- A/R Dashboard
- A/P Dashboard
- Financial Reports UI

---

## 9. REPORTS WORKSPACE

**Purpose:** Business intelligence and analytics

**Enabled When:**
- Always enabled

**Visible To Roles:**
- All roles (reports filtered by permissions)

**Features:**

### 9.1 Operational Reports
- **Inventory Reports** (stock value, aging, turnover)
- **Purchase Reports** (spend by supplier, lot profitability)
- **Processing Reports** (cycle time, throughput)

### 9.2 Sales Reports
- **Sales by Period** (daily, weekly, monthly, YTD)
- **Sales by Customer** (top customers, customer lifetime value)
- **Sales by Product** (best sellers, slow movers)
- **Margin Analysis** (gross margin by product type)

### 9.3 ITAD Reports
- **Project Performance** (revenue by project, avg margin)
- **Certificate Compliance** (issued certificates, expiry tracking)
- **Environmental Impact** (carbon offset, material diverted)

### 9.4 Recycling Reports
- **Component Harvest Value** (harvest vs scrap decision)
- **Material Recovery** (weight and value by material)
- **Downstream Settlement** (payout tracking)

### 9.5 Executive Dashboard
- **KPI Dashboard** (key metrics across all engines)
- **Revenue Comparison** (by channel, period-over-period)
- **Profit Analysis** (contribution by engine)

### Current Mapping:
```
Reports → Reports (partial implementation)
Dashboard → Reports (Executive Dashboard)
```

---

## 10. ADMIN WORKSPACE

**Purpose:** System configuration and administration

**Enabled When:**
- Always enabled

**Visible To Roles:**
- Admin only

**Features:**

### 10.1 Company Management
- **Companies** (create, edit, archive)
- **Engine Toggles** (enable/disable business engines)
- **Locations** (warehouse/store management)

### 10.2 User Management
- **Users** (invite, roles, permissions)
- **Role Permissions** (configure access levels)
- **User Activity** (audit trail)

### 10.3 Master Data
- **Product Types** (device categories)
- **Processing Stages** (workflow states)
- **Grades & Conditions** (cosmetic, functional)
- **Test Result Options** (testing checklist options)
- **Warranty Types** (warranty configuration)
- **Payment Terms** (payment period options)
- **Return Reasons** (return categorization)

### 10.4 Import Intelligence
- **Import Field Mappings** (column mapping rules)
- **Model Aliases** (model normalization rules)
- **Product Type Aliases** (type classification rules)
- **Import Jobs** (background import monitoring)

### 10.5 System Settings
- **Business Rules** (workflow automation)
- **Notification Settings** (email templates, triggers)
- **Integration Settings** (API keys, webhooks)

### Current Mapping:
```
Companies → Admin (Company Management)
Users → Admin (User Management)
Settings → Admin (Master Data)
Settings → Admin (Import Intelligence)
Settings → Admin (System Settings)
```

---

## Workspace Navigation Structure

### Top-Level Navigation (AppBar)

```
┌─────────────────────────────────────────────────────────────┐
│  LOGO    [Workspace Dropdown]            User  │  Settings  │
└─────────────────────────────────────────────────────────────┘

[Workspace Dropdown]
├─ Operations          (always visible)
├─ Sales              (always visible)
├─ ITAD               (if itad_enabled)
├─ Recycling          (if recycling_enabled)
├─ Auctions           (if auction_enabled)
├─ CRM                (if crm_enabled)
├─ Website            (if website_enabled)
├─ Finance            (always visible)
├─ Reports            (always visible)
└─ Admin              (admin only)
```

### Workspace Sidebar (Left)

```
┌──────────────────────┐
│  OPERATIONS          │
├──────────────────────┤
│  📊 Dashboard        │
│                      │
│  📦 Purchasing       │
│    • Purchase Orders │
│    • Receiving       │
│    • Purchase Lots   │
│    • Suppliers       │
│                      │
│  ⚙️  Processing       │
│    • Asset Workflow  │
│    • Scanner         │
│                      │
│  📋 Inventory        │
│    • Saleable        │
│    • Stock Levels    │
│    • Movements       │
└──────────────────────┘
```

---

## Workspace Access Control

### Role-Based Visibility

```typescript
// Workspace visibility matrix
const workspaceAccess = {
  operations: ['admin', 'manager', 'staff', 'viewer'],
  sales: ['admin', 'manager', 'staff', 'viewer'],
  itad: ['admin', 'manager', 'staff', 'viewer'],
  recycling: ['admin', 'manager', 'staff'],
  auctions: ['admin', 'manager', 'staff'],
  crm: ['admin', 'manager', 'staff'],
  website: ['admin', 'manager'],
  finance: ['admin', 'manager'],  // Staff: read-only
  reports: ['admin', 'manager', 'staff', 'viewer'],
  admin: ['admin']
};

// Check workspace access
function canAccessWorkspace(
  workspace: string,
  userRole: string,
  engineEnabled: boolean
): boolean {
  const allowedRoles = workspaceAccess[workspace];
  const roleAllowed = allowedRoles.includes(userRole);

  // Engine-specific workspaces require toggle
  const engineWorkspaces = ['itad', 'recycling', 'auctions', 'crm', 'website'];
  if (engineWorkspaces.includes(workspace)) {
    return roleAllowed && engineEnabled;
  }

  return roleAllowed;
}
```

---

## Mobile Workspace Navigation

### Mobile Bottom Tab Bar

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    [Content Area]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  [📊]    [📦]    [💰]    [📈]    [⚙️]                         │
│  Home    Ops     Sales   Reports  More                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Workspace Implementation Roadmap

### Phase 1: Foundation (Current Sprint)
- ✅ Document workspace structure
- ✅ Map existing features to workspaces
- [ ] Create workspace switcher component
- [ ] Implement workspace routing

### Phase 2: Core Workspaces (Next 2 Sprints)
- [ ] Operations workspace (refactor existing)
- [ ] Sales workspace (refactor existing)
- [ ] Finance workspace (refactor existing)
- [ ] Reports workspace (consolidate)
- [ ] Admin workspace (refactor existing)

### Phase 3: Engine Workspaces (Following Sprints)
- [ ] ITAD workspace (refactor existing)
- [ ] Recycling workspace (partially new)
- [ ] CRM workspace (new - UI needed)
- [ ] Website workspace (new - UI needed)
- [ ] Auctions workspace (refactor existing)

### Phase 4: Polish (Final Sprint)
- [ ] Mobile navigation
- [ ] Workspace onboarding
- [ ] Contextual help per workspace
- [ ] Workspace-specific search

---

## Workspace Design Principles

### 1. Context Clarity
Every screen should clearly communicate which workspace it belongs to

### 2. Minimal Cognitive Load
Show only what's relevant to the current business context

### 3. Progressive Disclosure
Hide advanced features until needed

### 4. Consistent Patterns
Same navigation patterns across all workspaces

### 5. Role Appropriate
Show what users need, hide what they don't

---

## Implementation Notes

### Routing Structure

```typescript
// Workspace-based routes
const routes = {
  '/operations': OperationsWorkspace,
  '/operations/purchase-orders': PurchaseOrdersList,
  '/operations/receiving': ReceivingWorkflow,
  '/operations/processing': ProcessingDashboard,
  '/operations/inventory': SaleableInventory,

  '/sales': SalesWorkspace,
  '/sales/invoices': SalesInvoicesList,
  '/sales/customers': CustomersList,

  '/itad': ITADWorkspace,
  '/itad/projects': ITADProjectsList,
  '/itad/certificates': CertificatesList,

  // ... etc
};
```

### Workspace Context

```typescript
// React context for workspace
const WorkspaceContext = createContext<{
  currentWorkspace: string;
  setWorkspace: (workspace: string) => void;
  availableWorkspaces: string[];
}>();

function useWorkspace() {
  return useContext(WorkspaceContext);
}
```

---

## Summary: Workspace Benefits

### Before (Current):
- Flat navigation with 30+ items
- Overwhelming for new users
- Hard to find features
- No business context

### After (Workspace-Based):
- Organized by business workflow
- Progressive disclosure
- Engine-driven visibility
- Role-appropriate access
- Scalable to 100+ features
- Clear context for every screen

**Workspaces provide the navigation architecture for infinite feature growth.**

---

**End of Workspaces Document**
