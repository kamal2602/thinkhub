import { useState } from 'react';
import { CheckCircle, Plus, Edit2, AlertCircle } from 'lucide-react';
import { CANONICAL_FIELDS, CORE_FIELDS, SPEC_FIELDS, type CanonicalField } from '../../lib/canonicalFields';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface FirstTimeSetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function FirstTimeSetupWizard({ onComplete, onSkip }: FirstTimeSetupWizardProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'quick' | 'customize'>('quick');
  const [customFields, setCustomFields] = useState<Map<string, string>>(new Map());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(CANONICAL_FIELDS.filter(f => f.required).map(f => f.fieldName))
  );
  const [adding, setAdding] = useState(false);

  const handleQuickSetup = async () => {
    setAdding(true);
    try {
      const fieldsToInsert = CANONICAL_FIELDS.map(field => ({
        company_id: selectedCompany?.id,
        field_name: field.fieldName,
        field_label: field.displayName,
        field_type: field.fieldType,
        is_active: true,
        sort_order: field.sortOrder,
        auto_map_keywords: field.autoMapKeywords,
      }));

      const { error } = await supabase
        .from('import_field_mappings')
        .insert(fieldsToInsert);

      if (error) throw error;

      showToast('All 15 standard fields added successfully!', 'success');
      onComplete();
    } catch (error: any) {
      showToast('Failed to add fields: ' + error.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleCustomSetup = async () => {
    setAdding(true);
    try {
      const fieldsToInsert = CANONICAL_FIELDS
        .filter(field => selectedFields.has(field.fieldName))
        .map(field => ({
          company_id: selectedCompany?.id,
          field_name: field.fieldName,
          field_label: customFields.get(field.fieldName) || field.displayName,
          field_type: field.fieldType,
          is_active: true,
          sort_order: field.sortOrder,
          auto_map_keywords: field.autoMapKeywords,
        }));

      if (fieldsToInsert.length === 0) {
        showToast('Please select at least one field', 'error');
        setAdding(false);
        return;
      }

      const requiredFields = CANONICAL_FIELDS.filter(f => f.required);
      const missingRequired = requiredFields.filter(f => !selectedFields.has(f.fieldName));

      if (missingRequired.length > 0) {
        showToast(`Missing required fields: ${missingRequired.map(f => f.displayName).join(', ')}`, 'error');
        setAdding(false);
        return;
      }

      const { error } = await supabase
        .from('import_field_mappings')
        .insert(fieldsToInsert);

      if (error) throw error;

      showToast(`${fieldsToInsert.length} fields added successfully!`, 'success');
      onComplete();
    } catch (error: any) {
      showToast('Failed to add fields: ' + error.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const toggleField = (fieldName: string) => {
    const field = CANONICAL_FIELDS.find(f => f.fieldName === fieldName);
    if (field?.required) return;

    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldName)) {
      newSelected.delete(fieldName);
    } else {
      newSelected.add(fieldName);
    }
    setSelectedFields(newSelected);
  };

  const updateDisplayName = (fieldName: string, displayName: string) => {
    const newCustom = new Map(customFields);
    newCustom.set(fieldName, displayName);
    setCustomFields(newCustom);
  };

  if (mode === 'quick') {
    return (
      <div className="bg-white rounded-xl shadow-lg max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 rounded-t-xl text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome! Let's Set Up Your Import Fields</h2>
          <p className="text-blue-100">
            We'll create standard fields that work with any supplier format
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Quick Setup (Recommended)
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Add all 15 standard fields with default display names. You can customize them later if needed.
            </p>

            <div className="bg-white rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Core Fields (9)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {CORE_FIELDS.map(field => (
                      <div key={field.fieldName} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-gray-900">{field.displayName}</span>
                          {field.required && (
                            <span className="ml-1 text-xs text-red-600">*</span>
                          )}
                          <p className="text-xs text-gray-600">{field.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Specification Fields (6)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {SPEC_FIELDS.map(field => (
                      <div key={field.fieldName} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-gray-900">{field.displayName}</span>
                          <p className="text-xs text-gray-600">{field.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleQuickSetup}
                disabled={adding}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {adding ? 'Adding Fields...' : 'Add All 15 Standard Fields'}
              </button>
              <button
                onClick={() => setMode('customize')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Customize
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Skip setup (I'll add fields manually later)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 rounded-t-xl text-white">
        <h2 className="text-2xl font-bold mb-2">Customize Your Import Fields</h2>
        <p className="text-blue-100">
          Select fields you want and customize their display names
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>Required fields</strong> are marked with an asterisk (*) and cannot be deselected.
            These are essential for the system to function properly.
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Core Fields</h3>
            <div className="space-y-2">
              {CORE_FIELDS.map(field => (
                <FieldCard
                  key={field.fieldName}
                  field={field}
                  selected={selectedFields.has(field.fieldName)}
                  onToggle={() => toggleField(field.fieldName)}
                  customDisplayName={customFields.get(field.fieldName)}
                  onUpdateDisplayName={(name) => updateDisplayName(field.fieldName, name)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Specification Fields</h3>
            <div className="space-y-2">
              {SPEC_FIELDS.map(field => (
                <FieldCard
                  key={field.fieldName}
                  field={field}
                  selected={selectedFields.has(field.fieldName)}
                  onToggle={() => toggleField(field.fieldName)}
                  customDisplayName={customFields.get(field.fieldName)}
                  onUpdateDisplayName={(name) => updateDisplayName(field.fieldName, name)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => setMode('quick')}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Back
          </button>
          <button
            onClick={handleCustomSetup}
            disabled={adding}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {adding ? 'Adding Fields...' : `Add ${selectedFields.size} Selected Fields`}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Skip setup
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldCardProps {
  field: CanonicalField;
  selected: boolean;
  onToggle: () => void;
  customDisplayName?: string;
  onUpdateDisplayName: (name: string) => void;
}

function FieldCard({ field, selected, onToggle, customDisplayName, onUpdateDisplayName }: FieldCardProps) {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(customDisplayName || field.displayName);

  const handleSave = () => {
    onUpdateDisplayName(tempName);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempName(customDisplayName || field.displayName);
    setEditing(false);
  };

  return (
    <div className={`border-2 rounded-lg p-4 transition ${
      selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
    } ${field.required ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={field.required}
          className="mt-1 rounded"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {editing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm font-medium"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h4 className="font-medium text-gray-900">
                  {customDisplayName || field.displayName}
                  {field.required && <span className="text-red-600 ml-1">*</span>}
                </h4>
                <button
                  onClick={() => setEditing(true)}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit display name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">{field.description}</p>

          <div className="text-xs text-gray-500">
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{field.fieldName}</span>
            {field.validationHint && (
              <span className="ml-2 text-gray-600">• {field.validationHint}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
