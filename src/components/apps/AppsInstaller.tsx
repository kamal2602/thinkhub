import React, { useState, useEffect } from 'react';
import { Layers, Search, Filter, Check, Download, Trash2, AlertCircle, Shield } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import * as Icons from 'lucide-react';

export function AppsInstaller() {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [processingEngine, setProcessingEngine] = useState<string | null>(null);

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const allEngines = await engineRegistryService.getEngines(selectedCompany.id);
      setEngines(allEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
      addToast('Failed to load apps', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (engine: Engine) => {
    if (!selectedCompany) return;
    if (engine.is_core && engine.is_enabled) {
      addToast('Core modules cannot be disabled', 'error');
      return;
    }

    setProcessingEngine(engine.key);
    try {
      await engineRegistryService.toggleEngine(
        selectedCompany.id,
        engine.key,
        !engine.is_enabled
      );
      await loadEngines();
      addToast(
        `${engine.title} ${!engine.is_enabled ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error: any) {
      if (error.message?.includes('Missing dependencies')) {
        const missingDeps = await engineRegistryService.getMissingDependencies(selectedCompany.id, engine.key);
        if (missingDeps.length > 0 && confirm(
          `${engine.title} requires: ${missingDeps.map(d => d.title).join(', ')}.\n\nEnable all dependencies now?`
        )) {
          await handleEnableWithDependencies(engine);
        } else {
          addToast(error.message, 'error');
        }
      } else {
        addToast(error.message || 'Failed to update app', 'error');
      }
    } finally {
      setProcessingEngine(null);
    }
  };

  const handleEnableWithDependencies = async (engine: Engine) => {
    if (!selectedCompany) return;

    setProcessingEngine(engine.key);
    try {
      await engineRegistryService.enableWithDependencies(selectedCompany.id, engine.key);
      await loadEngines();
      addToast(`${engine.title} and dependencies enabled`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to enable dependencies', 'error');
    } finally {
      setProcessingEngine(null);
    }
  };

  const handleInstall = async (engine: Engine) => {
    if (!selectedCompany) return;

    setProcessingEngine(engine.key);
    try {
      await engineRegistryService.installEngine(selectedCompany.id, engine.key);
      await loadEngines();
      addToast(`${engine.title} installed successfully`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to install app', 'error');
    } finally {
      setProcessingEngine(null);
    }
  };

  const handleUninstall = async (engine: Engine) => {
    if (!selectedCompany) return;
    if (engine.is_core) {
      addToast('Core modules cannot be uninstalled', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to uninstall ${engine.title}?`)) {
      return;
    }

    setProcessingEngine(engine.key);
    try {
      await engineRegistryService.uninstallEngine(selectedCompany.id, engine.key);
      await loadEngines();
      addToast(`${engine.title} uninstalled`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to uninstall app', 'error');
    } finally {
      setProcessingEngine(null);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const filteredEngines = engines.filter(engine => {
    const matchesSearch =
      engine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (engine.description && engine.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
      operations: 'bg-blue-100 text-blue-800',
      sales: 'bg-yellow-100 text-yellow-800',
      business: 'bg-green-100 text-green-800',
      system: 'bg-purple-100 text-purple-800',
      admin: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading apps...</p>
        </div>
      </div>
    );
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
            <p className="text-gray-600 mt-1">Install and manage platform modules</p>
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
            const isProcessing = processingEngine === engine.key;

            return (
              <div key={engine.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{engine.title}</h3>
                          {engine.is_core && (
                            <Shield className="w-4 h-4 text-blue-600" title="Core module" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500">v{engine.version}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(engine.category)}`}>
                      {engine.category}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                    {engine.description || 'No description available'}
                  </p>

                  {engine.depends_on && engine.depends_on.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-700 mb-1">Dependencies</div>
                          <div className="text-xs text-gray-600">
                            {engine.depends_on.map((dep, idx) => {
                              const depEngine = engines.find(e => e.key === dep);
                              const isEnabled = depEngine?.is_enabled;
                              return (
                                <span key={dep} className={isEnabled ? 'text-green-600' : 'text-amber-600'}>
                                  {depEngine?.title || dep}
                                  {!isEnabled && ' (disabled)'}
                                  {idx < engine.depends_on.length - 1 && ', '}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!engine.is_enabled && engine.is_installed && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 mb-1">
                        Module Disabled
                      </p>
                      <p className="text-xs text-amber-600">
                        Enable to show in sidebar and allow access
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!engine.is_installed ? (
                      <button
                        onClick={() => handleInstall(engine)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        {isProcessing ? 'Installing...' : 'Install'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggle(engine)}
                          disabled={isProcessing || (engine.is_core && engine.is_enabled)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            engine.is_enabled
                              ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {engine.is_enabled && <Check className="w-4 h-4" />}
                          {isProcessing ? 'Processing...' : engine.is_enabled ? 'Enabled - Click to Disable' : 'Enable Module'}
                        </button>
                        {!engine.is_core && (
                          <button
                            onClick={() => handleUninstall(engine)}
                            disabled={isProcessing}
                            className="p-2 border-2 border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Uninstall"
                          >
                            <Trash2 className="w-5 h-5 text-gray-600 hover:text-red-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEngines.length === 0 && (
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No apps found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
