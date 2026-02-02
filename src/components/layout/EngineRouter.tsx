import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ModuleGuard } from '../common/ModuleGuard';

const Processing = lazy(() => import('../processing/Processing').then(m => ({ default: m.Processing })));
const Inventory = lazy(() => import('../inventory/Inventory').then(m => ({ default: m.Inventory })));
const SaleableInventory = lazy(() => import('../inventory/SaleableInventory').then(m => ({ default: m.SaleableInventory })));
const ComponentSales = lazy(() => import('../inventory/ComponentSales').then(m => ({ default: m.ComponentSales })));
const HarvestedComponents = lazy(() => import('../inventory/HarvestedComponentsEnhanced').then(m => ({ default: m.HarvestedComponentsEnhanced })));
const PurchaseOrders = lazy(() => import('../purchases/PurchaseOrders').then(m => ({ default: m.PurchaseOrders })));
const SmartReceiving = lazy(() => import('../receiving/SmartReceivingWorkflow'));
const PurchaseLots = lazy(() => import('../purchase-lots/PurchaseLots').then(m => ({ default: m.PurchaseLots })));
const Suppliers = lazy(() => import('../suppliers/Suppliers').then(m => ({ default: m.Suppliers })));
const Customers = lazy(() => import('../customers/CustomersEnhanced').then(m => ({ default: m.CustomersEnhanced })));
const SalesInvoices = lazy(() => import('../sales/SalesInvoices').then(m => ({ default: m.SalesInvoices })));
const UnifiedSalesCatalog = lazy(() => import('../sales/UnifiedSalesCatalog').then(m => ({ default: m.UnifiedSalesCatalog })));
const Returns = lazy(() => import('../returns/Returns').then(m => ({ default: m.Returns })));
const Repairs = lazy(() => import('../repairs/Repairs').then(m => ({ default: m.Repairs })));
const Locations = lazy(() => import('../locations/Locations').then(m => ({ default: m.Locations })));
const StockMovements = lazy(() => import('../movements/StockMovements').then(m => ({ default: m.StockMovements })));
const AuctionManagement = lazy(() => import('../auctions/AuctionManagement').then(m => ({ default: m.AuctionManagement })));
const CRMDashboard = lazy(() => import('../crm/CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const Leads = lazy(() => import('../crm/Leads').then(m => ({ default: m.Leads })));
const Opportunities = lazy(() => import('../crm/Opportunities').then(m => ({ default: m.Opportunities })));
const Activities = lazy(() => import('../crm/Activities').then(m => ({ default: m.Activities })));
const WebsiteDashboard = lazy(() => import('../website/WebsiteDashboard').then(m => ({ default: m.WebsiteDashboard })));
const Pages = lazy(() => import('../website/Pages').then(m => ({ default: m.Pages })));
const NavigationMenus = lazy(() => import('../website/NavigationMenus').then(m => ({ default: m.NavigationMenus })));
const WebsiteSettings = lazy(() => import('../website/WebsiteSettings').then(m => ({ default: m.WebsiteSettings })));
const ITADProjects = lazy(() => import('../itad/ITADProjects').then(m => ({ default: m.ITADProjects })));
const DataSanitization = lazy(() => import('../itad/DataSanitization').then(m => ({ default: m.DataSanitization })));
const Certificates = lazy(() => import('../itad/Certificates').then(m => ({ default: m.Certificates })));
const EnvironmentalCompliance = lazy(() => import('../itad/EnvironmentalCompliance').then(m => ({ default: m.EnvironmentalCompliance })));
const ITADCompliance = lazy(() => import('../itad/ITADCompliance').then(m => ({ default: m.ITADCompliance })));
const CompanyCertifications = lazy(() => import('../settings/CompanyCertifications').then(m => ({ default: m.CompanyCertifications })));
const ITADRevenueSettlements = lazy(() => import('../itad/ITADRevenueSettlements').then(m => ({ default: m.ITADRevenueSettlements })));
const DownstreamVendors = lazy(() => import('../itad/DownstreamVendors').then(m => ({ default: m.DownstreamVendors })));
const ChartOfAccounts = lazy(() => import('../accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const JournalEntries = lazy(() => import('../accounting/JournalEntries').then(m => ({ default: m.JournalEntries })));
const PagePayments = lazy(() => import('../finance/Page_Payments').then(m => ({ default: m.Page_Payments })));
const Reports = lazy(() => import('../reports/Reports').then(m => ({ default: m.Reports })));
const PageAppsManagement = lazy(() => import('../system/Page_Apps_Management').then(m => ({ default: m.Page_Apps_Management })));
const PageAuditTrail = lazy(() => import('../system/Page_Audit_Trail').then(m => ({ default: m.Page_Audit_Trail })));
const Companies = lazy(() => import('../companies/Companies').then(m => ({ default: m.Companies })));
const Users = lazy(() => import('../users/Users').then(m => ({ default: m.Users })));
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
const SystemConfig = lazy(() => import('../settings/SystemConfig').then(m => ({ default: m.SystemConfig })));
const PartyDirectory = lazy(() => import('../settings/PartyDirectory').then(m => ({ default: m.PartyDirectory })));
const ComponentMarketPrices = lazy(() => import('../settings/ComponentMarketPrices').then(m => ({ default: m.ComponentMarketPrices })));
const AssetBulkUpdate = lazy(() => import('../processing/AssetBulkUpdate').then(m => ({ default: m.AssetBulkUpdate })));
const CRMSettings = lazy(() => import('../settings/CRMSettings').then(m => ({ default: m.CRMSettings })));
const AuctionSettings = lazy(() => import('../settings/AuctionSettings').then(m => ({ default: m.AuctionSettings })));
const RecyclingSettings = lazy(() => import('../settings/RecyclingSettings').then(m => ({ default: m.RecyclingSettings })));
const ResellerSettings = lazy(() => import('../settings/ResellerSettings').then(m => ({ default: m.ResellerSettings })));
const InventorySettings = lazy(() => import('../settings/InventorySettings').then(m => ({ default: m.InventorySettings })));
const ESGDashboard = lazy(() => import('../esg/ESGDashboard').then(m => ({ default: m.ESGDashboard })));
const AppsInstaller = lazy(() => import('../apps/AppsInstaller').then(m => ({ default: m.AppsInstaller })));

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
        <Route path="/processing" element={<ModuleGuard><Processing /></ModuleGuard>} />
        <Route path="/processing-itad" element={<ModuleGuard><Processing /></ModuleGuard>} />
        <Route path="/inventory" element={<ModuleGuard><Inventory /></ModuleGuard>} />
        <Route path="/saleable-inventory" element={<ModuleGuard><SaleableInventory /></ModuleGuard>} />
        <Route path="/component-sales" element={<ModuleGuard><ComponentSales /></ModuleGuard>} />
        <Route path="/harvested-components" element={<ModuleGuard><HarvestedComponents /></ModuleGuard>} />
        <Route path="/purchases" element={<ModuleGuard><PurchaseOrders /></ModuleGuard>} />
        <Route path="/smart-receiving" element={<ModuleGuard><SmartReceiving /></ModuleGuard>} />
        <Route path="/receiving" element={<ModuleGuard><SmartReceiving /></ModuleGuard>} />
        <Route path="/lots" element={<ModuleGuard><PurchaseLots /></ModuleGuard>} />
        <Route path="/purchase-lots" element={<ModuleGuard><PurchaseLots /></ModuleGuard>} />
        <Route path="/suppliers" element={<ModuleGuard><Suppliers /></ModuleGuard>} />
        <Route path="/customers" element={<ModuleGuard><Customers /></ModuleGuard>} />
        <Route path="/orders" element={<ModuleGuard><PurchaseOrders /></ModuleGuard>} />
        <Route path="/invoices" element={<ModuleGuard><SalesInvoices /></ModuleGuard>} />
        <Route path="/sales" element={<ModuleGuard><SalesInvoices /></ModuleGuard>} />
        <Route path="/returns" element={<ModuleGuard><Returns /></ModuleGuard>} />
        <Route path="/repairs" element={<ModuleGuard><Repairs /></ModuleGuard>} />
        <Route path="/locations" element={<ModuleGuard><Locations /></ModuleGuard>} />
        <Route path="/movements" element={<ModuleGuard><StockMovements /></ModuleGuard>} />
        <Route path="/auction" element={<ModuleGuard><AuctionManagement /></ModuleGuard>} />
        <Route path="/auctions" element={<ModuleGuard><AuctionManagement /></ModuleGuard>} />
        <Route path="/reseller" element={<ModuleGuard><UnifiedSalesCatalog /></ModuleGuard>} />
        <Route path="/sales-catalog" element={<ModuleGuard><UnifiedSalesCatalog /></ModuleGuard>} />
        <Route path="/crm" element={<ModuleGuard><CRMDashboard /></ModuleGuard>} />
        <Route path="/crm-leads" element={<ModuleGuard><Leads /></ModuleGuard>} />
        <Route path="/crm-opportunities" element={<ModuleGuard><Opportunities /></ModuleGuard>} />
        <Route path="/crm-activities" element={<ModuleGuard><Activities /></ModuleGuard>} />
        <Route path="/website" element={<ModuleGuard><WebsiteDashboard /></ModuleGuard>} />
        <Route path="/website-pages" element={<ModuleGuard><Pages /></ModuleGuard>} />
        <Route path="/website-menus" element={<ModuleGuard><NavigationMenus /></ModuleGuard>} />
        <Route path="/website-settings" element={<ModuleGuard><WebsiteSettings /></ModuleGuard>} />
        <Route path="/itad-projects" element={<ModuleGuard><ITADProjects /></ModuleGuard>} />
        <Route path="/data-sanitization" element={<ModuleGuard><DataSanitization /></ModuleGuard>} />
        <Route path="/certificates" element={<ModuleGuard><Certificates /></ModuleGuard>} />
        <Route path="/environmental-compliance" element={<ModuleGuard><EnvironmentalCompliance /></ModuleGuard>} />
        <Route path="/recycling" element={<ModuleGuard><ESGDashboard /></ModuleGuard>} />
        <Route path="/itad" element={<ModuleGuard><ITADCompliance /></ModuleGuard>} />
        <Route path="/itad-compliance" element={<ModuleGuard><ITADCompliance /></ModuleGuard>} />
        <Route path="/company-certifications" element={<ModuleGuard><CompanyCertifications /></ModuleGuard>} />
        <Route path="/itad-revenue-settlements" element={<ModuleGuard><ITADRevenueSettlements /></ModuleGuard>} />
        <Route path="/downstream-vendors" element={<ModuleGuard><DownstreamVendors /></ModuleGuard>} />
        <Route path="/chart-of-accounts" element={<ModuleGuard><ChartOfAccounts /></ModuleGuard>} />
        <Route path="/journal-entries" element={<ModuleGuard><JournalEntries /></ModuleGuard>} />
        <Route path="/payments" element={<ModuleGuard><PagePayments /></ModuleGuard>} />
        <Route path="/reports" element={<ModuleGuard><Reports /></ModuleGuard>} />
        <Route path="/apps" element={<AppsInstaller />} />
        <Route path="/audit-trail" element={<ModuleGuard><PageAuditTrail /></ModuleGuard>} />
        <Route path="/company" element={<ModuleGuard><Companies /></ModuleGuard>} />
        <Route path="/companies" element={<ModuleGuard><Companies /></ModuleGuard>} />
        <Route path="/parties" element={<ModuleGuard><PartyDirectory /></ModuleGuard>} />
        <Route path="/accounting" element={<ModuleGuard><ChartOfAccounts /></ModuleGuard>} />
        <Route path="/users" element={<ModuleGuard><Users /></ModuleGuard>} />
        <Route path="/product-types" element={<ModuleGuard><ProductTypes /></ModuleGuard>} />
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
        <Route path="/system-config" element={<SystemConfig />} />
        <Route path="/party-directory" element={<ModuleGuard><PartyDirectory /></ModuleGuard>} />
        <Route path="/component-market-prices" element={<ModuleGuard><ComponentMarketPrices /></ModuleGuard>} />
        <Route path="/asset-bulk-update" element={<ModuleGuard><AssetBulkUpdate /></ModuleGuard>} />
        <Route path="/settings" element={<SystemConfig />} />
        <Route path="/product-type-aliases" element={<ModuleGuard><ProductSetup /></ModuleGuard>} />
        <Route path="/settings/crm" element={<ModuleGuard><CRMSettings /></ModuleGuard>} />
        <Route path="/settings/auction" element={<ModuleGuard><AuctionSettings /></ModuleGuard>} />
        <Route path="/settings/recycling" element={<ModuleGuard><RecyclingSettings /></ModuleGuard>} />
        <Route path="/settings/reseller" element={<ModuleGuard><ResellerSettings /></ModuleGuard>} />
        <Route path="/settings/inventory" element={<ModuleGuard><InventorySettings /></ModuleGuard>} />
        <Route path="/settings/website" element={<ModuleGuard><WebsiteSettings /></ModuleGuard>} />
      </Routes>
    </Suspense>
  );
}
