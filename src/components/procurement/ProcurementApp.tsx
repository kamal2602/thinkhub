import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { IntakeWizard } from './IntakeWizard';
import { PurchaseOrders } from '../purchases/PurchaseOrders';
import { SmartPOImport } from '../purchases/SmartPOImport';

export function ProcurementApp() {
  const [showWizard, setShowWizard] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWizardSuccess = () => {
    setShowWizard(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Procurement & Intake</h1>
            <p className="text-gray-600 mt-1">
              Centralized inbound management: resale, ITAD, and recycling
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Intake
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Import Excel
            </button>
          </div>
        </div>
      </div>

      {showWizard && (
        <IntakeWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleWizardSuccess}
        />
      )}

      {showImport && (
        <SmartPOImport
          onClose={() => setShowImport(false)}
          onImport={handleImportSuccess}
        />
      )}

      <div className="flex-1 overflow-auto">
        <PurchaseOrders key={refreshKey} />
      </div>
    </div>
  );
}
