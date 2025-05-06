import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';

// --- Type Definitions ---

// Base types (assuming these would be generated or well-defined)
type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"] & {
  deleted_at?: string | null; // For soft deletes
};
type AttendanceExcuse = Database["public"]["Tables"]["attendance_excuses"]["Row"] & {
  deleted_at?: string | null;
};
type AttendancePolicy = Database["public"]["Tables"]["attendance_policies"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Detailed types for responses
export interface AttendanceRecordWithDetails extends AttendanceRecord {
  student: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'> | null; // email is good for notifications
  excuses: AttendanceExcuseWithDetails[]; // Can have multiple excuses over time, though usually one active
}

export interface AttendanceExcuseWithDetails extends AttendanceExcuse {
  // Potentially include student info if not directly on the excuse record
  // student_id could be on attendance_excuses or derived from attendance_records
  submitted_by_student?: Pick<Profile, 'id' | 'first_name' | 'last_name'> | null;
  reviewed_by_user?: Pick<Profile, 'id' | 'first_name' | 'last_name'> | null;
}

// Input types
export interface RecordAttendanceInput {
  section_id: string;
  student_id: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  status: 'present' | 'absent' | 'late' | 'excused';
  minutes_late?: number | null;
  notes?: string | null;
  // recorded_by is handled by actingUserId
  // verification_method?: 'manual' | 'qr_code' | 'beacon' | 'geofence'; // For automated methods
}

export type BulkRecordAttendanceInput = Array<Omit<RecordAttendanceInput, 'recorded_by'>>;

export interface SubmitExcuseInput {
  attendance_record_id: string; // Link to a specific attendance record
  student_id: string; // Who is submitting
  reason: string;
  documentation_url?: string | null;
  // submitted_at is handled by DB
}

export interface ReviewExcuseInput {
  excuse_id: string;
  status: 'approved' | 'denied' | 'pending_more_info'; // More granular status
  // reviewer_id is handled by actingUserId
  reviewer_notes?: string | null;
  // reviewed_at is handled by DB
}

export type UpdateAttendancePolicyInput = Partial<Omit<AttendancePolicy, 'id' | 'section_id' | 'created_at' | 'updated_at'>>;


// Reusable PaginatedResponse
export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  error: Error | null;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
}

// For attendance_audit_log table
export type AttendanceAuditLogEntry = {
  id: string;
  record_id?: string | null;
  excuse_id?: string | null;
  policy_id?: string | null;
  changed_by_user_id: string | null;
  changed_at: string;
  action: string; // e.g., 'ATTENDANCE_RECORDED', 'EXCUSE_SUBMITTED', 'POLICY_UPDATED'
  field_changed?: string | null;
  old_value?: Json | null;
  new_value?: Json | null;
  details?: string | null;
};

// --- Constants ---
const DEFAULT_PAGE_SIZE = 25; // Class lists can be this size

// --- Placeholder for Permissions & Helper for Audit Logging ---
// These would be similar to what was defined in profileService and assignmentService
// For brevity, I'll skip redefining `hasPermission` and `logAudit` stubs here,
// but assume they exist and are adapted for attendance (e.g., `hasAttendancePermission`, `logAttendanceAudit`).
// actingUserId would be passed into each method.

const logAttendanceAudit = async (
    action: string,
    ids: { recordId?: string, excuseId?: string, policyId?: string, sectionId?: string, studentId?: string },
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    actingUserId: string | null,
    details?: string
  ) => {
    // Simplified audit logging stub
    console.log(`[AUDIT_STUB] Action: ${action}, By: ${actingUserId}, IDs: ${JSON.stringify(ids)}, Changes: ${changes.length}, Details: ${details}`);
    const entry: Partial<AttendanceAuditLogEntry> = {
        action,
        record_id: ids.recordId,
        excuse_id: ids.excuseId,
        policy_id: ids.policyId,
        changed_by_user_id: actingUserId,
        details,
        // In a real scenario, you might map changes to field_changed, old_value, new_value
    };
    // await supabase.from('attendance_audit_log').insert(entry);
  };


// --- Enhanced Attendance Service ---
export const attendanceService = {
  /**
   * Get attendance records for a section, optionally filtered by date, with pagination.
   */
  async getAttendanceRecords(
    sectionId: string,
    actingUserId: string | null, // For permission checks
    options: {
      date?: string; // YYYY-MM-DD
      studentId?: string;
      page?: number;
      pageSize?: number;
      includeSoftDeleted?: boolean;
    } = {}
  ): Promise<PaginatedResponse<AttendanceRecordWithDetails>> {
    // TODO: Implement permission check: e.g., actingUser is instructor of sectionId or admin
    const { date, studentId, page = 1, pageSize = DEFAULT_PAGE_SIZE, includeSoftDeleted = false } = options;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from('attendance_records')
      .select(
        `
        *,
        student:student_id(id, first_name, last_name, email),
        excuses:attendance_excuses!attendance_id(*)
      `,
        { count: 'exact' }
      )
      .eq('section_id', sectionId);

    if (date) query = query.eq('date', date);
    if (studentId) query = query.eq('student_id', studentId);
    if (!includeSoftDeleted) query = query.is('deleted_at', null);

    query = query.order('date', { ascending: false }).order('student_id').range(rangeFrom, rangeTo); // Order by student for easier viewing

    const { data, error, count } = await query;
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    if (error) {
      console.error('Error fetching attendance records:', error);
      return { data: [], count: 0, error: new Error(error.message), currentPage: page, pageSize, totalPages };
    }
    return { data: (data as AttendanceRecordWithDetails[]) || [], count, error: null, currentPage: page, pageSize, totalPages };
  },

  /**
   * Records or updates a single attendance entry for a student on a specific date.
   * Uses upsert to handle both creation and update based on composite key (section_id, student_id, date).
   */
  async recordAttendance(
    input: RecordAttendanceInput,
    actingUserId: string | null
  ): Promise<AttendanceRecordWithDetails> {
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission Check: actingUser is instructor for input.section_id or admin.

    // Fetch existing record for audit comparison (if any)
    const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('section_id', input.section_id)
        .eq('student_id', input.student_id)
        .eq('date', input.date)
        .maybeSingle(); // Use maybeSingle to not error if not found

    const recordToUpsert = {
        section_id: input.section_id,
        student_id: input.student_id,
        date: input.date,
        status: input.status,
        minutes_late: input.minutes_late,
        notes: input.notes,
        recorded_by: actingUserId,
        // verification_method: input.verification_method || 'manual',
    };

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(recordToUpsert, { onConflict: 'section_id,student_id,date' }) // Define your conflict target
      .select( // Reselect with details
        `
        *,
        student:student_id(id, first_name, last_name, email),
        excuses:attendance_excuses!attendance_id(*)
        `
      )
      .single();

    if (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to record attendance, no data returned.');

    const action = existingRecord ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED';
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    if (existingRecord) {
        (Object.keys(input) as Array<keyof RecordAttendanceInput>).forEach(key => {
            if (existingRecord[key as keyof AttendanceRecord] !== input[key]) {
                changes.push({ field: key, oldValue: existingRecord[key as keyof AttendanceRecord], newValue: input[key]});
            }
        });
    }
    await logAttendanceAudit(action, { recordId: data.id, sectionId: input.section_id, studentId: input.student_id }, changes, actingUserId);
    return data as AttendanceRecordWithDetails;
  },

  /**
   * Records attendance for multiple students in bulk.
   */
  async bulkRecordAttendance(
    records: BulkRecordAttendanceInput,
    actingUserId: string | null,
    sectionIdForPermission: string // Explicitly pass section for permission check
  ): Promise<AttendanceRecordWithDetails[]> {
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission Check: actingUser is instructor for sectionIdForPermission or admin.
    // Ensure all records in the bulk operation are for sections the user has rights to.
    // This might involve checking each record's sectionId if they can differ.

    const recordsToUpsert = records.map(record => ({
      section_id: record.section_id,
      student_id: record.student_id,
      date: record.date,
      status: record.status,
      minutes_late: record.minutes_late,
      notes: record.notes,
      recorded_by: actingUserId,
    }));

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(recordsToUpsert, { onConflict: 'section_id,student_id,date' })
      .select( // Reselect with details for each
         `
        *,
        student:student_id(id, first_name, last_name, email),
        excuses:attendance_excuses!attendance_id(*)
        `
      );

    if (error) {
      console.error('Error bulk recording attendance:', error);
      throw error;
    }
    if (!data) throw new Error('Bulk attendance recording failed, no data returned.');

    // Audit logging for bulk can be tricky: either one summary log or individual logs.
    // For simplicity, one summary. For detail, iterate and log for each `data` item.
    await logAttendanceAudit('ATTENDANCE_BULK_RECORDED', { sectionId: sectionIdForPermission }, [], actingUserId, `Bulk recorded ${data.length} entries.`);
    return data as AttendanceRecordWithDetails[];
  },

  /**
   * Submits an excuse for a specific attendance record.
   */
  async submitExcuse(
    input: SubmitExcuseInput,
    actingUserId: string | null // Usually the student themselves or someone on their behalf
  ): Promise<AttendanceExcuseWithDetails> {
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission Check: actingUserId is input.student_id or an admin/guardian.

    const excuseToInsert = {
        attendance_record_id: input.attendance_record_id,
        student_id: input.student_id, // Redundant if on attendance_record, but good for direct queries on excuses
        reason: input.reason,
        documentation_url: input.documentation_url,
        submitted_by: actingUserId, // Differentiate from the student if submitted by proxy
        status: 'pending_review' // Default status
    };

    const { data, error } = await supabase
      .from('attendance_excuses')
      .insert(excuseToInsert)
      .select(
        `*,
        submitted_by_student:student_id(id, first_name, last_name),
        reviewed_by_user:reviewed_by(id, first_name, last_name)`
      )
      .single();

    if (error) {
      console.error('Error submitting excuse:', error);
      throw error;
    }
    if (!data) throw new Error('Excuse submission failed.');

    await logAttendanceAudit('EXCUSE_SUBMITTED', { excuseId: data.id, recordId: input.attendance_record_id, studentId: input.student_id }, [], actingUserId);

    // Potentially trigger a notification to the instructor/admin for review.

    return data as AttendanceExcuseWithDetails;
  },

  /**
   * Reviews an attendance excuse (approve/deny).
   */
  async reviewExcuse(
    input: ReviewExcuseInput,
    actingUserId: string | null // Instructor or Admin
  ): Promise<AttendanceExcuseWithDetails> {
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission Check: actingUser has rights to review excuses for the course section
    // associated with this excuse (requires fetching excuse -> attendance_record -> section).

    const { data: existingExcuse } = await supabase.from('attendance_excuses').select('status').eq('id', input.excuse_id).single();
    if (!existingExcuse) throw new Error(`Excuse with ID ${input.excuse_id} not found.`);


    const updatePayload = {
        status: input.status,
        reviewed_by: actingUserId,
        reviewer_notes: input.reviewer_notes,
        reviewed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('attendance_excuses')
      .update(updatePayload)
      .eq('id', input.excuse_id)
      .select(
         `*,
        submitted_by_student:student_id(id, first_name, last_name),
        reviewed_by_user:reviewed_by(id, first_name, last_name)`
      )
      .single();

    if (error) {
      console.error('Error reviewing excuse:', error);
      throw error;
    }
    if (!data) throw new Error('Excuse review failed.');

    // If approved, potentially update the linked attendance_record's status to 'excused'.
    if (data.status === 'approved' && data.attendance_record_id) {
        await this.recordAttendance({
            // Need to fetch details of the original record to fill these correctly
            // This is a simplified call; you'd fetch the original record's details
            section_id: 'FETCH_SECTION_ID_FROM_ATTENDANCE_RECORD',
            student_id: 'FETCH_STUDENT_ID_FROM_ATTENDANCE_RECORD',
            date: 'FETCH_DATE_FROM_ATTENDANCE_RECORD',
            status: 'excused',
        }, actingUserId); // Or a system user if this is an automated consequence
    }

    await logAttendanceAudit('EXCUSE_REVIEWED', { excuseId: data.id, recordId: data.attendance_record_id }, [{field: 'status', oldValue: existingExcuse.status, newValue: data.status}], actingUserId);
    // Potentially trigger a notification to the student about the decision.
    return data as AttendanceExcuseWithDetails;
  },

  /**
   * Get the attendance policy for a section.
   */
  async getAttendancePolicy(sectionId: string, actingUserId: string | null): Promise<AttendancePolicy | null> {
    // TODO: Permission check
    const { data, error } = await supabase
      .from('attendance_policies')
      .select('*')
      .eq('section_id', sectionId)
      .maybeSingle(); // Use maybeSingle to return null if not found, not error

    if (error && error.code !== 'PGRST116') { // PGRST116 for "Row not found"
      console.error('Error fetching attendance policy:', error);
      throw error;
    }
    return data;
  },

  /**
   * Create or update the attendance policy for a section.
   */
  async updateAttendancePolicy(
    sectionId: string,
    updates: UpdateAttendancePolicyInput,
    actingUserId: string | null
  ): Promise<AttendancePolicy> {
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission check: actingUser is instructor for sectionId or admin.

    const {data: existingPolicy} = await supabase.from('attendance_policies').select('*').eq('section_id', sectionId).maybeSingle();

    const policyToUpsert = {
        section_id: sectionId,
        ...updates
    };

    const { data, error } = await supabase
      .from('attendance_policies')
      .upsert(policyToUpsert, { onConflict: 'section_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance policy:', error);
      throw error;
    }
    if (!data) throw new Error('Attendance policy update failed.');

    const action = existingPolicy ? 'POLICY_UPDATED' : 'POLICY_CREATED';
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
     if (existingPolicy) {
        (Object.keys(updates) as Array<keyof UpdateAttendancePolicyInput>).forEach(key => {
            if (existingPolicy[key as keyof AttendancePolicy] !== updates[key]) {
                changes.push({ field: key, oldValue: existingPolicy[key as keyof AttendancePolicy], newValue: updates[key]});
            }
        });
    }
    await logAttendanceAudit(action, { policyId: data.id, sectionId }, changes, actingUserId);
    return data;
  },

  /**
   * Gets all attendance records for a specific student in a section.
   * This is largely covered by getAttendanceRecords with studentId filter, but kept for clarity if different logic/permissions apply.
   */
  async getStudentAttendanceSummary(
    sectionId: string,
    studentId: string,
    actingUserId: string | null,
    options: {
        page?: number;
        pageSize?: number;
        includeSoftDeleted?: boolean;
    } = {}
  ): Promise<PaginatedResponse<AttendanceRecordWithDetails>> {
    // TODO: Permission: actingUser is studentId, their parent/guardian, instructor of section, or admin
    return this.getAttendanceRecords(sectionId, actingUserId, { ...options, studentId });
  },

  /**
   * NEW: Generate QR Code Data for Real-time Attendance.
   * This would be called by an instructor to get a short-lived token/data for a QR code.
   * The QR code itself would point to a frontend URL with this data.
   */
  async generateQrCodeAttendanceToken(
    sectionId: string,
    actingUserId: string | null, // Instructor
    durationMinutes: number = 5 // How long the QR code is valid
  ): Promise<{ token: string; expiresAt: string; qrDataUrl: string } | null> {
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission Check: actingUser is instructor for sectionId.
    // TODO: Check if sectionId allows automated attendance.

    // 1. Generate a unique, short-lived token (e.g., JWT or random string stored in a temporary table/cache)
    const token = `QR_${sectionId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    // 2. Store this token temporarily with its expiry and sectionId (e.g., in Redis or a Supabase table 'active_qr_tokens')
    // await supabase.from('active_qr_tokens').insert({ token, section_id: sectionId, expires_at: expiresAt, created_by: actingUserId });
    console.log(`[STUB] QR Token generated: ${token}, Expires: ${expiresAt} for section ${sectionId}`);

    // 3. The frontend would construct a URL like: your-app.com/attend/qr?token=<token>
    // This service just provides the token. The QR code generation itself is a frontend concern.
    const qrDataUrl = `YOUR_APP_DOMAIN/attend/qr?token=${encodeURIComponent(token)}`;

    await logAttendanceAudit('QR_TOKEN_GENERATED', { sectionId }, [], actingUserId, `Duration: ${durationMinutes}min`);
    return { token, expiresAt, qrDataUrl };
  },

  /**
   * NEW: Validate QR Code Token and Record Attendance.
   * Called by a backend API endpoint that the student's device hits after scanning the QR code.
   */
  async validateAndRecordQrAttendance(
    token: string,
    studentId: string, // From the authenticated student session
    geoCoordinates?: { latitude: number; longitude: number } // Optional for geofencing validation
  ): Promise<AttendanceRecordWithDetails> {
        // 1. Validate token: Look up in 'active_qr_tokens', check expiry, ensure not already used by this student for this session.
    // const { data: tokenData } = await supabase.from('active_qr_tokens').select('*').eq('token', token).single();
    // if (!tokenData || new Date(tokenData.expires_at) < new Date() || tokenData.is_used) {
    //   throw new Error('Invalid or expired QR code token.');
    // }
    const MOCK_TOKEN_DATA = { section_id: 'mock-section-uuid-from-token', is_valid: true }; // STUB
    if (!MOCK_TOKEN_DATA.is_valid) throw new Error('Invalid or expired QR code token.');


    // 2. (Optional) Geofencing validation: If section has geofence, check student's geoCoordinates.
    // const { data: sectionPolicy } = await this.getAttendancePolicy(MOCK_TOKEN_DATA.section_id, null);
    // if (sectionPolicy?.geo_fence_coordinates && geoCoordinates) { /* ... perform distance check ... */ }

    // 3. Record attendance
    const attendanceInput: RecordAttendanceInput = {
      section_id: MOCK_TOKEN_DATA.section_id,
      student_id: studentId,
      date: new Date().toISOString().split('T')[0], // Today's date
      status: 'present',
      // verification_method: 'qr_code',
    };
    const recordedAttendance = await this.recordAttendance(attendanceInput, studentId); // studentId acts as recorder here

    // 4. Mark token as used for this student (to prevent reuse for same session)
    // await supabase.from('active_qr_tokens').update({ is_used_by: supabase.sql`array_append(is_used_by, '${studentId}')` }).eq('token', token);

    await logAttendanceAudit('ATTENDANCE_VIA_QR', {recordId: recordedAttendance.id, sectionId: MOCK_TOKEN_DATA.section_id, studentId}, [], studentId);
    return recordedAttendance;
  },

  /**
   * NEW: Get Attendance Analytics for a Section
   * (e.g., overall attendance rate, common absentees, trends)
   * This would likely involve more complex SQL queries or a dedicated analytics service.
   */
  async getSectionAttendanceAnalytics(
    sectionId: string,
    actingUserId: string | null,
    dateRange?: { start: string, end: string }
  ): Promise<any> { // Return type would be a structured analytics object
    if (!actingUserId) throw new Error('User not authenticated.');
    // TODO: Permission check: instructor or admin

    // This is a placeholder. Real analytics require complex queries or DB functions.
    // Example: Calculate overall attendance rate.
    // const { count: totalPossible, error: err1 } = await supabase.from('attendance_records')
    //   .select('id', { count: 'exact', head: true })
    //   .eq('section_id', sectionId)
    //   // .gte('date', dateRange.start).lte('date', dateRange.end)
    //
    // const { count: totalPresentOrExcused, error: err2 } = await supabase.from('attendance_records')
    //   .select('id', { count: 'exact', head: true })
    //   .eq('section_id', sectionId)
    //   .in('status', ['present', 'late', 'excused'])
    //   // .gte('date', dateRange.start).lte('date', dateRange.end)

    // if (err1 || err2) throw new Error("Error fetching analytics data.");
    // const attendanceRate = totalPossible && totalPresentOrExcused ? (totalPresentOrExcused / totalPossible) * 100 : 0;

    const mockAnalytics = {
        sectionId,
        // overallAttendanceRate: attendanceRate.toFixed(2) + '%',
        overallAttendanceRate: '92.50%', // STUB
        studentsWithMostAbsences: [ /* { studentId, name, absenceCount } */ ],
        attendanceTrend: [ /* { date, presentCount, absentCount } */ ],
        lastCalculated: new Date().toISOString()
    };
    await logAttendanceAudit('ANALYTICS_VIEWED_SECTION', { sectionId }, [], actingUserId);
    return mockAnalytics;
  }

};
