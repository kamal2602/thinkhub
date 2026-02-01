# StockPro - Complete Web Application Documentation

**Version:** 2.0
**Last Updated:** November 8, 2025
**Platform:** React + TypeScript + Supabase
**Industry:** IT Asset Refurbishment & Resale

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Core Modules](#core-modules)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Database Schema](#database-schema)
7. [Complete Workflows](#complete-workflows)
8. [API Integration](#api-integration)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Advanced Features](#advanced-features)

---

# 1. System Overview

## What is StockPro?

StockPro is a comprehensive IT asset management system designed for companies that:
- Purchase used IT equipment (laptops, desktops, servers)
- Refurbish and grade assets
- Track component harvesting
- Manage sales and inventory
- Calculate profit per purchase lot

## Key Features

```
┌─────────────────────────────────────────────────────────────┐
│                    STOCKPRO FEATURES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Purchase Order Management                               │
│     ├─ Smart PO Import from Excel                          │
│     ├─ Multi-currency support                              │
│     ├─ Auto-cost rounding                                  │
│     └─ Supplier column mapping with AI                     │
│                                                             │
│  🔧 Asset Processing & Refurbishment                        │
│     ├─ Two-field barcode scanning                          │
│     ├─ Multiple internal IDs per asset                     │
│     ├─ Kanban board workflow                               │
│     ├─ Testing checklists                                  │
│     └─ Component tracking                                  │
│                                                             │
│  📊 Inventory Management                                    │
│     ├─ Real-time stock levels                              │
│     ├─ Location tracking                                   │
│     ├─ Saleable inventory view                             │
│     └─ Component marketplace                               │
│                                                             │
│  💰 Sales & Invoicing                                       │
│     ├─ Unified sales catalog                               │
│     ├─ Component + whole unit sales                        │
│     ├─ Invoice generation & printing                       │
│     └─ Profit tracking                                     │
│                                                             │
│  📈 Purchase Lot Management                                 │
│     ├─ Lot profit reports                                  │
│     ├─ Cost allocation                                     │
│     ├─ Scrap tracking                                      │
│     └─ ROI calculation                                     │
│                                                             │
│  🎯 Smart Features                                          │
│     ├─ Import intelligence (field mapping)                 │
│     ├─ Model normalization                                 │
│     ├─ Component auto-creation                             │
│     └─ Passthrough field detection                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 2. Architecture

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Vite                        │  │
│  │  ├─ State: Context API                               │  │
│  │  ├─ Styling: Tailwind CSS                            │  │
│  │  ├─ Icons: Lucide React                              │  │
│  │  ├─ DnD: @dnd-kit                                    │  │
│  │  └─ Excel: xlsx library                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ REST API / Realtime
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase                                            │  │
│  │  ├─ PostgreSQL 15 (Database)                         │  │
│  │  ├─ PostgREST (Auto API)                             │  │
│  │  ├─ Realtime (WebSockets)                            │  │
│  │  ├─ Auth (JWT-based)                                 │  │
│  │  ├─ Storage (File uploads)                           │  │
│  │  └─ Edge Functions (Serverless)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Application Structure

```
stockpro/
│
├── src/
│   ├── components/          # All UI components
│   │   ├── auth/           # Login, Register
│   │   ├── assets/         # Asset components tracking
│   │   ├── companies/      # Multi-tenancy
│   │   ├── customers/      # Customer management
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── inventory/      # Stock views
│   │   ├── layout/         # Header, Sidebar
│   │   ├── locations/      # Warehouse locations
│   │   ├── movements/      # Stock movements
│   │   ├── processing/     # Refurbishment workflow
│   │   ├── purchases/      # PO management
│   │   ├── receiving/      # Smart receiving
│   │   ├── sales/          # Invoicing
│   │   ├── settings/       # Configuration
│   │   └── suppliers/      # Supplier management
│   │
│   ├── contexts/           # React contexts
│   │   ├── AuthContext     # User authentication
│   │   ├── CompanyContext  # Multi-company
│   │   └── ToastContext    # Notifications
│   │
│   ├── lib/                # Utilities
│   │   ├── supabase.ts    # DB client
│   │   ├── excelParser.ts # Excel handling
│   │   ├── importIntelligence.ts # Smart mapping
│   │   ├── componentParser.ts    # Component detection
│   │   └── passthroughFields.ts  # Dynamic fields
│   │
│   └── pages/             # Main pages
│       ├── AuthPage
│       └── DashboardPage
│
├── supabase/
│   ├── migrations/        # Database migrations (80+ files)
│   └── functions/         # Edge functions
│
└── public/               # Static assets
```

---

# 3. Authentication & Authorization

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ User registers         │
        │ Email + Password       │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ First user in system?  │
        └────────┬───────────────┘
                 │
          ┌──────┴──────┐
          │             │
       YES│             │NO
          │             │
          ▼             ▼
   ┌──────────────┐  ┌──────────────┐
   │ Auto-create  │  │ User assigned│
   │ company      │  │ to existing  │
   │ Make user    │  │ company      │
   │ super_admin  │  │ Default role │
   └──────┬───────┘  └──────┬───────┘
          │                 │
          └────────┬────────┘
                   │
                   ▼
        ┌────────────────────────┐
        │ Profile created        │
        │ user_company_access    │
        │ Entry added            │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ Redirect to Dashboard  │
        └────────────────────────┘
```

## User Roles

```
┌─────────────────────────────────────────────────────────────┐
│                      ROLE HIERARCHY                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👑 Super Admin (is_super_admin = true)                     │
│     └─ Full system access across all companies             │
│                                                             │
│  🏢 Company-Level Roles (via user_company_access)           │
│                                                             │
│     1. Admin                                                │
│        ├─ Full company management                           │
│        ├─ User management                                   │
│        ├─ Settings configuration                            │
│        ├─ Financial reports                                 │
│        └─ Can access all modules                            │
│                                                             │
│     2. Manager                                              │
│        ├─ Purchase orders                                   │
│        ├─ Sales & invoicing                                 │
│        ├─ Inventory oversight                               │
│        ├─ Reports viewing                                   │
│        └─ Cannot edit system settings                       │
│                                                             │
│     3. Staff                                                │
│        ├─ Asset processing                                  │
│        ├─ Inventory updates                                 │
│        ├─ Basic sales                                       │
│        └─ Limited reporting                                 │
│                                                             │
│     4. Technician                                           │
│        ├─ Asset scanning & processing                       │
│        ├─ Testing & grading                                 │
│        ├─ Component harvesting                              │
│        └─ Kanban board view only                            │
│                                                             │
│     5. Viewer                                               │
│        ├─ Read-only access                                  │
│        ├─ Reports viewing                                   │
│        └─ No create/edit/delete                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Company Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-TENANT ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

Company A                    Company B
├─ Users                     ├─ Users
├─ Assets                    ├─ Assets
├─ Suppliers                 ├─ Suppliers
├─ Customers                 ├─ Customers
└─ Settings                  └─ Settings

        ↓                            ↓
        └────────────┬───────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Row Level      │
            │ Security (RLS) │
            └────────────────┘

Every table has company_id:
├─ Users can only see their company's data
├─ Enforced at database level
└─ No application-level filtering needed
```

---

# 4. Core Modules

## Module 1: Purchase Orders

### Purpose
Track equipment purchases from suppliers with cost allocation to purchase lots.

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                 PURCHASE ORDER WORKFLOW                     │
└─────────────────────────────────────────────────────────────┘

Step 1: Create PO
├─ Manual entry OR
└─ Smart Excel import
    ├─ Upload supplier's price list
    ├─ Map columns (AI-assisted)
    ├─ Validate data
    └─ Auto-create items

Step 2: PO Status → "Draft"
├─ Review items
├─ Edit quantities/costs
└─ Add notes

Step 3: Submit PO → Status: "Submitted"
├─ PO locked (no edits)
├─ Creates purchase_lot record
├─ Expected receiving items created
└─ Notification sent

Step 4: Receiving Process
├─ Scan serial numbers
├─ Match to PO line items
├─ Auto-create assets
└─ Track received vs expected

Step 5: PO Status → "Completed"
├─ All items received
├─ Costs allocated to lot
└─ Assets ready for processing
```

### Smart PO Import Features

```
┌─────────────────────────────────────────────────────────────┐
│              SMART PO IMPORT INTELLIGENCE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Excel Sheet Selection                                  │
│     └─ Auto-detect sheets with data                        │
│                                                             │
│  2. Column Mapping with AI                                 │
│     ├─ Keyword matching                                    │
│     ├─ Alias recognition                                   │
│     ├─ Learning from past imports                          │
│     └─ Save as template                                    │
│                                                             │
│  3. Data Validation                                        │
│     ├─ Required: Brand, Model, Cost                        │
│     ├─ Optional: Serial, Quantity, Specs                   │
│     ├─ Auto-cost rounding (2 decimals)                     │
│     └─ Duplicate detection                                 │
│                                                             │
│  4. Multi-Currency Support                                 │
│     ├─ Source currency selection                           │
│     ├─ Exchange rate input                                 │
│     ├─ Auto-conversion to AED                              │
│     └─ Preserve source cost                                │
│                                                             │
│  5. Smart Field Detection                                  │
│     ├─ Passthrough fields (dynamic specs)                  │
│     ├─ Component recognition                               │
│     └─ Product type matching                               │
│                                                             │
│  Example Mapping:                                          │
│  ┌──────────────────┬─────────────────────────────┐       │
│  │ Supplier Column  │ System Field                │       │
│  ├──────────────────┼─────────────────────────────┤       │
│  │ Manufacturer     │ Brand                       │       │
│  │ Model Number     │ Model                       │       │
│  │ Price (USD)      │ Unit Cost                   │       │
│  │ RAM              │ Specification: RAM          │       │
│  │ Storage          │ Specification: Storage      │       │
│  │ S/N              │ Serial Number               │       │
│  └──────────────────┴─────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### PO Database Schema

```sql
purchase_orders
├─ id (uuid, PK)
├─ po_number (text, unique)
├─ supplier_id (uuid, FK)
├─ order_date (date)
├─ expected_delivery_date (date)
├─ status (text) → draft | submitted | completed | cancelled
├─ total_amount (numeric)
├─ currency (text)
├─ exchange_rate (numeric)
├─ notes (text)
├─ source_file_name (text)
├─ source_file_data (jsonb)
├─ company_id (uuid, FK)
└─ created_by (uuid, FK)

purchase_order_lines
├─ id (uuid, PK)
├─ purchase_order_id (uuid, FK)
├─ brand (text)
├─ model (text)
├─ serial_number (text, optional)
├─ product_type_id (uuid, FK)
├─ quantity_ordered (integer)
├─ unit_cost_source (numeric)
├─ unit_cost (numeric) → in AED
├─ line_total (numeric)
├─ specifications (jsonb)
└─ company_id (uuid, FK)

purchase_lots
├─ id (uuid, PK)
├─ lot_number (text, unique)
├─ purchase_order_id (uuid, FK)
├─ purchase_date (date)
├─ total_cost (numeric)
├─ status (text) → open | closed
└─ company_id (uuid, FK)
```

---

## Module 2: Asset Processing & Refurbishment

### Purpose
Transform received equipment into saleable inventory through testing, grading, and refurbishment.

### Two-Field Scanning System

```
┌─────────────────────────────────────────────────────────────┐
│              PROCESSING PAGE - SCANNER BAR                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────┬───────────────────────────┐│
│  │ 1️⃣ Scan Serial or Internal │ 2️⃣ Scan Internal Barcode ││
│  │                             │                           ││
│  │  [ABC123XYZ___________]    │  [__________________]    ││
│  │  ↑ Cursor starts here      │  ↑ Auto-moves if needed  ││
│  └────────────────────────────┴───────────────────────────┘│
│                                                             │
│  Status: Ready to scan                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Flow:
─────

Scenario A: New Asset (No Internal ID)
1. Scan Field 1: ABC123XYZ
2. System: Asset found, no internal ID
3. Cursor auto-moves to Field 2 ✅
4. Scan Field 2: INT-001
5. System: Links INT-001 to asset
6. Opens Asset Detail Page ✅

Scenario B: Existing Asset (Has Internal ID)
1. Scan Field 1: ABC123XYZ or INT-001
2. System: Asset found, has internal ID
3. Field 2 skipped ✅
4. Opens Asset Detail Page immediately ✅

Performance: 2 search steps (not 3)
├─ Step 1: Search by serial_number
└─ Step 2: Search asset_internal_ids table
    (Skipped: assets.internal_asset_id for speed)
```

### Kanban Board Workflow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      PROCESSING KANBAN BOARD                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  RECEIVED   │  │ REFURB      │  │  QC/GRADE   │  │   READY   │ │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤ │
│  │             │  │             │  │             │  │           │ │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │┌─────────┐│ │
│  │ │ HP 840  │ │  │ │ Dell 7490│ │  │ │ Lenovo  │ │  ││ HP 850 ││ │
│  │ │ G8      │ │  │ │         │ │  │ │ T14     │ │  ││        ││ │
│  │ │ INT-001 │ │  │ │ INT-005 │ │  │ │ INT-008 │ │  ││ INT-010││ │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │└─────────┘│ │
│  │             │  │             │  │             │  │           │ │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │┌─────────┐│ │
│  │ │ Lenovo  │ │  │ │ HP 840  │ │  │ │ Dell 5420│ │  ││Dell 7490││ │
│  │ │ X1      │ │  │ │ G7      │ │  │ │         │ │  ││        ││ │
│  │ │ INT-002 │ │  │ │ INT-006 │ │  │ │ INT-009 │ │  ││ INT-011││ │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │└─────────┘│ │
│  │             │  │             │  │             │  │           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                      │
│  Features:                                                          │
│  ├─ Drag & drop between stages                                      │
│  ├─ Assign to technicians                                           │
│  ├─ Priority flagging                                               │
│  ├─ Real-time updates                                               │
│  └─ Filter by technician/priority                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Asset Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                        HP EliteBook 840 G8          │
│                                                    [Edit]   │
│  Serial: ABC123XYZ                                          │
│  Brand: HP | Model: EliteBook 840 G8                        │
│  Type: Laptop                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Internal Asset IDs                         [+ Add ID]   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✓ INT-001 (Primary)                  Nov 08, 2025     │ │
│  │   Original barcode                                     │ │
│  │                                                        │ │
│  │ ✓ INT-002                            Nov 15, 2025     │ │
│  │   Back panel replaced                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Processing Stage: [Refurbishing ▼]                        │
│  Assigned Technician: [John Smith ▼]                       │
│  Priority: [⭐ Mark as Priority]                            │
│                                                             │
│  Processing Notes:                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Needs new battery, keyboard cleaning                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│  [Update Notes]                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 SPECIFICATIONS                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ CPU:     Intel Core i7-1185G7 @ 3.0 GHz              │ │
│  │ RAM:     16 GB                                        │ │
│  │ Storage: 512 GB SSD                                   │ │
│  │ Display: 14" FHD                                      │ │
│  │ GPU:     Intel Iris Xe                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ TESTING CHECKLIST                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Display Test         [✓ Pass]        Cost: 0 AED      │ │
│  │ Keyboard Test        [✓ Pass]        Cost: 0 AED      │ │
│  │ Trackpad Test        [⚠ Minor Issue]  Cost: 50 AED    │ │
│  │ Battery Test         [✗ Fail]        Cost: 450 AED    │ │
│  │ WiFi/Bluetooth       [✓ Pass]        Cost: 0 AED      │ │
│  │ Ports Test           [✓ Pass]        Cost: 0 AED      │ │
│  │                                                        │ │
│  │ Total Refurb Costs: 500 AED                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔧 COMPONENTS (Harvested/Installed)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Component           Serial        Action      Date    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ RAM 8GB (slot 1)    RAM12345      Removed    Nov 15  │ │
│  │ SSD 512GB           SSD67890      Installed  Nov 16  │ │
│  │ Battery Original    BAT11111      Removed    Nov 16  │ │
│  │ Battery New         BAT22222      Installed  Nov 16  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 FINANCIALS                                              │
│  Purchase Cost:      1,250.00 AED                          │
│  Refurb Costs:         500.00 AED                          │
│  Total Cost:         1,750.00 AED                          │
│  Selling Price:      2,500.00 AED                          │
│  Expected Profit:      750.00 AED                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📜 HISTORY                                                 │
│  Nov 08  Received from PO-2025-001    (John Smith)        │
│  Nov 08  Assigned to technician       (System)            │
│  Nov 08  Status: Received → Refurb    (John Smith)        │
│  Nov 15  Back panel replaced          (John Smith)        │
│  Nov 15  Internal ID INT-002 added    (John Smith)        │
│  Nov 16  Battery replaced             (John Smith)        │
│  Nov 18  Status: Refurb → QC          (John Smith)        │
│  Nov 19  Graded as: Excellent         (Sarah Jones)       │
│  Nov 19  Status: QC → Ready           (Sarah Jones)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Processing Database Schema

```sql
assets
├─ id (uuid, PK)
├─ serial_number (text, unique per company)
├─ internal_asset_id (text, primary internal ID)
├─ brand (text)
├─ model (text)
├─ product_type_id (uuid, FK)
├─ cosmetic_grade (text)
├─ functional_status (text)
├─ processing_stage (text) → received | refurbishing | qc_grading | ready
├─ assigned_technician_id (uuid, FK)
├─ stage_started_at (timestamptz)
├─ is_priority (boolean)
├─ processing_notes (text)
├─ purchase_price (numeric)
├─ refurbishment_cost (numeric)
├─ selling_price (numeric)
├─ status (text) → In Stock | Sold | Scrapped
├─ specifications (jsonb) → dynamic fields
├─ purchase_lot_id (uuid, FK)
├─ company_id (uuid, FK)
└─ created_at (timestamptz)

asset_internal_ids (NEW - Multiple IDs per asset)
├─ id (uuid, PK)
├─ asset_id (uuid, FK)
├─ internal_id (text, unique per company)
├─ is_primary (boolean)
├─ added_date (timestamptz)
├─ added_by (uuid, FK)
├─ reason (text) → e.g., "Back panel replaced"
├─ status (text) → active | replaced
└─ company_id (uuid, FK)

asset_testing_results
├─ id (uuid, PK)
├─ asset_id (uuid, FK)
├─ test_name (text)
├─ result (text) → pass | fail | minor_issue
├─ notes (text)
├─ tested_by (uuid, FK)
├─ tested_at (timestamptz)
└─ company_id (uuid, FK)

asset_refurbishment_costs
├─ id (uuid, PK)
├─ asset_id (uuid, FK)
├─ category (text)
├─ cost (numeric)
├─ description (text)
├─ date (date)
└─ company_id (uuid, FK)

asset_history
├─ id (uuid, PK)
├─ asset_id (uuid, FK)
├─ action (text)
├─ old_value (text)
├─ new_value (text)
├─ performed_by (uuid, FK)
├─ performed_at (timestamptz)
└─ company_id (uuid, FK)
```

---

## Module 3: Component Tracking

### Purpose
Track components harvested from assets and manage component inventory separately.

### Component Workflow

```
┌─────────────────────────────────────────────────────────────┐
│               COMPONENT HARVESTING WORKFLOW                 │
└─────────────────────────────────────────────────────────────┘

Scenario: Asset is beyond economical repair
├─ Status: Mark for component harvesting
│
Step 1: Open Asset Detail Page
├─ Click "Add Component" in Components section
│
Step 2: Select Component Type
├─ Component types: RAM, SSD, HDD, Battery, Screen, etc.
├─ System detects from asset specs if available
│
Step 3: Component Details
├─ Serial number (if available)
├─ Specifications (size, speed, etc.)
├─ Condition grade
├─ Market value estimation
│
Step 4: Harvest Action
├─ Component added to inventory
├─ Asset specs updated (component removed)
├─ History logged
└─ Component available for:
    ├─ Installation in other assets
    ├─ Direct sale as component
    └─ Scrap if defective

Component States:
├─ Harvested (in stock)
├─ Installed (in another asset)
├─ Sold (as component)
└─ Scrapped
```

### Component Sales

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPONENT MARKETPLACE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: [All Types ▼] [All Brands ▼] [Search...]         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💾 RAM - 16GB DDR4 2666MHz                           │  │
│  │    Brand: Samsung | Condition: Excellent             │  │
│  │    In Stock: 12 units                                │  │
│  │    Market Price: 150 AED                             │  │
│  │    [Add to Invoice]                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💿 SSD - 512GB NVMe                                   │  │
│  │    Brand: Kingston | Condition: Good                 │  │
│  │    In Stock: 8 units                                 │  │
│  │    Market Price: 280 AED                             │  │
│  │    [Add to Invoice]                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔋 Battery - 56Wh Laptop Battery                      │  │
│  │    Compatible: HP EliteBook 840 G7/G8               │  │
│  │    In Stock: 5 units                                 │  │
│  │    Market Price: 320 AED                             │  │
│  │    [Add to Invoice]                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Database Schema

```sql
asset_components
├─ id (uuid, PK)
├─ parent_asset_id (uuid, FK) → original asset
├─ installed_in_asset_id (uuid, FK, nullable) → if installed elsewhere
├─ component_type (text) → RAM, SSD, HDD, Battery, Screen, etc.
├─ brand (text)
├─ model (text)
├─ serial_number (text, nullable)
├─ specifications (jsonb)
├─ cosmetic_grade (text)
├─ functional_status (text)
├─ harvest_date (date)
├─ harvest_reason (text)
├─ status (text) → harvested | installed | sold | scrapped
├─ market_price (numeric)
├─ harvest_value (numeric) → cost allocated from parent
├─ company_id (uuid, FK)
└─ created_at (timestamptz)

component_sales
├─ id (uuid, PK)
├─ component_id (uuid, FK)
├─ sales_invoice_id (uuid, FK)
├─ sales_invoice_item_id (uuid, FK)
├─ sale_date (date)
├─ sale_price (numeric)
├─ cost_amount (numeric)
├─ profit_amount (numeric)
└─ company_id (uuid, FK)
```

---

## Module 4: Sales & Invoicing

### Purpose
Unified sales catalog supporting both complete units and individual components.

### Unified Sales Catalog

```
┌─────────────────────────────────────────────────────────────┐
│                   UNIFIED SALES CATALOG                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Customer: [Select Customer ▼]                             │
│                                                             │
│  Tabs: [💻 Complete Units] [🔧 Components]                  │
│                                                             │
│  ─────────────── COMPLETE UNITS TAB ─────────────────       │
│                                                             │
│  Filter: [Type ▼] [Brand ▼] [Grade ▼] [Search...]          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ HP EliteBook 840 G8                                  │  │
│  │ ───────────────────────────────────────────────────  │  │
│  │ Serial: ABC123XYZ | Internal: INT-001, INT-002       │  │
│  │ Grade: Excellent | i7-1185G7 | 16GB | 512GB          │  │
│  │                                                       │  │
│  │ Cost: 1,750 AED | Suggested: 2,500 AED               │  │
│  │ [________________] ← Enter sell price                │  │
│  │                              [Add to Invoice]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Dell Latitude 7490                                   │  │
│  │ ───────────────────────────────────────────────────  │  │
│  │ Serial: DEL456XYZ | Internal: INT-005                │  │
│  │ Grade: Good | i5-8350U | 8GB | 256GB                 │  │
│  │                                                       │  │
│  │ Cost: 950 AED | Suggested: 1,400 AED                 │  │
│  │ [1400__________] ← Enter sell price                  │  │
│  │                              [Add to Invoice]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────────────── COMPONENTS TAB ─────────────────          │
│                                                             │
│  (See Component Marketplace above)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Invoice Creation

```
┌─────────────────────────────────────────────────────────────┐
│                      CREATE INVOICE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Invoice #: INV-2025-00123                                  │
│  Date: Nov 19, 2025                                         │
│  Customer: Tech Solutions LLC                               │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Item                    Qty    Price      Total        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ HP EliteBook 840 G8      1    2,500.00   2,500.00    │ │
│  │ Serial: ABC123XYZ                                     │ │
│  │                                                        │ │
│  │ Dell Latitude 7490       1    1,400.00   1,400.00    │ │
│  │ Serial: DEL456XYZ                                     │ │
│  │                                                        │ │
│  │ RAM 16GB DDR4            2      150.00     300.00    │ │
│  │ (Component)                                           │ │
│  │                                                        │ │
│  │ SSD 512GB NVMe           1      280.00     280.00    │ │
│  │ (Component)                                           │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                            Subtotal:     4,480.00    │ │
│  │                            VAT (5%):       224.00    │ │
│  │                            TOTAL:        4,704.00    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Payment Terms: [Net 30 ▼]                                 │
│  Notes:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1-year warranty included on all units                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [Save Draft]  [Generate & Print Invoice]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Actions on Save:
├─ Assets marked as "Sold"
├─ Components marked as "Sold"
├─ Stock quantities updated
├─ Profit calculated & recorded
├─ Purchase lot profit updated
└─ Invoice PDF generated
```

### Sales Database Schema

```sql
sales_invoices
├─ id (uuid, PK)
├─ invoice_number (text, unique)
├─ customer_id (uuid, FK)
├─ invoice_date (date)
├─ due_date (date)
├─ payment_terms_id (uuid, FK)
├─ subtotal (numeric)
├─ tax_amount (numeric)
├─ total_amount (numeric)
├─ cost_amount (numeric) → for profit calculation
├─ profit_amount (numeric)
├─ status (text) → draft | sent | paid | cancelled
├─ notes (text)
├─ company_id (uuid, FK)
└─ created_by (uuid, FK)

sales_invoice_items
├─ id (uuid, PK)
├─ sales_invoice_id (uuid, FK)
├─ item_type (text) → asset | component
├─ asset_id (uuid, FK, nullable)
├─ component_id (uuid, FK, nullable)
├─ description (text)
├─ quantity (integer)
├─ unit_price (numeric)
├─ line_total (numeric)
├─ cost_amount (numeric)
├─ profit_amount (numeric)
└─ company_id (uuid, FK)
```

---

## Module 5: Purchase Lot Management

### Purpose
Track profitability of each purchase order by grouping all costs and revenues.

### Lot Profit Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                   LOT PROFIT BREAKDOWN                      │
│                   PO-2025-001 (Lot #L-2025-001)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 OVERVIEW                                                │
│  Purchase Date:    Nov 01, 2025                             │
│  Supplier:         Tech Wholesale Inc.                      │
│  Status:           Open (can still receive/process)         │
│  Total Units:      20 received                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  💰 COSTS                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Purchase Cost:                      25,000.00 AED      │ │
│  │ Refurbishment Costs:                 8,500.00 AED      │ │
│  │ ───────────────────────────────────────────────────    │ │
│  │ Total Cost:                         33,500.00 AED      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  💵 REVENUES                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Units Sold:                         15 @ 2,200 avg     │ │
│  │   Revenue:                          33,000.00 AED      │ │
│  │                                                        │ │
│  │ Components Sold:                    25 @ 180 avg       │ │
│  │   Revenue:                           4,500.00 AED      │ │
│  │                                                        │ │
│  │ ───────────────────────────────────────────────────    │ │
│  │ Total Revenue:                      37,500.00 AED      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📈 PROFIT ANALYSIS                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Gross Profit:                        4,000.00 AED      │ │
│  │ Profit Margin:                          10.67%         │ │
│  │ ROI:                                    11.94%         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📦 INVENTORY STATUS                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Units in Processing:                 3                 │ │
│  │ Units Ready to Sell:                 2                 │ │
│  │ Units Sold:                         15                 │ │
│  │ Units Scrapped:                      0                 │ │
│  │                                                        │ │
│  │ Components Harvested:               30                 │ │
│  │ Components Sold:                    25                 │ │
│  │ Components in Stock:                 5                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📋 DETAILED BREAKDOWN                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Serial       Status    Cost    Revenue   Profit       │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ABC123XYZ    Sold      1,750    2,500      750        │ │
│  │ DEF456ABC    Sold      1,200    1,850      650        │ │
│  │ GHI789DEF    Ready       980      --        --        │ │
│  │ JKL012GHI    Refurb    1,450      --        --        │ │
│  │ MNO345JKL    Scrapped   850        0      -850        │ │
│  │ ...                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [Close Lot]  [Export Report]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Lot Database Schema

```sql
purchase_lots
├─ id (uuid, PK)
├─ lot_number (text, unique)
├─ purchase_order_id (uuid, FK)
├─ purchase_date (date)
├─ supplier_id (uuid, FK)
├─ total_cost (numeric) → sum of all asset costs
├─ total_refurb_cost (numeric)
├─ total_revenue (numeric)
├─ total_profit (numeric)
├─ status (text) → open | closed
├─ closed_date (date)
├─ company_id (uuid, FK)
└─ created_at (timestamptz)

Calculation:
───────────
Total Cost = Purchase Cost + Refurbishment Costs
Total Revenue = Asset Sales + Component Sales
Total Profit = Total Revenue - Total Cost
Profit Margin = (Total Profit / Total Revenue) × 100
ROI = (Total Profit / Total Cost) × 100
```

---

## Module 6: Inventory Management

### Purpose
Real-time visibility of stock levels across locations.

### Inventory Views

```
┌─────────────────────────────────────────────────────────────┐
│                     INVENTORY DASHBOARD                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Summary Cards:                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total Units  │ │ Ready to Sell│ │ In Processing│       │
│  │     245      │ │      89      │ │      156     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Components   │ │ Total Value  │ │ Est. Profit  │       │
│  │     423      │ │  412,500 AED │ │   85,000 AED │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  By Product Type:                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Laptop           185 units    Value: 325,000 AED      │ │
│  │ Desktop           42 units    Value:  68,000 AED      │ │
│  │ Server            12 units    Value:  15,000 AED      │ │
│  │ Components       423 units    Value:   4,500 AED      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────���───────────┤
│                                                             │
│  By Location:                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Warehouse A       145 units                            │ │
│  │ Warehouse B        68 units                            │ │
│  │ Service Center     32 units                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Recent Movements:                                         │
│  Nov 19  Moved HP EliteBook (INT-001) → Warehouse A       │
│  Nov 19  Sold Dell Latitude (INT-005)                      │
│  Nov 18  Received 15 units from PO-2025-002                │
│  Nov 18  Scrapped Lenovo T480 (INT-012)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Module 7: Settings & Configuration

### System Settings

```
┌─────────────────────────────────────────────────────────────┐
│                       SETTINGS MENU                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Master Data                                                │
│  ├─ 📦 Product Types (Laptop, Desktop, Server, etc.)        │
│  ├─ 🏢 Companies (Multi-tenant management)                  │
│  ├─ 📍 Locations (Warehouses, service centers)              │
│  ├─ 🏭 Suppliers                                             │
│  ├─ 👥 Customers                                             │
│  └─ 👤 Users & Roles                                         │
│                                                             │
│  Processing Configuration                                  │
│  ├─ 🔄 Processing Stages (custom workflow stages)           │
│  ├─ ✅ Testing Checklist Templates                          │
│  ├─ 🎨 Cosmetic Grades (with colors)                        │
│  ├─ 🏷️  Functional Status options                           │
│  └─ 🛠️  Warranty Types                                       │
│                                                             │
│  Import Intelligence                                       │
│  ├─ 🧠 Field Mapping Rules                                  │
│  ├─ 🔤 Product Type Aliases                                 │
│  ├─ 📋 Model Normalization Rules                            │
│  └─ 💾 Saved Import Templates                               │
│                                                             │
│  Sales Configuration                                       │
│  ├─ 💳 Payment Terms                                         │
│  ├─ 📄 Invoice Templates                                    │
│  ├─ 💰 Component Market Prices                              │
│  └─ 🔄 Return Reasons                                        │
│                                                             │
│  System                                                    │
│  ├─ 🔔 Notifications                                         │
│  ├─ 📊 Reports                                              │
│  └─ 🔐 Security & RLS                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Import Intelligence Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                 IMPORT FIELD MAPPINGS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Field mappings help the system recognize supplier columns │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ System Field: Brand                                    │ │
│  │ Keywords: manufacturer, make, oem, brand name          │ │
│  │ [Edit]  [Delete]                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ System Field: Model                                    │ │
│  │ Keywords: model, model number, part number, sku        │ │
│  │ [Edit]  [Delete]                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ System Field: RAM                                      │ │
│  │ Keywords: memory, ram, ddr, gb ram                     │ │
│  │ Type: Specification                                    │ │
│  │ [Edit]  [Delete]                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [+ Add New Field Mapping]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 5. Data Flow Diagrams

## Complete Purchase-to-Sale Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE BUSINESS FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. PURCHASE
   ├─ Create PO (manual or Excel import)
   ├─ Submit PO
   ├─ Purchase lot created
   └─ Expected receiving items created
              │
              ▼
2. RECEIVING
   ├─ Scan serial numbers
   ├─ Match to PO lines
   ├─ Auto-create assets
   ├─ Link to purchase lot
   └─ Status: "Received"
              │
              ▼
3. PROCESSING
   ├─ Technician scans asset (two-field scan)
   ├─ Assign internal ID (if new)
   ├─ Asset opens → Add specs
   ├─ Testing checklist
   ├─ Refurbishment (component replacement)
   ├─ Grading (cosmetic & functional)
   └─ Status: "Ready"
              │
              ├─────────────┬─────────────┐
              │             │             │
              ▼             ▼             ▼
   4a. SELL COMPLETE  4b. HARVEST     4c. SCRAP
   ├─ Add to invoice  ├─ Remove       ├─ Mark scrapped
   ├─ Set price       │   components  ├─ Scrap reason
   ├─ Generate inv.   ├─ Add to comp  ├─ Deduct from lot
   ├─ Mark as "Sold"  │   inventory   └─ Status: "Scrapped"
   ├─ Profit calc.    └─ Parent
   └─ Lot profit          asset
       updated            scrapped
              │             │
              └──────┬──────┘
                     │
                     ▼
              5. COMPONENT SALE
                 ├─ Component catalog
                 ├─ Add to invoice
                 ├─ Generate invoice
                 ├─ Mark as "Sold"
                 ├─ Profit calculated
                 └─ Lot profit updated
                           │
                           ▼
                    6. LOT CLOSURE
                       ├─ All assets processed
                       ├─ Final profit calculated
                       ├─ ROI determined
                       └─ Status: "Closed"
```

## Barcode Scanning Flow (Two-Field System)

```
┌─────────────────────────────────────────────────────────────┐
│              TWO-FIELD SCANNING SYSTEM                      │
└─────────────────────────────────────────────────────────────┘

User Scans Field 1: [Barcode Value]
         │
         ▼
┌────────────────────┐
│ Search Step 1:     │
│ assets.serial_num  │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   NO    │
    └────┬────┘
         │
         ▼
┌────────────────────────┐
│ Search Step 2:         │
│ asset_internal_ids tbl │
└────────┬───────────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │
    ┌────┼────┐
    │ YES│ NO │
    │    │    │
    ▼    ▼    ▼
 Asset  Asset  Error
 Found  Found  "Not
    │    │    Found"
    └────┼────┘
         │
         ▼
┌────────────────────┐
│ Has internal ID?   │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ YES│ NO │
    │    │    │
    ▼    ▼
Skip  Move to
Field2 Field 2
    │    │
Open  Wait for
Asset Internal
Page  ID Scan
    │    │
    │    ▼
    │ User Scans
    │ Field 2
    │    │
    │    ▼
    │ Link ID
    │ to Asset
    │    │
    └────┼────
         │
         ▼
    Open Asset
    Detail Page
```

## Import Intelligence Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SMART PO IMPORT WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

1. Upload Excel File
   │
   ▼
2. Parse File
   ├─ Detect sheets
   ├─ User selects sheet
   ├─ Extract headers
   └─ Sample data
   │
   ▼
3. Auto-Map Columns (Intelligence)
   ├─ Load field mapping rules
   ├─ Load saved templates
   ├─ Match by keywords
   ├─ Match by aliases
   └─ Suggest mappings
   │
   ▼
4. User Review & Adjust
   ├─ Confirm auto-mappings
   ├─ Manually map unmapped
   ├─ Add custom fields
   └─ Save as template (optional)
   │
   ▼
5. Validate Data
   ├─ Check required fields
   ├─ Validate data types
   ├─ Auto-round costs
   ├─ Check duplicates
   └─ Show preview
   │
   ▼
6. Create PO Lines
   ├─ Insert into purchase_order_lines
   ├─ Handle specifications (jsonb)
   ├─ Apply passthrough fields
   └─ Create expected receiving items
   │
   ▼
7. Learn & Improve
   ├─ Store successful mappings
   ├─ Update field aliases
   └─ Improve future imports
```

---

# 6. Database Schema

## Complete Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA OVERVIEW                      │
└──────────────────────────────────────────────────────────────────┘

companies (Multi-tenant root)
    │
    ├─> profiles (Users)
    │       └─> user_company_access (Role per company)
    │
    ├─> suppliers
    │       └─> purchase_orders
    │               ├─> purchase_order_lines
    │               └─> purchase_lots
    │                       └─> assets
    │                               ├─> asset_internal_ids (NEW)
    │                               ├─> asset_testing_results
    │                               ├─> asset_refurbishment_costs
    │                               ├─> asset_history
    │                               ├─> asset_components
    │                               │       └─> component_sales
    │                               └─> sales_invoice_items
    │
    ├─> customers
    │       └─> sales_invoices
    │               └─> sales_invoice_items
    │
    ├─> locations
    │
    ├─> product_types
    │       ├─> testing_checklist_templates
    │       └─> product_type_aliases
    │
    ├─> cosmetic_grades
    ├─> processing_stages
    ├─> payment_terms
    ├─> warranty_types
    ├─> return_reasons
    ├─> test_result_options
    │
    └─> import_field_mappings (Intelligence)
            ├─> field_mapping_rules
            └─> model_normalization_rules
```

## Key Tables

### Core Tables (40+)

1. **companies** - Multi-tenant root
2. **profiles** - Users
3. **user_company_access** - Role-based access
4. **suppliers** - Vendors
5. **customers** - Buyers
6. **locations** - Warehouses
7. **product_types** - Laptop, Desktop, etc.
8. **purchase_orders** - PO header
9. **purchase_order_lines** - PO line items
10. **purchase_lots** - Profit tracking
11. **expected_receiving_items** - What to receive
12. **assets** - Main inventory
13. **asset_internal_ids** - Multiple IDs per asset (NEW)
14. **asset_testing_results** - Test outcomes
15. **asset_refurbishment_costs** - Refurb expenses
16. **asset_history** - Audit trail
17. **asset_components** - Harvested parts
18. **component_sales** - Component revenue
19. **sales_invoices** - Invoice header
20. **sales_invoice_items** - Invoice lines
21. **cosmetic_grades** - A, B, C grades with colors
22. **processing_stages** - Custom workflow stages
23. **payment_terms** - Net 30, Net 60, etc.
24. **warranty_types** - Warranty options
25. **return_reasons** - RMA reasons
26. **test_result_options** - Pass/Fail/Issue presets
27. **testing_checklist_templates** - By product type
28. **import_field_mappings** - Smart import AI
29. **field_mapping_rules** - Keyword matching
30. **product_type_aliases** - Laptop = Notebook
31. **model_normalization_rules** - Clean model names
32. **user_location_access** - Location permissions
33. **stock_movements** - Inventory movements
34. **receiving_logs** - Receiving history

---

# 7. Complete Workflows

## Workflow 1: Complete Asset Lifecycle

```
Day 1: Purchase
├─ Create PO from supplier price list (Excel)
├─ 50 units @ avg 1,200 AED = 60,000 AED
├─ Submit PO → Lot L-2025-001 created
└─ Status: Awaiting delivery

Day 5: Receiving
├─ Shipment arrives with 50 units
├─ Scan serial numbers (Smart Receiving)
├─ System matches to PO lines
├─ Assets auto-created
├─ Each asset: Status = "Received"
└─ PO Status: "Completed"

Day 6-20: Processing
├─ Technician scans asset: ABC123XYZ
├─ No internal ID → Scan INT-001
├─ Asset opens → Enter specs:
│   ├─ CPU: i7-1185G7
│   ├─ RAM: 16GB
│   ├─ Storage: 512GB SSD
│   └─ Display: 14" FHD
├─ Testing checklist:
│   ├─ Display: Pass
│   ├─ Keyboard: Pass
│   ├─ Battery: Fail → Replace (450 AED)
│   └─ Total refurb: 450 AED
├─ Grading: Excellent (A)
└─ Status: "Ready"

Day 21: Sale
├─ Add to invoice
├─ Sell price: 2,500 AED
├─ Invoice generated
├─ Asset marked "Sold"
└─ Profit: 2,500 - 1,200 - 450 = 850 AED

Lot Summary (After 50 units):
├─ Total Cost: 60,000 + 18,000 (refurb) = 78,000 AED
├─ Revenue: 45 sold @ 2,200 avg = 99,000 AED
│            3 scrapped = 0 AED
│            Components sold = 5,000 AED
├─ Total Revenue: 104,000 AED
├─ Profit: 26,000 AED
├─ ROI: 33.3%
└─ Lot closed
```

## Workflow 2: Component Harvesting & Sale

```
Asset is beyond repair:
├─ Purchase cost: 800 AED
├─ Cannot be refurbished economically
└─ Decision: Harvest components

Harvesting:
├─ RAM 16GB → Market value: 180 AED
├─ SSD 512GB → Market value: 320 AED
├─ Battery (good) → Market value: 280 AED
├─ Screen 14" FHD → Market value: 450 AED
└─ Total harvest value: 1,230 AED

Cost Allocation:
├─ Distribute 800 AED across 4 components
├─ RAM cost: 117 AED
├─ SSD cost: 208 AED
├─ Battery cost: 182 AED
└─ Screen cost: 293 AED

Component Sales:
├─ RAM sold for 180 AED → Profit: 63 AED
├─ SSD sold for 320 AED → Profit: 112 AED
├─ Battery sold for 280 AED → Profit: 98 AED
└─ Screen sold for 450 AED → Profit: 157 AED

Total from harvested asset:
├─ Revenue: 1,230 AED
├─ Cost: 800 AED
└─ Profit: 430 AED (vs. 0 if scrapped)
```

## Workflow 3: Multi-ID Component Replacement

```
Asset: HP EliteBook 840 G8
├─ Serial: ABC123XYZ
├─ Internal ID: INT-001 (on back panel)
└─ Status: Refurbishing

Issue: Back panel damaged, needs replacement
├─ Remove old back panel
├─ INT-001 barcode physically removed
└─ Install new back panel

Add new internal ID:
├─ Open Asset Detail Page
├─ Click "+ Add ID"
├─ Scan new barcode: INT-002
├─ Reason: "Back panel replaced - damaged hinge"
└─ Save

Result:
├─ Asset now has 2 internal IDs:
│   ├─ INT-001 (Primary, no longer on device)
│   └─ INT-002 (Active, on new back panel)
└─ Both IDs work for scanning ✅

Future scanning:
├─ Can scan ABC123XYZ (serial) ✅
├─ Can scan INT-001 (if old panel found) ✅
├─ Can scan INT-002 (current panel) ✅
└─ All 3 open same asset!

Benefits:
├─ Never lose track of asset
├─ Full component replacement history
├─ Multiple scan points on device
└─ Audit trail maintained
```

---

# 8. API Integration

## Supabase Client

```typescript
// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);
```

## Common Operations

### Query with RLS

```typescript
// Automatically filtered by company_id (RLS)
const { data: assets } = await supabase
  .from('assets')
  .select(`
    *,
    product_types (name),
    locations (name),
    profiles:assigned_technician_id (full_name)
  `)
  .eq('status', 'In Stock')
  .order('created_at', { ascending: false });
```

### Insert with Auto-Fields

```typescript
// company_id, created_by auto-set via triggers
const { data, error } = await supabase
  .from('assets')
  .insert({
    serial_number: 'ABC123XYZ',
    brand: 'HP',
    model: 'EliteBook 840 G8',
    product_type_id: productTypeId,
    status: 'Received'
  })
  .select()
  .single();
```

### Realtime Subscription

```typescript
// Listen for asset changes
const channel = supabase
  .channel(`assets-${companyId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'assets',
      filter: `company_id=eq.${companyId}`
    },
    (payload) => {
      console.log('Asset changed:', payload);
      fetchAssets(); // Refresh UI
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

# 9. User Roles & Permissions

## Permission Matrix

```
┌───────────────────────────────────────────────────────────────────────┐
│                       PERMISSION MATRIX                               │
├───────────┬───────┬─────────┬───────┬────────────┬─────────┬─────────┤
│ Feature   │ Super │ Admin   │ Mgr   │ Staff      │ Tech    │ Viewer  │
│           │ Admin │         │       │            │         │         │
├───────────┼───────┼─────────┼───────┼────────────┼─────────┼─────────┤
│ POs       │       │         │       │            │         │         │
│ - Create  │   ✓   │    ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ - Edit    │   ✓   │    ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ - Delete  │   ✓   │    ✓    │   ✗   │     ✗      │    ✗    │    ✗    │
│ - View    │   ✓   │    ✓    │   ✓   │     ✓      │    ✗    │    ✓    │
├───────────┼───────┼─────────┼───────┼────────────┼─────────┼─────────┤
│ Assets    │       │         │       │            │         │         │
│ - Create  │   ✓   │    ✓    │   ✓   │     ✓      │    ✓    │    ✗    │
│ - Edit    │   ✓   │    ✓    │   ✓   │     ✓      │    ✓    │    ✗    │
│ - Delete  │   ✓   │    ✓    │   ✗   │     ✗      │    ✗    │    ✗    │
│ - Scan    │   ✓   │    ✓    │   ✓   │     ✓      │    ✓    │    ✗    │
├───────────┼───────┼─────────┼───────┼────────────┼─────────┼─────────┤
│ Sales     │       │         │       │            │         │         │
│ - Create  │   ✓   │    ✓    │   ✓   │     ✓      │    ✗    │    ✗    │
│ - Edit    │   ✓   │    ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│ - Delete  │   ✓   │    ✓    │   ✗   │     ✗      │    ✗    │    ✗    │
│ - View    │   ✓   │    ✓    │   ✓   │     ✓      │    ✗    │    ✓    │
├───────────┼───────┼─────────┼───────┼────────────┼─────────┼─────────┤
│ Reports   │       │         │       │            │         │         │
│ - Profit  │   ✓   │    ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│ - Invent. │   ✓   │    ✓    │   ✓   │     ✓      │    ✓    │    ✓    │
│ - Sales   │   ✓   │    ✓    │   ✓   │     ✗      │    ✗    │    ✓    │
├───────────┼───────┼─────────┼───────┼────────────┼─────────┼─────────┤
│ Settings  │       │         │       │            │         │         │
│ - Company │   ✓   │    ✓    │   ✗   │     ✗      │    ✗    │    ✗    │
│ - Users   │   ✓   │    ✓    │   ✗   │     ✗      │    ✗    │    ✗    │
│ - Master  │   ✓   │    ✓    │   ✓   │     ✗      │    ✗    │    ✗    │
│   Data    │       │         │       │            │         │         │
└───────────┴───────┴─────────┴───────┴────────────┴─────────┴─────────┘
```

---

# 10. Advanced Features

## Feature 1: Import Intelligence

### Purpose
Learn from past imports to automatically map supplier columns to system fields.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              IMPORT INTELLIGENCE SYSTEM                     │
└─────────────────────────────────────────────────────────────┘

1. Keyword Matching
   ├─ System field: "Brand"
   ├─ Keywords: "manufacturer", "make", "oem", "brand"
   └─ Supplier column: "Manufacturer" → Auto-maps to "Brand"

2. Alias Recognition
   ├─ System field: "Product Type"
   ├─ Aliases: "Laptop" = "Notebook"
   └─ Supplier value: "Notebook" → Converted to "Laptop"

3. Learning Engine
   ├─ User manually maps "Maker" → "Brand"
   ├─ System stores: "Maker" is keyword for "Brand"
   └─ Next import with "Maker" → Auto-mapped!

4. Template Saving
   ├─ User completes mapping for Supplier A
   ├─ Saves as "Supplier A Template"
   └─ Future imports from Supplier A → Instant mapping!

5. Model Normalization
   ├─ Supplier data: "HP EliteBook 840 G8"
   ├─ System extracts: Brand="HP", Model="EliteBook 840 G8"
   ├─ Normalizes: "840G8" → "840 G8"
   └─ Consistent data across system
```

## Feature 2: Passthrough Fields

### Purpose
Handle dynamic specifications without hardcoding database columns.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                 PASSTHROUGH FIELD SYSTEM                    │
└─────────────────────────────────────────────────────────────┘

Problem:
├─ Different product types have different specs
├─ Laptop: CPU, RAM, Storage, Display
├─ Server: CPU, RAM, HDDs (8x), RAID, Network
└─ Can't hardcode all possible specs!

Solution: JSONB specifications column
├─ Store dynamic key-value pairs
├─ No schema changes needed
└─ Flexible for any product type

Example:
{
  "CPU": "Intel Xeon E5-2680 v4",
  "RAM": "128 GB",
  "HDD1": "2 TB",
  "HDD2": "2 TB",
  "HDD3": "2 TB",
  "HDD4": "2 TB",
  "RAID": "RAID 5",
  "Network": "10 GbE"
}

Detection:
├─ System recognizes common specs
├─ Unknown columns → Marked as passthrough
└─ User confirms or edits mapping
```

## Feature 3: Smart Auto-Create

### Purpose
Automatically create master data (suppliers, customers, brands) during import.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                SMART AUTO-CREATE SYSTEM                     │
└─────────────────────────────────────────────────────────────┘

Scenario: Importing PO with new supplier
├─ Excel row: Supplier = "Tech Wholesale LLC"
├─ System checks: Does "Tech Wholesale LLC" exist?
└─ Not found → Prompt user

Modal appears:
┌────────────────────────────────────────────────────┐
│ New Supplier Detected                              │
├────────────────────────────────────────────────────┤
│ "Tech Wholesale LLC" not found in system.          │
│                                                    │
│ [✓] Auto-create supplier                          │
│ [ ] Skip this supplier                            │
│ [ ] Map to existing: [Select ▼]                   │
│                                                    │
│ [Confirm]  [Cancel]                                │
└────────────────────────────────────────────────────┘

User confirms → Supplier created
└─ Continue import without interruption

Also works for:
├─ Brands
├─ Product types
├─ Customers
└─ Any master data
```

## Feature 4: Component Auto-Creation

### Purpose
Automatically detect and create component entries from asset specifications.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│            COMPONENT AUTO-CREATION SYSTEM                   │
└─────────────────────────────────────────────────────────────┘

When asset created with specs:
├─ CPU: Intel Core i7-1185G7
├─ RAM: 16GB DDR4
├─ Storage: 512GB SSD
├─ Display: 14" FHD
└─ Battery: 56Wh

System automatically creates component records:
├─ Component: RAM 16GB
│   ├─ Type: RAM
│   ├─ Specs: 16GB DDR4
│   ├─ Status: Installed (in parent asset)
│   └─ Parent: ABC123XYZ
│
├─ Component: SSD 512GB
│   ├─ Type: Storage
│   ├─ Specs: 512GB NVMe SSD
│   ├─ Status: Installed
│   └─ Parent: ABC123XYZ
│
└─ Component: Display 14"
    ├─ Type: Screen
    ├─ Specs: 14" FHD
    ├─ Status: Installed
    └─ Parent: ABC123XYZ

Benefits:
├─ Ready for harvesting if needed
├─ Component inventory tracking
├─ Upgrade path visibility
└─ Spare parts management
```

## Feature 5: Model Normalization

### Purpose
Clean and standardize model names from various suppliers.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              MODEL NORMALIZATION SYSTEM                     │
└─────────────────────────────────────────────────────────────┘

Supplier variations:
├─ "HP EliteBook 840G8"
├─ "HP-EliteBook-840-G8"
├─ "HP EliteBook 840 G8"
├─ "EliteBook840G8"
└─ "HP 840G8 EliteBook"

Normalization rules:
├─ Remove brand prefix if in brand column
├─ Add spaces before numbers
├─ Standardize separators
├─ Reorder to standard format
└─ Result: "EliteBook 840 G8"

Stored rules:
┌────────────────────────────────────────────────┐
│ Pattern          → Replacement                 │
├────────────────────────────────────────────────┤
│ ([A-Z])([0-9])   → $1 $2  (G8 → G 8)          │
│ -                → (space)                     │
│ {brand}          → (remove)                    │
└────────────────────────────────────────────────┘

Benefits:
├─ Consistent inventory data
├─ Better search results
├─ Accurate duplicate detection
└─ Professional reports
```

---

# Conclusion

StockPro is a comprehensive IT asset management platform that handles the complete lifecycle from purchase to sale. With intelligent automation, flexible configuration, and robust tracking, it empowers IT resellers to maximize profitability while maintaining complete visibility.

## Key Strengths

1. **Smart Import** - AI-powered column mapping saves hours
2. **Two-Field Scanning** - Zero-click workflow for processing
3. **Multiple Internal IDs** - Never lose track of assets
4. **Component Tracking** - Maximize value from every unit
5. **Lot Profit Reports** - Know your ROI instantly
6. **Flexible Configuration** - Adapt to your workflow
7. **Multi-Tenant** - Unlimited companies in one system
8. **Real-Time Updates** - Always current data
9. **Comprehensive History** - Full audit trail
10. **Scalable Architecture** - Grows with your business

---

**End of Documentation**

*For technical support or feature requests, contact your system administrator.*
