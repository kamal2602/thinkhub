import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { engineService, EngineToggles as EngineTogglesType } from '../../services/engineService';
import { useToast } from '../../contexts/ToastContext';
import {
  ShoppingBag,
  Shield,
  Recycle,
  Gavel,
  Globe,
  Users,
  Package
} from 'lucide-react';

interface EngineConfig {
  key: keyof EngineTogglesType;
  name: string;
  description: string;
  icon: any;
  color: string;
  features: string[];
}

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

export function EngineToggles() {
  const { selectedCompany } = useCompany();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const [toggles, setToggles] = useState<EngineTogglesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleToggle = async (engine: keyof EngineTogglesType) => {
    if (!selectedCompany?.id || !toggles || userRole !== 'admin') return;

    try {
      setSaving(true);
      const newValue = !toggles[engine];

      await engineService.updateEngineToggles(selectedCompany.id, {
        [engine]: newValue,
      });

      setToggles({ ...toggles, [engine]: newValue });
      showToast(
        `${ENGINE_CONFIGS.find(e => e.key === engine)?.name} ${newValue ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      console.error('Failed to update engine toggle:', error);
      showToast('Failed to update engine setting', 'error');
    } finally {
      setSaving(false);
    }
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
