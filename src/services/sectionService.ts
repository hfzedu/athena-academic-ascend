import { supabase } from '@/integrations/supabase/client';

export const sectionService = {
  async getSections(courseId?: string) {
    let query = supabase
      .from('course_sections')
      .select(`
        *,
        course:courses(id, code, name),
        professor:profiles(id, first_name, last_name),
        enrollments(
          id,
          status,
          student:profiles(id, first_name, last_name)
        )
      `);
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createSection({
    courseId,
    sectionNumber,
    professorId,
    semester,
    year,
    schedule,
    location,
    maxEnrollment
  }: {
    courseId: string;
    sectionNumber: string;
    professorId: string;
    semester: string;
    year: number;
    schedule: string;
    location: string;
    maxEnrollment: number;
  }) {
    const { data, error } = await supabase
      .from('course_sections')
      .insert({
        course_id: courseId,
        section_number: sectionNumber,
        professor_id: professorId,
        semester,
        year,
        schedule,
        location,
        max_enrollment: maxEnrollment
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSection(sectionId: string, updates: {
    section_number?: string;
    professor_id?: string;
    semester?: string;
    year?: number;
    schedule?: string;
    location?: string;
    max_enrollment?: number;
  }) {
    const { data, error } = await supabase
      .from('course_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteSection(sectionId: string) {
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('id', sectionId);
    
    if (error) throw error;
  },

  async addTeachingAssistant(sectionId: string, taId: string) {
    const { data, error } = await supabase
      .from('teaching_assistants')
      .insert({
        section_id: sectionId,
        ta_id: taId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removeTeachingAssistant(sectionId: string, taId: string) {
    const { error } = await supabase
      .from('teaching_assistants')
      .delete()
      .eq('section_id', sectionId)
      .eq('ta_id', taId);
    
    if (error) throw error;
  }
};
