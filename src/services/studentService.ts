
import { supabase } from '@/integrations/supabase/client';

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  section_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export const studentService = {
  async getStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');
    
    if (error) throw error;
    return data;
  },

  async getStudentsByCourse(sectionId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        student:profiles(*)
      `)
      .eq('section_id', sectionId);
    
    if (error) throw error;
    return data;
  },

  async addStudentToSection(studentId: string, sectionId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        section_id: sectionId,
        status: 'enrolled'
      })
      .select();
    
    if (error) throw error;
    return data;
  },

  async removeStudentFromSection(enrollmentId: string) {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);
    
    if (error) throw error;
  }
};

export default studentService;
