
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];

// Get a single profile by ID
export const getById = async (id: string): Promise<DbProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Get a single profile by email
export const getByEmail = async (email: string): Promise<DbProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
};

// Get all profiles
export const getAll = async (): Promise<DbProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) throw error;
  return data || [];
};

// Create a new profile
export const create = async (profile: Omit<DbProfile, 'created_at' | 'updated_at'>): Promise<DbProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a profile
export const update = async (id: string, profile: Partial<Omit<DbProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<DbProfile> => {
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
export const getByRole = async (role: string): Promise<DbProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`*`)
    .eq('role', role);

  if (error) throw error;
  return (data as unknown as DbProfile[]) || [];
};

// Get profiles by department
// Optionally filter by department if your schema supports it. Kept for API compatibility.
export const getByDepartment = async (_departmentId: string): Promise<DbProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) throw error;
  return data || [];
};

// Convenience alias to align with consumer expectations
const getProfileByUserId = async (userId: string): Promise<DbProfile | null> => {
  return getById(userId);
};

// Accepts camelCase updates and maps to DB snake_case
const updateProfile = async (
  userId: string,
  updates: Partial<{
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: Database["public"]["Enums"]["user_role"] | string;
  }>
): Promise<DbProfile> => {
  const dbUpdates: Partial<DbProfile> = {};
  if (typeof updates.firstName !== 'undefined') dbUpdates.first_name = updates.firstName as any;
  if (typeof updates.lastName !== 'undefined') dbUpdates.last_name = updates.lastName as any;
  if (typeof updates.avatarUrl !== 'undefined') dbUpdates.avatar_url = updates.avatarUrl as any;
  if (typeof updates.role !== 'undefined') dbUpdates.role = updates.role as any;
  return update(userId, dbUpdates);
};

export const profileService = {
  getById,
  getByEmail,
  getAll,
  create,
  update,
  getByRole,
  getByDepartment,
  getProfileByUserId,
  updateProfile,
};

export default profileService;
