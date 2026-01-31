import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { itadRevenueService } from '../../services/itadRevenueService';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

export function ITADRevenueSettlements() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      loadSettlements();
    }
  }, [currentCompany]);

  const loadSettlements = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const data = await itadRevenueService.getSettlements(currentCompany.id);
      setSettlements(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load settlements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (settlementId: string, userId: string) => {
    try {
      await itadRevenueService.approveSettlement(settlementId, userId);
      showToast('Settlement approved successfully', 'success');
      loadSettlements();
    } catch (error: any) {
      showToast(error.message || 'Failed to approve settlement', 'error');
    }
  };

  const handleMarkPaid = async (settlementId: string) => {
    const paymentDate = prompt('Enter payment date (YYYY-MM-DD):');
    if (!paymentDate) return;

    const paymentMethod = prompt('Enter payment method:');
    if (!paymentMethod) return;

    try {
      await itadRevenueService.markSettlementPaid(settlementId, paymentDate, paymentMethod);
      showToast('Settlement marked as paid', 'success');
      loadSettlements();
    } catch (error: any) {
      showToast(error.message || 'Failed to mark settlement as paid', 'error');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'approved':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'disputed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      approved: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disputed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalRevenue = settlements.reduce((sum, s) => sum + (s.total_gross_revenue || 0), 0);
  const totalCustomerShare = settlements.reduce((sum, s) => sum + (s.customer_revenue_share || 0), 0);
  const totalOurRevenue = settlements.reduce((sum, s) => sum + (s.our_net_revenue || 0), 0);
  const pendingPayments = settlements.filter(s => s.payment_status === 'pending' || s.payment_status === 'approved').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ITAD Revenue Settlements</h1>
        <p className="text-gray-600 mt-1">Manage revenue sharing and customer payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Customer Share</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalCustomerShare)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Our Net Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalOurRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pendingPayments}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No revenue settlements recorded</p>
          <p className="text-sm text-gray-500 mt-2">Settlements will appear here once ITAD projects generate revenue</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settlement Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Share</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Our Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {settlements.map(settlement => (
                <tr key={settlement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{settlement.itad_project?.project_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{settlement.itad_project?.customer?.name || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(settlement.settlement_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{settlement.total_assets_received} received</div>
                      <div className="text-xs text-gray-500">
                        {settlement.total_assets_refurbished} refurb, {settlement.total_assets_harvested} harvested
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.total_gross_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(settlement.customer_revenue_share)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {formatCurrency(settlement.our_net_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(settlement.payment_status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(settlement.payment_status)}`}>
                        {settlement.payment_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {settlement.payment_status === 'pending' && (
                        <button
                          onClick={() => handleApprove(settlement.id, 'current-user-id')}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {settlement.payment_status === 'approved' && (
                        <button
                          onClick={() => handleMarkPaid(settlement.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSettlement(settlement)}
                        className="text-gray-600 hover:text-gray-800 font-medium"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedSettlement(null)}>
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">Settlement Details</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Project</p>
                <p className="font-medium">{selectedSettlement.itad_project?.project_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">{selectedSettlement.itad_project?.customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Settlement Date</p>
                <p className="font-medium">{formatDate(selectedSettlement.settlement_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="font-medium capitalize">{selectedSettlement.payment_status}</p>
              </div>
            </div>

            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold mb-3">Revenue Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Refurbished Devices:</span>
                  <span className="font-medium">{formatCurrency(selectedSettlement.refurbished_device_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Component Sales:</span>
                  <span className="font-medium">{formatCurrency(selectedSettlement.component_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scrap Value:</span>
                  <span className="font-medium">{formatCurrency(selectedSettlement.scrap_value)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Gross Revenue:</span>
                  <span>{formatCurrency(selectedSettlement.total_gross_revenue)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold mb-3">Revenue Sharing</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(selectedSettlement.service_fee_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue Share ({selectedSettlement.revenue_share_percentage}%):</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedSettlement.customer_revenue_share)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-600 border-t pt-2">
                  <span>Our Net Revenue:</span>
                  <span>{formatCurrency(selectedSettlement.our_net_revenue)}</span>
                </div>
              </div>
            </div>

            {selectedSettlement.notes && (
              <div className="border-t pt-4 mb-4">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-gray-600">{selectedSettlement.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedSettlement(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
