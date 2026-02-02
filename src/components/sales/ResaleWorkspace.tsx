import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Cog,
  DollarSign,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { supabase } from '../../lib/supabase';
import { PurchaseOrders } from '../purchases/PurchaseOrders';
import { Inventory } from '../inventory/Inventory';
import { UnifiedSalesCatalog } from './UnifiedSalesCatalog';
import { SalesInvoices } from './SalesInvoices';

type TabKey = 'procurement' | 'inventory' | 'sales' | 'invoices' | 'reports';

interface KPIData {
  totalPurchaseOrders: number;
  readyToSell: number;
  totalRevenue: number;
  profitMargin: number;
}

export function ResaleWorkspace() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<TabKey>('inventory');
  const [kpiData, setKpiData] = useState<KPIData>({
    totalPurchaseOrders: 0,
    readyToSell: 0,
    totalRevenue: 0,
    profitMargin: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      loadKPIs();
    }
  }, [selectedCompany]);

  const loadKPIs = async () => {
    if (!selectedCompany) return;

    try {
      const [posRes, inventoryRes, invoicesRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact' })
          .eq('company_id', selectedCompany.id),
        supabase
          .from('assets')
          .select('id', { count: 'exact' })
          .eq('company_id', selectedCompany.id)
          .eq('processing_stage', 'ready_to_sell'),
        supabase
          .from('sales_invoices')
          .select('total_amount, cost_amount')
          .eq('company_id', selectedCompany.id),
      ]);

      const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const totalCost = invoicesRes.data?.reduce((sum, inv) => sum + (inv.cost_amount || 0), 0) || 0;
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

      setKpiData({
        totalPurchaseOrders: posRes.count || 0,
        readyToSell: inventoryRes.count || 0,
        totalRevenue,
        profitMargin,
      });
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'procurement' as const, label: 'Procurement', icon: ShoppingCart },
    { id: 'inventory' as const, label: 'Ready to Sell', icon: Package },
    { id: 'sales' as const, label: 'Sales Catalog', icon: DollarSign },
    { id: 'invoices' as const, label: 'Invoices', icon: TrendingUp },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
  ];

  const kpis = [
    {
      label: 'Purchase Orders',
      value: kpiData.totalPurchaseOrders,
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      label: 'Ready to Sell',
      value: kpiData.readyToSell,
      icon: Package,
      color: 'green',
    },
    {
      label: 'Total Revenue',
      value: `$${kpiData.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'emerald',
    },
    {
      label: 'Profit Margin',
      value: `${kpiData.profitMargin.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resale Workspace</h1>
              <p className="text-sm text-gray-600 mt-1">
                Procure, process, and sell IT assets
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const colorClasses = {
                  blue: 'bg-blue-50 text-blue-600',
                  green: 'bg-green-50 text-green-600',
                  emerald: 'bg-emerald-50 text-emerald-600',
                  purple: 'bg-purple-50 text-purple-600',
                }[kpi.color];

                return (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        <p className="text-xs text-gray-600">{kpi.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'procurement' && <PurchaseOrders />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'sales' && <UnifiedSalesCatalog />}
          {activeTab === 'invoices' && <SalesInvoices />}
          {activeTab === 'reports' && (
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Reports Coming Soon</h3>
                <p className="text-gray-600">Margin analysis, aging inventory, and sales trends</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
