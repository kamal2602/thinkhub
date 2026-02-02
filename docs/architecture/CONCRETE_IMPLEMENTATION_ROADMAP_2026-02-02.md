# ThinkHub Modular ERP - Concrete Implementation Roadmap
**Date:** February 2, 2026
**Status:** Ready for Implementation

## Executive Summary

Based on deep analysis of the codebase and database, this document provides **exact code changes** needed to achieve a unified, registry-driven modular ERP system.

### Critical Discoveries

✅ **GOOD NEWS:**
- `contacts` table **already exists** with `parent_contact_id` and proper structure
- `contact_roles` table exists for role-based filtering
- `moduleRegistryService` only used in 1 file (easy to deprecate)
- `engineRegistryService` already has all needed APIs
- Sidebar already uses `engines` registry (mostly working)

❌ **MUST FIX:**
- 80+ hardcoded routes in `EngineRouter.tsx` preventing registry-driven navigation
- `ModuleGuard` reads wrong param (`moduleKey` instead of `engineKey`)
- Engine key still `"parties"` in DB (should be `"contacts"`)
- No dynamic routing - must update code to add new modules
- No App Launcher (users land on hardcoded dashboard)
- No Module Auditor tool

---

## Implementation Phases with Exact Code Changes

### PHASE 1: Registry-Driven Dynamic Routing
**Effort:** 3-4 hours | **Risk:** Medium | **Impact:** CRITICAL

#### 1.1 Create Engine Component Map

**New File:** `src/config/engineComponentMap.tsx`

```tsx
import { lazy, LazyExoticComponent, ComponentType } from 'react';

// Registry of all engine workspace components
export const ENGINE_COMPONENT_MAP: Record<string, LazyExoticComponent<ComponentType<any>>> = {
  // Operations
  'inventory': lazy(() => import('../components/inventory/Inventory').then(m => ({ default: m.Inventory }))),
  'processing': lazy(() => import('../components/processing/Processing').then(m => ({ default: m.Processing }))),
  'receiving': lazy(() => import('../components/receiving/SmartReceivingWorkflow')),
  'lots': lazy(() => import('../components/purchase-lots/PurchaseLots').then(m => ({ default: m.PurchaseLots }))),
  'recycling': lazy(() => import('../components/esg/ESGDashboard').then(m => ({ default: m.ESGDashboard }))),

  // Sales
  'auction': lazy(() => import('../components/auctions/AuctionManagement').then(m => ({ default: m.AuctionManagement }))),
  'reseller': lazy(() => import('../components/sales/UnifiedSalesCatalog').then(m => ({ default: m.UnifiedSalesCatalog }))),
  'website': lazy(() => import('../components/website/WebsiteDashboard').then(m => ({ default: m.WebsiteDashboard }))),

  // Business
  'crm': lazy(() => import('../components/crm/CRMDashboard').then(m => ({ default: m.CRMDashboard }))),
  'accounting': lazy(() => import('../components/accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts }))),
  'itad': lazy(() => import('../components/itad/ITADCompliance').then(m => ({ default: m.ITADCompliance }))),
  'contacts': lazy(() => import('../components/settings/PartyDirectory').then(m => ({ default: m.PartyDirectory }))),
  'orders': lazy(() => import('../components/purchases/PurchaseOrders').then(m => ({ default: m.PurchaseOrders }))),
  'invoices': lazy(() => import('../components/sales/SalesInvoices').then(m => ({ default: m.SalesInvoices }))),
  'payments': lazy(() => import('../components/finance/Page_Payments').then(m => ({ default: m.Page_Payments }))),

  // System
  'reports': lazy(() => import('../components/reports/Reports').then(m => ({ default: m.Reports }))),
  'users': lazy(() => import('../components/users/Users').then(m => ({ default: m.Users }))),

  // Admin
  'apps': lazy(() => import('../components/apps/AppsInstaller').then(m => ({ default: m.AppsInstaller }))),
  'settings': lazy(() => import('../components/settings/SystemConfig').then(m => ({ default: m.SystemConfig }))),
  'company': lazy(() => import('../components/companies/Companies').then(m => ({ default: m.Companies }))),
};

// Helper to check if engine has a component
export function hasEngineComponent(engineKey: string): boolean {
  return engineKey in ENGINE_COMPONENT_MAP;
}

// Get component for engine or null
export function getEngineComponent(engineKey: string): LazyExoticComponent<ComponentType<any>> | null {
  return ENGINE_COMPONENT_MAP[engineKey] || null;
}
```

#### 1.2 Create Dynamic Engine Workspace Renderer

**New File:** `src/components/layout/DynamicEngineWorkspace.tsx`

```tsx
import { Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { getEngineComponent, hasEngineComponent } from '../../config/engineComponentMap';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-600">Loading workspace...</p>
    </div>
  </div>
);

function ComingSoonWorkspace({ engine }: { engine: Engine }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {engine.title} - Coming Soon
          </h2>

          <p className="text-gray-600 mb-6">
            This module is enabled but its workspace interface is under development.
            Check back soon for updates!
          </p>

          {engine.description && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">{engine.description}</p>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function UnknownModulePage() {
  const navigate = useNavigate();
  const { engineKey } = useParams();

  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl border-2 border-red-200 p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Module Not Found
          </h2>

          <p className="text-gray-600 mb-6">
            The module "{engineKey}" does not exist in this system.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/apps')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Available Apps
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DynamicEngineWorkspace() {
  const { engineKey } = useParams<{ engineKey: string }>();
  const { selectedCompany } = useCompany();
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadEngine();
  }, [engineKey, selectedCompany]);

  const loadEngine = async () => {
    if (!selectedCompany || !engineKey) {
      setLoading(false);
      setError(true);
      return;
    }

    try {
      const engineData = await engineRegistryService.getEngine(
        selectedCompany.id,
        engineKey
      );

      if (!engineData) {
        setError(true);
      } else {
        setEngine(engineData);
      }
    } catch (err) {
      console.error('Error loading engine:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingFallback />;
  }

  if (error || !engine) {
    return <UnknownModulePage />;
  }

  // Check if component exists for this engine
  const WorkspaceComponent = getEngineComponent(engineKey!);

  if (!WorkspaceComponent) {
    return <ComingSoonWorkspace engine={engine} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <WorkspaceComponent />
    </Suspense>
  );
}
```

#### 1.3 Update EngineRouter to Use Dynamic Routing

**Edit:** `src/components/layout/EngineRouter.tsx`

**Replace entire file with:**

```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ModuleGuard } from '../common/ModuleGuard';
import { DynamicEngineWorkspace } from './DynamicEngineWorkspace';

// Legacy subpage routes that are NOT engines (keep for now)
const ProductTypes = lazy(() => import('../product-types/ProductTypes').then(m => ({ default: m.ProductTypes })));
const ProcessingStages = lazy(() => import('../settings/ProcessingStages').then(m => ({ default: m.ProcessingStages })));
const GradesConditions = lazy(() => import('../settings/GradesConditions').then(m => ({ default: m.GradesConditions })));
const PaymentTerms = lazy(() => import('../settings/PaymentTerms').then(m => ({ default: m.PaymentTerms })));
const ReturnReasons = lazy(() => import('../settings/ReturnReasons').then(m => ({ default: m.ReturnReasons })));
const WarrantyTypes = lazy(() => import('../settings/WarrantyTypes').then(m => ({ default: m.WarrantyTypes })));
const ImportFieldMappings = lazy(() => import('../settings/ImportFieldMappings').then(m => ({ default: m.ImportFieldMappings })));
const ImportIntelligence = lazy(() => import('../settings/ImportIntelligence').then(m => ({ default: m.ImportIntelligence })));
const ModelAliases = lazy(() => import('../settings/ModelAliases').then(m => ({ default: m.ModelAliases })));
const ProductSetup = lazy(() => import('../settings/ProductSetup').then(m => ({ default: m.ProductSetup })));
const BusinessRules = lazy(() => import('../settings/BusinessRules').then(m => ({ default: m.BusinessRules })));
const ComponentMarketPrices = lazy(() => import('../settings/ComponentMarketPrices').then(m => ({ default: m.ComponentMarketPrices })));
const AssetBulkUpdate = lazy(() => import('../processing/AssetBulkUpdate').then(m => ({ default: m.AssetBulkUpdate })));
const PageAuditTrail = lazy(() => import('../system/Page_Audit_Trail').then(m => ({ default: m.Page_Audit_Trail })));
const Locations = lazy(() => import('../locations/Locations').then(m => ({ default: m.Locations })));
const Suppliers = lazy(() => import('../suppliers/Suppliers').then(m => ({ default: m.Suppliers })));
const Customers = lazy(() => import('../customers/CustomersEnhanced').then(m => ({ default: m.CustomersEnhanced })));
const Returns = lazy(() => import('../returns/Returns').then(m => ({ default: m.Returns })));
const Repairs = lazy(() => import('../repairs/Repairs').then(m => ({ default: m.Repairs })));
const StockMovements = lazy(() => import('../movements/StockMovements').then(m => ({ default: m.StockMovements })));

// CRM subpages
const Leads = lazy(() => import('../crm/Leads').then(m => ({ default: m.Leads })));
const Opportunities = lazy(() => import('../crm/Opportunities').then(m => ({ default: m.Opportunities })));
const Activities = lazy(() => import('../crm/Activities').then(m => ({ default: m.Activities })));

// Website subpages
const Pages = lazy(() => import('../website/Pages').then(m => ({ default: m.Pages })));
const NavigationMenus = lazy(() => import('../website/NavigationMenus').then(m => ({ default: m.NavigationMenus })));

// ITAD subpages
const ITADProjects = lazy(() => import('../itad/ITADProjects').then(m => ({ default: m.ITADProjects })));
const DataSanitization = lazy(() => import('../itad/DataSanitization').then(m => ({ default: m.DataSanitization })));
const Certificates = lazy(() => import('../itad/Certificates').then(m => ({ default: m.Certificates })));
const EnvironmentalCompliance = lazy(() => import('../itad/EnvironmentalCompliance').then(m => ({ default: m.EnvironmentalCompliance })));
const CompanyCertifications = lazy(() => import('../settings/CompanyCertifications').then(m => ({ default: m.CompanyCertifications })));
const ITADRevenueSettlements = lazy(() => import('../itad/ITADRevenueSettlements').then(m => ({ default: m.ITADRevenueSettlements })));
const DownstreamVendors = lazy(() => import('../itad/DownstreamVendors').then(m => ({ default: m.DownstreamVendors })));

// Inventory subpages
const SaleableInventory = lazy(() => import('../inventory/SaleableInventory').then(m => ({ default: m.SaleableInventory })));
const ComponentSales = lazy(() => import('../inventory/ComponentSales').then(m => ({ default: m.ComponentSales })));
const HarvestedComponents = lazy(() => import('../inventory/HarvestedComponentsEnhanced').then(m => ({ default: m.HarvestedComponentsEnhanced })));

// Accounting subpages
const JournalEntries = lazy(() => import('../accounting/JournalEntries').then(m => ({ default: m.JournalEntries })));

// Settings subpages
const CRMSettings = lazy(() => import('../settings/CRMSettings').then(m => ({ default: m.CRMSettings })));
const AuctionSettings = lazy(() => import('../settings/AuctionSettings').then(m => ({ default: m.AuctionSettings })));
const RecyclingSettings = lazy(() => import('../settings/RecyclingSettings').then(m => ({ default: m.RecyclingSettings })));
const ResellerSettings = lazy(() => import('../settings/ResellerSettings').then(m => ({ default: m.ResellerSettings })));
const InventorySettings = lazy(() => import('../settings/InventorySettings').then(m => ({ default: m.InventorySettings })));
const WebsiteSettings = lazy(() => import('../settings/WebsiteSettings').then(m => ({ default: m.WebsiteSettings })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

export function EngineRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* PRIMARY DYNAMIC ENGINE ROUTE - All engines go through here */}
        <Route path="/:engineKey" element={
          <ModuleGuard>
            <DynamicEngineWorkspace />
          </ModuleGuard>
        } />

        {/* LEGACY SUBPAGE ROUTES - Keep for backward compatibility */}
        {/* These are NOT engines, just utility pages/subpages */}

        {/* Master Data Management */}
        <Route path="/product-types" element={<ModuleGuard><ProductTypes /></ModuleGuard>} />
        <Route path="/suppliers" element={<ModuleGuard><Suppliers /></ModuleGuard>} />
        <Route path="/customers" element={<ModuleGuard><Customers /></ModuleGuard>} />
        <Route path="/locations" element={<ModuleGuard><Locations /></ModuleGuard>} />

        {/* Inventory Subpages */}
        <Route path="/saleable-inventory" element={<ModuleGuard><SaleableInventory /></ModuleGuard>} />
        <Route path="/component-sales" element={<ModuleGuard><ComponentSales /></ModuleGuard>} />
        <Route path="/harvested-components" element={<ModuleGuard><HarvestedComponents /></ModuleGuard>} />
        <Route path="/movements" element={<ModuleGuard><StockMovements /></ModuleGuard>} />

        {/* Operations */}
        <Route path="/returns" element={<ModuleGuard><Returns /></ModuleGuard>} />
        <Route path="/repairs" element={<ModuleGuard><Repairs /></ModuleGuard>} />
        <Route path="/asset-bulk-update" element={<ModuleGuard><AssetBulkUpdate /></ModuleGuard>} />

        {/* CRM Subpages */}
        <Route path="/crm-leads" element={<ModuleGuard><Leads /></ModuleGuard>} />
        <Route path="/crm-opportunities" element={<ModuleGuard><Opportunities /></ModuleGuard>} />
        <Route path="/crm-activities" element={<ModuleGuard><Activities /></ModuleGuard>} />

        {/* Website Subpages */}
        <Route path="/website-pages" element={<ModuleGuard><Pages /></ModuleGuard>} />
        <Route path="/website-menus" element={<ModuleGuard><NavigationMenus /></ModuleGuard>} />

        {/* ITAD Subpages */}
        <Route path="/itad-projects" element={<ModuleGuard><ITADProjects /></ModuleGuard>} />
        <Route path="/data-sanitization" element={<ModuleGuard><DataSanitization /></ModuleGuard>} />
        <Route path="/certificates" element={<ModuleGuard><Certificates /></ModuleGuard>} />
        <Route path="/environmental-compliance" element={<ModuleGuard><EnvironmentalCompliance /></ModuleGuard>} />
        <Route path="/company-certifications" element={<ModuleGuard><CompanyCertifications /></ModuleGuard>} />
        <Route path="/itad-revenue-settlements" element={<ModuleGuard><ITADRevenueSettlements /></ModuleGuard>} />
        <Route path="/downstream-vendors" element={<ModuleGuard><DownstreamVendors /></ModuleGuard>} />

        {/* Accounting Subpages */}
        <Route path="/journal-entries" element={<ModuleGuard><JournalEntries /></ModuleGuard>} />

        {/* Settings Pages */}
        <Route path="/processing-stages" element={<ModuleGuard><ProcessingStages /></ModuleGuard>} />
        <Route path="/grades-conditions" element={<ModuleGuard><GradesConditions /></ModuleGuard>} />
        <Route path="/payment-terms" element={<ModuleGuard><PaymentTerms /></ModuleGuard>} />
        <Route path="/return-reasons" element={<ModuleGuard><ReturnReasons /></ModuleGuard>} />
        <Route path="/warranty-types" element={<ModuleGuard><WarrantyTypes /></ModuleGuard>} />
        <Route path="/import-field-mappings" element={<ModuleGuard><ImportFieldMappings /></ModuleGuard>} />
        <Route path="/import-intelligence" element={<ModuleGuard><ImportIntelligence /></ModuleGuard>} />
        <Route path="/model-aliases" element={<ModuleGuard><ModelAliases /></ModuleGuard>} />
        <Route path="/product-setup" element={<ModuleGuard><ProductSetup /></ModuleGuard>} />
        <Route path="/business-rules" element={<ModuleGuard><BusinessRules /></ModuleGuard>} />
        <Route path="/component-market-prices" element={<ModuleGuard><ComponentMarketPrices /></ModuleGuard>} />
        <Route path="/settings/crm" element={<ModuleGuard><CRMSettings /></ModuleGuard>} />
        <Route path="/settings/auction" element={<ModuleGuard><AuctionSettings /></ModuleGuard>} />
        <Route path="/settings/recycling" element={<ModuleGuard><RecyclingSettings /></ModuleGuard>} />
        <Route path="/settings/reseller" element={<ModuleGuard><ResellerSettings /></ModuleGuard>} />
        <Route path="/settings/inventory" element={<ModuleGuard><InventorySettings /></ModuleGuard>} />
        <Route path="/settings/website" element={<ModuleGuard><WebsiteSettings /></ModuleGuard>} />

        {/* System */}
        <Route path="/audit-trail" element={<ModuleGuard><PageAuditTrail /></ModuleGuard>} />
      </Routes>
    </Suspense>
  );
}
```

---

### PHASE 2: Fix ModuleGuard to Read Correct Param
**Effort:** 30 minutes | **Risk:** Low | **Impact:** CRITICAL (Security)

**Edit:** `src/components/common/ModuleGuard.tsx`

**Change line 12 from:**
```tsx
const { moduleKey } = useParams<{ moduleKey: string }>();
```

**To:**
```tsx
const { engineKey } = useParams<{ engineKey: string }>();
```

**Change line 24 from:**
```tsx
if (!selectedCompany || !moduleKey) {
```

**To:**
```tsx
if (!selectedCompany || !engineKey) {
```

**Change line 30 from:**
```tsx
const engine = await engineRegistryService.getModuleByKey(selectedCompany.id, moduleKey);
```

**To:**
```tsx
const engine = await engineRegistryService.getModuleByKey(selectedCompany.id, engineKey);
```

**Update dependency array on line 21:**
```tsx
}, [engineKey, selectedCompany]);
```

---

### PHASE 3: Update Database - Rename "parties" Engine to "contacts"
**Effort:** 15 minutes | **Risk:** Low | **Impact:** High

**Migration:** `supabase/migrations/YYYYMMDDHHMMSS_rename_parties_engine_to_contacts.sql`

```sql
/*
  # Rename Parties Engine to Contacts

  1. Updates
    - Rename engine key from "parties" to "contacts"
    - Update workspace route to "/contacts"
    - Update title to "Contacts"
    - Update dependencies in other engines

  2. Notes
    - contacts table already exists with proper structure
    - This aligns engine registry with actual DB table name
    - Maintains backward compatibility during transition
*/

-- Update the parties engine to contacts
UPDATE engines
SET
  key = 'contacts',
  title = 'Contacts',
  workspace_route = '/contacts',
  description = 'Manage companies and individuals (customers, suppliers, vendors, etc.)',
  updated_at = now()
WHERE key = 'parties';

-- Update dependencies in other engines
UPDATE engines
SET
  depends_on = array_replace(depends_on, 'parties', 'contacts'),
  updated_at = now()
WHERE 'parties' = ANY(depends_on);
```

**Then update ENGINE_COMPONENT_MAP:**

Change key from `'parties'` to `'contacts'` in `src/config/engineComponentMap.tsx`:

```tsx
'contacts': lazy(() => import('../components/settings/PartyDirectory').then(m => ({ default: m.PartyDirectory }))),
```

---

### PHASE 4: Create Modern App Launcher
**Effort:** 2 hours | **Risk:** Low | **Impact:** High (UX)

**New File:** `src/components/launchpad/ModernAppLauncher.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';

export function ModernAppLauncher() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [engines, setEngines] = useState<Engine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const enabledEngines = await engineRegistryService.getEnabledEngines(
        selectedCompany.id
      );

      // Auto-navigate if user has exactly one enabled engine
      if (enabledEngines.length === 1 && enabledEngines[0].workspace_route) {
        navigate(enabledEngines[0].workspace_route);
        return;
      }

      setEngines(enabledEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const filteredEngines = engines.filter(engine =>
    engine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    engine.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedEngines = {
    operations: filteredEngines.filter(e => e.category === 'operations'),
    sales: filteredEngines.filter(e => e.category === 'sales'),
    business: filteredEngines.filter(e => e.category === 'business'),
    system: filteredEngines.filter(e => e.category === 'system'),
    admin: filteredEngines.filter(e => e.category === 'admin'),
  };

  const categories = [
    { key: 'operations', title: 'Operations', color: 'blue' },
    { key: 'sales', title: 'Sales Channels', color: 'green' },
    { key: 'business', title: 'Business', color: 'purple' },
    { key: 'system', title: 'System', color: 'gray' },
    { key: 'admin', title: 'Administration', color: 'slate' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            Choose Your Workspace
          </h1>
          <p className="text-gray-600">Select a workspace to get started</p>
        </div>

        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-8">
          {categories.map(category => {
            const categoryEngines = groupedEngines[category.key as keyof typeof groupedEngines];
            if (categoryEngines.length === 0) return null;

            return (
              <div key={category.key}>
                <h2 className="text-lg font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  {category.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categoryEngines.map(engine => {
                    const Icon = getIcon(engine.icon);

                    return (
                      <button
                        key={engine.key}
                        onClick={() => engine.workspace_route && navigate(engine.workspace_route)}
                        className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                            <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {engine.title}
                            </h3>
                            {engine.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {engine.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEngines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No workspaces found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Update DashboardPage to use launcher:**

**Edit:** `src/pages/DashboardPage.tsx`

Replace existing dashboard with:
```tsx
import { ModernAppLauncher } from '../components/launchpad/ModernAppLauncher';

export default function DashboardPage() {
  return <ModernAppLauncher />;
}
```

---

### PHASE 5: Create Module Visibility Auditor
**Effort:** 2-3 hours | **Risk:** Low | **Impact:** High (Prevents Regressions)

**New File:** `src/components/system/ModuleVisibilityAuditor.tsx`

```tsx
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { hasEngineComponent } from '../../config/engineComponentMap';

interface AuditResult {
  engineKey: string;
  title: string;
  registryExists: boolean;
  installed: boolean;
  enabled: boolean;
  hasWorkspaceRoute: boolean;
  hasComponent: boolean;
  dependenciesMet: boolean;
  visibleInLauncher: boolean;
  visibleInSidebar: boolean;
  issues: string[];
  recommendations: string[];
}

export function ModuleVisibilityAuditor() {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAudit();
  }, [selectedCompany]);

  const runAudit = async () => {
    if (!selectedCompany) return;

    try {
      const engines = await engineRegistryService.getEngines(selectedCompany.id);

      const results: AuditResult[] = await Promise.all(
        engines.map(async (engine) => {
          const issues: string[] = [];
          const recommendations: string[] = [];

          // Check component mapping
          if (!hasEngineComponent(engine.key)) {
            issues.push('No component mapped - will show "Coming Soon" page');
            recommendations.push('Add component to ENGINE_COMPONENT_MAP');
          }

          // Check workspace route
          if (!engine.workspace_route) {
            issues.push('No workspace route defined');
            recommendations.push('Set workspace_route in engines table');
          }

          // Check dependencies
          let dependenciesMet = true;
          if (engine.depends_on && engine.depends_on.length > 0) {
            const missingDeps = await engineRegistryService.getMissingDependencies(
              selectedCompany.id,
              engine.key
            );
            if (missingDeps.length > 0) {
              dependenciesMet = false;
              issues.push(`Missing dependencies: ${missingDeps.map(d => d.title).join(', ')}`);
              recommendations.push('Enable required dependencies first');
            }
          }

          // Check if not installed
          if (!engine.is_installed) {
            issues.push('Module not installed');
            recommendations.push('Install module from Apps page');
          }

          // Check if not enabled
          if (engine.is_installed && !engine.is_enabled) {
            issues.push('Module installed but disabled');
            recommendations.push('Enable module from Apps page');
          }

          const visibleInLauncher = engine.is_installed && engine.is_enabled && dependenciesMet;
          const visibleInSidebar = visibleInLauncher;

          return {
            engineKey: engine.key,
            title: engine.title,
            registryExists: true,
            installed: engine.is_installed,
            enabled: engine.is_enabled,
            hasWorkspaceRoute: !!engine.workspace_route,
            hasComponent: hasEngineComponent(engine.key),
            dependenciesMet,
            visibleInLauncher,
            visibleInSidebar,
            issues,
            recommendations,
          };
        })
      );

      setAuditResults(results);
    } catch (error) {
      console.error('Audit failed:', error);
      addToast('Failed to run module audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (engineKey: string) => {
    if (!selectedCompany) return;

    try {
      await engineRegistryService.toggleEngine(selectedCompany.id, engineKey, true);
      addToast('Module enabled successfully', 'success');
      runAudit();
    } catch (error: any) {
      addToast(error.message || 'Failed to enable module', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Running audit...</p>
        </div>
      </div>
    );
  }

  const visibleCount = auditResults.filter(r => r.visibleInLauncher).length;
  const hiddenCount = auditResults.length - visibleCount;
  const issueCount = auditResults.filter(r => r.issues.length > 0).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Module Visibility Auditor</h1>
        <p className="text-gray-600">
          Diagnose why modules are not appearing in the UI and get recommendations to fix issues.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Visible Modules</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{visibleCount}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-900">Hidden Modules</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{hiddenCount}</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-900">With Issues</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{issueCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Module</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Installed</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Enabled</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Route</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Component</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Deps OK</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Visible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Issues</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {auditResults.map((result) => (
              <tr key={result.engineKey} className={!result.visibleInLauncher ? 'bg-red-50' : ''}>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{result.title}</div>
                    <div className="text-xs text-gray-500">{result.engineKey}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {result.installed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.hasWorkspaceRoute ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.hasComponent ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" title="Will show Coming Soon page" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.dependenciesMet ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.visibleInLauncher ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Hidden
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {result.issues.length > 0 ? (
                    <div className="space-y-1">
                      {result.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-1 text-xs text-red-600">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-green-600">No issues</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {!result.enabled && result.installed && (
                    <button
                      onClick={() => handleEnable(result.engineKey)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                    >
                      Enable
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {auditResults.filter(r => r.recommendations.length > 0).length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Recommendations
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            {auditResults
              .filter(r => r.recommendations.length > 0)
              .map((result) =>
                result.recommendations.map((rec, idx) => (
                  <li key={`${result.engineKey}-${idx}`} className="flex items-start gap-2">
                    <span className="font-medium">{result.title}:</span>
                    <span>{rec}</span>
                  </li>
                ))
              )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Add route for auditor in EngineRouter:**

```tsx
const ModuleVisibilityAuditor = lazy(() => import('../system/ModuleVisibilityAuditor').then(m => ({ default: m.ModuleVisibilityAuditor })));

// Add to routes:
<Route path="/module-auditor" element={<ModuleVisibilityAuditor />} />
```

---

### PHASE 6: Deprecate moduleRegistryService
**Effort:** 30 minutes | **Risk:** Low | **Impact:** Medium

**Edit:** `src/services/moduleRegistryService.ts`

Add deprecation warning at top:

```tsx
/**
 * @deprecated This service is deprecated. Use engineRegistryService instead.
 *
 * The modules/company_modules tables are legacy and no longer used for
 * navigation or module visibility. All module management should use the
 * engines table via engineRegistryService.
 *
 * This file is kept only for backward compatibility and will be removed
 * in a future version.
 */

import { supabase } from '../lib/supabase';
// ... rest of file unchanged
```

**Edit:** `src/components/dashboard/ModularHomeDashboard.tsx`

Replace usage with engines service. Change imports:

```tsx
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
```

Update loadModules function to use engines:

```tsx
const loadModules = async () => {
  if (!company) {
    setLoading(false);
    return;
  }

  try {
    setError(null);
    const engineGroups = await engineRegistryService.getEnabledEngineGroups(company.id);

    // Convert to old format temporarily
    const grouped = Object.entries(engineGroups).map(([key, engines]) => ({
      category: {
        code: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        icon: 'Box',
        color: 'blue',
        sort_order: 0
      },
      modules: engines.map(e => ({
        name: e.key,
        display_name: e.title,
        description: e.description,
        category: e.category,
        icon: e.icon,
        route: e.workspace_route,
        color: null,
        is_core: e.is_core,
        is_enabled: e.is_enabled,
        depends_on: e.depends_on,
        sort_order: e.sort_order,
        version: e.version,
        id: e.id
      }))
    })).filter(group => group.modules.length > 0);

    setModulesByCategory(grouped);
  } catch (error) {
    console.error('Failed to load modules:', error);
    setError(error instanceof Error ? error.message : 'Failed to load modules');
  } finally {
    setLoading(false);
  }
};
```

---

## Implementation Order

**Week 1 - Core Infrastructure:**
1. Day 1-2: Phase 1 (Registry-Driven Routing)
2. Day 3: Phase 2 (Fix ModuleGuard)
3. Day 4: Phase 3 (Database updates)
4. Day 5: Testing & Bug Fixes

**Week 2 - UX Improvements:**
5. Day 1-2: Phase 4 (App Launcher)
6. Day 3: Phase 5 (Module Auditor)
7. Day 4: Phase 6 (Deprecate old registry)
8. Day 5: Testing & Documentation

---

## Validation Checklist

After implementation, verify:

- [ ] Navigate to `/inventory` - should load Inventory workspace via dynamic routing
- [ ] Navigate to `/contacts` - should load Contacts workspace (not "parties")
- [ ] Navigate to `/automation` (disabled engine) - should show "Module Disabled" gate
- [ ] Navigate to `/fake-module` - should show "Module Not Found" page
- [ ] Apps page shows all engines from `engines` table only
- [ ] Sidebar shows only enabled engines
- [ ] App Launcher auto-navigates if user has 1 workspace
- [ ] App Launcher shows grid if user has multiple workspaces
- [ ] Module Auditor shows all engines and explains why any are hidden
- [ ] Can enable engine from auditor and it appears immediately
- [ ] No console errors about moduleRegistryService in runtime navigation

---

## Rollback Plan

If issues occur:

1. **EngineRouter:** Keep old routes commented out temporarily, uncomment if needed
2. **ModuleGuard:** Revert param name change
3. **Database:** Run reverse migration to change contacts back to parties
4. **App Launcher:** Hide route, users land on old dashboard

All changes are additive and can be rolled back without data loss.

---

## Next Steps After This

Once these phases are complete, we can tackle:

- **Phase 7:** Internal vs Portal Users (user_type field + auth flow)
- **Phase 8:** Inventory Lifeline UX (timeline view from movements)
- **Phase 9:** ESG Events Workspace (capture/filter/export)
- **Phase 10:** UI Quality Pass (consistent layouts, empty states)

---

**Ready to implement?** Suggest starting with Phase 1 (routing) as it unblocks everything else.
