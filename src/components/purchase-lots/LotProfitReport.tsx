import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, DollarSign, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface LotProfitReportProps {
  lot: any;
  onClose: () => void;
}

interface LotStats {
  totalItems: number;
  soldItems: number;
  remainingItems: number;
  scrappedItems: number;
  totalPurchaseCost: number;
  totalRevenue: number;
  totalRefurbishmentCost: number;
  componentsSold: number;
  componentsHarvested: number;
  componentRevenue: number;
  componentCost: number;
  componentProfit: number;
  scrapValue: number;
  scrapLoss: number;
  totalProfit: number;
  profitMargin: number;
  remainingValue: number;
  averageSalePrice: number;
}

interface AssetBreakdown {
  id: string;
  serial_number: string;
  brand: string;
  model: string;
  status: string;
  purchase_price: number;
  refurbishment_cost: number;
  selling_price: number;
  scrap_value: number;
  scrap_reason: string;
  total_cost: number;
  profit: number;
  created_at: string;
}

export function LotProfitReport({ lot, onClose }: LotProfitReportProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LotStats | null>(null);
  const [assets, setAssets] = useState<AssetBreakdown[]>([]);

  useEffect(() => {
    fetchLotData();
  }, [lot]);

  const fetchLotData = async () => {
    try {
      const { data: assetData, error } = await supabase
        .from('assets')
        .select('*')
        .eq('purchase_lot_id', lot.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: componentStats } = await supabase.rpc('calculate_lot_component_profit', {
        p_lot_id: lot.id
      });

      const assetsWithCalcs: AssetBreakdown[] = await Promise.all((assetData || []).map(async (asset) => {
        const purchasePrice = parseFloat(asset.purchase_price) || 0;
        const refurbCost = parseFloat(asset.refurbishment_cost) || 0;
        const totalCost = purchasePrice + refurbCost;

        let sellingPrice = 0;
        if (asset.status === 'sold') {
          const { data: saleData } = await supabase
            .from('sales_order_lines')
            .select('unit_price, quantity')
            .eq('asset_id', asset.id)
            .maybeSingle();

          sellingPrice = saleData ? (parseFloat(saleData.unit_price) * (saleData.quantity || 1)) : 0;
        }

        const scrapValue = parseFloat(asset.scrap_value) || 0;

        let profit = 0;
        if (asset.status === 'sold') {
          profit = sellingPrice - totalCost;
        } else if (asset.status === 'scrapped') {
          profit = scrapValue - totalCost;
        }

        return {
          id: asset.id,
          serial_number: asset.serial_number,
          brand: asset.brand,
          model: asset.model,
          status: asset.status,
          purchase_price: purchasePrice,
          refurbishment_cost: refurbCost,
          selling_price: sellingPrice,
          scrap_value: scrapValue,
          scrap_reason: asset.scrap_reason || '',
          total_cost: totalCost,
          profit,
          created_at: asset.created_at,
        };
      }));

      setAssets(assetsWithCalcs);

      const soldAssets = assetsWithCalcs.filter((a) => a.status === 'sold');
      const scrappedAssets = assetsWithCalcs.filter((a) => a.status === 'scrapped');
      const remainingAssets = assetsWithCalcs.filter((a) => a.status !== 'sold' && a.status !== 'scrapped');

      const totalPurchaseCost = assetsWithCalcs.reduce((sum, a) => sum + a.purchase_price, 0);
      const totalRefurbishmentCost = assetsWithCalcs.reduce((sum, a) => sum + a.refurbishment_cost, 0);
      const totalRevenue = soldAssets.reduce((sum, a) => sum + a.selling_price, 0);
      const scrapValue = scrappedAssets.reduce((sum, a) => sum + a.scrap_value, 0);
      const scrapCost = scrappedAssets.reduce((sum, a) => sum + a.total_cost, 0);
      const scrapLoss = scrapValue - scrapCost;
      const assetProfit = soldAssets.reduce((sum, a) => sum + a.profit, 0);

      const compStats = componentStats || {
        total_sold_revenue: 0,
        total_sold_cost: 0,
        total_profit: 0,
        components_sold: 0,
        components_harvested: 0
      };

      const totalProfit = assetProfit + parseFloat(compStats.total_profit || 0) + scrapLoss;
      const remainingValue = remainingAssets.reduce((sum, a) => sum + a.total_cost, 0);

      const totalRealizedRevenue = totalRevenue + parseFloat(compStats.total_sold_revenue || 0) + scrapValue;

      const calculatedStats: LotStats = {
        totalItems: assetsWithCalcs.length,
        soldItems: soldAssets.length,
        remainingItems: remainingAssets.length,
        scrappedItems: scrappedAssets.length,
        totalPurchaseCost,
        totalRevenue,
        totalRefurbishmentCost,
        componentsSold: parseInt(compStats.components_sold) || 0,
        componentsHarvested: parseInt(compStats.components_harvested) || 0,
        componentRevenue: parseFloat(compStats.total_sold_revenue) || 0,
        componentCost: parseFloat(compStats.total_sold_cost) || 0,
        componentProfit: parseFloat(compStats.total_profit) || 0,
        scrapValue,
        scrapLoss,
        totalProfit,
        profitMargin: totalRealizedRevenue > 0
          ? (totalProfit / totalRealizedRevenue) * 100
          : 0,
        remainingValue,
        averageSalePrice: soldAssets.length > 0 ? totalRevenue / soldAssets.length : 0,
      };

      setStats(calculatedStats);
    } catch (error: any) {
      showToast(error.message, 'error');
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading lot data...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const isProfitable = stats.totalProfit > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lot Profit/Loss Report</h2>
            <p className="text-sm text-gray-600 mt-1">
              Lot #{lot.lot_number} - {lot.suppliers?.name || 'Unknown Supplier'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Items</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Sold</p>
                  <p className="text-2xl font-bold text-green-900">{stats.soldItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-amber-600 font-medium">Remaining</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.remainingItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-600 font-medium">Scrapped</p>
                  <p className="text-2xl font-bold text-red-900">{stats.scrappedItems}</p>
                </div>
              </div>
            </div>

            <div className={`${isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
              <div className="flex items-center gap-3">
                {isProfitable ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <p className={`text-sm font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {isProfitable ? 'Profit' : 'Loss'}
                  </p>
                  <p className={`text-2xl font-bold ${isProfitable ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(Math.abs(stats.totalProfit))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Purchase Cost</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalPurchaseCost)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Refurbishment Cost</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalRefurbishmentCost)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Cost</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(stats.totalPurchaseCost + stats.totalRefurbishmentCost)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Asset Revenue</span>
                <span className="text-lg font-semibold text-green-600">{formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Component Revenue ({stats.componentsSold} sold)</span>
                <span className="text-lg font-semibold text-blue-600">{formatCurrency(stats.componentRevenue)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Component Cost</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(stats.componentCost)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Component Profit</span>
                <span className={`text-lg font-semibold ${stats.componentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.componentProfit)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Scrap Value ({stats.scrappedItems} items)</span>
                <span className="text-lg font-semibold text-gray-600">{formatCurrency(stats.scrapValue)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Scrap Loss</span>
                <span className={`text-lg font-semibold ${stats.scrapLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.scrapLoss)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <span className={`text-lg font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.profitMargin.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Remaining Value</span>
                <span className="text-lg font-semibold text-amber-600">{formatCurrency(stats.remainingValue)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Asset Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand/Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchase</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refurb</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sold For</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.serial_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {asset.brand} {asset.model}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          asset.status === 'sold'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(asset.purchase_price)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(asset.refurbishment_cost)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(asset.total_cost)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {asset.status === 'sold' ? formatCurrency(asset.selling_price) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${
                        asset.profit > 0 ? 'text-green-600' : asset.profit < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {asset.status === 'sold' ? formatCurrency(asset.profit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
