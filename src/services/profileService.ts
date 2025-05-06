
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

type UserRole = Database["public"]["Enums"]["user_role"];

export interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  department_id?: string;
  title?: string;
  office_location?: string;
  office_hours?: string;
  bio?: string;
  phone?: string;
}

export interface DepartmentData {
  id: string;
  name: string;
  code: string;
}

// Fix the circular reference by making this interface simpler
export interface ProfileWithDepartment extends ProfileData {
  // Make departments explicitly nullable and of type DepartmentData
  departments: DepartmentData | null;
}

export const profileService = {
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data as ProfileData;
    } catch (error: any) {
      console.error(`Error fetching profile ${userId}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch profile: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  },
  
  async updateProfile(userId: string, updates: Partial<ProfileData>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      return data as ProfileData;
    } catch (error: any) {
      console.error(`Error updating profile ${userId}:`, error);
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  },
  
  async searchProfiles(query: string, role?: UserRole) {
    try {
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
      return data as ProfileData[];
    } catch (error: any) {
      console.error(`Error searching profiles:`, error);
      toast({
        title: "Error",
        description: `Search failed: ${error.message}`,
        variant: "destructive",
      });
      return [];
    }
  },
  
  async getByRole(role: UserRole) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments(*)')
        .eq('role', role)
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      
      // Use a type assertion without recursive type issues
      return data as unknown as ProfileWithDepartment[];
    } catch (error: any) {
      console.error(`Error fetching profiles with role ${role}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch ${role}s: ${error.message}`,
        variant: "destructive",
      });
      return [];
    }
  },
  
  async getStudents() {
    return this.getByRole('student');
  },
  
  async getProfessors() {
    return this.getByRole('professor');
  },
  
  async getTeachingAssistants() {
    return this.getByRole('teaching_assistant');
  },
  
  async getAdministrators() {
    return this.getByRole('administrator');
  },
  
  async getDepartmentHeads() {
    return this.getByRole('department_head');
  },
  
  async getProfessorsByDepartment(departmentId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'professor')
        .eq('department_id', departmentId)
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as ProfileData[];
    } catch (error: any) {
      console.error(`Error fetching professors for department ${departmentId}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch professors: ${error.message}`,
        variant: "destructive",
      });
      return [];
    }
  }
};

export default profileService;
