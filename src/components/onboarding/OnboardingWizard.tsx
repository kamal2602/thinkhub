import React, { useState, useEffect } from 'react';
import { Building2, Layers, Settings, CheckCircle2, ArrowRight, Users, Sliders } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import * as Icons from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { selectedCompany, refreshCompanies } = useCompany();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<string[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('admin');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEngines();
    if (selectedCompany) {
      setCompanyName(selectedCompany.name || '');
    }
  }, [selectedCompany]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const allEngines = await engineRegistryService.getEngines(selectedCompany.id);
      const optionalEngines = allEngines.filter(e => !e.is_core);
      setEngines(optionalEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
    }
  };

  const handleCompanyUpdate = async () => {
    if (!selectedCompany || !companyName.trim()) {
      addToast('Please enter a company name', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: companyName.trim() })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      await refreshCompanies();
      setCurrentStep(2);
      addToast('Company info updated', 'success');
    } catch (error) {
      console.error('Error updating company:', error);
      addToast('Failed to update company', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnginesEnable = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      for (const engineKey of selectedEngines) {
        await engineRegistryService.toggleEngine(selectedCompany.id, engineKey, true);
      }

      setCurrentStep(3);
      addToast('Modules enabled', 'success');
    } catch (error: any) {
      console.error('Error enabling engines:', error);
      addToast(error.message || 'Failed to enable modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCoreConfigComplete = () => {
    setCurrentStep(4);
    addToast('Core configuration saved', 'success');
  };

  const handleInviteUser = async () => {
    if (inviteEmail.trim()) {
      addToast('Invitation will be sent when user management is configured', 'info');
    }
    setCurrentStep(5);
  };

  const handleComplete = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ onboarding_completed: true })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      await refreshCompanies();
      addToast('Setup complete!', 'success');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      addToast('Failed to complete setup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEngine = (engineKey: string) => {
    setSelectedEngines(prev =>
      prev.includes(engineKey)
        ? prev.filter(k => k !== engineKey)
        : [...prev, engineKey]
    );
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Box;
  };

  const steps = [
    { number: 1, title: 'Company', icon: Building2 },
    { number: 2, title: 'Modules', icon: Layers },
    { number: 3, title: 'Core Config', icon: Sliders },
    { number: 4, title: 'Invite Team', icon: Users },
    { number: 5, title: 'Complete', icon: CheckCircle2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to StockPro</h1>
          <p className="text-gray-600">Let's get your workspace set up</p>
        </div>

        <div className="flex justify-center mb-8">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                currentStep >= step.number
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-400'
              }`}>
                <step.icon className="w-5 h-5" />
                <span className="font-medium">{step.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-400 mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Information</h2>
                <p className="text-gray-600">Tell us about your business</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleCompanyUpdate}
                disabled={loading || !companyName.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enable Modules</h2>
                <p className="text-gray-600">Choose which features you want to use (you can change this later)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {engines.map((engine) => {
                  const Icon = getIcon(engine.icon);
                  const isSelected = selectedEngines.includes(engine.key);

                  return (
                    <button
                      key={engine.key}
                      onClick={() => toggleEngine(engine.key)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{engine.title}</h3>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{engine.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleEnginesEnable}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enabling...' : selectedEngines.length > 0 ? 'Continue' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Core Configuration</h2>
                <p className="text-gray-600">Set up essential system settings</p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Default Settings Applied</h3>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Party types configured (Customer, Supplier, Contact)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Chart of accounts initialized</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Default location created (Main Warehouse)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Processing stages configured</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    You can customize these settings later from the Settings menu. The defaults work great for most businesses.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCoreConfigComplete}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Team Members</h2>
                <p className="text-gray-600">Add administrators and users to your workspace (optional)</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Administrator</option>
                    <option value="user">Standard User</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    You can invite more team members later from the Users section.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleInviteUser}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteEmail.trim() ? 'Send Invite & Continue' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
                <p className="text-gray-600">Your workspace is ready to use</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">What's Next?</h3>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Access your dashboard to see an overview</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Visit the Apps page to enable more modules</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Explore Settings to configure your modules</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Finalizing...' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
