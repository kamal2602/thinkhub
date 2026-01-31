import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Clock, Play, CheckCircle, AlertCircle, User, Flag, Trash2, Plus, Barcode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';
import AssetComponents from '../assets/AssetComponents';
import { ActivityFeed } from '../common/ActivityFeed';

// Helper function to format field names for display
function formatFieldName(key: string, customLabels: Record<string, string> = {}): string {
  // Strip "specifications." prefix if present (for legacy data)
  const cleanKey = key.toLowerCase().replace(/^specifications?\./, '');

  if (customLabels[cleanKey]) {
    return customLabels[cleanKey];
  }

  const fieldNameMap: Record<string, string> = {
    'cpu': 'Processor',
    'processor': 'Processor',
    'ram': 'RAM',
    'memory': 'Memory',
    'storage': 'Storage',
    'hdd': 'HDD',
    'ssd': 'SSD',
    'screen_size': 'Screen Size',
    'screen': 'Screen',
    'graphics': 'Graphics',
    'gpu': 'Graphics',
    'battery': 'Battery',
    'webcam': 'Webcam',
    'wifi': 'WiFi',
    'bluetooth': 'Bluetooth',
    'ports': 'Ports',
    'weight': 'Weight',
    'dimensions': 'Dimensions',
    'color': 'Color',
    'operating_system': 'Operating System',
    'os': 'Operating System',
    'cosmetic': 'Cosmetic Notes'
  };

  if (fieldNameMap[cleanKey]) {
    return fieldNameMap[cleanKey];
  }

  // Capitalize each word for unknown fields
  return cleanKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Helper function to format specification values with proper units
function formatSpecValue(value: string, fieldName: string): string {
  if (!value) return value;

  // Remove asterisk notation (e.g., "16*2" becomes "16")
  const cleaned = value.replace(/\*\d+/g, '').trim();

  // Already has unit (GB, TB, MHz, GHz)
  if (/\d+\s*(GB|TB|MHz|GHz)/i.test(cleaned)) {
    // Ensure there's a space between number and unit
    return cleaned.replace(/(\d+)\s*(GB|TB|MHz|GHz)/i, '$1 $2').toUpperCase();
  }

  // Just a number - add appropriate unit
  const numValue = parseFloat(cleaned);
  if (isNaN(numValue)) return cleaned;

  const lowerFieldName = fieldName.toLowerCase();

  // RAM typically in GB
  if (lowerFieldName.includes('ram') || lowerFieldName.includes('memory')) {
    return `${numValue} GB`;
  }

  // Storage - use TB if >= 1024, otherwise GB
  if (lowerFieldName.includes('storage') || lowerFieldName.includes('hdd') || lowerFieldName.includes('ssd')) {
    if (numValue >= 1024) {
      return `${numValue / 1024} TB`;
    }
    return `${numValue} GB`;
  }

  // CPU speed typically in GHz
  if (lowerFieldName.includes('cpu') || lowerFieldName.includes('processor')) {
    if (numValue < 10) {
      return `${numValue} GHz`;
    }
  }

  // Default: return cleaned value
  return cleaned;
}

interface AssetDetailsProps {
  asset: any;
  onClose: () => void;
  onEdit: () => void;
}

export function AssetDetails({ asset, onClose, onEdit }: AssetDetailsProps) {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const toast = useToast();
  const [currentStage, setCurrentStage] = useState(asset.status || 'received');
  const [assignedTechnician, setAssignedTechnician] = useState(asset.assigned_technician_id || '');
  const [isPriority, setIsPriority] = useState(asset.is_priority || false);
  const [processingNotes, setProcessingNotes] = useState(asset.processing_notes || '');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [testingResults, setTestingResults] = useState<any[]>([]);
  const [refurbCosts, setRefurbCosts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [testResultOptions, setTestResultOptions] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [itemTestResults, setItemTestResults] = useState<Record<string, any[]>>({});
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [costPrompt, setCostPrompt] = useState<{
    show: boolean;
    item: any;
    category: string;
    amount: number;
  } | null>(null);

  const [newRefurbCost, setNewRefurbCost] = useState({
    category: '',
    cost: '',
    description: '',
  });

  const [showScrapModal, setShowScrapModal] = useState(false);
  const [scrapData, setScrapData] = useState({
    scrap_reason: '',
    scrap_value: '',
    scrap_date: new Date().toISOString().split('T')[0]
  });

  const [internalIds, setInternalIds] = useState<any[]>([]);
  const [showAddInternalId, setShowAddInternalId] = useState(false);
  const [newInternalId, setNewInternalId] = useState({ id: '', reason: '' });

  useEffect(() => {
    fetchTestingResults();
    fetchRefurbCosts();
    fetchHistory();
    fetchTechnicians();
    fetchStages();
    fetchInternalIds();
    fetchFieldLabels();
    if (asset.product_type_id) {
      fetchChecklistTemplates();
      fetchTestResultOptions();
    }
  }, [asset]);

  const fetchFieldLabels = async () => {
    if (!selectedCompany?.id) return;

    const { data } = await supabase
      .from('import_field_mappings')
      .select('field_name, field_label')
      .eq('company_id', selectedCompany.id)
      .eq('is_active', true);

    if (data) {
      const labels: Record<string, string> = {};
      data.forEach(mapping => {
        if (mapping.field_name && mapping.field_label) {
          // Strip "specifications." prefix to get just the key
          const fieldKey = mapping.field_name.replace(/^specifications?\./, '').toLowerCase();
          labels[fieldKey] = mapping.field_label;
        }
      });
      setFieldLabels(labels);
    }
  };

  const fetchInternalIds = async () => {
    const { data } = await supabase
      .from('asset_internal_ids')
      .select('*')
      .eq('asset_id', asset.id)
      .eq('status', 'active')
      .order('added_date', { ascending: true });
    setInternalIds(data || []);
  };

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('company_id', selectedCompany?.id)
      .order('full_name');
    setTechnicians(data || []);
  };

  const fetchStages = async () => {
    const { data } = await supabase
      .from('statuss')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .eq('is_active', true)
      .order('stage_order');
    setStages(data || []);
  };

  const fetchTestingResults = async () => {
    const { data } = await supabase
      .from('asset_testing_results')
      .select('*')
      .eq('asset_id', asset.id)
      .order('tested_at', { ascending: false });
    setTestingResults(data || []);
  };

  const fetchRefurbCosts = async () => {
    const { data } = await supabase
      .from('asset_refurbishment_costs')
      .select('*')
      .eq('asset_id', asset.id)
      .order('date', { ascending: false });
    setRefurbCosts(data || []);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('asset_history')
      .select(`
        *,
        profiles:performed_by(full_name, email)
      `)
      .eq('asset_id', asset.id)
      .order('event_date', { ascending: false });
    setHistory(data || []);
  };

  const fetchChecklistTemplates = async () => {
    const { data } = await supabase
      .from('testing_checklist_templates')
      .select('*')
      .eq('product_type_id', asset.product_type_id)
      .order('sort_order');
    setChecklistTemplates(data || []);

    if (data && data.length > 0) {
      const templateIds = data.map(t => t.id);
      const { data: itemResults } = await supabase
        .from('test_result_options')
        .select('*')
        .in('checklist_template_id', templateIds)
        .order('sort_order');

      if (itemResults) {
        const grouped = itemResults.reduce((acc: Record<string, any[]>, result) => {
          if (!acc[result.checklist_template_id]) {
            acc[result.checklist_template_id] = [];
          }
          acc[result.checklist_template_id].push(result);
          return acc;
        }, {});
        setItemTestResults(grouped);
      }
    }
  };


  const fetchTestResultOptions = async () => {
    const { data } = await supabase
      .from('test_result_options')
      .select('*')
      .eq('product_type_id', asset.product_type_id)
      .order('sort_order');
    setTestResultOptions(data || []);
  };


  const handleTestingChange = async (itemName: string, result: string, templateId: string) => {
    const existing = testingResults.find((r) => r.checklist_item === itemName);

    if (existing) {
      await supabase
        .from('asset_testing_results')
        .update({ result, tested_at: new Date().toISOString(), tested_by: user?.id })
        .eq('id', existing.id);
    } else {
      await supabase.from('asset_testing_results').insert({
        asset_id: asset.id,
        checklist_item: itemName,
        result,
        tested_by: user?.id,
      });
    }

    await fetchTestingResults();

    // Check if this result has an auto-add cost configured
    const template = checklistTemplates.find((t) => t.id === templateId);
    const itemOptions = itemTestResults[templateId] || [];
    const selectedOption = itemOptions.find(opt => opt.name === result);

    if (selectedOption?.refurb_cost_amount) {
      // Show cost prompt with the configured amount
      setCostPrompt({
        show: true,
        item: template,
        category: itemName, // Use item name as category
        amount: parseFloat(selectedOption.refurb_cost_amount),
      });
    }
  };

  const handleAcceptCostPrompt = async (customAmount?: number) => {
    if (!costPrompt) return;

    await supabase.from('asset_refurbishment_costs').insert({
      asset_id: asset.id,
      category: costPrompt.category,
      cost: customAmount !== undefined ? customAmount : costPrompt.amount,
      description: `Auto-added from ${costPrompt.item.item_name} test`,
      created_by: user?.id,
    });

    await fetchRefurbCosts();
    setCostPrompt(null);
    toast.success('Cost added successfully');
  };

  const addRefurbCost = async () => {
    if (!newRefurbCost.category || !newRefurbCost.cost) return;

    await supabase.from('asset_refurbishment_costs').insert({
      asset_id: asset.id,
      category: newRefurbCost.category,
      cost: parseFloat(newRefurbCost.cost),
      description: newRefurbCost.description,
      created_by: user?.id,
    });

    setNewRefurbCost({ category: '', cost: '', description: '' });
    await fetchRefurbCosts();
    toast.success('Cost added successfully');
  };


  const getTestResult = (itemName: string) => {
    const result = testingResults.find((r) => r.checklist_item === itemName);
    return result?.result || 'N/A';
  };

  const totalRefurbCost = refurbCosts.reduce((sum, cost) => sum + parseFloat(cost.cost), 0);
  const profit = (asset.selling_price || 0) - ((asset.purchase_price || 0) + totalRefurbCost);

  const handleStageChange = async (newStage: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ status: newStage })
        .eq('id', asset.id);

      if (error) throw error;

      setCurrentStage(newStage);
      toast.success(`Moved to ${newStage.replace('_', ' ')} stage`);
    } catch (error: any) {
      toast.error('Failed to update stage: ' + error.message);
    }
  };

  const handleTechnicianChange = async (technicianId: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ assigned_technician_id: technicianId || null })
        .eq('id', asset.id);

      if (error) throw error;

      setAssignedTechnician(technicianId);
      const techName = technicians.find(t => t.id === technicianId)?.full_name || 'Unassigned';
      toast.success(`Assigned to ${techName}`);
    } catch (error: any) {
      toast.error('Failed to update assignment: ' + error.message);
    }
  };

  const handlePriorityToggle = async () => {
    try {
      const newPriority = !isPriority;
      const { error } = await supabase
        .from('assets')
        .update({ is_priority: newPriority })
        .eq('id', asset.id);

      if (error) throw error;

      setIsPriority(newPriority);
      toast.success(newPriority ? 'Marked as priority' : 'Removed priority flag');
    } catch (error: any) {
      toast.error('Failed to update priority: ' + error.message);
    }
  };

  const handleNotesUpdate = async () => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ processing_notes: processingNotes })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success('Notes updated');
    } catch (error: any) {
      toast.error('Failed to update notes: ' + error.message);
    }
  };

  const handleAddInternalId = async () => {
    if (!newInternalId.id.trim()) {
      toast.error('Please scan or enter an internal ID');
      return;
    }

    const internalBarcode = newInternalId.id.trim().toUpperCase();

    try {
      const { data: existingId, error: checkError } = await supabase
        .from('asset_internal_ids')
        .select('id')
        .eq('company_id', selectedCompany?.id)
        .eq('internal_id', internalBarcode)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingId) {
        toast.error('This internal ID is already in use');
        return;
      }

      const { error: insertError } = await supabase
        .from('asset_internal_ids')
        .insert({
          asset_id: asset.id,
          internal_id: internalBarcode,
          is_primary: false,
          reason: newInternalId.reason || 'Additional internal ID',
          status: 'active',
          company_id: selectedCompany?.id
        });

      if (insertError) throw insertError;

      toast.success(`Internal ID ${internalBarcode} added successfully`);
      setShowAddInternalId(false);
      setNewInternalId({ id: '', reason: '' });
      fetchInternalIds();
    } catch (error: any) {
      toast.error('Failed to add internal ID: ' + error.message);
    }
  };

  const handleScrap = async () => {
    if (!scrapData.scrap_reason.trim()) {
      toast.error('Please provide a scrap reason');
      return;
    }

    const scrapValue = parseFloat(scrapData.scrap_value) || 0;

    try {
      const { error } = await supabase
        .from('assets')
        .update({
          status: 'scrapped',
          scrap_date: scrapData.scrap_date,
          scrap_reason: scrapData.scrap_reason,
          scrap_value: scrapValue
        })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success('Asset marked as scrapped');
      setShowScrapModal(false);
      onClose();
    } catch (error: any) {
      toast.error('Failed to scrap asset: ' + error.message);
    }
  };

  const getStageInfo = (stage: string) => {
    const stages: Record<string, {label: string, color: string, icon: any}> = {
      received: { label: 'Received', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
      testing: { label: 'Testing', color: 'bg-blue-100 text-blue-700', icon: Play },
      refurbishing: { label: 'Refurbishing', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      qc_grading: { label: 'QC/Grading', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
      ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: CheckCircle }
    };
    return stages[stage] || stages.received;
  };

  const stageInfo = getStageInfo(currentStage);
  const StageIcon = stageInfo.icon;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{asset.serial_number}</h1>
              <p className="text-gray-600">{asset.brand} {asset.model}</p>
              {asset.product_types?.name && (
                <p className="text-sm text-gray-500">Type: {asset.product_types.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit Asset
            </button>
            {asset.status !== 'Scrapped' && asset.status !== 'Sold' && (
              <button
                onClick={() => setShowScrapModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                Mark as Scrapped
              </button>
            )}
          </div>
        </div>

        {(internalIds.length > 0 || showAddInternalId) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Internal Asset IDs</h3>
              </div>
              {!showAddInternalId && (
                <button
                  onClick={() => setShowAddInternalId(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add ID
                </button>
              )}
            </div>

            <div className="space-y-2">
              {internalIds.map((internalId) => (
                <div key={internalId.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`w-4 h-4 ${internalId.is_primary ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-mono font-medium text-gray-900">
                        {internalId.internal_id}
                        {internalId.is_primary && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Primary</span>
                        )}
                      </p>
                      {internalId.reason && (
                        <p className="text-xs text-gray-500">{internalId.reason}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(internalId.added_date).toLocaleDateString()}
                  </span>
                </div>
              ))}

              {showAddInternalId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scan or Enter Internal ID
                    </label>
                    <input
                      type="text"
                      value={newInternalId.id}
                      onChange={(e) => setNewInternalId({ ...newInternalId, id: e.target.value })}
                      placeholder="Scan barcode or type ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason (optional)
                    </label>
                    <input
                      type="text"
                      value={newInternalId.reason}
                      onChange={(e) => setNewInternalId({ ...newInternalId, reason: e.target.value })}
                      placeholder="e.g., Back panel replaced"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddInternalId}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add ID
                    </button>
                    <button
                      onClick={() => {
                        setShowAddInternalId(false);
                        setNewInternalId({ id: '', reason: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Processing Stage:</span>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${stageInfo.color}`}>
                <StageIcon className="w-4 h-4" />
                <span className="font-medium">{stageInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currentStage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.stage_key}>
                    {stage.stage_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <User className="w-4 h-4" />
                Assigned Technician
              </label>
              <select
                value={assignedTechnician}
                onChange={(e) => handleTechnicianChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Unassigned</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Flag className="w-4 h-4" />
                Priority Status
              </label>
              <button
                onClick={handlePriorityToggle}
                className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                  isPriority
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isPriority ? 'Priority Item' : 'Normal Priority'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {asset.brand && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">Brand:</span>
                  <span className="font-medium">{asset.brand}</span>
                </div>
              )}
              {asset.model && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">Model:</span>
                  <span className="font-medium">{asset.model}</span>
                </div>
              )}
              {asset.cpu && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded md:col-span-2">
                  <span className="text-gray-600">{formatFieldName('cpu', fieldLabels)}:</span>
                  <span className="font-medium text-right">{asset.cpu}</span>
                </div>
              )}
              {asset.ram && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">{formatFieldName('ram', fieldLabels)}:</span>
                  <span className="font-medium">{formatSpecValue(asset.ram, 'ram')}</span>
                </div>
              )}
              {asset.storage && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">{formatFieldName('storage', fieldLabels)}:</span>
                  <span className="font-medium">{formatSpecValue(asset.storage, 'storage')}</span>
                </div>
              )}
              {asset.screen_size && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">{formatFieldName('screen_size', fieldLabels)}:</span>
                  <span className="font-medium">{asset.screen_size}</span>
                </div>
              )}
              {asset.imei && (
                <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">IMEI:</span>
                  <span className="font-medium">{asset.imei}</span>
                </div>
              )}
              {asset.other_specs && typeof asset.other_specs === 'object' && Object.entries(asset.other_specs)
                .filter(([key]) => {
                  // Skip fields that are already displayed in dedicated columns
                  const normalizedKey = key.toLowerCase();
                  return !['cpu', 'ram', 'memory', 'storage', 'hdd', 'ssd', 'screen', 'screen_size', 'imei'].includes(normalizedKey);
                })
                .map(([key, value]) => (
                  value && (
                    <div key={key} className="flex justify-between p-2 hover:bg-gray-50 rounded">
                      <span className="text-gray-600">{formatFieldName(key, fieldLabels)}:</span>
                      <span className="font-medium">{formatSpecValue(String(value), key)}</span>
                    </div>
                  )
                ))
              }
              {asset.notes && (
                <div className="md:col-span-2 p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-600">Notes:</span>
                  <p className="font-medium mt-1">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>

          {checklistTemplates.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Testing Checklist</h2>
              <div className="space-y-3">
                {checklistTemplates.map((template) => {
                  const result = getTestResult(template.item_name);
                  const itemSpecificOptions = itemTestResults[template.id];
                  const options = itemSpecificOptions && itemSpecificOptions.length > 0
                    ? itemSpecificOptions
                    : testResultOptions.length > 0
                    ? testResultOptions
                    : [
                        { name: 'Pass', color: '#10B981' },
                        { name: 'Fail', color: '#EF4444' },
                        { name: 'N/A', color: '#6B7280' }
                      ];

                  return (
                    <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{template.item_name}</span>
                      <div className="flex gap-2">
                        {options.map((option) => {
                          const isSelected = result === option.name;
                          const hasCost = option.refurb_cost_amount && parseFloat(option.refurb_cost_amount) > 0;
                          return (
                            <button
                              key={option.name}
                              onClick={() => handleTestingChange(template.item_name, option.name, template.id)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border-2 relative ${
                                isSelected
                                  ? 'text-white shadow-md'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                              style={
                                isSelected
                                  ? { backgroundColor: option.color, borderColor: option.color }
                                  : { borderColor: option.color, color: option.color }
                              }
                              title={hasCost ? `Auto-add cost: $${parseFloat(option.refurb_cost_amount).toFixed(2)}` : undefined}
                            >
                              {option.name}
                              {hasCost && (
                                <span className={`ml-1.5 text-xs ${isSelected ? 'text-white' : 'text-green-600'}`}>
                                  💰
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStage !== 'received' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Refurbishment Costs</h2>

              <div className="space-y-3 mb-4">
                {refurbCosts.map((cost) => (
                  <div key={cost.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{cost.category}</div>
                      {cost.description && <div className="text-sm text-gray-600">{cost.description}</div>}
                    </div>
                    <div className="text-lg font-semibold">${parseFloat(cost.cost).toFixed(2)}</div>
                  </div>
                ))}
                {refurbCosts.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No refurbishment costs recorded</p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Add Refurbishment Cost</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Category (e.g., Screen Replacement, Battery)"
                    value={newRefurbCost.category}
                    onChange={(e) => setNewRefurbCost({ ...newRefurbCost, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cost"
                    value={newRefurbCost.cost}
                    onChange={(e) => setNewRefurbCost({ ...newRefurbCost, cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newRefurbCost.description}
                    onChange={(e) => setNewRefurbCost({ ...newRefurbCost, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addRefurbCost}
                    disabled={!newRefurbCost.category || !newRefurbCost.cost}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Cost
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">History</h2>
            <div className="space-y-3">
              {history.map((event) => (
                <div key={event.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{event.event_type}</div>
                    <div className="text-sm text-gray-600">{event.description}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>{new Date(event.event_date).toLocaleString()}</span>
                      {event.profiles && (
                        <>
                          <span>•</span>
                          <span>by {event.profiles.full_name || event.profiles.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-gray-500 text-center py-4">No history recorded</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Current Status</span>
                <div className="font-medium text-lg">{asset.status}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Cosmetic Grade</span>
                <div className="font-medium text-lg">Grade {asset.cosmetic_grade}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Functional Status</span>
                <div className="font-medium text-lg">{asset.functional_status}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Refurbishment</span>
                <div className="font-medium text-lg">{asset.refurbishment_status}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Purchase Price</span>
                <div className="font-medium text-lg">${(asset.purchase_price || 0).toFixed(2)}</div>
              </div>
              {currentStage !== 'received' && (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Refurb Cost</span>
                    <div className="font-medium text-lg text-orange-600">${totalRefurbCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Cost</span>
                    <div className="font-medium text-lg">${((asset.purchase_price || 0) + totalRefurbCost).toFixed(2)}</div>
                  </div>
                  <div className="border-t pt-3">
                    <span className="text-sm text-gray-600">Selling Price</span>
                    <div className="font-medium text-xl text-blue-600">${(asset.selling_price || 0).toFixed(2)}</div>
                  </div>
                  <div className="border-t pt-3">
                    <span className="text-sm text-gray-600">Potential Profit</span>
                    <div className={`font-medium text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${profit.toFixed(2)}
                    </div>
                  </div>
                </>
              )}
              {asset.market_price && (
                <div>
                  <span className="text-sm text-gray-600">Market Price</span>
                  <div className="font-medium text-lg">${(asset.market_price || 0).toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>

          {asset.warranty_months > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Warranty</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Duration</span>
                  <div className="font-medium">{asset.warranty_months} months</div>
                </div>
                {asset.warranty_start_date && (
                  <>
                    <div>
                      <span className="text-sm text-gray-600">Start Date</span>
                      <div className="font-medium">{new Date(asset.warranty_start_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">End Date</span>
                      <div className="font-medium">{new Date(asset.warranty_end_date).toLocaleDateString()}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Components</h2>
            <AssetComponents
              assetId={asset.id}
              companyId={selectedCompany?.id || ''}
              serialNumber={asset.serial_number}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Notes</h2>
            <textarea
              value={processingNotes}
              onChange={(e) => setProcessingNotes(e.target.value)}
              onBlur={handleNotesUpdate}
              placeholder="Add notes about work done, issues found, or next steps..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Notes auto-save when you click outside the box</p>
          </div>
        </div>
      </div>

      {costPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add Refurbishment Cost?
            </h2>

            <p className="text-gray-600 mb-4">
              The test <strong>{costPrompt.item.item_name}</strong> suggests adding a repair cost.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Category:</span>
                <span className="font-medium">{costPrompt.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Suggested Cost:</span>
                <span className="text-lg font-bold text-green-600">${costPrompt.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjust cost (optional):
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue={costPrompt.amount}
                id="custom-cost-amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCostPrompt(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('custom-cost-amount') as HTMLInputElement;
                  const customAmount = input ? parseFloat(input.value) : costPrompt.amount;
                  handleAcceptCostPrompt(customAmount);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Add Cost
              </button>
            </div>
          </div>
        </div>
      )}

      {showScrapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Mark Asset as Scrapped
              </h3>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  This will permanently mark <strong>{asset.serial_number}</strong> as scrapped.
                  The asset cost will be deducted from the lot profit calculation.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scrap Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={scrapData.scrap_date}
                    onChange={(e) => setScrapData({ ...scrapData, scrap_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scrap Reason <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={scrapData.scrap_reason}
                    onChange={(e) => setScrapData({ ...scrapData, scrap_reason: e.target.value })}
                    placeholder="e.g., Beyond economical repair, severe physical damage, missing critical components"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recoverable Scrap Value (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={scrapData.scrap_value}
                      onChange={(e) => setScrapData({ ...scrapData, scrap_value: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Value of any recoverable parts, metals, or materials
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Asset Total Cost:</span>
                      <span className="font-medium text-gray-900">
                        ${((asset.purchase_price || 0) + totalRefurbCost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scrap Value:</span>
                      <span className="font-medium text-gray-900">
                        ${(parseFloat(scrapData.scrap_value) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-900 font-medium">Net Loss:</span>
                      <span className="font-bold text-red-600">
                        -${(((asset.purchase_price || 0) + totalRefurbCost) - (parseFloat(scrapData.scrap_value) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowScrapModal(false);
                    setScrapData({
                      scrap_reason: '',
                      scrap_value: '',
                      scrap_date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScrap}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Confirm Scrap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <ActivityFeed assetId={asset.id} />
      </div>
    </div>
  );
}
