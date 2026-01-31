import React, { useState, useEffect } from 'react';
import { Leaf, TrendingUp, Calendar, Download, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface EnvironmentalMetrics {
  total_assets: number;
  total_weight_kg: number;
  resold_weight_kg: number;
  recycled_weight_kg: number;
  scrapped_weight_kg: number;
  landfill_weight_kg: number;
  donated_weight_kg: number;
  recycling_percentage: number;
  landfill_diversion_percentage: number;
}

interface EnvironmentalReport {
  id: string;
  report_name: string;
  report_period_start: string;
  report_period_end: string;
  total_assets_processed: number;
  total_weight_kg: number;
  resold_weight_kg: number;
  recycled_weight_kg: number;
  scrapped_weight_kg: number;
  landfill_weight_kg: number;
  donated_weight_kg: number;
  recycling_percentage: number;
  landfill_diversion_percentage: number;
  co2_offset_kg: number;
  created_at: string;
  profiles: {
    email: string;
  };
}

export function EnvironmentalCompliance() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<EnvironmentalMetrics>({
    total_assets: 0,
    total_weight_kg: 0,
    resold_weight_kg: 0,
    recycled_weight_kg: 0,
    scrapped_weight_kg: 0,
    landfill_weight_kg: 0,
    donated_weight_kg: 0,
    recycling_percentage: 0,
    landfill_diversion_percentage: 0
  });
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formData, setFormData] = useState({
    report_name: '',
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchMetrics();
      fetchReports();
    }
  }, [selectedCompany?.id]);

  const fetchMetrics = async () => {
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('weight_kg, disposal_method')
        .eq('company_id', selectedCompany?.id)
        .not('disposal_method', 'is', null);

      if (error) throw error;

      const totalAssets = assets?.length || 0;
      const totalWeight = assets?.reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const resoldWeight = assets?.filter(a => a.disposal_method === 'resale').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const recycledWeight = assets?.filter(a => a.disposal_method === 'recycle').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const scrappedWeight = assets?.filter(a => a.disposal_method === 'scrap').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const landfillWeight = assets?.filter(a => a.disposal_method === 'landfill').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const donatedWeight = assets?.filter(a => a.disposal_method === 'donation').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;

      const recyclingPercentage = totalWeight > 0 ? ((recycledWeight + resoldWeight + donatedWeight) / totalWeight) * 100 : 0;
      const landfillDiversionPercentage = totalWeight > 0 ? ((totalWeight - landfillWeight) / totalWeight) * 100 : 0;

      setMetrics({
        total_assets: totalAssets,
        total_weight_kg: totalWeight,
        resold_weight_kg: resoldWeight,
        recycled_weight_kg: recycledWeight,
        scrapped_weight_kg: scrappedWeight,
        landfill_weight_kg: landfillWeight,
        donated_weight_kg: donatedWeight,
        recycling_percentage: recyclingPercentage,
        landfill_diversion_percentage: landfillDiversionPercentage
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('environmental_reports')
        .select(`
          *,
          profiles (email)
        `)
        .eq('company_id', selectedCompany?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('weight_kg, disposal_method, disposal_date')
        .eq('company_id', selectedCompany?.id)
        .not('disposal_method', 'is', null)
        .gte('disposal_date', formData.start_date)
        .lte('disposal_date', formData.end_date);

      if (assetsError) throw assetsError;

      const totalAssets = assets?.length || 0;
      const totalWeight = assets?.reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const resoldWeight = assets?.filter(a => a.disposal_method === 'resale').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const recycledWeight = assets?.filter(a => a.disposal_method === 'recycle').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const scrappedWeight = assets?.filter(a => a.disposal_method === 'scrap').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const landfillWeight = assets?.filter(a => a.disposal_method === 'landfill').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;
      const donatedWeight = assets?.filter(a => a.disposal_method === 'donation').reduce((sum, a) => sum + (a.weight_kg || 0), 0) || 0;

      const recyclingPercentage = totalWeight > 0 ? ((recycledWeight + resoldWeight + donatedWeight) / totalWeight) * 100 : 0;
      const landfillDiversionPercentage = totalWeight > 0 ? ((totalWeight - landfillWeight) / totalWeight) * 100 : 0;
      const co2Offset = (recycledWeight + resoldWeight) * 2.5;

      const { error: insertError } = await supabase
        .from('environmental_reports')
        .insert({
          company_id: selectedCompany?.id,
          report_name: formData.report_name,
          report_period_start: formData.start_date,
          report_period_end: formData.end_date,
          total_assets_processed: totalAssets,
          total_weight_kg: totalWeight,
          resold_weight_kg: resoldWeight,
          recycled_weight_kg: recycledWeight,
          scrapped_weight_kg: scrappedWeight,
          landfill_weight_kg: landfillWeight,
          donated_weight_kg: donatedWeight,
          recycling_percentage: recyclingPercentage,
          landfill_diversion_percentage: landfillDiversionPercentage,
          co2_offset_kg: co2Offset,
          generated_by: user?.id
        });

      if (insertError) throw insertError;

      showToast('Environmental report generated successfully', 'success');
      setShowGenerateModal(false);
      setFormData({
        report_name: '',
        start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });
      fetchReports();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading environmental data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Environmental Compliance</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track recycling metrics, landfill diversion, and environmental impact
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Weight Processed</div>
            <Leaf className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.total_weight_kg.toFixed(2)} kg</div>
          <div className="text-xs text-gray-500 mt-1">{metrics.total_assets} assets</div>
        </div>

        <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-green-700">Recycling Rate</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{metrics.recycling_percentage.toFixed(1)}%</div>
          <div className="text-xs text-green-600 mt-1">
            {(metrics.recycled_weight_kg + metrics.resold_weight_kg + metrics.donated_weight_kg).toFixed(2)} kg recycled/reused
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-700">Landfill Diversion</div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">{metrics.landfill_diversion_percentage.toFixed(1)}%</div>
          <div className="text-xs text-blue-600 mt-1">
            {(metrics.total_weight_kg - metrics.landfill_weight_kg).toFixed(2)} kg diverted
          </div>
        </div>

        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-red-700">Landfill</div>
          </div>
          <div className="text-2xl font-bold text-red-900">{metrics.landfill_weight_kg.toFixed(2)} kg</div>
          <div className="text-xs text-red-600 mt-1">
            {metrics.total_weight_kg > 0 ? ((metrics.landfill_weight_kg / metrics.total_weight_kg) * 100).toFixed(1) : 0}% of total
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disposal Method Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Resale</div>
            <div className="text-xl font-bold text-green-900 mt-1">{metrics.resold_weight_kg.toFixed(2)} kg</div>
            <div className="text-xs text-green-600 mt-1">
              {metrics.total_weight_kg > 0 ? ((metrics.resold_weight_kg / metrics.total_weight_kg) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Recycled</div>
            <div className="text-xl font-bold text-blue-900 mt-1">{metrics.recycled_weight_kg.toFixed(2)} kg</div>
            <div className="text-xs text-blue-600 mt-1">
              {metrics.total_weight_kg > 0 ? ((metrics.recycled_weight_kg / metrics.total_weight_kg) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Scrapped</div>
            <div className="text-xl font-bold text-yellow-900 mt-1">{metrics.scrapped_weight_kg.toFixed(2)} kg</div>
            <div className="text-xs text-yellow-600 mt-1">
              {metrics.total_weight_kg > 0 ? ((metrics.scrapped_weight_kg / metrics.total_weight_kg) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Donated</div>
            <div className="text-xl font-bold text-purple-900 mt-1">{metrics.donated_weight_kg.toFixed(2)} kg</div>
            <div className="text-xs text-purple-600 mt-1">
              {metrics.total_weight_kg > 0 ? ((metrics.donated_weight_kg / metrics.total_weight_kg) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Landfill</div>
            <div className="text-xl font-bold text-red-900 mt-1">{metrics.landfill_weight_kg.toFixed(2)} kg</div>
            <div className="text-xs text-red-600 mt-1">
              {metrics.total_weight_kg > 0 ? ((metrics.landfill_weight_kg / metrics.total_weight_kg) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Reports</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recycling Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CO2 Offset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{report.report_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(report.report_period_start).toLocaleDateString()} - {new Date(report.report_period_end).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.total_assets_processed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.total_weight_kg?.toFixed(2)} kg</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      report.recycling_percentage >= 80 ? 'bg-green-100 text-green-800' :
                      report.recycling_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.recycling_percentage?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.co2_offset_kg?.toFixed(2)} kg</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.profiles?.email}</div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No reports generated yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Generate Environmental Report</h3>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={generateReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={formData.report_name}
                    onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Q1 2026 Environmental Report"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    This report will include all assets with disposal methods recorded within the specified date range.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Generate Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
