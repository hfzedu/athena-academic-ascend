import { supabase } from '@/integrations/supabase/client';

export const enrollmentService = {
  async getEnrollments(sectionId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        student:profiles(id, first_name, last_name)
      `)
      .eq('section_id', sectionId);
    
    if (error) throw error;
    return data;
  },

  async enrollStudent(sectionId: string, studentId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        section_id: sectionId,
        student_id: studentId,
        status: 'enrolled'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateEnrollmentStatus(enrollmentId: string, status: 'enrolled' | 'waitlisted' | 'dropped') {
    const { data, error } = await supabase
      .from('enrollments')
      .update({ status })
      .eq('id', enrollmentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async unenrollStudent(enrollmentId: string) {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);
    
    if (error) throw error;
  },

  async getStudentEnrollments(studentId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        section:course_sections(
          id,
          section_number,
          schedule,
          location,
          course:courses(
            id,
            code,
            name,
            department:departments(
              code,
              name
            )
          )
        )
      `)
      .eq('student_id', studentId);
    
    if (error) throw error;
    return data;
  }
};
