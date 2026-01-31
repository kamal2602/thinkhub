import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface WarrantyType {
  id: string;
  name: string;
  default_months: number;
  description: string | null;
}

export function WarrantyTypes() {
  const [types, setTypes] = useState<WarrantyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<WarrantyType | null>(null);
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    default_months: 0,
    description: '',
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchTypes();
    }
  }, [selectedCompany]);

  const fetchTypes = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('warranty_types')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name');

      if (error) throw error;
      setTypes(data || []);
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
      if (editingType) {
        const { error } = await supabase
          .from('warranty_types')
          .update(formData)
          .eq('id', editingType.id);

        if (error) throw error;
        showToast('Warranty type updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('warranty_types')
          .insert([{ ...formData, company_id: selectedCompany.id }]);

        if (error) throw error;
        showToast('Warranty type created successfully', 'success');
      }

      setShowForm(false);
      setEditingType(null);
      setFormData({ name: '', default_months: 0, description: '' });
      fetchTypes();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (type: WarrantyType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      default_months: type.default_months,
      description: type.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warranty type?')) return;

    try {
      const { error } = await supabase
        .from('warranty_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Warranty type deleted successfully', 'success');
      fetchTypes();
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
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warranty Types</h1>
            <p className="text-gray-600">Manage warranty options for products</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingType(null);
            setFormData({ name: '', default_months: 0, description: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Warranty Type
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingType ? 'Edit Warranty Type' : 'New Warranty Type'}
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
                  placeholder="e.g., Manufacturer, In-house"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Months *
                </label>
                <input
                  type="number"
                  value={formData.default_months}
                  onChange={(e) => setFormData({ ...formData, default_months: parseInt(e.target.value) })}
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
                placeholder="Describe the warranty coverage..."
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingType(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingType ? 'Update' : 'Create'}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{type.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{type.default_months} months</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{type.description || '-'}</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(type)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {types.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No warranty types found. Click "Add Warranty Type" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
