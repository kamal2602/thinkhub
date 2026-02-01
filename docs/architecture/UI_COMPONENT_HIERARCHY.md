# UI Component Hierarchy & Usage Guide

## Application Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  AppShell                                                    │
│  ┌──────────┬────────────────────────────────────────────┐ │
│  │ Sidebar  │ TopBar                                      │ │
│  │          │ ┌────────────────────────────────────────┐ │ │
│  │ Home     │ │ [Search ⌘K]  [🔔]  [User Menu]        │ │ │
│  │ Acquire  │ └────────────────────────────────────────┘ │ │
│  │ Recycle  │                                            │ │
│  │ Inventory│ MainContent                                │ │
│  │ Sell     │ ┌────────────────────────────────────────┐ │ │
│  │ Finance  │ │                                        │ │ │
│  │ Reports  │ │  [Page Content]                        │ │ │
│  │ Admin    │ │                                        │ │ │
│  │          │ │                                        │ │ │
│  │          │ └────────────────────────────────────────┘ │ │
│  └──────────┴────────────────────────────────────────────┘ │
│                                                              │
│  CommandPalette (overlay when ⌘K pressed)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Page Type 1: Homepage Launchpad

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, Alex                                          │
│  Quick access to all your workflows                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ACQUIRE                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ [📦]  23 │  │ [📥]   5 │  │ [🏢]  12 │                  │
│  │ Purchase │  │ Receiving│  │ Suppliers│                  │
│  │ Lots     │  │          │  │          │                  │
│  │────────  │  │          │  │          │                  │
│  │ Open │Cr │  │          │  │          │  ← Hover actions │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  RECYCLE                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ ...      │  │ ...      │  │ ...      │                  │
│                                                              │
│  [More sections...]                                          │
└─────────────────────────────────────────────────────────────┘

Component Hierarchy:
HomeLaunchpad
├─ ProcessSection (Acquire)
│  ├─ ProcessTile (Purchase Lots)
│  ├─ ProcessTile (Receiving)
│  └─ ProcessTile (Suppliers)
├─ ProcessSection (Recycle)
│  └─ ...
└─ ProcessSection (...)
```

---

## Page Type 2: Standard Workspace

```
┌─────────────────────────────────────────────────────────────┐
│  WorkspaceHeader                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Purchase Lots                      [+ New Purchase Lot]│ │
│  │ Track incoming inventory and cost basis               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  WorkspaceFilters                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [🔍 Search...] [Filters (2)] [Clear]                   │ │
│  │                                                        │ │
│  │ ┌ Active Filters ─────────────────────────────────┐   │ │
│  │ │ [Status: Received ×] [Date: 2024-01 ×]         │   │ │
│  │ └─────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  WorkspaceTable                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Lot Number  │ Supplier  │ Items │ Cost    │ Status   │ │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ LOT-001234  │ Dell Inc  │  250  │ $15,000 │ Received │ │ │
│  │ LOT-001235  │ HP LLC    │  180  │ $12,500 │ Draft    │ │ │
│  │ ...                                                    │ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [DetailDrawer opens on row click →]                         │
└─────────────────────────────────────────────────────────────┘

Component Hierarchy:
Page Component
├─ WorkspaceHeader
│  ├─ title, subtitle
│  └─ primaryAction, secondaryActions
├─ WorkspaceFilters
│  ├─ searchValue, onSearchChange
│  ├─ filters array
│  └─ activeFilters badges
└─ WorkspaceTable
   ├─ columns definition
   ├─ data array
   └─ onRowClick → opens DetailDrawer
```

---

## Component Type 3: Detail Drawer

```
                                    ┌─────────────────────────┐
                                    │ [×] Purchase Lot        │
                                    │     LOT-001234          │
                                    │     Dell Inc • 250 items│
                                    ├─────────────────────────┤
                                    │ DETAILS                 │
                                    │ Supplier: Dell Inc      │
                                    │ Date: 2024-01-15       │
                                    │ Total Cost: $15,000    │
                                    │ Total Items: 250       │
                                    │                         │
                                    │ INVENTORY ITEMS (45)    │
                                    │ ├─ Laptop Dell (25)    │
                                    │ ├─ Monitor 24" (15)    │
                                    │ └─ Keyboard (5)        │
                                    │    [View All →]        │
                                    │                         │
                                    │ TRACEABILITY CHAIN      │
                                    │ ┌─────────────────────┐│
                                    │ │ [📦] Purchase Lot   ││
                                    │ │ LOT-001234          ││
                                    │ │ $15,000             ││
                                    │ └─────────────────────┘│
                                    │         ↓               │
                                    │ ┌─────────────────────┐│
                                    │ │ [📦] Inventory      ││
                                    │ │ 45 Items            ││
                                    │ └─────────────────────┘│
                                    │         ↓               │
                                    │ ┌─────────────────────┐│
                                    │ │ [⚖️] Auction        ││
                                    │ │ AUC-000501          ││
                                    │ └─────────────────────┘│
                                    │         ↓               │
                                    │ ┌─────────────────────┐│
                                    │ │ [📄] Sales Order    ││
                                    │ │ SO-001789           ││
                                    │ └─────────────────────┘│
                                    │         ↓               │
                                    │ ┌─────────────────────┐│
                                    │ │ [🧾] Invoice        ││
                                    │ │ INV-000123          ││
                                    │ │ $4,000 (40% margin) ││
                                    │ └─────────────────────┘│
                                    ├─────────────────────────┤
                                    │ [Edit] [Export] [Delete]│
                                    └─────────────────────────┘

Component Hierarchy:
DetailDrawer
├─ title, subtitle
├─ children
│  ├─ DetailSection (Details)
│  │  └─ DetailField × N
│  ├─ DetailSection (Related Items)
│  │  └─ DetailList
│  └─ DetailSection (Traceability)
│     └─ TraceabilityChain
│        └─ ChainNode × N
└─ footer (action buttons)
```

---

## Atomic Component Hierarchy

### Level 1: Atoms (Basic UI Elements)

```
Button
├─ Variants: primary, secondary, ghost, danger
├─ Sizes: sm, md, lg
├─ States: default, hover, disabled, loading
└─ Props: icon, iconPosition, fullWidth

Input
├─ States: default, hover, focus, error, disabled
├─ Addons: leftIcon, rightIcon
└─ Props: label, error, helperText

Badge
├─ Variants: primary, success, warning, error, neutral, info
├─ Sizes: sm, md
└─ Props: dot

Card
├─ Variants: default, hover
├─ Padding: none, sm, md, lg
└─ Subcomponents: CardHeader, CardTitle, CardContent, CardFooter

Select
├─ States: default, hover, focus, error, disabled
└─ Props: label, error, helperText, options

EmptyState
├─ Parts: icon, title, description
└─ Actions: primaryAction, secondaryAction
```

### Level 2: Molecules (Composed Elements)

```
ProcessTile
├─ Uses: Card (with hover)
├─ Contains: Icon, Label, Description, Count Badge
└─ Hover Actions: Open, Create buttons

DetailField
├─ Parts: Label (dt), Value (dd)
└─ Types: text, badge, link

WorkspaceHeader
├─ Uses: Button
├─ Parts: Title, Subtitle, Back Button
└─ Actions: Primary, Secondary[]

WorkspaceFilters
├─ Uses: Input, Select, Badge, Button
├─ Parts: Search, Filter Toggle, Active Filters
└─ Panel: Filter Grid

WorkspaceTable
├─ Parts: Header, Body, Empty State, Loading State
├─ Features: Sorting, Row Click, Row Actions
└─ Uses: Card wrapper
```

### Level 3: Organisms (Complex Components)

```
Sidebar
├─ Uses: Button-like items
├─ Structure: Sections → Items
└─ Features: Collapsible, Active State, Engine-Aware

TopBar
├─ Uses: Button, Input-like search trigger
├─ Parts: Search, Notifications, User Menu
└─ Features: Dropdown Menu, Avatar

DetailDrawer
├─ Uses: Button (close), Card-like structure
├─ Parts: Header, Scrollable Content, Footer
└─ Subcomponents: DetailSection, DetailField, DetailList

TraceabilityChain
├─ Uses: Badge, Card-like nodes
├─ Structure: ChainNode[]
└─ Orientations: vertical, horizontal

HomeLaunchpad
├─ Uses: ProcessSection, ProcessTile
├─ Structure: Sections grouped by business stage
└─ Features: Dynamic counts, Engine-aware
```

### Level 4: Templates (Layout Patterns)

```
AppShell
├─ Layout: Sidebar + TopBar + MainContent
├─ Features: Command Palette integration
└─ Responsive: Fixed sidebar/topbar, scrollable content

Standard Workspace Pattern
├─ WorkspaceHeader
├─ WorkspaceFilters
├─ WorkspaceTable
└─ DetailDrawer (on demand)
```

---

## State Management Pattern

```
Page Component (Smart)
│
├─ Local State
│  ├─ data: T[]
│  ├─ loading: boolean
│  ├─ search: string
│  ├─ filters: Record<string, any>
│  ├─ sortColumn: string
│  ├─ sortDirection: 'asc' | 'desc'
│  ├─ drawerOpen: boolean
│  └─ selectedItem: T | null
│
├─ Effects
│  ├─ useEffect(() => loadData(), [filters, search])
│  └─ useEffect(() => loadCounts(), [])
│
└─ Render
   ├─ <WorkspaceHeader primaryAction={...} />
   ├─ <WorkspaceFilters
   │    searchValue={search}
   │    filters={filterConfig}
   │    activeFilters={filters}
   │  />
   ├─ <WorkspaceTable
   │    data={filteredData}
   │    onRowClick={handleRowClick}
   │    sortColumn={sortColumn}
   │    sortDirection={sortDirection}
   │  />
   └─ <DetailDrawer
        open={drawerOpen}
        title={selectedItem?.name}
      >
        {selectedItem && (
          <>
            <DetailSection title="Details">...</DetailSection>
            <TraceabilityChain nodes={...} />
          </>
        )}
      </DetailDrawer>
```

---

## Responsive Behavior

### Desktop (>1024px)
```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │ TopBar                                        │
│ (240px)  │ ┌──────────────────────────────────────────┐ │
│          │ │ Content Area                              │ │
│ Visible  │ │                                           │ │
│ Fixed    │ │                                           │ │
│          │ │                                           │ │
└──────────┴──────────────────────────────────────────────┘
```

### Tablet (768-1024px)
```
┌─┬─────────────────────────────────────────────────────┐
│☰│ TopBar                                               │
│ │ ┌─────────────────────────────────────────────────┐ │
│ │ │ Content Area                                     │ │
│ │ │                                                  │ │
│ │ │                                                  │ │
└─┴─────────────────────────────────────────────────────┘
   Sidebar: Collapsible (hamburger menu)
```

### Mobile (<768px)
```
┌─────────────────────────────────────────────────────┐
│ ☰  StockPro              🔍  🔔  👤                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Content as stacked cards]                          │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│ [🏠] [📦] [♻️] [📊] [⚙️]   ← Bottom Tab Bar         │
└─────────────────────────────────────────────────────┘
```

---

## Color-Coding by Authority Layer

```
TraceabilityChain Node Colors:

┌─────────────────────┐
│ [📦 Blue]           │  Purchase Lot (Cost Authority)
│ LOT-001234          │  Establishes unit cost
└─────────────────────┘

┌─────────────────────┐
│ [🗄️ Green]          │  Inventory (Catalog Authority)
│ INV-045678          │  Defines product catalog
└─────────────────────┘

┌─────────────────────┐
│ [⚖️ Purple]         │  Auction (Orchestration)
│ AUC-000501          │  Coordinates sale mechanism
└─────────────────────┘

┌─────────────────────┐
│ [📄 Orange]         │  Sales Order (Commitment)
│ SO-001789           │  Customer commitment
└─────────────────────┘

┌─────────────────────┐
│ [🧾 Red]            │  Invoice (Billing Authority)
│ INV-AUC-000123      │  Final billing record
└─────────────────────┘
```

---

## Usage Checklist

When creating a new workspace page:

- [ ] Use `WorkspaceHeader` for title and primary action
- [ ] Use `WorkspaceFilters` for search and filtering
- [ ] Use `WorkspaceTable` for data grid
- [ ] Implement `DetailDrawer` for record details
- [ ] Add `TraceabilityChain` in drawer (if applicable)
- [ ] Use `EmptyState` when no data
- [ ] Check `engines` before showing engine-specific features
- [ ] Add loading states
- [ ] Add error handling
- [ ] Make table rows clickable
- [ ] Add keyboard shortcuts (ESC to close drawer)

---

## Design Token Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-600` | #2563eb | Primary buttons, links, active states |
| `--color-text-primary` | #111827 | Main text, headings |
| `--color-text-secondary` | #4b5563 | Supporting text, labels |
| `--color-surface` | #ffffff | Cards, drawers, modals |
| `--color-background` | #f9fafb | Page background |
| `--spacing-md` | 16px | Standard component padding |
| `--card-radius` | 12px | All cards and panels |
| `--button-radius` | 8px | All buttons and inputs |
| `--transition-fast` | 150ms | Hovers, toggles |
| `--transition-base` | 250ms | Drawers, modals |
| `--sidebar-width` | 240px | Fixed sidebar width |
| `--topbar-height` | 64px | Fixed topbar height |

---

## Summary

This component hierarchy provides:

1. **Clear separation of concerns** - atoms → molecules → organisms → templates
2. **Consistent patterns** - every workspace follows the same structure
3. **Reusable building blocks** - compose pages from standardized components
4. **Visual clarity** - authority chain visible throughout
5. **Responsive foundation** - layout adapts to screen size
6. **Engine-aware** - components check toggles and hide when disabled

The next step is to refactor existing workspace components to use these patterns, creating a unified, professional user experience.
