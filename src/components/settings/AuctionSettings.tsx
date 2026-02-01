import React from 'react';
import { EngineSettings, SettingsSection } from './EngineSettings';

export function AuctionSettings() {
  return (
    <EngineSettings engineKey="auction" engineTitle="Auction">
      <SettingsSection
        title="Auction Defaults"
        description="Configure default auction settings and behavior"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Auction Duration
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>3 days</option>
              <option>5 days</option>
              <option>7 days</option>
              <option>10 days</option>
              <option>14 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bid Increment %
            </label>
            <input
              type="number"
              defaultValue="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reserve Price Policy
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Optional</option>
              <option>Required</option>
              <option>Hidden from bidders</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Bidder Settings"
        description="Configure bidder registration and verification"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require bidder registration</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Require identity verification</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
            <span className="text-sm text-gray-600">Email notifications on outbid</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Payment & Settlement"
        description="Configure auction payment and settlement terms"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Due After Auction Close
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Immediate</option>
              <option>24 hours</option>
              <option>48 hours</option>
              <option>7 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buyer's Premium %
            </label>
            <input
              type="number"
              defaultValue="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </SettingsSection>
    </EngineSettings>
  );
}
