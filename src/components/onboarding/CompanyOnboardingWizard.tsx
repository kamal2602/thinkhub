import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, Package, Users, Shield, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { moduleRegistryService, Module, ModuleCategory } from '../../services/moduleRegistryService';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function CompanyOnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { company } = useCompany();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(['dashboard', 'inventory', 'settings']));
  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const [modulesData, categoriesData] = await Promise.all([
        moduleRegistryService.getAllModules(),
        moduleRegistryService.getModuleCategories()
      ]);
      setModules(modulesData);
      setCategories(categoriesData);

      const coreModules = modulesData
        .filter(m => m.is_core)
        .map(m => m.name);
      setSelectedModules(new Set(coreModules));
    } catch (error) {
      console.error('Failed to load modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleName: string) => {
    const module = modules.find(m => m.name === moduleName);
    if (!module) return;

    const newSelection = new Set(selectedModules);

    if (newSelection.has(moduleName)) {
      if (module.is_core) return;

      const dependents = modules.filter(m =>
        m.depends_on.includes(moduleName) && newSelection.has(m.name)
      );

      if (dependents.length > 0) {
        alert(`Cannot disable ${module.display_name}. It's required by: ${dependents.map(d => d.display_name).join(', ')}`);
        return;
      }

      newSelection.delete(moduleName);
    } else {
      newSelection.add(moduleName);

      module.depends_on.forEach(dep => {
        newSelection.add(dep);
      });
    }

    setSelectedModules(newSelection);
  };

  const completeOnboarding = async () => {
    if (!company || !user) return;

    try {
      for (const moduleName of selectedModules) {
        await moduleRegistryService.enableModule(company.id, moduleName, user.id);
      }

      const disabledModules = modules
        .filter(m => !selectedModules.has(m.name))
        .map(m => m.name);

      for (const moduleName of disabledModules) {
        await moduleRegistryService.disableModule(company.id, moduleName);
      }

      await moduleRegistryService.updateOnboardingStatus(company.id, {
        is_completed: true,
        completed_steps: steps.map(s => s.id),
        modules_selected: Array.from(selectedModules),
        completed_at: new Date().toISOString()
      });

      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    }
  };

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Your ERP System',
      description: 'Let\'s get you set up in just a few steps'
    },
    {
      id: 'modules',
      title: 'Select Your Modules',
      description: 'Choose which features you want to enable for your business'
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Your system is ready to use'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{steps[currentStep].title}</h1>
          <p className="text-blue-100">{steps[currentStep].description}</p>

          <div className="flex items-center mt-6 space-x-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index <= currentStep ? 'bg-white border-white text-blue-600' : 'border-blue-300 text-blue-300'
                }`}>
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${index < currentStep ? 'bg-white' : 'bg-blue-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Modular ERP</h2>
                <p className="text-gray-600">
                  This system is designed to grow with your business. Start with the essentials and
                  add more modules as you need them.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Operations</h3>
                  <p className="text-sm text-gray-600">Manage inventory, processing, and sales</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Sales Channels</h3>
                  <p className="text-sm text-gray-600">Auctions, website, and more</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <Shield className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Compliance</h3>
                  <p className="text-sm text-gray-600">ITAD, ESG, recycling tracking</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Your Modules</h2>
                <p className="text-gray-600 mb-6">
                  Select the modules you want to enable. Core modules are required and cannot be disabled.
                  Dependencies will be automatically enabled.
                </p>
              </div>

              <div className="space-y-6">
                {categories.map(category => {
                  const categoryModules = modules.filter(m => m.category === category.code);
                  if (categoryModules.length === 0) return null;

                  return (
                    <div key={category.code} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className={`w-2 h-2 rounded-full bg-${category.color}-500 mr-2`}></div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryModules.map(module => {
                          const isSelected = selectedModules.has(module.name);
                          const isCore = module.is_core;

                          return (
                            <button
                              key={module.name}
                              onClick={() => toggleModule(module.name)}
                              disabled={isCore}
                              className={`text-left p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              } ${isCore ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">{module.display_name}</span>
                                    {isCore && (
                                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                        Core
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                                  {module.depends_on.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Requires: {module.depends_on.join(', ')}
                                    </p>
                                  )}
                                </div>
                                <div className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{selectedModules.size}</strong> modules selected. You can enable or disable modules later in Settings.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
                <p className="text-gray-600">
                  Your system has been configured with {selectedModules.size} modules.
                  You're ready to start using your ERP system.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Enabled Modules:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from(selectedModules).map(moduleName => {
                    const module = modules.find(m => m.name === moduleName);
                    return (
                      <div key={moduleName} className="flex items-center space-x-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{module?.display_name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={nextStep}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
