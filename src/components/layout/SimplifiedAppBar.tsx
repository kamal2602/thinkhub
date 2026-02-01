import {
  Package,
  BarChart3,
  Settings,
  User,
  Grid3x3,
  Wrench,
  ShoppingBag,
  Shield,
  PieChart,
  Home,
  Search,
  Calculator
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

interface SimplifiedAppBarProps {
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

export function SimplifiedAppBar({ currentPage, onNavigate }: SimplifiedAppBarProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const moduleMenuRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const { userRole, isSuperAdmin } = useAuth();
  const { selectedCompany } = useCompany();

  const modules: AppModule[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Home,
      color: 'bg-blue-500',
      pages: [
        { name: 'Dashboard', page: 'dashboard' },
      ]
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: Wrench,
      color: 'bg-blue-500',
      roles: ['admin', 'manager', 'technician'],
      pages: [
        { name: 'Assets', page: 'processing' },
        { name: 'Receiving', page: 'smart-receiving', roles: ['admin', 'manager'] },
        { name: 'Inventory', page: 'saleable-inventory' },
        { name: 'Locations', page: 'locations' },
      ]
    },
    {
      id: 'business',
      name: 'Business',
      icon: ShoppingBag,
      color: 'bg-emerald-500',
      roles: ['admin', 'manager', 'sales'],
      pages: [
        { name: 'Purchase Orders', page: 'purchases', roles: ['admin', 'manager'] },
        { name: 'Sales Orders', page: 'sales' },
        { name: 'Suppliers', page: 'suppliers', roles: ['admin', 'manager'] },
        { name: 'Customers', page: 'customers' },
        { name: 'Returns & Repairs', page: 'returns' },
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
        { name: 'Compliance', page: 'itad-compliance' },
        { name: 'Downstream Vendors', page: 'downstream-vendors' },
      ]
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: Calculator,
      color: 'bg-green-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Chart of Accounts', page: 'chart-of-accounts' },
        { name: 'Journal Entries', page: 'journal-entries' },
      ]
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: PieChart,
      color: 'bg-violet-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Analytics', page: 'reports' },
      ]
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      color: 'bg-slate-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Product Setup', page: 'product-setup' },
        { name: 'Business Rules', page: 'business-rules' },
        { name: 'System Config', page: 'system-config' },
        { name: 'Processing Stages', page: 'processing-stages' },
      ]
    },
    {
      id: 'account',
      name: 'Account',
      icon: User,
      color: 'bg-gray-500',
      roles: ['admin', 'manager'],
      pages: [
        { name: 'Companies', page: 'companies' },
        { name: 'Users', page: 'users', roles: ['admin'] },
      ]
    },
  ];

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleModuleClick = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      const pages = getFilteredPages(module);
      if (pages.length === 1) {
        handlePageClick(pages[0].page);
      } else if (activeModule === moduleId) {
        setActiveModule(null);
      } else {
        setActiveModule(moduleId);
      }
    }
  };

  const handlePageClick = (page: string) => {
    onNavigate(page);
    setActiveModule(null);
    setShowAppSwitcher(false);
  };

  const currentModule = getCurrentModule();

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center h-14 px-4">
        <div className="flex items-center gap-4 mr-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Stock Pro</span>
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
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{module.name}</span>
                </button>

                {activeModule === module.id && pages.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    {pages.map((page) => {
                      const isPageActive = currentPage === page.page;
                      return (
                        <button
                          key={page.page}
                          onClick={() => handlePageClick(page.page)}
                          className={`w-full px-4 py-2 text-left text-sm transition ${
                            isPageActive
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition border border-slate-200"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
