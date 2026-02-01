import { useState } from 'react';
import { Database, FileText, Award } from 'lucide-react';
import { ImportFieldMappings } from './ImportFieldMappings';
import { ModelAliases } from './ModelAliases';
import { CompanyCertifications } from './CompanyCertifications';

export function SystemConfig() {
  const [activeTab, setActiveTab] = useState<'import-mappings' | 'model-aliases' | 'certifications'>('import-mappings');

  const tabs = [
    { id: 'import-mappings' as const, label: 'Import Mappings', icon: Database },
    { id: 'model-aliases' as const, label: 'Model Aliases', icon: FileText },
    { id: 'certifications' as const, label: 'Certifications', icon: Award },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">System Configuration</h1>
          <p className="text-slate-600">Configure import intelligence, model normalization, and company certifications</p>
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
            {activeTab === 'import-mappings' && <ImportFieldMappings />}
            {activeTab === 'model-aliases' && <ModelAliases />}
            {activeTab === 'certifications' && <CompanyCertifications />}
          </div>
        </div>
      </div>
    </div>
  );
}
