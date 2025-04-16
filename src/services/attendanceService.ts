import { supabase } from '@/integrations/supabase/client';

export const attendanceService = {
  async getAttendanceRecords(sectionId: string, date?: string) {
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        student:profiles(id, first_name, last_name),
        excuses:attendance_excuses(*)
      `)
      .eq('section_id', sectionId);
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async recordAttendance({
    sectionId,
    studentId,
    date,
    status,
    minutesLate,
    notes,
    recordedBy
  }: {
    sectionId: string;
    studentId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    minutesLate?: number;
    notes?: string;
    recordedBy: string;
  }) {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert({
        section_id: sectionId,
        student_id: studentId,
        date,
        status,
        minutes_late: minutesLate,
        notes,
        recorded_by: recordedBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async submitExcuse({
    attendanceId,
    reason,
    documentationUrl
  }: {
    attendanceId: string;
    reason: string;
    documentationUrl?: string;
  }) {
    const { data, error } = await supabase
      .from('attendance_excuses')
      .insert({
        attendance_id: attendanceId,
        reason,
        documentation_url: documentationUrl
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async reviewExcuse({
    excuseId,
    status,
    reviewerId,
    notes
  }: {
    excuseId: string;
    status: 'approved' | 'denied';
    reviewerId: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('attendance_excuses')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewer_notes: notes
      })
      .eq('id', excuseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAttendancePolicy(sectionId: string) {
    const { data, error } = await supabase
      .from('attendance_policies')
      .select('*')
      .eq('section_id', sectionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateAttendancePolicy({
    sectionId,
    attendanceGradeWeight,
    excusedAbsenceLimit,
    consecutiveAbsenceThreshold,
    absencePenaltyPercentage,
    latePenaltyPercentage
  }: {
    sectionId: string;
    attendanceGradeWeight?: number;
    excusedAbsenceLimit?: number;
    consecutiveAbsenceThreshold?: number;
    absencePenaltyPercentage?: number;
    latePenaltyPercentage?: number;
  }) {
    const { data, error } = await supabase
      .from('attendance_policies')
      .upsert({
        section_id: sectionId,
        attendance_grade_weight: attendanceGradeWeight,
        excused_absence_limit: excusedAbsenceLimit,
        consecutive_absence_threshold: consecutiveAbsenceThreshold,
        absence_penalty_percentage: absencePenaltyPercentage,
        late_penalty_percentage: latePenaltyPercentage
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getStudentAttendanceStats(sectionId: string, studentId: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        excuses:attendance_excuses(*)
      `)
      .eq('section_id', sectionId)
      .eq('student_id', studentId);
    
    if (error) throw error;
    return data;
  },

  async bulkRecordAttendance(records: {
    sectionId: string;
    studentId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    minutesLate?: number;
    notes?: string;
    recordedBy: string;
  }[]) {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(records.map(record => ({
        section_id: record.sectionId,
        student_id: record.studentId,
        date: record.date,
        status: record.status,
        minutes_late: record.minutesLate,
        notes: record.notes,
        recorded_by: record.recordedBy
      })))
      .select();
    
    if (error) throw error;
    return data;
  }
};
