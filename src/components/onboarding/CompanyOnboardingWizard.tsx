import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, Package, Users, Shield, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function CompanyOnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { company } = useCompany();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedEngines, setSelectedEngines] = useState<Set<string>>(new Set());
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngines();
  }, [company]);

  const loadEngines = async () => {
    if (!company) return;

    try {
      const enginesData = await engineRegistryService.getEngines(company.id);
      setEngines(enginesData);

      const coreEngines = enginesData
        .filter(e => e.is_core)
        .map(e => e.key);
      setSelectedEngines(new Set(coreEngines));
    } catch (error) {
      console.error('Failed to load engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEngine = async (engineKey: string) => {
    const engine = engines.find(e => e.key === engineKey);
    if (!engine) return;

    const newSelection = new Set(selectedEngines);

    if (newSelection.has(engineKey)) {
      if (engine.is_core) return;

      const dependents = engines.filter(e =>
        e.depends_on.includes(engineKey) && newSelection.has(e.key)
      );

      if (dependents.length > 0) {
        alert(`Cannot disable ${engine.title}. It's required by: ${dependents.map(d => d.title).join(', ')}`);
        return;
      }

      newSelection.delete(engineKey);
    } else {
      newSelection.add(engineKey);

      engine.depends_on.forEach(dep => {
        newSelection.add(dep);
      });
    }

    setSelectedEngines(newSelection);
  };

  const completeOnboarding = async () => {
    if (!company || !user) return;

    try {
      for (const engineKey of selectedEngines) {
        await engineRegistryService.toggleEngine(company.id, engineKey, true);
      }

      const disabledEngines = engines
        .filter(e => !selectedEngines.has(e.key) && !e.is_core)
        .map(e => e.key);

      for (const engineKey of disabledEngines) {
        await engineRegistryService.toggleEngine(company.id, engineKey, false);
      }

      const { error } = await supabase
        .from('onboarding_status')
        .upsert({
          company_id: company.id,
          is_completed: true,
          completed_steps: steps.map(s => s.id),
          modules_selected: Array.from(selectedEngines),
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        });

      if (error) throw error;

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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Your Engines</h2>
                <p className="text-gray-600 mb-6">
                  Select the features you want to enable. Core engines are required and cannot be disabled.
                  Dependencies will be automatically enabled.
                </p>
              </div>

              <div className="space-y-6">
                {['operations', 'sales', 'business', 'system'].map(category => {
                  const categoryEngines = engines.filter(e => e.category === category && e.is_installed);
                  if (categoryEngines.length === 0) return null;

                  const categoryLabels: Record<string, string> = {
                    operations: 'Operations',
                    sales: 'Sales Channels',
                    business: 'Business',
                    system: 'System'
                  };

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <h3 className="font-semibold text-gray-900">{categoryLabels[category]}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryEngines.map(engine => {
                          const isSelected = selectedEngines.has(engine.key);
                          const isCore = engine.is_core;

                          return (
                            <button
                              key={engine.key}
                              onClick={() => toggleEngine(engine.key)}
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
                                    <span className="font-medium text-gray-900">{engine.title}</span>
                                    {isCore && (
                                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                        Core
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{engine.description}</p>
                                  {engine.depends_on.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Requires: {engine.depends_on.join(', ')}
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
                  <strong>{selectedEngines.size}</strong> engines selected. You can enable or disable engines later in Settings.
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
                  Your system has been configured with {selectedEngines.size} engines.
                  You're ready to start using your ERP system.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Enabled Engines:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from(selectedEngines).map(engineKey => {
                    const engine = engines.find(e => e.key === engineKey);
                    return (
                      <div key={engineKey} className="flex items-center space-x-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{engine?.title}</span>
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
