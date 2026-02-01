import React, { useState, useEffect } from 'react';
import { Layers, Check, Download, Settings, Info, Search, AlertCircle } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import * as Icons from 'lucide-react';

export function Page_Apps_Management() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const data = await engineRegistryService.getEngines(selectedCompany.id);
      setEngines(data);
    } catch (error) {
      console.error('Error loading engines:', error);
      addToast('Failed to load engines', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEngine = async (engineKey: string, currentState: boolean) => {
    if (!selectedCompany) return;

    try {
      await engineRegistryService.toggleEngine(selectedCompany.id, engineKey, !currentState);

      setEngines(prev => prev.map(e =>
        e.key === engineKey ? { ...e, is_enabled: !currentState } : e
      ));

      const engine = engines.find(e => e.key === engineKey);
      addToast(
        `${engine?.title} ${!currentState ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error: any) {
      console.error('Error toggling engine:', error);
      addToast(error.message || 'Failed to update engine', 'error');
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const filteredEngines = engines.filter(engine => {
    const matchesSearch = engine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (engine.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || engine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', name: 'All Apps' },
    { id: 'operations', name: 'Operations' },
    { id: 'sales', name: 'Sales' },
    { id: 'business', name: 'Business' },
    { id: 'system', name: 'System' },
    { id: 'admin', name: 'Admin' }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      operations: 'bg-green-100 text-green-800',
      sales: 'bg-blue-100 text-blue-800',
      business: 'bg-emerald-100 text-emerald-800',
      system: 'bg-gray-100 text-gray-800',
      admin: 'bg-slate-100 text-slate-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apps</h1>
            <p className="text-gray-600 mt-1">Enable and configure platform modules</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEngines.map((engine) => {
            const Icon = getIcon(engine.icon);
            const canToggle = !engine.is_core;

            return (
              <div key={engine.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{engine.title}</h3>
                        <span className="text-xs text-gray-500">v{engine.version}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(engine.category)}`}>
                      {engine.category}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{engine.description || 'No description available'}</p>

                  {engine.depends_on && engine.depends_on.length > 0 && (
                    <div className="mb-4 flex items-start gap-2 text-xs text-gray-500">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Requires:</span> {engine.depends_on.join(', ')}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {engine.is_installed ? (
                      <>
                        {canToggle ? (
                          <button
                            onClick={() => toggleEngine(engine.key, engine.is_enabled)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                              engine.is_enabled
                                ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {engine.is_enabled && <Check className="w-4 h-4" />}
                            {engine.is_enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-lg font-medium">
                            <Check className="w-4 h-4" />
                            Core Engine
                          </div>
                        )}
                      </>
                    ) : (
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed" disabled>
                        <Download className="w-4 h-4" />
                        Not Installed
                      </button>
                    )}
                    {engine.settings_route && (
                      <button
                        className="p-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Settings"
                      >
                        <Settings className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
