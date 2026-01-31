import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { QuickAddModal } from '../common/QuickAddModal';

interface AssetFormProps {
  asset: any;
  onClose: () => void;
}

export function AssetForm({ asset, onClose }: AssetFormProps) {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [cosmeticGrades, setCosmeticGrades] = useState<any[]>([]);
  const [functionalStatuses, setFunctionalStatuses] = useState<any[]>([]);
  const [showQuickAddType, setShowQuickAddType] = useState(false);
  const [showQuickAddLocation, setShowQuickAddLocation] = useState(false);

  const [formData, setFormData] = useState({
    serial_number: asset?.serial_number || '',
    imei: asset?.imei || '',
    product_type_id: asset?.product_type_id || '',
    inventory_item_id: asset?.inventory_item_id || '',
    location_id: asset?.location_id || '',

    brand: asset?.brand || '',
    model: asset?.model || '',
    cpu: asset?.cpu || '',
    ram: asset?.ram || '',
    storage: asset?.storage || '',
    screen_size: asset?.screen_size || '',

    cosmetic_grade: asset?.cosmetic_grade || '',
    functional_status: asset?.functional_status || '',
    refurbishment_status: asset?.refurbishment_status || 'Not Required',

    purchase_price: asset?.purchase_price || '',
    market_price: asset?.market_price || '',
    selling_price: asset?.selling_price || '',

    warranty_months: asset?.warranty_months || 0,
    warranty_start_date: asset?.warranty_start_date || '',

    purchase_date: asset?.purchase_date || new Date().toISOString().split('T')[0],
    manufacture_date: asset?.manufacture_date || '',

    weight_kg: asset?.weight_kg || '',
    disposal_method: asset?.disposal_method || '',
    disposal_date: asset?.disposal_date || '',
    contains_hazmat: asset?.contains_hazmat || false,
    hazmat_types: asset?.hazmat_types || [],

    notes: asset?.notes || '',
  });

  useEffect(() => {
    fetchProductTypes();
    fetchLocations();
    fetchInventoryItems();
    fetchCosmeticGrades();
    fetchFunctionalStatuses();
  }, []);

  const fetchProductTypes = async () => {
    const { data } = await supabase
      .from('product_types')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('name');
    setProductTypes(data || []);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('name');
    setLocations(data || []);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('name');
    setInventoryItems(data || []);
  };

  const fetchCosmeticGrades = async () => {
    const { data } = await supabase
      .from('cosmetic_grades')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('sort_order');
    setCosmeticGrades(data || []);

    if (!asset && data && data.length > 0 && !formData.cosmetic_grade) {
      const defaultGrade = data.find(g => g.is_default);
      if (defaultGrade) {
        setFormData(prev => ({ ...prev, cosmetic_grade: defaultGrade.grade }));
      }
    }
  };

  const fetchFunctionalStatuses = async () => {
    const { data } = await supabase
      .from('functional_statuses')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('sort_order');
    setFunctionalStatuses(data || []);

    if (!asset && data && data.length > 0 && !formData.functional_status) {
      const defaultStatus = data.find(s => s.is_default);
      if (defaultStatus) {
        setFormData(prev => ({ ...prev, functional_status: defaultStatus.status }));
      }
    }
  };


  const checkDuplicate = async (serialNumber: string) => {
    if (!serialNumber || serialNumber === asset?.serial_number) {
      setDuplicateWarning('');
      return;
    }

    const { data } = await supabase
      .from('assets')
      .select('id, serial_number, brand, model')
      .eq('company_id', selectedCompany?.id)
      .eq('serial_number', serialNumber)
      .maybeSingle();

    if (data) {
      setDuplicateWarning(`Warning: Serial number already exists for ${data.brand} ${data.model}`);
    } else {
      setDuplicateWarning('');
    }
  };

  const quickAddProductType = async (name: string) => {
    const { data, error } = await supabase
      .from('product_types')
      .insert({ company_id: selectedCompany?.id, name })
      .select()
      .single();

    if (error) throw error;

    await fetchProductTypes();
    setFormData({ ...formData, product_type_id: data.id });
    toast.success(`Product type "${name}" created`);
  };

  const quickAddLocation = async (name: string) => {
    const { data, error } = await supabase
      .from('locations')
      .insert({ company_id: selectedCompany?.id, name })
      .select()
      .single();

    if (error) throw error;

    await fetchLocations();
    setFormData({ ...formData, location_id: data.id });
    toast.success(`Location "${name}" created`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const assetData = {
        company_id: selectedCompany?.id,
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price as any) : null,
        market_price: formData.market_price ? parseFloat(formData.market_price as any) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price as any) : null,
        warranty_months: parseInt(formData.warranty_months as any) || 0,
        warranty_start_date: formData.warranty_start_date || null,
        warranty_end_date: formData.warranty_start_date
          ? new Date(new Date(formData.warranty_start_date).setMonth(
              new Date(formData.warranty_start_date).getMonth() + parseInt(formData.warranty_months as any || '0')
            )).toISOString().split('T')[0]
          : null,
        product_type_id: formData.product_type_id || null,
        inventory_item_id: formData.inventory_item_id || null,
        location_id: formData.location_id || null,
        purchase_date: formData.purchase_date || null,
        manufacture_date: formData.manufacture_date || null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg as any) : null,
        disposal_method: formData.disposal_method || null,
        disposal_date: formData.disposal_date || null,
        contains_hazmat: formData.contains_hazmat,
        hazmat_types: formData.hazmat_types,
        created_by: user?.id,
      };

      if (asset) {
        const { error } = await supabase
          .from('assets')
          .update({ ...assetData, updated_at: new Date().toISOString() })
          .eq('id', asset.id);

        if (error) throw error;

        toast.success('Asset updated successfully');
      } else {
        const { data: newAsset, error } = await supabase
          .from('assets')
          .insert(assetData)
          .select()
          .single();

        if (error) throw error;

        await supabase.from('asset_history').insert({
          asset_id: newAsset.id,
          event_type: 'Purchase',
          description: 'Asset added to inventory',
          performed_by: user?.id,
        });

        toast.success('Asset created successfully');
      }

      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {asset ? 'Edit Asset' : 'Add New Asset'}
          </h1>
          <p className="text-gray-600">Enter asset details, specifications, and pricing</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.serial_number}
                onChange={(e) => {
                  setFormData({ ...formData, serial_number: e.target.value });
                  checkDuplicate(e.target.value);
                }}
                onBlur={(e) => checkDuplicate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                  duplicateWarning ? 'border-yellow-300 focus:ring-yellow-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {duplicateWarning && (
                <div className="mt-1 flex items-center gap-1 text-xs text-yellow-700">
                  <AlertTriangle className="w-3 h-3" />
                  {duplicateWarning}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IMEI (Optional)
              </label>
              <input
                type="text"
                value={formData.imei}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.product_type_id}
                  onChange={(e) => setFormData({ ...formData, product_type_id: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowQuickAddType(true)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  title="Quick add product type"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Inventory Item
              </label>
              <select
                value={formData.inventory_item_id}
                onChange={(e) => setFormData({ ...formData, inventory_item_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CPU</label>
              <input
                type="text"
                value={formData.cpu}
                onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                placeholder="e.g., Intel i5-8250U"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RAM</label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                placeholder="e.g., 8GB DDR4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Storage</label>
              <input
                type="text"
                value={formData.storage}
                onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                placeholder="e.g., 256GB SSD"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Screen Size</label>
              <input
                type="text"
                value={formData.screen_size}
                onChange={(e) => setFormData({ ...formData, screen_size: e.target.value })}
                placeholder="e.g., 15.6 inches"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Condition & Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cosmetic Grade</label>
              <select
                value={formData.cosmetic_grade}
                onChange={(e) => setFormData({ ...formData, cosmetic_grade: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Grade</option>
                {cosmeticGrades.map((grade) => (
                  <option key={grade.id} value={grade.grade}>
                    {grade.grade} {grade.description ? `- ${grade.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Functional Status</label>
              <select
                value={formData.functional_status}
                onChange={(e) => setFormData({ ...formData, functional_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Status</option>
                {functionalStatuses.map((status) => (
                  <option key={status.id} value={status.status}>
                    {status.status} {status.description ? `- ${status.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Refurbishment Status</label>
              <select
                value={formData.refurbishment_status}
                onChange={(e) => setFormData({ ...formData, refurbishment_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Not Required">Not Required</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="flex gap-2">
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowQuickAddLocation(true)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  title="Quick add location"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Market Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.market_price}
                onChange={(e) => setFormData({ ...formData, market_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Warranty & Dates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Warranty (Months)</label>
              <input
                type="number"
                value={formData.warranty_months}
                onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Start Date</label>
              <input
                type="date"
                value={formData.warranty_start_date}
                onChange={(e) => setFormData({ ...formData, warranty_start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacture Date</label>
              <input
                type="date"
                value={formData.manufacture_date}
                onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Environmental / ITAD Compliance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="Asset weight in kilograms"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disposal Method</label>
              <select
                value={formData.disposal_method}
                onChange={(e) => setFormData({ ...formData, disposal_method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pending</option>
                <option value="resale">Resale</option>
                <option value="recycle">Recycle</option>
                <option value="scrap">Scrap</option>
                <option value="landfill">Landfill</option>
                <option value="donation">Donation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disposal Date</label>
              <input
                type="date"
                value={formData.disposal_date}
                onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={formData.contains_hazmat}
                  onChange={(e) => setFormData({ ...formData, contains_hazmat: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Contains Hazardous Materials
              </label>
              {formData.contains_hazmat && (
                <div className="space-y-2 mt-2 ml-6">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.hazmat_types.includes('battery')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, hazmat_types: [...formData.hazmat_types, 'battery'] });
                        } else {
                          setFormData({ ...formData, hazmat_types: formData.hazmat_types.filter(t => t !== 'battery') });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Battery
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.hazmat_types.includes('crt')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, hazmat_types: [...formData.hazmat_types, 'crt'] });
                        } else {
                          setFormData({ ...formData, hazmat_types: formData.hazmat_types.filter(t => t !== 'crt') });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    CRT Monitor
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.hazmat_types.includes('mercury')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, hazmat_types: [...formData.hazmat_types, 'mercury'] });
                        } else {
                          setFormData({ ...formData, hazmat_types: formData.hazmat_types.filter(t => t !== 'mercury') });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Mercury
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.hazmat_types.includes('lead')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, hazmat_types: [...formData.hazmat_types, 'lead'] });
                        } else {
                          setFormData({ ...formData, hazmat_types: formData.hazmat_types.filter(t => t !== 'lead') });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Lead
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.hazmat_types.includes('other')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, hazmat_types: [...formData.hazmat_types, 'other'] });
                        } else {
                          setFormData({ ...formData, hazmat_types: formData.hazmat_types.filter(t => t !== 'other') });
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Other
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Additional notes or comments"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : asset ? 'Update Asset' : 'Create Asset'}
          </button>
        </div>
      </form>

      {showQuickAddType && (
        <QuickAddModal
          title="Add Product Type"
          placeholder="Enter product type name (e.g., Laptop, Desktop)"
          onAdd={quickAddProductType}
          onClose={() => setShowQuickAddType(false)}
        />
      )}

      {showQuickAddLocation && (
        <QuickAddModal
          title="Add Location"
          placeholder="Enter location name (e.g., Warehouse A, Store 1)"
          onAdd={quickAddLocation}
          onClose={() => setShowQuickAddLocation(false)}
        />
      )}
    </div>
  );
}
