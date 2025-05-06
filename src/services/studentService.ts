import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database, Json } from '@/integrations/supabase/types';

// --- Type Definitions ---
// Assuming Profile type from a ProfileService or generated types
type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
    // Additional student-specific fields if not on base profile
    program?: { id: string, name: string } | null;
    advisor?: { id: string, first_name: string, last_name: string } | null;
    student_status?: string;
};

type DbEnrollment = Database["public"]["Tables"]["enrollments"]["Row"];
type CourseSectionWithCourse = Database["public"]["Tables"]["course_sections"]["Row"] & {
    course: Database["public"]["Tables"]["courses"]["Row"] | null;
    term: Database["public"]["Tables"]["terms"]["Row"] | null;
};

export interface Enrollment extends DbEnrollment {
  deleted_at?: string | null;
  student?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>; // Basic student info
  section?: CourseSectionWithCourse; // Basic section and course info
}

export interface StudentEnrollmentDetails extends Enrollment {
  student: Profile; // Full student profile
  section: CourseSectionWithCourse & { // Section with more details
    instructors?: Array<{ profile: Pick<Profile, 'id' | 'first_name' | 'last_name'>, role: string }>;
  };
  // Potentially grade_details, prerequisite_status, etc.
}

// Input for enrolling a student
export interface EnrollStudentInput {
  student_profile_id: string;
  section_id: string;
  enrollment_method?: 'self_service' | 'admin_added' | 'waitlist_auto';
  // Status will be determined by capacity/waitlist
}

// Reusable PaginatedResponse
export interface PaginatedResponse<T> { /* ... as defined before ... */ }
// AuditLogEntry
export type EnrollmentAuditLogEntry = { /* ... specific to enrollments ... */ };

// --- Constants ---
const DEFAULT_PAGE_SIZE = 20;
const DETAILED_ENROLLMENT_SELECT = `
  *,
  student:student_profile_id!inner(id, first_name, last_name, email, student_status, program:program_id(id, name)),
  section:section_id!inner(
    *,
    course:course_id!inner(*),
    term:term_id!inner(*),
    section_instructors(role, instructor:instructor_profile_id!inner(id, first_name, last_name))
  )
`;

// --- Placeholder for Permissions & Audit Logging ---
// Assume `hasPermission(actingUserId, permission, resourceContext)` and `logEnrollmentAudit(...)` exist.
const logEnrollmentAudit = async (
    action: string,
    enrollmentId: string | null, // Nullable if action is pre-enrollment check
    { studentId, sectionId }: { studentId?: string, sectionId?: string },
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    actingUserId: string | null,
    details?: string
  ) => {
    console.log(`[AUDIT_STUB_ENROLLMENT] Action: ${action}, EnrollmentID: ${enrollmentId}, Student: ${studentId}, Section: ${sectionId}, By: ${actingUserId}, Changes: ${changes.length}, Details: ${details}`);
  };

// --- Enhanced Student & Enrollment Service ---
export const studentService = {
  /**
   * Retrieves a list of all students with pagination and basic filtering.
   * This should primarily use the ProfileService, but can be here for student-specific context.
   */
  async getStudents(
    actingUserId: string | null,
    options: {
      programId?: string;
      studentStatus?: string;
      searchTerm?: string; // Search name, email
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Profile>> {
    // TODO: Permission check (e.g., admin, registrar)
    const { programId, studentStatus, searchTerm, page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from('profiles')
      .select('*, program:program_id(id, name)', { count: 'exact' }) // Assuming program_id is on profiles
      .eq('role', 'student');

    if (programId) query = query.eq('program_id', programId);
    if (studentStatus) query = query.eq('student_status', studentStatus);
    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    query = query.order('last_name').order('first_name').range(rangeFrom, rangeTo);

    try {
      const { data, error, count } = await query;
      const totalPages = count ? Math.ceil(count / pageSize) : 0;
      if (error) throw error;
      return { data: (data as Profile[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(`Failed to fetch students: ${error.message}`);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
  },

  /**
   * Retrieves a student's profile with more academic details.
   * Should leverage ProfileService.getProfileWithDetails and add student-specific enrichments.
   */
  async getStudentAcademicProfile(studentId: string, actingUserId: string | null): Promise<Profile | null /* More detailed type */> {
    // TODO: Permission check (student themselves, advisor, admin)
    // This would ideally call profileService.getProfileWithDetails(studentId)
    // and then potentially augment with more student-specific academic summary data.
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, program:program_id(id,name), advisor:advisor_id(id, first_name, last_name)')
            .eq('id', studentId)
            .eq('role', 'student')
            .single();
        if (error) throw error;
        return data as Profile | null;
    } catch (error: any) {
        console.error(`Error fetching student profile ${studentId}:`, error);
        toast.error("Failed to fetch student profile.");
        return null;
    }
  },


  // --- Enrollment Focused Methods ---

  /**
   * Enrolls a student in a course section.
   * Handles capacity checks, waitlisting, prerequisite checks (conceptual).
   */
  async enrollStudentInSection(
    input: EnrollStudentInput,
    actingUserId: string | null // Can be student (self-service) or admin
  ): Promise<StudentEnrollmentDetails | null> {
    if (!actingUserId) { /* ... auth error ... */ return null; }
    // TODO: Permission check (student for self, admin for others)

    const { student_profile_id, section_id, enrollment_method = 'self_service' } = input;

    try {
      // 1. Fetch section details (capacity, current enrollment, status, prerequisites from course)
      const { data: section, error: sectionError } = await supabase
        .from('course_sections')
        .select('*, course:course_id!inner(id, name, code, prerequisites:course_prerequisites(prerequisite_course_id, type))')
        .eq('id', section_id)
        .single();

      if (sectionError || !section) {
        toast.error("Section not found or could not be loaded.");
        throw sectionError || new Error("Section not found.");
      }

      if (section.status !== 'open_for_enrollment' && section.status !== 'scheduled') { // 'scheduled' might allow waitlisting
        toast.error(`Enrollment is not open for section ${section.section_number} (${section.course?.code}). Status: ${section.status}`);
        await logEnrollmentAudit('ENROLL_ATTEMPT_FAIL', null, {studentId: student_profile_id, sectionId: section_id}, [], actingUserId, `Section not open. Status: ${section.status}`);
        return null;
      }

      // 2. Check for existing enrollment/waitlist for this student in this section
      const { data: existingEnrollment, error: existingError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_profile_id', student_profile_id)
        .eq('section_id', section_id)
        .is('deleted_at', null) // only active/waitlisted
        .maybeSingle();

      if (existingError) throw existingError;
      if (existingEnrollment) {
        toast.info(`Student is already ${existingEnrollment.status} in this section.`);
        return null; // Or return existing enrollment details
      }

      // 3. TODO: Prerequisite & Corequisite Checking (Complex)
      //    - Fetch student's completed courses (from enrollments where status='completed' and grade is passing).
      //    - Compare against section.course.prerequisites.
      //    - If fails, toast.error and return null. Log attempt.
      //    await logEnrollmentAudit('ENROLL_ATTEMPT_FAIL_PREREQ', null, {studentId: student_profile_id, sectionId: section_id}, [], actingUserId, `Prerequisites not met.`);


      // 4. TODO: Check for time conflicts with other enrolled sections in the same term. (Complex)

      // 5. TODO: Check for credit load limits for the term. (Complex)

      // 6. TODO: Check for any financial or academic holds on the student's profile.

      // 7. Determine enrollment status (enrolled or waitlisted)
      let determinedStatus: DbEnrollment['status'] = 'enrolled';
      if (section.current_enrollment_count >= section.capacity) {
        if (section.current_waitlist_count < section.waitlist_capacity) {
          determinedStatus = 'waitlisted';
        } else {
          toast.error(`Section ${section.section_number} and its waitlist are full.`);
          await logEnrollmentAudit('ENROLL_ATTEMPT_FAIL_FULL', null, {studentId: student_profile_id, sectionId: section_id}, [], actingUserId, `Section and waitlist full.`);
          return null;
        }
      }

      // 8. Insert enrollment record
      const { data: newEnrollment, error: insertError } = await supabase
        .from('enrollments')
        .insert({
          student_profile_id,
          section_id,
          status: determinedStatus,
          enrollment_method,
          enrolled_at: new Date().toISOString(), // Or waitlisted_at if status is waitlisted
        })
        .select(DETAILED_ENROLLMENT_SELECT)
        .single();

      if (insertError) throw insertError;
      if (!newEnrollment) throw new Error("Enrollment failed to return data.");

      // 9. Update section enrollment counts (ideally via DB trigger, or call a service method)
      // await sectionService.updateSectionEnrollmentCounts(section_id); // Assuming sectionService is available

      toast.success(`Successfully ${determinedStatus} student in section ${section.section_number} (${section.course?.code}).`);
      await logEnrollmentAudit(determinedStatus === 'enrolled' ? 'ENROLLED_SUCCESS' : 'WAITLISTED_SUCCESS', newEnrollment.id, {studentId: student_profile_id, sectionId: section_id}, [], actingUserId);

      // 10. TODO: Send notification to student.

      return newEnrollment as StudentEnrollmentDetails;

    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast.error(`Enrollment failed: ${error.message}`);
      await logEnrollmentAudit('ENROLL_ATTEMPT_FAIL', null, {studentId: student_profile_id, sectionId: section_id}, [], actingUserId, `System error: ${error.message}`);
      return null;
    }
  },

  /**
   * Drops a student's enrollment from a section or removes from waitlist.
   */
  async dropStudentFromSection(
    enrollmentId: string,
    actingUserId: string | null, // Student (self-service), advisor, or admin
    reason?: string // Optional reason for audit
  ): Promise<boolean> {
    if (!actingUserId) { /* ... auth error ... */ return false; }

    try {
      const { data: enrollment, error: fetchError } = await supabase
        .from('enrollments')
        .select('id, student_profile_id, section_id, status')
        .eq('id', enrollmentId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !enrollment) {
        toast.error("Enrollment record not found or already processed.");
        throw fetchError || new Error("Enrollment not found.");
      }

      // TODO: Permission Check: actingUserId is student, their advisor, instructor of section, or admin.
      // TODO: Check add/drop deadlines for the term/section. If past deadline, might change status to 'withdrawn_official' instead of deleting or soft-deleting.

      // Soft delete is generally preferred for enrollments to keep history
      const { error: deleteError } = await supabase
        .from('enrollments')
        .update({
            deleted_at: new Date().toISOString(),
            status: 'dropped_course', // Or a more specific status
            // Consider adding 'dropped_by: actingUserId' and 'drop_reason: reason' fields
        })
        .eq('id', enrollmentId);

      // Or hard delete (less common for enrollments):
      // const { error: deleteError } = await supabase.from('enrollments').delete().eq('id', enrollmentId);

      if (deleteError) throw deleteError;

      // Update section enrollment counts (ideally via DB trigger)
      // await sectionService.updateSectionEnrollmentCounts(enrollment.section_id);

      // TODO: If a spot opened up and student was 'enrolled' (not 'waitlisted'), process waitlist for this section.
      // if (enrollment.status === 'enrolled') {
      //    await this.processWaitlistForSection(enrollment.section_id, actingUserId);
      // }

      toast.success("Successfully removed student from section.");
      await logEnrollmentAudit('DROPPED_COURSE', enrollmentId, {studentId: enrollment.student_profile_id, sectionId: enrollment.section_id}, [], actingUserId, reason || 'Student dropped section.');
      // TODO: Notify student.
      return true;

    } catch (error: any) {
      console.error(`Error dropping enrollment ${enrollmentId}:`, error);
      toast.error(`Failed to remove student from section: ${error.message}`);
      await logEnrollmentAudit('DROP_COURSE_FAIL', enrollmentId, {}, [], actingUserId, `System error: ${error.message}`);
      return false;
    }
  },

  /**
   * Retrieves a student's current schedule (enrolled sections) for a specific term.
   */
  async getStudentScheduleForTerm(
    studentId: string,
    termId: string,
    actingUserId: string | null
  ): Promise<StudentEnrollmentDetails[] | null> {
    // TODO: Permission check
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(DETAILED_ENROLLMENT_SELECT)
        .eq('student_profile_id', studentId)
        .eq('section.term_id', termId) // Filter by term_id on the joined section
        .in('status', ['enrolled', 'waitlisted']) // Show both active enrollments and waitlists
        .is('deleted_at', null)
        .order('section(course(code))');

      if (error) throw error;
      return data as StudentEnrollmentDetails[];
    } catch (error: any) {
      console.error(`Error fetching schedule for student ${studentId}, term ${termId}:`, error);
      toast.error("Failed to fetch student schedule.");
      return null;
    }
  },

  /**
   * Retrieves a student's complete enrollment history (academic record).
   */
  async getStudentEnrollmentHistory(
    studentId: string,
    actingUserId: string | null,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<StudentEnrollmentDetails>> {
    // TODO: Permission check
     const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    try {
      const query = supabase
        .from('enrollments')
        .select(DETAILED_ENROLLMENT_SELECT, { count: 'exact' })
        .eq('student_profile_id', studentId)
        // Could filter out 'dropped_course' if a true "transcript" view is needed, or show all history
        .is('deleted_at', null) // Or include soft-deleted if that's desired for full history
        .order('section(term(start_date))', { ascending: false }) // Newest terms first
        .order('section(course(code))')
        .range(rangeFrom, rangeTo);

      const { data, error, count } = await query;
      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      if (error) throw error;
      return { data: (data as StudentEnrollmentDetails[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
    } catch (error: any) {
      console.error(`Error fetching enrollment history for student ${studentId}:`, error);
      toast.error("Failed to fetch enrollment history.");
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
  },

  /**
   * NEW: Process the waitlist for a section.
   * Called when a spot opens up or by an admin.
   */
  async processWaitlistForSection(sectionId: string, actingUserId: string | null /* system or admin */): Promise<{ processedCount: number; errors: any[] }> {
    // TODO: Permission Check (admin or system role)
    let processedCount = 0;
    const errors: any[] = [];

    try {
        const { data: section, error: sectionError } = await supabase
            .from('course_sections')
            .select('id, capacity, current_enrollment_count, course_id, status, term_id') // Add term_id
            .eq('id', sectionId)
            .single();

        if (sectionError || !section) {
            errors.push(new Error(`Section ${sectionId} not found for waitlist processing.`));
            return { processedCount, errors };
        }

        let availableSpots = section.capacity - section.current_enrollment_count;
        if (availableSpots <= 0) {
            console.log(`No available spots in section ${sectionId} for waitlist processing.`);
            return { processedCount, errors };
        }

        // Get students from waitlist, ordered by enrolled_at (FIFO)
        const { data: waitlistedStudents, error: waitlistError } = await supabase
            .from('enrollments')
            .select('id, student_profile_id, enrolled_at')
            .eq('section_id', sectionId)
            .eq('status', 'waitlisted')
            .is('deleted_at', null)
            .order('enrolled_at', { ascending: true }) // FIFO
            .limit(availableSpots); // Only fetch as many as can be enrolled

        if (waitlistError) {
            errors.push(waitlistError);
            return { processedCount, errors };
        }

        if (!waitlistedStudents || waitlistedStudents.length === 0) {
            console.log(`No students on waitlist for section ${sectionId}.`);
            return { processedCount, errors };
        }

        for (const wlStudent of waitlistedStudents) {
            if (availableSpots <= 0) break;

            // TODO: Before enrolling, re-check student's eligibility:
            // - Prereqs (they might have dropped a prereq)
            // - Time conflicts (they might have enrolled in another conflicting course)
            // - Credit load
            // - Holds
            // This is a simplified version. A robust system would re-validate.

            const { error: enrollError } = await supabase
                .from('enrollments')
                .update({ status: 'enrolled', enrollment_method: 'waitlist_auto' })
                .eq('id', wlStudent.id);

            if (enrollError) {
                errors.push({ studentId: wlStudent.student_profile_id, error: enrollError });
                await logEnrollmentAudit('WAITLIST_PROCESS_FAIL', wlStudent.id, {studentId:wlStudent.student_profile_id, sectionId}, [], actingUserId, `Error enrolling from waitlist: ${enrollError.message}`);
            } else {
                processedCount++;
                availableSpots--;
                await logEnrollmentAudit('WAITLIST_ENROLLED', wlStudent.id, {studentId:wlStudent.student_profile_id, sectionId}, [{field: 'status', oldValue: 'waitlisted', newValue: 'enrolled'}], actingUserId, `Auto-enrolled from waitlist.`);
                // TODO: Notify student of successful enrollment from waitlist.
            }
        }

        // Update section enrollment counts
        // await sectionService.updateSectionEnrollmentCounts(sectionId);

        if (processedCount > 0) {
            toast.success(`${processedCount} student(s) processed from waitlist for section.`);
        }
        return { processedCount, errors };

    } catch (error: any) {
        console.error(`Error processing waitlist for section ${sectionId}:`, error);
        errors.push(error);
        return { processedCount, errors };
    }
  }
};

export default studentService;
