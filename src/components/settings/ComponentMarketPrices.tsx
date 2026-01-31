import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { DollarSign, Plus, Edit2, Trash2, TrendingUp, Clock } from 'lucide-react';

interface ComponentPrice {
  id: string;
  component_type: string;
  component_name: string;
  capacity: string;
  technology_type?: string;
  manufacturer?: string;
  current_market_price: number;
  currency: string;
  auto_apply: boolean;
  is_active: boolean;
  price_history: any[];
  notes?: string;
  last_updated: string;
}

const COMPONENT_TYPES = ['RAM', 'HDD', 'SSD', 'NVMe', 'Battery', 'Screen', 'Keyboard', 'Other'];

export default function ComponentMarketPrices() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [prices, setPrices] = useState<ComponentPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ComponentPrice | null>(null);
  const [formData, setFormData] = useState({
    component_type: 'RAM',
    component_name: '',
    capacity: '',
    technology_type: '',
    manufacturer: '',
    current_market_price: '',
    auto_apply: true,
    is_active: true,
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchPrices();
    }
  }, [selectedCompany]);

  const fetchPrices = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('component_market_prices')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('component_type')
        .order('component_name');

      if (error) throw error;
      setPrices(data || []);
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
      const priceData = {
        company_id: selectedCompany.id,
        component_type: formData.component_type,
        component_name: formData.component_name,
        capacity: formData.capacity,
        technology_type: formData.technology_type || null,
        manufacturer: formData.manufacturer || null,
        current_market_price: parseFloat(formData.current_market_price),
        auto_apply: formData.auto_apply,
        is_active: formData.is_active,
        notes: formData.notes || null
      };

      if (editingPrice) {
        const { error } = await supabase
          .from('component_market_prices')
          .update({
            ...priceData,
            updated_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', editingPrice.id);

        if (error) throw error;
        showToast('Component price updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('component_market_prices')
          .insert({
            ...priceData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
        showToast('Component price added successfully', 'success');
      }

      resetForm();
      fetchPrices();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (price: ComponentPrice) => {
    setEditingPrice(price);
    setFormData({
      component_type: price.component_type,
      component_name: price.component_name,
      capacity: price.capacity,
      technology_type: price.technology_type || '',
      manufacturer: price.manufacturer || '',
      current_market_price: price.current_market_price.toString(),
      auto_apply: price.auto_apply,
      is_active: price.is_active,
      notes: price.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this price template?')) return;

    try {
      const { error } = await supabase
        .from('component_market_prices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Component price deleted successfully', 'success');
      fetchPrices();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      component_type: 'RAM',
      component_name: '',
      capacity: '',
      technology_type: '',
      manufacturer: '',
      current_market_price: '',
      auto_apply: true,
      is_active: true,
      notes: ''
    });
    setEditingPrice(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Component Market Prices</h2>
          <p className="text-gray-600 mt-1">
            Set standard market prices for harvested components. Used for P/L calculation by purchase lot.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Price
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingPrice ? 'Edit Component Price' : 'Add Component Price'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component Type *
                </label>
                <select
                  value={formData.component_type}
                  onChange={(e) => setFormData({ ...formData, component_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {COMPONENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component Name *
                </label>
                <input
                  type="text"
                  value={formData.component_name}
                  onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., RAM 8GB DDR4"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="text"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 8GB"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technology Type
                </label>
                <input
                  type="text"
                  value={formData.technology_type}
                  onChange={(e) => setFormData({ ...formData, technology_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., DDR4, NVMe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Samsung, Kingston"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Market Price (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_market_price}
                  onChange={(e) => setFormData({ ...formData, current_market_price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="Optional notes about this price..."
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_apply}
                  onChange={(e) => setFormData({ ...formData, auto_apply: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Auto-apply during harvest</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingPrice ? 'Update Price' : 'Add Price'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {prices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No component prices defined yet</p>
                  <p className="text-sm mt-1">Add prices to auto-fill market values during harvest</p>
                </td>
              </tr>
            ) : (
              prices.map((price) => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {price.component_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{price.component_name}</div>
                    {price.manufacturer && (
                      <div className="text-sm text-gray-500">{price.manufacturer}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{price.capacity}</div>
                    {price.technology_type && (
                      <div className="text-sm text-gray-500">{price.technology_type}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600">
                        ${price.current_market_price.toFixed(2)}
                      </span>
                      {price.price_history && price.price_history.length > 0 && (
                        <TrendingUp className="w-4 h-4 text-gray-400" title="Has price history" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {price.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                      {price.auto_apply && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Auto-apply
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(price.last_updated).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(price)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(price.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {prices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How Component Prices Work</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Prices with "Auto-apply" enabled will be suggested during harvest operations</li>
            <li>• Market values are used to calculate P/L for purchase lots</li>
            <li>• Price history is automatically tracked when you update prices</li>
            <li>• Inactive prices won't appear in harvest workflows but are kept for historical data</li>
          </ul>
        </div>
      )}
    </div>
  );
}
