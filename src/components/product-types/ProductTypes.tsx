import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, List, DollarSign, Save, X, GripVertical, CheckSquare, Settings, Tag, ChevronDown, ChevronRight, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import TestResultOptions from '../settings/TestResultOptions';

interface ProductType {
  id: string;
  name: string;
  description: string;
  created_at: string;
  sort_order?: number;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  sort_order: number;
}

interface Alias {
  id: string;
  product_type_id: string;
  alias: string;
  created_at: string;
}

interface ProductTypesProps {
  initialTab?: 'aliases' | 'testing' | 'all-aliases';
}

export function ProductTypes({ initialTab }: ProductTypesProps = {}) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [draggedChecklistIndex, setDraggedChecklistIndex] = useState<number | null>(null);
  const [draggedProductTypeIndex, setDraggedProductTypeIndex] = useState<number | null>(null);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);

  const [testResultOptions, setTestResultOptions] = useState<any[]>([]);
  const [editingTestResultId, setEditingTestResultId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'aliases' | 'testing' | 'all-aliases'>(initialTab || 'aliases');
  const [tabOrder, setTabOrder] = useState<Array<'aliases' | 'testing' | 'all-aliases'>>(() => {
    const saved = localStorage.getItem('productTypesTabOrder');
    if (saved) {
      const parsed = JSON.parse(saved);
      const validTabs = parsed.filter((tab: string) => ['aliases', 'testing', 'all-aliases'].includes(tab));
      if (validTabs.length > 0) {
        return validTabs;
      }
    }
    return ['aliases', 'testing', 'all-aliases'];
  });
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [allAliases, setAllAliases] = useState<Alias[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [isAddingAlias, setIsAddingAlias] = useState(false);
  const [selectedAliasProductType, setSelectedAliasProductType] = useState<string>('');

  const [expandedChecklistItem, setExpandedChecklistItem] = useState<string | null>(null);
  const [itemTestResults, setItemTestResults] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (selectedCompany) {
      fetchProductTypes();
      fetchAllAliases();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedTypeId) {
      fetchChecklistItems(selectedTypeId);
      fetchTestResultOptions(selectedTypeId);
      fetchAliases(selectedTypeId);
    }
  }, [selectedTypeId]);

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('sort_order');

      if (error) throw error;
      setProductTypes(data || []);
      if (data && data.length > 0 && !selectedTypeId) {
        setSelectedTypeId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching product types:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklistItems = async (typeId: string) => {
    try {
      const { data, error } = await supabase
        .from('testing_checklist_templates')
        .select('*')
        .eq('product_type_id', typeId)
        .order('sort_order');

      if (error) throw error;
      setChecklistItems(data || []);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
    }
  };

  const fetchTestResultOptions = async (typeId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_result_options')
        .select('*')
        .eq('product_type_id', typeId)
        .order('sort_order');

      if (error) throw error;
      setTestResultOptions(data || []);
    } catch (error) {
      console.error('Error fetching test result options:', error);
    }
  };

  const fetchAliases = async (typeId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_type_aliases')
        .select('*')
        .eq('product_type_id', typeId)
        .order('alias');

      if (error) throw error;
      setAliases(data || []);
    } catch (error) {
      console.error('Error fetching aliases:', error);
    }
  };

  const fetchAllAliases = async () => {
    try {
      const { data, error } = await supabase
        .from('product_type_aliases')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('alias');

      if (error) throw error;
      setAllAliases(data || []);
    } catch (error) {
      console.error('Error fetching all aliases:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingType) {
        const { error } = await supabase
          .from('product_types')
          .update({
            name: formData.name,
            description: formData.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_types')
          .insert({
            company_id: selectedCompany?.id,
            name: formData.name,
            description: formData.description,
          });

        if (error) throw error;
      }

      await fetchProductTypes();
      setShowModal(false);
      setFormData({ name: '', description: '' });
      setEditingType(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete all associated checklist items and test result options.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProductTypes();
      if (selectedTypeId === id) {
        setSelectedTypeId(null);
      }
    } catch (error: any) {
      alert('Error deleting product type: ' + error.message);
    }
  };

  const addChecklistItem = async () => {
    if (!newChecklistItem.trim() || !selectedTypeId) return;

    try {
      const { error } = await supabase
        .from('testing_checklist_templates')
        .insert({
          product_type_id: selectedTypeId,
          item_name: newChecklistItem,
          sort_order: checklistItems.length,
        });

      if (error) throw error;
      setNewChecklistItem('');
      await fetchChecklistItems(selectedTypeId);
    } catch (error: any) {
      alert('Error adding checklist item: ' + error.message);
    }
  };

  const deleteChecklistItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('testing_checklist_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchChecklistItems(selectedTypeId!);
    } catch (error: any) {
      alert('Error deleting checklist item: ' + error.message);
    }
  };


  const handleChecklistDragStart = (index: number) => {
    setDraggedChecklistIndex(index);
  };

  const handleChecklistDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleChecklistDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedChecklistIndex === null || draggedChecklistIndex === dropIndex) {
      setDraggedChecklistIndex(null);
      return;
    }

    const newItems = [...checklistItems];
    const [draggedItem] = newItems.splice(draggedChecklistIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      const promises = updates.map(update =>
        supabase
          .from('testing_checklist_templates')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      );
      await Promise.all(promises);

      setDraggedChecklistIndex(null);
      await fetchChecklistItems(selectedTypeId!);
    } catch (error: any) {
      alert('Error reordering checklist item: ' + error.message);
    }
  };


  const startEditingChecklist = (item: ChecklistItem) => {
    setEditingChecklistId(item.id);
    setEditingChecklistText(item.item_name);
  };

  const saveChecklistEdit = async () => {
    if (!editingChecklistId || !editingChecklistText.trim()) return;

    try {
      const { error } = await supabase
        .from('testing_checklist_templates')
        .update({ item_name: editingChecklistText })
        .eq('id', editingChecklistId);

      if (error) throw error;
      setEditingChecklistId(null);
      setEditingChecklistText('');
      await fetchChecklistItems(selectedTypeId!);
    } catch (error: any) {
      alert('Error updating checklist item: ' + error.message);
    }
  };

  const cancelChecklistEdit = () => {
    setEditingChecklistId(null);
    setEditingChecklistText('');
  };



  const fetchItemTestResults = async (checklistItemId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_result_options')
        .select('*')
        .eq('checklist_template_id', checklistItemId)
        .order('sort_order');

      if (error) throw error;
      setItemTestResults(prev => ({ ...prev, [checklistItemId]: data || [] }));
    } catch (error: any) {
      console.error('Error fetching item test results:', error);
    }
  };

  const toggleChecklistItemExpansion = async (itemId: string) => {
    if (expandedChecklistItem === itemId) {
      setExpandedChecklistItem(null);
    } else {
      setExpandedChecklistItem(itemId);
      await fetchItemTestResults(itemId);
    }
  };

  const addTestResultToItem = async (checklistItemId: string, resultData: { name: string; color: string; result_type: string; refurb_cost_amount?: number }) => {
    try {
      const currentResults = itemTestResults[checklistItemId] || [];
      const { error } = await supabase
        .from('test_result_options')
        .insert({
          checklist_template_id: checklistItemId,
          name: resultData.name,
          color: resultData.color,
          result_type: resultData.result_type,
          sort_order: currentResults.length,
          refurb_cost_amount: resultData.refurb_cost_amount || null,
        });

      if (error) throw error;
      showToast('Test result added', 'success');
      await fetchItemTestResults(checklistItemId);
    } catch (error: any) {
      showToast('Error adding test result: ' + error.message, 'error');
    }
  };

  const deleteTestResultFromItem = async (resultId: string, checklistItemId: string) => {
    if (!confirm('Delete this test result?')) return;

    try {
      const { error } = await supabase
        .from('test_result_options')
        .delete()
        .eq('id', resultId);

      if (error) throw error;
      showToast('Test result deleted', 'success');
      await fetchItemTestResults(checklistItemId);
    } catch (error: any) {
      showToast('Error deleting test result: ' + error.message, 'error');
    }
  };

  const updateTestResultInItem = async (resultId: string, checklistItemId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('test_result_options')
        .update(updates)
        .eq('id', resultId);

      if (error) throw error;
      showToast('Test result updated', 'success');
      await fetchItemTestResults(checklistItemId);
    } catch (error: any) {
      showToast('Error updating test result: ' + error.message, 'error');
    }
  };

  const handleAddAlias = async () => {
    if (!selectedCompany || !selectedTypeId || !newAlias.trim()) {
      showToast('Please enter an alias', 'error');
      return;
    }

    setIsAddingAlias(true);
    try {
      const { error } = await supabase
        .from('product_type_aliases')
        .insert({
          company_id: selectedCompany.id,
          product_type_id: selectedTypeId,
          alias: newAlias.trim()
        });

      if (error) {
        if (error.code === '23505') {
          showToast('This alias already exists', 'error');
        } else {
          throw error;
        }
        return;
      }

      showToast('Alias added successfully', 'success');
      setNewAlias('');
      await fetchAliases(selectedTypeId);
      await fetchAllAliases();
    } catch (error: any) {
      showToast(error.message || 'Error adding alias', 'error');
    } finally {
      setIsAddingAlias(false);
    }
  };

  const handleDeleteAlias = async (aliasId: string) => {
    if (!confirm('Are you sure you want to delete this alias?')) return;

    try {
      const { error } = await supabase
        .from('product_type_aliases')
        .delete()
        .eq('id', aliasId);

      if (error) throw error;

      showToast('Alias deleted successfully', 'success');
      await fetchAliases(selectedTypeId!);
      await fetchAllAliases();
    } catch (error: any) {
      showToast(error.message || 'Error deleting alias', 'error');
    }
  };

  const handleAddAliasGlobal = async () => {
    if (!selectedCompany || !selectedAliasProductType || !newAlias.trim()) {
      showToast('Please select a product type and enter an alias', 'error');
      return;
    }

    setIsAddingAlias(true);
    try {
      const { error } = await supabase
        .from('product_type_aliases')
        .insert({
          company_id: selectedCompany.id,
          product_type_id: selectedAliasProductType,
          alias: newAlias.trim()
        });

      if (error) {
        if (error.code === '23505') {
          showToast('This alias already exists', 'error');
        } else {
          throw error;
        }
        return;
      }

      showToast('Alias added successfully', 'success');
      setNewAlias('');
      setSelectedAliasProductType('');
      await fetchAllAliases();
      if (selectedTypeId) {
        await fetchAliases(selectedTypeId);
      }
    } catch (error: any) {
      showToast(error.message || 'Error adding alias', 'error');
    } finally {
      setIsAddingAlias(false);
    }
  };

  const handleDeleteAliasGlobal = async (aliasId: string) => {
    if (!confirm('Are you sure you want to delete this alias?')) return;

    try {
      const { error } = await supabase
        .from('product_type_aliases')
        .delete()
        .eq('id', aliasId);

      if (error) throw error;

      showToast('Alias deleted successfully', 'success');
      await fetchAllAliases();
      if (selectedTypeId) {
        await fetchAliases(selectedTypeId);
      }
    } catch (error: any) {
      showToast(error.message || 'Error deleting alias', 'error');
    }
  };

  const handleProductTypeDragStart = (index: number) => {
    setDraggedProductTypeIndex(index);
  };

  const handleProductTypeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedProductTypeIndex === null || draggedProductTypeIndex === index) return;

    const newTypes = [...productTypes];
    const [draggedType] = newTypes.splice(draggedProductTypeIndex, 1);
    newTypes.splice(index, 0, draggedType);

    setProductTypes(newTypes);
    setDraggedProductTypeIndex(index);
  };

  const handleProductTypeDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedProductTypeIndex === null) {
      return;
    }

    try {
      const updates = productTypes.map((type, index) => ({
        id: type.id,
        sort_order: index,
      }));

      const promises = updates.map(update =>
        supabase
          .from('product_types')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      );
      await Promise.all(promises);

      setDraggedProductTypeIndex(null);
    } catch (error: any) {
      alert('Error reordering product types: ' + error.message);
      await fetchProductTypes();
    }
  };

  const openModal = (type?: ProductType) => {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name, description: type.description || '' });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
    setError('');
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Types</h1>
          <p className="text-gray-600">Manage product types, testing checklists, and test result options</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Product Type
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Types</h2>
              <div className="space-y-2">
                {productTypes.map((type, index) => (
                  <div
                    key={type.id}
                    draggable
                    onDragStart={() => handleProductTypeDragStart(index)}
                    onDragOver={(e) => handleProductTypeDragOver(e, index)}
                    onDrop={(e) => handleProductTypeDrop(e, index)}
                    className={`p-3 rounded-lg border transition cursor-move ${
                      draggedProductTypeIndex === index
                        ? 'bg-blue-100 border-blue-400 opacity-50'
                        : selectedTypeId === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTypeId(type.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-gray-400 hover:text-blue-600 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <h3 className="font-medium text-gray-900">{type.name}</h3>
                          </div>
                          {type.description && (
                            <p className="text-sm text-gray-600 mt-1 ml-6">{type.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(type);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(type.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {productTypes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No product types yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex gap-1 p-2">
                  {tabOrder.map((tabKey, index) => {
                    const tabInfo = {
                      aliases: { icon: Tag, label: 'Aliases', count: aliases.length },
                      testing: { icon: List, label: 'Testing', count: checklistItems.length },
                      'all-aliases': { icon: Database, label: 'All Aliases', count: allAliases.length },
                    }[tabKey];

                    if (!tabInfo) return null;

                    if ((tabKey === 'aliases' || tabKey === 'testing') && !selectedTypeId) return null;

                    const Icon = tabInfo.icon;
                    return (
                      <button
                        key={tabKey}
                        draggable
                        onDragStart={() => setDraggedTabIndex(index)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedTabIndex === null || draggedTabIndex === index) return;

                          const newOrder = [...tabOrder];
                          const [draggedTab] = newOrder.splice(draggedTabIndex, 1);
                          newOrder.splice(index, 0, draggedTab);

                          setTabOrder(newOrder);
                          setDraggedTabIndex(index);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          localStorage.setItem('productTypesTabOrder', JSON.stringify(tabOrder));
                          setDraggedTabIndex(null);
                        }}
                        onClick={() => setActiveTab(tabKey)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition cursor-move ${
                          draggedTabIndex === index
                            ? 'opacity-50'
                            : activeTab === tabKey
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <GripVertical className="w-3 h-3" />
                        <Icon className="w-4 h-4" />
                        {tabInfo.label} ({tabInfo.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'aliases' && selectedTypeId && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Tag className="w-5 h-5 text-blue-600" />
                          <h2 className="text-lg font-semibold text-gray-900">Product Type Aliases</h2>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                          Add alternative names for this product type to make imports smarter. For example, map "Notebook" and "Portable PC" to "Laptop".
                        </p>

                        <div className="flex gap-2 mb-6">
                          <input
                            type="text"
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                            placeholder="Enter alias (e.g., Notebooks, Portable PC)"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={handleAddAlias}
                            disabled={isAddingAlias || !newAlias.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
                          >
                            <Plus className="w-4 h-4" />
                            Add Alias
                          </button>
                        </div>

                        {aliases.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium mb-1">No aliases yet</p>
                            <p className="text-sm text-gray-500">Add alternative names to help identify this product type during imports</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {aliases.map(alias => (
                              <div
                                key={alias.id}
                                className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                              >
                                <span className="text-sm font-medium text-gray-700">{alias.alias}</span>
                                <button
                                  onClick={() => handleDeleteAlias(alias.id)}
                                  className="text-gray-400 hover:text-red-600 transition"
                                  title="Delete alias"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'all-aliases' && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Database className="w-5 h-5 text-blue-600" />
                          <h2 className="text-lg font-semibold text-gray-900">All Product Type Aliases</h2>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                          View and manage all aliases across all product types. Perfect for import preparation and quarterly audits.
                        </p>

                        <div className="flex gap-2 mb-6">
                          <select
                            value={selectedAliasProductType}
                            onChange={(e) => setSelectedAliasProductType(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Product Type...</option>
                            {productTypes.map(pt => (
                              <option key={pt.id} value={pt.id}>{pt.name}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && selectedAliasProductType) {
                                handleAddAliasGlobal();
                              }
                            }}
                            placeholder="Enter alias (e.g., Notebooks, Portable PC)"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />

                          <button
                            onClick={handleAddAliasGlobal}
                            disabled={isAddingAlias || !selectedAliasProductType || !newAlias.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
                          >
                            <Plus className="w-4 h-4" />
                            Add Alias
                          </button>
                        </div>

                        {productTypes.filter(pt => allAliases.some(a => a.product_type_id === pt.id)).length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium mb-1">No aliases yet</p>
                            <p className="text-sm text-gray-500">Add alternative names to help identify product types during imports</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {productTypes
                              .filter(pt => allAliases.some(a => a.product_type_id === pt.id))
                              .map(pt => {
                                const ptAliases = allAliases.filter(a => a.product_type_id === pt.id);
                                return (
                                  <div key={pt.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-blue-600" />
                                        {pt.name}
                                      </h3>
                                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-300">
                                        {ptAliases.length} {ptAliases.length === 1 ? 'alias' : 'aliases'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {ptAliases.map(alias => (
                                        <div
                                          key={alias.id}
                                          className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                                        >
                                          <span className="text-sm font-medium text-gray-700">{alias.alias}</span>
                                          <button
                                            onClick={() => handleDeleteAliasGlobal(alias.id)}
                                            className="text-gray-400 hover:text-red-600 transition"
                                            title="Delete alias"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}

                {activeTab === 'testing' && selectedTypeId && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <List className="w-5 h-5 text-blue-600" />
                          <h2 className="text-lg font-semibold text-gray-900">Testing Checklist</h2>
                        </div>
                  <div className="space-y-3">
                    {checklistItems.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div
                          draggable
                          onDragStart={() => handleChecklistDragStart(index)}
                          onDragOver={(e) => handleChecklistDragOver(e, index)}
                          onDrop={(e) => handleChecklistDrop(e, index)}
                          className={`flex items-center gap-2 p-3 transition ${
                            draggedChecklistIndex === index
                              ? 'bg-blue-100 opacity-50'
                              : 'bg-gray-50 hover:bg-gray-100'
                          } cursor-move`}
                        >
                          <div className="text-gray-400 hover:text-blue-600 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          {editingChecklistId === item.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingChecklistText}
                                onChange={(e) => setEditingChecklistText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && saveChecklistEdit()}
                                className="flex-1 px-3 py-1 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                              <button
                                onClick={saveChecklistEdit}
                                className="p-1 text-green-600 hover:text-green-700 transition"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelChecklistEdit}
                                className="p-1 text-gray-400 hover:text-gray-600 transition"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleChecklistItemExpansion(item.id)}
                                className="p-1 text-gray-600 hover:text-blue-600 transition"
                              >
                                {expandedChecklistItem === item.id ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1">
                                <span className="text-gray-900 font-medium">{item.item_name}</span>
                                {itemTestResults[item.id] && itemTestResults[item.id].length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {itemTestResults[item.id].slice(0, 5).map(result => (
                                      <div
                                        key={result.id}
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: result.color }}
                                        title={result.name}
                                      />
                                    ))}
                                    {itemTestResults[item.id].length > 5 && (
                                      <span className="text-xs text-gray-500">+{itemTestResults[item.id].length - 5}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEditingChecklist(item)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteChecklistItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {expandedChecklistItem === item.id && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            <div className="mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Test Result Options</h4>
                              <p className="text-xs text-gray-500">Define possible results and optional cost triggers</p>
                            </div>

                            <div className="space-y-2 mb-4">
                              {(itemTestResults[item.id] || []).map(result => (
                                <div key={result.id}>
                                  {editingTestResultId === result.id ? (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                                      <input
                                        type="text"
                                        defaultValue={result.name}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                        id={`edit-result-name-${result.id}`}
                                      />
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <label className="block text-xs text-gray-600 mb-1">Color</label>
                                          <div className="flex gap-1">
                                            {[
                                              '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
                                              '#EC4899', '#06B6D4', '#6B7280', '#14B8A6', '#F97316',
                                            ].map(color => (
                                              <button
                                                key={color}
                                                type="button"
                                                onClick={() => {
                                                  const input = document.getElementById(`edit-result-color-${result.id}`) as HTMLInputElement;
                                                  if (input) input.value = color;
                                                }}
                                                className="w-6 h-6 rounded border hover:border-gray-500"
                                                style={{ backgroundColor: color }}
                                              />
                                            ))}
                                          </div>
                                          <input type="hidden" defaultValue={result.color} id={`edit-result-color-${result.id}`} />
                                        </div>
                                        <div className="w-32">
                                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                                          <select
                                            defaultValue={result.result_type}
                                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                                            id={`edit-result-type-${result.id}`}
                                          >
                                            <option value="pass">Pass</option>
                                            <option value="fail">Fail</option>
                                            <option value="neutral">Neutral</option>
                                          </select>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                          <DollarSign className="w-3 h-3 inline" /> Auto-add Cost (optional)
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          defaultValue={result.refurb_cost_amount || ''}
                                          placeholder="0.00"
                                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                          id={`edit-result-cost-${result.id}`}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            const nameInput = document.getElementById(`edit-result-name-${result.id}`) as HTMLInputElement;
                                            const colorInput = document.getElementById(`edit-result-color-${result.id}`) as HTMLInputElement;
                                            const typeSelect = document.getElementById(`edit-result-type-${result.id}`) as HTMLSelectElement;
                                            const costInput = document.getElementById(`edit-result-cost-${result.id}`) as HTMLInputElement;

                                            await updateTestResultInItem(result.id, item.id, {
                                              name: nameInput.value,
                                              color: colorInput.value,
                                              result_type: typeSelect.value,
                                              refurb_cost_amount: costInput.value ? parseFloat(costInput.value) : null,
                                            });
                                            setEditingTestResultId(null);
                                          }}
                                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition flex items-center justify-center gap-1"
                                        >
                                          <Save className="w-3 h-3" />
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingTestResultId(null)}
                                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition flex items-center justify-center gap-1"
                                        >
                                          <X className="w-3 h-3" />
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                      <div
                                        className="w-6 h-6 rounded flex-shrink-0"
                                        style={{ backgroundColor: result.color }}
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{result.name}</div>
                                        {result.refurb_cost_amount && (
                                          <div className="text-xs text-green-600 font-medium mt-0.5">
                                            Auto-add cost: ${parseFloat(result.refurb_cost_amount).toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded border">
                                        {result.result_type}
                                      </span>
                                      <button
                                        onClick={() => setEditingTestResultId(result.id)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                                        title="Edit"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteTestResultFromItem(result.id, item.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 transition"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {(itemTestResults[item.id] || []).length === 0 && (
                                <div className="text-center py-4 text-sm text-gray-500 italic">
                                  No test results configured yet
                                </div>
                              )}
                            </div>

                            <div className="border-t pt-3">
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  placeholder="Result name (e.g., Excellent, Cracked, Failed)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                  id={`result-name-${item.id}`}
                                />

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                                  <div className="flex gap-2">
                                    {[
                                      { color: '#10B981', label: 'Green' },
                                      { color: '#3B82F6', label: 'Blue' },
                                      { color: '#F59E0B', label: 'Orange' },
                                      { color: '#EF4444', label: 'Red' },
                                      { color: '#8B5CF6', label: 'Purple' },
                                      { color: '#EC4899', label: 'Pink' },
                                      { color: '#06B6D4', label: 'Cyan' },
                                      { color: '#6B7280', label: 'Gray' },
                                      { color: '#14B8A6', label: 'Teal' },
                                      { color: '#F97316', label: 'Amber' },
                                    ].map(({ color, label }) => (
                                      <button
                                        key={color}
                                        type="button"
                                        onClick={() => {
                                          const colorInput = document.getElementById(`result-color-${item.id}`) as HTMLInputElement;
                                          if (colorInput) colorInput.value = color;
                                        }}
                                        className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition"
                                        style={{ backgroundColor: color }}
                                        title={label}
                                      />
                                    ))}
                                  </div>
                                  <input
                                    type="hidden"
                                    defaultValue="#3B82F6"
                                    id={`result-color-${item.id}`}
                                  />
                                </div>

                                <select
                                  defaultValue="neutral"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                  id={`result-type-${item.id}`}
                                >
                                  <option value="pass">Pass</option>
                                  <option value="fail">Fail</option>
                                  <option value="neutral">Neutral</option>
                                </select>

                                <div className="pt-2 border-t">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    <DollarSign className="w-3 h-3 inline mr-1" />
                                    Auto-add Refurb Cost (optional)
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="Enter cost amount (e.g., 45.00)"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                    id={`cost-amount-${item.id}`}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    When this result is selected, technician will be prompted to add this cost
                                  </p>
                                </div>

                              </div>

                              <button
                                onClick={async () => {
                                  const nameInput = document.getElementById(`result-name-${item.id}`) as HTMLInputElement;
                                  const colorInput = document.getElementById(`result-color-${item.id}`) as HTMLInputElement;
                                  const typeSelect = document.getElementById(`result-type-${item.id}`) as HTMLSelectElement;
                                  const costAmountInput = document.getElementById(`cost-amount-${item.id}`) as HTMLInputElement;

                                  if (!nameInput?.value.trim()) {
                                    showToast('Please enter a result name', 'error');
                                    return;
                                  }

                                  const resultName = nameInput.value.trim();
                                  const costAmount = costAmountInput?.value ? parseFloat(costAmountInput.value) : undefined;

                                  await addTestResultToItem(item.id, {
                                    name: resultName,
                                    color: colorInput.value,
                                    result_type: typeSelect.value as 'pass' | 'fail' | 'neutral',
                                    refurb_cost_amount: costAmount,
                                  });

                                  nameInput.value = '';
                                  colorInput.value = '#3B82F6';
                                  typeSelect.value = 'neutral';
                                  if (costAmountInput) costAmountInput.value = '';
                                }}
                                className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Test Result
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item (e.g., Screen, Battery, Ports)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                    />
                    <button
                      onClick={addChecklistItem}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

                {!selectedTypeId && activeTab !== 'all-aliases' && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4" />
                    <p>Select a product type to manage its testing checklist and aliases</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingType ? 'Edit Product Type' : 'Add Product Type'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Laptops, Desktops, Phones"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingType(null);
                    setFormData({ name: '', description: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
