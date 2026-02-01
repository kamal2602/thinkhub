import React from 'react';
import {
  Package, Grid3x3, Archive, Users, Layers, ShoppingCart, FileText,
  Recycle, Store, Gavel, Globe,
  Calculator, DollarSign, BarChart3,
  Settings, Shield, ClipboardList, Boxes
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface AppTile {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  onClick: () => void;
}

interface AppSection {
  title: string;
  description: string;
  tiles: AppTile[];
}

interface TileAppLauncherProps {
  onNavigate?: (path: string) => void;
}

export function Tile_App_Launcher({ onNavigate }: TileAppLauncherProps) {
  const { setCurrentWorkspace } = useWorkspace();

  const handleTileClick = (workspaceId: string, path?: string) => {
    if (workspaceId) {
      setCurrentWorkspace(workspaceId as any);
    }
    if (path && onNavigate) {
      onNavigate(path);
    }
  };

  const sections: AppSection[] = [
    {
      title: 'CORE',
      description: 'Foundational entities and master data',
      tiles: [
        {
          id: 'assets',
          name: 'Assets',
          icon: Boxes,
          description: 'Original source objects',
          color: 'blue',
          onClick: () => handleTileClick('recycling', '/processing')
        },
        {
          id: 'components',
          name: 'Components',
          icon: Grid3x3,
          description: 'Output of dismantling',
          color: 'green',
          onClick: () => handleTileClick('recycling', '/components')
        },
        {
          id: 'inventory',
          name: 'Inventory',
          icon: Package,
          description: 'Unified stock authority',
          color: 'orange',
          onClick: () => handleTileClick('inventory', '/inventory')
        },
        {
          id: 'parties',
          name: 'Parties',
          icon: Users,
          description: 'All people & companies',
          color: 'cyan',
          onClick: () => handleTileClick('parties', '/parties/directory')
        },
        {
          id: 'lots',
          name: 'Lots',
          icon: Archive,
          description: 'Logical groupings',
          color: 'purple',
          onClick: () => handleTileClick('inventory', '/lots')
        },
        {
          id: 'orders',
          name: 'Orders',
          icon: ShoppingCart,
          description: 'Sales commitments',
          color: 'indigo',
          onClick: () => handleTileClick('reseller', '/orders')
        },
        {
          id: 'invoices',
          name: 'Invoices',
          icon: FileText,
          description: 'Financial truth',
          color: 'emerald',
          onClick: () => handleTileClick('reseller', '/invoices')
        }
      ]
    },
    {
      title: 'OPERATIONS',
      description: 'Business workflows and processes',
      tiles: [
        {
          id: 'recycling',
          name: 'Recycling',
          icon: Recycle,
          description: 'Dismantling & classification',
          color: 'green',
          onClick: () => handleTileClick('recycling', '/recycling')
        },
        {
          id: 'reseller',
          name: 'Reseller',
          icon: Store,
          description: 'Fixed-price selling',
          color: 'blue',
          onClick: () => handleTileClick('reseller', '/reseller')
        },
        {
          id: 'auction',
          name: 'Auction',
          icon: Gavel,
          description: 'Live / timed sales',
          color: 'purple',
          onClick: () => handleTileClick('auction', '/auction')
        },
        {
          id: 'website',
          name: 'Website',
          icon: Globe,
          description: 'CMS / storefront',
          color: 'indigo',
          onClick: () => handleTileClick('website', '/website')
        }
      ]
    },
    {
      title: 'FINANCE',
      description: 'Financial management and reporting',
      tiles: [
        {
          id: 'accounting',
          name: 'Accounting',
          icon: Calculator,
          description: 'GL, ledgers, taxes',
          color: 'emerald',
          onClick: () => handleTileClick('accounting', '/accounting')
        },
        {
          id: 'payments',
          name: 'Payments',
          icon: DollarSign,
          description: 'Receipts & payouts',
          color: 'green',
          onClick: () => handleTileClick('accounting', '/payments')
        },
        {
          id: 'reports',
          name: 'Reports',
          icon: BarChart3,
          description: 'KPIs & traceability',
          color: 'blue',
          onClick: () => handleTileClick('system', '/reports')
        }
      ]
    },
    {
      title: 'SYSTEM',
      description: 'Configuration and administration',
      tiles: [
        {
          id: 'apps',
          name: 'Apps',
          icon: Layers,
          description: 'Enable / disable engines',
          color: 'slate',
          onClick: () => handleTileClick('system', '/system/apps')
        },
        {
          id: 'settings',
          name: 'Settings',
          icon: Settings,
          description: 'Per-module configs',
          color: 'gray',
          onClick: () => handleTileClick('system', '/system/settings')
        },
        {
          id: 'users',
          name: 'Users & Roles',
          icon: Shield,
          description: 'Permissions',
          color: 'indigo',
          onClick: () => handleTileClick('system', '/system/users')
        },
        {
          id: 'audit',
          name: 'Audit',
          icon: ClipboardList,
          description: 'Full chain tracking',
          color: 'orange',
          onClick: () => handleTileClick('system', '/system/audit')
        }
      ]
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100' },
      green: { bg: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', hover: 'hover:bg-orange-100' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', hover: 'hover:bg-cyan-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-100' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'hover:bg-emerald-100' },
      slate: { bg: 'bg-slate-50', text: 'text-slate-600', hover: 'hover:bg-slate-100' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-600', hover: 'hover:bg-gray-100' }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">App Launcher</h1>
          <p className="text-gray-600">Select a module to get started</p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              <p className="text-sm text-gray-600">{section.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {section.tiles.map((tile) => {
                const Icon = tile.icon;
                const colors = getColorClasses(tile.color);

                return (
                  <button
                    key={tile.id}
                    onClick={tile.onClick}
                    className={`group p-6 bg-white rounded-xl border-2 border-gray-200 ${colors.hover} transition-all duration-200 hover:shadow-lg hover:border-gray-300 text-left`}
                  >
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{tile.name}</h3>
                    <p className="text-sm text-gray-600">{tile.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
