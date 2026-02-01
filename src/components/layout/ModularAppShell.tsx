import React, { useState } from 'react';
import { GlobalTopBar } from './GlobalTopBar';
import { ContextualSidebar } from './ContextualSidebar';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Tile_App_Launcher } from '../home/Tile_App_Launcher';
import { Page_Apps_Management } from '../system/Page_Apps_Management';
import { Page_Audit_Trail } from '../system/Page_Audit_Trail';
import { Page_Payments } from '../finance/Page_Payments';
import { ModuleHomeTemplate } from '../modules/ModuleHomeTemplate';
import {
  Recycle, Store, Gavel, Globe, Calculator, Package, Users, Settings,
  TrendingUp, FileText, ShoppingCart, Grid3x3
} from 'lucide-react';

interface ModularAppShellProps {
  children?: React.ReactNode;
}

export function ModularAppShell({ children }: ModularAppShellProps) {
  const { currentWorkspace } = useWorkspace();
  const [currentView, setCurrentView] = useState('overview');

  const handleNavigate = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 0) {
      setCurrentView(parts[parts.length - 1] || 'overview');
    }
  };

  const renderWorkspaceContent = () => {
    if (currentWorkspace === 'home') {
      return <Tile_App_Launcher onNavigate={handleNavigate} />;
    }

    if (currentWorkspace === 'system') {
      if (currentView === 'apps') {
        return <Page_Apps_Management />;
      }
      if (currentView === 'audit') {
        return <Page_Audit_Trail />;
      }
      if (currentView === 'settings') {
        return renderSystemHome();
      }
      return renderSystemHome();
    }

    if (currentWorkspace === 'accounting' && currentView === 'payments') {
      return <Page_Payments />;
    }

    if (currentView === 'overview' || !currentView) {
      return renderModuleHome();
    }

    return children || renderModuleHome();
  };

  const renderModuleHome = () => {
    const configs: Record<string, any> = {
      recycling: {
        title: 'Recycling',
        description: 'Dismantling workflows and component harvesting',
        icon: Recycle,
        stats: [
          { label: 'In Processing', value: '156', icon: Recycle },
          { label: 'Components Harvested', value: '1,234', trend: { direction: 'up', value: '+12%' }, icon: Grid3x3 },
          { label: 'Total Value', value: '$45,230', trend: { direction: 'up', value: '+8%' } },
          { label: 'Processing Rate', value: '94%', trend: { direction: 'up', value: '+2%' } }
        ],
        actions: [
          { label: 'Start Processing', icon: Recycle, onClick: () => console.log('Start processing') }
        ],
        recentActivity: [
          { id: '1', title: 'Batch Completed', description: '50 laptops processed successfully', timestamp: '2 hours ago', type: 'success' }
        ]
      },
      reseller: {
        title: 'Reseller',
        description: 'Fixed-price sales and order management',
        icon: Store,
        stats: [
          { label: 'Active Listings', value: '342', icon: Store },
          { label: 'Orders Today', value: '28', trend: { direction: 'up', value: '+15%' }, icon: ShoppingCart },
          { label: 'Revenue', value: '$12,450', trend: { direction: 'up', value: '+22%' } },
          { label: 'Conversion Rate', value: '3.2%', trend: { direction: 'up', value: '+0.5%' } }
        ],
        actions: [
          { label: 'Create Order', icon: ShoppingCart, onClick: () => console.log('Create order') }
        ]
      },
      auction: {
        title: 'Auction',
        description: 'Live and timed auction management',
        icon: Gavel,
        stats: [
          { label: 'Active Auctions', value: '12', icon: Gavel },
          { label: 'Total Bids', value: '456', trend: { direction: 'up', value: '+34%' } },
          { label: 'Auction Value', value: '$89,230', trend: { direction: 'up', value: '+18%' } },
          { label: 'Win Rate', value: '76%' }
        ],
        actions: [
          { label: 'Create Auction', icon: Gavel, onClick: () => console.log('Create auction') }
        ]
      },
      website: {
        title: 'Website & CMS',
        description: 'Content management and storefront',
        icon: Globe,
        stats: [
          { label: 'Pages', value: '24', icon: FileText },
          { label: 'Visitors Today', value: '1,234', trend: { direction: 'up', value: '+12%' } },
          { label: 'Page Views', value: '5,678', trend: { direction: 'up', value: '+8%' } },
          { label: 'Bounce Rate', value: '32%', trend: { direction: 'down', value: '-5%' } }
        ],
        actions: [
          { label: 'New Page', icon: FileText, onClick: () => console.log('New page') }
        ]
      },
      accounting: {
        title: 'Accounting',
        description: 'Financial management and reporting',
        icon: Calculator,
        stats: [
          { label: 'Accounts', value: '45', icon: Calculator },
          { label: 'Journal Entries', value: '234', trend: { direction: 'up', value: '+5%' } },
          { label: 'Total Assets', value: '$450,230' },
          { label: 'Net Income', value: '$89,450', trend: { direction: 'up', value: '+12%' } }
        ],
        actions: [
          { label: 'New Entry', icon: FileText, onClick: () => console.log('New entry') }
        ]
      },
      inventory: {
        title: 'Inventory',
        description: 'Stock management and movements',
        icon: Package,
        stats: [
          { label: 'Stock Items', value: '2,456', icon: Package },
          { label: 'Total Value', value: '$234,560', trend: { direction: 'up', value: '+8%' } },
          { label: 'Low Stock', value: '12', trend: { direction: 'down', value: '-3' } },
          { label: 'Movements Today', value: '45' }
        ],
        actions: [
          { label: 'Stock Adjustment', icon: Package, onClick: () => console.log('Adjust stock') }
        ]
      },
      parties: {
        title: 'Parties',
        description: 'Customers, suppliers, and contacts',
        icon: Users,
        stats: [
          { label: 'Total Parties', value: '345', icon: Users },
          { label: 'Customers', value: '234', trend: { direction: 'up', value: '+12' } },
          { label: 'Suppliers', value: '111', trend: { direction: 'up', value: '+5' } },
          { label: 'Active This Month', value: '89' }
        ],
        actions: [
          { label: 'Add Party', icon: Users, onClick: () => console.log('Add party') }
        ]
      }
    };

    const config = configs[currentWorkspace];
    if (!config) return null;

    return (
      <ModuleHomeTemplate
        title={config.title}
        description={config.description}
        icon={config.icon}
        stats={config.stats}
        actions={config.actions}
        recentActivity={config.recentActivity}
      />
    );
  };

  const renderSystemHome = () => {
    return (
      <ModuleHomeTemplate
        title="System"
        description="Configuration and administration"
        icon={Settings}
        stats={[
          { label: 'Enabled Apps', value: '8', icon: Grid3x3 },
          { label: 'Active Users', value: '24', icon: Users },
          { label: 'Audit Entries', value: '1,234', trend: { direction: 'up', value: '+45' } },
          { label: 'System Health', value: '99%', trend: { direction: 'up', value: '+1%' } }
        ]}
        actions={[
          { label: 'Manage Apps', onClick: () => setCurrentView('apps') }
        ]}
        recentActivity={[
          { id: '1', title: 'App Enabled', description: 'CRM module was enabled', timestamp: '1 hour ago', type: 'success' }
        ]}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <GlobalTopBar />
      <div className="flex-1 flex overflow-hidden">
        <ContextualSidebar currentView={currentView} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-hidden">
          {renderWorkspaceContent()}
        </main>
      </div>
    </div>
  );
}
