import React, { useState, useEffect } from 'react';
import { Home, Layers, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import * as Icons from 'lucide-react';

interface DynamicSidebarProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

interface CategoryState {
  [key: string]: boolean;
}

export function DynamicSidebar({ currentPath, onNavigate }: DynamicSidebarProps) {
  const { selectedCompany } = useCompany();
  const [engineGroups, setEngineGroups] = useState<Record<string, Engine[]>>({});
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<CategoryState>(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed-categories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const groups = await engineRegistryService.getEnabledEngineGroups(selectedCompany.id);
      setEngineGroups(groups);
    } catch (error) {
      console.error('Error loading engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newState = {
      ...collapsedCategories,
      [category]: !collapsedCategories[category]
    };
    setCollapsedCategories(newState);
    try {
      localStorage.setItem('sidebar-collapsed-categories', JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const isActive = (route: string | null) => {
    if (!route || !currentPath) return false;
    return currentPath === route || currentPath.startsWith(route + '/');
  };

  const coreItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Layers, label: 'Apps', path: '/apps' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const categories = [
    { key: 'operations', title: 'Operations' },
    { key: 'sales', title: 'Sales Channels' },
    { key: 'business', title: 'Business' },
    { key: 'system', title: 'System' }
  ];

  if (loading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 h-full flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        <nav className="space-y-1">
          {coreItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {Object.keys(engineGroups).length > 0 && (
          <>
            <div className="border-t border-gray-200"></div>

            <div className="space-y-3">
              {categories.map((category) => {
                const engines = engineGroups[category.key];
                if (!engines || engines.length === 0) return null;

                const isCollapsed = collapsedCategories[category.key];
                const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

                return (
                  <div key={category.key}>
                    <button
                      onClick={() => toggleCategory(category.key)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    >
                      <ChevronIcon className="w-4 h-4" />
                      <span>{category.title}</span>
                    </button>

                    {!isCollapsed && (
                      <nav className="space-y-1 mt-1">
                        {engines.map((engine) => {
                          const Icon = getIcon(engine.icon);
                          const active = isActive(engine.workspace_route);

                          return (
                            <button
                              key={engine.key}
                              onClick={() => engine.workspace_route && onNavigate(engine.workspace_route)}
                              className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm transition-colors ${
                                active
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="flex-1 text-left">{engine.title}</span>
                              {active && <ChevronRight className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </nav>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
