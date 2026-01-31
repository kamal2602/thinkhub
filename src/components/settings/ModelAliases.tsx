import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Tag, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

interface ModelAlias {
  id: string;
  brand: string;
  variant_name: string;
  canonical_name: string;
  full_model_name: string;
  confidence_score: number;
  notes?: string;
  created_at: string;
}

export function ModelAliases() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [aliases, setAliases] = useState<ModelAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    variant_name: '',
    canonical_name: '',
    full_model_name: '',
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchAliases();
    }
  }, [selectedCompany]);

  const fetchAliases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('model_aliases')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('brand', { ascending: true })
        .order('canonical_name', { ascending: true });

      if (error) throw error;
      setAliases(data || []);
    } catch (error: any) {
      showToast('Error loading model aliases: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlias = async () => {
    if (!formData.brand || !formData.variant_name || !formData.canonical_name) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const full_name = formData.full_model_name || `${formData.brand} ${formData.canonical_name}`;

      const { error } = await supabase
        .from('model_aliases')
        .insert({
          company_id: selectedCompany?.id,
          brand: formData.brand.trim(),
          variant_name: formData.variant_name.trim(),
          canonical_name: formData.canonical_name.trim(),
          full_model_name: full_name.trim(),
          notes: formData.notes?.trim() || null,
          confidence_score: 100,
          created_by: user?.id
        });

      if (error) throw error;

      showToast('Model alias added successfully', 'success');
      setShowAddForm(false);
      setFormData({
        brand: '',
        variant_name: '',
        canonical_name: '',
        full_model_name: '',
        notes: ''
      });
      fetchAliases();
    } catch (error: any) {
      showToast('Error adding model alias: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model alias?')) return;

    try {
      const { error } = await supabase
        .from('model_aliases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Model alias deleted successfully', 'success');
      fetchAliases();
    } catch (error: any) {
      showToast('Error deleting model alias: ' + error.message, 'error');
    }
  };

  const handleNormalizeExistingAssets = async () => {
    if (!confirm('This will normalize all existing asset model names based on your aliases. Continue?')) return;

    try {
      setLoading(true);
      showToast('Starting normalization...', 'info');

      const { data: assets, error: fetchError } = await supabase
        .from('assets')
        .select('id, brand, model')
        .eq('company_id', selectedCompany?.id)
        .not('brand', 'is', null)
        .not('model', 'is', null);

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      for (const asset of assets || []) {
        const { data: normalizedModel } = await supabase
          .rpc('normalize_model_name', {
            p_company_id: selectedCompany?.id,
            p_brand: asset.brand,
            p_model_variant: asset.model
          });

        if (normalizedModel && normalizedModel !== asset.model) {
          const { error: updateError } = await supabase
            .from('assets')
            .update({ model: normalizedModel })
            .eq('id', asset.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      showToast(`Successfully normalized ${updatedCount} asset model names`, 'success');
    } catch (error: any) {
      showToast('Error normalizing assets: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAliases = aliases.filter(alias =>
    alias.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alias.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alias.canonical_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alias.full_model_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedAliases = filteredAliases.reduce((acc, alias) => {
    const key = `${alias.brand}-${alias.canonical_name}`;
    if (!acc[key]) {
      acc[key] = {
        brand: alias.brand,
        canonical_name: alias.canonical_name,
        full_model_name: alias.full_model_name,
        variants: []
      };
    }
    acc[key].variants.push(alias);
    return acc;
  }, {} as Record<string, { brand: string; canonical_name: string; full_model_name: string; variants: ModelAlias[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Model Normalization</h2>
          <p className="text-gray-600 mt-1">Standardize model names from various supplier formats</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNormalizeExistingAssets}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <RefreshCw className="w-5 h-5" />
            Normalize Existing Assets
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Model Alias
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Model Alias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="HP, Dell, Lenovo, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variant Name (from import) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.variant_name}
                onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                placeholder="840 G10, Elitebook 840 G10, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canonical Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.canonical_name}
                onChange={(e) => setFormData({ ...formData, canonical_name: e.target.value })}
                placeholder="EliteBook 840 G10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Model Name (optional)
              </label>
              <input
                type="text"
                value={formData.full_model_name}
                onChange={(e) => setFormData({ ...formData, full_model_name: e.target.value })}
                placeholder="Auto: {Brand} {Canonical Name}"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddAlias}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Alias
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ brand: '', variant_name: '', canonical_name: '', full_model_name: '', notes: '' });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by brand, variant, or model name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedAliases).map(([key, group]) => (
          <div key={key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.full_model_name}</h3>
                  <p className="text-sm text-gray-600">
                    {group.variants.length} {group.variants.length === 1 ? 'variant' : 'variants'}
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {group.variants.map((alias) => (
                <div key={alias.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{alias.variant_name}</div>
                    {alias.notes && (
                      <div className="text-sm text-gray-500 mt-1">{alias.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(alias.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedAliases).length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No model aliases found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm ? 'Try a different search term' : 'Add your first model alias to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
