import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, TrendingUp, Package, Download, TrendingDown, Box, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { LotProfitReport } from '../purchase-lots/LotProfitReport';

interface SalesReport {
  total_sales: number;
  total_profit: number;
  total_invoices: number;
}

interface StockValuation {
  total_items: number;
  total_quantity: number;
  total_value: number;
}

interface PurchaseLot {
  id: string;
  lot_number: string;
  purchase_date: string;
  total_items: number;
  total_cost: number;
  notes: string;
  suppliers?: { name: string };
}

interface LotDashboardData {
  totalItems: number;
  soldItems: number;
  remainingItems: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

export function Reports() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchase-lots'>('overview');

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const [salesReport, setSalesReport] = useState<SalesReport>({
    total_sales: 0,
    total_profit: 0,
    total_invoices: 0,
  });

  const [stockValuation, setStockValuation] = useState<StockValuation>({
    total_items: 0,
    total_quantity: 0,
    total_value: 0,
  });

  const [lots, setLots] = useState<PurchaseLot[]>([]);
  const [lotStats, setLotStats] = useState<Record<string, LotDashboardData>>({});
  const [showReport, setShowReport] = useState(false);
  const [selectedLot, setSelectedLot] = useState<PurchaseLot | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      if (activeTab === 'overview') {
        fetchOverviewReports();
      } else {
        fetchPurchaseLots();
      }
    }
  }, [selectedCompany, dateRange, activeTab]);

  const fetchOverviewReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSalesReport(),
        fetchStockValuation(),
      ]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('total_amount, cost_amount')
        .eq('company_id', selectedCompany?.id)
        .gte('invoice_date', dateRange.from)
        .lte('invoice_date', dateRange.to);

      if (error) throw error;

      const totalSales = data?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0;
      const totalCost = data?.reduce((sum, invoice) => sum + Number(invoice.cost_amount), 0) || 0;

      setSalesReport({
        total_sales: totalSales,
        total_profit: totalSales - totalCost,
        total_invoices: data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching sales report:', error);
    }
  };

  const fetchStockValuation = async () => {
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('selling_price, status')
        .eq('company_id', selectedCompany?.id)
        .eq('status', 'In Stock');

      if (error) throw error;

      const totalValue = assets?.reduce((sum, asset) =>
        sum + (Number(asset.selling_price) || 0), 0
      ) || 0;

      setStockValuation({
        total_items: assets?.length || 0,
        total_quantity: assets?.length || 0,
        total_value: totalValue,
      });
    } catch (error) {
      console.error('Error fetching stock valuation:', error);
    }
  };

  const fetchLotStats = async (lotId: string) => {
    try {
      const { data: assetData } = await supabase
        .from('assets')
        .select('*')
        .eq('purchase_lot_id', lotId);

      if (!assetData) return null;

      const { data: componentStats } = await supabase.rpc('calculate_lot_component_profit', {
        p_lot_id: lotId
      });

      const soldAssets = assetData.filter(a => a.status === 'Sold');
      const totalCost = assetData.reduce((sum, a) =>
        sum + (parseFloat(a.purchase_price) || 0) + (parseFloat(a.refurbishment_cost) || 0), 0
      );
      const assetRevenue = soldAssets.reduce((sum, a) => sum + (parseFloat(a.selling_price) || 0), 0);
      const componentRevenue = parseFloat(componentStats?.total_sold_revenue || 0);
      const componentCost = parseFloat(componentStats?.total_sold_cost || 0);
      const totalRevenue = assetRevenue + componentRevenue;
      const assetProfit = soldAssets.reduce((sum, a) => {
        const cost = (parseFloat(a.purchase_price) || 0) + (parseFloat(a.refurbishment_cost) || 0);
        return sum + ((parseFloat(a.selling_price) || 0) - cost);
      }, 0);
      const componentProfit = componentRevenue - componentCost;
      const profit = assetProfit + componentProfit;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        totalItems: assetData.length,
        soldItems: soldAssets.length,
        remainingItems: assetData.length - soldAssets.length,
        totalRevenue,
        totalCost,
        profit,
        profitMargin
      };
    } catch (error) {
      console.error('Error fetching lot stats:', error);
      return null;
    }
  };

  const fetchPurchaseLots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_lots')
        .select('*, suppliers(name)')
        .eq('company_id', selectedCompany?.id)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setLots(data || []);

      const statsPromises = (data || []).map(lot => fetchLotStats(lot.id));
      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, LotDashboardData> = {};

      (data || []).forEach((lot, index) => {
        if (statsResults[index]) {
          statsMap[lot.id] = statsResults[index]!;
        }
      });

      setLotStats(statsMap);
    } catch (error: any) {
      showToast('Error fetching purchase lots: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Business insights and profitability analysis</p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('purchase-lots')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'purchase-lots'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Purchase Lot P&L
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Date Range</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(salesReport.total_sales)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                {salesReport.total_invoices} invoices
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(salesReport.total_profit)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                {salesReport.total_sales > 0
                  ? `${((salesReport.total_profit / salesReport.total_sales) * 100).toFixed(1)}% margin`
                  : '0% margin'
                }
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stock Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stockValuation.total_value)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                {stockValuation.total_items} items in stock
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'purchase-lots' && (
        <div className="space-y-6">
          {lots.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No purchase lots found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {lots.map((lot) => {
                const stats = lotStats[lot.id];
                const isProfitable = stats && stats.profit > 0;

                return (
                  <div key={lot.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-gray-900">{lot.lot_number}</h3>
                            {isProfitable ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                Profitable
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                                <TrendingDown className="w-4 h-4" />
                                Loss
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(lot.purchase_date).toLocaleDateString()}
                            </span>
                            {lot.suppliers && (
                              <span className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {lot.suppliers.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedLot(lot);
                            setShowReport(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                          <BarChart3 className="w-4 h-4" />
                          View Report
                        </button>
                      </div>

                      {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Items</p>
                            <p className="text-lg font-bold text-gray-900">{stats.totalItems}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Sold</p>
                            <p className="text-lg font-bold text-green-600">{stats.soldItems}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Revenue</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(stats.totalRevenue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Profit</p>
                            <p className={`text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(stats.profit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Margin</p>
                            <p className={`text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                              {stats.profitMargin.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showReport && selectedLot && (
        <LotProfitReport
          lot={selectedLot}
          onClose={() => {
            setShowReport(false);
            setSelectedLot(null);
          }}
        />
      )}
    </div>
  );
}
