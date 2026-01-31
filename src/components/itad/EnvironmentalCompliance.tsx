import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Leaf, TrendingUp, Droplet, Zap, Recycle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface EnvironmentalReport {
  id: string;
  itad_project_id: string;
  total_weight_processed_kg: number;
  weight_reused_kg: number;
  weight_recycled_kg: number;
  weight_donated_kg: number;
  weight_scrapped_kg: number;
  weight_landfill_kg: number;
  co2_emissions_saved_kg: number;
  water_saved_liters: number;
  energy_saved_kwh: number;
  materials_aluminum_kg: number;
  materials_copper_kg: number;
  materials_steel_kg: number;
  materials_plastic_kg: number;
  materials_gold_g: number;
  materials_silver_g: number;
  materials_palladium_g: number;
  landfill_diversion_rate: number;
  reuse_rate: number;
  recycling_rate: number;
  calculation_methodology: string;
  calculated_at: string;
  created_at: string;
  itad_projects: {
    project_number: string;
    project_name?: string;
    customers: {
      name: string;
    };
  };
}

interface ITADProject {
  id: string;
  project_number: string;
  project_name?: string;
}

export function EnvironmentalCompliance() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [projects, setProjects] = useState<ITADProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<EnvironmentalReport | null>(null);

  const [formData, setFormData] = useState({
    itad_project_id: '',
    total_weight_processed_kg: 0,
    weight_reused_kg: 0,
    weight_recycled_kg: 0,
    weight_donated_kg: 0,
    weight_scrapped_kg: 0,
    weight_landfill_kg: 0,
    co2_emissions_saved_kg: 0,
    water_saved_liters: 0,
    energy_saved_kwh: 0,
    materials_aluminum_kg: 0,
    materials_copper_kg: 0,
    materials_steel_kg: 0,
    materials_plastic_kg: 0,
    materials_gold_g: 0,
    materials_silver_g: 0,
    materials_palladium_g: 0,
    calculation_methodology: 'EPA WARM Model'
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchReports();
      fetchProjects();
    }
  }, [selectedCompany?.id]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_environmental_impact')
        .select(`
          *,
          itad_projects (
            project_number,
            project_name,
            customers (name)
          )
        `)
        .eq('company_id', selectedCompany?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('itad_projects')
        .select('id, project_number, project_name')
        .eq('company_id', selectedCompany?.id)
        .order('project_number', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const calculateRates = () => {
    const total = formData.total_weight_processed_kg;
    if (total === 0) return;

    const landfillDiversion = ((total - formData.weight_landfill_kg) / total) * 100;
    const reuseRate = (formData.weight_reused_kg / total) * 100;
    const recyclingRate = (formData.weight_recycled_kg / total) * 100;

    return {
      landfill_diversion_rate: landfillDiversion,
      reuse_rate: reuseRate,
      recycling_rate: recyclingRate
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rates = calculateRates();
    if (!rates) {
      showToast('Total weight must be greater than 0', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        ...rates,
        company_id: selectedCompany?.id,
        calculated_by: user?.id
      };

      if (editingReport) {
        const { error } = await supabase
          .from('project_environmental_impact')
          .update(payload)
          .eq('id', editingReport.id);

        if (error) throw error;
        showToast('Environmental report updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('project_environmental_impact')
          .insert(payload);

        if (error) throw error;
        showToast('Environmental report created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchReports();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (report: EnvironmentalReport) => {
    setEditingReport(report);
    setFormData({
      itad_project_id: report.itad_project_id,
      total_weight_processed_kg: report.total_weight_processed_kg,
      weight_reused_kg: report.weight_reused_kg,
      weight_recycled_kg: report.weight_recycled_kg,
      weight_donated_kg: report.weight_donated_kg,
      weight_scrapped_kg: report.weight_scrapped_kg,
      weight_landfill_kg: report.weight_landfill_kg,
      co2_emissions_saved_kg: report.co2_emissions_saved_kg,
      water_saved_liters: report.water_saved_liters,
      energy_saved_kwh: report.energy_saved_kwh,
      materials_aluminum_kg: report.materials_aluminum_kg,
      materials_copper_kg: report.materials_copper_kg,
      materials_steel_kg: report.materials_steel_kg,
      materials_plastic_kg: report.materials_plastic_kg,
      materials_gold_g: report.materials_gold_g,
      materials_silver_g: report.materials_silver_g,
      materials_palladium_g: report.materials_palladium_g,
      calculation_methodology: report.calculation_methodology
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this environmental report?')) return;

    try {
      const { error } = await supabase
        .from('project_environmental_impact')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Report deleted successfully', 'success');
      fetchReports();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      itad_project_id: '',
      total_weight_processed_kg: 0,
      weight_reused_kg: 0,
      weight_recycled_kg: 0,
      weight_donated_kg: 0,
      weight_scrapped_kg: 0,
      weight_landfill_kg: 0,
      co2_emissions_saved_kg: 0,
      water_saved_liters: 0,
      energy_saved_kwh: 0,
      materials_aluminum_kg: 0,
      materials_copper_kg: 0,
      materials_steel_kg: 0,
      materials_plastic_kg: 0,
      materials_gold_g: 0,
      materials_silver_g: 0,
      materials_palladium_g: 0,
      calculation_methodology: 'EPA WARM Model'
    });
    setEditingReport(null);
  };

  const filteredReports = reports.filter(report =>
    report.itad_projects.project_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.itad_projects.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.itad_projects.customers.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStats = reports.reduce((acc, report) => ({
    totalWeight: acc.totalWeight + report.total_weight_processed_kg,
    co2Saved: acc.co2Saved + report.co2_emissions_saved_kg,
    waterSaved: acc.waterSaved + report.water_saved_liters,
    energySaved: acc.energySaved + report.energy_saved_kwh,
    diversionRate: reports.length > 0 ? (acc.diversionRate + report.landfill_diversion_rate) / reports.length : 0
  }), { totalWeight: 0, co2Saved: 0, waterSaved: 0, energySaved: 0, diversionRate: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading environmental reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Environmental Compliance</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track environmental impact and sustainability metrics
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          Add Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Recycle className="w-6 h-6 text-green-600" />
            <p className="text-sm text-gray-600">Total Processed</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalStats.totalWeight.toFixed(0)} <span className="text-base font-normal text-gray-500">kg</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-6 h-6 text-green-600" />
            <p className="text-sm text-gray-600">CO2 Saved</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {totalStats.co2Saved.toFixed(0)} <span className="text-base font-normal text-gray-500">kg</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Droplet className="w-6 h-6 text-blue-600" />
            <p className="text-sm text-gray-600">Water Saved</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {(totalStats.waterSaved / 1000).toFixed(1)} <span className="text-base font-normal text-gray-500">m³</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-yellow-600" />
            <p className="text-sm text-gray-600">Energy Saved</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {totalStats.energySaved.toFixed(0)} <span className="text-base font-normal text-gray-500">kWh</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <p className="text-sm text-gray-600">Avg Diversion</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {totalStats.diversionRate.toFixed(1)}<span className="text-base font-normal text-gray-500">%</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by project number, name, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CO2 Saved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {report.itad_projects.project_number}
                    </div>
                    {report.itad_projects.project_name && (
                      <div className="text-sm text-gray-500">{report.itad_projects.project_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.itad_projects.customers.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.total_weight_processed_kg.toFixed(2)} kg
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(report.landfill_diversion_rate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{report.landfill_diversion_rate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-green-600 font-medium">
                      {report.co2_emissions_saved_kg.toFixed(0)} kg
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(report)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Leaf className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No environmental reports found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingReport ? 'Edit Environmental Report' : 'Create Environmental Report'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ITAD Project *
                  </label>
                  <select
                    value={formData.itad_project_id}
                    onChange={(e) => setFormData({ ...formData, itad_project_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    disabled={!!editingReport}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.project_number} {project.project_name ? `- ${project.project_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Weight Distribution (kg)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Processed *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.total_weight_processed_kg}
                        onChange={(e) => setFormData({ ...formData, total_weight_processed_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reused
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight_reused_kg}
                        onChange={(e) => setFormData({ ...formData, weight_reused_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recycled
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight_recycled_kg}
                        onChange={(e) => setFormData({ ...formData, weight_recycled_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Donated
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight_donated_kg}
                        onChange={(e) => setFormData({ ...formData, weight_donated_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scrapped
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight_scrapped_kg}
                        onChange={(e) => setFormData({ ...formData, weight_scrapped_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landfill
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight_landfill_kg}
                        onChange={(e) => setFormData({ ...formData, weight_landfill_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Environmental Impact</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CO2 Saved (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.co2_emissions_saved_kg}
                        onChange={(e) => setFormData({ ...formData, co2_emissions_saved_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Water Saved (liters)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.water_saved_liters}
                        onChange={(e) => setFormData({ ...formData, water_saved_liters: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Energy Saved (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.energy_saved_kwh}
                        onChange={(e) => setFormData({ ...formData, energy_saved_kwh: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Materials Recovered</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aluminum (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.materials_aluminum_kg}
                        onChange={(e) => setFormData({ ...formData, materials_aluminum_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Copper (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.materials_copper_kg}
                        onChange={(e) => setFormData({ ...formData, materials_copper_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Steel (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.materials_steel_kg}
                        onChange={(e) => setFormData({ ...formData, materials_steel_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plastic (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.materials_plastic_kg}
                        onChange={(e) => setFormData({ ...formData, materials_plastic_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gold (g)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.materials_gold_g}
                        onChange={(e) => setFormData({ ...formData, materials_gold_g: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Silver (g)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.materials_silver_g}
                        onChange={(e) => setFormData({ ...formData, materials_silver_g: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Palladium (g)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.materials_palladium_g}
                        onChange={(e) => setFormData({ ...formData, materials_palladium_g: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calculation Methodology
                  </label>
                  <input
                    type="text"
                    value={formData.calculation_methodology}
                    onChange={(e) => setFormData({ ...formData, calculation_methodology: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., EPA WARM Model"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingReport ? 'Update Report' : 'Create Report'}
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
