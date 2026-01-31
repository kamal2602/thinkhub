import { useState, useEffect } from 'react';
import { Search, Package, Grid, List as ListIcon, Copy, LayoutGrid } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AssetDetails } from './AssetDetails';
import { AssetForm } from './AssetForm';
import { AssetGridView } from './AssetGridView';
import { ProcessingKanban } from './ProcessingKanban';
import { ProcessingDashboard } from './ProcessingDashboard';
import { ScannerBar } from './ScannerBar';

interface Asset {
  id: string;
  serial_number: string;
  imei: string;
  brand: string;
  model: string;
  cosmetic_grade: string;
  functional_status: string;
  refurbishment_status: string;
  status: string;
  purchase_price: number;
  refurbishment_cost: number;
  selling_price: number;
  created_at: string;
  processing_stage: string;
  assigned_technician_id: string | null;
  stage_started_at: string;
  is_priority: boolean;
  processing_notes: string;
  product_types?: {
    name: string;
  };
  locations?: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

export function Processing() {
  const { selectedCompany } = useCompany();
  const { userRole } = useAuth();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'grid'>('kanban');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [cosmeticGrades, setCosmeticGrades] = useState<any[]>([]);
  const [cosmeticGradeColors, setCosmeticGradeColors] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchAssets();
      fetchCosmeticGrades();
      fetchStages();

      const channel = supabase
        .channel(`assets-${selectedCompany.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assets',
            filter: `company_id=eq.${selectedCompany.id}`
          },
          (payload) => {
            console.log('Asset change detected:', payload);
            fetchAssets();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedCompany]);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm, statusFilter, gradeFilter]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          product_types(name),
          locations(name)
        `)
        .eq('company_id', selectedCompany?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const assetsWithTechnicians = await Promise.all(
        (data || []).map(async (asset) => {
          if (asset.assigned_technician_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', asset.assigned_technician_id)
              .maybeSingle();

            return { ...asset, profiles: profile };
          }
          return asset;
        })
      );

      setAssets(assetsWithTechnicians);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCosmeticGrades = async () => {
    const { data } = await supabase
      .from('cosmetic_grades')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('sort_order');
    setCosmeticGrades(data || []);

    const colorMap: Record<string, string> = {};
    (data || []).forEach((grade: any) => {
      colorMap[grade.grade] = grade.color || '#6B7280';
    });
    setCosmeticGradeColors(colorMap);
  };

  const fetchStages = async () => {
    const { data } = await supabase
      .from('processing_stages')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .eq('is_active', true)
      .order('stage_order');
    setStages(data || []);
  };


  const filterAssets = () => {
    let filtered = assets;

    if (searchTerm) {
      filtered = filtered.filter(
        (asset) =>
          asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.imei?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.model?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    if (gradeFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.cosmetic_grade === gradeFilter);
    }

    setFilteredAssets(filtered);
  };

  const getStatusBadgeColor = (status: string) => {
    return 'text-white';
  };

  const getStatusBadgeStyle = (status: string) => {
    return { backgroundColor: '#6B7280' };
  };

  const getGradeBadgeColor = (grade: string) => {
    const color = cosmeticGradeColors[grade] || '#6B7280';
    return `text-white`;
  };

  const getGradeBadgeStyle = (grade: string) => {
    const color = cosmeticGradeColors[grade] || '#6B7280';
    return { backgroundColor: color };
  };

  const openDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowDetails(true);
  };

  const openForm = async (asset: Asset) => {
    const { data: fullAsset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', asset.id)
      .maybeSingle();

    if (error) {
      toast.error('Failed to load asset details');
      return;
    }

    setSelectedAsset(fullAsset);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedAsset(null);
    fetchAssets();
  };

  const handleDetailsClose = () => {
    setShowDetails(false);
    setSelectedAsset(null);
    fetchAssets();
  };

  const toggleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedAssets.size === 0) return;

    try {
      const { error } = await supabase
        .from('assets')
        .update({ status: newStatus })
        .in('id', Array.from(selectedAssets));

      if (error) throw error;

      toast.success(`Updated ${selectedAssets.size} asset(s) to ${newStatus}`, {
        label: 'Undo',
        onClick: () => toast.info('Undo feature coming soon'),
      });

      setSelectedAssets(new Set());
      fetchAssets();
    } catch (error: any) {
      toast.error('Failed to update assets: ' + error.message);
    }
  };

  const bulkDelete = async () => {
    if (selectedAssets.size === 0) return;
    if (!confirm(`Delete ${selectedAssets.size} asset(s)? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .in('id', Array.from(selectedAssets));

      if (error) throw error;

      toast.success(`Deleted ${selectedAssets.size} asset(s)`);
      setSelectedAssets(new Set());
      fetchAssets();
    } catch (error: any) {
      toast.error('Failed to delete assets: ' + error.message);
    }
  };

  const cloneAsset = async (asset: Asset) => {
    try {
      const { id, serial_number, imei, created_at, ...assetData } = asset;

      const { error } = await supabase
        .from('assets')
        .insert({
          ...assetData,
          serial_number: serial_number + '-COPY',
          imei: imei ? imei + '-COPY' : null,
        });

      if (error) throw error;

      toast.success('Asset cloned successfully', {
        label: 'View',
        onClick: () => fetchAssets(),
      });
      fetchAssets();
    } catch (error: any) {
      toast.error('Failed to clone asset: ' + error.message);
    }
  };

  const handleStageChange = async (assetId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ processing_stage: newStage })
        .eq('id', assetId);

      if (error) throw error;

      toast.success('Stage updated successfully');
      fetchAssets();
    } catch (error: any) {
      toast.error('Failed to update stage: ' + error.message);
    }
  };

  const calculateDashboardStats = () => {
    const stats = {
      received: assets.filter(a => a.processing_stage === 'received').length,
      testing: assets.filter(a => a.processing_stage === 'testing').length,
      refurbishing: assets.filter(a => a.processing_stage === 'refurbishing').length,
      qc_grading: assets.filter(a => a.processing_stage === 'qc_grading').length,
      ready: assets.filter(a => a.processing_stage === 'ready').length,
      totalValue: assets.reduce((sum, a) => sum + (a.purchase_price || 0) + (a.refurbishment_cost || 0), 0),
      avgDays: 0,
      staleCount: 0,
      priorityCount: assets.filter(a => a.is_priority).length,
    };

    let totalDays = 0;
    let countWithDays = 0;

    assets.forEach(asset => {
      if (asset.stage_started_at) {
        const start = new Date(asset.stage_started_at);
        const now = new Date();
        const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
        countWithDays++;

        if (days > 7) {
          stats.staleCount++;
        }
      }
    });

    stats.avgDays = countWithDays > 0 ? totalDays / countWithDays : 0;

    return stats;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showForm) setShowForm(false);
        if (showDetails) setShowDetails(false);
        setSelectedAssets(new Set());
      }

      if (e.key === '/' && !showForm && !showDetails) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showDetails]);

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company first.</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return <AssetForm asset={selectedAsset || undefined} onClose={handleFormClose} />;
  }

  if (showDetails && selectedAsset) {
    return <AssetDetails asset={selectedAsset} onClose={handleDetailsClose} onEdit={() => {
      setShowDetails(false);
      openForm(selectedAsset);
    }} />;
  }

  return (
    <div className="flex flex-col h-full">
      <ScannerBar
        onAssetScanned={fetchAssets}
        onAssetOpened={async (assetId) => {
          const { data: freshAsset, error } = await supabase
            .from('assets')
            .select(`
              *,
              product_types(name),
              locations(name)
            `)
            .eq('id', assetId)
            .maybeSingle();

          if (!error && freshAsset) {
            if (freshAsset.assigned_technician_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', freshAsset.assigned_technician_id)
                .maybeSingle();
              freshAsset.profiles = profile;
            }
            openDetails(freshAsset);
          }
          fetchAssets();
        }}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Processing</h1>
            <p className="text-gray-600">
              Scan serial numbers above to open and process assets
            </p>
          </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} transition`}
              title="Kanban view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} transition`}
              title="Table view"
            >
              <ListIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} transition`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {selectedAssets.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedAssets.size} asset(s) selected
              </span>
              <button
                onClick={() => setSelectedAssets(new Set())}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-1.5 text-sm border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Update Status...</option>
                <option value="In Stock">In Stock</option>
                <option value="Refurbishment">Refurbishment</option>
                <option value="Listed">Listed</option>
                <option value="Reserved">Reserved</option>
                <option value="Sold">Sold</option>
                <option value="RMA">RMA</option>
              </select>
              <button
                onClick={bulkDelete}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <ProcessingKanban
          assets={filteredAssets}
          onAssetClick={openDetails}
          onStageChange={handleStageChange}
          gradeColors={cosmeticGradeColors}
          stages={stages}
        />
      ) : viewMode === 'grid' ? (
        <AssetGridView
          assets={filteredAssets}
          selectedAssets={selectedAssets}
          onToggleSelection={toggleAssetSelection}
          onOpenDetails={openDetails}
          onClone={cloneAsset}
          getStatusBadgeColor={getStatusBadgeColor}
          getGradeBadgeColor={getGradeBadgeColor}
          getGradeBadgeStyle={getGradeBadgeStyle}
          getStatusBadgeStyle={getStatusBadgeStyle}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`hover:bg-gray-50 transition ${selectedAssets.has(asset.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleAssetSelection(asset.id);
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openDetails(asset)}>
                      <div className="text-sm font-medium text-gray-900">{asset.serial_number}</div>
                      {asset.imei && (
                        <div className="text-xs text-gray-500">IMEI: {asset.imei}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openDetails(asset)}>
                      <div className="text-sm text-gray-900">{asset.brand}</div>
                      <div className="text-xs text-gray-500">{asset.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => openDetails(asset)}>
                      {asset.product_types?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openDetails(asset)}>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeBadgeColor(asset.cosmetic_grade)}`}
                        style={getGradeBadgeStyle(asset.cosmetic_grade)}
                      >
                        {asset.cosmetic_grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openDetails(asset)}>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(asset.status)}`}
                        style={getStatusBadgeStyle(asset.status)}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => openDetails(asset)}>
                      {asset.locations?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openDetails(asset)}>
                      <div className="text-sm text-gray-900">
                        ${asset.selling_price?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cost: ${(asset.purchase_price + asset.refurbishment_cost)?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cloneAsset(asset);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                        title="Clone asset"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No assets found</p>
            </div>
          )}
        </div>
      )}

      {!loading && <ProcessingDashboard stats={calculateDashboardStats()} />}
      </div>

    </div>
  );
}
