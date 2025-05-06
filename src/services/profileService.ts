import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types'; // Assuming Json is part of your types

// --- Enhanced Type Definitions ---

// Core Profile type from Supabase generated types
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

// Payload for updating a profile - expanded
export type ProfileUpdatePayload = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & {
  // Include any fields that can be updated.
  // Example: 'email' if mutable on profiles, 'department_id', 'bio', etc.
};

export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  error: Error | null;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
}

// For profile_audit_log table
// Assumed DB Table: profile_audit_log
// - id: uuid (pk)
// - profile_id: uuid (fk to profiles.id)
// - changed_by_user_id: uuid (fk to auth.users.id, nullable for system changes)
// - changed_at: timestamptz (default now())
// - action: text (e.g., 'PROFILE_UPDATE', 'ROLE_ASSIGNMENT')
// - field_changed: text (nullable, e.g., 'last_name', 'role')
// - old_value: jsonb (nullable)
// - new_value: jsonb (nullable)
// - details: text (nullable, e.g., "Updated via admin panel")
export type AuditLogEntry = {
  id: string;
  profile_id: string;
  changed_by_user_id: string | null;
  changed_at: string;
  action: string;
  field_changed?: string | null;
  old_value?: Json | null;
  new_value?: Json | null;
  details?: string | null;
};

// For getProfileWithDetails
// This structure depends heavily on your related tables and how you join them.
// Assumed DB Tables for relationships:
// - departments (id, name)
// - courses (id, name, code)
// - enrollments (id, student_id (fk to profiles.id), course_id (fk to courses.id), grade, status)
// - course_instructors (id, instructor_id (fk to profiles.id), course_id (fk to courses.id))
// - profiles table has department_id (fk to departments.id)
export type ProfileWithDetails = Profile & {
  department?: { id: string; name: string } | null;
  student_enrollments?: Array<{
    id: string;
    grade: string | null;
    status: string | null; // e.g., 'enrolled', 'completed', 'dropped'
    course: { id: string; name: string; code: string };
  }>;
  instructor_assignments?: Array<{
    id: string;
    course: { id: string; name: string; code: string };
  }>;
  // Add other related data as needed, e.g., publications, research_groups
};

// Placeholder for permission strings. In a real system, these would be more structured.
export type Permission =
  | 'profile:read:any'
  | 'profile:read:own'
  | 'profile:update:any'
  | 'profile:update:own'
  | 'profile:update:role' // Specific permission to change roles
  | 'profile:delete:any'
  | 'profile:view:auditlog';


// --- Constants ---
const DEFAULT_PAGE_SIZE = 20;
const SYSTEM_USER_ID = 'system'; // For system-initiated changes in audit logs

// --- Conceptual Helper Functions (would be part of an AuthService/PermissionService) ---
/**
 * Conceptual function to check if the acting user has a specific permission.
 * In a real app, this would involve looking up user roles and their associated permissions.
 * @param actingUserId The ID of the user performing the action.
 * @param permission The permission string to check.
 * @param resourceId Optional resource ID for object-level permissions (e.g., profileId for 'profile:update:own').
 * @returns Promise<boolean>
 */
async function hasPermission(
  actingUserId: string | null,
  permission: Permission,
  _resourceId?: string
): Promise<boolean> {
  if (!actingUserId) return false; // Anonymous users usually have no permissions
  // This is a stub. A real implementation would query permission tables or use a RBAC library.
  console.warn(`[AUTH_STUB] Checking permission '${permission}' for user '${actingUserId}'. Assuming true for demo.`);
  // Example: Admins might have all permissions
  // const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', actingUserId).single();
  // if (userProfile?.role === 'admin') return true;
  // if (permission === 'profile:update:own' && actingUserId === resourceId) return true;
  return true; // STUB: Assume permission for now
}

/**
 * Logs an action to the audit table.
 */
async function logAudit(
  profileId: string,
  action: string,
  changes: Array<{ field: string; oldValue: any; newValue: any }>,
  actingUserId: string | null,
  details?: string
) {
  if (changes.length === 0 && action === 'PROFILE_UPDATE') return; // No actual change to log for update

  const auditEntries = changes.length > 0 ? changes.map(change => ({
    profile_id: profileId,
    changed_by_user_id: actingUserId,
    action,
    field_changed: change.field,
    old_value: change.oldValue,
    new_value: change.newValue,
    details,
  })) : [{ // For actions without specific field changes (e.g. PROFILE_CREATE)
    profile_id: profileId,
    changed_by_user_id: actingUserId,
    action,
    details,
  }];


  const { error: auditError } = await supabase.from('profile_audit_log').insert(auditEntries as any); // Cast if types don't align perfectly
  if (auditError) {
    console.error('Failed to write to audit log:', auditError);
    // Non-critical error, usually don't fail the main operation
  }
}


// --- Enhanced Profile Service ---
export const profileService = {
  /**
   * Retrieves a single user profile by ID.
   */
  async getProfile(userId: string, actingUserId?: string | null): Promise<Profile | null> {
    if (actingUserId && !(await hasPermission(actingUserId, userId === actingUserId ? 'profile:read:own' : 'profile:read:any', userId))) {
        throw new Error('Permission denied: Cannot read profile.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "Standard error: Row not found"
      console.error(`Error fetching profile ${userId}:`, error);
      throw error;
    }
    return data;
  },

  /**
   * Updates a user's profile, with audit logging and permission checks.
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdatePayload,
    actingUserId: string | null // ID of the user performing the update
  ): Promise<Profile | null> {
    if (!actingUserId) throw new Error('Authentication required to update profile.');

    // Permission Check
    const canUpdateAny = await hasPermission(actingUserId, 'profile:update:any', userId);
    const canUpdateOwn = await hasPermission(actingUserId, 'profile:update:own', userId);

    if (!(userId === actingUserId && canUpdateOwn) && !canUpdateAny) {
      throw new Error('Permission denied: Cannot update this profile.');
    }

    // Specific permission for role changes
    if (updates.role && !(await hasPermission(actingUserId, 'profile:update:role', userId))) {
        throw new Error('Permission denied: Cannot change profile role.');
    }

    // Fetch current profile for audit logging
    const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    if (!currentProfile && fetchError?.code === 'PGRST116') throw new Error('Profile not found to update.');


    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error(`Error updating profile ${userId}:`, updateError);
      throw updateError;
    }

    // Audit Logging
    if (updatedProfile && currentProfile) {
      const changesTracked: Array<{ field: string; oldValue: any; newValue: any }> = [];
      for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          const typedKey = key as keyof ProfileUpdatePayload;
          if (currentProfile[typedKey as keyof Profile] !== updates[typedKey]) {
            changesTracked.push({
              field: typedKey,
              oldValue: currentProfile[typedKey as keyof Profile],
              newValue: updates[typedKey],
            });
          }
        }
      }
      if (changesTracked.length > 0) {
        await logAudit(userId, 'PROFILE_UPDATE', changesTracked, actingUserId, 'Profile fields updated.');
      }
    }
    return updatedProfile;
  },

  /**
   * Searches profiles. Can use Full-Text Search (FTS) if ftsColumnName is provided and configured.
   * Otherwise, falls back to ILIKE on specified fields.
   */
  async searchProfiles(
    query: string,
    options?: {
      role?: UserRole;
      page?: number;
      pageSize?: number;
      searchFields?: Array<keyof Pick<Profile, 'first_name' | 'last_name' | 'email'>>; // Fields for ILIKE
      ftsColumnName?: string; // Name of your ts_vector column e.g. 'fts_document'
    }
  ): Promise<PaginatedResponse<Profile>> {
    const {
        role,
        page = 1,
        pageSize = DEFAULT_PAGE_SIZE,
        searchFields = ['first_name', 'last_name', 'email'],
        ftsColumnName
    } = options || {};

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let profileQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (query) {
      if (ftsColumnName) {
        // Requires ftsColumnName to be a tsvector column in your 'profiles' table
        // Example: ALTER TABLE profiles ADD COLUMN fts_document tsvector;
        // CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON profiles
        // FOR EACH ROW EXECUTE PROCEDURE tsvector_update_trigger(fts_document, 'pg_catalog.english', first_name, last_name, email);
        profileQuery = profileQuery.textSearch(ftsColumnName, query, {
          type: 'websearch', // or 'plain' or 'phrase'
          config: 'english', // or your language
        });
      } else {
        const ilikeQuery = searchFields.map(field => `${field}.ilike.%${query}%`).join(',');
        profileQuery = profileQuery.or(ilikeQuery);
      }
    }

    if (role) {
      profileQuery = profileQuery.eq('role', role);
    }

    profileQuery = profileQuery
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range(rangeFrom, rangeTo);

    const { data, error, count } = await profileQuery;
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    if (error) {
      console.error('Error searching profiles:', error);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
    return { data: data || [], count, error: null, currentPage: page, pageSize, totalPages };
  },

  /**
   * Generic helper to retrieve profiles by role with pagination.
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

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    if (error) {
      console.error(`Error fetching profiles for role ${role}:`, error);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
    return { data: data || [], count, error: null, currentPage: page, pageSize, totalPages };
  },

  // --- Convenience methods using getProfilesByRole ---
  getStudents: (page = 1, pageSize = DEFAULT_PAGE_SIZE) => profileService.getProfilesByRole('student', page, pageSize),
  getProfessors: (page = 1, pageSize = DEFAULT_PAGE_SIZE) => profileService.getProfilesByRole('professor', page, pageSize),
  getTeachingAssistants: (page = 1, pageSize = DEFAULT_PAGE_SIZE) => profileService.getProfilesByRole('teaching_assistant', page, pageSize),
  getAdmins: (page = 1, pageSize = DEFAULT_PAGE_SIZE) => profileService.getProfilesByRole('admin' as UserRole, page, pageSize),


  /**
   * Updates the role for multiple users with audit logging.
   */
  async updateUserRoles(
    userIds: string[],
    newRole: UserRole,
    actingUserId: string | null
  ): Promise<{ successCount: number; failedUserIds: string[]; errors: string[] }> {
    if (!actingUserId) throw new Error('Authentication required to update roles.');
    if (!(await hasPermission(actingUserId, 'profile:update:role'))) {
        throw new Error('Permission denied: Cannot update user roles.');
    }
    if (!userIds || userIds.length === 0) {
      return { successCount: 0, failedUserIds: [], errors: ["No user IDs provided."] };
    }

    const { data: updatedData, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .in('id', userIds)
        .select('id, role'); // Select to confirm which rows were updated

    if (error) {
        console.error('Error batch updating user roles:', error);
        // Log a generic audit failure if the whole batch fails
        await logAudit('batch_update', 'ROLE_ASSIGNMENT_FAILURE', [{field: 'role', oldValue: 'multiple', newValue: newRole}], actingUserId, `Batch role update failed for ${userIds.length} users: ${error.message}`);
        return { successCount: 0, failedUserIds: userIds, errors: [`Batch update failed: ${error.message}`] };
    }

    const successfulIds = updatedData?.map(u => u.id) || [];
    const successCount = successfulIds.length;
    const failedUserIds = userIds.filter(id => !successfulIds.includes(id));

    // Log audit for successful updates
    for (const id of successfulIds) {
        // To get old_value, you'd ideally fetch before update or handle it in a trigger
        await logAudit(id, 'ROLE_ASSIGNMENT', [{field: 'role', oldValue: 'unknown_pre_batch', newValue: newRole}], actingUserId, `Role updated to ${newRole} via batch.`);
    }
     if (failedUserIds.length > 0) {
        console.warn(`Failed to update roles for users: ${failedUserIds.join(', ')}`);
    }

    return { successCount, failedUserIds, errors: failedUserIds.length > 0 ? [`Some users not updated (possibly not found or RLS restricted).`] : [] };
  },

  /**
   * Retrieves a user profile along with related academic details.
   * NOTE: This requires your Supabase schema to have these relationships defined.
   */
  async getProfileWithDetails(userId: string, actingUserId?: string | null): Promise<ProfileWithDetails | null> {
     if (actingUserId && !(await hasPermission(actingUserId, userId === actingUserId ? 'profile:read:own' : 'profile:read:any', userId))) {
        throw new Error('Permission denied: Cannot read profile details.');
    }
    // Customize this select string based on your actual schema and desired data.
    // Ensure foreign keys are set up for Supabase to perform these joins.
    // - profiles.department_id -> departments.id
    // - enrollments.student_id -> profiles.id; enrollments.course_id -> courses.id
    // - course_instructors.instructor_id -> profiles.id; course_instructors.course_id -> courses.id
    const selectString = `
      *,
      department:department_id (id, name),
      student_enrollments:enrollments!student_id (
        id, grade, status,
        course:courses!id (id, name, code)
      ),
      instructor_assignments:course_instructors!instructor_id (
        id,
        course:courses!id (id, name, code)
      )
    `;
    // The `!student_id` and `!instructor_id` are join hints for Supabase if ambiguity exists.
    // Or use `!inner` to make it an inner join if a profile MUST have these relations.

    const { data, error } = await supabase
      .from('profiles')
      .select(selectString)
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching profile ${userId} with details:`, error);
      throw error;
    }
    return data as ProfileWithDetails | null;
  },

  /**
   * Retrieves the audit log for a specific profile with pagination.
   */
  async getProfileAuditLog(
    profileId: string,
    actingUserId: string | null,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    if (!actingUserId || !(await hasPermission(actingUserId, 'profile:view:auditlog', profileId))) {
        throw new Error('Permission denied: Cannot view audit log.');
    }

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const { data, error, count } = await supabase
      .from('profile_audit_log')
      .select('*', { count: 'exact' })
      .eq('profile_id', profileId)
      .order('changed_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    if (error) {
      console.error(`Error fetching audit log for profile ${profileId}:`, error);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
    return { data: (data as AuditLogEntry[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
  },

  /**
   * Deletes a user profile. (Hard delete shown, consider soft delete).
   */
  async deleteProfile(userId: string, actingUserId: string | null): Promise<{ success: boolean; error?: Error }> {
    if (!actingUserId || !(await hasPermission(actingUserId, 'profile:delete:any', userId))) { // Requires 'delete:any'
        throw new Error('Permission denied: Cannot delete profile.');
    }

    // For hard delete:
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    // For soft delete (e.g., set an `is_deleted` or `deleted_at` column):
    // const { error } = await supabase
    //   .from('profiles')
    //   .update({ deleted_at: new Date().toISOString(), is_active: false })
    //   .eq('id', userId);

    if (error) {
      console.error(`Error deleting profile ${userId}:`, error);
      return { success: false, error: new Error(error.message) };
    }

    // Log deletion to audit log
    await logAudit(userId, 'PROFILE_DELETE', [], actingUserId, 'Profile permanently deleted.');
    // For soft delete, action could be 'PROFILE_DEACTIVATE'

    return { success: true };
  }
};
