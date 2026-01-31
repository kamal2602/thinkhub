import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CustomerPortalUser {
  id: string;
  customer_id: string;
  company_id: string;
  email: string;
  full_name: string;
  phone?: string;
  job_title?: string;
  is_primary_contact: boolean;
  notification_preferences: any;
  last_login_at?: string;
}

interface CustomerPortalAuthContextType {
  portalUser: CustomerPortalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateProfile: (data: Partial<CustomerPortalUser>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

interface RegisterData {
  customer_id: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  job_title?: string;
}

const CustomerPortalAuthContext = createContext<CustomerPortalAuthContextType | undefined>(undefined);

export function CustomerPortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [portalUser, setPortalUser] = useState<CustomerPortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionData = localStorage.getItem('customer_portal_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const { data, error } = await supabase
          .from('customer_portal_users')
          .select('*')
          .eq('id', session.userId)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          setPortalUser(data);
        } else {
          localStorage.removeItem('customer_portal_session');
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
      localStorage.removeItem('customer_portal_session');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data: user, error } = await supabase
        .from('customer_portal_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        throw new Error('Invalid email or password');
      }

      const simpleHash = btoa(password);

      if (user.password_hash !== simpleHash) {
        throw new Error('Invalid email or password');
      }

      await supabase
        .from('customer_portal_users')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (user.login_count || 0) + 1
        })
        .eq('id', user.id);

      const session = {
        userId: user.id,
        email: user.email,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
      };

      localStorage.setItem('customer_portal_session', JSON.stringify(session));
      setPortalUser(user);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    localStorage.removeItem('customer_portal_session');
    setPortalUser(null);
  };

  const register = async (data: RegisterData) => {
    try {
      const password_hash = btoa(data.password);

      const { data: customer } = await supabase
        .from('customers')
        .select('company_id')
        .eq('id', data.customer_id)
        .maybeSingle();

      if (!customer) {
        throw new Error('Invalid customer ID');
      }

      const { data: newUser, error } = await supabase
        .from('customer_portal_users')
        .insert({
          customer_id: data.customer_id,
          company_id: customer.company_id,
          email: data.email.toLowerCase(),
          full_name: data.full_name,
          phone: data.phone,
          job_title: data.job_title,
          password_hash,
          is_active: true,
          email_verified: false
        })
        .select()
        .single();

      if (error) throw error;

      await login(data.email, data.password);
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const updateProfile = async (updates: Partial<CustomerPortalUser>) => {
    if (!portalUser) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('customer_portal_users')
        .update(updates)
        .eq('id', portalUser.id);

      if (error) throw error;

      setPortalUser({ ...portalUser, ...updates });
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      const { error } = await supabase
        .from('customer_portal_users')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt
        })
        .eq('email', email.toLowerCase());

      if (error) throw error;

    } catch (error: any) {
      throw new Error(error.message || 'Password reset request failed');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const { data: user, error: fetchError } = await supabase
        .from('customer_portal_users')
        .select('*')
        .eq('reset_token', token)
        .gt('reset_token_expires_at', new Date().toISOString())
        .maybeSingle();

      if (fetchError || !user) {
        throw new Error('Invalid or expired reset token');
      }

      const password_hash = btoa(newPassword);

      const { error } = await supabase
        .from('customer_portal_users')
        .update({
          password_hash,
          reset_token: null,
          reset_token_expires_at: null
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  };

  return (
    <CustomerPortalAuthContext.Provider
      value={{
        portalUser,
        loading,
        login,
        logout,
        register,
        updateProfile,
        requestPasswordReset,
        resetPassword
      }}
    >
      {children}
    </CustomerPortalAuthContext.Provider>
  );
}

export function useCustomerPortalAuth() {
  const context = useContext(CustomerPortalAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerPortalAuth must be used within CustomerPortalAuthProvider');
  }
  return context;
}
