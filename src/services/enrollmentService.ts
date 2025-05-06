import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database, Json } from '@/integrations/supabase/types';
// Assume sectionService is available for some operations like count updates
// import { sectionService } from './sectionService'; // If methods are exposed

// --- Type Definitions ---
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type DbEnrollment = Database["public"]["Tables"]["enrollments"]["Row"];
type CourseSection = Database["public"]["Tables"]["course_sections"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];
type Term = Database["public"]["Tables"]["terms"]["Row"];

export type EnrollmentStatus = 'pending_prereq_check' | 'pending_payment' | 'waitlisted' | 'enrolled' | 'dropped_self' | 'dropped_admin' | 'withdrawn_period' | 'completed' | 'auditing' | 'failed_prereq';

export interface Enrollment extends DbEnrollment {
  deleted_at?: string | null;
  status: EnrollmentStatus; // Make status strongly typed
  student?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>;
  section?: CourseSection & {
    course?: Pick<Course, 'id' | 'name' | 'code' | 'credits'> | null;
    term?: Pick<Term, 'id' | 'name' | 'start_date' | 'end_date'> | null;
    // instructors?: Array<{ profile: Pick<Profile, 'id' | 'first_name' | 'last_name'>, role: string }>;
  };
}

// Input for initiating an enrollment attempt
export interface EnrollmentRequestInput {
  student_profile_id: string;
  section_id: string;
  grading_option?: DbEnrollment['grading_option'];
  enrollment_method?: DbEnrollment['enrollment_method'];
}

// For updating enrollment, e.g., grade or status by admin/instructor
export interface EnrollmentUpdateInput {
  grade?: string | null;
  status?: EnrollmentStatus;
  // Potentially other fields an admin might update
  override_flags?: Json | null;
}

// Reusable PaginatedResponse
export interface PaginatedResponse<T> { /* ... as defined before ... */ }
// AuditLogEntry
export type EnrollmentAuditLogEntry = { /* ... specific to enrollments ... */ };


// --- Constants ---
const DEFAULT_PAGE_SIZE = 25;
const DETAILED_ENROLLMENT_SELECT = `
  *,
  student:student_profile_id!inner(id, first_name, last_name, email),
  section:section_id!inner(
    *,
    course:course_id!inner(*),
    term:term_id!inner(*),
    section_instructors(role, instructor:instructor_profile_id!inner(id, first_name, last_name))
  )
`;

// --- Placeholder for Permissions & Audit Logging ---
// Assume `hasPermission(...)` and `logEnrollmentAudit(...)` exist.
const logEnrollmentAudit = async (
    action: string,
    enrollmentId: string | null,
    { studentId, sectionId }: { studentId?: string, sectionId?: string },
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    actingUserId: string | null,
    details?: string
  ) => {
    console.log(`[AUDIT_STUB_ENROLLMENT] Action: ${action}, EnrollmentID: ${enrollmentId}, Student: ${studentId}, Section: ${sectionId}, By: ${actingUserId}, Details: ${details}`);
  };

// --- Business Logic Helper (Conceptual) ---
/**
 * Performs pre-enrollment checks.
 * Returns { eligible: boolean, reason?: string, newStatusIfEligible?: EnrollmentStatus }
 */
async function performPreEnrollmentChecks(
    studentId: string,
    section: CourseSection & { course: Course & { prerequisites?: any[] } }, // Enriched section type
    term: Term,
    actingUserId: string | null
): Promise<{ eligible: boolean; reason?: string; determinedStatus?: EnrollmentStatus; blockingHold?: any }> {
    // 1. Check Academic Holds
    // const { data: holds } = await supabase.from('student_academic_holds').select('*').eq('student_profile_id', studentId).gte('expiry_date', new Date().toISOString());
    // if (holds && holds.length > 0) return { eligible: false, reason: `Student has active holds: ${holds[0].hold_type}`, blockingHold: holds[0] };
    await logEnrollmentAudit('PRE_ENROLL_CHECK_HOLDS', null, {studentId, sectionId: section.id}, [], actingUserId, "Hold check stubbed pass");


    // 2. Check Enrollment Period for the Term
    const now = new Date();
    // if (now < new Date(term.enrollment_start_date) || now > new Date(term.enrollment_end_date)) {
    //     return { eligible: false, reason: "Enrollment period for this term is not active." };
    // }
    await logEnrollmentAudit('PRE_ENROLL_CHECK_TERM_DATES', null, {studentId, sectionId: section.id}, [], actingUserId, "Term date check stubbed pass");

    // 3. TODO: Prerequisite & Corequisite Checking (Very Complex)
    //    - Fetch student's academic history (completed courses with passing grades).
    //    - Fetch prerequisite rules for section.course.
    //    - Evaluate if student meets them. If not:
    //    return { eligible: false, reason: "Prerequisites not met." };
    await logEnrollmentAudit('PRE_ENROLL_CHECK_PREREQS', null, {studentId, sectionId: section.id}, [], actingUserId, "Prereq check stubbed pass");


    // 4. TODO: Time Conflict Checking (Complex)
    //    - Fetch student's current enrollments for the term.
    //    - Compare section.schedule_details with schedules of other enrolled sections.
    //    - If conflict: return { eligible: false, reason: "Time conflict with another enrolled section." };
    await logEnrollmentAudit('PRE_ENROLL_CHECK_TIME_CONFLICT', null, {studentId, sectionId: section.id}, [], actingUserId, "Time conflict check stubbed pass");


    // 5. TODO: Credit Load Limit Check (Complex)
    //    - Fetch student's current enrolled credits for the term.
    //    - Add section.course.credits.
    //    - Compare against max credit load (from program rules or system settings).
    //    - If exceeds: return { eligible: false, reason: "Exceeds maximum credit load for the term." };
    await logEnrollmentAudit('PRE_ENROLL_CHECK_CREDIT_LOAD', null, {studentId, sectionId: section.id}, [], actingUserId, "Credit load check stubbed pass");

    // 6. Determine status based on capacity
    if (section.current_enrollment_count >= section.capacity) {
        if ((section.current_waitlist_count ?? 0) < (section.waitlist_capacity ?? 0)) {
            return { eligible: true, determinedStatus: 'waitlisted' };
        } else {
            return { eligible: false, reason: "Section and its waitlist are full." };
        }
    }
    return { eligible: true, determinedStatus: 'enrolled' };
}


// --- Enhanced Enrollment Service ---
export const enrollmentService = {
  /**
   * Retrieves enrollments for a specific section with student details.
   */
  async getEnrollmentsForSection(
    sectionId: string,
    actingUserId: string | null,
    options: {
      status?: EnrollmentStatus;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Enrollment>> {
    // TODO: Permission check (instructor of section, admin)
    const { status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from('enrollments')
      .select(`*, student:student_profile_id(id, first_name, last_name, email)`, { count: 'exact' })
      .eq('section_id', sectionId)
      .is('deleted_at', null);

    if (status) query = query.eq('status', status);
    query = query.order('student(last_name)').range(rangeFrom, rangeTo);

    try {
      const { data, error, count } = await query;
      const totalPages = count ? Math.ceil(count / pageSize) : 0;
      if (error) throw error;
      return { data: (data as Enrollment[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
    } catch (error: any) {
      console.error(`Error fetching enrollments for section ${sectionId}:`, error);
      toast.error(`Failed to fetch enrollments: ${error.message}`);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
  },

  /**
   * Retrieves all enrollments for a specific student with section and course details.
   */
  async getStudentEnrollments(
    studentId: string,
    actingUserId: string | null,
    options: {
      termId?: string;
      status?: EnrollmentStatus;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Enrollment>> {
    // TODO: Permission check (student themselves, advisor, admin)
    const { termId, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    // More complex select needed if termId is a filter on the joined section's term
    let query = supabase
      .from('enrollments')
      .select(DETAILED_ENROLLMENT_SELECT, { count: 'exact' })
      .eq('student_profile_id', studentId)
      .is('deleted_at', null);

    if (termId) query = query.eq('section.term_id', termId); // Filter on joined table
    if (status) query = query.eq('status', status);

    query = query.order('section(term(start_date))', { ascending: false })
                 .order('section(course(code))')
                 .range(rangeFrom, rangeTo);

    try {
        const { data, error, count } = await query;
        const totalPages = count ? Math.ceil(count / pageSize) : 0;
        if (error) throw error;
        return { data: (data as Enrollment[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
    } catch (error: any) {
        console.error(`Error fetching enrollments for student ${studentId}:`, error);
        toast.error(`Failed to fetch student enrollments: ${error.message}`);
        return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
  },

  /**
   * Processes a student's request to enroll in a section.
   * This is the core "Add Course" functionality.
   */
  async requestEnrollment(
    input: EnrollmentRequestInput,
    actingUserId: string | null
  ): Promise<Enrollment | null> {
    if (!actingUserId) { /* ... auth error ... */ return null; }
    // TODO: Permission check (student for self, admin/advisor for others with appropriate enrollment_method)
    const { student_profile_id, section_id, grading_option = 'letter', enrollment_method = 'self_service' } = input;

    try {
      // 1. Fetch section & term details
      const { data: sectionData, error: sectionError } = await supabase
        .from('course_sections')
        .select('*, course:course_id!inner(*), term:term_id!inner(*)')
        .eq('id', section_id)
        .single();

      if (sectionError || !sectionData) {
        toast.error("Section not found or inaccessible.");
        throw sectionError || new Error("Section details could not be fetched.");
      }

      // 2. Perform Pre-enrollment Checks
      const checks = await performPreEnrollmentChecks(student_profile_id, sectionData as any, sectionData.term as Term, actingUserId);
      if (!checks.eligible) {
        toast.error(`Enrollment not possible: ${checks.reason || 'Eligibility criteria not met.'}`);
        await logEnrollmentAudit('ENROLL_REQUEST_FAIL_ELIGIBILITY', null, { studentId: student_profile_id, sectionId: section_id }, [], actingUserId, checks.reason);
        return null;
      }

      // 3. Check for existing enrollment
      const { data: existingEnrollment } = await supabase.from('enrollments')
        .select('id, status').eq('student_profile_id', student_profile_id).eq('section_id', section_id).is('deleted_at', null).maybeSingle();
      if (existingEnrollment) {
        toast.info(`Already ${existingEnrollment.status} in this section.`);
        return existingEnrollment as Enrollment; // Or null if no action needed
      }

      // 4. Insert enrollment record
      const { data: newEnrollment, error: insertError } = await supabase
        .from('enrollments')
        .insert({
          student_profile_id,
          section_id,
          status: checks.determinedStatus!,
          grading_option,
          credits_attempted: sectionData.course.credits, // Capture credits at time of enrollment
          enrollment_method,
          enrolled_at: checks.determinedStatus === 'enrolled' ? new Date().toISOString() : null,
          waitlisted_at: checks.determinedStatus === 'waitlisted' ? new Date().toISOString() : null,
        })
        .select(DETAILED_ENROLLMENT_SELECT)
        .single();

      if (insertError) throw insertError;
      if (!newEnrollment) throw new Error("Enrollment record creation failed.");

      // 5. Update section enrollment counts (ideally via DB trigger for atomicity)
      // await sectionService.updateSectionEnrollmentCounts(section_id); // Assumes sectionService exists

      toast.success(`Successfully ${checks.determinedStatus} in ${sectionData.course.code} - ${sectionData.section_number}.`);
      await logEnrollmentAudit(
        checks.determinedStatus === 'enrolled' ? 'ENROLL_SUCCESS' : 'WAITLIST_SUCCESS',
        newEnrollment.id,
        { studentId: student_profile_id, sectionId: section_id },
        [], actingUserId
      );
      // TODO: Notify student.
      return newEnrollment as Enrollment;

    } catch (error: any) {
      console.error('Error processing enrollment request:', error);
      toast.error(`Enrollment request failed: ${error.message}`);
      await logEnrollmentAudit('ENROLL_REQUEST_FAIL_SYSTEM', null, { studentId: student_profile_id, sectionId: section_id }, [], actingUserId, `System error: ${error.message}`);
      return null;
    }
  },

  /**
   * Processes a student's request to drop/withdraw from an enrolled section.
   */
  async requestDropOrWithdrawal(
    enrollmentId: string,
    actingUserId: string | null,
    reason?: string
  ): Promise<boolean> {
    if (!actingUserId) { /* ... auth error ... */ return false; }

    try {
      const { data: enrollment, error: fetchError } = await supabase
        .from('enrollments')
        .select('*, section:section_id(id, term_id(*))') // Fetch term for deadline checks
        .eq('id', enrollmentId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !enrollment) {
        toast.error("Active enrollment record not found.");
        return false;
      }

      // TODO: Permission check: student for self, admin/advisor for others.

      // Determine new status based on term deadlines (add_drop_deadline, withdrawal_deadline)
      const now = new Date();
      let newStatus: EnrollmentStatus = 'dropped_self'; // Default for within add/drop
      // if (enrollment.section?.term && now > new Date(enrollment.section.term.add_drop_deadline)) {
      //   if (now <= new Date(enrollment.section.term.withdrawal_deadline)) {
      //     newStatus = 'withdrawn_period'; // Official withdrawal, may appear on transcript with 'W'
      //   } else {
      //     toast.error("Withdrawal deadline has passed. Cannot drop or withdraw.");
      //     return false; // Past withdrawal deadline
      //   }
      // }

      const { error: updateError } = await supabase
        .from('enrollments')
        .update({
          status: newStatus,
          deleted_at: newStatus === 'dropped_self' ? new Date().toISOString() : null, // Soft delete if just 'dropped'
          dropped_at: new Date().toISOString(),
          // Consider adding 'dropped_by_user_id': actingUserId
        })
        .eq('id', enrollmentId);

      if (updateError) throw updateError;

      // await sectionService.updateSectionEnrollmentCounts(enrollment.section_id);
      // if (enrollment.status === 'enrolled') { // If they were enrolled, not waitlisted
      //   await studentService.processWaitlistForSection(enrollment.section_id, 'system_process_user_id');
      // }

      toast.success(`Successfully processed ${newStatus.replace('_', ' ')} for the course.`);
      await logEnrollmentAudit(newStatus.toUpperCase() as any, enrollmentId, { studentId: enrollment.student_profile_id, sectionId: enrollment.section_id }, [], actingUserId, reason);
      // TODO: Notify student and instructor.
      return true;

    } catch (error: any) {
      console.error(`Error processing drop/withdrawal for enrollment ${enrollmentId}:`, error);
      toast.error(`Drop/Withdrawal request failed: ${error.message}`);
      return false;
    }
  },

  /**
   * Updates an enrollment record (e.g., by an admin or instructor to set grade).
   */
  async updateEnrollmentDetails(
    enrollmentId: string,
    updates: EnrollmentUpdateInput,
    actingUserId: string | null
  ): Promise<Enrollment | null> {
    if (!actingUserId) { /* ... auth error ... */ return null; }
    // TODO: Permission check (e.g., instructor for grade, admin for status/overrides)

    try {
      const {data: currentEnrollment} = await supabase.from('enrollments').select('*').eq('id', enrollmentId).single();
      if (!currentEnrollment) {
          toast.error("Enrollment record not found.");
          return null;
      }

      const { data, error } = await supabase
        .from('enrollments')
        .update(updates)
        .eq('id', enrollmentId)
        .select(DETAILED_ENROLLMENT_SELECT)
        .single();

      if (error) throw error;
      toast.success("Enrollment details updated.");
      if (data) {
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
         (Object.keys(updates) as Array<keyof EnrollmentUpdateInput>).forEach(key => {
            if (currentEnrollment[key as keyof DbEnrollment] !== updates[key]) {
                changes.push({ field: key, oldValue: currentEnrollment[key as keyof DbEnrollment], newValue: updates[key]});
            }
        });
        await logEnrollmentAudit('ENROLLMENT_ADMIN_UPDATE', enrollmentId, { studentId: data.student_profile_id, sectionId: data.section_id }, changes, actingUserId);
      }
      return data as Enrollment;
    } catch (error: any) {
      console.error(`Error updating enrollment ${enrollmentId}:`, error);
      toast.error(`Failed to update enrollment: ${error.message}`);
      return null;
    }
  },

  /**
   * Processes the waitlist for a section.
   * (This can be moved from studentService or called from here if studentService has it)
   */
  async processSectionWaitlist(sectionId: string, actingUserId: string | null): Promise<{ processedCount: number; errors: any[] }> {
    // TODO: Permission check (admin, system)
    // This logic would be very similar to the one in `studentService.processWaitlistForSection`
    // It would involve:
    // 1. Checking available spots in the section.
    // 2. Getting waitlisted students in FIFO order.
    // 3. For each student, re-performing pre-enrollment checks (prereqs, conflicts, holds, limits).
    // 4. If eligible, updating their enrollment status to 'enrolled'.
    // 5. Updating section counts.
    // 6. Notifying students.
    // 7. Logging everything.
    console.warn(`[STUB] Waitlist processing called for section ${sectionId} by ${actingUserId}`);
    toast.info("Waitlist processing initiated (stubbed).");
    return { processedCount: 0, errors: [] }; // Stubbed response
  }
};

export default enrollmentService;
