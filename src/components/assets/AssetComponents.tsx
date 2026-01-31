import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Cpu, HardDrive, Package, ArrowRight, Plus, Barcode } from 'lucide-react';

interface Component {
  id: string;
  component_type: string;
  component_name: string;
  component_serial?: string;
  capacity: string;
  quantity: number;
  status: string;
  condition: string;
  technology_type?: string;
  manufacturer?: string;
  model_number?: string;
  installed_date: string;
  harvested_date?: string;
  notes?: string;
}

interface AssetComponentsProps {
  assetId: string;
  companyId: string;
  serialNumber: string;
}

export default function AssetComponents({ assetId, companyId, serialNumber }: AssetComponentsProps) {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [componentSerial, setComponentSerial] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState<any>(null);
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchComponents();
  }, [assetId]);

  const recalculateAssetSpecifications = async () => {
    try {
      const { data: installedComponents } = await supabase
        .from('asset_components')
        .select('component_type, capacity, status')
        .eq('asset_id', assetId)
        .eq('status', 'installed');

      if (!installedComponents) return;

      const ramComponents = installedComponents.filter(c => c.component_type === 'RAM');
      const storageComponents = installedComponents.filter(c =>
        ['SSD', 'HDD', 'NVMe', 'Storage'].includes(c.component_type)
      );

      let ramTotal = 0;
      ramComponents.forEach(comp => {
        const match = comp.capacity?.match(/(\d+)\s*GB/i);
        if (match) {
          ramTotal += parseInt(match[1]);
        }
      });

      let storageTotal = 0;
      storageComponents.forEach(comp => {
        const match = comp.capacity?.match(/(\d+)\s*(GB|TB)/i);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toUpperCase();
          if (unit === 'TB') {
            storageTotal += value * 1024;
          } else {
            storageTotal += value;
          }
        }
      });

      const updates: any = {};
      if (ramTotal > 0) {
        updates.ram = `${ramTotal}GB`;
      }
      if (storageTotal > 0) {
        if (storageTotal >= 1024) {
          updates.storage = `${storageTotal / 1024}TB`;
        } else {
          updates.storage = `${storageTotal}GB`;
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('assets')
          .update(updates)
          .eq('id', assetId);
      }
    } catch (error: any) {
      console.error('Error recalculating specifications:', error);
    }
  };

  const fetchComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_components')
        .select('*')
        .eq('asset_id', assetId)
        .order('component_type', { ascending: true });

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleHarvest = async (component: Component) => {
    setSelectedComponent(component);

    try {
      const { data, error } = await supabase.rpc('get_suggested_component_price', {
        p_company_id: companyId,
        p_component_type: component.component_type,
        p_capacity: component.capacity,
        p_technology_type: component.technology_type || null,
        p_manufacturer: component.manufacturer || null
      });

      if (error) throw error;

      if (data) {
        setSuggestedPrice(data);
        if (data.suggested_price > 0) {
          setMarketValue(data.suggested_price.toString());
        }
      }
    } catch (error: any) {
      console.error('Error fetching suggested price:', error);
    }

    setShowHarvestModal(true);
  };

  const confirmHarvest = async () => {
    if (!selectedComponent) return;

    if (!componentSerial.trim()) {
      showToast('Please enter component serial number', 'error');
      return;
    }

    const marketValueNum = parseFloat(marketValue);
    if (isNaN(marketValueNum) || marketValueNum < 0) {
      showToast('Please enter a valid market value', 'error');
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error: updateError } = await supabase
        .from('asset_components')
        .update({
          component_serial: componentSerial,
          status: 'harvested',
          harvested_date: new Date().toISOString(),
        })
        .eq('id', selectedComponent.id);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('component_transactions')
        .insert({
          company_id: companyId,
          transaction_type: 'harvest',
          component_id: selectedComponent.id,
          source_asset_id: assetId,
          component_type: selectedComponent.component_type,
          component_name: selectedComponent.component_name,
          quantity: selectedComponent.quantity,
          reason: 'Harvested for reuse',
        });

      if (txError) throw txError;

      const { error: invError } = await supabase
        .from('harvested_components_inventory')
        .insert({
          company_id: companyId,
          component_serial: componentSerial,
          component_type: selectedComponent.component_type,
          component_name: selectedComponent.component_name,
          capacity: selectedComponent.capacity,
          technology_type: selectedComponent.technology_type,
          manufacturer: selectedComponent.manufacturer,
          source_asset_id: assetId,
          source_serial_number: serialNumber,
          quantity_available: 1,
          market_value_at_harvest: marketValueNum,
          value_source: suggestedPrice?.source === 'template' ? 'template' : 'manual',
          harvest_date: new Date().toISOString(),
          harvested_by: userId
        });

      if (invError) throw invError;

      showToast(`${selectedComponent.component_name} (S/N: ${componentSerial}) harvested at $${marketValueNum.toFixed(2)}`, 'success');
      setShowHarvestModal(false);
      setSelectedComponent(null);
      setComponentSerial('');
      setMarketValue('');
      setSuggestedPrice(null);
      await recalculateAssetSpecifications();
      fetchComponents();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleBarcodeScan = async () => {
    if (!scannedBarcode.trim()) return;

    try {
      const { data, error } = await supabase
        .from('harvested_components_inventory')
        .select('*')
        .eq('company_id', companyId)
        .eq('component_serial', scannedBarcode.trim())
        .gt('quantity_available', 0)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAvailableComponents([data]);
        showToast(`Found component: ${data.component_name} (S/N: ${data.component_serial})`, 'success');
        setShowInstallModal(true);
      } else {
        showToast(`No available component found with serial: ${scannedBarcode}`, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleInstallComponent = async (harvestedComp: any) => {
    try {
      const { data: existingComponent } = await supabase
        .from('asset_components')
        .select('id')
        .eq('component_serial', harvestedComp.component_serial)
        .eq('asset_id', assetId)
        .eq('status', 'harvested')
        .maybeSingle();

      if (existingComponent) {
        const { error: updateError } = await supabase
          .from('asset_components')
          .update({
            status: 'installed',
            condition: 'working'
          })
          .eq('id', existingComponent.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('asset_components')
          .insert({
            company_id: companyId,
            asset_id: assetId,
            component_serial: harvestedComp.component_serial,
            component_type: harvestedComp.component_type,
            component_name: harvestedComp.component_name,
            capacity: harvestedComp.capacity,
            technology_type: harvestedComp.technology_type,
            manufacturer: harvestedComp.manufacturer,
            quantity: 1,
            status: 'installed',
            condition: 'working',
          });

        if (insertError) throw insertError;
      }

      const { error: updateError } = await supabase
        .from('harvested_components_inventory')
        .update({ quantity_available: 0 })
        .eq('id', harvestedComp.id);

      if (updateError) throw updateError;

      const { error: txError } = await supabase.from('component_transactions').insert({
        company_id: companyId,
        transaction_type: 'install',
        component_id: harvestedComp.id,
        destination_asset_id: assetId,
        component_type: harvestedComp.component_type,
        component_name: harvestedComp.component_name,
        quantity: 1,
        reason: `Installed component S/N: ${harvestedComp.component_serial} into ${serialNumber}`,
      });

      if (txError) throw txError;

      showToast(`${harvestedComp.component_name} (S/N: ${harvestedComp.component_serial}) installed into ${serialNumber}`, 'success');
      setShowInstallModal(false);
      setShowBarcodeScanner(false);
      setScannedBarcode('');
      await recalculateAssetSpecifications();
      fetchComponents();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'RAM':
        return <Cpu className="w-5 h-5 text-blue-600" />;
      case 'HDD':
      case 'SSD':
      case 'NVMe':
      case 'Storage':
        return <HardDrive className="w-5 h-5 text-green-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDisplayComponentType = (type: string) => {
    switch (type) {
      case 'HDD':
      case 'SSD':
      case 'NVMe':
        return 'Storage';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'installed':
        return 'bg-green-100 text-green-800';
      case 'harvested':
        return 'bg-orange-100 text-orange-800';
      case 'transferred':
        return 'bg-blue-100 text-blue-800';
      case 'disposed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading components...</div>;
  }

  if (components.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No components tracked for this asset</p>
        <p className="text-sm mt-1">Components are auto-created from RAM and Storage specs</p>
      </div>
    );
  }

  const groupedComponents = components.reduce((acc, comp) => {
    // Normalize component type to uppercase for consistent grouping
    const normalizedType = comp.component_type.toUpperCase();
    if (!acc[normalizedType]) {
      acc[normalizedType] = [];
    }
    acc[normalizedType].push(comp);
    return acc;
  }, {} as Record<string, Component[]>);

  return (
    <div className="space-y-4">
      {/* Install Component Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Barcode className="w-4 h-4" />
          Scan to Install Component
        </button>
      </div>

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
                placeholder="Scan component serial number..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <button
              onClick={handleBarcodeScan}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Scan the serial number printed on the physical component
          </p>
        </div>
      )}

      {Object.entries(groupedComponents).map(([type, comps]) => (
        <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
            {getComponentIcon(type)}
            <h3 className="font-medium text-gray-900">
              {getDisplayComponentType(type)} ({comps.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {comps.map((component) => (
              <div
                key={component.id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {component.capacity}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          component.status
                        )}`}
                      >
                        {component.status}
                      </span>
                      {component.quantity > 1 && (
                        <span className="text-sm text-gray-600">
                          Qty: {component.quantity}
                        </span>
                      )}
                    </div>

                    {component.manufacturer && (
                      <div className="text-sm text-gray-600">
                        {component.manufacturer}
                        {component.model_number && ` - ${component.model_number}`}
                      </div>
                    )}

                    {component.notes && (
                      <div className="text-sm text-gray-500 mt-1">
                        {component.notes}
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-1">
                      Installed: {new Date(component.installed_date).toLocaleDateString()}
                      {component.harvested_date && (
                        <> | Harvested: {new Date(component.harvested_date).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>

                  {component.status === 'installed' && (
                    <button
                      onClick={() => handleHarvest(component)}
                      className="ml-4 px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Harvest
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showHarvestModal && selectedComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Harvest Component
              </h3>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  This will remove the component from asset <strong>{serialNumber}</strong> and
                  add it to the harvested components inventory.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  {getComponentIcon(selectedComponent.component_type)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedComponent.component_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedComponent.capacity}
                      {selectedComponent.technology_type && ` • ${selectedComponent.technology_type}`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Serial Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={componentSerial}
                  onChange={(e) => setComponentSerial(e.target.value)}
                  placeholder="Scan or type serial number from component..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Read the serial number from the physical component sticker/label
                </p>
              </div>

              {suggestedPrice && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-900 mb-2">Price Suggestions</div>
                  <div className="space-y-1 text-sm">
                    {suggestedPrice.template_price && (
                      <div className="text-green-800">
                        Template Price: <strong>${suggestedPrice.template_price.toFixed(2)}</strong>
                      </div>
                    )}
                    {suggestedPrice.recent_average && (
                      <div className="text-green-700">
                        Recent Avg (30d): ${suggestedPrice.recent_average.toFixed(2)}
                      </div>
                    )}
                    {suggestedPrice.last_harvest_price && (
                      <div className="text-green-700">
                        Last Harvest: ${suggestedPrice.last_harvest_price.toFixed(2)}
                        {suggestedPrice.last_harvest_date && (
                          <span className="text-green-600 ml-1">
                            ({new Date(suggestedPrice.last_harvest_date).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Market Value (USD) <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={marketValue}
                    onChange={(e) => setMarketValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current market value for this component (used for P/L calculation)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowHarvestModal(false);
                    setSelectedComponent(null);
                    setComponentSerial('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmHarvest}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  Confirm Harvest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Component Modal */}
      {showInstallModal && availableComponents.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Install Component into {serialNumber}
              </h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Select a component from harvested inventory to install into this asset.
                </p>
              </div>

              <div className="space-y-3">
                {availableComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {getComponentIcon(comp.component_type)}
                        <div>
                          <div className="font-medium text-gray-900">
                            {comp.capacity}
                            {comp.technology_type && (
                              <span className="ml-2 text-sm text-blue-600">
                                ({comp.technology_type})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {comp.component_type}
                            {comp.manufacturer && ` • ${comp.manufacturer}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Available: {comp.quantity_available} units
                            {comp.source_serial_number && ` • From: ${comp.source_serial_number}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInstallComponent(comp)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Install
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowInstallModal(false);
                    setAvailableComponents([]);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
