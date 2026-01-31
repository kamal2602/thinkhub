import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface ProcessingStage {
  id: string;
  stage_name: string;
  stage_key: string;
  stage_order: number;
  stage_color: string;
  stage_type: string;
  is_active: boolean;
  is_system_stage: boolean;
  description: string;
}

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', bgClass: 'bg-gray-100', textClass: 'text-gray-700' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
  { value: 'teal', label: 'Teal', bgClass: 'bg-teal-100', textClass: 'text-teal-700' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-100', textClass: 'text-green-700' },
  { value: 'red', label: 'Red', bgClass: 'bg-red-100', textClass: 'text-red-700' },
];

const STAGE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'awaiting', label: 'Awaiting' },
  { value: 'complete', label: 'Complete' },
  { value: 'scrapped', label: 'Scrapped' },
];

export default function ProcessingStages() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [stages, setStages] = useState<ProcessingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    stage_name: '',
    stage_key: '',
    stage_color: 'gray',
    stage_type: 'standard',
    description: ''
  });

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchStages();
    }
  }, [selectedCompany]);

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('processing_stages')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('stage_order');

      if (error) throw error;
      setStages(data || []);
    } catch (error: any) {
      showToast('Error loading stages: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.stage_name.trim() || !formData.stage_key.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const maxOrder = Math.max(...stages.map(s => s.stage_order), 0);

      const { error } = await supabase
        .from('processing_stages')
        .insert({
          company_id: selectedCompany?.id,
          stage_name: formData.stage_name,
          stage_key: formData.stage_key.toLowerCase().replace(/\s+/g, '_'),
          stage_order: maxOrder + 1,
          stage_color: formData.stage_color,
          stage_type: formData.stage_type,
          description: formData.description,
          is_system_stage: false,
          created_by: userId
        });

      if (error) throw error;

      showToast('Stage added successfully', 'success');
      setShowAddForm(false);
      setFormData({ stage_name: '', stage_key: '', stage_color: 'gray', stage_type: 'standard', description: '' });
      fetchStages();
    } catch (error: any) {
      showToast('Error adding stage: ' + error.message, 'error');
    }
  };

  const handleUpdate = async (stage: ProcessingStage) => {
    try {
      const { error } = await supabase
        .from('processing_stages')
        .update({
          stage_name: stage.stage_name,
          stage_color: stage.stage_color,
          stage_type: stage.stage_type,
          description: stage.description,
          is_active: stage.is_active
        })
        .eq('id', stage.id);

      if (error) throw error;

      showToast('Stage updated successfully', 'success');
      setEditingId(null);
      fetchStages();
    } catch (error: any) {
      showToast('Error updating stage: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stage? Assets in this stage will need to be moved.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('processing_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Stage deleted successfully', 'success');
      fetchStages();
    } catch (error: any) {
      showToast('Error deleting stage: ' + error.message, 'error');
    }
  };

  const handleReorder = async (stageId: string, direction: 'up' | 'down') => {
    const currentIndex = stages.findIndex(s => s.id === stageId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === stages.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newStages = [...stages];
    [newStages[currentIndex], newStages[newIndex]] = [newStages[newIndex], newStages[currentIndex]];

    newStages.forEach((stage, index) => {
      stage.stage_order = index + 1;
    });

    setStages(newStages);

    try {
      const updates = newStages.map(stage => ({
        id: stage.id,
        stage_order: stage.stage_order
      }));

      // BATCH PROCESSING: Update all stages in parallel
      const results = await Promise.allSettled(
        updates.map(update =>
          supabase
            .from('processing_stages')
            .update({ stage_order: update.stage_order })
            .eq('id', update.id)
        )
      );

      const failedUpdates = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} stages`);
      }

      showToast('Stage order updated', 'success');
    } catch (error: any) {
      showToast('Error updating order: ' + error.message, 'error');
      fetchStages();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Processing Stages</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize your processing workflow stages
          </p>
        </div>
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Stage
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">Add New Stage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.stage_name}
                onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Quality Check"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage Key <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.stage_key}
                onChange={(e) => setFormData({ ...formData, stage_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., quality_check"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used internally (lowercase, underscores only)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <select
                value={formData.stage_color}
                onChange={(e) => setFormData({ ...formData, stage_color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {COLOR_OPTIONS.map(color => (
                  <option key={color.value} value={color.value}>{color.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.stage_type}
                onChange={(e) => setFormData({ ...formData, stage_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STAGE_TYPE_OPTIONS.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Stage
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ stage_name: '', stage_key: '', stage_color: 'gray', stage_type: 'standard', description: '' });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {stages.map((stage, index) => {
          const isEditing = editingId === stage.id;
          const colorOption = COLOR_OPTIONS.find(c => c.value === stage.stage_color);

          return (
            <div key={stage.id} className="p-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={stage.stage_name}
                      onChange={(e) => setStages(stages.map(s => s.id === stage.id ? { ...s, stage_name: e.target.value } : s))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <select
                      value={stage.stage_color}
                      onChange={(e) => setStages(stages.map(s => s.id === stage.id ? { ...s, stage_color: e.target.value } : s))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {COLOR_OPTIONS.map(color => (
                        <option key={color.value} value={color.value}>{color.label}</option>
                      ))}
                    </select>
                    <select
                      value={stage.stage_type}
                      onChange={(e) => setStages(stages.map(s => s.id === stage.id ? { ...s, stage_type: e.target.value } : s))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {STAGE_TYPE_OPTIONS.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={stage.description || ''}
                      onChange={(e) => setStages(stages.map(s => s.id === stage.id ? { ...s, description: e.target.value } : s))}
                      placeholder="Description"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={stage.is_active}
                        onChange={(e) => setStages(stages.map(s => s.id === stage.id ? { ...s, is_active: e.target.checked } : s))}
                        className="rounded"
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(stage)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        fetchStages();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReorder(stage.id, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleReorder(stage.id, 'down')}
                          disabled={index === stages.length - 1}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`px-3 py-1 rounded ${colorOption?.bgClass} ${colorOption?.textClass} font-medium text-sm`}>
                        {stage.stage_name}
                      </span>
                      <span className="text-sm text-gray-500">({stage.stage_key})</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {stage.stage_type}
                      </span>
                      {!stage.is_active && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">
                          Inactive
                        </span>
                      )}
                      {stage.description && (
                        <span className="text-sm text-gray-600">{stage.description}</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(stage.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!stage.is_system_stage && (
                        <button
                          onClick={() => handleDelete(stage.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
