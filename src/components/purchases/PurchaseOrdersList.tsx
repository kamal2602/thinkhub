import { useState, useEffect } from 'react';
import { Plus, FileText, Package, CheckCircle, Clock, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { checkPOReceivingStatus } from '../../lib/purchaseOrderUtils';
import { IntakeTypeBadge } from '../common/IntakeTypeBadge';

interface PO {
  id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date: string;
  status: string;
  total_amount: number;
  total_items_ordered: number;
  total_items_received: number;
  purchase_lot_id?: string;
  intake_type?: string;
  client_party_id?: string;
  contacts?: {
    name: string;
  } | null;
  purchase_lots?: {
    lot_number: string;
  } | null;
}

export function PurchaseOrdersList() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showReimport, setShowReimport] = useState(false);
  const [reimportPO, setReimportPO] = useState<PO | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchPOs();
    }
  }, [selectedCompany, statusFilter]);

  const fetchPOs = async () => {
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          contacts!client_party_id(name),
          purchase_lots(lot_number)
        `)
        .eq('company_id', selectedCompany?.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPos(data || []);
    } catch (error: any) {
      console.error('Error loading purchase orders:', error);
      showToast('Error loading purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (po: PO) => {
    const { data: lines } = await supabase
      .from('purchase_order_lines')
      .select('*')
      .eq('purchase_order_id', po.id)
      .order('line_number');

    setSelectedPO({ ...po, lines });
    setShowForm(true);
  };

  const handleDelete = async (po: PO) => {
    if (!confirm(`Delete PO ${po.po_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error: linesError } = await supabase
        .from('purchase_order_lines')
        .delete()
        .eq('purchase_order_id', po.id);

      if (linesError) throw linesError;

      const { error: poError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', po.id);

      if (poError) throw poError;

      showToast('Purchase order deleted successfully', 'success');
      fetchPOs();
    } catch (error: any) {
      showToast(`Error deleting purchase order: ${error.message}`, 'error');
    }
  };

  const handleReimport = async (po: PO) => {
    try {
      const stats = await checkPOReceivingStatus(po.id);

      if (!stats.canReimport) {
        showToast(
          `Cannot re-import: ${stats.totalReceived} of ${stats.totalExpected} items already received`,
          'error'
        );
        return;
      }

      const { data: lines } = await supabase
        .from('purchase_order_lines')
        .select('*')
        .eq('purchase_order_id', po.id)
        .order('line_number');

      setReimportPO({ ...po, lines });
      setShowReimport(true);
    } catch (error: any) {
      showToast(`Error checking PO status: ${error.message}`, 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'received':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'partial':
        return <Package className="w-4 h-4" />;
      case 'received':
        return <CheckCircle className="w-4 h-4" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
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

  if (showForm) {
    return (
      <PurchaseOrderForm
        po={selectedPO}
        onClose={() => {
          setShowForm(false);
          setSelectedPO(null);
        }}
        onSuccess={() => {
          fetchPOs();
        }}
      />
    );
  }

  if (showReimport && reimportPO) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Re-import PO {reimportPO.po_number}</h3>
                <p className="text-sm text-yellow-800">
                  Fix your column mappings and upload the corrected file. The existing expected items will be replaced with the new data.
                </p>
              </div>
            </div>
          </div>
        </div>
        <PurchaseOrderForm
          po={reimportPO}
          onClose={() => {
            setShowReimport(false);
            setReimportPO(null);
          }}
          onSuccess={() => {
            setShowReimport(false);
            setReimportPO(null);
            fetchPOs();
            showToast('PO re-imported successfully with corrected mappings', 'success');
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage orders from suppliers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create PO
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        {['all', 'draft', 'submitted', 'partial', 'received', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg capitalize ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      ) : pos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No purchase orders found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First PO
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">PO Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Supplier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Order Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Expected</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Items</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pos.map((po) => {
                const displayName = po.contacts?.name || 'Unknown Supplier';

                return (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-900">{po.po_number}</span>
                        {po.purchase_lot_id && po.purchase_lots && (
                          <span className="text-xs text-gray-500">
                            Lot: {po.purchase_lots.lot_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {po.intake_type && (
                        <IntakeTypeBadge type={po.intake_type as 'resale' | 'itad' | 'recycling'} size="sm" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{displayName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                  <td className="px-4 py-3 text-gray-700">
                    {po.expected_delivery_date
                      ? new Date(po.expected_delivery_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">
                      {po.total_items_received}/{po.total_items_ordered}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      ${po.total_amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        po.status
                      )}`}
                    >
                      {getStatusIcon(po.status)}
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(po)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {po.status === 'draft' || po.status === 'submitted' ? 'Edit' : 'View'}
                      </button>
                      {(po.status === 'draft' || po.status === 'submitted') && (
                        <button
                          onClick={() => handleReimport(po)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center gap-1"
                          title="Re-import with corrected mappings"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Re-import
                        </button>
                      )}
                      {po.status === 'submitted' && (
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                          Receive
                        </button>
                      )}
                      {po.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(po)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
