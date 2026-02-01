import { useState } from 'react';
import { Package, Award, TrendingUp } from 'lucide-react';
import { ProductTypes } from '../product-types/ProductTypes';
import { GradesConditions } from './GradesConditions';
import ComponentMarketPrices from './ComponentMarketPrices';

export function ProductSetup() {
  const [activeTab, setActiveTab] = useState<'product-types' | 'grades' | 'prices'>('product-types');

  const tabs = [
    { id: 'product-types' as const, label: 'Product Types', icon: Package },
    { id: 'grades' as const, label: 'Grades & Conditions', icon: Award },
    { id: 'prices' as const, label: 'Market Prices', icon: TrendingUp },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Product Setup</h1>
          <p className="text-slate-600">Configure product types, quality grades, and market pricing</p>
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
            {activeTab === 'product-types' && <ProductTypes />}
            {activeTab === 'grades' && <GradesConditions />}
            {activeTab === 'prices' && <ComponentMarketPrices />}
          </div>
        </div>
      </div>
    </div>
  );
}
