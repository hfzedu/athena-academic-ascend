
import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Edit, Trash2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProtectedApi } from '@/hooks/useProtectedApi';
import { supabase } from '@/integrations/supabase/client';

const StudentManagement = () => {
  const { profile } = useAuth();
  const { callApi } = useProtectedApi();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is professor
  const isProfessor = profile?.role === 'professor' || profile?.role === 'teaching_assistant';

  // Fetch sections taught by the professor
  const { data: sections, isLoading: loadingSections } = useQuery({
    queryKey: ['professor-sections', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('course_sections')
        .select(`
          id, 
          section_number, 
          course:courses(id, name, code)
        `)
        .eq('professor_id', profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id && isProfessor
  });

  // Fetch students enrolled in the selected section
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['section-enrollments', selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          student:profiles(id, first_name, last_name, email)
        `)
        .eq('section_id', selectedSection);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection
  });

  // Filter students by search query
  const filteredEnrollments = enrollments?.filter(enrollment => {
    const student = enrollment.student;
    if (!student) return false;
    
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const email = student.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);
      if (error) throw error;
      return enrollmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-enrollments', selectedSection] });
      toast.success('Student removed successfully');
    }
  });

  const handleRemoveStudent = async (enrollmentId: string) => {
    if (confirm('Are you sure you want to remove this student from the course?')) {
      await callApi(() => removeStudentMutation.mutateAsync(enrollmentId), {
        loadingMessage: 'Removing student...',
        successMessage: 'Student removed successfully',
        errorMessage: 'Failed to remove student'
      });
    }
  };

  // Add student form state
  const [studentEmail, setStudentEmail] = useState('');
  
  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async ({ email, sectionId }: { email: string, sectionId: string }) => {
      // First, find the student by email
      const { data: student, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .eq('role', 'student')
        .single();
      
      if (findError) {
        if (findError.code === 'PGRST116')
          throw new Error(`No student found with email ${email}`);
        throw findError;
      }
      
      // Check if student is already enrolled
      const { data: existing, error: checkError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', student.id)
        .eq('section_id', sectionId);
      
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        throw new Error('Student is already enrolled in this course');
      }
      
      // Add the enrollment
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: student.id,
          section_id: sectionId,
          status: 'enrolled'
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-enrollments', selectedSection] });
      setStudentEmail('');
      setIsDialogOpen(false);
      toast.success('Student added successfully');
    }
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim() || !selectedSection) {
      toast.error('Please enter a valid email and select a course section');
      return;
    }

    await callApi(() => addStudentMutation.mutateAsync({
      email: studentEmail.trim(),
      sectionId: selectedSection
    }), {
      loadingMessage: 'Adding student...',
      successMessage: 'Student added successfully',
      errorMessage: 'Failed to add student'
    });
  };

  if (!isProfessor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Course Section</CardTitle>
            <CardDescription>
              Choose a section to view enrolled students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSections ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Select 
                value={selectedSection} 
                onValueChange={setSelectedSection}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course section" />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((section: any) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.course?.code} - Section {section.section_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>
                Add or remove students from the selected course
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedSection}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Student to Course</DialogTitle>
                  <DialogDescription>
                    Enter the email of the student you want to add to this course section.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddStudent}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="studentEmail" className="text-right">
                        Student Email
                      </label>
                      <Input
                        id="studentEmail"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="student@example.com"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addStudentMutation.isPending}>
                      {addStudentMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Student
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {selectedSection && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name or email"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedSection && (
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
            <CardDescription>
              Students currently enrolled in this course section
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEnrollments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEnrollments && filteredEnrollments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.student.first_name} {enrollment.student.last_name}
                      </TableCell>
                      <TableCell>{enrollment.student.email}</TableCell>
                      <TableCell className="capitalize">{enrollment.status}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveStudent(enrollment.id)}
                          disabled={removeStudentMutation.isPending}
                        >
                          {removeStudentMutation.isPending && 
                           removeStudentMutation.variables === enrollment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {filteredEnrollments?.length === 0 && enrollments?.length > 0 ? 
                  'No students match your search criteria.' : 'No students enrolled in this course section.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentManagement;
