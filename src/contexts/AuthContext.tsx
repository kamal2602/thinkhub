import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { userLandingService } from '../services/userLandingService';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  role: string;
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  userRole: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getUserLandingRoute: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkUserProfile = async (userId: string) => {
    try {
      // First, try to get the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        console.log('Profile loaded:', data);
        console.log('Setting isSuperAdmin to:', data.is_super_admin);
        setProfile(data);
        setIsSuperAdmin(data.is_super_admin || false);
        setUserRole(data.role || 'technician');
        return;
      }

      // If no profile exists, this might be a new user
      // Wait a moment for the trigger to fire
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try again
      const { data: retryData, error: retryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!retryError && retryData) {
        setProfile(retryData);
        setIsSuperAdmin(retryData.is_super_admin || false);
        setUserRole(retryData.role || 'technician');
        return;
      }

      // If still no profile, check if this is the first user and create it
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const shouldBeSuperAdmin = (count === 0 || count === null);

      // Get current user data
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Try to create the profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: currentUser?.email || '',
          full_name: currentUser?.user_metadata?.full_name || '',
          is_super_admin: shouldBeSuperAdmin,
          role: shouldBeSuperAdmin ? 'admin' : 'technician'
        })
        .select()
        .single();

      if (!insertError && newProfile) {
        setProfile(newProfile);
        setIsSuperAdmin(newProfile.is_super_admin || false);
        setUserRole(newProfile.role || 'technician');
      } else {
        // Fallback - set super admin if we can't determine otherwise
        setIsSuperAdmin(shouldBeSuperAdmin);
        setUserRole(shouldBeSuperAdmin ? 'admin' : 'technician');
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      // Default to not super admin if there's an error - safer than granting access
      setIsSuperAdmin(false);
      setUserRole('technician');
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkUserProfile(session.user.id);
        } else {
          setIsSuperAdmin(false);
          setUserRole(null);
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let timeout: NodeJS.Timeout;
    const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;

    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        signOut();
        window.location.reload();
      }, SESSION_TIMEOUT);
    };

    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });

    resetTimeout();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [user]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error: error || null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error || null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const getUserLandingRoute = async (): Promise<string> => {
    if (!user) return '/';
    return await userLandingService.getUserLandingRoute(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isSuperAdmin, userRole, signUp, signIn, signOut, getUserLandingRoute }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
