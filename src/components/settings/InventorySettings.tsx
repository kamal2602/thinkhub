import React from 'react';
import { EngineSettings, SettingsSection } from './EngineSettings';

export function InventorySettings() {
  return (
    <EngineSettings engineKey="inventory" engineTitle="Inventory">
      <SettingsSection
        title="Stock Management"
        description="Configure inventory tracking and stock control"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Stock Location
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Main Warehouse</option>
              <option>Processing Floor</option>
              <option>Staging Area</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Track serial numbers for all assets</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Auto-generate internal IDs on receiving</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require barcode scanning for movements</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Valuation & Costing"
        description="Configure inventory valuation methods"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valuation Method
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>FIFO (First In, First Out)</option>
              <option>LIFO (Last In, First Out)</option>
              <option>Weighted Average</option>
              <option>Specific Identification</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Include refurbishment costs in valuation</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Auto-adjust values based on market prices</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Stock Alerts"
        description="Configure low stock and aging inventory alerts"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aging Threshold (days)
            </label>
            <input
              type="number"
              defaultValue="90"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Alert on aging inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Alert on negative stock</span>
          </div>
        </div>
      </SettingsSection>
    </EngineSettings>
  );
}
