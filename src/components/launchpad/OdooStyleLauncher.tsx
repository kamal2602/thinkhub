import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid3x3 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { getAppColor } from '../../config/appColors';

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

  const filteredEngines = engines
    .filter(engine =>
      engine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      engine.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const orderA = PROCESS_FLOW_ORDER[a.key] || a.sort_order || 999;
      const orderB = PROCESS_FLOW_ORDER[b.key] || b.sort_order || 999;
      return orderA - orderB;
    });

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
    <div className="min-h-screen bg-gray-100">
      {/* Clean header with search - Odoo style */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-8 py-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-gray-50 hover:bg-white"
            />
          </div>
        </div>
      </div>

      {/* App grid - Fixed 6 columns on desktop, clean and continuous */}
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        {filteredEngines.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {filteredEngines.map((engine) => {
              const Icon = getIcon(engine.icon);
              const colors = getAppColor(engine.key);

              return (
                <button
                  key={engine.key}
                  onClick={() => engine.workspace_route && navigate(engine.workspace_route)}
                  className="group bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center border border-transparent hover:border-gray-200"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`font-semibold text-gray-900 text-sm mb-1 group-hover:${colors.text} transition-colors line-clamp-2 leading-tight`}>
                    {engine.title}
                  </h3>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Grid3x3 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? `No applications match "${searchQuery}"`
                : 'No applications are enabled for this company'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
