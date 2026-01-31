import {
  Package,
  BarChart3,
  Laptop,
  ShoppingCart,
  Scan,
  Store,
  Cpu,
  DollarSign,
  User,
  FileText,
  RotateCcw,
  TrendingUp,
  PieChart,
  Settings,
  Grid3x3,
  Building2,
  Shield,
  Wrench,
  Award,
  Truck,
  Edit3,
  Gavel
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

interface AppBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface AppModule {
  id: string;
  name: string;
  icon: any;
  pages: {
    name: string;
    page: string;
    roles?: string[];
  }[];
  color: string;
  roles?: string[];
}

export function AppBar({ currentPage, onNavigate }: AppBarProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const moduleMenuRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const { userRole, isSuperAdmin } = useAuth();
  const { selectedCompany } = useCompany();

  const modules: AppModule[] = [
    {
      id: 'processing',
      name: 'Processing',
      icon: Laptop,
      color: 'bg-blue-500',
      roles: ['admin', 'manager', 'technician'],
      pages: [
        { name: 'Processing Dashboard', page: 'processing' },
        { name: 'Asset Bulk Update', page: 'asset-bulk-update', roles: ['admin', 'manager'] },
        { name: 'Processing Stages', page: 'processing-stages', roles: ['admin', 'manager'] },
      ]
    },
    {
      id: 'purchasing',
      name: 'Purchasing',
      icon: ShoppingCart,
      color: 'bg-green-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Purchase Orders', page: 'purchases' },
        { name: 'Smart Receiving', page: 'smart-receiving' },
        { name: 'Suppliers', page: 'suppliers' },
      ]
    },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Package,
      color: 'bg-orange-500',
      roles: ['admin', 'manager', 'sales'],
      pages: [
        { name: 'Ready to Sell', page: 'saleable-inventory' },
        { name: 'Parts & Supplies', page: 'inventory' },
        { name: 'Components', page: 'harvested-components', roles: ['admin', 'manager', 'technician'] },
        { name: 'Stock Movements', page: 'movements', roles: ['admin', 'manager'] },
        { name: 'Locations', page: 'locations' },
      ]
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: DollarSign,
      color: 'bg-emerald-500',
      roles: ['admin', 'manager', 'sales'],
      pages: [
        { name: 'Sales Invoices', page: 'sales' },
        { name: 'Component Sales', page: 'component-sales' },
        { name: 'Auctions', page: 'auctions', roles: ['admin', 'manager'] },
        { name: 'Customers', page: 'customers' },
        { name: 'Returns', page: 'returns' },
        { name: 'Repairs', page: 'repairs' },
      ]
    },
    {
      id: 'itad',
      name: 'ITAD',
      icon: Shield,
      color: 'bg-red-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'ITAD Projects', page: 'itad-projects' },
        { name: 'Revenue Settlements', page: 'itad-revenue-settlements', roles: ['admin', 'manager'] },
        { name: 'Data Sanitization', page: 'data-sanitization' },
        { name: 'ITAD Certificates', page: 'certificates' },
        { name: 'Downstream Vendors', page: 'downstream-vendors' },
        { name: 'Environmental Compliance', page: 'environmental-compliance' },
      ]
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: PieChart,
      color: 'bg-violet-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Dashboard', page: 'dashboard' },
        { name: 'Reports', page: 'reports' },
      ]
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      color: 'bg-gray-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Product Types', page: 'product-types' },
        { name: 'Grades & Conditions', page: 'grades-conditions' },
        { name: 'Component Market Prices', page: 'component-market-prices' },
        { name: 'Payment Terms', page: 'payment-terms' },
        { name: 'Return Reasons', page: 'return-reasons' },
        { name: 'Warranty Types', page: 'warranty-types' },
        { name: 'Import Field Mappings', page: 'import-field-mappings' },
        { name: 'Import Intelligence', page: 'import-intelligence' },
        { name: 'Model Normalization', page: 'model-aliases' },
        { name: 'Company Certifications', page: 'company-certifications', roles: ['admin'] },
        { name: 'Companies', page: 'companies' },
        { name: 'Users', page: 'users', roles: ['admin'] },
      ]
    },
  ];

  const isManagerOrAbove = isSuperAdmin || selectedCompany?.role === 'admin' || selectedCompany?.role === 'manager';

  const filteredModules = modules.filter(module => {
    if (!module.roles) return true;
    if (isSuperAdmin) return true;
    if (!userRole) return false;
    return module.roles.includes(userRole);
  });

  const getFilteredPages = (module: AppModule) => {
    return module.pages.filter(page => {
      if (!page.roles) return true;
      if (isSuperAdmin) return true;
      if (!userRole) return false;
      return page.roles.includes(userRole);
    });
  };

  const getCurrentModule = () => {
    for (const module of modules) {
      const pages = getFilteredPages(module);
      if (pages.some(p => p.page === currentPage)) {
        return module;
      }
    }
    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let clickedInsideModule = false;
      moduleMenuRefs.current.forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          clickedInsideModule = true;
        }
      });

      if (!clickedInsideModule) {
        setActiveModule(null);
      }

      if (appSwitcherRef.current && !appSwitcherRef.current.contains(event.target as Node)) {
        setShowAppSwitcher(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModuleClick = (moduleId: string) => {
    if (activeModule === moduleId) {
      setActiveModule(null);
    } else {
      setActiveModule(moduleId);
    }
  };

  const handlePageClick = (page: string) => {
    onNavigate(page);
    setActiveModule(null);
    setShowAppSwitcher(false);
  };

  const currentModule = getCurrentModule();

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 shadow-lg">
      <div className="flex items-center h-14 px-4">
        <div className="flex items-center gap-2 mr-6">
          <div className="relative" ref={appSwitcherRef}>
            <button
              onClick={() => setShowAppSwitcher(!showAppSwitcher)}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition"
              title="App Switcher"
            >
              <Grid3x3 className="w-5 h-5 text-white" />
            </button>

            {showAppSwitcher && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Applications</div>
                <div className="grid grid-cols-3 gap-3">
                  {filteredModules.map((module) => {
                    const Icon = module.icon;
                    const isActive = currentModule?.id === module.id;
                    return (
                      <button
                        key={module.id}
                        onClick={() => {
                          const pages = getFilteredPages(module);
                          if (pages.length > 0) {
                            handlePageClick(pages[0].page);
                          }
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg transition ${
                          isActive
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 text-center">{module.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            <span className="text-lg font-bold text-white">Stock Pro</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {filteredModules.map((module) => {
            const Icon = module.icon;
            const isActive = currentModule?.id === module.id;
            const pages = getFilteredPages(module);

            return (
              <div
                key={module.id}
                className="relative"
                ref={(el) => {
                  if (el) {
                    moduleMenuRefs.current.set(module.id, el);
                  } else {
                    moduleMenuRefs.current.delete(module.id);
                  }
                }}
              >
                <button
                  onClick={() => handleModuleClick(module.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{module.name}</span>
                </button>

                {activeModule === module.id && pages.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    {pages.map((page) => {
                      const isPageActive = currentPage === page.page;
                      return (
                        <button
                          key={page.page}
                          onClick={() => handlePageClick(page.page)}
                          className={`w-full px-4 py-2 text-left text-sm transition ${
                            isPageActive
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
