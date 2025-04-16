
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
  }
};
