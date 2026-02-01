import { useState } from 'react';
import { Building, ArrowRight, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { moduleRegistryService } from '../../services/moduleRegistryService';

interface InitialSetupProps {
  onComplete: () => void;
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    if (!user) {
      setError('No user found. Please log in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyName.trim(),
          created_by: user.id
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', user.id);

      const allModules = await moduleRegistryService.getAllModules();

      for (const module of allModules) {
        await moduleRegistryService.enableModule(company.id, module.name, user.id);
      }

      await moduleRegistryService.updateOnboardingStatus(company.id, {
        is_completed: true,
        completed_steps: ['company_created', 'modules_enabled'],
        modules_selected: allModules.map(m => m.name),
        completed_at: new Date().toISOString()
      });

      onComplete();
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-12 text-white text-center">
          <Building className="w-20 h-20 mx-auto mb-4 opacity-90" />
          <h1 className="text-4xl font-bold mb-3">Welcome to Your ERP</h1>
          <p className="text-blue-100 text-lg">Let's get your business set up in seconds</p>
        </div>

        <div className="p-10 space-y-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What's your company name?
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
              placeholder="e.g., ACME Corporation"
              className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3 text-lg">What happens next:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>Your company profile will be created</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>All core modules will be enabled automatically</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>You'll be taken to your dashboard to start using the system</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading || !companyName.trim()}
            className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Setting up your company...</span>
              </>
            ) : (
              <>
                <span>Create Company & Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
