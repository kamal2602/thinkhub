import React, { useEffect, useState } from 'react';
import { ProcessSection } from './ProcessSection';
import { ProcessTileProps } from './ProcessTile';
import { useEngines } from '../../hooks/useEngines';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ERP_ICONS, getCategoryLabel, getCategoryColor } from '../../config/erpIcons';

export function HomeLaunchpad({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { engines } = useEngines();
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      try {
        const [
          purchaseLotsResult,
          assetsResult,
          auctionsResult,
          salesOrdersResult,
          partiesResult,
        ] = await Promise.all([
          supabase.from('purchase_lots').select('id', { count: 'exact', head: true }),
          supabase.from('assets').select('id', { count: 'exact', head: true }),
          supabase.from('auctions').select('id', { count: 'exact', head: true }),
          supabase.from('sales_orders').select('id', { count: 'exact', head: true }),
          supabase.from('parties').select('id', { count: 'exact', head: true }),
        ]);

        setCounts({
          purchaseLots: purchaseLotsResult.count || 0,
          assets: assetsResult.count || 0,
          auctions: auctionsResult.count || 0,
          salesOrders: salesOrdersResult.count || 0,
          parties: partiesResult.count || 0,
        });
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    }

    loadCounts();
  }, []);

  const operationsTiles: ProcessTileProps[] = [
    {
      id: 'asset-receiving',
      label: ERP_ICONS.assetReceiving.label,
      description: ERP_ICONS.assetReceiving.description,
      icon: ERP_ICONS.assetReceiving.icon,
      path: 'receiving',
      onNavigate,
    },
    {
      id: 'processing-dismantling',
      label: ERP_ICONS.processingDismantling.label,
      description: ERP_ICONS.processingDismantling.description,
      icon: ERP_ICONS.processingDismantling.icon,
      path: 'processing',
      onNavigate,
      count: counts.assets,
    },
    {
      id: 'component-inventory',
      label: ERP_ICONS.componentInventory.label,
      description: ERP_ICONS.componentInventory.description,
      icon: ERP_ICONS.componentInventory.icon,
      path: 'component-sales',
      onNavigate,
    },
    {
      id: 'stock-valuation',
      label: ERP_ICONS.stockValuation.label,
      description: ERP_ICONS.stockValuation.description,
      icon: ERP_ICONS.stockValuation.icon,
      path: 'inventory',
      onNavigate,
      count: counts.assets,
    },
    {
      id: 'lot-assembly',
      label: ERP_ICONS.lotAssembly.label,
      description: ERP_ICONS.lotAssembly.description,
      icon: ERP_ICONS.lotAssembly.icon,
      path: 'purchase-lots',
      onNavigate,
      count: counts.purchaseLots,
    },
    {
      id: 'materials-recovery',
      label: ERP_ICONS.materialsRecovery.label,
      description: ERP_ICONS.materialsRecovery.description,
      icon: ERP_ICONS.materialsRecovery.icon,
      path: 'itad-compliance',
      onNavigate,
    },
  ];

  const salesTiles: ProcessTileProps[] = [
    {
      id: 'wholesale-sales',
      label: ERP_ICONS.wholesaleSales.label,
      description: ERP_ICONS.wholesaleSales.description,
      icon: ERP_ICONS.wholesaleSales.icon,
      path: 'sales-orders',
      onNavigate,
      count: counts.salesOrders,
    },
    engines?.auction_enabled && {
      id: 'auctions',
      label: ERP_ICONS.auctions.label,
      description: ERP_ICONS.auctions.description,
      icon: ERP_ICONS.auctions.icon,
      path: 'auctions',
      onNavigate,
      count: counts.auctions,
    },
    engines?.website_enabled && {
      id: 'online-store',
      label: ERP_ICONS.onlineStore.label,
      description: ERP_ICONS.onlineStore.description,
      icon: ERP_ICONS.onlineStore.icon,
      path: 'website',
      onNavigate,
    },
    {
      id: 'customer-management',
      label: ERP_ICONS.customerManagement.label,
      description: ERP_ICONS.customerManagement.description,
      icon: ERP_ICONS.customerManagement.icon,
      path: 'customers',
      onNavigate,
    },
  ].filter(Boolean) as ProcessTileProps[];

  const businessTiles: ProcessTileProps[] = [
    {
      id: 'order-management',
      label: ERP_ICONS.orderManagement.label,
      description: ERP_ICONS.orderManagement.description,
      icon: ERP_ICONS.orderManagement.icon,
      path: 'purchase-orders',
      onNavigate,
    },
    {
      id: 'billing-invoicing',
      label: ERP_ICONS.billingInvoicing.label,
      description: ERP_ICONS.billingInvoicing.description,
      icon: ERP_ICONS.billingInvoicing.icon,
      path: 'sales-invoices',
      onNavigate,
    },
    {
      id: 'payments-settlements',
      label: ERP_ICONS.paymentsSettlements.label,
      description: ERP_ICONS.paymentsSettlements.description,
      icon: ERP_ICONS.paymentsSettlements.icon,
      path: 'payments',
      onNavigate,
    },
    {
      id: 'financial-ledger',
      label: ERP_ICONS.financialLedger.label,
      description: ERP_ICONS.financialLedger.description,
      icon: ERP_ICONS.financialLedger.icon,
      path: 'accounting',
      onNavigate,
    },
  ];

  const complianceTiles: ProcessTileProps[] = [
    {
      id: 'sustainability-reporting',
      label: ERP_ICONS.sustainabilityReporting.label,
      description: ERP_ICONS.sustainabilityReporting.description,
      icon: ERP_ICONS.sustainabilityReporting.icon,
      path: 'esg',
      onNavigate,
    },
    {
      id: 'regulatory-compliance',
      label: ERP_ICONS.regulatoryCompliance.label,
      description: ERP_ICONS.regulatoryCompliance.description,
      icon: ERP_ICONS.regulatoryCompliance.icon,
      path: 'compliance',
      onNavigate,
    },
    {
      id: 'authority-submissions',
      label: ERP_ICONS.authoritySubmissions.label,
      description: ERP_ICONS.authoritySubmissions.description,
      icon: ERP_ICONS.authoritySubmissions.icon,
      path: 'audit-exports',
      onNavigate,
    },
    {
      id: 'compliance-certificates',
      label: ERP_ICONS.complianceCertificates.label,
      description: ERP_ICONS.complianceCertificates.description,
      icon: ERP_ICONS.complianceCertificates.icon,
      path: 'certificates',
      onNavigate,
    },
    {
      id: 'compliance-audit',
      label: ERP_ICONS.complianceAudit.label,
      description: ERP_ICONS.complianceAudit.description,
      icon: ERP_ICONS.complianceAudit.icon,
      path: 'audit-trail',
      onNavigate,
    },
  ];

  const platformTiles: ProcessTileProps[] = [
    {
      id: 'business-directory',
      label: ERP_ICONS.businessDirectory.label,
      description: ERP_ICONS.businessDirectory.description,
      icon: ERP_ICONS.businessDirectory.icon,
      path: 'parties',
      onNavigate,
      count: counts.parties,
    },
    {
      id: 'organizations-entities',
      label: ERP_ICONS.organizationsEntities.label,
      description: ERP_ICONS.organizationsEntities.description,
      icon: ERP_ICONS.organizationsEntities.icon,
      path: 'companies',
      onNavigate,
    },
    {
      id: 'user-role-management',
      label: ERP_ICONS.userRoleManagement.label,
      description: ERP_ICONS.userRoleManagement.description,
      icon: ERP_ICONS.userRoleManagement.icon,
      path: 'users',
      onNavigate,
    },
    {
      id: 'business-intelligence',
      label: ERP_ICONS.businessIntelligence.label,
      description: ERP_ICONS.businessIntelligence.description,
      icon: ERP_ICONS.businessIntelligence.icon,
      path: 'reports',
      onNavigate,
    },
    {
      id: 'price-intelligence',
      label: ERP_ICONS.priceIntelligence.label,
      description: ERP_ICONS.priceIntelligence.description,
      icon: ERP_ICONS.priceIntelligence.icon,
      path: 'valuation',
      onNavigate,
    },
    engines?.apps_enabled && {
      id: 'app-marketplace',
      label: ERP_ICONS.appMarketplace.label,
      description: ERP_ICONS.appMarketplace.description,
      icon: ERP_ICONS.appMarketplace.icon,
      path: 'apps',
      onNavigate,
    },
    {
      id: 'system-settings',
      label: ERP_ICONS.systemSettings.label,
      description: ERP_ICONS.systemSettings.description,
      icon: ERP_ICONS.systemSettings.icon,
      path: 'settings',
      onNavigate,
    },
  ].filter(Boolean) as ProcessTileProps[];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-gray-600">
          Enterprise resource planning for the circular economy
        </p>
      </div>

      <div className="space-y-8">
        <ProcessSection
          title={getCategoryLabel('operations')}
          tiles={operationsTiles}
          color="blue"
        />

        <ProcessSection
          title={getCategoryLabel('sales')}
          tiles={salesTiles}
          color="amber"
        />

        <ProcessSection
          title={getCategoryLabel('business')}
          tiles={businessTiles}
          color="green"
        />

        <ProcessSection
          title={getCategoryLabel('compliance')}
          tiles={complianceTiles}
          color="purple"
        />

        <ProcessSection
          title={getCategoryLabel('platform')}
          tiles={platformTiles}
          color="gray"
        />
      </div>
    </div>
  );
}
