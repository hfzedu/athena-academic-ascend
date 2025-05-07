
import { supabase } from '@/integrations/supabase/client';

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number;
  department_id: string;
  created_at: string;
  updated_at: string;
}

export interface CourseInput {
  name: string;
  code: string;
  description?: string;
  credits: number;
  department_id: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const getCourses = async (): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*');

  if (error) {
    throw error;
  }

  return data as Course[];
};

const getCourseById = async (id: string): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data as Course;
};

const createCourse = async (courseInput: CourseInput): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .insert([courseInput])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Course;
};

const updateCourse = async (id: string, courseInput: Partial<CourseInput>): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update(courseInput)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Course;
};

const deleteCourse = async (id: string): Promise<{ success: boolean }> => {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  return { success: true };
};

export default {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
