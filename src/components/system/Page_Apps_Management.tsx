import React, { useState, useEffect } from 'react';
import { Layers, Check, Download, Settings, Info, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Engine {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'operations' | 'finance' | 'compliance' | 'sales' | 'system';
  status: 'installed' | 'available' | 'coming_soon';
  enabled: boolean;
  version?: string;
  dependencies?: string[];
}

const AVAILABLE_ENGINES: Omit<Engine, 'enabled'>[] = [
  {
    id: 'recycling',
    name: 'Recycling',
    description: 'Dismantling workflows, component harvesting, and asset processing',
    icon: 'Recycle',
    category: 'operations',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'reseller',
    name: 'Reseller',
    description: 'Fixed-price sales catalog, orders, and invoicing',
    icon: 'Store',
    category: 'sales',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'auction',
    name: 'Auction',
    description: 'Live and timed auction management with bidding',
    icon: 'Gavel',
    category: 'sales',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'website',
    name: 'Website & CMS',
    description: 'Public website, storefront, and content management',
    icon: 'Globe',
    category: 'sales',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'accounting',
    name: 'Accounting',
    description: 'General ledger, chart of accounts, and financial reporting',
    icon: 'Calculator',
    category: 'finance',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management, leads, and opportunities',
    icon: 'Users',
    category: 'sales',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'itad_compliance',
    name: 'ITAD Compliance',
    description: 'Data sanitization, certificates, and environmental compliance',
    icon: 'Shield',
    category: 'compliance',
    status: 'installed',
    version: '1.0.0'
  },
  {
    id: 'advanced_reporting',
    name: 'Advanced Reporting',
    description: 'Custom reports, dashboards, and business intelligence',
    icon: 'BarChart',
    category: 'system',
    status: 'available',
    version: '1.0.0'
  }
];

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
      const { data, error } = await supabase
        .from('engine_toggles')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const engineStates = data || {};
      const mappedEngines = AVAILABLE_ENGINES.map(engine => ({
        ...engine,
        enabled: engineStates[`${engine.id}_enabled`] !== false
      }));

      setEngines(mappedEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
      addToast('Failed to load engines', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEngine = async (engineId: string, currentState: boolean) => {
    if (!selectedCompany) return;

    try {
      const { error } = await supabase
        .from('engine_toggles')
        .upsert({
          company_id: selectedCompany.id,
          [`${engineId}_enabled`]: !currentState,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setEngines(prev => prev.map(e =>
        e.id === engineId ? { ...e, enabled: !currentState } : e
      ));

      addToast(
        `${engineId} ${!currentState ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling engine:', error);
      addToast('Failed to update engine', 'error');
    }
  };

  const filteredEngines = engines.filter(engine => {
    const matchesSearch = engine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      engine.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || engine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', name: 'All Apps' },
    { id: 'operations', name: 'Operations' },
    { id: 'sales', name: 'Sales' },
    { id: 'finance', name: 'Finance' },
    { id: 'compliance', name: 'Compliance' },
    { id: 'system', name: 'System' }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      operations: 'bg-green-100 text-green-800',
      sales: 'bg-blue-100 text-blue-800',
      finance: 'bg-emerald-100 text-emerald-800',
      compliance: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800'
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
          {filteredEngines.map((engine) => (
            <div key={engine.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{engine.icon.substring(0, 2)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{engine.name}</h3>
                      {engine.version && (
                        <span className="text-xs text-gray-500">v{engine.version}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(engine.category)}`}>
                    {engine.category}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">{engine.description}</p>

                <div className="flex items-center gap-2">
                  {engine.status === 'installed' ? (
                    <button
                      onClick={() => toggleEngine(engine.id, engine.enabled)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        engine.enabled
                          ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {engine.enabled && <Check className="w-4 h-4" />}
                      {engine.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  ) : engine.status === 'available' ? (
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      <Download className="w-4 h-4" />
                      Install
                    </button>
                  ) : (
                    <button disabled className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                      Coming Soon
                    </button>
                  )}
                  <button className="p-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Info className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
