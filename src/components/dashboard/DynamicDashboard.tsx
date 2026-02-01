import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ChevronRight, Check, X } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import * as Icons from 'lucide-react';

interface DynamicDashboardProps {
  onNavigate: (path: string) => void;
}

export function DynamicDashboard({ onNavigate }: DynamicDashboardProps) {
  const { selectedCompany } = useCompany();
  const [engineGroups, setEngineGroups] = useState<Record<string, Engine[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const groups = await engineRegistryService.getEngineGroups(selectedCompany.id);
      setEngineGroups(groups);
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

  const categories = [
    { key: 'operations', title: 'Operations', color: 'blue', emoji: '🟦' },
    { key: 'sales', title: 'Sales Channels', color: 'yellow', emoji: '🟨' },
    { key: 'business', title: 'Business', color: 'green', emoji: '🟩' },
    { key: 'system', title: 'System', color: 'purple', emoji: '🟪' },
    { key: 'admin', title: 'Admin', color: 'gray', emoji: '🟫' }
  ];

  const getCategoryColor = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to your workspace</p>
        </div>

        {categories.map((category) => {
          const engines = engineGroups[category.key] || [];
          if (engines.length === 0) return null;

          const colors = getCategoryColor(category.color);

          return (
            <div key={category.key} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.emoji}</span>
                <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {engines.map((engine) => {
                  const Icon = getIcon(engine.icon);

                  return (
                    <button
                      key={engine.id}
                      onClick={() => engine.workspace_route && onNavigate(engine.workspace_route)}
                      className="group relative bg-white rounded-xl border-2 border-gray-200 p-6 text-left hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-6 h-6 ${colors.text}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {engine.is_enabled ? (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                              <X className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          {engine.settings_route && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(engine.settings_route!);
                              }}
                              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Settings"
                            >
                              <SettingsIcon className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{engine.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{engine.description}</p>

                      <div className="flex items-center text-sm text-blue-600 font-medium">
                        <span>Open</span>
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>

                      {!engine.is_enabled && (
                        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-500">Disabled</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {Object.values(engineGroups).every(g => g.length === 0) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Layers className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules installed</h3>
            <p className="text-gray-600 mb-4">Get started by installing some modules</p>
            <button
              onClick={() => onNavigate('/apps')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Apps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
