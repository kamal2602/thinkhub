import { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { HomeLaunchpad } from '../components/launchpad/HomeLaunchpad';
import { EngineGuard } from '../components/common/EngineGuard';
import { SimplifiedDashboard } from '../components/dashboard/SimplifiedDashboard';
import { Processing } from '../components/processing/Processing';
import { ProductTypes } from '../components/product-types/ProductTypes';
import { PurchaseLots } from '../components/purchase-lots/PurchaseLots';
import { Inventory } from '../components/inventory/Inventory';
import { SaleableInventory } from '../components/inventory/SaleableInventory';
import HarvestedComponentsEnhanced from '../components/inventory/HarvestedComponentsEnhanced';
import { StockMovements } from '../components/movements/StockMovements';
import { Locations } from '../components/locations/Locations';
import { Companies } from '../components/companies/Companies';
import { Users } from '../components/users/Users';
import { AdminUserManagement } from '../components/users/AdminUserManagement';
import { Suppliers } from '../components/suppliers/Suppliers';
import { Customers } from '../components/customers/Customers';
import { PurchaseOrdersList } from '../components/purchases/PurchaseOrdersList';
import SmartReceivingWorkflow from '../components/receiving/SmartReceivingWorkflow';
import { SalesInvoices } from '../components/sales/SalesInvoices';
import { UnifiedSalesCatalog } from '../components/sales/UnifiedSalesCatalog';
import { Returns } from '../components/returns/Returns';
import { Reports } from '../components/reports/Reports';
import { GradesConditions } from '../components/settings/GradesConditions';
import { PaymentTerms } from '../components/settings/PaymentTerms';
import { ReturnReasons } from '../components/settings/ReturnReasons';
import { WarrantyTypes } from '../components/settings/WarrantyTypes';
import { ImportFieldMappings } from '../components/settings/ImportFieldMappings';
import { ImportIntelligence } from '../components/settings/ImportIntelligence';
import { ModelAliases } from '../components/settings/ModelAliases';
import ComponentMarketPrices from '../components/settings/ComponentMarketPrices';
import ComponentSales from '../components/inventory/ComponentSales';
import ProcessingStages from '../components/settings/ProcessingStages';
import { DataSanitization } from '../components/itad/DataSanitization';
import { Certificates } from '../components/itad/Certificates';
import { EnvironmentalCompliance } from '../components/itad/EnvironmentalCompliance';
import { ITADProjects } from '../components/itad/ITADProjects';
import { DownstreamVendors } from '../components/itad/DownstreamVendors';
import { Repairs } from '../components/repairs/Repairs';
import { CompanyCertifications } from '../components/settings/CompanyCertifications';
import { AssetBulkUpdate } from '../components/processing/AssetBulkUpdate';
import { AuctionManagement } from '../components/auctions/AuctionManagement';
import { ITADRevenueSettlements } from '../components/itad/ITADRevenueSettlements';
import { ProductSetup } from '../components/settings/ProductSetup';
import { BusinessRules } from '../components/settings/BusinessRules';
import { SystemConfig } from '../components/settings/SystemConfig';
import { ITADCompliance } from '../components/itad/ITADCompliance';
import { ChartOfAccounts } from '../components/accounting/ChartOfAccounts';
import { JournalEntries } from '../components/accounting/JournalEntries';
import { EngineToggles } from '../components/settings/EngineToggles';
import { PartyDirectory } from '../components/settings/PartyDirectory';
import { CRMDashboard } from '../components/crm/CRMDashboard';
import { Leads } from '../components/crm/Leads';
import { Opportunities } from '../components/crm/Opportunities';
import { Activities } from '../components/crm/Activities';
import { WebsiteDashboard } from '../components/website/WebsiteDashboard';
import { Pages } from '../components/website/Pages';
import { NavigationMenus } from '../components/website/NavigationMenus';
import { WebsiteSettings } from '../components/website/WebsiteSettings';
import { InitialSetup } from '../components/onboarding/InitialSetup';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [setupComplete, setSetupComplete] = useState(false);
  const { selectedCompany, loading, refreshCompanies } = useCompany();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !selectedCompany && !setupComplete) {
      setCurrentPage('initial-setup');
    } else if (!loading && selectedCompany && currentPage === 'initial-setup') {
      setCurrentPage('dashboard');
    }
  }, [loading, selectedCompany, setupComplete]);

  const handleSetupComplete = async () => {
    setSetupComplete(true);
    await refreshCompanies();
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!selectedCompany && currentPage === 'initial-setup') {
    return <InitialSetup onComplete={handleSetupComplete} />;
  }

  return (
    <AppShell
      currentView={currentPage}
      onNavigate={setCurrentPage}
      isAdmin={isSuperAdmin}
    >
      {currentPage === 'dashboard' && <HomeLaunchpad onNavigate={setCurrentPage} />}
        {currentPage === 'processing' && <Processing />}
        {currentPage === 'asset-bulk-update' && <AssetBulkUpdate />}
        {currentPage === 'product-types' && <ProductTypes />}
        {currentPage === 'purchase-lots' && <PurchaseLots />}
        {currentPage === 'saleable-inventory' && <SaleableInventory />}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'component-harvesting' && (
          <EngineGuard engine="recycling_enabled">
            <HarvestedComponentsEnhanced />
          </EngineGuard>
        )}
        {currentPage === 'harvested-components' && (
          <EngineGuard engine="recycling_enabled">
            <HarvestedComponentsEnhanced />
          </EngineGuard>
        )}
        {currentPage === 'suppliers' && <Suppliers />}
        {currentPage === 'customers' && <Customers />}
        {currentPage === 'movements' && <StockMovements />}
        {currentPage === 'locations' && <Locations />}
        {currentPage === 'companies' && <Companies />}
        {currentPage === 'users' && (isSuperAdmin ? <AdminUserManagement /> : <Users />)}
        {currentPage === 'purchases' && <PurchaseOrdersList />}
        {currentPage === 'receiving' && <SmartReceivingWorkflow />}
        {currentPage === 'smart-receiving' && <SmartReceivingWorkflow />}
        {currentPage === 'sales-catalog' && <UnifiedSalesCatalog />}
        {currentPage === 'sales-orders' && <UnifiedSalesCatalog />}
        {currentPage === 'sales-invoices' && <SalesInvoices />}
        {currentPage === 'sales' && <SalesInvoices />}
        {currentPage === 'returns' && <Returns />}
        {currentPage === 'repairs' && <Repairs />}
        {currentPage === 'reports' && <Reports />}
        {currentPage === 'grades-conditions' && <GradesConditions />}
        {currentPage === 'payment-terms' && <PaymentTerms />}
        {currentPage === 'return-reasons' && <ReturnReasons />}
        {currentPage === 'warranty-types' && <WarrantyTypes />}
        {currentPage === 'import-field-mappings' && <ImportFieldMappings />}
        {currentPage === 'import-intelligence' && <ImportIntelligence />}
        {currentPage === 'model-aliases' && <ModelAliases />}
        {currentPage === 'product-type-aliases' && <ProductTypes initialTab="all-aliases" />}
        {currentPage === 'component-market-prices' && (
          <EngineGuard engine="recycling_enabled">
            <ComponentMarketPrices />
          </EngineGuard>
        )}
        {currentPage === 'company-certifications' && (
          <EngineGuard engine="itad_enabled">
            <CompanyCertifications />
          </EngineGuard>
        )}
        {currentPage === 'component-sales' && (
          <EngineGuard engine="recycling_enabled">
            <ComponentSales />
          </EngineGuard>
        )}
        {currentPage === 'processing-stages' && <ProcessingStages />}
        {currentPage === 'data-sanitization' && (
          <EngineGuard engine="itad_enabled">
            <DataSanitization />
          </EngineGuard>
        )}
        {currentPage === 'itad-projects' && (
          <EngineGuard engine="itad_enabled">
            <ITADProjects />
          </EngineGuard>
        )}
        {currentPage === 'certificates' && (
          <EngineGuard engine="itad_enabled">
            <Certificates />
          </EngineGuard>
        )}
        {currentPage === 'downstream-vendors' && (
          <EngineGuard engine="itad_enabled">
            <DownstreamVendors />
          </EngineGuard>
        )}
        {currentPage === 'environmental-compliance' && (
          <EngineGuard engine="itad_enabled">
            <EnvironmentalCompliance />
          </EngineGuard>
        )}
        {currentPage === 'auctions' && (
          <EngineGuard engine="auction_enabled">
            <AuctionManagement />
          </EngineGuard>
        )}
        {currentPage === 'itad-revenue-settlements' && (
          <EngineGuard engine="itad_enabled">
            <ITADRevenueSettlements />
          </EngineGuard>
        )}
        {currentPage === 'product-setup' && <ProductSetup />}
        {currentPage === 'business-rules' && <BusinessRules />}
        {currentPage === 'system-config' && <SystemConfig />}
        {currentPage === 'party-directory' && <PartyDirectory />}
        {currentPage === 'itad-compliance' && (
          <EngineGuard engine="itad_enabled">
            <ITADCompliance />
          </EngineGuard>
        )}
        {currentPage === 'accounting' && <ChartOfAccounts />}
        {currentPage === 'chart-of-accounts' && <ChartOfAccounts />}
        {currentPage === 'journal-entries' && <JournalEntries />}
        {currentPage === 'settings' && <SystemConfig />}
        {currentPage === 'engine-toggles' && <EngineToggles />}
        {currentPage === 'crm' && (
          <EngineGuard engine="crm_enabled">
            <CRMDashboard onNavigate={setCurrentPage} />
          </EngineGuard>
        )}
        {currentPage === 'crm-leads' && (
          <EngineGuard engine="crm_enabled">
            <Leads />
          </EngineGuard>
        )}
        {currentPage === 'crm-opportunities' && (
          <EngineGuard engine="crm_enabled">
            <Opportunities />
          </EngineGuard>
        )}
        {currentPage === 'crm-activities' && (
          <EngineGuard engine="crm_enabled">
            <Activities />
          </EngineGuard>
        )}
        {currentPage === 'website' && (
          <EngineGuard engine="website_enabled">
            <WebsiteDashboard />
          </EngineGuard>
        )}
        {currentPage === 'website-pages' && (
          <EngineGuard engine="website_enabled">
            <Pages />
          </EngineGuard>
        )}
        {currentPage === 'website-menus' && (
          <EngineGuard engine="website_enabled">
            <NavigationMenus />
          </EngineGuard>
        )}
        {currentPage === 'website-settings' && (
          <EngineGuard engine="website_enabled">
            <WebsiteSettings />
          </EngineGuard>
        )}
    </AppShell>
  );
}
