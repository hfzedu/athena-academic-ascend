
import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import assignmentService, { AssignmentInput } from '@/services/assignmentService';
import { format } from 'date-fns';

const AssignmentManagement = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [formValues, setFormValues] = useState<AssignmentInput>({
    title: '',
    description: '',
    due_date: '',
    course_section_id: ''
  });

  const isTeacher = profile?.role === 'professor' || profile?.role === 'teaching_assistant';

  // Fetch assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: assignmentService.getAssignments
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: assignmentService.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      resetForm();
      setIsDialogOpen(false);
    }
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<AssignmentInput> }) =>
      assignmentService.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      resetForm();
      setIsDialogOpen(false);
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: assignmentService.deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    }
  });

  const resetForm = () => {
    setFormValues({
      title: '',
      description: '',
      due_date: '',
      course_section_id: ''
    });
    setSelectedAssignment(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setFormValues({
      title: assignment.title,
      description: assignment.description || '',
      due_date: assignment.due_date,
      course_section_id: assignment.course_section_id
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      deleteAssignmentMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAssignment) {
      updateAssignmentMutation.mutate({
        id: selectedAssignment.id,
        data: formValues
      });
    } else {
      createAssignmentMutation.mutate(formValues);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Assignment Management</h2>
        {isTeacher && (
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedAssignment ? 'Edit Assignment' : 'Add New Assignment'}
                </DialogTitle>
                <DialogDescription>
                  Fill out the form below to {selectedAssignment ? 'update the' : 'create a new'} assignment.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="title" className="text-right">
                      Title
                    </label>
                    <Input
                      id="title"
                      name="title"
                      value={formValues.title}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="description" className="text-right">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formValues.description}
                      onChange={handleInputChange}
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="due_date" className="text-right">
                      Due Date
                    </label>
                    <Input
                      id="due_date"
                      name="due_date"
                      type="datetime-local"
                      value={formValues.due_date}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
                  >
                    {(createAssignmentMutation.isPending || updateAssignmentMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {selectedAssignment ? 'Update' : 'Create'} Assignment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>
            View and manage all available assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : assignments && assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Description</TableHead>
                  {isTeacher && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell>
                      {assignment.course_section?.course?.code} - {assignment.course_section?.section_number}
                    </TableCell>
                    <TableCell>{format(new Date(assignment.due_date), 'PPp')}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {assignment.description || '-'}
                    </TableCell>
                    {isTeacher && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditAssignment(assignment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            disabled={deleteAssignmentMutation.isPending}
                          >
                            {deleteAssignmentMutation.isPending && deleteAssignmentMutation.variables === assignment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No assignments found. {isTeacher && "Click 'Add Assignment' to create one."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignmentManagement;
