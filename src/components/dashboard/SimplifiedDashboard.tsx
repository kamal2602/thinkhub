import { useState, useEffect } from 'react';
import { AlertTriangle, Activity, TrendingUp, Package, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { dashboardService } from '../../services/dashboardService';

interface DashboardStats {
  inProcessing: number;
  revenue: number;
  margin: number;
  alerts: number;
}

interface Alert {
  id: string;
  type: 'duplicate' | 'stuck' | 'aging';
  message: string;
  count: number;
}

interface RecentActivity {
  id: string;
  serial_number: string;
  product_type: string;
  status: string;
  updated_at: string;
}

export function SimplifiedDashboard() {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({
    inProcessing: 0,
    revenue: 0,
    margin: 0,
    alerts: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = selectedCompany?.role === 'admin' || selectedCompany?.role === 'manager';

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardData();
    }
  }, [selectedCompany]);

  const fetchDashboardData = async () => {
    if (!selectedCompany) return;

    try {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, status, purchase_price, refurbishment_cost, selling_price, serial_number, updated_at, product_types(name)')
        .eq('company_id', selectedCompany.id);

      const processingStages = ['received', 'testing', 'refurbishing', 'qc_grading', 'ready'];
      const inProcessing = assets?.filter(a => processingStages.includes(a.status)).length || 0;

      let revenue = 0;
      let totalMargin = 0;
      let marginCount = 0;

      if (isAdmin) {
        const soldAssets = assets?.filter(a => a.status === 'sold') || [];
        revenue = soldAssets.reduce((sum, a) => sum + (a.selling_price || 0), 0);

        soldAssets.forEach(asset => {
          const cost = (asset.purchase_price || 0) + (asset.refurbishment_cost || 0);
          if (asset.selling_price > 0) {
            const margin = ((asset.selling_price - cost) / asset.selling_price) * 100;
            totalMargin += margin;
            marginCount++;
          }
        });
      }

      const alertsList: Alert[] = [];

      if (isAdmin) {
        const metrics = await dashboardService.getMetrics(selectedCompany.id);

        if (metrics.exceptions.duplicateSerials > 0) {
          alertsList.push({
            id: 'duplicates',
            type: 'duplicate',
            message: 'Duplicate serial numbers need review',
            count: metrics.exceptions.duplicateSerials,
          });
        }

        if (metrics.exceptions.stuckInProcessing > 0) {
          alertsList.push({
            id: 'stuck',
            type: 'stuck',
            message: 'Assets stuck in processing > 30 days',
            count: metrics.exceptions.stuckInProcessing,
          });
        }

        if (metrics.agingInventory.over90Days > 0) {
          alertsList.push({
            id: 'aging',
            type: 'aging',
            message: 'Inventory aging over 90 days',
            count: metrics.agingInventory.over90Days,
          });
        }
      }

      const activities: RecentActivity[] = (assets || [])
        .filter(a => !['sold', 'scrapped', 'harvested'].includes(a.status))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10)
        .map(a => ({
          id: a.id,
          serial_number: a.serial_number,
          product_type: a.product_types?.name || 'Unknown',
          status: a.status || 'received',
          updated_at: a.updated_at,
        }));

      setStats({
        inProcessing,
        revenue,
        margin: marginCount > 0 ? totalMargin / marginCount : 0,
        alerts: alertsList.length,
      });
      setAlerts(alertsList);
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    received: 'bg-slate-100 text-slate-700',
    testing: 'bg-blue-100 text-blue-700',
    refurbishing: 'bg-amber-100 text-amber-700',
    qc_grading: 'bg-violet-100 text-violet-700',
    ready: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h1>
        <p className="text-slate-600">{selectedCompany.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.inProcessing}</div>
          <div className="text-sm text-slate-600">In Processing</div>
        </div>

        {isAdmin && (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800">${stats.revenue.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total Revenue</div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800">{stats.margin.toFixed(1)}%</div>
              <div className="text-sm text-slate-600">Avg Margin</div>
            </div>
          </>
        )}

        {stats.alerts > 0 && (
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.alerts}</div>
            <div className="text-sm text-slate-600">Alerts</div>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">Action Required</h2>
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between py-2">
                <span className="text-slate-700">{alert.message}</span>
                <span className="font-bold text-amber-600">{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No recent activity</p>
            <p className="text-sm text-slate-400 mt-1">Processing updates will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map(activity => (
              <div key={activity.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">
                      {activity.serial_number}
                    </div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      {activity.product_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[activity.status] || statusColors.received}`}>
                      {activity.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(activity.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
