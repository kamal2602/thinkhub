import { useState, useEffect } from 'react';
import {
  Building2,
  Package,
  Cog,
  HardDrive,
  Award,
  FileText,
  TrendingUp,
  Users,
  PackageCheck,
  Plus
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { supabase } from '../../lib/supabase';
import { ITADProjects } from './ITADProjects';
import { WipingQueue } from './WipingQueue';
import { DataSanitization } from './DataSanitization';
import { Certificates } from './Certificates';
import { EnvironmentalCompliance } from './EnvironmentalCompliance';
import { ITADRevenueSettlements } from './ITADRevenueSettlements';
import { DownstreamVendors } from './DownstreamVendors';
import SmartReceivingWorkflow from '../receiving/SmartReceivingWorkflow';
import { Processing } from '../processing/Processing';

type TabKey = 'projects' | 'receiving' | 'processing' | 'wiping' | 'compliance' | 'certificates' | 'settlements' | 'vendors';

interface KPIData {
  totalProjects: number;
  activeProjects: number;
  assetsInProgress: number;
  wipingPending: number;
  certificatesIssued: number;
}

export function ITADWorkspace() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<TabKey>('projects');
  const [kpiData, setKpiData] = useState<KPIData>({
    totalProjects: 0,
    activeProjects: 0,
    assetsInProgress: 0,
    wipingPending: 0,
    certificatesIssued: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      loadKPIs();
    }
  }, [selectedCompany]);

  const loadKPIs = async () => {
    if (!selectedCompany) return;

    try {
      const [projectsRes, assetsRes, certsRes] = await Promise.all([
        supabase
          .from('itad_projects')
          .select('id, status', { count: 'exact' })
          .eq('company_id', selectedCompany.id),
        supabase
          .from('assets')
          .select('id, processing_stage', { count: 'exact' })
          .eq('company_id', selectedCompany.id)
          .in('processing_stage', ['receiving', 'testing', 'refurbishment', 'grading']),
        supabase
          .from('data_destruction_certificates')
          .select('id', { count: 'exact' })
          .eq('company_id', selectedCompany.id),
      ]);

      const activeProjects = projectsRes.data?.filter(p => p.status === 'in_progress').length || 0;

      setKpiData({
        totalProjects: projectsRes.count || 0,
        activeProjects,
        assetsInProgress: assetsRes.count || 0,
        wipingPending: 0,
        certificatesIssued: certsRes.count || 0,
      });
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'projects' as const, label: 'Projects', icon: Building2 },
    { id: 'receiving' as const, label: 'Receiving', icon: PackageCheck },
    { id: 'processing' as const, label: 'Processing', icon: Cog },
    { id: 'wiping' as const, label: 'Data Wiping', icon: HardDrive },
    { id: 'compliance' as const, label: 'Compliance', icon: FileText },
    { id: 'certificates' as const, label: 'Certificates', icon: Award },
    { id: 'settlements' as const, label: 'Revenue Share', icon: TrendingUp },
    { id: 'vendors' as const, label: 'Downstream Vendors', icon: Users },
  ];

  const kpis = [
    {
      label: 'Total Projects',
      value: kpiData.totalProjects,
      icon: Building2,
      color: 'blue',
    },
    {
      label: 'Active Projects',
      value: kpiData.activeProjects,
      icon: Cog,
      color: 'green',
    },
    {
      label: 'Assets in Progress',
      value: kpiData.assetsInProgress,
      icon: Package,
      color: 'amber',
    },
    {
      label: 'Certificates Issued',
      value: kpiData.certificatesIssued,
      icon: Award,
      color: 'purple',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ITAD Workspace</h1>
              <p className="text-sm text-gray-600 mt-1">
                IT Asset Disposition - Complete lifecycle management
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('projects')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
              <button
                onClick={() => setActiveTab('receiving')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Receiving
              </button>
              <button
                onClick={() => setActiveTab('processing')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Cog className="w-4 h-4" />
                Processing
              </button>
              <button
                onClick={() => setActiveTab('wiping')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                Wiping Queue
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const colorClasses = {
                  blue: 'bg-blue-50 text-blue-600',
                  green: 'bg-green-50 text-green-600',
                  amber: 'bg-amber-50 text-amber-600',
                  purple: 'bg-purple-50 text-purple-600',
                }[kpi.color];

                return (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        <p className="text-xs text-gray-600">{kpi.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'projects' && <ITADProjects />}
          {activeTab === 'receiving' && <SmartReceivingWorkflow />}
          {activeTab === 'processing' && <Processing />}
          {activeTab === 'wiping' && <WipingQueue />}
          {activeTab === 'compliance' && <EnvironmentalCompliance />}
          {activeTab === 'certificates' && <Certificates />}
          {activeTab === 'settlements' && <ITADRevenueSettlements />}
          {activeTab === 'vendors' && <DownstreamVendors />}
        </div>
      </div>
    </div>
  );
}
