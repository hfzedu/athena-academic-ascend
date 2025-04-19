
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  credits: number;
  department_id: string; // Add this field to match the database schema
  created_at: string;
  updated_at: string;
}

export interface CourseInput {
  name: string;
  code: string;
  description?: string;
  credits: number;
  department_id: string; // Add this required field
}

export const courseService = {
  async getCourses() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as Course[];
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error(`Failed to fetch courses: ${error.message}`);
      return [];
    }
  },

  async getCourse(id: string) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data as Course;
    } catch (error: any) {
      console.error(`Error fetching course ${id}:`, error);
      toast.error(`Failed to fetch course: ${error.message}`);
      return null;
    }
  },

  async createCourse(courseInput: CourseInput) {
    try {
      // Temporary solution: use a default department_id if not provided
      // In a real application, you would get this from user selection
      const courseData = {
        ...courseInput,
        department_id: courseInput.department_id || '00000000-0000-0000-0000-000000000000' // Default UUID for testing
      };

      const { data, error } = await supabase
        .from('courses')
        .insert(courseData)
        .select()
        .single();
        
      if (error) throw error;
      toast.success('Course created successfully!');
      return data as Course;
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error(`Failed to create course: ${error.message}`);
      return null;
    }
  },

  async updateCourse(id: string, courseInput: Partial<CourseInput>) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update(courseInput)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      toast.success('Course updated successfully!');
      return data as Course;
    } catch (error: any) {
      console.error(`Error updating course ${id}:`, error);
      toast.error(`Failed to update course: ${error.message}`);
      return null;
    }
  },

  async deleteCourse(id: string) {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Course deleted successfully!');
      return true;
    } catch (error: any) {
      console.error(`Error deleting course ${id}:`, error);
      toast.error(`Failed to delete course: ${error.message}`);
      return false;
    }
  }
};

export default courseService;
