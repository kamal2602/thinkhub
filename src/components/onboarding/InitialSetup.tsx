import { useState, useEffect } from 'react';
import { Building, ArrowRight, Loader, LogOut, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface InitialSetupProps {
  onComplete: () => void;
}

interface DiagnosticsData {
  companiesCount: number;
  selectedCompanyId: string | null;
  enginesCount: number;
  rlsError: string | null;
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData>({
    companiesCount: 0,
    selectedCompanyId: null,
    enginesCount: 0,
    rlsError: null,
  });

  useEffect(() => {
    localStorage.removeItem('selectedCompanyId');
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    if (!user) return;

    try {
      const [companiesRes, selectedId] = await Promise.all([
        supabase
          .from('companies')
          .select('id', { count: 'exact', head: true }),
        Promise.resolve(localStorage.getItem('selectedCompanyId')),
      ]);

      let enginesCount = 0;
      if (selectedId) {
        const { count } = await supabase
          .from('engines')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', selectedId);
        enginesCount = count || 0;
      }

      setDiagnostics({
        companiesCount: companiesRes.count || 0,
        selectedCompanyId: selectedId,
        enginesCount,
        rlsError: null,
      });
    } catch (err: any) {
      setDiagnostics(prev => ({
        ...prev,
        rlsError: err.message?.includes('policy') ? 'RLS policy blocking access' : null,
      }));
    }
  };

  const handleSignOut = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

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

      // Wait for triggers to complete:
      // 1. Auto-grant company access (grant_creator_company_access)
      // 2. Initialize engines (trigger_initialize_engines)
      await new Promise(resolve => setTimeout(resolve, 1000));

      localStorage.setItem('selectedCompanyId', company.id);

      // Mark onboarding as started (wizard will complete it)
      const { error: onboardingError } = await supabase
        .from('onboarding_status')
        .upsert({
          company_id: company.id,
          is_completed: false,
          current_step: 'modules',
          completed_steps: ['company_created'],
          modules_selected: []
        }, {
          onConflict: 'company_id'
        });

      if (onboardingError) {
        console.error('Error creating onboarding status:', onboardingError);
      }

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
      <button
        onClick={handleSignOut}
        className="fixed top-4 right-4 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-2 shadow-md"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>

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

          <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Info className="w-4 h-4" />
                Setup Diagnostics
              </span>
              <span className="text-xs text-gray-500">
                {showDiagnostics ? 'Hide' : 'Show'}
              </span>
            </button>
            {showDiagnostics && (
              <div className="p-4 bg-white border-t border-gray-200">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2 text-gray-600 font-medium">User ID:</td>
                      <td className="py-2 text-gray-900 font-mono text-xs">{user?.id || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600 font-medium">Companies Found:</td>
                      <td className="py-2 text-gray-900">{diagnostics.companiesCount}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600 font-medium">Selected Company:</td>
                      <td className="py-2 text-gray-900 font-mono text-xs">
                        {diagnostics.selectedCompanyId || 'None'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600 font-medium">Engines Count:</td>
                      <td className="py-2 text-gray-900">{diagnostics.enginesCount}</td>
                    </tr>
                    {diagnostics.rlsError && (
                      <tr>
                        <td className="py-2 text-gray-600 font-medium">RLS Status:</td>
                        <td className="py-2 text-red-600">{diagnostics.rlsError}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
