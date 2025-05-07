
import { supabase } from '@/integrations/supabase/client';
import { Profile, ProfileWithDepartment } from '@/integrations/supabase/types';

// Get a single profile by ID
export const getById = async (id: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Get a single profile by email
export const getByEmail = async (email: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
};

// Get all profiles
export const getAll = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) throw error;
  return data || [];
};

// Create a new profile
export const create = async (profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a profile
export const update = async (id: string, profile: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get profiles by role
export const getByRole = async (role: string): Promise<ProfileWithDepartment[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      departments:departments(*)
    `)
    .eq('role', role);

  if (error) throw error;
  // Use a two-step type assertion to avoid excessive type instantiation
  return (data as unknown as ProfileWithDepartment[]) || [];
};

// Get profiles by department
export const getByDepartment = async (departmentId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('department_id', departmentId);

  if (error) throw error;
  return data || [];
};
