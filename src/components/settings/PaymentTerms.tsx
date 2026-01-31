import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  description: string | null;
  is_default: boolean;
}

export function PaymentTerms() {
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    days: 0,
    description: '',
    is_default: false,
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchTerms();
    }
  }, [selectedCompany]);

  const fetchTerms = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('days');

      if (error) throw error;
      setTerms(data || []);
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
      if (editingTerm) {
        const { error } = await supabase
          .from('payment_terms')
          .update(formData)
          .eq('id', editingTerm.id);

        if (error) throw error;
        showToast('Payment term updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('payment_terms')
          .insert([{ ...formData, company_id: selectedCompany.id }]);

        if (error) throw error;
        showToast('Payment term created successfully', 'success');
      }

      setShowForm(false);
      setEditingTerm(null);
      setFormData({ name: '', days: 0, description: '', is_default: false });
      fetchTerms();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (term: PaymentTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      days: term.days,
      description: term.description || '',
      is_default: term.is_default,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment term?')) return;

    try {
      const { error } = await supabase
        .from('payment_terms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Payment term deleted successfully', 'success');
      fetchTerms();
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
          <CreditCard className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Terms</h1>
            <p className="text-gray-600">Manage payment term options for invoices</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingTerm(null);
            setFormData({ name: '', days: 0, description: '', is_default: false });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Payment Term
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingTerm ? 'Edit Payment Term' : 'New Payment Term'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., Net 30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days *
                </label>
                <input
                  type="number"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="0"
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
                placeholder="Describe the payment terms..."
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Set as default</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTerm(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingTerm ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {terms.map((term) => (
              <tr key={term.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{term.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{term.days} days</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{term.description || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  {term.is_default && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Default</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(term)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(term.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {terms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payment terms found. Click "Add Payment Term" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
