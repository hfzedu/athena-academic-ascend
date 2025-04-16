
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
  }
};
