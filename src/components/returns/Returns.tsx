import { useState, useEffect } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { ReturnType } from '../../lib/database.types';


interface Return {
  id: string;
  return_number: string;
  return_type: ReturnType;
  reference_id: string;
  return_date: string;
  reason: string;
  refund_amount: number;
  notes: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  name: string;
}

export function Returns() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    return_number: '',
    return_type: 'sales' as ReturnType,
    reference_id: '',
    item_id: '',
    location_id: '',
    quantity: 1,
    return_date: new Date().toISOString().split('T')[0],
    reason: '',
    refund_amount: 0,
    notes: '',
  });
  const [error, setError] = useState('');

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      const [returnsRes, customersRes, suppliersRes, itemsRes, locationsRes] = await Promise.all([
        supabase
          .from('returns')
          .select('*')
          .eq('company_id', selectedCompany?.id)
          .order('return_date', { ascending: false }),
        supabase
          .from('customers')
          .select('id, name')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
        supabase
          .from('suppliers')
          .select('id, name')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
        supabase
          .from('inventory_items')
          .select('id, name, sku')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
        supabase
          .from('locations')
          .select('id, name')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
      ]);

      if (returnsRes.error) throw returnsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setReturns(returnsRes.data || []);
      setCustomers(customersRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.return_number || !formData.reference_id || !formData.item_id || !formData.location_id) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    try {
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .insert({
          company_id: selectedCompany?.id,
          return_number: formData.return_number,
          return_type: formData.return_type,
          reference_id: formData.reference_id,
          return_date: formData.return_date,
          reason: formData.reason,
          refund_amount: formData.refund_amount,
          notes: formData.notes,
          processed_by: user?.id,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      const { error: itemError } = await supabase
        .from('return_items')
        .insert({
          return_id: returnData.id,
          item_id: formData.item_id,
          quantity: formData.quantity,
        });

      if (itemError) throw itemError;

      const adjustedQuantity = formData.return_type === 'sales' ? formData.quantity : -formData.quantity;

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          item_id: formData.item_id,
          location_id: formData.location_id,
          movement_type: formData.return_type === 'sales' ? 'return_in' : 'return_out',
          quantity: adjustedQuantity,
          reference_number: formData.return_number,
          notes: `Return: ${formData.reason}`,
          performed_by: user?.id,
        });

      if (movementError) throw movementError;

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      return_number: '',
      return_type: 'sales',
      reference_id: '',
      item_id: '',
      location_id: '',
      quantity: 1,
      return_date: new Date().toISOString().split('T')[0],
      reason: '',
      refund_amount: 0,
      notes: '',
    });
  };

  const deleteReturn = async (id: string) => {
    if (!confirm('Are you sure you want to delete this return?')) return;

    try {
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error deleting return: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
          <p className="text-gray-600 mt-1">Process sales and purchase returns with stock adjustments</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Return
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Amount</th>
              {canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                  <RotateCcw className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No returns yet. Process your first return!</p>
                </td>
              </tr>
            ) : (
              returns.map((returnItem) => (
                <tr key={returnItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{returnItem.return_number}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      returnItem.return_type === 'sales'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}>
                      {returnItem.return_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(returnItem.return_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{returnItem.reference_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{returnItem.reason || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${returnItem.refund_amount.toFixed(2)}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => deleteReturn(returnItem.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Return</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Number *
                  </label>
                  <input
                    type="text"
                    value={formData.return_number}
                    onChange={(e) => setFormData({ ...formData, return_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Type *
                  </label>
                  <select
                    value={formData.return_type}
                    onChange={(e) => setFormData({ ...formData, return_type: e.target.value as ReturnType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="sales">Sales Return</option>
                    <option value="purchase">Purchase Return</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference (Invoice/PO) *
                  </label>
                  <input
                    type="text"
                    value={formData.reference_id}
                    onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.return_type === 'sales' ? 'Invoice #' : 'PO #'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Date *
                  </label>
                  <input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item *
                  </label>
                  <select
                    value={formData.item_id}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    value={formData.refund_amount}
                    onChange={(e) => setFormData({ ...formData, refund_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Defective, Wrong item, Changed mind"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Process Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
