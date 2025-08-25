
import { createContext, useState, useEffect, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { profileService } from '@/services';

// Define the user profile interface
export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  departmentId?: string;
  departmentName?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

// Define the auth context type
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  profile: UserProfile | null; // Added this property
  loading: boolean;
  isLoadingAuth: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  profile: null, // Added this property
  loading: true,
  isLoadingAuth: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  confirmPasswordReset: async () => {},
  updateProfile: async () => {},
});

// Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const mapDbProfileToUserProfile = (p: Database["public"]["Tables"]["profiles"]["Row"]): UserProfile => ({
    id: p.id,
    userId: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    displayName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    avatarUrl: p.avatar_url || undefined,
    role: p.role as unknown as string,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  });

  // Listen for auth changes
  useEffect(() => {
    console.info('Setting up auth state listener');
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.info('Auth state changed:', event, session?.user);
        setUser(session?.user ?? null);
        setSession(session ?? null);

        if (session?.user) {
          try {
            const profile = await profileService.getProfileByUserId(session.user.id);
            if (profile) setUserProfile(mapDbProfileToUserProfile(profile));
            else setUserProfile(null);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Initial session check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.info('Initial session check:', session);
      
      setUser(session?.user ?? null);
      setSession(session ?? null);
      
      if (session?.user) {
        try {
          const profile = await profileService.getProfileByUserId(session.user.id);
          if (profile) setUserProfile(mapDbProfileToUserProfile(profile));
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      
      setLoading(false);
    };

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sign in method
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up method
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out method
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reset password method
  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Confirm password reset
  const confirmPasswordReset = async (token: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error confirming password reset:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profile: Partial<UserProfile>) => {
    setLoading(true);
    try {
      if (!user) throw new Error('User not authenticated');
      
      const updatedProfile = await profileService.updateProfile(user.id, profile);
      setUserProfile(mapDbProfileToUserProfile(updatedProfile));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    userProfile,
    profile: userProfile, // Added this property as an alias
    loading,
    isLoadingAuth: loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    confirmPasswordReset,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
