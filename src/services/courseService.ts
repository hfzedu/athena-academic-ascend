import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner'; // Assuming Sonner is used for notifications
import type { Database, Json } from '@/integrations/supabase/types';

// --- Type Definitions ---

// Base types (assuming these would be generated or well-defined)
type DbCourse = Database["public"]["Tables"]["courses"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"]; // Assuming you have this
type Profile = Database["public"]["Tables"]["profiles"]["Row"]; // For instructors
// type CourseSection = Database["public"]["Tables"]["course_sections"]["Row"];
// type LearningOutcome = Database["public"]["Tables"]["learning_outcomes"]["Row"];
// type CourseMaterial = Database["public"]["Tables"]["course_materials"]["Row"];


// Enriched Course type for responses
export interface Course extends DbCourse {
  deleted_at?: string | null; // For soft deletes
  department?: Pick<Department, 'id' | 'name' | 'code'> | null;
  // These would be populated via joins or separate fetches in more detailed methods
  // instructors?: Array<Pick<Profile, 'id' | 'first_name' | 'last_name'>>;
  // sections?: CourseSection[];
  // prerequisites?: Array<{ course_id: string; code: string; name: string; type: 'prereq' | 'coreq' }>;
  // learning_outcomes?: LearningOutcome[];
  // materials?: CourseMaterial[];
}

// Type for a course with all its rich details
export interface CourseWithDetails extends Course {
  department: Pick<Department, 'id' | 'name' | 'code'> | null; // Make non-optional if always joined
  instructors: Array<Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>>; // People teaching it overall, not per section
  prerequisites: Array<{
    prerequisite_course_id: string;
    prerequisite_course_code: string;
    prerequisite_course_name: string;
    type: 'prereq' | 'coreq';
  }>;
  learning_outcomes: Array<{ id: string; description: string }>;
  // Syllabus might be a specific material or its own field/table
  // active_sections_count?: number; // Example aggregated data
}

// Input for creating a course
export interface CourseCreateInput {
  name: string;
  code: string; // Should be unique per department or globally
  description?: string | null;
  credits: number;
  department_id: string;
  level?: string | null; // e.g., '100', '200', 'graduate'
  // initial_instructors?: string[]; // Array of instructor profile_ids
  // initial_prerequisites?: Array<{ prerequisite_course_id: string; type: 'prereq' | 'coreq' }>;
}

// Input for updating a course
export type CourseUpdateInput = Partial<CourseCreateInput & {
    is_active?: boolean;
}>;

// Reusable PaginatedResponse
export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  error: Error | null;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
}

// For course_audit_log table
export type CourseAuditLogEntry = { /* ... similar to other audit logs ... */ };

// --- Constants ---
const DEFAULT_PAGE_SIZE = 20;
const DETAILED_COURSE_SELECT = `
  *,
  department:department_id (id, name, code),
  course_instructors!inner(instructor:instructor_profile_id(id, first_name, last_name, email)),
  prerequisites:course_prerequisites!course_id(
    prerequisite_course_id,
    type,
    prerequisite_course:prerequisite_course_id(code, name)
  ),
  learning_outcomes(id, description)
`;
// Note: The 'course_instructors!inner' assumes a join table 'course_instructors' linking 'courses' and 'profiles'.
// If instructors are per-section, this select needs adjustment or move to a section-specific query.


// --- Placeholder for Permissions & Audit Logging ---
// Assume `hasPermission(actingUserId, permission, resourceId)` and `logCourseAudit(...)` exist.
// actingUserId would be passed to each method.

const logCourseAudit = async (
    action: string,
    courseId: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    actingUserId: string | null,
    details?: string
  ) => {
    console.log(`[AUDIT_STUB_COURSE] Action: ${action}, CourseID: ${courseId}, By: ${actingUserId}, Changes: ${changes.length}, Details: ${details}`);
    // Actual implementation would insert into 'course_audit_log'
  };


// --- Enhanced Course Service ---
export const courseService = {
  /**
   * Retrieves a list of courses with pagination and filtering.
   * Returns basic course info, can be expanded with more joins if needed for list views.
   */
  async getCourses(
    actingUserId: string | null, // For permissions
    options: {
      departmentId?: string;
      level?: string;
      creditsMin?: number;
      creditsMax?: number;
      searchTerm?: string; // Search in name, code, description
      page?: number;
      pageSize?: number;
      includeInactive?: boolean;
      includeSoftDeleted?: boolean;
    } = {}
  ): Promise<PaginatedResponse<Course>> { // Returns basic Course for list performance
    // TODO: Permission check for listing courses
    const {
      departmentId, level, creditsMin, creditsMax, searchTerm,
      page = 1, pageSize = DEFAULT_PAGE_SIZE,
      includeInactive = false, includeSoftDeleted = false
    } = options;

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from('courses')
      .select('*, department:department_id(id, name, code)', { count: 'exact' }); // Basic join for department

    if (departmentId) query = query.eq('department_id', departmentId);
    if (level) query = query.eq('level', level);
    if (creditsMin !== undefined) query = query.gte('credits', creditsMin);
    if (creditsMax !== undefined) query = query.lte('credits', creditsMax);
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }
    if (!includeInactive) query = query.eq('is_active', true);
    if (!includeSoftDeleted) query = query.is('deleted_at', null);

    query = query.order('code').order('name').range(rangeFrom, rangeTo);

    try {
      const { data, error, count } = await query;
      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      if (error) throw error;
      return { data: (data as Course[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error(`Failed to fetch courses: ${error.message}`); // Keep toast for direct UI feedback
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
  },

  /**
   * Retrieves a single course by its ID with all rich details.
   */
  async getCourseWithDetails(id: string, actingUserId: string | null): Promise<CourseWithDetails | null> {
    // TODO: Permission check
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(DETAILED_COURSE_SELECT)
        .eq('id', id)
        .is('deleted_at', null) // Typically don't show soft-deleted by default
        .single();

      if (error) {
        // Handle 'PGRST116' (row not found) gracefully if needed, or let it throw for caller
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as CourseWithDetails | null;
    } catch (error: any) {
      console.error(`Error fetching course details ${id}:`, error);
      toast.error(`Failed to fetch course details: ${error.message}`);
      return null;
    }
  },

  /**
   * Creates a new course.
   */
  async createCourse(courseInput: CourseCreateInput, actingUserId: string | null): Promise<CourseWithDetails | null> {
    if (!actingUserId) {
        toast.error("Authentication required to create a course.");
        return null;
    }
    // TODO: Permission check for creating courses (e.g., admin, department head)

    // Validate unique course code (perhaps at DB level with unique constraint)
    // const { data: existing } = await supabase.from('courses').select('id').eq('code', courseInput.code).maybeSingle();
    // if (existing) {
    //   toast.error(`Course code ${courseInput.code} already exists.`);
    //   return null;
    // }

    try {
      // Supabase automatically handles created_at, updated_at
      const { data, error } = await supabase
        .from('courses')
        .insert({
            name: courseInput.name,
            code: courseInput.code,
            description: courseInput.description,
            credits: courseInput.credits,
            department_id: courseInput.department_id,
            level: courseInput.level,
            is_active: true, // Default to active
        })
        .select(DETAILED_COURSE_SELECT) // Fetch with details after creation
        .single();

      if (error) throw error;
      toast.success(`Course "${data?.name}" created successfully!`);
      if (data) {
        await logCourseAudit('COURSE_CREATED', data.id, [], actingUserId);
        // Handle initial instructors/prerequisites if part of `courseInput` here (separate inserts)
      }
      return data as CourseWithDetails | null;
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error(`Failed to create course: ${error.message}`);
      return null;
    }
  },

  /**
   * Updates an existing course.
   */
  async updateCourse(id: string, courseUpdates: CourseUpdateInput, actingUserId: string | null): Promise<CourseWithDetails | null> {
     if (!actingUserId) {
        toast.error("Authentication required to update a course.");
        return null;
    }
    // TODO: Permission check

    try {
      const { data: currentCourseData } = await supabase.from('courses').select('*').eq('id', id).single();
      if (!currentCourseData) {
          toast.error("Course not found for update.");
          return null;
      }

      const { data, error } = await supabase
        .from('courses')
        .update(courseUpdates) // Supabase handles updated_at
        .eq('id', id)
        .select(DETAILED_COURSE_SELECT)
        .single();

      if (error) throw error;
      toast.success(`Course "${data?.name}" updated successfully!`);

      if (data) {
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
        (Object.keys(courseUpdates) as Array<keyof CourseUpdateInput>).forEach(key => {
            if (currentCourseData[key as keyof DbCourse] !== courseUpdates[key]) {
                changes.push({ field: key, oldValue: currentCourseData[key as keyof DbCourse], newValue: courseUpdates[key]});
            }
        });
        await logCourseAudit('COURSE_UPDATED', data.id, changes, actingUserId);
      }
      return data as CourseWithDetails | null;
    } catch (error: any) {
      console.error(`Error updating course ${id}:`, error);
      toast.error(`Failed to update course: ${error.message}`);
      return null;
    }
  },

  /**
   * Deletes a course (soft delete recommended).
   */
  async deleteCourse(id: string, actingUserId: string | null, hardDelete: boolean = false): Promise<boolean> {
    if (!actingUserId) {
        toast.error("Authentication required to delete a course.");
        return false;
    }
    // TODO: Permission check (likely admin or dept head)
    // TODO: Check for active enrollments or sections before allowing deletion/archiving.

    try {
      let error;
      const {data: courseToDelete} = await supabase.from('courses').select('name').eq('id', id).single();
      if (!courseToDelete) {
        toast.error("Course not found for deletion.");
        return false;
      }


      if (hardDelete) {
        // Caution: Hard delete might cascade or orphan records if not handled carefully.
        // Check for dependencies (sections, enrollments) before hard delete.
        ({ error } = await supabase.from('courses').delete().eq('id', id));
        if (!error) await logCourseAudit('COURSE_HARD_DELETED', id, [], actingUserId, `Course "${courseToDelete.name}" permanently deleted.`);

      } else {
        // Soft delete
        const updates = { deleted_at: new Date().toISOString(), is_active: false };
        ({ error } = await supabase.from('courses').update(updates).eq('id', id));
         if (!error) await logCourseAudit('COURSE_SOFT_DELETED', id, [{field: 'deleted_at', oldValue: null, newValue: updates.deleted_at}], actingUserId, `Course "${courseToDelete.name}" archived.`);
      }

      if (error) throw error;
      toast.success(`Course "${courseToDelete.name}" ${hardDelete ? 'permanently deleted' : 'archived'} successfully!`);
      return true;
    } catch (error: any) {
      console.error(`Error deleting course ${id}:`, error);
      toast.error(`Failed to ${hardDelete ? 'permanently delete' : 'archive'} course: ${error.message}`);
      return false;
    }
  },

  // --- New "World-Class" Methods ---

  /**
   * Manages prerequisites for a course.
   */
  async setCoursePrerequisites(
    courseId: string,
    prerequisites: Array<{ prerequisite_course_id: string; type: 'prereq' | 'coreq' }>,
    actingUserId: string | null
  ): Promise<{ success: boolean; error?: Error }> {
    if (!actingUserId) return { success: false, error: new Error("Authentication required.") };
    // TODO: Permission check

    try {
      // 1. Delete existing prerequisites for this courseId
      const { error: deleteError } = await supabase
        .from('course_prerequisites')
        .delete()
        .eq('course_id', courseId);
      if (deleteError) throw deleteError;

      // 2. Insert new ones if any
      if (prerequisites.length > 0) {
        const newPrereqs = prerequisites.map(p => ({
          course_id: courseId,
          prerequisite_course_id: p.prerequisite_course_id,
          type: p.type,
        }));
        const { error: insertError } = await supabase.from('course_prerequisites').insert(newPrereqs);
        if (insertError) throw insertError;
      }
      await logCourseAudit('COURSE_PREREQUISITES_UPDATED', courseId, [], actingUserId, `${prerequisites.length} prerequisites set.`);
      toast.success("Course prerequisites updated.");
      return { success: true };
    } catch (error: any) {
      console.error(`Error setting prerequisites for course ${courseId}:`, error);
      toast.error(`Failed to update prerequisites: ${error.message}`);
      return { success: false, error };
    }
  },

  /**
   * Manages learning outcomes for a course.
   */
  async setLearningOutcomes(
    courseId: string,
    outcomes: Array<{ id?: string; description: string }>, // id for updates, none for new
    actingUserId: string | null
  ): Promise<{ success: boolean; error?: Error }> {
    if (!actingUserId) return { success: false, error: new Error("Authentication required.") };
    // TODO: Permission check
    // This is more complex: needs to handle create, update, delete of outcomes.
    // For simplicity, a full replace is shown, but a diff-based approach is better.
    try {
      // Delete existing
      await supabase.from('learning_outcomes').delete().eq('course_id', courseId);
      // Insert new
      if (outcomes.length > 0) {
        const newOutcomes = outcomes.map(o => ({ course_id: courseId, description: o.description }));
        await supabase.from('learning_outcomes').insert(newOutcomes);
      }
      await logCourseAudit('COURSE_LEARNING_OUTCOMES_UPDATED', courseId, [], actingUserId, `${outcomes.length} outcomes set.`);
      toast.success("Learning outcomes updated.");
      return { success: true };
    } catch (error: any) {
        console.error(`Error setting learning outcomes for course ${courseId}:`, error);
        toast.error(`Failed to update learning outcomes: ${error.message}`);
        return { success: false, error };
    }
  },

  /**
   * Retrieves course materials (e.g., syllabus, links, files).
   */
  async getCourseMaterials(
    courseId: string,
    actingUserId: string | null,
    materialType?: 'syllabus' | 'link' | 'file'
  ): Promise<Array<any /* CourseMaterial */> | null> {
    // TODO: Permission check
    try {
        let query = supabase.from('course_materials').select('*').eq('course_id', courseId);
        if (materialType) query = query.eq('type', materialType);
        const {data, error} = await query;
        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error(`Error fetching materials for course ${courseId}:`, error);
        toast.error(`Failed to fetch course materials: ${error.message}`);
        return null;
    }
  },
  
  /**
   *  Add a course material (e.g. syllabus link or upload file)
   *  File uploads would typically involve a separate storage service call first.
   */
  async addCourseMaterial(
    courseId: string,
    material: { title: string; type: 'syllabus' | 'link' | 'file'; url?: string; file_path?: string /* from storage */ },
    actingUserId: string | null
  ): Promise<any /* CourseMaterial */ | null> {
     if (!actingUserId) { /* ... auth error ... */ return null; }
     // TODO: Permission check
     try {
        const { data, error } = await supabase.from('course_materials').insert({
            course_id: courseId,
            ...material
        }).select().single();
        if (error) throw error;
        await logCourseAudit('COURSE_MATERIAL_ADDED', courseId, [], actingUserId, `Material: ${material.title}`);
        toast.success("Course material added.");
        return data;
     } catch (error: any) { /* ... error handling ... */ return null; }
  },

  /**
   * Get course catalog statistics (e.g., number of courses per department).
   * Requires more complex SQL queries or database functions.
   */
  async getCourseCatalogStats(actingUserId: string | null): Promise<any | null> {
    // TODO: Permission check (likely admin)
    // Example: Counts courses per department
    // const { data, error } = await supabase.rpc('get_courses_per_department_stats');
    // if (error) throw error;
    // return data;
    const mockStats = {
        totalCourses: 150, // STUB
        coursesByDepartment: [ { departmentName: 'Computer Science', count: 30}, { departmentName: 'Mathematics', count: 20 } ],
        averageCredits: 3.5
    };
    await logCourseAudit('COURSE_CATALOG_STATS_VIEWED', 'all_courses', [], actingUserId);
    return mockStats; // STUB
  }

};

export default courseService;
