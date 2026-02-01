import React from 'react';
import { EngineSettings, SettingsSection } from './EngineSettings';

export function ResellerSettings() {
  return (
    <EngineSettings engineKey="reseller" engineTitle="Reseller">
      <SettingsSection
        title="Pricing & Margins"
        description="Configure pricing strategies and margin targets"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Markup %
            </label>
            <input
              type="number"
              defaultValue="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Margin %
            </label>
            <input
              type="number"
              defaultValue="15"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Auto-calculate pricing based on grading</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Order Management"
        description="Configure order processing and fulfillment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Payment Terms
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Net 30</option>
              <option>Net 60</option>
              <option>Prepaid</option>
              <option>COD</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Auto-generate invoice on order completion</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require inventory reservation on order</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Customer Settings"
        description="Configure customer-facing features"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Allow customer price negotiation</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Enable bulk order discounts</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Show inventory availability to customers</span>
          </div>
        </div>
      </SettingsSection>
    </EngineSettings>
  );
}
