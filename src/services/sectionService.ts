
import { supabase } from '@/integrations/supabase/client';

export const sectionService = {
  async getSections() {
    const { data, error } = await supabase
      .from('course_sections')
      .select(`
        *,
        course:courses(*)
      `)
      .order('course_id');
    
    if (error) throw error;
    return data;
  },

  async getSectionsByProfessor(professorId: string) {
    const { data, error } = await supabase
      .from('course_sections')
      .select(`
        id,
        section_number,
        course:courses(
          id,
          name,
          code
        )
      `)
      .eq('professor_id', professorId);
    
    if (error) throw error;
    return data;
  },

  async createSection(sectionData: any) {
    const { data, error } = await supabase
      .from('course_sections')
      .insert(sectionData)
      .select();
    
    if (error) throw error;
    return data;
  },

  async updateSection(id: string, updates: any) {
    const { data, error } = await supabase
      .from('course_sections')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data;
  },

  async deleteSection(id: string) {
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export default sectionService;
