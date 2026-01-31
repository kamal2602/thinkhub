import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Cpu, HardDrive, Package, Search, Barcode, FileText } from 'lucide-react';

interface HarvestedComponent {
  id: string;
  component_type: string;
  component_name: string;
  component_serial: string;
  capacity: string;
  technology_type?: string;
  manufacturer?: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_defective: number;
  source_asset_id?: string;
  source_serial_number?: string;
  bin_location?: string;
  estimated_value?: number;
}

interface GroupedComponents {
  [componentType: string]: {
    [technologyType: string]: {
      [capacity: string]: HarvestedComponent[];
    };
  };
}

export default function HarvestedComponentsEnhanced() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [components, setComponents] = useState<HarvestedComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  useEffect(() => {
    if (selectedCompany) {
      fetchComponents();
    }
  }, [selectedCompany]);

  const fetchComponents = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('harvested_components_inventory')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('component_type', { ascending: true })
        .order('technology_type', { ascending: true })
        .order('capacity', { ascending: true });

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async () => {
    if (!scannedCode.trim()) return;

    try {
      // Try to find component by source serial number
      const { data, error } = await supabase
        .from('harvested_components_inventory')
        .select('*, assets(serial_number)')
        .eq('company_id', selectedCompany?.id)
        .or(`source_serial_number.eq.${scannedCode},source_asset_id.in.(select id from assets where serial_number='${scannedCode}')`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        showToast(`Found: ${data.component_name} from asset ${data.source_serial_number || 'Unknown'}`, 'success');
        // Highlight the found component
        setSearchTerm(data.component_name);
      } else {
        showToast('Component not found with that serial/barcode', 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const groupComponentsByTechnology = (): GroupedComponents => {
    const grouped: GroupedComponents = {};

    components.forEach((comp) => {
      const type = comp.component_type;
      const tech = comp.technology_type || 'Unknown';
      const capacity = comp.capacity;

      if (!grouped[type]) {
        grouped[type] = {};
      }
      if (!grouped[type][tech]) {
        grouped[type][tech] = {};
      }
      if (!grouped[type][tech][capacity]) {
        grouped[type][tech][capacity] = [];
      }

      grouped[type][tech][capacity].push(comp);
    });

    return grouped;
  };

  const filteredComponents = components.filter((comp) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      comp.component_name.toLowerCase().includes(searchLower) ||
      comp.capacity.toLowerCase().includes(searchLower) ||
      comp.technology_type?.toLowerCase().includes(searchLower) ||
      comp.source_serial_number?.toLowerCase().includes(searchLower)
    );
  });

  const groupedComponents = groupComponentsByTechnology();
  const filteredGrouped = Object.entries(groupedComponents).reduce((acc, [type, techs]) => {
    const filteredTechs = Object.entries(techs).reduce((techAcc, [tech, capacities]) => {
      const filteredCapacities = Object.entries(capacities).reduce((capAcc, [capacity, comps]) => {
        const filtered = comps.filter(comp => filteredComponents.includes(comp));
        if (filtered.length > 0) {
          capAcc[capacity] = filtered;
        }
        return capAcc;
      }, {} as { [key: string]: HarvestedComponent[] });

      if (Object.keys(filteredCapacities).length > 0) {
        techAcc[tech] = filteredCapacities;
      }
      return techAcc;
    }, {} as { [key: string]: { [key: string]: HarvestedComponent[] } });

    if (Object.keys(filteredTechs).length > 0) {
      acc[type] = filteredTechs;
    }
    return acc;
  }, {} as GroupedComponents);

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'RAM':
        return <Cpu className="w-5 h-5 text-blue-600" />;
      case 'HDD':
      case 'SSD':
      case 'NVMe':
        return <HardDrive className="w-5 h-5 text-green-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTechnologyColor = (tech: string) => {
    const colors: { [key: string]: string } = {
      'DDR5': 'bg-purple-100 text-purple-800',
      'DDR4': 'bg-blue-100 text-blue-800',
      'DDR3': 'bg-cyan-100 text-cyan-800',
      'NVMe': 'bg-green-100 text-green-800',
      'M.2': 'bg-teal-100 text-teal-800',
      'SSD': 'bg-emerald-100 text-emerald-800',
      'HDD': 'bg-amber-100 text-amber-800',
    };
    return colors[tech] || 'bg-gray-100 text-gray-800';
  };

  const totalAvailable = components.reduce((sum, comp) => sum + comp.quantity_available, 0);
  const totalValue = components.reduce((sum, comp) => sum + (comp.estimated_value || 0) * comp.quantity_available, 0);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Harvested Components Inventory</h1>
          <p className="text-gray-600 mt-1">Available components for reuse and sale</p>
        </div>
        <button
          onClick={() => setShowScanner(!showScanner)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Barcode className="w-5 h-5" />
          Scan Barcode
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Components</div>
          <div className="text-2xl font-bold text-gray-900">{totalAvailable}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Component Types</div>
          <div className="text-2xl font-bold text-gray-900">{components.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Estimated Value</div>
          <div className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Barcode Scanner */}
      {showScanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
                placeholder="Scan or enter asset serial number..."
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
            Enter the serial number of the asset to find components harvested from it
          </p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, capacity, technology, or source serial..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Grouped Components */}
      <div className="space-y-6">
        {Object.entries(filteredGrouped).map(([componentType, technologies]) => (
          <div key={componentType} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {getComponentIcon(componentType)}
                <h2 className="text-lg font-semibold text-gray-900">{componentType}</h2>
                <span className="text-sm text-gray-500">
                  ({Object.values(technologies).flatMap(caps => Object.values(caps)).flat().reduce((sum, c) => sum + (c.quantity_available || 0), 0)} units)
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {Object.entries(technologies).map(([technologyType, capacities]) => (
                <div key={technologyType} className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTechnologyColor(technologyType)}`}>
                      {technologyType}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({Object.values(capacities).flat().reduce((sum, c) => sum + (c.quantity_available || 0), 0)} units)
                    </span>
                  </div>

                  {Object.entries(capacities).map(([capacity, comps]) => (
                    <div key={capacity} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-900">{capacity}</h4>
                        <span className="text-sm text-gray-600">
                          Total: {comps.reduce((sum, c) => sum + c.quantity_available, 0)} units
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comps.map((comp) => (
                          <div key={comp.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition">
                            <div className="flex items-center gap-2 mb-2">
                              <Barcode className="w-4 h-4 text-gray-400" />
                              <div className="font-mono text-sm font-medium text-gray-900">
                                {comp.component_serial}
                              </div>
                            </div>

                            <div className="flex items-start justify-between mb-2">
                              <div>
                                {comp.manufacturer && (
                                  <div className="text-sm text-gray-600">{comp.manufacturer}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${comp.quantity_available > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {comp.quantity_available > 0 ? 'Available' : 'Installed'}
                                </div>
                              </div>
                            </div>

                            {(comp.quantity_reserved > 0 || comp.quantity_defective > 0) && (
                              <div className="flex gap-3 text-xs text-gray-600 mb-2">
                                {comp.quantity_reserved > 0 && (
                                  <span>Reserved: {comp.quantity_reserved}</span>
                                )}
                                {comp.quantity_defective > 0 && (
                                  <span className="text-red-600">Defective: {comp.quantity_defective}</span>
                                )}
                              </div>
                            )}

                            {comp.source_serial_number && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pt-2 border-t">
                                <FileText className="w-3 h-3" />
                                <span>From: {comp.source_serial_number}</span>
                              </div>
                            )}

                            {comp.bin_location && (
                              <div className="text-xs text-gray-500 mt-1">
                                Location: {comp.bin_location}
                              </div>
                            )}

                            {comp.estimated_value && (
                              <div className="text-sm font-medium text-gray-900 mt-2">
                                ${comp.estimated_value.toFixed(2)} each
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredComponents.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Components Found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'Harvest components from assets to build inventory'}
          </p>
        </div>
      )}
    </div>
  );
}
