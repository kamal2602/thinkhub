import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Upload, Download, Settings, Brain, MapPin, Sparkles, Lock, Edit2, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { CANONICAL_FIELDS, CORE_FIELDS, SPEC_FIELDS, type CanonicalField } from '../../lib/canonicalFields';

interface ImportIntelligenceRule {
  id?: string;
  rule_type: 'column_mapping' | 'value_lookup' | 'component_pattern';
  applies_to_field: string;
  input_keywords: string[];
  output_value?: string;
  output_reference_id?: string;
  output_reference_table?: string;
  parse_with_function?: string;
  priority: number;
  is_active: boolean;
  metadata?: any;
  referenced_name?: string;
}

export function ImportIntelligence() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [rules, setRules] = useState<ImportIntelligenceRule[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'column_mapping' | 'value_lookup' | 'component_pattern'>('column_mapping');
  const [editingRule, setEditingRule] = useState<ImportIntelligenceRule | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CanonicalField | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      loadRules();
      loadProductTypes();
    }
  }, [selectedCompany]);

  const loadRules = async () => {
    if (!selectedCompany?.id) return;

    const { data, error } = await supabase
      .from('import_intelligence_view')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error loading rules:', error);
      showToast('Failed to load import intelligence rules', 'error');
      return;
    }

    setRules(data || []);
  };

  const loadProductTypes = async () => {
    if (!selectedCompany?.id) return;

    const { data } = await supabase
      .from('product_types')
      .select('id, name')
      .eq('company_id', selectedCompany.id)
      .order('name');

    setProductTypes(data || []);
  };

  const handleSaveRule = async () => {
    if (!editingRule || !selectedCompany?.id) return;

    setLoading(true);
    try {
      const ruleData = {
        company_id: selectedCompany.id,
        rule_type: editingRule.rule_type,
        applies_to_field: editingRule.applies_to_field,
        input_keywords: editingRule.input_keywords,
        output_value: editingRule.output_value,
        output_reference_id: editingRule.output_reference_id,
        output_reference_table: editingRule.output_reference_table,
        parse_with_function: editingRule.parse_with_function,
        priority: editingRule.priority,
        is_active: editingRule.is_active,
        metadata: editingRule.metadata || {},
      };

      if (editingRule.id) {
        const { error } = await supabase
          .from('import_intelligence_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        showToast('Rule updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('import_intelligence_rules')
          .insert(ruleData);

        if (error) throw error;
        showToast('Rule created successfully', 'success');
      }

      setEditingRule(null);
      loadRules();
    } catch (error: any) {
      console.error('Error saving rule:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('import_intelligence_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Rule deleted successfully', 'success');
      loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportRules = async () => {
    const json = JSON.stringify(rules, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-intelligence-rules-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRules = rules.filter(rule => rule.rule_type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-600" />
            Import Intelligence
          </h2>
          <p className="text-slate-600 mt-1">
            Smart rules for column mapping, value normalization, and component parsing
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportRules}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Rules
          </button>
          <button
            onClick={() => setEditingRule({
              rule_type: activeTab,
              applies_to_field: '',
              input_keywords: [],
              priority: 50,
              is_active: true,
            })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('column_mapping')}
            className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'column_mapping'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Column Mapping ({rules.filter(r => r.rule_type === 'column_mapping').length})
          </button>
          <button
            onClick={() => setActiveTab('value_lookup')}
            className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'value_lookup'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Value Normalization ({rules.filter(r => r.rule_type === 'value_lookup').length})
          </button>
          <button
            onClick={() => setActiveTab('component_pattern')}
            className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'component_pattern'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Component Parsing ({rules.filter(r => r.rule_type === 'component_pattern').length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'column_mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Column mapping rules automatically detect which supplier columns map to your system fields.
                Add keywords that might appear in supplier column headers.
              </p>
              {filteredRules.map(rule => (
                <div key={rule.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{rule.output_value}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Keywords: {rule.input_keywords.join(', ')}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Priority: {rule.priority}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'value_lookup' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Value lookup rules normalize supplier values to your database records.
                Example: Map "Dell Laptop", "Laptops", "Notebook" to your "Laptop" product type.
              </p>
              {filteredRules.map(rule => (
                <div key={rule.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {rule.input_keywords.join(', ')} → {rule.referenced_name}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Field: {rule.applies_to_field}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Priority: {rule.priority}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'component_pattern' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Component parsing rules configure how to extract structured data from text.
                Example: Parse "2x8GB DDR4" into separate 8GB components.
              </p>
              {filteredRules.map(rule => (
                <div key={rule.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {rule.applies_to_field} → {rule.parse_with_function}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Keywords: {rule.input_keywords.join(', ')}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Priority: {rule.priority}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredRules.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No rules found. Create your first rule to get started.
            </div>
          )}
        </div>
      </div>

      {editingRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold">
                {editingRule.id ? 'Edit Rule' : 'New Rule'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {editingRule.rule_type === 'column_mapping' && !editingRule.id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-blue-900">
                      Quick Add System Field (Optional)
                    </label>
                  </div>
                  <select
                    value={selectedTemplate?.fieldName || ''}
                    onChange={(e) => {
                      const field = CANONICAL_FIELDS.find(f => f.fieldName === e.target.value);
                      if (field) {
                        setSelectedTemplate(field);
                        setEditingRule({
                          ...editingRule,
                          output_value: field.fieldName,
                          input_keywords: field.autoMapKeywords,
                          metadata: {
                            ...editingRule.metadata,
                            display_label: field.displayName,
                            description: field.description,
                            is_locked: field.fieldType === 'direct'
                          }
                        });
                      } else {
                        setSelectedTemplate(null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose a common field to auto-fill --</option>
                    <optgroup label="📋 REQUIRED FIELDS (System)">
                      {CORE_FIELDS.filter(f => f.required).map(field => (
                        <option key={field.fieldName} value={field.fieldName}>
                          {field.displayName} ({field.fieldName})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📦 OPTIONAL DIRECT FIELDS (System)">
                      {CORE_FIELDS.filter(f => !f.required).map(field => (
                        <option key={field.fieldName} value={field.fieldName}>
                          {field.displayName} ({field.fieldName})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="⚙️ HARDWARE SPECIFICATIONS (Customizable)">
                      {SPEC_FIELDS.map(field => (
                        <option key={field.fieldName} value={field.fieldName}>
                          {field.displayName} ({field.fieldName})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {selectedTemplate && (
                    <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                      <div className="text-sm text-slate-700">
                        <div className="font-medium mb-1">{selectedTemplate.displayName}</div>
                        <div className="text-xs text-slate-600 mb-2">{selectedTemplate.description}</div>
                        {selectedTemplate.fieldType === 'direct' ? (
                          <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
                            <Lock className="w-3 h-3" />
                            <span>System field - field name cannot be changed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                            <Edit2 className="w-3 h-3" />
                            <span>Specification - field name can be customized</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-sm text-slate-500 text-center">
                ─────────── or create custom field manually ───────────
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rule Type
                </label>
                <select
                  value={editingRule.rule_type}
                  onChange={(e) => setEditingRule({ ...editingRule, rule_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  disabled={!!editingRule.id}
                >
                  <option value="column_mapping">Column Mapping</option>
                  <option value="value_lookup">Value Lookup</option>
                  <option value="component_pattern">Component Pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Auto-Map Keywords (comma-separated)
                </label>
                <textarea
                  value={editingRule.input_keywords.join(', ')}
                  onChange={(e) => setEditingRule({
                    ...editingRule,
                    input_keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="e.g., serial, sn, s/n, SN#, serial no, service tag"
                />
                <p className="mt-1 text-xs text-slate-500">
                  These keywords help the system automatically detect which supplier columns map to this field.
                  Add any variations your suppliers might use.
                </p>
              </div>

              {editingRule.rule_type === 'column_mapping' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      System Field *
                      {editingRule.metadata?.is_locked && (
                        <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editingRule.output_value || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, output_value: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        editingRule.metadata?.is_locked
                          ? 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed'
                          : 'border-slate-300'
                      }`}
                      placeholder="e.g., brand, model, specifications.cpu"
                      disabled={editingRule.metadata?.is_locked}
                    />
                    {editingRule.metadata?.is_locked ? (
                      <p className="mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded flex items-start gap-2">
                        <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          This is a required system field. The field name cannot be changed as it matches database columns and code.
                          You can customize the keywords below to match your supplier's column names.
                        </span>
                      </p>
                    ) : (
                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <div className="p-2 bg-blue-50 rounded">
                          <strong>Format:</strong> Direct fields: <code className="bg-blue-100 px-1 rounded">brand</code>, <code className="bg-blue-100 px-1 rounded">model</code>
                          <br />
                          Custom specs: <code className="bg-blue-100 px-1 rounded">specifications.fieldname</code> (plural)
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Display Label
                    </label>
                    <input
                      type="text"
                      value={editingRule.metadata?.display_label || ''}
                      onChange={(e) => setEditingRule({
                        ...editingRule,
                        metadata: { ...editingRule.metadata, display_label: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="e.g., CPU / Processor, RAM / Memory"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      How this field will be displayed in Asset Details and other views
                    </p>
                  </div>
                </>
              )}

              {editingRule.rule_type === 'value_lookup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Applies to Field
                    </label>
                    <input
                      type="text"
                      value={editingRule.applies_to_field}
                      onChange={(e) => setEditingRule({ ...editingRule, applies_to_field: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="e.g., product_type"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Target Product Type
                    </label>
                    <select
                      value={editingRule.output_reference_id || ''}
                      onChange={(e) => setEditingRule({
                        ...editingRule,
                        output_reference_id: e.target.value,
                        output_reference_table: 'product_types'
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Select product type</option>
                      {productTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {editingRule.rule_type === 'component_pattern' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Applies to Field
                    </label>
                    <select
                      value={editingRule.applies_to_field}
                      onChange={(e) => setEditingRule({ ...editingRule, applies_to_field: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Select field</option>
                      <option value="specifications.ram">RAM</option>
                      <option value="specifications.storage">Storage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Parse Function
                    </label>
                    <select
                      value={editingRule.parse_with_function || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, parse_with_function: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Select function</option>
                      <option value="parseComponentPattern">parseComponentPattern</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priority (higher = matched first)
                </label>
                <input
                  type="number"
                  value={editingRule.priority}
                  onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingRule.is_active}
                  onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-slate-700">Active</label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
