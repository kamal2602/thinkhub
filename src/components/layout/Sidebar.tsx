import React, { useState } from 'react';
import {
  Home, Package, Recycle, Archive, ShoppingCart, DollarSign,
  BarChart3, Settings, ChevronDown, ChevronRight
} from 'lucide-react';
import { useEngines } from '../../hooks/useEngines';

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SidebarItem[];
  requireEngine?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  path: string;
  requireEngine?: string;
  badge?: string;
}

export function Sidebar({
  currentView,
  onNavigate,
  isAdmin,
}: {
  currentView: string;
  onNavigate: (view: string) => void;
  isAdmin: boolean;
}) {
  const { engines } = useEngines();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['home']));

  const sections: SidebarSection[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={20} />,
      items: [
        { id: 'dashboard', label: 'Dashboard', path: 'dashboard' },
      ],
    },
    {
      id: 'acquire',
      label: 'Acquire',
      icon: <Package size={20} />,
      items: [
        { id: 'purchase-lots', label: 'Purchase Lots', path: 'purchase-lots' },
        { id: 'receiving', label: 'Receiving', path: 'receiving' },
        { id: 'suppliers', label: 'Suppliers', path: 'suppliers' },
      ],
    },
    {
      id: 'recycle',
      label: 'Recycle',
      icon: <Recycle size={20} />,
      items: [
        { id: 'processing', label: 'Processing', path: 'processing' },
        { id: 'component-harvesting', label: 'Component Harvesting', path: 'component-harvesting' },
        { id: 'itad-compliance', label: 'ITAD Compliance', path: 'itad-compliance' },
        { id: 'itad-projects', label: 'ITAD Projects', path: 'itad-projects' },
      ],
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Archive size={20} />,
      items: [
        { id: 'inventory', label: 'All Inventory', path: 'inventory' },
        { id: 'saleable-inventory', label: 'Saleable Items', path: 'saleable-inventory' },
        { id: 'component-sales', label: 'Components', path: 'component-sales' },
      ],
    },
    {
      id: 'sell',
      label: 'Sell',
      icon: <ShoppingCart size={20} />,
      items: [
        { id: 'auctions', label: 'Auctions', path: 'auctions', requireEngine: 'auction_enabled' },
        { id: 'sales-orders', label: 'Sales Orders', path: 'sales-orders' },
        { id: 'sales-invoices', label: 'Sales Invoices', path: 'sales-invoices' },
        { id: 'customers', label: 'Customers', path: 'customers' },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: <DollarSign size={20} />,
      items: [
        { id: 'accounting', label: 'Accounting', path: 'accounting' },
        { id: 'chart-of-accounts', label: 'Chart of Accounts', path: 'chart-of-accounts' },
        { id: 'journal-entries', label: 'Journal Entries', path: 'journal-entries' },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 size={20} />,
      items: [
        { id: 'reports', label: 'All Reports', path: 'reports' },
      ],
    },
  ];

  if (isAdmin) {
    sections.push({
      id: 'admin',
      label: 'Administration',
      icon: <Settings size={20} />,
      items: [
        { id: 'engine-toggles', label: 'Engine Toggles', path: 'engine-toggles' },
        { id: 'users', label: 'Users & Roles', path: 'users' },
        { id: 'companies', label: 'Companies', path: 'companies' },
        { id: 'settings', label: 'System Config', path: 'settings' },
        { id: 'product-types', label: 'Product Types', path: 'product-types' },
        { id: 'processing-stages', label: 'Processing Stages', path: 'processing-stages' },
        { id: 'import-field-mappings', label: 'Import Mappings', path: 'import-field-mappings' },
      ],
    });
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const shouldShowItem = (item: SidebarItem) => {
    if (!item.requireEngine) return true;
    return engines?.[item.requireEngine] === true;
  };

  const shouldShowSection = (section: SidebarSection) => {
    if (!section.requireEngine) {
      return section.items.some(item => shouldShowItem(item));
    }
    return engines?.[section.requireEngine] === true && section.items.some(item => shouldShowItem(item));
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col bg-neutral-900 text-neutral-300 animate-slide-in-left"
      style={{ width: 'var(--sidebar-width)', zIndex: 'var(--z-fixed)' }}
    >
      <div className="h-16 flex items-center px-6 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">StockPro</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar py-4">
        {sections.filter(shouldShowSection).map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const visibleItems = section.items.filter(shouldShowItem);

          return (
            <div key={section.id} className="mb-2">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span>{section.label}</span>
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isExpanded && (
                <div className="mt-1">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.path)}
                      className={`
                        w-full flex items-center justify-between px-6 py-2 pl-14 text-sm
                        transition-colors
                        ${currentView === item.path
                          ? 'bg-primary-600 text-white font-medium'
                          : 'hover:bg-neutral-800'
                        }
                      `}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 p-4">
        <div className="text-xs text-neutral-500">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
