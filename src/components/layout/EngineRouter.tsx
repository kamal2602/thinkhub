import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ModuleGuard } from '../common/ModuleGuard';
import { DynamicEngineWorkspace } from './DynamicEngineWorkspace';

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
const ModuleVisibilityAuditor = lazy(() => import('../system/ModuleVisibilityAuditor').then(m => ({ default: m.ModuleVisibilityAuditor })));
const Locations = lazy(() => import('../locations/Locations').then(m => ({ default: m.Locations })));
const Suppliers = lazy(() => import('../suppliers/Suppliers').then(m => ({ default: m.Suppliers })));
const Customers = lazy(() => import('../customers/CustomersEnhanced').then(m => ({ default: m.CustomersEnhanced })));
const Returns = lazy(() => import('../returns/Returns').then(m => ({ default: m.Returns })));
const StockMovements = lazy(() => import('../movements/StockMovements').then(m => ({ default: m.StockMovements })));

const Leads = lazy(() => import('../crm/Leads').then(m => ({ default: m.Leads })));
const Opportunities = lazy(() => import('../crm/Opportunities').then(m => ({ default: m.Opportunities })));
const Activities = lazy(() => import('../crm/Activities').then(m => ({ default: m.Activities })));

const Pages = lazy(() => import('../website/Pages').then(m => ({ default: m.Pages })));
const NavigationMenus = lazy(() => import('../website/NavigationMenus').then(m => ({ default: m.NavigationMenus })));

const ITADProjects = lazy(() => import('../itad/ITADProjects').then(m => ({ default: m.ITADProjects })));
const DataSanitization = lazy(() => import('../itad/DataSanitization').then(m => ({ default: m.DataSanitization })));
const Certificates = lazy(() => import('../itad/Certificates').then(m => ({ default: m.Certificates })));
const EnvironmentalCompliance = lazy(() => import('../itad/EnvironmentalCompliance').then(m => ({ default: m.EnvironmentalCompliance })));
const CompanyCertifications = lazy(() => import('../settings/CompanyCertifications').then(m => ({ default: m.CompanyCertifications })));
const ITADRevenueSettlements = lazy(() => import('../itad/ITADRevenueSettlements').then(m => ({ default: m.ITADRevenueSettlements })));
const DownstreamVendors = lazy(() => import('../itad/DownstreamVendors').then(m => ({ default: m.DownstreamVendors })));

const SaleableInventory = lazy(() => import('../inventory/SaleableInventory').then(m => ({ default: m.SaleableInventory })));
const ComponentSales = lazy(() => import('../inventory/ComponentSales').then(m => ({ default: m.ComponentSales })));
const HarvestedComponents = lazy(() => import('../inventory/HarvestedComponentsEnhanced').then(m => ({ default: m.HarvestedComponentsEnhanced })));

const JournalEntries = lazy(() => import('../accounting/JournalEntries').then(m => ({ default: m.JournalEntries })));

const CRMSettings = lazy(() => import('../settings/CRMSettings').then(m => ({ default: m.CRMSettings })));
const AuctionSettings = lazy(() => import('../settings/AuctionSettings').then(m => ({ default: m.AuctionSettings })));
const RecyclingSettings = lazy(() => import('../settings/RecyclingSettings').then(m => ({ default: m.RecyclingSettings })));
const ResellerSettings = lazy(() => import('../settings/ResellerSettings').then(m => ({ default: m.ResellerSettings })));
const InventorySettings = lazy(() => import('../settings/InventorySettings').then(m => ({ default: m.InventorySettings })));
const WebsiteSettings = lazy(() => import('../website/WebsiteSettings').then(m => ({ default: m.WebsiteSettings })));

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
        <Route path="/:engineKey" element={
          <ModuleGuard>
            <DynamicEngineWorkspace />
          </ModuleGuard>
        } />

        <Route path="/product-types" element={<ModuleGuard><ProductTypes /></ModuleGuard>} />
        <Route path="/suppliers" element={<ModuleGuard><Suppliers /></ModuleGuard>} />
        <Route path="/customers" element={<ModuleGuard><Customers /></ModuleGuard>} />
        <Route path="/locations" element={<ModuleGuard><Locations /></ModuleGuard>} />

        <Route path="/saleable-inventory" element={<ModuleGuard><SaleableInventory /></ModuleGuard>} />
        <Route path="/component-sales" element={<ModuleGuard><ComponentSales /></ModuleGuard>} />
        <Route path="/harvested-components" element={<ModuleGuard><HarvestedComponents /></ModuleGuard>} />
        <Route path="/movements" element={<ModuleGuard><StockMovements /></ModuleGuard>} />

        <Route path="/returns" element={<ModuleGuard><Returns /></ModuleGuard>} />
        <Route path="/asset-bulk-update" element={<ModuleGuard><AssetBulkUpdate /></ModuleGuard>} />

        <Route path="/crm-leads" element={<ModuleGuard><Leads /></ModuleGuard>} />
        <Route path="/crm-opportunities" element={<ModuleGuard><Opportunities /></ModuleGuard>} />
        <Route path="/crm-activities" element={<ModuleGuard><Activities /></ModuleGuard>} />

        <Route path="/website-pages" element={<ModuleGuard><Pages /></ModuleGuard>} />
        <Route path="/website-menus" element={<ModuleGuard><NavigationMenus /></ModuleGuard>} />

        <Route path="/itad-projects" element={<ModuleGuard><ITADProjects /></ModuleGuard>} />
        <Route path="/data-sanitization" element={<ModuleGuard><DataSanitization /></ModuleGuard>} />
        <Route path="/certificates" element={<ModuleGuard><Certificates /></ModuleGuard>} />
        <Route path="/environmental-compliance" element={<ModuleGuard><EnvironmentalCompliance /></ModuleGuard>} />
        <Route path="/company-certifications" element={<ModuleGuard><CompanyCertifications /></ModuleGuard>} />
        <Route path="/itad-revenue-settlements" element={<ModuleGuard><ITADRevenueSettlements /></ModuleGuard>} />
        <Route path="/downstream-vendors" element={<ModuleGuard><DownstreamVendors /></ModuleGuard>} />

        <Route path="/journal-entries" element={<ModuleGuard><JournalEntries /></ModuleGuard>} />

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

        <Route path="/audit-trail" element={<ModuleGuard><PageAuditTrail /></ModuleGuard>} />
        <Route path="/module-auditor" element={<ModuleVisibilityAuditor />} />
      </Routes>
    </Suspense>
  );
}
