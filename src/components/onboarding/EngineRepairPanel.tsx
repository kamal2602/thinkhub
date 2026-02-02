import { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EngineRepairPanelProps {
  companyId: string;
  onComplete: () => void;
}

export function EngineRepairPanel({ companyId, onComplete }: EngineRepairPanelProps) {
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setError('');
    setSuccess(false);

    try {
      const { error: repairError } = await supabase.rpc('initialize_engines_for_company', {
        p_company_id: companyId
      });

      if (repairError) throw repairError;

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Repair error:', err);
      setError(err.message || 'Failed to repair engines');
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-12 text-white text-center">
          <AlertTriangle className="w-20 h-20 mx-auto mb-4 opacity-90" />
          <h1 className="text-4xl font-bold mb-3">Engine Configuration Missing</h1>
          <p className="text-amber-100 text-lg">Your company needs engine initialization</p>
        </div>

        <div className="p-12">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              What happened?
            </h3>
            <p className="text-amber-800 mb-4">
              Your company exists but has 0 engines configured. This can happen if the automatic
              initialization failed or was skipped during setup.
            </p>
            <p className="text-amber-800">
              Click the repair button below to initialize all core engines for your company.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Engines successfully initialized!</p>
            </div>
          )}

          <button
            onClick={handleRepair}
            disabled={repairing || success}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {repairing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Repairing Engines...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Repair Complete
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Repair Engine Configuration
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">What will be initialized?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Core engines (Inventory, Processing, Receiving)</li>
              <li>• Business engines (CRM, Accounting, ITAD, Recycling)</li>
              <li>• Support engines (Reports, Settings, Users)</li>
              <li>• Default configurations and permissions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
