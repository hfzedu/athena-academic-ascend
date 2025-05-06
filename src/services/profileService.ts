import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// --- Type Definitions ---
// Profile type directly from Supabase generated types
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

// Payload for updating a profile
export type ProfileUpdatePayload = {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  // Assuming 'email' is on the auth.users table and syncs to profiles,
  // or that 'email' is a mutable field on the profiles table itself.
  // If it's on auth.users, you'd update it via Supabase auth methods.
  email?: string;
  role?: UserRole;
  // Add other updatable fields here, e.g., department_id, bio, etc.
  department_id?: string | null;
  bio?: string | null;
};

// Standardized paginated response
export interface PaginatedResponse<T> {
  data: T[];
  count: number | null; // Total count of items for pagination
  error: Error | null;
}

// For fetching profiles with related data (example)
// You'll need to adjust this based on your actual related tables and columns
export type ProfileWithDetails = Profile & {
  courses_as_student?: { course_id: string; course_name: string }[]; // Example
  courses_as_instructor?: { course_id: string; course_name: string }[]; // Example
  department?: { id: string; name: string } | null; // Example
};

// --- Constants ---
const DEFAULT_PAGE_SIZE = 20;

// --- Service Implementation ---
export const profileService = {
  /**
   * Retrieves a single user profile by ID.
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "Standard error: Row not found"
      console.error('Error fetching profile:', error);
      throw error;
    }
    return data; // data will be null if not found and PGRST116 is caught
  },

  /**
   * Updates a user's profile.
   */
  async updateProfile(userId: string, updates: ProfileUpdatePayload): Promise<Profile | null> {
    // Ensure 'id' or other immutable fields are not in updates
    const { id, ...updatableFields } = updates as any; // Cast to any to remove id if present

    const { data, error } = await supabase
      .from('profiles')
      .update(updatableFields)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    return data;
  },

  /**
   * Searches profiles by first name, last name, or email.
   * Optionally filters by role and supports pagination.
   */
  async searchProfiles(
    query: string,
    role?: UserRole,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<Profile>> {
    const searchTerm = `%${query}%`;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let profileQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' }) // Fetch total count for pagination
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range(rangeFrom, rangeTo);

    if (role) {
      profileQuery = profileQuery.eq('role', role);
    }

    const { data, error, count } = await profileQuery;

    if (error) {
      console.error('Error searching profiles:', error);
      // Instead of throwing, return an error object for better UI handling
      return { data: [], count: 0, error: new Error(error.message) };
    }
    return { data: data || [], count, error: null };
  },

  /**
   * Retrieves profiles by a specific role with pagination.
   * This is a generic helper.
   */
  async getProfilesByRole(
    role: UserRole,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<Profile>> {
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', role)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range(rangeFrom, rangeTo);

    if (error) {
      console.error(`Error fetching profiles for role ${role}:`, error);
      return { data: [], count: 0, error: new Error(error.message) };
    }
    return { data: data || [], count, error: null };
  },

  /**
   * Retrieves all students with pagination.
   */
  async getStudents(page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE): Promise<PaginatedResponse<Profile>> {
    return this.getProfilesByRole('student', page, pageSize);
  },

  /**
   * Retrieves all professors with pagination.
   */
  async getProfessors(page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE): Promise<PaginatedResponse<Profile>> {
    return this.getProfilesByRole('professor', page, pageSize);
  },

  /**
   * Retrieves all teaching assistants with pagination.
   */
  async getTeachingAssistants(page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE): Promise<PaginatedResponse<Profile>> {
    return this.getProfilesByRole('teaching_assistant', page, pageSize);
  },

  /**
   * Retrieves all admins with pagination.
   * (Assuming 'admin' is a valid UserRole enum value)
   */
  async getAdmins(page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE): Promise<PaginatedResponse<Profile>> {
    // Make sure 'admin' is part of your UserRole enum
    // If not, you'll get a type error or runtime error from Supabase
    return this.getProfilesByRole('admin' as UserRole, page, pageSize);
  },

  /**
   * Updates the role for multiple users.
   * Useful for administrative batch operations.
   */
  async updateUserRoles(userIds: string[], newRole: UserRole): Promise<{ updatedCount: number, errors: { userId: string, error: any }[] }> {
    if (!userIds || userIds.length === 0) {
      return { updatedCount: 0, errors: [] };
    }

    // Supabase doesn't directly support batch updates on different rows with a single .update() call
    // if the condition is complex (like `id IN (...)`).
    // However, if updating all to the same role, we can use `in` filter.
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .in('id', userIds)
        .select('id'); // Select 'id' or some minimal field to get a count of affected rows

    if (error) {
        console.error('Error batch updating user roles:', error);
        // Return all as errors if the whole batch failed
        return {
            updatedCount: 0,
            errors: userIds.map(userId => ({ userId, error: `Batch update failed: ${error.message}` }))
        };
    }

    // 'data' will be an array of objects like [{id: '...'}, {id: '...'}] for successfully updated rows.
    const updatedCount = data ? data.length : 0;
    const successfulIds = data ? data.map(d => d.id) : [];
    const errors: { userId: string, error: any }[] = [];

    userIds.forEach(userId => {
        if (!successfulIds.includes(userId)) {
            errors.push({ userId, error: 'User not updated (possibly not found or no change needed).' });
        }
    });

    return { updatedCount, errors };
  },


  /**
   * Retrieves a user profile along with related academic details.
   * Example: courses, department.
   * NOTE: This requires your Supabase schema to have these relationships defined
   * and appropriate foreign keys / join tables.
   */
  async getProfileWithDetails(userId: string): Promise<ProfileWithDetails | null> {
    // This is a conceptual example. The exact select string will depend heavily on your schema.
    // 'student_courses(course_id, courses(name))' assumes a 'student_courses' join table
    // linking 'profiles' to a 'courses' table.
    // 'department:departments(id, name)' assumes a 'department_id' foreign key on 'profiles'
    // referencing an 'id' on a 'departments' table.
    const selectString = `
      *,
      department:department_id (id, name),
      student_enrollments:enrollments!student_id (
        id,
        course:courses (id, name, code)
      ),
      instructor_assignments:course_instructors!instructor_id (
        id,
        course:courses (id, name, code)
      )
    `;
    // For the above to work, your 'profiles' table might have 'department_id'.
    // 'enrollments' table would have 'student_id' (FK to profiles.id) and 'course_id' (FK to courses.id).
    // 'course_instructors' table would have 'instructor_id' (FK to profiles.id) and 'course_id' (FK to courses.id).

    const { data, error } = await supabase
      .from('profiles')
      .select(selectString)
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile with details:', error);
      throw error;
    }
    return data as ProfileWithDetails | null; // Cast as the select string makes it this shape
  },

  /**
   * Deletes a user profile.
   * Consider implementing soft deletes (e.g., setting an `is_deleted` flag or `deleted_at` timestamp)
   * instead of hard deletes for academic records.
   */
  async deleteProfile(userId: string): Promise<{ success: boolean; error?: Error }> {
    // For hard delete:
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    // For soft delete (assuming an `is_active` or `deleted_at` column):
    // const { error } = await supabase
    //   .from('profiles')
    //   .update({ is_active: false, deleted_at: new Date().toISOString() })
    //   .eq('id', userId);

    if (error) {
      console.error('Error deleting profile:', error);
      return { success: false, error: new Error(error.message) };
    }
    return { success: true };
  }
};

// Example Usage (for illustration, not part of the service):
async function example() {
  try {
    // const studentProfile = await profileService.getProfile('some-student-uuid');
    // console.log(studentProfile);

    // const updatedProfile = await profileService.updateProfile('some-user-uuid', {
    //   first_name: 'Jane',
    //   bio: 'Updated bio.',
    // });
    // console.log(updatedProfile);

    const searchResults = await profileService.searchProfiles('john', 'student', 1, 10);
    if (searchResults.error) {
      console.error("Search failed:", searchResults.error);
    } else {
      console.log(`Found ${searchResults.count} students matching "john":`, searchResults.data);
    }

    // const studentsPage1 = await profileService.getStudents(1, 15);
    // console.log('Students (Page 1):', studentsPage1.data, 'Total:', studentsPage1.count);

    // const studentWithDetails = await profileService.getProfileWithDetails('some-student-uuid');
    // if (studentWithDetails) {
    //   console.log('Student:', studentWithDetails.first_name);
    //   console.log('Department:', studentWithDetails.department?.name);
    //   console.log('Enrolled Courses:', studentWithDetails.student_enrollments?.map(e => e.course.name));
    // }

    // const batchRoleResult = await profileService.updateUserRoles(
    //   ['uuid1', 'uuid2', 'non-existent-uuid'],
    //   'teaching_assistant'
    // );
    // console.log(`Batch role update: ${batchRoleResult.updatedCount} updated.`);
    // batchRoleResult.errors.forEach(err => console.warn(`Error for ${err.userId}: ${err.error}`));

  } catch (e) {
    console.error('Service operation failed:', e);
  }
}

// example(); // Uncomment to run example if this file can be executed directly
