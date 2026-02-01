import React, { useState } from 'react';
import {
  LayoutGrid, Package, Recycle, Store, Gavel, Globe, Calculator,
  Users, Settings, Grid3x3, ShoppingCart, FileText, TrendingUp,
  Archive, DollarSign, BarChart3, Wrench, Shield, Truck, ClipboardList
} from 'lucide-react';
import { useWorkspace, WorkspaceId } from '../../contexts/WorkspaceContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  onClick?: () => void;
}

interface SidebarConfig {
  sections: {
    title: string;
    items: NavItem[];
  }[];
}

const SIDEBAR_CONFIGS: Record<WorkspaceId, SidebarConfig> = {
  home: {
    sections: [
      {
        title: 'Navigation',
        items: [
          { id: 'launcher', label: 'App Launcher', icon: LayoutGrid, path: '/home' }
        ]
      }
    ]
  },
  recycling: {
    sections: [
      {
        title: 'Recycling',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/recycling' },
          { id: 'processing', label: 'Processing Queue', icon: Recycle, path: '/recycling/processing' },
          { id: 'components', label: 'Harvested Parts', icon: Grid3x3, path: '/recycling/components' },
          { id: 'reports', label: 'Reports', icon: BarChart3, path: '/recycling/reports' }
        ]
      },
      {
        title: 'Configuration',
        items: [
          { id: 'stages', label: 'Processing Stages', icon: ClipboardList, path: '/recycling/settings/stages' },
          { id: 'grades', label: 'Grades & Conditions', icon: Shield, path: '/recycling/settings/grades' }
        ]
      }
    ]
  },
  reseller: {
    sections: [
      {
        title: 'Reseller',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/reseller' },
          { id: 'catalog', label: 'Sales Catalog', icon: Store, path: '/reseller/catalog' },
          { id: 'orders', label: 'Sales Orders', icon: ShoppingCart, path: '/reseller/orders' },
          { id: 'invoices', label: 'Invoices', icon: FileText, path: '/reseller/invoices' }
        ]
      }
    ]
  },
  auction: {
    sections: [
      {
        title: 'Auction',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/auction' },
          { id: 'lots', label: 'Auction Lots', icon: Gavel, path: '/auction/lots' },
          { id: 'live', label: 'Live Auctions', icon: TrendingUp, path: '/auction/live' },
          { id: 'settlements', label: 'Settlements', icon: DollarSign, path: '/auction/settlements' }
        ]
      }
    ]
  },
  website: {
    sections: [
      {
        title: 'Website',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/website' },
          { id: 'pages', label: 'Pages', icon: FileText, path: '/website/pages' },
          { id: 'menus', label: 'Navigation', icon: Grid3x3, path: '/website/menus' },
          { id: 'settings', label: 'Settings', icon: Settings, path: '/website/settings' }
        ]
      }
    ]
  },
  accounting: {
    sections: [
      {
        title: 'Accounting',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/accounting' },
          { id: 'accounts', label: 'Chart of Accounts', icon: Calculator, path: '/accounting/accounts' },
          { id: 'journal', label: 'Journal Entries', icon: FileText, path: '/accounting/journal' },
          { id: 'reports', label: 'Reports', icon: BarChart3, path: '/accounting/reports' }
        ]
      }
    ]
  },
  inventory: {
    sections: [
      {
        title: 'Inventory',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/inventory' },
          { id: 'stock', label: 'Stock Items', icon: Package, path: '/inventory/stock' },
          { id: 'movements', label: 'Movements', icon: Truck, path: '/inventory/movements' },
          { id: 'lots', label: 'Purchase Lots', icon: Archive, path: '/inventory/lots' }
        ]
      }
    ]
  },
  parties: {
    sections: [
      {
        title: 'Parties',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/parties' },
          { id: 'directory', label: 'Directory', icon: Users, path: '/parties/directory' },
          { id: 'customers', label: 'Customers', icon: Users, path: '/parties/customers' },
          { id: 'suppliers', label: 'Suppliers', icon: Truck, path: '/parties/suppliers' }
        ]
      }
    ]
  },
  system: {
    sections: [
      {
        title: 'System',
        items: [
          { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/system' },
          { id: 'apps', label: 'Apps', icon: Grid3x3, path: '/system/apps' },
          { id: 'users', label: 'Users & Roles', icon: Users, path: '/system/users' },
          { id: 'audit', label: 'Audit Trail', icon: ClipboardList, path: '/system/audit' },
          { id: 'settings', label: 'Settings', icon: Settings, path: '/system/settings' }
        ]
      }
    ]
  }
};

interface ContextualSidebarProps {
  currentView?: string;
  onNavigate?: (path: string) => void;
}

export function ContextualSidebar({ currentView, onNavigate }: ContextualSidebarProps) {
  const { currentWorkspace } = useWorkspace();
  const config = SIDEBAR_CONFIGS[currentWorkspace];

  const handleNavigation = (path?: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
    } else if (path && onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {config.sections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
              {section.title}
            </h3>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path, item.onClick)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );
}
