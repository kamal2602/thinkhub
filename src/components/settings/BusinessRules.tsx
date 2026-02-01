import { useState } from 'react';
import { CreditCard, RotateCcw, Shield } from 'lucide-react';
import { PaymentTerms } from './PaymentTerms';
import { ReturnReasons } from './ReturnReasons';
import { WarrantyTypes } from './WarrantyTypes';

export function BusinessRules() {
  const [activeTab, setActiveTab] = useState<'payment-terms' | 'return-reasons' | 'warranty-types'>('payment-terms');

  const tabs = [
    { id: 'payment-terms' as const, label: 'Payment Terms', icon: CreditCard },
    { id: 'return-reasons' as const, label: 'Return Reasons', icon: RotateCcw },
    { id: 'warranty-types' as const, label: 'Warranty Types', icon: Shield },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Business Rules</h1>
          <p className="text-slate-600">Configure payment terms, return policies, and warranty options</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {activeTab === 'payment-terms' && <PaymentTerms />}
            {activeTab === 'return-reasons' && <ReturnReasons />}
            {activeTab === 'warranty-types' && <WarrantyTypes />}
          </div>
        </div>
      </div>
    </div>
  );
}
