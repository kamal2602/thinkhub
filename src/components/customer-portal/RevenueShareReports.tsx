import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Package, Calendar, Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RevenueTransaction {
  id: string;
  transaction_date: string;
  sale_price: number;
  sale_currency: string;
  total_costs: number;
  gross_profit: number;
  revenue_share_percentage: number;
  customer_share_amount: number;
  company_share_amount: number;
  settlement_status: string;
  settled_at: string;
  asset: {
    internal_asset_id: string;
    serial_number: string;
    brand: string;
    model: string;
  };
  itad_project: {
    project_number: string;
    project_name: string;
  };
}

interface RevenueShareReportsProps {
  customerId: string;
}

export function RevenueShareReports({ customerId }: RevenueShareReportsProps) {
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    try {
      const { data: txData, error: txError } = await supabase
        .from('revenue_share_transactions')
        .select(`
          *,
          asset:assets (
            internal_asset_id,
            serial_number,
            brand,
            model
          ),
          itad_project:itad_projects (
            project_number,
            project_name
          )
        `)
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      const { data: projectData } = await supabase
        .from('itad_projects')
        .select('id, project_number, project_name')
        .eq('itad_customer_id', customerId);

      setProjects(projectData || []);

    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'accrued': 'bg-blue-100 text-blue-700',
      'settled': 'bg-green-100 text-green-700',
      'disputed': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'accrued': 'Accrued',
      'settled': 'Settled',
      'disputed': 'Disputed'
    };
    return labels[status] || status;
  };

  const calculateTotals = (txs: RevenueTransaction[]) => {
    return txs.reduce((acc, tx) => ({
      totalRevenue: acc.totalRevenue + tx.sale_price,
      totalCosts: acc.totalCosts + tx.total_costs,
      totalProfit: acc.totalProfit + tx.gross_profit,
      customerShare: acc.customerShare + tx.customer_share_amount,
      companyShare: acc.companyShare + tx.company_share_amount,
      settled: acc.settled + (tx.settlement_status === 'settled' ? tx.customer_share_amount : 0),
      pending: acc.pending + (tx.settlement_status === 'pending' || tx.settlement_status === 'accrued' ? tx.customer_share_amount : 0)
    }), {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      customerShare: 0,
      companyShare: 0,
      settled: 0,
      pending: 0
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesStatus = filterStatus === 'all' || tx.settlement_status === filterStatus;
    const matchesProject = filterProject === 'all' || (tx.itad_project as any)?.id === filterProject;
    return matchesStatus && matchesProject;
  });

  const totals = calculateTotals(filteredTransactions);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue Share</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ${totals.customerShare.toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Settled</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                ${totals.settled.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                ${totals.pending.toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assets Sold</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {filteredTransactions.length}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenue Share Transactions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Detailed breakdown of asset sales and your revenue share
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accrued">Accrued</option>
              <option value="settled">Settled</option>
              <option value="disputed">Disputed</option>
            </select>

            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costs
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Share %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Your Share
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {(tx.asset as any)?.brand} {(tx.asset as any)?.model}
                    </div>
                    <div className="text-xs text-gray-500">
                      S/N: {(tx.asset as any)?.serial_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(tx.itad_project as any)?.project_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ${tx.sale_price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                    ${tx.total_costs.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    ${tx.gross_profit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                    {tx.revenue_share_percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                    ${tx.customer_share_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.settlement_status)}`}>
                      {getStatusLabel(tx.settlement_status)}
                    </span>
                    {tx.settled_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(tx.settled_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No revenue share transactions yet</p>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">
                    TOTALS
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    ${totals.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    ${totals.totalCosts.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    ${totals.totalProfit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">
                    ${totals.customerShare.toLocaleString()}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How Revenue Sharing Works</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>1. When we sell one of your assets, we calculate the gross profit (sale price minus processing costs)</p>
          <p>2. Your revenue share percentage is applied to the gross profit</p>
          <p>3. Settlements are typically processed monthly for all accrued revenue shares</p>
          <p>4. You'll receive a detailed statement before each settlement payment</p>
        </div>
      </div>
    </div>
  );
}
