import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Shield, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function LoginForm() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    checkForExistingUsers();
  }, []);

  const checkForExistingUsers = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      setIsFirstTimeSetup(count === 0);
    } catch (error) {
      console.error('Error checking for existing users:', error);
      setIsFirstTimeSetup(false);
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isFirstTimeSetup) {
      if (!fullName.trim()) {
        setError('Full name is required');
        setLoading(false);
        return;
      }

      if (!companyName.trim()) {
        setError('Company name is required');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await signUp(email, password, fullName);

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      try {
        // Sign in to get session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError || !signInData.user) {
          setError('Account created but failed to sign in. Please try logging in manually.');
          setLoading(false);
          return;
        }

        // Wait for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create the company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({ name: companyName.trim() })
          .select()
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          setError('Account created but failed to create company. Please contact support.');
          setLoading(false);
          return;
        }

        // Update profile with super admin status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_super_admin: true,
            role: 'super_admin'
          })
          .eq('id', signInData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        // Create user_company_access to link user to company
        const { error: accessError } = await supabase
          .from('user_company_access')
          .insert({
            user_id: signInData.user.id,
            company_id: company.id,
            role: 'admin'
          });

        if (accessError) {
          console.error('Error creating company access:', accessError);
          setError('Account and company created, but failed to grant access. Please contact support.');
          setLoading(false);
          return;
        }

        // Success - reload to update auth context
        window.location.reload();
      } catch (err) {
        console.error('Error in first time setup:', err);
        setError('Setup incomplete. Please try logging in manually.');
        setLoading(false);
      }
    } else {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      }
    }
  };

  if (checkingSetup) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className={`flex items-center justify-center w-16 h-16 rounded-xl mb-6 mx-auto ${
          isFirstTimeSetup ? 'bg-green-600' : 'bg-blue-600'
        }`}>
          {isFirstTimeSetup ? (
            <Shield className="w-8 h-8 text-white" />
          ) : (
            <LogIn className="w-8 h-8 text-white" />
          )}
        </div>

        {isFirstTimeSetup ? (
          <>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">First Time Setup</h2>
            <p className="text-gray-600 text-center mb-8">Create your Super Admin account to get started</p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-center mb-8">Sign in to your account to continue</p>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isFirstTimeSetup && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Welcome to StockFlow!</p>
              <p className="text-xs">This account will be created as a Super Administrator with full system access.</p>
            </div>
          )}

          {isFirstTimeSetup && (
            <>
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>Company Name</span>
                  </div>
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="John Doe"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
            {isFirstTimeSetup && (
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isFirstTimeSetup
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {loading ? (isFirstTimeSetup ? 'Creating Account...' : 'Signing in...') : (isFirstTimeSetup ? 'Create Super Admin Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          {!isFirstTimeSetup ? (
            <p className="text-sm text-gray-500">
              Contact your administrator for account access
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setIsFirstTimeSetup(false)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
