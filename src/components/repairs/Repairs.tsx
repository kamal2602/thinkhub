import { useState, useEffect } from 'react';
import { Plus, Wrench, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { RepairStatus } from '../../lib/database.types';


interface Repair {
  id: string;
  repair_number: string;
  customer_id: string;
  item_description: string;
  issue_description: string;
  status: RepairStatus;
  received_date: string;
  estimated_completion: string;
  completed_date: string | null;
  repair_cost: number;
  parts_cost: number;
  notes: string;
  customers: {
    name: string;
    phone: string;
  };
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export function Repairs() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [formData, setFormData] = useState({
    repair_number: '',
    customer_id: '',
    item_description: '',
    issue_description: '',
    status: 'pending' as RepairStatus,
    received_date: new Date().toISOString().split('T')[0],
    estimated_completion: '',
    completed_date: '',
    repair_cost: 0,
    parts_cost: 0,
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
      const [repairsRes, customersRes] = await Promise.all([
        supabase
          .from('repairs')
          .select('*, customers(name, phone)')
          .eq('company_id', selectedCompany?.id)
          .order('received_date', { ascending: false }),
        supabase
          .from('customers')
          .select('id, name, phone')
          .eq('company_id', selectedCompany?.id)
          .order('name'),
      ]);

      if (repairsRes.error) throw repairsRes.error;
      if (customersRes.error) throw customersRes.error;

      setRepairs(repairsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.repair_number || !formData.customer_id || !formData.item_description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingRepair) {
        const { error } = await supabase
          .from('repairs')
          .update({
            customer_id: formData.customer_id,
            item_description: formData.item_description,
            issue_description: formData.issue_description,
            status: formData.status,
            estimated_completion: formData.estimated_completion || null,
            completed_date: formData.completed_date || null,
            repair_cost: formData.repair_cost,
            parts_cost: formData.parts_cost,
            notes: formData.notes,
          })
          .eq('id', editingRepair.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('repairs')
          .insert({
            company_id: selectedCompany?.id,
            repair_number: formData.repair_number,
            customer_id: formData.customer_id,
            item_description: formData.item_description,
            issue_description: formData.issue_description,
            status: formData.status,
            received_date: formData.received_date,
            estimated_completion: formData.estimated_completion || null,
            completed_date: formData.completed_date || null,
            repair_cost: formData.repair_cost,
            parts_cost: formData.parts_cost,
            notes: formData.notes,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingRepair(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      repair_number: '',
      customer_id: '',
      item_description: '',
      issue_description: '',
      status: 'pending',
      received_date: new Date().toISOString().split('T')[0],
      estimated_completion: '',
      completed_date: '',
      repair_cost: 0,
      parts_cost: 0,
      notes: '',
    });
  };

  const openEditModal = (repair: Repair) => {
    setEditingRepair(repair);
    setFormData({
      repair_number: repair.repair_number,
      customer_id: repair.customer_id,
      item_description: repair.item_description,
      issue_description: repair.issue_description,
      status: repair.status,
      received_date: repair.received_date,
      estimated_completion: repair.estimated_completion || '',
      completed_date: repair.completed_date || '',
      repair_cost: repair.repair_cost,
      parts_cost: repair.parts_cost,
      notes: repair.notes,
    });
    setShowModal(true);
  };

  const deleteRepair = async (id: string) => {
    if (!confirm('Are you sure you want to delete this repair?')) return;

    try {
      const { error } = await supabase
        .from('repairs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error deleting repair: ' + error.message);
    }
  };

  const getStatusColor = (status: RepairStatus) => {
    switch (status) {
      case 'completed': return 'text-green-700 bg-green-50';
      case 'in_progress': return 'text-blue-700 bg-blue-50';
      case 'waiting_parts': return 'text-yellow-700 bg-yellow-50';
      case 'pending': return 'text-gray-700 bg-gray-50';
      case 'cancelled': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getStatusLabel = (status: RepairStatus) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repairs Tracking</h1>
          <p className="text-gray-600 mt-1">Track items in repair with status updates and costs</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingRepair(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Repair
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repair #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Completion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
              {canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {repairs.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 9 : 8} className="px-6 py-12 text-center text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No repairs yet. Create your first repair ticket!</p>
                </td>
              </tr>
            ) : (
              repairs.map((repair) => (
                <tr key={repair.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{repair.repair_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{repair.customers.name}</div>
                    <div className="text-xs text-gray-500">{repair.customers.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{repair.item_description}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                    {repair.issue_description}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(repair.status)}`}>
                      {getStatusLabel(repair.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(repair.received_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {repair.estimated_completion ? new Date(repair.estimated_completion).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${(repair.repair_cost + repair.parts_cost).toFixed(2)}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(repair)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRepair(repair.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              <h2 className="text-xl font-bold text-gray-900">
                {editingRepair ? 'Edit Repair' : 'New Repair'}
              </h2>
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
                    Repair Number *
                  </label>
                  <input
                    type="text"
                    value={formData.repair_number}
                    onChange={(e) => setFormData({ ...formData, repair_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingRepair}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Description *
                  </label>
                  <input
                    type="text"
                    value={formData.item_description}
                    onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., iPhone 12 Pro, Samsung TV 55inch"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Description
                  </label>
                  <textarea
                    value={formData.issue_description}
                    onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Describe the issue..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as RepairStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_parts">Waiting Parts</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    value={formData.received_date}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Completion
                  </label>
                  <input
                    type="date"
                    value={formData.estimated_completion}
                    onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={formData.completed_date}
                    onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repair Cost
                  </label>
                  <input
                    type="number"
                    value={formData.repair_cost}
                    onChange={(e) => setFormData({ ...formData, repair_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parts Cost
                  </label>
                  <input
                    type="number"
                    value={formData.parts_cost}
                    onChange={(e) => setFormData({ ...formData, parts_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
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
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRepair(null);
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
                  {editingRepair ? 'Update' : 'Create'} Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
