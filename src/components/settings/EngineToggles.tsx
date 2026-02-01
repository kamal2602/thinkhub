import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { engineService, EngineToggles as EngineTogglesType } from '../../services/engineService';
import { useToast } from '../../contexts/ToastContext';
import { useEngines } from '../../hooks/useEngines';
import { getWorkspacesForEngine } from '../../config/workspaces';
import { getDependencyInfo, ENGINE_DEPENDENCIES } from '../../config/engineDependencies';
import {
  ShoppingBag,
  Shield,
  Recycle,
  Gavel,
  Globe,
  Users,
  Package,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface EngineConfig {
  key: keyof EngineTogglesType;
  name: string;
  description: string;
  icon: any;
  color: string;
  features: string[];
}

interface EnginePreset {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  toggles: Partial<EngineTogglesType>;
  recommended?: Partial<EngineTogglesType>;
}

const PRESETS: EnginePreset[] = [
  {
    id: 'reseller',
    name: 'Reseller',
    description: 'Buy, refurbish, and sell IT equipment',
    icon: ShoppingBag,
    color: 'blue',
    toggles: { reseller_enabled: true },
  },
  {
    id: 'itad',
    name: 'ITAD Company',
    description: 'Enterprise IT asset disposition services',
    icon: Shield,
    color: 'red',
    toggles: { itad_enabled: true },
    recommended: { reseller_enabled: true },
  },
  {
    id: 'recycler',
    name: 'Recycler',
    description: 'Component harvesting and material recovery',
    icon: Recycle,
    color: 'green',
    toggles: { recycling_enabled: true },
    recommended: { reseller_enabled: true },
  },
  {
    id: 'ecommerce',
    name: 'eCommerce',
    description: 'Online storefront and web sales',
    icon: Globe,
    color: 'teal',
    toggles: { website_enabled: true, reseller_enabled: true },
  },
  {
    id: 'auction',
    name: 'Auction House',
    description: 'Bulk sales through auction platforms',
    icon: Gavel,
    color: 'yellow',
    toggles: { auction_enabled: true, reseller_enabled: true },
  },
  {
    id: 'crm',
    name: 'CRM Only',
    description: 'Customer relationship management',
    icon: Users,
    color: 'pink',
    toggles: { crm_enabled: true },
  },
];

const ENGINE_CONFIGS: EngineConfig[] = [
  {
    key: 'reseller_enabled',
    name: 'IT Reseller',
    description: 'Buy, refurbish, and sell IT equipment',
    icon: ShoppingBag,
    color: 'blue',
    features: [
      'Purchase Orders & Receiving',
      'Asset Testing & Refurbishment',
      'Grading & Condition Assessment',
      'Sales Invoicing',
      'Profit Tracking',
      'Warranty & RMA Management',
    ],
  },
  {
    key: 'itad_enabled',
    name: 'ITAD Services',
    description: 'IT Asset Disposition services for enterprise clients',
    icon: Shield,
    color: 'red',
    features: [
      'ITAD Project Management',
      'Data Sanitization Tracking',
      'Certificate Generation',
      'Customer Portal Access',
      'Revenue Share Settlements',
      'Environmental Compliance',
    ],
  },
  {
    key: 'recycling_enabled',
    name: 'Recycling',
    description: 'Component harvesting and material recovery',
    icon: Recycle,
    color: 'green',
    features: [
      'Component Harvesting',
      'Parts Inventory Management',
      'Component Sales',
      'Material Breakdown Tracking',
      'Downstream Vendor Management',
      'Scrap Value Calculation',
    ],
  },
  {
    key: 'auction_enabled',
    name: 'Auctions',
    description: 'Bulk sales through auction channels',
    icon: Gavel,
    color: 'yellow',
    features: [
      'Auction Lot Management',
      'Multiple Platform Support',
      'Bid Tracking',
      'Settlement & Commission',
      'Buyer Account Management',
    ],
  },
  {
    key: 'website_enabled',
    name: 'eCommerce',
    description: 'Public storefront for online sales',
    icon: Globe,
    color: 'teal',
    features: [
      'Public Product Catalog',
      'Shopping Cart & Checkout',
      'Payment Processing',
      'Customer Accounts',
      'Order Fulfillment',
      'Shipping Integration',
    ],
  },
  {
    key: 'crm_enabled',
    name: 'CRM',
    description: 'Customer relationship management',
    icon: Users,
    color: 'pink',
    features: [
      'Lead Management',
      'Sales Pipeline',
      'Activity Tracking',
      'Quote Generation',
      'Opportunity Management',
    ],
  },
  {
    key: 'consignment_enabled',
    name: 'Consignment',
    description: 'Manage customer-owned inventory',
    icon: Package,
    color: 'orange',
    features: [
      'Consignment Agreements',
      'Customer-Owned Inventory',
      'Revenue Sharing',
      'Settlement Tracking',
    ],
  },
];

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export function EngineToggles() {
  const { selectedCompany } = useCompany();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const { refresh: refreshEngines } = useEngines();
  const [toggles, setToggles] = useState<EngineTogglesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadToggles();
    }
  }, [selectedCompany?.id]);

  const loadToggles = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const data = await engineService.getEngineToggles(selectedCompany.id);
      setToggles(data);
    } catch (error) {
      console.error('Failed to load engine toggles:', error);
      showToast('Failed to load engine settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyEngineUpdate = async (updates: Partial<EngineTogglesType>) => {
    if (!selectedCompany?.id || !toggles) return;

    try {
      setSaving(true);

      await engineService.updateEngineToggles(selectedCompany.id, updates);

      setToggles({ ...toggles, ...updates });

      await refreshEngines();

      const changedEngines = Object.entries(updates)
        .map(([key, value]) => {
          const config = ENGINE_CONFIGS.find(e => e.key === key);
          return `${config?.name} ${value ? 'enabled' : 'disabled'}`;
        })
        .join(', ');

      showToast(changedEngines, 'success');
    } catch (error) {
      console.error('Failed to update engine toggles:', error);
      showToast('Failed to update engine settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (engine: keyof EngineTogglesType) => {
    if (!selectedCompany?.id || !toggles || userRole !== 'admin') return;

    const newValue = !toggles[engine];
    const depInfo = getDependencyInfo(toggles, engine, newValue);

    if (depInfo) {
      if (depInfo.action === 'enable' && depInfo.dependenciesToEnable) {
        const depNames = depInfo.dependenciesToEnable
          .map(e => ENGINE_CONFIGS.find(c => c.key === e)?.name)
          .join(', ');

        setConfirmDialog({
          isOpen: true,
          title: 'Enable Dependencies?',
          message: `${ENGINE_CONFIGS.find(e => e.key === engine)?.name} requires ${depNames}. Enable them too?`,
          onConfirm: () => {
            const updates: Partial<EngineTogglesType> = { [engine]: true };
            depInfo.dependenciesToEnable!.forEach(dep => {
              updates[dep] = true;
            });
            applyEngineUpdate(updates);
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          },
        });
        return;
      }

      if (depInfo.action === 'disable' && depInfo.dependentsToDisable) {
        const depNames = depInfo.dependentsToDisable
          .map(e => ENGINE_CONFIGS.find(c => c.key === e)?.name)
          .join(', ');

        setConfirmDialog({
          isOpen: true,
          title: 'Disable Dependent Engines?',
          message: `${ENGINE_CONFIGS.find(e => e.key === engine)?.name} is required by ${depNames}. Disable them too?`,
          onConfirm: () => {
            const updates: Partial<EngineTogglesType> = { [engine]: false };
            depInfo.dependentsToDisable!.forEach(dep => {
              updates[dep] = false;
            });
            applyEngineUpdate(updates);
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          },
        });
        return;
      }
    }

    await applyEngineUpdate({ [engine]: newValue });
  };

  const handleApplyPreset = async () => {
    if (!selectedPreset || !toggles) return;

    const preset = PRESETS.find(p => p.id === selectedPreset);
    if (!preset) return;

    const allToggles = { ...preset.toggles };

    if (preset.recommended) {
      const recommendedNames = Object.keys(preset.recommended)
        .map(k => ENGINE_CONFIGS.find(e => e.key === k)?.name)
        .join(', ');

      setConfirmDialog({
        isOpen: true,
        title: 'Apply Recommended Settings?',
        message: `This preset recommends also enabling: ${recommendedNames}. Include them?`,
        onConfirm: () => {
          Object.assign(allToggles, preset.recommended);
          const updates: Partial<EngineTogglesType> = {};
          Object.keys(toggles).forEach(key => {
            const k = key as keyof EngineTogglesType;
            updates[k] = allToggles[k] ?? false;
          });
          applyEngineUpdate(updates);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          setSelectedPreset(null);
        },
      });
      return;
    }

    const updates: Partial<EngineTogglesType> = {};
    Object.keys(toggles).forEach(key => {
      const k = key as keyof EngineTogglesType;
      updates[k] = allToggles[k] ?? false;
    });
    await applyEngineUpdate(updates);
    setSelectedPreset(null);
  };

  if (!selectedCompany) {
    return <div className="p-6 text-slate-500">Please select a company first.</div>;
  }

  if (userRole !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Only administrators can manage engine settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading engine settings...</div>;
  }

  const getColorClasses = (color: string, isEnabled: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600' },
      red: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-600' },
      green: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-600' },
      yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-600' },
      teal: { bg: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-600' },
      pink: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-600' },
      orange: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-600' },
    };

    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Business Engines</h1>
        <p className="text-slate-600 mt-1">
          Enable or disable business modules for your company. Changes take effect immediately.
        </p>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{confirmDialog.title}</h3>
                <p className="text-slate-600 mt-1">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Selector */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Quick Setup Presets</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Select a business profile to configure engines in one click
        </p>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-4">
          {PRESETS.map((preset) => {
            const PresetIcon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <PresetIcon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-600'}`} />
                <div className="text-sm font-medium text-slate-800">{preset.name}</div>
              </button>
            );
          })}
        </div>
        {selectedPreset && (
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {PRESETS.find(p => p.id === selectedPreset)?.name}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {PRESETS.find(p => p.id === selectedPreset)?.description}
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600 mb-3">
              <strong>Will enable:</strong>{' '}
              {Object.keys(PRESETS.find(p => p.id === selectedPreset)?.toggles || {})
                .map(k => ENGINE_CONFIGS.find(e => e.key === k)?.name)
                .join(', ')}
            </div>
            {PRESETS.find(p => p.id === selectedPreset)?.recommended && (
              <div className="text-sm text-slate-600 mb-3">
                <strong>Recommended:</strong>{' '}
                {Object.keys(PRESETS.find(p => p.id === selectedPreset)?.recommended || {})
                  .map(k => ENGINE_CONFIGS.find(e => e.key === k)?.name)
                  .join(', ')}
              </div>
            )}
            <button
              onClick={handleApplyPreset}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Apply Preset
            </button>
          </div>
        )}
      </div>

      {/* Engine Status Summary */}
      {toggles && Object.values(toggles).some(v => v) && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Active Workspaces</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(toggles)
              .filter(([_, enabled]) => enabled)
              .flatMap(([engine]) => {
                const workspaces = getWorkspacesForEngine(engine as keyof EngineTogglesType);
                return workspaces.map(ws => (
                  <span key={ws} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {ws}
                  </span>
                ));
              })
            }
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ENGINE_CONFIGS.map((engine) => {
          const Icon = engine.icon;
          const isEnabled = toggles?.[engine.key] ?? false;
          const colors = getColorClasses(engine.color, isEnabled);

          return (
            <div
              key={engine.key}
              className={`bg-white rounded-lg border-2 p-6 transition-all ${
                isEnabled ? `${colors.border}` : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isEnabled ? `${colors.bg}` : 'bg-slate-100'
                }`}>
                  <Icon className={`w-6 h-6 ${isEnabled ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <button
                  onClick={() => handleToggle(engine.key)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isEnabled
                      ? `${colors.bg} text-white hover:opacity-90`
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${isEnabled ? colors.text : 'text-slate-800'}`}>
                {engine.name}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {engine.description}
              </p>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-slate-500">
                  Features:
                </p>
                <ul className="space-y-1">
                  {engine.features.map((feature, idx) => (
                    <li key={idx} className="text-sm flex items-center text-slate-600">
                      <span className="mr-2">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {ENGINE_DEPENDENCIES[engine.key] && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-medium uppercase text-slate-500 mb-2">
                    Requires:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ENGINE_DEPENDENCIES[engine.key]!.requires.map((reqEngine) => (
                      <span
                        key={reqEngine}
                        className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700"
                      >
                        {ENGINE_CONFIGS.find(e => e.key === reqEngine)?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {getWorkspacesForEngine(engine.key).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-medium uppercase text-slate-500 mb-2">
                    Workspaces Enabled:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getWorkspacesForEngine(engine.key).map((workspace) => (
                      <span
                        key={workspace}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          isEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {workspace}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Disabling an engine hides its features in the navigation but does not delete any data.
          You can safely re-enable engines at any time without data loss.
        </p>
      </div>
    </div>
  );
}
