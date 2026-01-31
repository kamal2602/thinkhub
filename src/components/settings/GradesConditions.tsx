import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface CosmeticGrade {
  id: string;
  grade: string;
  description: string | null;
  sort_order: number;
}

interface FunctionalStatus {
  id: string;
  status: string;
  description: string | null;
  sort_order: number;
}

export function GradesConditions() {
  const [activeTab, setActiveTab] = useState<'cosmetic' | 'functional'>('cosmetic');
  const [cosmeticGrades, setCosmeticGrades] = useState<CosmeticGrade[]>([]);
  const [functionalStatuses, setFunctionalStatuses] = useState<FunctionalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    if (!selectedCompany) return;

    try {
      const [cosmeticRes, functionalRes] = await Promise.all([
        supabase
          .from('cosmetic_grades')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('sort_order'),
        supabase
          .from('functional_statuses')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('sort_order'),
      ]);

      if (cosmeticRes.error) throw cosmeticRes.error;
      if (functionalRes.error) throw functionalRes.error;

      setCosmeticGrades(cosmeticRes.data || []);
      setFunctionalStatuses(functionalRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    const table = activeTab === 'cosmetic' ? 'cosmetic_grades' : 'functional_statuses';
    const nameField = activeTab === 'cosmetic' ? 'grade' : 'status';

    try {
      if (editingId) {
        const { error } = await supabase
          .from(table)
          .update({
            [nameField]: formData.name,
            description: formData.description,
            sort_order: formData.sort_order,
          })
          .eq('id', editingId);

        if (error) throw error;
        showToast(`${activeTab === 'cosmetic' ? 'Grade' : 'Status'} updated successfully`, 'success');
      } else {
        const { error } = await supabase
          .from(table)
          .insert([{
            company_id: selectedCompany.id,
            [nameField]: formData.name,
            description: formData.description,
            sort_order: formData.sort_order,
          }]);

        if (error) throw error;
        showToast(`${activeTab === 'cosmetic' ? 'Grade' : 'Status'} created successfully`, 'success');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', sort_order: 0 });
      fetchData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (item: CosmeticGrade | FunctionalStatus) => {
    setEditingId(item.id);
    setFormData({
      name: 'grade' in item ? item.grade : item.status,
      description: item.description || '',
      sort_order: item.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const table = activeTab === 'cosmetic' ? 'cosmetic_grades' : 'functional_statuses';

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast(`${activeTab === 'cosmetic' ? 'Grade' : 'Status'} deleted successfully`, 'success');
      fetchData();
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

  const currentData = activeTab === 'cosmetic' ? cosmeticGrades : functionalStatuses;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grades & Conditions</h1>
            <p className="text-gray-600">Manage cosmetic grades and functional statuses</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ name: '', description: '', sort_order: 0 });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add {activeTab === 'cosmetic' ? 'Grade' : 'Status'}
        </button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('cosmetic')}
            className={`pb-3 px-1 border-b-2 font-medium transition ${
              activeTab === 'cosmetic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cosmetic Grades
          </button>
          <button
            onClick={() => setActiveTab('functional')}
            className={`pb-3 px-1 border-b-2 font-medium transition ${
              activeTab === 'functional'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Functional Statuses
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit' : 'New'} {activeTab === 'cosmetic' ? 'Grade' : 'Status'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'cosmetic' ? 'Grade' : 'Status'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder={activeTab === 'cosmetic' ? 'e.g., A, B, C' : 'e.g., Fully Working'}
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
                placeholder="Describe the condition..."
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {activeTab === 'cosmetic' ? 'Grade' : 'Status'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort Order</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    {'grade' in item ? item.grade : item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{item.description || '-'}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.sort_order}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {currentData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === 'cosmetic' ? 'grades' : 'statuses'} found. Click "Add {activeTab === 'cosmetic' ? 'Grade' : 'Status'}" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
