import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { useCompany } from '../../contexts/CompanyContext';

interface EngineGroup {
  category: string;
  categoryName: string;
  color: string;
  engines: Engine[];
}

const CATEGORY_CONFIG = {
  operations: { name: 'Operations', color: 'blue' },
  sales: { name: 'Sales', color: 'green' },
  business: { name: 'Business', color: 'purple' },
  system: { name: 'System', color: 'gray' },
  admin: { name: 'Admin', color: 'orange' }
};

export function RegistryDrivenSidebar() {
  const { company } = useCompany();
  const [engineGroups, setEngineGroups] = useState<EngineGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company) {
      loadEngines();
    }
  }, [company]);

  const loadEngines = async () => {
    if (!company) {
      setLoading(false);
      return;
    }

    try {
      const enabledEngines = await engineRegistryService.getEnabledEngines(company.id);

      console.log('RegistryDrivenSidebar: Loaded engines:', enabledEngines.length);

      const groups: EngineGroup[] = [];

      for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
        const categoryEngines = enabledEngines.filter(e => e.category === category);
        if (categoryEngines.length > 0) {
          groups.push({
            category,
            categoryName: config.name,
            color: config.color,
            engines: categoryEngines
          });
        }
      }

      console.log('RegistryDrivenSidebar: Organized into groups:', groups.length);
      setEngineGroups(groups);
    } catch (error) {
      console.error('Failed to load engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Package;
  };

  if (loading) {
    return (
      <div className="w-64 bg-gray-900 min-h-screen p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">
          {company?.name || 'Company'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">Modular ERP</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {engineGroups.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 text-sm mb-2">No modules available</p>
            <p className="text-gray-600 text-xs">
              Visit Settings → Apps to install modules
            </p>
          </div>
        ) : (
          engineGroups.map(({ category, categoryName, color, engines }) => {
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            gray: 'bg-gray-500',
            orange: 'bg-orange-500',
          };

          return (
            <div key={category}>
              <div className="flex items-center space-x-2 px-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${colorClasses[color] || 'bg-gray-500'}`}></div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {categoryName}
                </h2>
              </div>

              <div className="space-y-1">
                {engines.map(engine => {
                  const IconComponent = getIconComponent(engine.icon);

                  return (
                    <NavLink
                      key={engine.key}
                      to={engine.workspace_route || `/${engine.key}`}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`
                      }
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{engine.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          v{engineGroups[0]?.engines[0]?.version || '1.0.0'}
        </div>
      </div>
    </div>
  );
}
