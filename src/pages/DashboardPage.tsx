import { useState, useEffect } from 'react';
import { SimplifiedAppBar } from '../components/layout/SimplifiedAppBar';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { SearchBar } from '../components/layout/SearchBar';
import { Header } from '../components/layout/Header';
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
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { CommandPalette } from '../components/common/CommandPalette';

export function DashboardPage() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { selectedCompany, loading } = useCompany();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !selectedCompany) {
      setCurrentPage('companies');
    } else if (!loading && selectedCompany && currentPage === 'companies') {
      setCurrentPage('dashboard');
    }
  }, [loading, selectedCompany]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <SimplifiedAppBar currentPage={currentPage} onNavigate={setCurrentPage} />
      <Header />
      <Breadcrumbs currentPage={currentPage} onNavigate={setCurrentPage} />
      <SearchBar currentPage={currentPage} onNavigate={setCurrentPage} />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(page) => setCurrentPage(page.replace('/', ''))}
      />

      <main className="flex-1 overflow-y-auto">
        {currentPage === 'dashboard' && <SimplifiedDashboard />}
        {currentPage === 'processing' && <Processing />}
        {currentPage === 'asset-bulk-update' && <AssetBulkUpdate />}
        {currentPage === 'product-types' && <ProductTypes />}
        {currentPage === 'purchase-lots' && <PurchaseLots />}
        {currentPage === 'saleable-inventory' && <SaleableInventory />}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'harvested-components' && <HarvestedComponentsEnhanced />}
        {currentPage === 'suppliers' && <Suppliers />}
        {currentPage === 'customers' && <Customers />}
        {currentPage === 'movements' && <StockMovements />}
        {currentPage === 'locations' && <Locations />}
        {currentPage === 'companies' && <Companies />}
        {currentPage === 'users' && (isSuperAdmin ? <AdminUserManagement /> : <Users />)}
        {currentPage === 'purchases' && <PurchaseOrdersList />}
        {currentPage === 'smart-receiving' && <SmartReceivingWorkflow />}
        {currentPage === 'sales-catalog' && <UnifiedSalesCatalog />}
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
        {currentPage === 'component-market-prices' && <ComponentMarketPrices />}
        {currentPage === 'company-certifications' && <CompanyCertifications />}
        {currentPage === 'component-sales' && <ComponentSales />}
        {currentPage === 'processing-stages' && <ProcessingStages />}
        {currentPage === 'data-sanitization' && <DataSanitization />}
        {currentPage === 'itad-projects' && <ITADProjects />}
        {currentPage === 'certificates' && <Certificates />}
        {currentPage === 'downstream-vendors' && <DownstreamVendors />}
        {currentPage === 'environmental-compliance' && <EnvironmentalCompliance />}
        {currentPage === 'auctions' && <AuctionManagement />}
        {currentPage === 'itad-revenue-settlements' && <ITADRevenueSettlements />}
        {currentPage === 'product-setup' && <ProductSetup />}
        {currentPage === 'business-rules' && <BusinessRules />}
        {currentPage === 'system-config' && <SystemConfig />}
        {currentPage === 'itad-compliance' && <ITADCompliance />}
        {currentPage === 'chart-of-accounts' && <ChartOfAccounts />}
        {currentPage === 'journal-entries' && <JournalEntries />}
        {currentPage === 'engine-toggles' && <EngineToggles />}
      </main>
    </div>
  );
}
