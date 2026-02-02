import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';

export function ModernAppLauncher() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [engines, setEngines] = useState<Engine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const enabledEngines = await engineRegistryService.getEnabledEngines(
        selectedCompany.id
      );

      if (enabledEngines.length === 0) {
        navigate('/apps');
        return;
      }

      if (enabledEngines.length === 1 && enabledEngines[0].workspace_route) {
        navigate(enabledEngines[0].workspace_route);
        return;
      }

      setEngines(enabledEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const filteredEngines = engines.filter(engine =>
    engine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    engine.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedEngines = {
    operations: filteredEngines.filter(e => e.category === 'operations'),
    sales: filteredEngines.filter(e => e.category === 'sales'),
    business: filteredEngines.filter(e => e.category === 'business'),
    system: filteredEngines.filter(e => e.category === 'system'),
    admin: filteredEngines.filter(e => e.category === 'admin'),
  };

  const categories = [
    { key: 'operations', title: 'Operations', color: 'blue' },
    { key: 'sales', title: 'Sales Channels', color: 'green' },
    { key: 'business', title: 'Business', color: 'orange' },
    { key: 'system', title: 'System', color: 'gray' },
    { key: 'admin', title: 'Administration', color: 'slate' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            Choose Your Workspace
          </h1>
          <p className="text-gray-600">Select a workspace to get started</p>
        </div>

        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-8">
          {categories.map(category => {
            const categoryEngines = groupedEngines[category.key as keyof typeof groupedEngines];
            if (categoryEngines.length === 0) return null;

            return (
              <div key={category.key}>
                <h2 className="text-lg font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  {category.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categoryEngines.map(engine => {
                    const Icon = getIcon(engine.icon);

                    return (
                      <button
                        key={engine.key}
                        onClick={() => engine.workspace_route && navigate(engine.workspace_route)}
                        className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                            <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {engine.title}
                            </h3>
                            {engine.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {engine.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEngines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No workspaces found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
