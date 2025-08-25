-- Row Level Security (RLS) Policies for Academic Management System
-- This migration enables RLS and creates security policies for all tables

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_excuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value FROM profiles WHERE id = user_id;
    RETURN COALESCE(user_role_value, 'student'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is instructor
CREATE OR REPLACE FUNCTION is_instructor(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_id) IN ('instructor', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is enrolled in a section
CREATE OR REPLACE FUNCTION is_enrolled_in_section(user_id UUID, section_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM enrollments 
        WHERE student_id = user_id 
        AND section_id = section_id 
        AND status = 'enrolled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is instructor of a section
CREATE OR REPLACE FUNCTION is_instructor_of_section(user_id UUID, section_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM course_sections 
        WHERE professor_id = user_id 
        AND id = section_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Departments policies
CREATE POLICY "Departments are viewable by all authenticated users" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert departments" ON departments
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update departments" ON departments
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete departments" ON departments
    FOR DELETE USING (is_admin(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Instructors can view student profiles in their sections" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR
        is_admin(auth.uid()) OR
        (
            is_instructor(auth.uid()) AND
            EXISTS (
                SELECT 1 FROM enrollments e
                JOIN course_sections cs ON e.section_id = cs.id
                WHERE e.student_id = profiles.id
                AND cs.professor_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (is_admin(auth.uid()) OR auth.uid() = id);

CREATE POLICY "Only admins can delete profiles" ON profiles
    FOR DELETE USING (is_admin(auth.uid()));

-- Courses policies
CREATE POLICY "Courses are viewable by all authenticated users" ON courses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage courses" ON courses
    FOR ALL USING (is_admin(auth.uid()));

-- Course sections policies
CREATE POLICY "Course sections are viewable by all authenticated users" ON course_sections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and course instructors can manage sections" ON course_sections
    FOR ALL USING (
        is_admin(auth.uid()) OR 
        professor_id = auth.uid()
    );

-- Enrollments policies
CREATE POLICY "Students can view their own enrollments" ON enrollments
    FOR SELECT USING (
        student_id = auth.uid() OR
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

CREATE POLICY "Admins can manage all enrollments" ON enrollments
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Students can enroll themselves" ON enrollments
    FOR INSERT WITH CHECK (
        student_id = auth.uid() OR 
        is_admin(auth.uid())
    );

CREATE POLICY "Students can update their own enrollment status" ON enrollments
    FOR UPDATE USING (
        student_id = auth.uid() OR
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

-- Assignments policies
CREATE POLICY "Assignments viewable by enrolled students and instructors" ON assignments
    FOR SELECT USING (
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), course_section_id) OR
        is_enrolled_in_section(auth.uid(), course_section_id)
    );

CREATE POLICY "Only instructors can manage assignments" ON assignments
    FOR ALL USING (
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), course_section_id)
    );

-- Assignment submissions policies
CREATE POLICY "Students can view their own submissions" ON assignment_submissions
    FOR SELECT USING (
        student_id = auth.uid() OR
        is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN course_sections cs ON a.course_section_id = cs.id
            WHERE a.id = assignment_id
            AND cs.professor_id = auth.uid()
        )
    );

CREATE POLICY "Students can create their own submissions" ON assignment_submissions
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own submissions" ON assignment_submissions
    FOR UPDATE USING (
        student_id = auth.uid() OR
        is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN course_sections cs ON a.course_section_id = cs.id
            WHERE a.id = assignment_id
            AND cs.professor_id = auth.uid()
        )
    );

-- Attendance policies
CREATE POLICY "Attendance policies viewable by section members" ON attendance_policies
    FOR SELECT USING (
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id) OR
        is_enrolled_in_section(auth.uid(), section_id)
    );

CREATE POLICY "Only instructors can manage attendance policies" ON attendance_policies
    FOR ALL USING (
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

-- Attendance records policies
CREATE POLICY "Students can view their own attendance" ON attendance_records
    FOR SELECT USING (
        student_id = auth.uid() OR
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

CREATE POLICY "Only instructors can manage attendance records" ON attendance_records
    FOR ALL USING (
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

-- Attendance excuses policies
CREATE POLICY "Students can view and create their own excuse requests" ON attendance_excuses
    FOR SELECT USING (
        is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM attendance_records ar
            WHERE ar.id = attendance_id
            AND (ar.student_id = auth.uid() OR is_instructor_of_section(auth.uid(), ar.section_id))
        )
    );

CREATE POLICY "Students can create excuse requests" ON attendance_excuses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM attendance_records ar
            WHERE ar.id = attendance_id
            AND ar.student_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can update excuse reviews" ON attendance_excuses
    FOR UPDATE USING (
        is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM attendance_records ar
            WHERE ar.id = attendance_id
            AND is_instructor_of_section(auth.uid(), ar.section_id)
        )
    );

-- Announcements policies
CREATE POLICY "Announcements viewable by section members" ON announcements
    FOR SELECT USING (
        is_admin(auth.uid()) OR
        (section_id IS NULL) OR -- Global announcements
        is_instructor_of_section(auth.uid(), section_id) OR
        is_enrolled_in_section(auth.uid(), section_id)
    );

CREATE POLICY "Only instructors and admins can manage announcements" ON announcements
    FOR ALL USING (
        is_admin(auth.uid()) OR
        (section_id IS NULL AND is_instructor(auth.uid())) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

-- Academic terms policies
CREATE POLICY "Academic terms are viewable by all authenticated users" ON academic_terms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage academic terms" ON academic_terms
    FOR ALL USING (is_admin(auth.uid()));

-- AI chat sessions policies
CREATE POLICY "Users can manage their own AI chat sessions" ON ai_chat_sessions
    FOR ALL USING (user_id = auth.uid());

-- Learning analytics policies
CREATE POLICY "Students can view their own analytics" ON learning_analytics
    FOR SELECT USING (
        student_id = auth.uid() OR
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

CREATE POLICY "Only admins and instructors can insert analytics" ON learning_analytics
    FOR INSERT WITH CHECK (
        is_admin(auth.uid()) OR
        is_instructor_of_section(auth.uid(), section_id)
    );

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_instructor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_enrolled_in_section(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_instructor_of_section(UUID, UUID) TO authenticated;