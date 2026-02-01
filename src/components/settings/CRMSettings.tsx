import React from 'react';
import { EngineSettings, SettingsSection } from './EngineSettings';

export function CRMSettings() {
  return (
    <EngineSettings engineKey="crm" engineTitle="CRM">
      <SettingsSection
        title="Pipeline Stages"
        description="Configure your sales pipeline stages and conversion rules"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Lead Status
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>New</option>
              <option>Contacted</option>
              <option>Qualified</option>
              <option>Unqualified</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-assign Leads
            </label>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="text-sm text-gray-600">Automatically assign new leads to available sales reps</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Configure CRM notifications and alerts"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Notify on new lead assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Notify on opportunity stage change</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Daily activity summary</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Integration"
        description="Connect CRM with other systems"
      >
        <div className="text-sm text-gray-600">
          <p>CRM automatically syncs with:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Parties (Customers & Contacts)</li>
            <li>Sales Orders</li>
            <li>Invoicing</li>
          </ul>
        </div>
      </SettingsSection>
    </EngineSettings>
  );
}
