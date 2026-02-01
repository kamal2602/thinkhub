import { useState } from 'react';
import { HardDrive, Award, Leaf } from 'lucide-react';
import { DataSanitization } from './DataSanitization';
import { Certificates } from './Certificates';
import { EnvironmentalCompliance } from './EnvironmentalCompliance';

export function ITADCompliance() {
  const [activeTab, setActiveTab] = useState<'sanitization' | 'certificates' | 'environmental'>('sanitization');

  const tabs = [
    { id: 'sanitization' as const, label: 'Data Sanitization', icon: HardDrive },
    { id: 'certificates' as const, label: 'Certificates', icon: Award },
    { id: 'environmental' as const, label: 'Environmental', icon: Leaf },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">ITAD Compliance</h1>
          <p className="text-slate-600">Manage data sanitization, certificates, and environmental compliance</p>
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
            {activeTab === 'sanitization' && <DataSanitization />}
            {activeTab === 'certificates' && <Certificates />}
            {activeTab === 'environmental' && <EnvironmentalCompliance />}
          </div>
        </div>
      </div>
    </div>
  );
}
