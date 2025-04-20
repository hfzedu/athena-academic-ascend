
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  course_section_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentInput {
  title: string;
  description?: string;
  due_date: string;
  course_section_id: string;
}

export const assignmentService = {
  async getAssignments() {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        course_section:course_sections(
          id,
          section_number,
          course:courses(
            id,
            name,
            code
          )
        )
      `)
      .order('due_date');
    
    if (error) throw error;
    return data;
  },

  async createAssignment(assignment: AssignmentInput) {
    // Get the current user ID
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        ...assignment,
        created_by: userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateAssignment(id: string, updates: Partial<AssignmentInput>) {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteAssignment(id: string) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export default assignmentService;
