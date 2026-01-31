import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { UserPlus, Building2 } from 'lucide-react';

interface RegisterFormProps {
  onToggleForm: () => void;
}

export function RegisterForm({ onToggleForm }: RegisterFormProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [checkingFirstUser, setCheckingFirstUser] = useState(true);

  useEffect(() => {
    checkIfFirstUser();
  }, []);

  const checkIfFirstUser = async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setIsFirstUser(count === 0);
    } catch (error) {
      console.error('Error checking first user:', error);
      setIsFirstUser(false);
    } finally {
      setCheckingFirstUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(email, password, fullName);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If first user, create company and set as super admin
    if (isFirstUser && companyName.trim()) {
      try {
        // Sign up creates user but doesn't return session immediately
        // We need to sign in to get the session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError || !signInData.user) {
          console.error('Error signing in after registration:', signInError);
          setError('Account created! Please log in manually to complete setup.');
          setLoading(false);
          setTimeout(() => {
            onToggleForm();
          }, 3000);
          return;
        }

        // Wait for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1500));

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
          setError('Account and company created, but failed to set super admin. Please contact support.');
          setLoading(false);
          return;
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

        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          window.location.reload(); // Reload to update auth context
        }, 1500);
      } catch (err) {
        console.error('Error in first user setup:', err);
        setError('Registration successful, but setup incomplete. Please log in.');
        setLoading(false);
      }
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        onToggleForm();
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-xl mb-6 mx-auto">
          <UserPlus className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Create Account</h2>
        <p className="text-gray-600 text-center mb-8">
          {checkingFirstUser ? 'Loading...' : isFirstUser ? 'Set up your company and admin account' : 'Sign up to get started'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {isFirstUser
                ? 'Company and super admin account created! Redirecting...'
                : 'Account created successfully! Redirecting to login...'}
            </div>
          )}

          {isFirstUser && (
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="Your Company Name"
              />
              <p className="mt-1 text-xs text-gray-500">
                You're the first user! Set up your company to get started.
              </p>
            </div>
          )}

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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="John Doe"
            />
          </div>

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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success || checkingFirstUser}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isFirstUser ? 'Setting up company...' : 'Creating account...') : (isFirstUser ? 'Create Company & Admin Account' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onToggleForm}
              className="text-green-600 font-medium hover:text-green-700 transition"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
