import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { moduleRegistryService, Module, ModuleCategory } from '../../services/moduleRegistryService';
import { useCompany } from '../../contexts/CompanyContext';

interface ModulesByCategory {
  category: ModuleCategory;
  modules: Module[];
}

export function RegistryDrivenSidebar() {
  const { company } = useCompany();
  const [modulesByCategory, setModulesByCategory] = useState<ModulesByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company) {
      loadModules();
    }
  }, [company]);

  const loadModules = async () => {
    if (!company) {
      setLoading(false);
      return;
    }

    try {
      const [categories, enabledModules] = await Promise.all([
        moduleRegistryService.getModuleCategories(),
        moduleRegistryService.getEnabledModules(company.id)
      ]);

      const grouped = categories
        .map(category => ({
          category,
          modules: enabledModules.filter(m => m.category === category.code)
        }))
        .filter(group => group.modules.length > 0);

      setModulesByCategory(grouped);
    } catch (error) {
      console.error('Failed to load modules:', error);
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
        {modulesByCategory.map(({ category, modules }) => (
          <div key={category.code}>
            <div className="flex items-center space-x-2 px-3 mb-2">
              <div className={`w-2 h-2 rounded-full bg-${category.color}-500`}></div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {category.name}
              </h2>
            </div>

            <div className="space-y-1">
              {modules.map(module => {
                const IconComponent = getIconComponent(module.icon);

                return (
                  <NavLink
                    key={module.name}
                    to={module.route || `/${module.name}`}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{module.display_name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          v{modulesByCategory[0]?.modules[0]?.version || '1.0.0'}
        </div>
      </div>
    </div>
  );
}
