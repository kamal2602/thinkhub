import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, FileText, TrendingUp, Leaf, LogOut,
  Clock, CheckCircle, DollarSign, Download, Calendar, Settings,
  Bell, HelpCircle, Plus
} from 'lucide-react';
import { useCustomerPortalAuth } from '../../contexts/CustomerPortalAuthContext';
import { supabase } from '../../lib/supabase';
import { CollectionRequestForm } from './CollectionRequestForm';
import { CertificateDownloads } from './CertificateDownloads';
import { RevenueShareReports } from './RevenueShareReports';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  expected_quantity: number;
  actual_quantity: number;
  created_at: string;
  service_type: string;
}

interface Asset {
  id: string;
  internal_id: string;
  serial_number: string;
  brand: string;
  model: string;
  processing_stage: string;
  disposal_method?: string;
  created_at: string;
}

interface EnvironmentalImpact {
  total_weight_processed_kg: number;
  weight_reused_kg: number;
  weight_recycled_kg: number;
  co2_emissions_saved_kg: number;
  landfill_diversion_rate: number;
}

export function CustomerPortalDashboard() {
  const { portalUser, logout } = useCustomerPortalAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [envImpact, setEnvImpact] = useState<EnvironmentalImpact | null>(null);
  const [revenueStats, setRevenueStats] = useState({ total: 0, settled: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (portalUser) {
      fetchDashboardData();
    }
  }, [portalUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: projectsData } = await supabase
        .from('itad_projects')
        .select('*')
        .eq('itad_customer_id', portalUser?.customer_id)
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);

      const projectIds = projectsData?.map(p => p.id) || [];

      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, internal_id, serial_number, brand, model, processing_stage, disposal_method, created_at')
        .in('itad_project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(50);

      setAssets(assetsData || []);

      const { data: envData } = await supabase
        .from('project_environmental_impact')
        .select('*')
        .in('itad_project_id', projectIds);

      if (envData && envData.length > 0) {
        const totals = envData.reduce((acc, curr) => ({
          total_weight_processed_kg: acc.total_weight_processed_kg + (curr.total_weight_processed_kg || 0),
          weight_reused_kg: acc.weight_reused_kg + (curr.weight_reused_kg || 0),
          weight_recycled_kg: acc.weight_recycled_kg + (curr.weight_recycled_kg || 0),
          co2_emissions_saved_kg: acc.co2_emissions_saved_kg + (curr.co2_emissions_saved_kg || 0),
          landfill_diversion_rate: 0
        }), {
          total_weight_processed_kg: 0,
          weight_reused_kg: 0,
          weight_recycled_kg: 0,
          co2_emissions_saved_kg: 0,
          landfill_diversion_rate: 0
        });

        totals.landfill_diversion_rate = totals.total_weight_processed_kg > 0
          ? ((totals.weight_reused_kg + totals.weight_recycled_kg) / totals.total_weight_processed_kg) * 100
          : 0;

        setEnvImpact(totals);
      }

      const { data: revenueData } = await supabase
        .from('revenue_share_transactions')
        .select('customer_share_amount, settlement_status')
        .eq('customer_id', portalUser?.customer_id);

      if (revenueData) {
        const stats = revenueData.reduce((acc, curr) => {
          const amount = curr.customer_share_amount || 0;
          return {
            total: acc.total + amount,
            settled: acc.settled + (curr.settlement_status === 'settled' ? amount : 0),
            pending: acc.pending + (curr.settlement_status === 'pending' || curr.settlement_status === 'accrued' ? amount : 0)
          };
        }, { total: 0, settled: 0, pending: 0 });

        setRevenueStats(stats);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-gray-100 text-gray-700',
      'receiving': 'bg-blue-100 text-blue-700',
      'in_progress': 'bg-yellow-100 text-yellow-700',
      'sanitization': 'bg-orange-100 text-orange-700',
      'testing': 'bg-blue-100 text-blue-700',
      'disposition': 'bg-green-100 text-green-700',
      'completed': 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getProcessingStageDisplay = (stage: string) => {
    const stages: Record<string, string> = {
      'receiving': 'Received',
      'inspection': 'Inspecting',
      'data_wipe': 'Data Sanitization',
      'testing': 'Testing',
      'disposition': 'Disposition',
      'completed': 'Completed'
    };
    return stages[stage] || stage;
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assets Processed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{assets.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue Share</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ${revenueStats.total.toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                ${revenueStats.pending.toLocaleString()} pending
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CO2 Saved</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {(envImpact?.co2_emissions_saved_kg || 0).toFixed(0)}
              </p>
              <p className="text-xs text-gray-600 mt-1">kg CO2e</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projects.slice(0, 5).map(project => (
                <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{project.project_number}</div>
                    {project.project_name && (
                      <div className="text-sm text-gray-600">{project.project_name}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {project.actual_quantity} / {project.expected_quantity} assets received
                    </div>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No projects yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Assets</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {assets.slice(0, 5).map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{asset.brand} {asset.model}</div>
                    <div className="text-sm text-gray-600">S/N: {asset.serial_number}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: {asset.internal_id}</div>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.processing_stage)}`}>
                      {getProcessingStageDisplay(asset.processing_stage)}
                    </span>
                  </div>
                </div>
              ))}
              {assets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No assets yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {envImpact && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-sm border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Environmental Impact</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Weight Processed</p>
              <p className="text-2xl font-bold text-gray-900">{envImpact.total_weight_processed_kg.toFixed(0)} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Reused/Recycled</p>
              <p className="text-2xl font-bold text-green-600">
                {(envImpact.weight_reused_kg + envImpact.weight_recycled_kg).toFixed(0)} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Diversion Rate</p>
              <p className="text-2xl font-bold text-green-600">{envImpact.landfill_diversion_rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CO2 Saved</p>
              <p className="text-2xl font-bold text-green-600">{envImpact.co2_emissions_saved_kg.toFixed(0)} kg</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ITAD Customer Portal</h1>
                <p className="text-xs text-gray-500">{portalUser?.full_name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeTab === 'collection'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-5 h-5" />
                Request Collection
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeTab === 'certificates'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                Certificates
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  activeTab === 'revenue'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                Revenue Reports
              </button>
            </nav>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'collection' && <CollectionRequestForm onSuccess={fetchDashboardData} />}
                {activeTab === 'certificates' && <CertificateDownloads customerId={portalUser?.customer_id || ''} />}
                {activeTab === 'revenue' && <RevenueShareReports customerId={portalUser?.customer_id || ''} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
