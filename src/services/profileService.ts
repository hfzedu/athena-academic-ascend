
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database["public"]["Enums"]["user_role"];

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateProfile(userId: string, updates: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async searchProfiles(query: string, role?: UserRole) {
    let profileQuery = supabase
      .from('profiles')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('first_name', { ascending: true });
    
    if (role) {
      profileQuery = profileQuery.eq('role', role);
    }
    
    const { data, error } = await profileQuery;
    
    if (error) throw error;
    return data;
  },
  
  async getStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('last_name', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  async getProfessors() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'professor')
      .order('last_name', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  async getTeachingAssistants() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teaching_assistant')
      .order('last_name', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};
