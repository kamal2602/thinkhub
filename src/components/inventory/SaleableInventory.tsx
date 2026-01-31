import { useState, useEffect } from 'react';
import { Package, Search, Grid, List, Filter, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

interface Asset {
  id: string;
  serial_number: string;
  brand: string;
  model: string;
  processing_stage: string;
  cosmetic_grade: string;
  functional_status: string;
  status: string;
  location_id: string;
  purchase_lot_id: string;
  locations: {
    name: string;
  } | null;
  grade_info?: {
    grade: string;
    color: string;
  };
  product_types: {
    name: string;
  } | null;
  purchase_lots: {
    lot_number: string;
  } | null;
}

interface GroupedAssets {
  [key: string]: Asset[];
}

export function SaleableInventory() {
  const { selectedCompany } = useCompany();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [grades, setGrades] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      fetchAssets();
      fetchGrades();
    }
  }, [selectedCompany]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          locations(name),
          product_types(name),
          purchase_lots(lot_number)
        `)
        .eq('company_id', selectedCompany?.id)
        .ilike('processing_stage', 'ready')
        .order('brand')
        .order('model');

      if (error) throw error;

      const gradesData = await supabase
        .from('cosmetic_grades')
        .select('*')
        .eq('company_id', selectedCompany?.id);

      const gradesMap = new Map(
        (gradesData.data || []).map(g => [g.grade, { grade: g.grade, color: g.color }])
      );

      const assetsWithGrades = (data || []).map(asset => ({
        ...asset,
        grade_info: gradesMap.get(asset.cosmetic_grade)
      }));

      setAssets(assetsWithGrades);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('cosmetic_grades')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('name');

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch =
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.product_types?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrade = filterGrade === 'all' || asset.cosmetic_grade === filterGrade;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;

    return matchesSearch && matchesGrade && matchesStatus;
  });

  const groupedAssets: GroupedAssets = filteredAssets.reduce((acc, asset) => {
    const key = `${asset.brand} ${asset.model} - Grade ${asset.grade_info?.grade || asset.cosmetic_grade || 'Unknown'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(asset);
    return acc;
  }, {} as GroupedAssets);

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ready to Sell</h1>
        <p className="text-gray-600">Ready-to-sell assets grouped by model and grade</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by serial, model, brand..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Grades</option>
              {grades.map(grade => (
                <option key={grade.id} value={grade.id}>{grade.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Reserved">Reserved</option>
              <option value="Sold">Sold</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : Object.keys(groupedAssets).length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items ready to sell</h3>
          <p className="text-gray-600">Assets will appear here once they reach "Ready" status in Processing</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([groupKey, groupAssets]) => {
            const firstAsset = groupAssets[0];
            const gradeColor = firstAsset.grade_info?.color || '#6b7280';

            return (
              <div key={groupKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{groupKey}</h3>
                        <p className="text-sm text-gray-600">
                          {groupAssets.length} unit{groupAssets.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${gradeColor}20`,
                          color: gradeColor
                        }}
                      >
                        Grade {firstAsset.grade_info?.grade || firstAsset.cosmetic_grade || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                    {groupAssets.map(asset => (
                      <div key={asset.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {asset.serial_number}
                            </span>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              {asset.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <span>{asset.product_types?.name || 'Unknown'}</span>
                            </div>
                            <div className="mt-1">{asset.locations?.name || 'No Location'}</div>
                            {asset.purchase_lots?.lot_number && (
                              <div className="text-xs text-gray-500 mt-1">
                                Lot: {asset.purchase_lots.lot_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupAssets.map(asset => (
                          <tr key={asset.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                              {asset.serial_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {asset.product_types?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {asset.locations?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                {asset.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {asset.purchase_lots?.lot_number || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Filter className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Viewing Ready Assets Only</h4>
            <p className="text-sm text-blue-700">
              This page shows assets with "Ready" status. Total: <strong>{filteredAssets.length}</strong> units in <strong>{Object.keys(groupedAssets).length}</strong> model/grade groups
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
