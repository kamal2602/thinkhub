import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { moduleRegistryService, Module, ModuleCategory } from '../../services/moduleRegistryService';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';

interface ModulesByCategory {
  category: ModuleCategory;
  modules: Module[];
}

export function ModularHomeDashboard() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { user } = useAuth();
  const [modulesByCategory, setModulesByCategory] = useState<ModulesByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, [company]);

  const loadModules = async () => {
    if (!company) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [categories, enabledModules] = await Promise.all([
        moduleRegistryService.getModuleCategories(),
        moduleRegistryService.getEnabledModules(company.id)
      ]);

      const grouped = categories
        .map(category => ({
          category,
          modules: enabledModules.filter(m => m.category === category.code && m.name !== 'dashboard')
        }))
        .filter(group => group.modules.length > 0);

      setModulesByCategory(grouped);
    } catch (error) {
      console.error('Failed to load modules:', error);
      setError(error instanceof Error ? error.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Package;
  };

  const getCategoryGradient = (color: string) => {
    const gradients: Record<string, string> = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      red: 'from-red-500 to-red-600',
      cyan: 'from-cyan-500 to-cyan-600',
      emerald: 'from-emerald-500 to-emerald-600',
      gray: 'from-gray-500 to-gray-600'
    };
    return gradients[color] || 'from-gray-500 to-gray-600';
  };

  const getModuleColor = (color: string | null) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      cyan: 'bg-cyan-500',
      emerald: 'bg-emerald-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500'
    };
    return colors[color || 'gray'] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Icons.AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadModules()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icons.Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No company selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">What would you like to work on today?</p>
        </div>

        <div className="space-y-8">
          {modulesByCategory.map(({ category, modules }) => {
            const CategoryIcon = getIconComponent(category.icon);

            return (
              <div key={category.code} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-r ${getCategoryGradient(category.color)} p-6`}>
                  <div className="flex items-center space-x-3 text-white">
                    <CategoryIcon className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold">{category.name}</h2>
                      <p className="text-white/80 text-sm">{modules.length} modules enabled</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modules.map(module => {
                      const ModuleIcon = getIconComponent(module.icon);

                      return (
                        <button
                          key={module.name}
                          onClick={() => navigate(module.route || `/${module.name}`)}
                          className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className={`${getModuleColor(module.color)} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                              <ModuleIcon className="w-6 h-6 text-white" />
                            </div>
                            <Icons.ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {module.display_name}
                          </h3>

                          {module.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {module.description}
                            </p>
                          )}

                          <div className="mt-4 flex items-center justify-between text-xs">
                            <span className={`px-2 py-1 rounded-full ${
                              module.is_core
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {module.is_core ? 'Core' : 'Optional'}
                            </span>
                            <span className="text-gray-500">v{module.version}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {modulesByCategory.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Icons.Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Modules Enabled</h2>
            <p className="text-gray-600 mb-6">
              Enable modules in Settings to get started
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
