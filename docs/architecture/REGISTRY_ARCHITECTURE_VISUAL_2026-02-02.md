# Registry Architecture - Visual Guide

## System Flow Diagram

### BEFORE: Fragmented Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└────────────┬────────────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │   Clicks Link   │
     └───────┬────────┘
             │
     ┌───────▼────────────────────────────────────────────────┐
     │                  MULTIPLE SOURCES                       │
     │  ┌──────────┐  ┌──────────┐  ┌────────────┐           │
     │  │ engines  │  │ engine_  │  │ PageRouter │           │
     │  │  table   │  │ toggles  │  │ hardcoded  │           │
     │  └──────────┘  └──────────┘  └────────────┘           │
     └─────────────────────┬──────────────────────────────────┘
                           │
                    ❌ PROBLEMS:
                    - Which is truth?
                    - Data inconsistency
                    - No URL routing
                    - Split logic
                           │
     ┌─────────────────────▼──────────────────────────────────┐
     │              STATE-BASED ROUTING                        │
     │  PageRouter checks internal state variable              │
     │  No URL change → No history → No deep linking           │
     └─────────────────────┬──────────────────────────────────┘
                           │
     ┌─────────────────────▼──────────────────────────────────┐
     │              RENDERS COMPONENT                          │
     │  ❌ User hits refresh → Lost state                      │
     │  ❌ User shares URL → Wrong page                        │
     │  ❌ Browser back → Doesn't work                         │
     └─────────────────────────────────────────────────────────┘
```

### AFTER: Unified Registry Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└────────────┬────────────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │   Clicks Link   │
     │  (React Router) │
     └───────┬────────┘
             │
             ├─── URL Changes (e.g., /processing)
             │
     ┌───────▼─────────────────────────────────────────────────┐
     │              SINGLE SOURCE OF TRUTH                      │
     │                                                           │
     │           ┌─────────────────────────┐                    │
     │           │  engines table (DB)     │                    │
     │           │  - is_installed         │                    │
     │           │  - is_enabled           │                    │
     │           │  - depends_on           │                    │
     │           │  - workspace_route      │                    │
     │           └──────────┬──────────────┘                    │
     │                      │                                    │
     │           ┌──────────▼──────────────┐                    │
     │           │ engineRegistryService   │                    │
     │           │ (with 5s cache)         │                    │
     │           └──────────┬──────────────┘                    │
     └──────────────────────┼───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    Dashboard          Sidebar               Apps
    (Installed)       (Enabled)          (All/Install)
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
     ┌──────────────────────▼──────────────────────────────────┐
     │                  URL ROUTING                             │
     │  React Router → EngineRouter → ModuleGuard               │
     │  ✅ URL changes with navigation                          │
     │  ✅ Browser history works                                │
     └─────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐  ┌────▼────┐
              │  Enabled?  │  │Disabled?│
              └─────┬─────┘  └────┬────┘
                    │             │
              ┌─────▼─────┐  ┌────▼─────────────┐
              │  Render   │  │  ModuleGuard     │
              │ Component │  │  Gate Page       │
              └───────────┘  │  - Show message  │
                             │  - CTA to /apps  │
                             └──────────────────┘
```

## Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER LANDS ON PAGE                         │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                     ┌──────▼───────┐
                     │  App.tsx     │
                     │ BrowserRouter│
                     └──────┬───────┘
                            │
                     ┌──────▼────────────┐
                     │ ModularAppShell   │
                     │  ┌─────────────┐  │
                     │  │ GlobalTopBar│  │
                     │  └─────────────┘  │
                     │  ┌─────────────┐  │
                     │  │  Sidebar    │  │ ← Reads: getEnabledEngines()
                     │  │  (enabled   │  │
                     │  │   modules)  │  │
                     │  └─────────────┘  │
                     │  ┌─────────────┐  │
                     │  │   Routes    │  │
                     │  └──────┬──────┘  │
                     └─────────┼─────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼─────┐ ┌─────▼─────┐ ┌─────▼──────┐
         │    /        │ │ /dashboard│ │    /*      │
         │  Dashboard  │ │ Dashboard │ │ EngineRouter│
         └──────┬──────┘ └───────────┘ └─────┬──────┘
                │                            │
                │                     ┌──────▼──────┐
                │                     │All routes   │
                │                     │wrapped in   │
                │                     │ModuleGuard  │
                │                     └──────┬──────┘
                │                            │
                │                     ┌──────▼──────────┐
                │                     │ ModuleGuard     │
                │                     │ checks enabled? │
                │                     └──────┬──────────┘
                │                            │
                │                   ┌────────┴────────┐
                │                   │                 │
                │              ┌────▼────┐      ┌────▼────┐
                │              │ Enabled │      │Disabled │
                │              └────┬────┘      └────┬────┘
                │                   │                │
                │              ┌────▼─────┐    ┌────▼─────┐
                │              │Component │    │Gate Page │
                │              │ Renders  │    │          │
                │              └──────────┘    └──────────┘
                │
                └─► Shows installed modules (enabled + disabled)
                    - Enabled: Clickable, navigates
                    - Disabled: Shows lock, CTA to /apps
```

## Data Flow by Feature

### 1. Sidebar Navigation

```
RegistryDrivenSidebar
        │
        ▼
engineRegistryService.getEnabledEngines(companyId)
        │
        ▼
SELECT * FROM engines
WHERE company_id = ?
  AND is_installed = true
  AND is_enabled = true
        │
        ▼
Group by category
        │
        ▼
Render NavLinks with workspace_route
```

### 2. Dashboard Tiles

```
EngineDrivenDashboard
        │
        ▼
engineRegistryService.getInstalledEngines(companyId)
        │
        ▼
SELECT * FROM engines
WHERE company_id = ?
  AND is_installed = true
        │
        ▼
For each engine:
  - If enabled: Show tile with stats, clickable
  - If disabled: Show tile with lock, "Enable in Apps"
```

### 3. Apps Management

```
AppsInstaller
        │
        ▼
engineRegistryService.getEngines(companyId)
        │
        ▼
SELECT * FROM engines
WHERE company_id = ?
        │
        ▼
For each engine:
  - Not installed: "Install" button
  - Installed + Enabled: Green "Enabled" button
  - Installed + Disabled: Blue "Enable Module" button
```

### 4. Route Protection

```
User navigates to /recycling
        │
        ▼
EngineRouter matches route
        │
        ▼
<ModuleGuard> wraps component
        │
        ▼
engineRegistryService.getModuleByKey(companyId, 'recycling')
        │
        ▼
Check: is_installed && is_enabled?
        │
        ├─ YES: Render component
        │
        └─ NO: Render gate page with:
               - Module info
               - "Go to Apps" button
               - "Back to Dashboard" button
```

## Caching Strategy

```
┌────────────────────────────────────────┐
│   Request: getEnabledEngines()         │
└──────────────┬─────────────────────────┘
               │
        ┌──────▼──────┐
        │ Check cache │
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │             │
    ┌───▼───┐    ┌────▼─────┐
    │ Hit   │    │  Miss    │
    │(< 5s) │    │ (> 5s)   │
    └───┬───┘    └────┬─────┘
        │             │
        │        ┌────▼─────────┐
        │        │ Query DB     │
        │        └────┬─────────┘
        │             │
        │        ┌────▼─────────┐
        │        │ Cache result │
        │        │ (5s TTL)     │
        │        └────┬─────────┘
        │             │
        └─────────────┘
                  │
           ┌──────▼───────┐
           │ Return data  │
           └──────────────┘

Cache Invalidation Triggers:
- toggleEngine()
- installEngine()
- uninstallEngine()
- enableWithDependencies()
```

## State Transitions

### Module Lifecycle

```
┌─────────────┐
│  NOT IN DB  │
│  (system)   │
└──────┬──────┘
       │ Migration creates entry
       ▼
┌──────────────────┐
│  is_installed:   │
│  false           │ ← Appears: Nowhere
│  is_enabled:     │
│  false           │
└──────┬───────────┘
       │ User clicks "Install" in Apps
       ▼
┌──────────────────┐
│  is_installed:   │
│  true            │ ← Appears: Dashboard, Apps
│  is_enabled:     │    Shows: "Enable Module" button
│  true            │
└──────┬───────────┘
       │ User toggles OFF in Apps
       ▼
┌──────────────────┐
│  is_installed:   │
│  true            │ ← Appears: Dashboard, Apps
│  is_enabled:     │    Shows: Disabled state
│  false           │    Sidebar: Hidden
└──────┬───────────┘
       │ User toggles ON in Apps
       ▼
┌──────────────────┐
│  is_installed:   │
│  true            │ ← Appears: Dashboard, Sidebar, Apps
│  is_enabled:     │    Access: Full route access
│  true            │    Shows: "Enabled" state
└──────────────────┘
```

## URL Routing Map

```
URL Pattern              ModuleGuard    Component
─────────────────────────────────────────────────────────
/                        No            EngineDrivenDashboard
/dashboard               No            EngineDrivenDashboard
/apps                    No            AppsInstaller
/settings                No            SystemConfig

/processing              Yes           Processing
/processing-itad         Yes           Processing (alias)
/inventory               Yes           Inventory
/saleable-inventory      Yes           SaleableInventory
/component-sales         Yes           ComponentSales
/purchases               Yes           PurchaseOrders
/receiving               Yes           SmartReceiving
/lots                    Yes           PurchaseLots
/suppliers               Yes           Suppliers
/customers               Yes           Customers
/sales                   Yes           SalesInvoices
/auction                 Yes           AuctionManagement
/reseller                Yes           UnifiedSalesCatalog
/crm                     Yes           CRMDashboard
/website                 Yes           WebsiteDashboard
/recycling               Yes           ESGDashboard
/itad                    Yes           ITADCompliance

/settings/*              Some          Various settings
```

## Dependency Resolution

```
User tries to enable Module A
        │
        ▼
Check: A.depends_on = ['B', 'C']
        │
        ▼
Check: Is B enabled?
        │
   ┌────┴────┐
   │         │
   NO       YES
   │         │
   │         └──► Continue
   │
   ▼
getMissingDependencies()
   │
   ▼
Return: [B]
   │
   ▼
Show modal:
"Module A requires Module B.
 Enable all dependencies?"
   │
   ├─ User confirms
   │  │
   │  ▼
   │  enableWithDependencies()
   │  │
   │  ├─ Enable B
   │  └─ Enable A
   │
   └─ User cancels
      │
      ▼
      Show error toast
```

## Comparison Table

| Aspect | Before | After |
|--------|--------|-------|
| **Source of Truth** | Multiple (engines, toggles, hardcoded) | Single (engines table) |
| **Routing** | State-based (PageRouter) | URL-based (React Router) |
| **Deep Linking** | ❌ Broken | ✅ Works |
| **Browser History** | ❌ Doesn't work | ✅ Works |
| **Refresh Behavior** | ❌ Loses state | ✅ Preserves state |
| **Module Visibility** | Inconsistent | Consistent |
| **Access Control** | None | ModuleGuard |
| **Performance** | No caching | 5s cache |
| **Developer Experience** | Confusing | Clear patterns |
| **User Experience** | Frustrating | Professional |

## Key Files Reference

```
src/
├── services/
│   ├── engineRegistryService.ts     ← SINGLE SOURCE OF TRUTH
│   ├── engineService.ts             ← DEPRECATED
│   └── ...
├── components/
│   ├── layout/
│   │   ├── ModularAppShell.tsx      ← Main shell with Routes
│   │   ├── EngineRouter.tsx         ← NEW: All routes
│   │   ├── RegistryDrivenSidebar.tsx ← Reads enabled engines
│   │   └── PageRouter.tsx           ← LEGACY (unused)
│   ├── common/
│   │   └── ModuleGuard.tsx          ← NEW: Route protection
│   ├── apps/
│   │   └── AppsInstaller.tsx        ← Module enable/disable
│   └── dashboard/
│       └── EngineDrivenDashboard.tsx ← Shows installed modules
└── config/
    └── engineDependencies.ts         ← DEPRECATED
```
