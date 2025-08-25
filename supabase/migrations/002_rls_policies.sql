-- Row Level Security Policies for Academic Management System

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Departments policies
CREATE POLICY "Anyone can view departments" ON departments
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify departments" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Terms policies
CREATE POLICY "Anyone can view terms" ON terms
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify terms" ON terms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Courses policies
CREATE POLICY "Anyone can view courses" ON courses
    FOR SELECT USING (true);

CREATE POLICY "Only admins and instructors can modify courses" ON courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Course sections policies
CREATE POLICY "Anyone can view course sections" ON course_sections
    FOR SELECT USING (true);

CREATE POLICY "Instructors can view their own sections" ON course_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'instructor'
        )
    );

CREATE POLICY "Only admins and instructors can modify sections" ON course_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Enrollments policies
CREATE POLICY "Students can view their own enrollments" ON enrollments
    FOR SELECT USING (
        student_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can view enrollments in their sections" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_sections cs
            JOIN profiles p ON cs.instructor_id = p.id
            WHERE cs.id = enrollments.section_id 
            AND p.user_id = auth.uid() 
            AND p.role = 'instructor'
        )
    );

CREATE POLICY "Admins can view all enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins and instructors can modify enrollments" ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Assignments policies
CREATE POLICY "Anyone can view assignments" ON assignments
    FOR SELECT USING (true);

CREATE POLICY "Only instructors and admins can modify assignments" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Assignment submissions policies
CREATE POLICY "Students can view their own submissions" ON assignment_submissions
    FOR SELECT USING (
        student_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can view submissions for their assignments" ON assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN course_sections cs ON a.section_id = cs.id
            JOIN profiles p ON cs.instructor_id = p.id
            WHERE a.id = assignment_submissions.assignment_id 
            AND p.user_id = auth.uid() 
            AND p.role = 'instructor'
        )
    );

CREATE POLICY "Admins can view all submissions" ON assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Students can create their own submissions" ON assignment_submissions
    FOR INSERT WITH CHECK (
        student_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Only instructors and admins can grade submissions" ON assignment_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Attendance records policies
CREATE POLICY "Students can view their own attendance" ON attendance_records
    FOR SELECT USING (
        student_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can view attendance for their sections" ON attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_sections cs
            JOIN profiles p ON cs.instructor_id = p.id
            WHERE cs.id = attendance_records.section_id 
            AND p.user_id = auth.uid() 
            AND p.role = 'instructor'
        )
    );

CREATE POLICY "Admins can view all attendance" ON attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only instructors and admins can modify attendance" ON attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Attendance excuses policies
CREATE POLICY "Students can view their own excuses" ON attendance_excuses
    FOR SELECT USING (
        attendance_id IN (
            SELECT ar.id FROM attendance_records ar
            JOIN profiles p ON ar.student_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can view excuses for their sections" ON attendance_excuses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM attendance_records ar
            JOIN course_sections cs ON ar.section_id = cs.id
            JOIN profiles p ON cs.instructor_id = p.id
            WHERE ar.id = attendance_excuses.attendance_id 
            AND p.user_id = auth.uid() 
            AND p.role = 'instructor'
        )
    );

CREATE POLICY "Students can create excuses for their attendance" ON attendance_excuses
    FOR INSERT WITH CHECK (
        attendance_id IN (
            SELECT ar.id FROM attendance_records ar
            JOIN profiles p ON ar.student_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Only instructors and admins can review excuses" ON attendance_excuses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Announcements policies
CREATE POLICY "Anyone can view announcements" ON announcements
    FOR SELECT USING (true);

CREATE POLICY "Only instructors and admins can create announcements" ON announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

CREATE POLICY "Only instructors and admins can modify announcements" ON announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        user_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        user_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create notifications for users" ON notifications
    FOR INSERT WITH CHECK (true);

-- AI interactions policies
CREATE POLICY "Users can view their own AI interactions" ON ai_interactions
    FOR SELECT USING (
        user_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own AI interactions" ON ai_interactions
    FOR INSERT WITH CHECK (
        user_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all AI interactions" ON ai_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);