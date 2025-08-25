-- Initial schema for AI-Powered Academic Management System
-- This migration creates the core tables and their relationships

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE semester_type AS ENUM ('fall', 'spring', 'summer', 'winter');
CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'dropped', 'withdrawn', 'completed');

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    head_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    student_id VARCHAR(20) UNIQUE, -- Only for students
    employee_id VARCHAR(20) UNIQUE, -- Only for staff/instructors
    department_id UUID REFERENCES departments(id),
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_student_id CHECK (
        (role = 'student' AND student_id IS NOT NULL) OR 
        (role != 'student' AND student_id IS NULL)
    ),
    CONSTRAINT check_employee_id CHECK (
        (role IN ('instructor', 'admin') AND employee_id IS NOT NULL) OR 
        (role = 'student' AND employee_id IS NULL)
    )
);

-- Add foreign key constraint for department head
ALTER TABLE departments 
ADD CONSTRAINT departments_head_id_fkey 
FOREIGN KEY (head_id) REFERENCES profiles(id);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL CHECK (credits > 0),
    department_id UUID NOT NULL REFERENCES departments(id),
    prerequisites TEXT[], -- Array of course codes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, department_id)
);

-- Course sections table
CREATE TABLE IF NOT EXISTS course_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_number VARCHAR(10) NOT NULL,
    professor_id UUID NOT NULL REFERENCES profiles(id),
    semester semester_type NOT NULL,
    year INTEGER NOT NULL CHECK (year > 2000),
    schedule JSONB NOT NULL, -- {days: ['mon', 'wed'], start_time: '09:00', end_time: '10:30'}
    location VARCHAR(255) NOT NULL,
    max_enrollment INTEGER NOT NULL CHECK (max_enrollment > 0),
    current_enrollment INTEGER DEFAULT 0 CHECK (current_enrollment >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, section_number, semester, year),
    CONSTRAINT check_enrollment_limit CHECK (current_enrollment <= max_enrollment)
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id),
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status enrollment_status DEFAULT 'enrolled',
    grade VARCHAR(2), -- A+, A, A-, B+, etc.
    grade_points DECIMAL(3,2), -- 4.00, 3.67, etc.
    final_percentage DECIMAL(5,2), -- 0.00 to 100.00
    is_audit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, section_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    points_possible INTEGER NOT NULL CHECK (points_possible > 0),
    assignment_type VARCHAR(50) NOT NULL, -- homework, quiz, exam, project, etc.
    status assignment_status DEFAULT 'draft',
    allow_late_submission BOOLEAN DEFAULT FALSE,
    late_penalty_percentage DECIMAL(5,2) DEFAULT 0,
    rubric JSONB, -- Grading rubric in JSON format
    attachments JSONB, -- Array of file URLs/metadata
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    submission_text TEXT,
    attachments JSONB, -- Array of file URLs/metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_earned DECIMAL(5,2),
    feedback TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    graded_by UUID REFERENCES profiles(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- Attendance policies table
CREATE TABLE IF NOT EXISTS attendance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE UNIQUE,
    attendance_grade_weight DECIMAL(5,2) DEFAULT 0, -- Percentage of final grade
    excused_absence_limit INTEGER DEFAULT 3,
    consecutive_absence_threshold INTEGER DEFAULT 3, -- Alert threshold
    late_penalty_percentage DECIMAL(5,2) DEFAULT 0,
    absence_penalty_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    minutes_late INTEGER DEFAULT 0 CHECK (minutes_late >= 0),
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(section_id, student_id, date)
);

-- Attendance excuses table
CREATE TABLE IF NOT EXISTS attendance_excuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    documentation_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, denied
    reviewed_by UUID REFERENCES profiles(id),
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES course_sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic terms table
CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    semester semester_type NOT NULL,
    year INTEGER NOT NULL CHECK (year > 2000),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start DATE NOT NULL,
    registration_end DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(semester, year),
    CONSTRAINT check_dates CHECK (start_date < end_date AND registration_start < registration_end)
);

-- AI chat sessions table for AI-powered features
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(255),
    context_type VARCHAR(50), -- course, assignment, general, etc.
    context_id UUID, -- Related course/assignment ID
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning analytics table
CREATE TABLE IF NOT EXISTS learning_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id),
    section_id UUID NOT NULL REFERENCES course_sections(id),
    metric_type VARCHAR(50) NOT NULL, -- engagement, performance, attendance_rate, etc.
    metric_value DECIMAL(10,2) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department_id ON profiles(department_id);
CREATE INDEX idx_profiles_student_id ON profiles(student_id);
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id);

CREATE INDEX idx_courses_department_id ON courses(department_id);
CREATE INDEX idx_courses_code ON courses(code);

CREATE INDEX idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX idx_course_sections_professor_id ON course_sections(professor_id);
CREATE INDEX idx_course_sections_semester_year ON course_sections(semester, year);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_section_id ON enrollments(section_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

CREATE INDEX idx_assignments_course_section_id ON assignments(course_section_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);

CREATE INDEX idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);

CREATE INDEX idx_attendance_records_section_id ON attendance_records(section_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(date);

CREATE INDEX idx_announcements_section_id ON announcements(section_id);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);

CREATE INDEX idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_learning_analytics_student_id ON learning_analytics(student_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_sections_updated_at BEFORE UPDATE ON course_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_policies_updated_at BEFORE UPDATE ON attendance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_excuses_updated_at BEFORE UPDATE ON attendance_excuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_terms_updated_at BEFORE UPDATE ON academic_terms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update enrollment count
CREATE OR REPLACE FUNCTION update_section_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE course_sections 
        SET current_enrollment = current_enrollment + 1 
        WHERE id = NEW.section_id AND NEW.status = 'enrolled';
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status != NEW.status THEN
            IF OLD.status = 'enrolled' AND NEW.status != 'enrolled' THEN
                UPDATE course_sections 
                SET current_enrollment = current_enrollment - 1 
                WHERE id = NEW.section_id;
            ELSIF OLD.status != 'enrolled' AND NEW.status = 'enrolled' THEN
                UPDATE course_sections 
                SET current_enrollment = current_enrollment + 1 
                WHERE id = NEW.section_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'enrolled' THEN
            UPDATE course_sections 
            SET current_enrollment = current_enrollment - 1 
            WHERE id = OLD.section_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for enrollment count
CREATE TRIGGER enrollment_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_section_enrollment_count();