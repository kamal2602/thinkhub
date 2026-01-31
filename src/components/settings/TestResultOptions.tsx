import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';

interface TestResultOption {
  id: string;
  product_type_id: string;
  name: string;
  color: string;
  result_type: 'pass' | 'fail' | 'neutral';
  sort_order: number;
  refurb_cost_category?: string;
  refurb_cost_amount?: number;
  auto_add_cost?: boolean;
}

interface TestResultOptionsProps {
  productTypeId: string;
  productTypeName: string;
}

const RANDOM_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#EAB308', '#22C55E', '#F43F5E'
];

function getRandomColor() {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}

export default function TestResultOptions({ productTypeId, productTypeName }: TestResultOptionsProps) {
  const { selectedCompany } = useCompany();
  const toast = useToast();
  const [options, setOptions] = useState<TestResultOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    color: getRandomColor(),
    result_type: 'neutral' as 'pass' | 'fail' | 'neutral',
    refurb_cost_category: '',
    refurb_cost_amount: '',
    auto_add_cost: false,
  });

  useEffect(() => {
    fetchOptions();
  }, [productTypeId]);

  const fetchOptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('test_result_options')
      .select('*')
      .eq('product_type_id', productTypeId)
      .order('sort_order');

    if (!error && data) {
      setOptions(data);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter an option name');
      return;
    }

    const maxOrder = Math.max(...options.map(o => o.sort_order), 0);

    const { error } = await supabase.from('test_result_options').insert({
      product_type_id: productTypeId,
      name: formData.name.trim(),
      color: formData.color,
      result_type: formData.result_type,
      sort_order: maxOrder + 1,
      refurb_cost_category: formData.refurb_cost_category || null,
      refurb_cost_amount: formData.refurb_cost_amount ? parseFloat(formData.refurb_cost_amount) : null,
      auto_add_cost: formData.auto_add_cost,
    });

    if (error) {
      toast.error('Failed to add option: ' + error.message);
      return;
    }

    toast.success('Test result option added');
    setFormData({ name: '', color: getRandomColor(), result_type: 'neutral', refurb_cost_category: '', refurb_cost_amount: '', auto_add_cost: false });
    setShowAdd(false);
    fetchOptions();
  };

  const handleUpdate = async (id: string) => {
    const option = options.find(o => o.id === id);
    if (!option) return;

    const { error } = await supabase
      .from('test_result_options')
      .update({
        name: option.name,
        color: option.color,
        result_type: option.result_type,
        refurb_cost_category: option.refurb_cost_category || null,
        refurb_cost_amount: option.refurb_cost_amount || null,
        auto_add_cost: option.auto_add_cost || false,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update option: ' + error.message);
      return;
    }

    toast.success('Option updated');
    setEditingId(null);
    fetchOptions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test result option?')) return;

    const { error } = await supabase.from('test_result_options').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete option: ' + error.message);
      return;
    }

    toast.success('Option deleted');
    fetchOptions();
  };

  const updateOption = (id: string, field: keyof TestResultOption, value: any) => {
    setOptions(prev => prev.map(option =>
      option.id === id ? { ...option, [field]: value } : option
    ));
  };

  if (loading) {
    return <div className="text-center py-4">Loading test result options...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Test Result Options</h3>
          <p className="text-sm text-gray-600">
            Configure testing result options for {productTypeName}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setFormData({ name: '', color: getRandomColor(), result_type: 'neutral', refurb_cost_category: '', refurb_cost_amount: '', auto_add_cost: false });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Option name (e.g., Excellent, Marginal)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Result Type</label>
              <select
                value={formData.result_type}
                onChange={(e) => setFormData({ ...formData, result_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <DollarSign className="w-4 h-4" />
              Refurbishment Cost (Optional)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Cost Category</label>
                <input
                  type="text"
                  placeholder="e.g., Screen Replacement"
                  value={formData.refurb_cost_category}
                  onChange={(e) => setFormData({ ...formData, refurb_cost_category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Cost Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.refurb_cost_amount}
                  onChange={(e) => setFormData({ ...formData, refurb_cost_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.auto_add_cost}
                onChange={(e) => setFormData({ ...formData, auto_add_cost: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Auto-add cost when this result is selected</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              If checked, cost is added automatically. Otherwise, technician is prompted to confirm.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {options.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No test result options configured. Add your first option to get started.
          </div>
        ) : (
          options.map((option) => (
            <div key={option.id} className="bg-white p-4 rounded-lg border border-gray-200">
              {editingId === option.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={option.name}
                    onChange={(e) => updateOption(option.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Color</label>
                      <input
                        type="color"
                        value={option.color}
                        onChange={(e) => updateOption(option.id, 'color', e.target.value)}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Result Type</label>
                      <select
                        value={option.result_type}
                        onChange={(e) => updateOption(option.id, 'result_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <DollarSign className="w-4 h-4" />
                      Refurbishment Cost (Optional)
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cost Category</label>
                        <input
                          type="text"
                          placeholder="e.g., Screen Replacement"
                          value={option.refurb_cost_category || ''}
                          onChange={(e) => updateOption(option.id, 'refurb_cost_category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cost Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={option.refurb_cost_amount || ''}
                          onChange={(e) => updateOption(option.id, 'refurb_cost_amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={option.auto_add_cost || false}
                        onChange={(e) => updateOption(option.id, 'auto_add_cost', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700">Auto-add cost when this result is selected</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(option.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: option.color }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.name}</div>
                        <div className="text-xs text-gray-500">
                          Type: <span className="capitalize">{option.result_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(option.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(option.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {(option.refurb_cost_category || option.refurb_cost_amount) && (
                    <div className="mt-2 pl-9 flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">
                        {option.refurb_cost_category && <span className="font-medium">{option.refurb_cost_category}</span>}
                        {option.refurb_cost_amount && (
                          <span className="text-green-600 ml-2">${parseFloat(option.refurb_cost_amount.toString()).toFixed(2)}</span>
                        )}
                        {option.auto_add_cost && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Auto-add</span>
                        )}
                        {!option.auto_add_cost && option.refurb_cost_category && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Suggest</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
