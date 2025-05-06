import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types'; // Assuming Json is part of your types

// --- Type Definitions ---

// Base Assignment type from DB (if you generate types from schema)
// For now, we'll use the provided interface and augment it.
// type DbAssignment = Database["public"]["Tables"]["assignments"]["Row"];

// Interface for an assignment as it comes from the DB (raw)
export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string; // ISO string
  course_section_id: string;
  created_by: string; // User ID
  created_at: string; // ISO string
  updated_at: string; // ISO string
  status?: 'draft' | 'published' | 'archived' | 'graded'; // Optional status field
  deleted_at?: string | null; // For soft deletes
  // Potentially other fields like 'max_points', 'submission_type'
}

// Type for an assignment with its related course and section details
export interface AssignmentWithDetails extends Assignment {
  course_section: {
    id: string;
    section_number: string | null; // Assuming section_number can be null
    course: {
      id: string;
      name: string;
      code: string;
    };
  };
  creator?: { // Optional: fetch creator's basic info
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Input for creating an assignment
export interface AssignmentCreateInput {
  title: string;
  description?: string | null;
  due_date: string; // ISO string
  course_section_id: string;
  status?: Assignment['status']; // e.g., 'draft' or 'published'
  // Add other fields like max_points
}

// Input for updating an assignment
export type AssignmentUpdateInput = Partial<AssignmentCreateInput & {
    // Fields that can be updated but not necessarily on create
    // e.g. if status can only be changed after creation
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

// For assignment_audit_log table
export type AssignmentAuditLogEntry = {
  id: string;
  assignment_id: string;
  changed_by_user_id: string | null;
  changed_at: string;
  action: string;
  field_changed?: string | null;
  old_value?: Json | null;
  new_value?: Json | null;
  details?: string | null;
};

// Placeholder for assignment-specific permissions
export type AssignmentPermission =
  | 'assignment:create' // In a specific course/section
  | 'assignment:read:any' // Read any assignment (admin)
  | 'assignment:read:enrolled' // Read assignments for enrolled courses/sections
  | 'assignment:read:instructing' // Read assignments for instructed courses/sections
  | 'assignment:update:any'
  | 'assignment:update:own' // Own created or instructing
  | 'assignment:delete:any'
  | 'assignment:delete:own'
  | 'assignment:view:auditlog';


// --- Constants ---
const DEFAULT_PAGE_SIZE = 15;

// --- Conceptual Helper Functions (would be part of an AuthService/PermissionService) ---
/**
 * Conceptual function to check if the acting user has a specific permission for an assignment or context.
 */
async function hasAssignmentPermission(
  actingUserId: string | null,
  permission: AssignmentPermission,
  resourceContext?: { assignmentId?: string; courseSectionId?: string; courseId?: string }
): Promise<boolean> {
  if (!actingUserId) return false;
  // This is a STUB. Real implementation involves checking user's roles (student, instructor, admin)
  // against the course, section, or assignment.
  // Example: For 'assignment:create', check if actingUserId is an instructor for resourceContext.courseSectionId.
  console.warn(
    `[AUTH_STUB] Checking assignment permission '${permission}' for user '${actingUserId}' on resource ${JSON.stringify(resourceContext)}. Assuming true for demo.`
  );
  return true; // STUB: Assume permission
}

/**
 * Logs an action to the assignment audit table.
 */
async function logAssignmentAudit(
  assignmentId: string,
  action: string,
  changes: Array<{ field: string; oldValue: any; newValue: any }>,
  actingUserId: string | null,
  details?: string
) {
  if (changes.length === 0 && (action === 'ASSIGNMENT_UPDATE' || action === 'ASSIGNMENT_SOFT_DELETE_UPDATE')) return;

  const auditEntries = changes.length > 0 ? changes.map(change => ({
    assignment_id: assignmentId,
    changed_by_user_id: actingUserId,
    action,
    field_changed: change.field,
    old_value: change.oldValue,
    new_value: change.newValue,
    details,
  })) : [{
    assignment_id: assignmentId,
    changed_by_user_id: actingUserId,
    action,
    details,
  }];

  const { error: auditError } = await supabase.from('assignment_audit_log').insert(auditEntries as any);
  if (auditError) {
    console.error('Failed to write to assignment audit log:', auditError);
  }
}

// Select string for getting detailed assignment info
const DETAILED_ASSIGNMENT_SELECT = `
  *,
  course_section:course_sections(
    id,
    section_number,
    course:courses(
      id,
      name,
      code
    )
  ),
  creator:created_by(id, first_name, last_name)
`;


// --- Enhanced Assignment Service ---
export const assignmentService = {
  /**
   * Retrieves a list of assignments with pagination and filtering.
   */
  async getAssignments(
    actingUserId: string | null,
    options: {
      courseId?: string;
      courseSectionId?: string;
      status?: Assignment['status'];
      dueDateStart?: string; // ISO Date string
      dueDateEnd?: string; // ISO Date string
      page?: number;
      pageSize?: number;
      includeArchived?: boolean; // To explicitly include soft-deleted
    } = {}
  ): Promise<PaginatedResponse<AssignmentWithDetails>> {
    const {
      courseId,
      courseSectionId,
      status,
      dueDateStart,
      dueDateEnd,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      includeArchived = false,
    } = options;

    // Permission check: This is complex. Users should only see assignments they are allowed to.
    // e.g. students see published assignments for their enrolled sections.
    // Instructors see assignments for sections they teach. Admins see more.
    // This stub assumes the RLS policies on Supabase handle coarse-grained access,
    // and this function fine-tunes or acts as a second layer.
    if (!(await hasAssignmentPermission(actingUserId, 'assignment:read:enrolled'))) { // Example permission
       // Or throw new Error('Permission denied to view assignments.');
       // Depending on how strict you want the service layer vs RLS.
       // For now, let RLS handle it, but log a warning.
       console.warn("Permission check stubbed for getAssignments; RLS should primarily enforce this.");
    }

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from('assignments')
      .select(DETAILED_ASSIGNMENT_SELECT, { count: 'exact' });

    if (courseSectionId) {
      query = query.eq('course_section_id', courseSectionId);
    } else if (courseId) {
      // This requires a join or a view if assignments don't directly link to courseId
      // Assuming 'course_sections' table has 'course_id'
      // This might be better handled by fetching sections for a course first, then assignments for those sections,
      // or by creating a DB view/function. For simplicity here, we'll assume RLS or frontend handles this.
      // Or, if you have a 'course_id' denormalized on 'assignments' (not generally recommended):
      // query = query.eq('course_id', courseId);
      console.warn("Filtering by courseId directly on assignments might be inefficient without a direct link or view.");
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (dueDateStart) {
      query = query.gte('due_date', dueDateStart);
    }
    if (dueDateEnd) {
      query = query.lte('due_date', dueDateEnd);
    }

    if (!includeArchived) {
      query = query.is('deleted_at', null); // For soft deletes
    }

    query = query.order('due_date', { ascending: true }).range(rangeFrom, rangeTo);

    const { data, error, count } = await query;
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    if (error) {
      console.error('Error fetching assignments:', error);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
    return { data: (data as AssignmentWithDetails[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
  },

  /**
   * Retrieves a single assignment by its ID with details.
   */
  async getAssignmentById(
    assignmentId: string,
    actingUserId: string | null
  ): Promise<AssignmentWithDetails | null> {
    // Permission check: User must have rights to view this specific assignment
    if (!(await hasAssignmentPermission(actingUserId, 'assignment:read:enrolled', { assignmentId }))) { // Example
        // throw new Error('Permission denied to view this assignment.');
        console.warn("Permission check stubbed for getAssignmentById; RLS should primarily enforce this.");
    }

    const { data, error } = await supabase
      .from('assignments')
      .select(DETAILED_ASSIGNMENT_SELECT)
      .eq('id', assignmentId)
      .is('deleted_at', null) // Exclude soft-deleted unless explicitly requested
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching assignment ${assignmentId}:`, error);
      throw error;
    }
    return data as AssignmentWithDetails | null;
  },

  /**
   * Creates a new assignment.
   */
  async createAssignment(
    assignmentInput: AssignmentCreateInput,
    actingUserId: string | null
  ): Promise<AssignmentWithDetails> {
    if (!actingUserId) throw new Error('User not authenticated to create assignment.');
    if (!(await hasAssignmentPermission(actingUserId, 'assignment:create', { courseSectionId: assignmentInput.course_section_id }))) {
        throw new Error('Permission denied: Cannot create assignment in this section.');
    }

    const assignmentToInsert = {
      ...assignmentInput,
      created_by: actingUserId,
      // updated_at will be set by DB
    };

    const { data, error } = await supabase
      .from('assignments')
      .insert(assignmentToInsert)
      .select(DETAILED_ASSIGNMENT_SELECT) // Fetch the detailed view after insert
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
    if (!data) throw new Error('Assignment creation failed, no data returned.');

    await logAssignmentAudit(data.id, 'ASSIGNMENT_CREATE', [], actingUserId, `Assignment "${data.title}" created.`);
    return data as AssignmentWithDetails;
  },

  /**
   * Updates an existing assignment.
   */
  async updateAssignment(
    assignmentId: string,
    updates: AssignmentUpdateInput,
    actingUserId: string | null
  ): Promise<AssignmentWithDetails> {
    if (!actingUserId) throw new Error('User not authenticated to update assignment.');

    // Fetch current assignment for audit and permission context
    const currentAssignment = await this.getAssignmentById(assignmentId, actingUserId); // Uses its own permission check
    if (!currentAssignment) throw new Error(`Assignment with ID ${assignmentId} not found or not accessible.`);

    // More specific permission check for update
    if (!(await hasAssignmentPermission(actingUserId, 'assignment:update:own', { assignmentId, courseSectionId: currentAssignment.course_section_id }))) {
        throw new Error('Permission denied: Cannot update this assignment.');
    }

    const { data: updatedData, error } = await supabase
      .from('assignments')
      .update(updates) // Supabase handles 'updated_at' automatically
      .eq('id', assignmentId)
      .select(DETAILED_ASSIGNMENT_SELECT)
      .single();

    if (error) {
      console.error(`Error updating assignment ${assignmentId}:`, error);
      throw error;
    }
    if (!updatedData) throw new Error('Assignment update failed, no data returned.');

    // Audit Logging
    const changesTracked: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const typedKey = key as keyof AssignmentUpdateInput;
            if (currentAssignment[typedKey as keyof AssignmentWithDetails] !== updates[typedKey]) {
                changesTracked.push({
                    field: typedKey,
                    oldValue: currentAssignment[typedKey as keyof AssignmentWithDetails],
                    newValue: updates[typedKey],
                });
            }
        }
    }
    if (changesTracked.length > 0) {
        await logAssignmentAudit(assignmentId, 'ASSIGNMENT_UPDATE', changesTracked, actingUserId, `Assignment "${updatedData.title}" updated.`);
    }

    return updatedData as AssignmentWithDetails;
  },

  /**
   * Deletes an assignment (soft delete recommended).
   */
  async deleteAssignment(
    assignmentId: string,
    actingUserId: string | null,
    hardDelete: boolean = false
  ): Promise<{ success: boolean; error?: Error }> {
    if (!actingUserId) throw new Error('User not authenticated to delete assignment.');

    // Fetch current assignment for permission context
    const assignmentToDelete = await this.getAssignmentById(assignmentId, actingUserId);
    if (!assignmentToDelete) throw new Error(`Assignment with ID ${assignmentId} not found or not accessible for deletion.`);


    if (!(await hasAssignmentPermission(actingUserId, 'assignment:delete:own', { assignmentId, courseSectionId: assignmentToDelete.course_section_id }))) {
        throw new Error('Permission denied: Cannot delete this assignment.');
    }

    let error;
    if (hardDelete) {
      ({ error } = await supabase.from('assignments').delete().eq('id', assignmentId));
      if (!error) {
        await logAssignmentAudit(assignmentId, 'ASSIGNMENT_HARD_DELETE', [], actingUserId, `Assignment "${assignmentToDelete.title}" permanently deleted.`);
      }
    } else {
      // Soft delete
      const updates = { deleted_at: new Date().toISOString() };
      ({ error } = await supabase.from('assignments').update(updates).eq('id', assignmentId));
      if (!error) {
         await logAssignmentAudit(assignmentId, 'ASSIGNMENT_SOFT_DELETE', [{field: 'deleted_at', oldValue: null, newValue: updates.deleted_at}], actingUserId, `Assignment "${assignmentToDelete.title}" archived (soft deleted).`);
      }
    }

    if (error) {
      console.error(`Error deleting assignment ${assignmentId}:`, error);
      return { success: false, error: new Error(error.message) };
    }
    return { success: true };
  },

  /**
   * Retrieves the audit log for a specific assignment with pagination.
   */
  async getAssignmentAuditLog(
    assignmentId: string,
    actingUserId: string | null,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<AssignmentAuditLogEntry>> {
    if (!actingUserId || !(await hasAssignmentPermission(actingUserId, 'assignment:view:auditlog', { assignmentId }))) {
        throw new Error('Permission denied: Cannot view assignment audit log.');
    }

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const { data, error, count } = await supabase
      .from('assignment_audit_log')
      .select('*', { count: 'exact' })
      .eq('assignment_id', assignmentId)
      .order('changed_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    if (error) {
      console.error(`Error fetching audit log for assignment ${assignmentId}:`, error);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
    return { data: (data as AssignmentAuditLogEntry[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
  },
};

export default assignmentService;
