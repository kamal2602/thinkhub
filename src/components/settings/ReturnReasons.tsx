import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileWarning } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface ReturnReason {
  id: string;
  reason: string;
  description: string | null;
  requires_approval: boolean;
  sort_order: number;
}

export function ReturnReasons() {
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReason, setEditingReason] = useState<ReturnReason | null>(null);
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    requires_approval: false,
    sort_order: 0,
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchReasons();
    }
  }, [selectedCompany]);

  const fetchReasons = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('return_reasons')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('sort_order');

      if (error) throw error;
      setReasons(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      if (editingReason) {
        const { error } = await supabase
          .from('return_reasons')
          .update(formData)
          .eq('id', editingReason.id);

        if (error) throw error;
        showToast('Return reason updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('return_reasons')
          .insert([{ ...formData, company_id: selectedCompany.id }]);

        if (error) throw error;
        showToast('Return reason created successfully', 'success');
      }

      setShowForm(false);
      setEditingReason(null);
      setFormData({ reason: '', description: '', requires_approval: false, sort_order: 0 });
      fetchReasons();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (reason: ReturnReason) => {
    setEditingReason(reason);
    setFormData({
      reason: reason.reason,
      description: reason.description || '',
      requires_approval: reason.requires_approval,
      sort_order: reason.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this return reason?')) return;

    try {
      const { error } = await supabase
        .from('return_reasons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Return reason deleted successfully', 'success');
      fetchReasons();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileWarning className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Return Reasons</h1>
            <p className="text-gray-600">Manage common return and RMA reasons</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingReason(null);
            setFormData({ reason: '', description: '', requires_approval: false, sort_order: 0 });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Return Reason
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingReason ? 'Edit Return Reason' : 'New Return Reason'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., DOA, Defective"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Describe when this reason applies..."
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Requires manager approval</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingReason(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingReason ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval Required</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort Order</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reasons.map((reason) => (
              <tr key={reason.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{reason.reason}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{reason.description || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  {reason.requires_approval && (
                    <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">Yes</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{reason.sort_order}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(reason)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(reason.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reasons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No return reasons found. Click "Add Return Reason" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
