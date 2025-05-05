import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import departmentService, { Department, DepartmentInput } from '@/services/departmentService';
import { useProtectedApi } from '@/hooks/useProtectedApi';

const formSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must not exceed 10 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
});

type DepartmentFormValues = z.infer<typeof formSchema>;

const DepartmentForm = ({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  initialData?: Department;
  onSubmit: (data: DepartmentFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) => {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      code: "",
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Code</FormLabel>
              <FormControl>
                <Input placeholder="CS" {...field} maxLength={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Name</FormLabel>
              <FormControl>
                <Input placeholder="Computer Science" {...field} maxLength={100} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update" : "Create"} Department
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

const DepartmentManagement = () => {
  const { profile } = useAuth();
  const { callApi } = useProtectedApi();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Check if user has admin privileges
  const isAdmin = profile?.role === 'administrator' || profile?.role === 'department_head';

  // Fetch departments
  const { 
    data: departments, 
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: (department: DepartmentInput) => departmentService.createDepartment(department),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsAddDialogOpen(false);
    },
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentInput }) => 
      departmentService.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
    },
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleteConfirmationId(null);
    },
  });

  const handleCreateSubmit = async (data: DepartmentFormValues) => {
    await callApi(() => createDepartmentMutation.mutateAsync(data), {
      loadingMessage: "Creating department...",
      successMessage: "Department created successfully",
      errorMessage: "Failed to create department",
    });
  };

  const handleEditSubmit = async (data: DepartmentFormValues) => {
    if (!editingDepartment) return;

    await callApi(() => updateDepartmentMutation.mutateAsync({ 
      id: editingDepartment.id, 
      data 
    }), {
      loadingMessage: "Updating department...",
      successMessage: "Department updated successfully",
      errorMessage: "Failed to update department",
    });
  };

  const handleDelete = async (id: string) => {
    await callApi(() => deleteDepartmentMutation.mutateAsync(id), {
      loadingMessage: "Deleting department...",
      successMessage: "Department deleted successfully",
      errorMessage: "Failed to delete department",
    });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to manage departments.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load departments: {(error as Error)?.message || "Unknown error"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Department Management</CardTitle>
            <CardDescription>
              Create, edit, and manage academic departments
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
                <DialogDescription>
                  Add a new academic department to the system.
                </DialogDescription>
              </DialogHeader>
              <DepartmentForm
                onSubmit={handleCreateSubmit}
                isSubmitting={createDepartmentMutation.isPending}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : departments && departments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.code}</TableCell>
                    <TableCell>{department.name}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingDepartment(department);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setDeleteConfirmationId(department.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No departments found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information.
            </DialogDescription>
          </DialogHeader>
          {editingDepartment && (
            <DepartmentForm
              initialData={editingDepartment}
              onSubmit={handleEditSubmit}
              isSubmitting={updateDepartmentMutation.isPending}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingDepartment(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmationId} onOpenChange={(open) => !open && setDeleteConfirmationId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmationId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmationId && handleDelete(deleteConfirmationId)}
              disabled={deleteDepartmentMutation.isPending}
            >
              {deleteDepartmentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
