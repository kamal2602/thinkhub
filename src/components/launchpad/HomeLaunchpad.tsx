import React, { useEffect, useState } from 'react';
import {
  Package, Inbox, Building2, Recycle, ClipboardCheck, Layers,
  Archive, ShoppingBag, Box, Gavel, FileText, Users, DollarSign,
  Receipt, CreditCard, BarChart3
} from 'lucide-react';
import { ProcessSection } from './ProcessSection';
import { ProcessTileProps } from './ProcessTile';
import { useEngines } from '../../hooks/useEngines';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function HomeLaunchpad({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { engines } = useEngines();
  const { user, userRole } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      try {
        const [
          purchaseLotsResult,
          assetsResult,
          auctionsResult,
          salesOrdersResult,
          suppliersResult,
          customersResult,
        ] = await Promise.all([
          supabase.from('purchase_lots').select('id', { count: 'exact', head: true }),
          supabase.from('assets').select('id', { count: 'exact', head: true }),
          supabase.from('auctions').select('id', { count: 'exact', head: true }),
          supabase.from('sales_orders').select('id', { count: 'exact', head: true }),
          supabase.from('parties').select('id', { count: 'exact', head: true }).eq('is_supplier', true),
          supabase.from('parties').select('id', { count: 'exact', head: true }).eq('is_customer', true),
        ]);

        setCounts({
          purchaseLots: purchaseLotsResult.count || 0,
          assets: assetsResult.count || 0,
          auctions: auctionsResult.count || 0,
          salesOrders: salesOrdersResult.count || 0,
          suppliers: suppliersResult.count || 0,
          customers: customersResult.count || 0,
        });
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    }

    loadCounts();
  }, []);

  const acquireTiles: ProcessTileProps[] = [
    {
      id: 'purchase-lots',
      label: 'Purchase Lots',
      description: 'Track incoming inventory and cost basis',
      icon: Package,
      count: counts.purchaseLots,
      path: 'purchase-lots',
      onNavigate,
    },
    {
      id: 'receiving',
      label: 'Receiving',
      description: 'Process incoming shipments',
      icon: Inbox,
      path: 'receiving',
      onNavigate,
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      description: 'Manage supplier relationships',
      icon: Building2,
      count: counts.suppliers,
      path: 'suppliers',
      onNavigate,
    },
  ];

  const recycleTiles: ProcessTileProps[] = [
    {
      id: 'processing',
      label: 'Processing',
      description: 'QA, grading, and classification',
      icon: ClipboardCheck,
      path: 'processing',
      onNavigate,
    },
    {
      id: 'component-harvesting',
      label: 'Component Harvesting',
      description: 'Extract and track components',
      icon: Layers,
      path: 'component-harvesting',
      onNavigate,
    },
    {
      id: 'itad-compliance',
      label: 'ITAD Compliance',
      description: 'Data sanitization and certificates',
      icon: Recycle,
      path: 'itad-compliance',
      onNavigate,
    },
  ];

  const inventoryTiles: ProcessTileProps[] = [
    {
      id: 'inventory',
      label: 'All Inventory',
      description: 'Search and manage all items',
      icon: Archive,
      count: counts.assets,
      path: 'inventory',
      onNavigate,
    },
    {
      id: 'saleable-inventory',
      label: 'Saleable Items',
      description: 'Ready-to-sell inventory',
      icon: ShoppingBag,
      path: 'saleable-inventory',
      onNavigate,
    },
    {
      id: 'component-sales',
      label: 'Components',
      description: 'Harvested components inventory',
      icon: Box,
      path: 'component-sales',
      onNavigate,
    },
  ];

  const sellTiles: ProcessTileProps[] = [
    engines.auction_enabled && {
      id: 'auctions',
      label: 'Auctions',
      description: 'Live and online auction management',
      icon: Gavel,
      count: counts.auctions,
      path: 'auctions',
      onNavigate,
    },
    {
      id: 'sales-orders',
      label: 'Sales Orders',
      description: 'Customer orders and commitments',
      icon: FileText,
      count: counts.salesOrders,
      path: 'sales-orders',
      onNavigate,
    },
    {
      id: 'sales-invoices',
      label: 'Sales Invoices',
      description: 'Billing and payments',
      icon: Receipt,
      path: 'sales-invoices',
      onNavigate,
    },
    {
      id: 'customers',
      label: 'Customers',
      description: 'Customer relationships',
      icon: Users,
      count: counts.customers,
      path: 'customers',
      onNavigate,
    },
  ].filter(Boolean) as ProcessTileProps[];

  const financeTiles: ProcessTileProps[] = [
    {
      id: 'accounting',
      label: 'Accounting',
      description: 'Financial overview and reports',
      icon: DollarSign,
      path: 'accounting',
      onNavigate,
    },
    {
      id: 'chart-of-accounts',
      label: 'Chart of Accounts',
      description: 'Account structure and hierarchy',
      icon: Receipt,
      path: 'chart-of-accounts',
      onNavigate,
    },
    {
      id: 'journal-entries',
      label: 'Journal Entries',
      description: 'Transaction records',
      icon: CreditCard,
      path: 'journal-entries',
      onNavigate,
    },
  ];

  const reportsTiles: ProcessTileProps[] = [
    {
      id: 'reports',
      label: 'All Reports',
      description: 'Analytics and insights',
      icon: BarChart3,
      path: 'reports',
      onNavigate,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Welcome back, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-secondary">
          Quick access to all your workflows
        </p>
      </div>

      <ProcessSection title="Acquire" tiles={acquireTiles} />
      <ProcessSection title="Recycle" tiles={recycleTiles} />
      <ProcessSection title="Inventory" tiles={inventoryTiles} />
      <ProcessSection title="Sell" tiles={sellTiles} />
      <ProcessSection title="Finance" tiles={financeTiles} />
      <ProcessSection title="Reports" tiles={reportsTiles} />
    </div>
  );
}
