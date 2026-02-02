import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid3x3 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';

const PROCESS_FLOW_ORDER: Record<string, number> = {
  'contacts': 1,
  'orders': 5,
  'receiving': 10,
  'processing': 15,
  'inventory': 20,
  'lots': 25,
  'repairs': 30,
  'reseller': 31,
  'auction': 32,
  'website': 33,
  'invoices': 41,
  'payments': 45,
  'accounting': 50,
  'itad': 51,
  'recycling': 55,
  'crm': 60,
  'esg': 65,
  'reports': 70,
  'users': 71,
  'company': 75,
  'automation': 76,
  'apps': 77,
  'settings': 80,
};

const SECTION_LABELS: Record<string, string> = {
  'procurement': 'Procurement & Intake',
  'operations': 'Operations',
  'sales': 'Sales Channels',
  'financial': 'Financial',
  'specialized': 'Specialized Workflows',
  'reporting': 'Compliance & Reporting',
  'administration': 'Administration',
};

function getSectionForEngine(key: string, order: number): string {
  if (order >= 1 && order <= 10) return 'procurement';
  if (order >= 11 && order <= 30) return 'operations';
  if (order >= 31 && order <= 40) return 'sales';
  if (order >= 41 && order <= 50) return 'financial';
  if (order >= 51 && order <= 60) return 'specialized';
  if (order >= 61 && order <= 70) return 'reporting';
  return 'administration';
}

export function OdooStyleLauncher() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [engines, setEngines] = useState<Engine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) {
      setLoading(false);
      return;
    }

    try {
      const enabledEngines = await engineRegistryService.getEnabledEngines(
        selectedCompany.id
      );

      const sortedEngines = enabledEngines.map(engine => ({
        ...engine,
        processOrder: PROCESS_FLOW_ORDER[engine.key] || engine.sort_order || 999,
      })).sort((a, b) => a.processOrder - b.processOrder);

      setEngines(sortedEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Package;
  };

  const filteredEngines = engines.filter(engine =>
    engine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    engine.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedEngines = filteredEngines.reduce((acc, engine) => {
    const order = PROCESS_FLOW_ORDER[engine.key] || engine.sort_order || 999;
    const section = getSectionForEngine(engine.key, order);

    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(engine);
    return acc;
  }, {} as Record<string, Engine[]>);

  const sections = [
    'procurement',
    'operations',
    'sales',
    'financial',
    'specialized',
    'reporting',
    'administration',
  ].filter(section => groupedEngines[section]?.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No company selected</p>
          <button
            onClick={() => navigate('/apps')}
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-teal-600 text-white rounded-md hover:shadow-lg transition-all"
          >
            Go to Apps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {sections.map((section) => (
          <div key={section} className="mb-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {groupedEngines[section].map((engine) => {
                const Icon = getIcon(engine.icon);

                return (
                  <button
                    key={engine.key}
                    onClick={() => engine.workspace_route && navigate(engine.workspace_route)}
                    className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-rose-400 hover:shadow-lg transition-all duration-200 flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 shadow-md">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm group-hover:text-rose-600 transition-colors">
                      {engine.title}
                    </h3>
                    {engine.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {engine.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredEngines.length === 0 && (
          <div className="text-center py-16">
            <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? `No applications match "${searchQuery}"`
                : 'No applications are enabled'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
