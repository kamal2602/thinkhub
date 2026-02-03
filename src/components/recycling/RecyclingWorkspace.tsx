import { useState, useEffect } from 'react';
import { Scale, Search, Layers, Leaf, FileText, Settings, Plus } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { supabase } from '../../lib/supabase';
import { RecyclingOrders } from './RecyclingOrders';
import { RecyclingOrderWizard } from './RecyclingOrderWizard';
import { WeighStation } from './WeighStation';
import { Inspection } from './Inspection';
import { Outcomes } from './Outcomes';
import { ESGDashboard } from '../esg/ESGDashboard';
import { RecyclingSettings } from '../settings/RecyclingSettings';

type TabKey = 'orders' | 'weigh' | 'inspection' | 'outcomes' | 'esg' | 'settings';

interface KPIData {
  totalOrders: number;
  activeOrders: number;
  totalWeightProcessed: number;
  esgEventsRecorded: number;
}

export function RecyclingWorkspace() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalOrders: 0,
    activeOrders: 0,
    totalWeightProcessed: 0,
    esgEventsRecorded: 0,
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
      const [ordersRes, esgRes] = await Promise.all([
        supabase
          .from('recycling_orders')
          .select('id, status, total_weight')
          .eq('company_id', selectedCompany.id),
        supabase
          .from('esg_events')
          .select('id', { count: 'exact' })
          .eq('company_id', selectedCompany.id)
          .eq('source_type', 'recycling_order'),
      ]);

      const orders = ordersRes.data || [];
      const activeOrders = orders.filter(o => o.status === 'in_progress').length;
      const totalWeight = orders.reduce((sum, o) => sum + (o.total_weight || 0), 0);

      setKpiData({
        totalOrders: orders.length,
        activeOrders,
        totalWeightProcessed: totalWeight,
        esgEventsRecorded: esgRes.count || 0,
      });
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'orders' as const, label: 'Orders', icon: FileText },
    { id: 'weigh' as const, label: 'Weigh Station', icon: Scale },
    { id: 'inspection' as const, label: 'Inspection', icon: Search },
    { id: 'outcomes' as const, label: 'Outcomes', icon: Layers },
    { id: 'esg' as const, label: 'ESG Reports', icon: Leaf },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const kpis = [
    {
      label: 'Total Orders',
      value: kpiData.totalOrders,
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Active Orders',
      value: kpiData.activeOrders,
      icon: Scale,
      color: 'green',
    },
    {
      label: 'Weight Processed (kg)',
      value: kpiData.totalWeightProcessed.toFixed(1),
      icon: Scale,
      color: 'amber',
    },
    {
      label: 'ESG Events',
      value: kpiData.esgEventsRecorded,
      icon: Leaf,
      color: 'emerald',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recycling Workspace</h1>
              <p className="text-sm text-gray-600 mt-1">
                E-waste recycling and environmental compliance
              </p>
            </div>
            <button
              onClick={() => setShowOrderWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Recycling Order
            </button>
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
                  amber: 'bg-amber-50 text-amber-600',
                  emerald: 'bg-emerald-50 text-emerald-600',
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
          {activeTab === 'orders' && <RecyclingOrders onRefresh={loadKPIs} />}
          {activeTab === 'weigh' && <WeighStation onRefresh={loadKPIs} />}
          {activeTab === 'inspection' && <Inspection />}
          {activeTab === 'outcomes' && <Outcomes onRefresh={loadKPIs} />}
          {activeTab === 'esg' && <ESGDashboard filterSourceType="recycling_order" />}
          {activeTab === 'settings' && <RecyclingSettings />}
        </div>
      </div>

      <RecyclingOrderWizard
        isOpen={showOrderWizard}
        onClose={() => setShowOrderWizard(false)}
        onSuccess={() => {
          setShowOrderWizard(false);
          loadKPIs();
          setActiveTab('orders');
        }}
      />
    </div>
  );
}
