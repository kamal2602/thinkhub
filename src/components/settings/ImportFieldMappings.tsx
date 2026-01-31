import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { FirstTimeSetupWizard } from './FirstTimeSetupWizard';
import { validateCustomFieldName, suggestCanonicalField } from '../../lib/canonicalFields';

interface ImportField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: 'direct' | 'specification';
  is_active: boolean;
  sort_order: number;
  auto_map_keywords: string[];
}

const DEFAULT_FIELDS: ImportField[] = [
  { field_name: 'product_type', field_label: 'Product Type / Category', field_type: 'direct', is_active: true, sort_order: 1, auto_map_keywords: ['product type', 'product category', 'item type', 'device type', 'category'] },
  { field_name: 'brand', field_label: 'Brand', field_type: 'direct', is_active: true, sort_order: 2, auto_map_keywords: ['brand', 'manufacturer', 'mfr', 'make', 'vendor name', 'oem'] },
  { field_name: 'model', field_label: 'Model', field_type: 'direct', is_active: true, sort_order: 3, auto_map_keywords: ['model', 'model number', 'part number', 'part#', 'partnumber', 'product name', 'item'] },
  { field_name: 'serial_number', field_label: 'Serial Number', field_type: 'direct', is_active: true, sort_order: 4, auto_map_keywords: ['serial number', 'serial#', 'service tag', 's/n', 'sn', 'serial'] },
  { field_name: 'quantity_ordered', field_label: 'Quantity', field_type: 'direct', is_active: true, sort_order: 5, auto_map_keywords: ['quantity', 'qty', 'available', 'avail', 'stock', 'count', 'units'] },
  { field_name: 'unit_cost', field_label: 'Unit Cost / Price', field_type: 'direct', is_active: true, sort_order: 6, auto_map_keywords: ['unit price', 'unit cost', 'per unit', 'price', 'cost', 'each', 'amount', 'value'] },
  { field_name: 'description', field_label: 'Description', field_type: 'direct', is_active: true, sort_order: 7, auto_map_keywords: ['description', 'item description', 'product description', 'desc', 'details'] },
  { field_name: 'expected_condition', field_label: 'Grade / Condition', field_type: 'direct', is_active: true, sort_order: 8, auto_map_keywords: ['cosmetic grade', 'grade', 'condition', 'cosmetic', 'quality', 'rating'] },
  { field_name: 'supplier_sku', field_label: 'Supplier SKU', field_type: 'direct', is_active: true, sort_order: 9, auto_map_keywords: ['supplier sku', 'vendor sku', 'item number', 'item#', 'sku'] },
  { field_name: 'specifications.cpu', field_label: 'CPU / Processor', field_type: 'specification', is_active: true, sort_order: 10, auto_map_keywords: ['processor type', 'processor model', 'cpu type', 'cpu model', 'processor', 'cpu', 'proc', 'chip'] },
  { field_name: 'specifications.ram', field_label: 'RAM / Memory', field_type: 'specification', is_active: true, sort_order: 11, auto_map_keywords: ['memory type', 'ram type', 'memory size', 'ram size', 'ram', 'memory', 'mem'] },
  { field_name: 'specifications.storage', field_label: 'Storage / HDD / SSD', field_type: 'specification', is_active: true, sort_order: 12, auto_map_keywords: ['storage type', 'storage capacity', 'hard drive', 'storage', 'hdd', 'ssd', 'drive', 'disk'] },
  { field_name: 'specifications.screen_size', field_label: 'Screen Size', field_type: 'specification', is_active: true, sort_order: 13, auto_map_keywords: ['screen size', 'display size', 'screen', 'display', 'lcd', 'monitor'] },
  { field_name: 'specifications.graphics', field_label: 'Graphics', field_type: 'specification', is_active: true, sort_order: 14, auto_map_keywords: ['graphics card', 'video card', 'graphics', 'gpu', 'video'] },
  { field_name: 'specifications.os', field_label: 'Operating System', field_type: 'specification', is_active: true, sort_order: 15, auto_map_keywords: ['operating system', 'os', 'software', 'windows', 'macos'] },
  { field_name: 'specifications.functional_notes', field_label: 'Functional Status', field_type: 'specification', is_active: true, sort_order: 16, auto_map_keywords: ['functional status', 'functional', 'function', 'test', 'working', 'status'] },
  { field_name: 'specifications.cosmetic_notes', field_label: 'Cosmetic Notes', field_type: 'specification', is_active: true, sort_order: 17, auto_map_keywords: ['cosmetic notes', 'appearance', 'physical', 'cosmetic'] },
  { field_name: 'notes', field_label: 'Notes / Comments', field_type: 'direct', is_active: true, sort_order: 18, auto_map_keywords: ['notes', 'comments', 'remarks', 'memo', 'issue', 'issues'] },
];

export function ImportFieldMappings() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [fields, setFields] = useState<ImportField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<ImportField | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<Map<number, { error?: string; warning?: string }>>(new Map());

  useEffect(() => {
    if (selectedCompany) {
      loadFields();
    }
  }, [selectedCompany]);

  const loadFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('import_field_mappings')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('sort_order');

    if (error) {
      console.error('Error loading fields:', error);
    }

    if (!data || data.length === 0) {
      setShowFirstTimeSetup(true);
    } else {
      setFields(data);
    }
    setLoading(false);
  };

  const handleSetupComplete = async () => {
    setShowFirstTimeSetup(false);
    await loadFields();
  };

  const handleSetupSkip = () => {
    setShowFirstTimeSetup(false);
    setFields([]);
  };

  const saveFields = async () => {
    setSaving(true);
    try {
      // Check for duplicate field names
      const fieldNames = new Set<string>();
      const duplicates: string[] = [];

      for (const field of fields) {
        if (!field.field_name) continue;
        if (fieldNames.has(field.field_name)) {
          duplicates.push(field.field_name);
        }
        fieldNames.add(field.field_name);
      }

      if (duplicates.length > 0) {
        showToast(`Duplicate field names found: ${duplicates.join(', ')}. Each field name must be unique.`, 'error');
        setSaving(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('import_field_mappings')
        .delete()
        .eq('company_id', selectedCompany?.id);

      if (deleteError) throw deleteError;

      const fieldsToInsert = fields.map(field => ({
        company_id: selectedCompany?.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        is_active: field.is_active,
        sort_order: field.sort_order,
        auto_map_keywords: field.auto_map_keywords,
      }));

      const { error: insertError } = await supabase
        .from('import_field_mappings')
        .insert(fieldsToInsert);

      if (insertError) throw insertError;

      showToast('Import field mappings saved successfully', 'success');
      await loadFields();
    } catch (error: any) {
      showToast('Failed to save: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const newField: ImportField = {
      field_name: '',
      field_label: '',
      field_type: 'direct',
      is_active: true,
      sort_order: fields.length + 1,
      auto_map_keywords: [],
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<ImportField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);

    if (updates.field_name) {
      const validation = validateCustomFieldName(updates.field_name);
      const newValidation = new Map(fieldValidation);
      if (!validation.valid || validation.warning) {
        newValidation.set(index, {
          error: validation.error,
          warning: validation.warning
        });
      } else {
        newValidation.delete(index);
      }
      setFieldValidation(newValidation);
    }
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const addKeyword = (index: number) => {
    if (!newKeyword.trim()) return;

    const updated = [...fields];
    updated[index].auto_map_keywords = [
      ...updated[index].auto_map_keywords,
      newKeyword.trim().toLowerCase(),
    ];
    setFields(updated);
    setNewKeyword('');
  };

  const removeKeyword = (fieldIndex: number, keywordIndex: number) => {
    const updated = [...fields];
    updated[fieldIndex].auto_map_keywords = updated[fieldIndex].auto_map_keywords.filter(
      (_, i) => i !== keywordIndex
    );
    setFields(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newFields = [...fields];
    const [draggedField] = newFields.splice(draggedIndex, 1);
    newFields.splice(dropIndex, 0, draggedField);

    newFields.forEach((field, index) => {
      field.sort_order = index + 1;
    });

    setFields(newFields);
    setDraggedIndex(null);
  };

  const resetToDefaults = () => {
    if (confirm('Reset all field mappings to defaults? This will discard any custom changes.')) {
      setFields(DEFAULT_FIELDS);
      showToast('Reset to default fields', 'success');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showFirstTimeSetup) {
    return (
      <div className="py-12">
        <FirstTimeSetupWizard
          onComplete={handleSetupComplete}
          onSkip={handleSetupSkip}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Import Field Mappings</h2>
          <p className="text-gray-600 mt-1">
            Configure available fields for PO import mapping and auto-detection keywords
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveFields}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={addField}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Custom Field
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {fields.map((field, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`p-4 space-y-3 transition ${
                draggedIndex === index
                  ? 'bg-blue-100 border-2 border-blue-400 opacity-50'
                  : 'border-2 border-transparent hover:border-gray-300'
              } cursor-move`}
            >
              <div className="flex gap-3 items-start">
                <div className="pt-6 text-gray-400 hover:text-blue-600 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Field Name (Database)
                    </label>
                    <input
                      type="text"
                      value={field.field_name}
                      onChange={(e) => updateField(index, { field_name: e.target.value })}
                      placeholder="e.g., brand or specifications.my_field"
                      className={`w-full px-3 py-2 text-sm border rounded-lg ${
                        fieldValidation.get(index)?.error
                          ? 'border-red-300 bg-red-50'
                          : fieldValidation.get(index)?.warning
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {fieldValidation.get(index)?.error && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {fieldValidation.get(index)?.error}
                      </p>
                    )}
                    {fieldValidation.get(index)?.warning && (
                      <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {fieldValidation.get(index)?.warning}
                      </p>
                    )}
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Display Label
                    </label>
                    <input
                      type="text"
                      value={field.field_label}
                      onChange={(e) => updateField(index, { field_label: e.target.value })}
                      placeholder="e.g., Brand"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={field.field_type}
                      onChange={(e) => updateField(index, { field_type: e.target.value as 'direct' | 'specification' })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="direct">Direct</option>
                      <option value="specification">Specification</option>
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.is_active}
                          onChange={(e) => updateField(index, { is_active: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => deleteField(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Auto-Detection Keywords (comma separated values that should map to this field)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {field.auto_map_keywords.map((keyword, keywordIndex) => (
                    <span
                      key={keywordIndex}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(index, keywordIndex)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingField === field ? newKeyword : ''}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onFocus={() => setEditingField(field)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addKeyword(index);
                      }
                    }}
                    placeholder="Add keyword..."
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => addKeyword(index)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How It Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Field Name:</strong> The database column name (e.g., "brand", "specifications.cpu")</li>
          <li>• <strong>Display Label:</strong> What users see in the dropdown (e.g., "Brand", "CPU / Processor")</li>
          <li>• <strong>Type:</strong> "Direct" for main columns, "Specification" for nested spec fields</li>
          <li>• <strong>Keywords:</strong> Supplier column headers that auto-map to this field (case-insensitive)</li>
          <li>• <strong>Active:</strong> Only active fields appear in the import mapping dropdown</li>
          <li>• <strong>Drag & Drop:</strong> Click and hold the grip icon (⋮⋮) to drag fields and reorder them</li>
        </ul>
      </div>
    </div>
  );
}
