-- Sample data for AI-Powered Academic Management System
-- This migration inserts sample data for testing and development

-- Insert sample departments
INSERT INTO departments (id, name, code, description) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Computer Science', 'CS', 'Department of Computer Science and Engineering'),
('550e8400-e29b-41d4-a716-446655440002', 'Mathematics', 'MATH', 'Department of Mathematics'),
('550e8400-e29b-41d4-a716-446655440003', 'Physics', 'PHYS', 'Department of Physics'),
('550e8400-e29b-41d4-a716-446655440004', 'Business Administration', 'BUS', 'School of Business Administration');

-- Note: Profiles will be created when users sign up through Supabase Auth
-- This is just a reference for the expected structure

-- Insert sample courses
INSERT INTO courses (id, code, name, description, credits, department_id) VALUES
-- Computer Science courses
('660e8400-e29b-41d4-a716-446655440001', 'CS101', 'Introduction to Programming', 'Basic programming concepts using Python', 3, '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440002', 'CS201', 'Data Structures and Algorithms', 'Fundamental data structures and algorithms', 4, '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440003', 'CS301', 'Database Systems', 'Introduction to database design and management', 3, '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440004', 'CS401', 'Software Engineering', 'Software development methodologies and practices', 4, '550e8400-e29b-41d4-a716-446655440001'),

-- Mathematics courses
('660e8400-e29b-41d4-a716-446655440005', 'MATH101', 'Calculus I', 'Differential calculus with applications', 4, '550e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440006', 'MATH201', 'Calculus II', 'Integral calculus and infinite series', 4, '550e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440007', 'MATH301', 'Linear Algebra', 'Vector spaces, matrices, and linear transformations', 3, '550e8400-e29b-41d4-a716-446655440002'),

-- Physics courses
('660e8400-e29b-41d4-a716-446655440008', 'PHYS101', 'Physics I', 'Mechanics and thermodynamics', 4, '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440009', 'PHYS201', 'Physics II', 'Electricity, magnetism, and optics', 4, '550e8400-e29b-41d4-a716-446655440003'),

-- Business courses
('660e8400-e29b-41d4-a716-446655440010', 'BUS101', 'Introduction to Business', 'Fundamentals of business operations', 3, '550e8400-e29b-41d4-a716-446655440004'),
('660e8400-e29b-41d4-a716-446655440011', 'BUS201', 'Marketing Principles', 'Basic principles of marketing', 3, '550e8400-e29b-41d4-a716-446655440004');

-- Insert sample academic term
INSERT INTO academic_terms (id, name, semester, year, start_date, end_date, registration_start, registration_end, is_current) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'Spring 2024', 'spring', 2024, '2024-01-15', '2024-05-15', '2023-11-01', '2024-01-10', true);

-- Function to create sample course sections (will be called after users are created)
-- This demonstrates the structure for course sections
CREATE OR REPLACE FUNCTION create_sample_sections()
RETURNS void AS $$
DECLARE
    prof_id UUID;
BEGIN
    -- This function should be called after professors are created
    -- For now, we'll just create the structure
    
    -- Get a professor ID (this would be a real professor's UUID in production)
    SELECT id INTO prof_id FROM profiles WHERE role = 'instructor' LIMIT 1;
    
    IF prof_id IS NOT NULL THEN
        -- Insert sample course sections
        INSERT INTO course_sections (id, course_id, section_number, professor_id, semester, year, schedule, location, max_enrollment) VALUES
        ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '001', prof_id, 'spring', 2024, 
         '{"days": ["monday", "wednesday", "friday"], "start_time": "09:00", "end_time": "09:50"}', 'Room 101', 30),
        ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '001', prof_id, 'spring', 2024, 
         '{"days": ["tuesday", "thursday"], "start_time": "10:00", "end_time": "11:30"}', 'Room 102', 25),
        ('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440005', '001', prof_id, 'spring', 2024, 
         '{"days": ["monday", "wednesday", "friday"], "start_time": "11:00", "end_time": "11:50"}', 'Room 201', 35);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create sample assignments (will be called after sections are created)
CREATE OR REPLACE FUNCTION create_sample_assignments()
RETURNS void AS $$
DECLARE
    section_id UUID;
    prof_id UUID;
BEGIN
    -- Get a sample section and professor
    SELECT cs.id, cs.professor_id INTO section_id, prof_id 
    FROM course_sections cs LIMIT 1;
    
    IF section_id IS NOT NULL THEN
        -- Insert sample assignments
        INSERT INTO assignments (id, course_section_id, title, description, instructions, due_date, points_possible, assignment_type, status, created_by) VALUES
        ('990e8400-e29b-41d4-a716-446655440001', section_id, 'Programming Assignment 1', 'Basic Python programming exercises', 
         'Complete the following Python exercises: 1. Hello World program, 2. Simple calculator, 3. Grade calculator', 
         CURRENT_TIMESTAMP + INTERVAL '1 week', 100, 'homework', 'published', prof_id),
        ('990e8400-e29b-41d4-a716-446655440002', section_id, 'Midterm Exam', 'Midterm examination covering chapters 1-5', 
         'Closed book exam. Bring a calculator and pencil.', 
         CURRENT_TIMESTAMP + INTERVAL '3 weeks', 200, 'exam', 'published', prof_id),
        ('990e8400-e29b-41d4-a716-446655440003', section_id, 'Final Project', 'Comprehensive programming project', 
         'Develop a complete application using the concepts learned in class. Project proposal due 2 weeks before final project.', 
         CURRENT_TIMESTAMP + INTERVAL '8 weeks', 300, 'project', 'draft', prof_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create sample attendance policies
CREATE OR REPLACE FUNCTION create_sample_attendance_policies()
RETURNS void AS $$
DECLARE
    section_record RECORD;
BEGIN
    -- Create attendance policies for all sections
    FOR section_record IN SELECT id FROM course_sections LOOP
        INSERT INTO attendance_policies (section_id, attendance_grade_weight, excused_absence_limit, consecutive_absence_threshold, late_penalty_percentage, absence_penalty_percentage)
        VALUES (section_record.id, 10.00, 3, 3, 5.00, 2.00);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create sample announcements
CREATE OR REPLACE FUNCTION create_sample_announcements()
RETURNS void AS $$
DECLARE
    section_id UUID;
    prof_id UUID;
BEGIN
    -- Get a sample section and professor
    SELECT cs.id, cs.professor_id INTO section_id, prof_id 
    FROM course_sections cs LIMIT 1;
    
    IF section_id IS NOT NULL THEN
        -- Insert sample announcements
        INSERT INTO announcements (section_id, title, content, priority, is_pinned, created_by) VALUES
        (section_id, 'Welcome to the Course!', 'Welcome to our course! Please review the syllabus and complete the first assignment by the due date.', 'high', true, prof_id),
        (section_id, 'Office Hours Update', 'My office hours have been updated to Tuesdays and Thursdays from 2-4 PM in Room 205.', 'normal', false, prof_id),
        (NULL, 'Campus-wide Announcement', 'The library will be closed for maintenance this weekend. Please plan accordingly.', 'normal', false, prof_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add prerequisites to some courses
UPDATE courses SET prerequisites = ARRAY['CS101'] WHERE code = 'CS201';
UPDATE courses SET prerequisites = ARRAY['CS201'] WHERE code = 'CS301';
UPDATE courses SET prerequisites = ARRAY['CS201', 'CS301'] WHERE code = 'CS401';
UPDATE courses SET prerequisites = ARRAY['MATH101'] WHERE code = 'MATH201';
UPDATE courses SET prerequisites = ARRAY['MATH101', 'MATH201'] WHERE code = 'MATH301';
UPDATE courses SET prerequisites = ARRAY['MATH101'] WHERE code = 'PHYS101';
UPDATE courses SET prerequisites = ARRAY['PHYS101'] WHERE code = 'PHYS201';

-- Note: The sample creation functions above should be called after users are created
-- They demonstrate the expected data structure and relationships