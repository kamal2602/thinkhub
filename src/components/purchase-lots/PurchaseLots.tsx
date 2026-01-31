import { useState, useEffect } from 'react';
import { Package, Calendar, TrendingUp, TrendingDown, ShoppingCart, Box, BarChart3, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { LotProfitReport } from './LotProfitReport';

interface PurchaseLot {
  id: string;
  lot_number: string;
  purchase_date: string;
  total_items: number;
  total_cost: number;
  notes: string;
  suppliers?: { name: string };
  created_at: string;
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

export function PurchaseLots() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [lots, setLots] = useState<PurchaseLot[]>([]);
  const [lotStats, setLotStats] = useState<Record<string, LotDashboardData>>({});
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [selectedLot, setSelectedLot] = useState<PurchaseLot | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    lot_number: '',
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchLots();
      fetchSuppliers();
    }
  }, [selectedCompany]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', selectedCompany?.id)
      .order('name');
    setSuppliers(data || []);
  };

  const handleCreateLot = async () => {
    if (!formData.lot_number || !formData.supplier_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_lots')
        .insert({
          company_id: selectedCompany?.id,
          lot_number: formData.lot_number,
          supplier_id: formData.supplier_id,
          purchase_date: formData.purchase_date,
          notes: formData.notes,
          status: 'open',
          created_by: user?.id
        });

      if (error) throw error;

      setShowCreateForm(false);
      setFormData({
        lot_number: '',
        supplier_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchLots();
    } catch (error: any) {
      alert('Error creating lot: ' + error.message);
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

  const fetchLots = async () => {
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
    } catch (error) {
      console.error('Error fetching purchase lots:', error);
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">P&L Reports</h1>
          <p className="text-gray-600">Track profitability and performance of purchase lots</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Lot
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create New Lot</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lot Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., LOT-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional notes about this lot"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLot}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Lot
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lots.map((lot) => {
            const stats = lotStats[lot.id];
            const isProfitable = stats ? stats.profit > 0 : false;

            return (
              <div key={lot.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{lot.lot_number}</h3>
                      {lot.suppliers && (
                        <p className="text-sm text-gray-600">Supplier: {lot.suppliers.name}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(lot.purchase_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      isProfitable ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isProfitable ? (
                        <TrendingUp className={`w-8 h-8 text-green-600`} />
                      ) : (
                        <TrendingDown className={`w-8 h-8 text-red-600`} />
                      )}
                    </div>
                  </div>
                </div>

                {stats ? (
                  <div className="p-6">
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Box className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                        <p className="text-xs text-gray-500 mt-1">Total Items</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <ShoppingCart className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-900">{stats.soldItems}</p>
                        <p className="text-xs text-gray-500 mt-1">Sold</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Package className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-amber-900">{stats.remainingItems}</p>
                        <p className="text-xs text-gray-500 mt-1">Remaining</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 ${
                          isProfitable ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <BarChart3 className={`w-6 h-6 ${
                            isProfitable ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <p className={`text-2xl font-bold ${
                          isProfitable ? 'text-green-900' : 'text-red-900'
                        }`}>{stats.profitMargin.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500 mt-1">Margin</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                        <p className="text-sm font-semibold text-gray-900">
                          ${stats.totalCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 mb-1">Revenue</p>
                        <p className="text-sm font-semibold text-blue-900">
                          ${stats.totalRevenue.toFixed(2)}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 ${
                        isProfitable ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <p className={`text-xs mb-1 ${
                          isProfitable ? 'text-green-600' : 'text-red-600'
                        }`}>{isProfitable ? 'Profit' : 'Loss'}</p>
                        <p className={`text-sm font-semibold ${
                          isProfitable ? 'text-green-900' : 'text-red-900'
                        }`}>
                          ${Math.abs(stats.profit).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedLot(lot);
                        setShowReport(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      <BarChart3 className="w-5 h-5" />
                      View Detailed Report
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Loading dashboard...</p>
                  </div>
                )}
              </div>
            );
          })}
          {lots.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No purchase lots yet. Lots are created automatically when receiving items.</p>
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
