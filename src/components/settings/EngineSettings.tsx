import React from 'react';
import { Settings } from 'lucide-react';

interface EngineSettingsProps {
  engineKey: string;
  engineTitle: string;
  children: React.ReactNode;
}

export function EngineSettings({ engineKey, engineTitle, children }: EngineSettingsProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{engineTitle} Settings</h1>
          </div>
          <p className="text-gray-600">Configure your {engineTitle.toLowerCase()} engine</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-gray-200 last:border-b-0 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}
