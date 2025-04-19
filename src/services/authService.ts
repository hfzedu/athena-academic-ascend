
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database["public"]["Enums"]["user_role"];

export const authService = {
  async getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  },
  
  async getCurrentSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  },
  
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },
  
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback'
      }
    });
    
    if (error) throw error;
    return data;
  },
  
  async signUp(email: string, password: string, userData: {
    first_name: string;
    last_name: string;
    role: UserRole;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    if (error) throw error;
    return data;
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin + '/reset-password' }
    );
    
    if (error) throw error;
  }
};

// Export the auth service
export default authService;
