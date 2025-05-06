
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

type UserRole = Database["public"]["Enums"]["user_role"];

// Define clean, focused interfaces for better type safety and readability
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

// Explicitly defined interface with all properties for type safety
export interface ProfileWithDepartment {
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
  departments: DepartmentData | null;
}

// Base error handler to reduce code duplication
const handleServiceError = (operation: string, error: any) => {
  console.error(`Error during ${operation}:`, error);
  toast({
    title: "Error",
    description: `Failed to ${operation}: ${error.message}`,
    variant: "destructive",
  });
};

// Service implementation with optimized and consistent patterns
export const profileService = {
  async getProfile(userId: string): Promise<ProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data as ProfileData;
    } catch (error: any) {
      handleServiceError(`fetch profile ${userId}`, error);
      return null;
    }
  },
  
  async updateProfile(userId: string, updates: Partial<ProfileData>): Promise<ProfileData | null> {
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
      handleServiceError(`update profile ${userId}`, error);
      return null;
    }
  },
  
  async searchProfiles(query: string, role?: UserRole): Promise<ProfileData[]> {
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
      handleServiceError('search profiles', error);
      return [];
    }
  },
  
  // Use a consistent type assertion pattern to avoid TypeScript's deep instantiation issues
  async getByRole(role: UserRole): Promise<ProfileWithDepartment[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments(*)')
        .eq('role', role)
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      
      // Use type assertion in two steps to avoid excessive type instantiation
      return (data as any) as ProfileWithDepartment[];
    } catch (error: any) {
      handleServiceError(`fetch profiles with role ${role}`, error);
      return [];
    }
  },
  
  // Convenience methods with proper typing
  async getStudents(): Promise<ProfileWithDepartment[]> {
    return this.getByRole('student');
  },
  
  async getProfessors(): Promise<ProfileWithDepartment[]> {
    return this.getByRole('professor');
  },
  
  async getTeachingAssistants(): Promise<ProfileWithDepartment[]> {
    return this.getByRole('teaching_assistant');
  },
  
  async getAdministrators(): Promise<ProfileWithDepartment[]> {
    return this.getByRole('administrator');
  },
  
  async getDepartmentHeads(): Promise<ProfileWithDepartment[]> {
    return this.getByRole('department_head');
  },
  
  async getProfessorsByDepartment(departmentId: string): Promise<ProfileData[]> {
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
      handleServiceError(`fetch professors for department ${departmentId}`, error);
      return [];
    }
  }
};

export default profileService;
