import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database, Json } from '@/integrations/supabase/types';

// --- Type Definitions ---
type DbCourseSection = Database["public"]["Tables"]["course_sections"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];
type Term = Database["public"]["Tables"]["terms"]["Row"]; // Assuming you have this
type Profile = Database["public"]["Tables"]["profiles"]["Row"]; // For instructors/students

// Enriched Section type for responses
export interface CourseSection extends DbCourseSection {
  deleted_at?: string | null;
  course?: Pick<Course, 'id' | 'name' | 'code' | 'credits'> | null;
  term?: Pick<Term, 'id' | 'name' | 'start_date' | 'end_date'> | null;
  // These would be populated via joins in more detailed methods
  // instructors?: Array<{ profile: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>, role: string }>;
  // current_enrollment_count and current_waitlist_count might be directly on the table or calculated
}

export interface CourseSectionWithDetails extends CourseSection {
  course: Pick<Course, 'id' | 'name' | 'code' | 'credits' | 'description'>; // Make non-optional
  term: Pick<Term, 'id' | 'name' | 'start_date' | 'end_date' | 'enrollment_start_date' | 'enrollment_end_date'>; // Make non-optional
  instructors: Array<{
    profile: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>;
    role: string; // 'primary_instructor', 'teaching_assistant', etc.
  }>;
  // location_details?: any; // If schedule_details.location_id is joined
  // enrollment_summary?: { enrolled: number; waitlisted: number; capacity: number };
}

// Input for creating a course section
export interface SectionCreateInput {
  course_id: string;
  term_id: string;
  section_number: string; // e.g., "001", "A", "LEC01"
  status: 'scheduled' | 'open_for_enrollment' | 'full' | 'closed' | 'cancelled'; // Initial status
  capacity: number;
  waitlist_capacity?: number;
  schedule_details: Json; // e.g., [{ day: "MWF", startTime: "10:00", endTime: "10:50", locationId: "uuid", room: "B101"}]
  instruction_mode: 'in-person' | 'online_sync' | 'online_async' | 'hybrid';
  start_date?: string; // Optional, can inherit from term
  end_date?: string; // Optional, can inherit from term
  notes?: string | null;
  // instructor_assignments?: Array<{ instructor_profile_id: string; role: string }>;
}

// Input for updating a course section
export type SectionUpdateInput = Partial<Omit<SectionCreateInput, 'course_id' | 'term_id' | 'section_number'> & {
    // Fields that are typically updated after creation
    // current_enrollment_count and current_waitlist_count are usually system-managed
}>;


// Reusable PaginatedResponse
export interface PaginatedResponse<T> { /* ... as defined before ... */ }
// AuditLogEntry
export type SectionAuditLogEntry = { /* ... as defined before, specific to sections ... */ };


// --- Constants ---
const DEFAULT_PAGE_SIZE = 20;
const DETAILED_SECTION_SELECT = `
  *,
  course:course_id!inner(id, name, code, credits, description),
  term:term_id!inner(id, name, start_date, end_date, enrollment_start_date, enrollment_end_date),
  section_instructors!inner(role, instructor:instructor_profile_id!inner(id, first_name, last_name, email))
`;
// Note: 'section_instructors!inner(...)' assumes a join table setup.

// --- Placeholder for Permissions & Audit Logging ---
// Assume `hasPermission(actingUserId, permission, resourceContext)` and `logSectionAudit(...)` exist.
const logSectionAudit = async (
    action: string,
    sectionId: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    actingUserId: string | null,
    details?: string
  ) => {
    console.log(`[AUDIT_STUB_SECTION] Action: ${action}, SectionID: ${sectionId}, By: ${actingUserId}, Changes: ${changes.length}, Details: ${details}`);
  };


// --- Enhanced Section Service ---
export const sectionService = {
  /**
   * Retrieves a list of course sections with pagination and filtering.
   */
  async getSections(
    actingUserId: string | null,
    options: {
      courseId?: string;
      termId?: string;
      instructorId?: string; // To find sections taught by a specific instructor
      status?: DbCourseSection['status'];
      instructionMode?: DbCourseSection['instruction_mode'];
      page?: number;
      pageSize?: number;
      includeCancelled?: boolean;
      includeSoftDeleted?: boolean;
    } = {}
  ): Promise<PaginatedResponse<CourseSection>> { // Returns basic CourseSection for list performance
    // TODO: Permission check (e.g., students see open sections, instructors their own, admins all)
    const {
      courseId, termId, instructorId, status, instructionMode,
      page = 1, pageSize = DEFAULT_PAGE_SIZE,
      includeCancelled = false, includeSoftDeleted = false
    } = options;

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from('course_sections')
      .select(
        `*,
         course:course_id(id, name, code),
         term:term_id(id, name)
        `, { count: 'exact' }
      );

    if (courseId) query = query.eq('course_id', courseId);
    if (termId) query = query.eq('term_id', termId);
    if (status) query = query.eq('status', status);
    if (instructionMode) query = query.eq('instruction_mode', instructionMode);
    if (instructorId) {
      // This requires querying through the 'section_instructors' join table
      query = query.select(
        `*,
         course:course_id(id, name, code),
         term:term_id(id, name),
         section_instructors!inner(instructor_profile_id)` // Ensure this join makes sense for the filter
      )
      .eq('section_instructors.instructor_profile_id', instructorId);
    }

    if (!includeCancelled && status !== 'cancelled') query = query.neq('status', 'cancelled');
    if (!includeSoftDeleted) query = query.is('deleted_at', null);

    query = query.order('term_id').order('course_id').order('section_number').range(rangeFrom, rangeTo);

    try {
      const { data, error, count } = await query;
      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      if (error) throw error;
      return { data: (data as CourseSection[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      toast.error(`Failed to fetch sections: ${error.message}`);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
  },

  /**
   * Retrieves a single course section by its ID with all rich details.
   */
  async getSectionWithDetails(id: string, actingUserId: string | null): Promise<CourseSectionWithDetails | null> {
    // TODO: Permission check
    try {
      const { data, error } = await supabase
        .from('course_sections')
        .select(DETAILED_SECTION_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Row not found
        throw error;
      }
      return data as CourseSectionWithDetails | null;
    } catch (error: any) {
      console.error(`Error fetching section details ${id}:`, error);
      toast.error(`Failed to fetch section details: ${error.message}`);
      return null;
    }
  },

  /**
   * Creates a new course section.
   * Handles instructor assignments if provided.
   */
  async createSection(
    sectionInput: SectionCreateInput,
    instructorAssignments: Array<{ instructor_profile_id: string; role: string }> = [],
    actingUserId: string | null
  ): Promise<CourseSectionWithDetails | null> {
    if (!actingUserId) { /* ... auth error ... */ return null; }
    // TODO: Permission check (e.g., admin, department scheduler)

    try {
      const sectionDataToInsert: Omit<DbCourseSection, 'id'|'created_at'|'updated_at'|'deleted_at'|'current_enrollment_count'|'current_waitlist_count'> = {
        course_id: sectionInput.course_id,
        term_id: sectionInput.term_id,
        section_number: sectionInput.section_number,
        status: sectionInput.status,
        capacity: sectionInput.capacity,
        waitlist_capacity: sectionInput.waitlist_capacity || 0,
        schedule_details: sectionInput.schedule_details,
        instruction_mode: sectionInput.instruction_mode,
        start_date: sectionInput.start_date, // Can be null
        end_date: sectionInput.end_date,     // Can be null
        notes: sectionInput.notes,
        created_by: actingUserId,
        updated_by: actingUserId, // Also set on create
      };

      const { data: newSection, error } = await supabase
        .from('course_sections')
        .insert(sectionDataToInsert)
        .select(DETAILED_SECTION_SELECT) // Fetch with details
        .single();

      if (error) throw error;
      if (!newSection) throw new Error("Section creation failed to return data.");

      toast.success(`Section ${newSection.section_number} for course ${newSection.course?.code} created!`);
      await logSectionAudit('SECTION_CREATED', newSection.id, [], actingUserId);

      // Assign instructors if provided
      if (instructorAssignments.length > 0) {
        await this.assignInstructorsToSection(newSection.id, instructorAssignments, actingUserId);
        // Re-fetch to include instructors if not already in DETAILED_SECTION_SELECT or if that select is simplified
        // const finalData = await this.getSectionWithDetails(newSection.id, actingUserId);
        // return finalData; // This might be overkill if DETAILED_SECTION_SELECT is comprehensive
      }

      return newSection as CourseSectionWithDetails;
    } catch (error: any) {
      console.error('Error creating section:', error);
      toast.error(`Failed to create section: ${error.message}`);
      return null;
    }
  },

  /**
   * Updates an existing course section.
   */
  async updateSection(id: string, updates: SectionUpdateInput, actingUserId: string | null): Promise<CourseSectionWithDetails | null> {
    if (!actingUserId) { /* ... auth error ... */ return null; }
    // TODO: Permission check

    try {
      const {data: currentSection } = await supabase.from('course_sections').select('*').eq('id', id).single();
      if (!currentSection) {
          toast.error("Section not found for update.");
          return null;
      }

      const updatePayload = { ...updates, updated_by: actingUserId };

      const { data, error } = await supabase
        .from('course_sections')
        .update(updatePayload)
        .eq('id', id)
        .select(DETAILED_SECTION_SELECT)
        .single();

      if (error) throw error;
      toast.success(`Section ${data?.section_number} updated successfully!`);
      if (data) {
         const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
         (Object.keys(updates) as Array<keyof SectionUpdateInput>).forEach(key => {
            if (currentSection[key as keyof DbCourseSection] !== updates[key]) {
                changes.push({ field: key, oldValue: currentSection[key as keyof DbCourseSection], newValue: updates[key]});
            }
        });
        await logSectionAudit('SECTION_UPDATED', data.id, changes, actingUserId);
      }
      return data as CourseSectionWithDetails | null;
    } catch (error: any) {
      console.error(`Error updating section ${id}:`, error);
      toast.error(`Failed to update section: ${error.message}`);
      return null;
    }
  },

  /**
   * Deletes a course section (soft delete recommended).
   */
  async deleteSection(id: string, actingUserId: string | null, hardDelete: boolean = false): Promise<boolean> {
    if (!actingUserId) { /* ... auth error ... */ return false; }
    // TODO: Permission check
    // TODO: Check for active enrollments before deletion. If enrollments exist, might only allow 'cancel' status.

    try {
      const {data: sectionToDelete} = await supabase.from('course_sections').select('section_number, course_id').eq('id', id).single();
       if (!sectionToDelete) {
        toast.error("Section not found for deletion.");
        return false;
      }

      let error;
      if (hardDelete) {
        // Ensure related data (enrollments, instructor assignments) is handled (e.g., cascade delete or prevent if exists)
        ({ error } = await supabase.from('course_sections').delete().eq('id', id));
        if (!error) await logSectionAudit('SECTION_HARD_DELETED', id, [], actingUserId, `Section ${sectionToDelete.section_number} hard deleted.`);
      } else {
        const updates = { deleted_at: new Date().toISOString(), status: 'cancelled' as const }; // Also mark as cancelled
        ({ error } = await supabase.from('course_sections').update(updates).eq('id', id));
         if (!error) await logSectionAudit('SECTION_SOFT_DELETED', id, [{field: 'status', oldValue: 'unknown', newValue: 'cancelled'}], actingUserId, `Section ${sectionToDelete.section_number} archived.`);
      }

      if (error) throw error;
      toast.success(`Section ${sectionToDelete.section_number} ${hardDelete ? 'permanently deleted' : 'archived'} successfully!`);
      return true;
    } catch (error: any) {
      console.error(`Error deleting section ${id}:`, error);
      toast.error(`Failed to delete section: ${error.message}`);
      return false;
    }
  },

  // --- New "World-Class" Methods ---

  /**
   * Assigns or updates instructor roles for a section.
   */
  async assignInstructorsToSection(
    sectionId: string,
    assignments: Array<{ instructor_profile_id: string; role: string }>, // e.g., 'primary_instructor', 'TA'
    actingUserId: string | null
  ): Promise<{ success: boolean; error?: Error }> {
    if (!actingUserId) { /* ... auth error ... */ return { success: false, error: new Error("Auth required")}; }
    // TODO: Permission check

    try {
      // 1. Remove existing assignments for this section
      const { error: deleteError } = await supabase.from('section_instructors').delete().eq('section_id', sectionId);
      if (deleteError) throw deleteError;

      // 2. Insert new assignments
      if (assignments.length > 0) {
        const newAssignments = assignments.map(a => ({
          section_id: sectionId,
          instructor_profile_id: a.instructor_profile_id,
          role: a.role,
        }));
        const { error: insertError } = await supabase.from('section_instructors').insert(newAssignments);
        if (insertError) throw insertError;
      }
      await logSectionAudit('SECTION_INSTRUCTORS_ASSIGNED', sectionId, [], actingUserId, `${assignments.length} instructors assigned.`);
      toast.success("Instructors assigned to section successfully.");
      return { success: true };
    } catch (error: any) {
      console.error(`Error assigning instructors to section ${sectionId}:`, error);
      toast.error(`Failed to assign instructors: ${error.message}`);
      return { success: false, error };
    }
  },

  /**
   * Gets student enrollment status for a section (enrolled, waitlisted).
   * Could also be part of a separate EnrollmentService.
   */
  async getSectionEnrollmentRoster(
    sectionId: string,
    actingUserId: string | null,
    status?: 'enrolled' | 'waitlisted'
  ): Promise<Array<{ student: Profile; status: string; enrolled_at: string }> | null> {
    // TODO: Permission check (instructor of section, admin)
    try {
        let query = supabase
            .from('enrollments')
            .select(`
                status,
                enrolled_at,
                student:student_profile_id!inner(id, first_name, last_name, email)
            `)
            .eq('section_id', sectionId);

        if (status) query = query.eq('status', status);
        query = query.order('student(last_name)');

        const { data, error } = await query;
        if (error) throw error;
        return data as Array<{ student: Profile; status: string; enrolled_at: string }>;
    } catch (error: any) {
        console.error(`Error fetching roster for section ${sectionId}:`, error);
        toast.error("Failed to fetch section roster.");
        return null;
    }
  },

  /**
   * Clones a section, typically for a new term, copying most details but resetting enrollment.
   */
  async cloneSection(
    sourceSectionId: string,
    newTermId: string,
    newSectionNumber: string,
    actingUserId: string | null
  ): Promise<CourseSectionWithDetails | null> {
    if (!actingUserId) { /* ... auth error ... */ return null; }
    // TODO: Permission check

    try {
        const sourceSection = await this.getSectionWithDetails(sourceSectionId, actingUserId);
        if (!sourceSection) {
            toast.error("Source section not found for cloning.");
            return null;
        }

        const newSectionInput: SectionCreateInput = {
            course_id: sourceSection.course_id,
            term_id: newTermId,
            section_number: newSectionNumber,
            status: 'scheduled', // Reset status
            capacity: sourceSection.capacity,
            waitlist_capacity: sourceSection.waitlist_capacity,
            schedule_details: sourceSection.schedule_details,
            instruction_mode: sourceSection.instruction_mode,
            notes: sourceSection.notes ? `Cloned from section ${sourceSection.section_number} (Term: ${sourceSection.term?.name}) - ${sourceSection.notes}` : `Cloned from section ${sourceSection.section_number} (Term: ${sourceSection.term?.name})`,
            // start_date and end_date would typically be derived from the newTermId or explicitly set
        };
        
        const instructorAssignments = sourceSection.instructors.map(instr => ({
            instructor_profile_id: instr.profile.id,
            role: instr.role
        }));

        const clonedSection = await this.createSection(newSectionInput, instructorAssignments, actingUserId);
        if (clonedSection) {
            await logSectionAudit('SECTION_CLONED', clonedSection.id, [], actingUserId, `Cloned from ${sourceSectionId} to term ${newTermId}.`);
            toast.success(`Section cloned successfully to term ${clonedSection.term?.name}.`);
        }
        return clonedSection;

    } catch (error: any) {
        console.error(`Error cloning section ${sourceSectionId}:`, error);
        toast.error("Failed to clone section.");
        return null;
    }
  },

  /**
   * Updates enrollment counts for a section.
   * This might be called by triggers on the 'enrollments' table or a batch job.
   */
  async updateSectionEnrollmentCounts(sectionId: string): Promise<{ success: boolean; error?: Error }> {
    // This method is typically a backend utility, not directly called by frontend UI for general use.
    // It recalculates counts from the enrollments table.
    try {
        const { count: enrolledCount, error: enrolledError } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('section_id', sectionId)
            .eq('status', 'enrolled');

        const { count: waitlistedCount, error: waitlistError } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('section_id', sectionId)
            .eq('status', 'waitlisted');
        
        if (enrolledError || waitlistError) throw enrolledError || waitlistError;

        const { error: updateError } = await supabase
            .from('course_sections')
            .update({
                current_enrollment_count: enrolledCount ?? 0,
                current_waitlist_count: waitlistedCount ?? 0
            })
            .eq('id', sectionId);
        
        if (updateError) throw updateError;
        // No user-facing toast for this typically, it's a system operation.
        console.log(`Enrollment counts updated for section ${sectionId}.`);
        // No audit log usually for automated count updates unless it's a manual trigger of this.
        return { success: true };
    } catch (error: any) {
        console.error(`Error updating enrollment counts for section ${sectionId}:`, error);
        return { success: false, error };
    }
  }
};

export default sectionService;
