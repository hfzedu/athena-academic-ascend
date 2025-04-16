
import { supabase } from '@/integrations/supabase/client';

export const courseService = {
  async getCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        department:departments(name, code)
      `);
    
    if (error) throw error;
    return data;
  },

  async createCourse({ departmentId, code, name, description, credits }: {
    departmentId: string;
    code: string;
    name: string;
    description?: string;
    credits: number;
  }) {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        department_id: departmentId,
        code,
        name,
        description,
        credits
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateCourse(courseId: string, updates: {
    code?: string;
    name?: string;
    description?: string;
    credits?: number;
  }) {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
