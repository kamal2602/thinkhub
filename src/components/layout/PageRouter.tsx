import React, { lazy, Suspense } from 'react';

const Processing = lazy(() => import('../processing/Processing').then(m => ({ default: m.Processing })));
const Inventory = lazy(() => import('../inventory/Inventory').then(m => ({ default: m.Inventory })));
const SaleableInventory = lazy(() => import('../inventory/SaleableInventory').then(m => ({ default: m.SaleableInventory })));
const ComponentSales = lazy(() => import('../inventory/ComponentSales').then(m => ({ default: m.ComponentSales })));
const HarvestedComponents = lazy(() => import('../inventory/HarvestedComponentsEnhanced').then(m => ({ default: m.HarvestedComponentsEnhanced })));
const PurchaseOrders = lazy(() => import('../purchases/PurchaseOrders').then(m => ({ default: m.PurchaseOrders })));
const SmartReceiving = lazy(() => import('../receiving/SmartReceivingWorkflow'));
const PurchaseLots = lazy(() => import('../purchase-lots/PurchaseLots').then(m => ({ default: m.PurchaseLots })));
const Suppliers = lazy(() => import('../suppliers/Suppliers').then(m => ({ default: m.Suppliers })));
const Customers = lazy(() => import('../customers/Customers').then(m => ({ default: m.Customers })));
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
const EngineToggles = lazy(() => import('../settings/EngineToggles').then(m => ({ default: m.EngineToggles })));
const ComponentMarketPrices = lazy(() => import('../settings/ComponentMarketPrices').then(m => ({ default: m.ComponentMarketPrices })));
const AssetBulkUpdate = lazy(() => import('../processing/AssetBulkUpdate').then(m => ({ default: m.AssetBulkUpdate })));
const CRMSettings = lazy(() => import('../settings/CRMSettings').then(m => ({ default: m.CRMSettings })));
const AuctionSettings = lazy(() => import('../settings/AuctionSettings').then(m => ({ default: m.AuctionSettings })));
const RecyclingSettings = lazy(() => import('../settings/RecyclingSettings').then(m => ({ default: m.RecyclingSettings })));
const ResellerSettings = lazy(() => import('../settings/ResellerSettings').then(m => ({ default: m.ResellerSettings })));
const InventorySettings = lazy(() => import('../settings/InventorySettings').then(m => ({ default: m.InventorySettings })));
const ESGDashboard = lazy(() => import('../esg/ESGDashboard').then(m => ({ default: m.ESGDashboard })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

interface PageRouterProps {
  path: string;
  fallback?: React.ReactNode;
}

export function PageRouter({ path, fallback }: PageRouterProps) {
  const getComponent = () => {
    switch (path) {
      case '/processing':
        return <Processing />;
      case '/inventory':
        return <Inventory />;
      case '/saleable-inventory':
        return <SaleableInventory />;
      case '/component-sales':
        return <ComponentSales />;
      case '/harvested-components':
        return <HarvestedComponents />;
      case '/purchases':
        return <PurchaseOrders />;
      case '/smart-receiving':
        return <SmartReceiving />;
      case '/purchase-lots':
        return <PurchaseLots />;
      case '/suppliers':
        return <Suppliers />;
      case '/customers':
        return <Customers />;
      case '/sales':
        return <SalesInvoices />;
      case '/sales-catalog':
        return <UnifiedSalesCatalog />;
      case '/returns':
        return <Returns />;
      case '/repairs':
        return <Repairs />;
      case '/smart-receiving':
        return <SmartReceiving />;
      case '/locations':
        return <Locations />;
      case '/movements':
        return <StockMovements />;
      case '/auctions':
        return <AuctionManagement />;
      case '/crm':
        return <CRMDashboard />;
      case '/crm-leads':
        return <Leads />;
      case '/crm-opportunities':
        return <Opportunities />;
      case '/crm-activities':
        return <Activities />;
      case '/website':
        return <WebsiteDashboard />;
      case '/website-pages':
        return <Pages />;
      case '/website-menus':
        return <NavigationMenus />;
      case '/website-settings':
        return <WebsiteSettings />;
      case '/itad-projects':
        return <ITADProjects />;
      case '/data-sanitization':
        return <DataSanitization />;
      case '/certificates':
        return <Certificates />;
      case '/environmental-compliance':
        return <EnvironmentalCompliance />;
      case '/recycling':
        return <ESGDashboard />;
      case '/itad-compliance':
        return <ITADCompliance />;
      case '/company-certifications':
        return <CompanyCertifications />;
      case '/itad-revenue-settlements':
        return <ITADRevenueSettlements />;
      case '/downstream-vendors':
        return <DownstreamVendors />;
      case '/chart-of-accounts':
        return <ChartOfAccounts />;
      case '/journal-entries':
        return <JournalEntries />;
      case '/payments':
        return <PagePayments />;
      case '/reports':
        return <Reports />;
      case '/apps':
        return <PageAppsManagement />;
      case '/audit-trail':
        return <PageAuditTrail />;
      case '/companies':
        return <Companies />;
      case '/users':
        return <Users />;
      case '/product-types':
        return <ProductTypes />;
      case '/processing-stages':
        return <ProcessingStages />;
      case '/grades-conditions':
        return <GradesConditions />;
      case '/payment-terms':
        return <PaymentTerms />;
      case '/return-reasons':
        return <ReturnReasons />;
      case '/warranty-types':
        return <WarrantyTypes />;
      case '/import-field-mappings':
        return <ImportFieldMappings />;
      case '/import-intelligence':
        return <ImportIntelligence />;
      case '/model-aliases':
        return <ModelAliases />;
      case '/product-setup':
        return <ProductSetup />;
      case '/business-rules':
        return <BusinessRules />;
      case '/system-config':
        return <SystemConfig />;
      case '/party-directory':
        return <PartyDirectory />;
      case '/engine-toggles':
        return <EngineToggles />;
      case '/component-market-prices':
        return <ComponentMarketPrices />;
      case '/asset-bulk-update':
        return <AssetBulkUpdate />;
      case '/settings':
        return <SystemConfig />;
      case '/product-type-aliases':
        return <ProductSetup />;
      case '/settings/crm':
        return <CRMSettings />;
      case '/settings/auction':
        return <AuctionSettings />;
      case '/settings/recycling':
        return <RecyclingSettings />;
      case '/settings/reseller':
        return <ResellerSettings />;
      case '/settings/inventory':
        return <InventorySettings />;
      case '/settings/website':
        return <WebsiteSettings />;
      default:
        return null;
    }
  };

  const component = getComponent();

  if (!component) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {component}
    </Suspense>
  );
}
