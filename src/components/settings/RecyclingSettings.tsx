import React from 'react';
import { EngineSettings, SettingsSection } from './EngineSettings';

export function RecyclingSettings() {
  return (
    <EngineSettings engineKey="recycling" engineTitle="Recycling">
      <SettingsSection
        title="Processing Workflow"
        description="Configure asset processing and component harvesting workflows"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Processing Stage
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Receiving</option>
              <option>Data Sanitization</option>
              <option>Testing</option>
              <option>Grading</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Auto-track processing time per stage</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require test results before grade assignment</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Component Harvesting"
        description="Configure component extraction and tracking"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Auto-detect component types from parent asset</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Track component serial numbers</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require harvest value estimation</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Environmental Tracking"
        description="Configure ESG and compliance tracking"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Track CO2 savings per asset</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Generate environmental compliance reports</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require certifications for scrap disposal</span>
          </div>
        </div>
      </SettingsSection>
    </EngineSettings>
  );
}
