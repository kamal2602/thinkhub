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
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Apps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
              <p className="text-sm text-gray-500 mt-1">Select an application to begin</p>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {sections.map((section) => (
          <div key={section} className="mb-10">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">
              {SECTION_LABELS[section]}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {groupedEngines[section].map((engine) => {
                const Icon = getIcon(engine.icon);

                return (
                  <button
                    key={engine.key}
                    onClick={() => engine.workspace_route && navigate(engine.workspace_route)}
                    className="group bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-150 flex flex-col items-center text-center"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-150">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
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
