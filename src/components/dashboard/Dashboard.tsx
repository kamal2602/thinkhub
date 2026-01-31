import { useState, useEffect } from 'react';
import { Package, DollarSign, TrendingUp, Building2, Activity, BarChart3, CheckCircle, Wrench, Clock, ShoppingCart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { DashboardWidgets } from './DashboardWidgets';

interface DashboardStats {
  assetsInProcessing: number;
  monthlyRevenue: number;
  averageMargin: number;
  activeLots: number;
  totalItems: number;
  totalLocations: number;

  processingByStage: {
    received: number;
    testing: number;
    refurbishing: number;
    qc_grading: number;
    ready: number;
  };
}

interface LotPerformance {
  id: string;
  lot_number: string;
  supplier_name: string;
  total_cost: number;
  items_count: number;
  items_sold: number;
  total_revenue: number;
  profit: number;
  roi_percentage: number;
  created_at: string;
}

interface ProcessingActivity {
  id: string;
  serial_number: string;
  product_type: string;
  status: string;
  last_updated: string;
  assigned_to: string;
}

export function Dashboard() {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({
    assetsInProcessing: 0,
    monthlyRevenue: 0,
    averageMargin: 0,
    activeLots: 0,
    totalItems: 0,
    totalLocations: 0,
    processingByStage: {
      received: 0,
      testing: 0,
      refurbishing: 0,
      qc_grading: 0,
      ready: 0,
    },
  });
  const [topLots, setTopLots] = useState<LotPerformance[]>([]);
  const [recentActivity, setRecentActivity] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = selectedCompany?.role === 'admin' || selectedCompany?.role === 'manager';

  useEffect(() => {
    if (selectedCompany) {
      console.log('Selected company:', selectedCompany);
      console.log('Is admin:', isAdmin);
      fetchDashboardData();
    }
  }, [selectedCompany]);

  const fetchDashboardData = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const isAdminRole = selectedCompany?.role === 'admin' || selectedCompany?.role === 'manager';
      console.log('Fetching with isAdmin:', isAdminRole, 'Role:', selectedCompany?.role);

      const [assetsRes, salesRes, lotsRes, activityRes] = await Promise.all([
        supabase
          .from('assets')
          .select('id, status, purchase_price, refurbishment_cost, selling_price')
          .eq('company_id', selectedCompany?.id),

        Promise.resolve({ data: [], error: null }),

        isAdminRole ? supabase
          .from('purchase_lots')
          .select(`
            id,
            lot_number,
            total_cost,
            created_at,
            suppliers(name)
          `)
          .eq('company_id', selectedCompany?.id)
          .order('created_at', { ascending: false })
          .limit(5)
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from('assets')
          .select(`
            id,
            serial_number,
            status,
            updated_at,
            product_types(name)
          `)
          .eq('company_id', selectedCompany?.id)
          .order('updated_at', { ascending: false })
          .limit(50)
      ]);

      if (assetsRes.error) {
        console.error('Assets query error:', assetsRes.error);
        throw assetsRes.error;
      }

      console.log('Assets data:', assetsRes.data?.length, 'Company ID:', selectedCompany?.id);

      const processingByStage = {
        received: 0,
        testing: 0,
        refurbishing: 0,
        qc_grading: 0,
        ready: 0,
      };

      let totalMargin = 0;
      let marginCount = 0;

      (assetsRes.data || []).forEach((asset: any) => {
        if (asset.status && processingByStage.hasOwnProperty(asset.status)) {
          processingByStage[asset.status as keyof typeof processingByStage]++;
        }

        if (isAdminRole && asset.selling_price && asset.purchase_price) {
          const totalCost = (asset.purchase_price || 0) + (asset.refurbishment_cost || 0);
          if (asset.selling_price > 0) {
            const margin = ((asset.selling_price - totalCost) / asset.selling_price) * 100;
            totalMargin += margin;
            marginCount++;
          }
        }
      });

      let monthlyRevenue = 0;
      if (isAdminRole && salesRes.data) {
        monthlyRevenue = salesRes.data.reduce((sum: number, line: any) => {
          return sum + (line.unit_price * line.quantity);
        }, 0);
      }

      const lotsData: LotPerformance[] = [];
      if (isAdminRole && lotsRes.data) {
        for (const lot of lotsRes.data) {
          const { data: lotAssets } = await supabase
            .from('assets')
            .select('id, selling_price, purchase_price, refurbishment_cost, status')
            .eq('purchase_lot_id', lot.id);

          const itemsCount = lotAssets?.length || 0;
          const itemsSold = lotAssets?.filter((a: any) => a.status === 'sold').length || 0;
          const totalRevenue = lotAssets?.reduce((sum: number, a: any) => sum + (a.selling_price || 0), 0) || 0;
          const totalCosts = lotAssets?.reduce((sum: number, a: any) =>
            sum + (a.purchase_price || 0) + (a.refurbishment_cost || 0), 0) || 0;
          const profit = totalRevenue - totalCosts;
          const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;

          lotsData.push({
            id: lot.id,
            lot_number: lot.lot_number,
            supplier_name: lot.suppliers?.name || 'Unknown',
            total_cost: lot.total_cost,
            items_count: itemsCount,
            items_sold: itemsSold,
            total_revenue: totalRevenue,
            profit: profit,
            roi_percentage: roi,
            created_at: lot.created_at,
          });
        }
      }

      const activities: ProcessingActivity[] = (activityRes.data || [])
        .filter((asset: any) =>
          asset.status !== 'sold' &&
          asset.status !== 'scrapped' &&
          asset.status !== 'harvested'
        )
        .slice(0, 8)
        .map((asset: any) => ({
          id: asset.id,
          serial_number: asset.serial_number,
          product_type: asset.product_types?.name || 'Unknown',
          status: asset.status || 'received',
          last_updated: asset.updated_at,
          assigned_to: 'Unassigned',
        }));

      const processingStages = ['received', 'testing', 'refurbishing', 'qc_grading', 'ready'];
      const assetsInProcessing = (assetsRes.data || []).filter((asset: any) =>
        processingStages.includes(asset.status)
      );

      const { data: itemsData } = await supabase
        .from('assets')
        .select('id')
        .eq('company_id', selectedCompany?.id);

      const { data: locationsData } = await supabase
        .from('locations')
        .select('id')
        .eq('company_id', selectedCompany?.id);

      setStats({
        assetsInProcessing: assetsInProcessing.length,
        monthlyRevenue: monthlyRevenue,
        averageMargin: marginCount > 0 ? totalMargin / marginCount : 0,
        activeLots: lotsRes.data?.length || 0,
        totalItems: itemsData?.length || 0,
        totalLocations: locationsData?.length || 0,
        processingByStage,
      });

      setTopLots(lotsData);
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

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Welcome back</h1>
              <p className="text-slate-500">{selectedCompany.name}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <DashboardWidgets />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Wrench className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{stats.assetsInProcessing}</div>
            <div className="text-sm font-medium text-slate-500">In Processing</div>
          </div>

          {isAdmin ? (
            <>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">${stats.monthlyRevenue.toLocaleString()}</div>
                <div className="text-sm font-medium text-slate-500">Monthly Revenue</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{stats.averageMargin.toFixed(1)}%</div>
                <div className="text-sm font-medium text-slate-500">Avg Profit Margin</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <ShoppingCart className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{stats.activeLots}</div>
                <div className="text-sm font-medium text-slate-500">Active Lots</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{stats.processingByStage.ready}</div>
                <div className="text-sm font-medium text-slate-500">Ready for Sale</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{stats.processingByStage.testing}</div>
                <div className="text-sm font-medium text-slate-500">In Testing</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Wrench className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">{stats.processingByStage.refurbishing}</div>
                <div className="text-sm font-medium text-slate-500">Refurbishing</div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {isAdmin ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Purchase Lots Performance</h2>
                  <p className="text-sm text-slate-500">Recent lot profitability</p>
                </div>
              </div>

              {topLots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">No purchase lots yet</p>
                  <p className="text-sm text-slate-400 mt-1">Create your first purchase lot</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {topLots.map((lot) => (
                    <div key={lot.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{lot.lot_number}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{lot.supplier_name}</div>
                        </div>
                        <div className={`text-sm font-bold px-2 py-1 rounded-lg ${
                          lot.roi_percentage >= 20
                            ? 'bg-emerald-100 text-emerald-700'
                            : lot.roi_percentage >= 10
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {lot.roi_percentage.toFixed(1)}% ROI
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-slate-500">Items</div>
                          <div className="font-semibold text-slate-700">{lot.items_sold}/{lot.items_count}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Revenue</div>
                          <div className="font-semibold text-slate-700">${lot.total_revenue.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Profit</div>
                          <div className={`font-semibold ${lot.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ${Math.abs(lot.profit).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Processing Pipeline</h2>
                  <p className="text-sm text-slate-500">Items by stage</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(stats.processingByStage).map(([stage, count]) => {
                  const stageInfo = {
                    received: { label: 'Received', color: 'bg-slate-500', icon: Package },
                    testing: { label: 'Testing', color: 'bg-violet-500', icon: Activity },
                    refurbishing: { label: 'Refurbishing', color: 'bg-amber-500', icon: Wrench },
                    qc_grading: { label: 'QC & Grading', color: 'bg-blue-500', icon: CheckCircle },
                    ready: { label: 'Ready for Sale', color: 'bg-emerald-500', icon: CheckCircle },
                  }[stage] || { label: stage, color: 'bg-gray-500', icon: Package };

                  const Icon = stageInfo.icon;
                  const total = Object.values(stats.processingByStage).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${stageInfo.color} rounded-lg flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{stageInfo.label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`${stageInfo.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Recent Processing Activity</h2>
                <p className="text-sm text-slate-500">Latest updates</p>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No recent activity</p>
                <p className="text-sm text-slate-400 mt-1">Processing updates will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {recentActivity.map((activity) => {
                  const stageColors = {
                    received: 'bg-slate-100 text-slate-600',
                    testing: 'bg-violet-100 text-violet-700',
                    refurbishing: 'bg-amber-100 text-amber-700',
                    qc_grading: 'bg-blue-100 text-blue-700',
                    ready: 'bg-emerald-100 text-emerald-700',
                  };
                  const stageColor = stageColors[activity.status as keyof typeof stageColors] || 'bg-slate-100 text-slate-600';

                  return (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="font-semibold text-slate-800 text-sm truncate">
                          {activity.serial_number}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {activity.product_type} • {activity.assigned_to}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${stageColor} whitespace-nowrap`}>
                          {activity.status.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(activity.last_updated).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl shadow-blue-500/20">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{selectedCompany.name}</h3>
              <p className="text-blue-100 text-base">
                Managing {stats.totalItems} items across {stats.totalLocations} locations
              </p>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4">
              <div className="text-sm text-blue-100 mb-1 font-medium">Your Role</div>
              <div className="text-xl font-bold capitalize">{selectedCompany.role}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
