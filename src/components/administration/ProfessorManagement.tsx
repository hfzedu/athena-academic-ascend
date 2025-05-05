
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Edit, Trash2, Search, User } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/providers/AuthProvider';
import profileService, { ProfileData } from '@/services/profileService';
import departmentService from '@/services/departmentService';
import { toast } from '@/hooks/use-toast';

const ProfessorManagement = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Check if user is admin
  const isAdmin = profile?.role === 'administrator' || profile?.role === 'department_head';

  // Fetch professors
  const {
    data: professors,
    isLoading: loadingProfessors,
  } = useQuery({
    queryKey: ['professors', selectedDepartment],
    queryFn: async () => {
      if (selectedDepartment) {
        return profileService.getProfessorsByDepartment(selectedDepartment);
      }
      return profileService.getProfessors();
    },
  });

  // Fetch departments
  const {
    data: departments,
    isLoading: loadingDepartments,
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

  // Filter professors by search query
  const filteredProfessors = professors?.filter(prof => {
    const fullName = `${prof.first_name} ${prof.last_name}`.toLowerCase();
    const email = prof.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  // Get department name
  const getDepartmentName = (departmentId: string) => {
    const department = departments?.find(d => d.id === departmentId);
    return department ? department.name : 'Not Assigned';
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!isAdmin) {
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
            <CardTitle>Filter Professors</CardTitle>
            <CardDescription>
              Search and filter professors by department
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search professors by name or email"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Professor Management</CardTitle>
              <CardDescription>
                View and manage professor information
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => toast({
              title: "Feature Coming Soon",
              description: "Professor account creation will be available soon."
            })}>
              <Plus className="mr-2 h-4 w-4" />
              Add Professor
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To create professor accounts, use the user management system to register new users and assign the professor role.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Professors</CardTitle>
          <CardDescription>
            All professors in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProfessors ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProfessors && filteredProfessors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfessors.map((professor: any) => (
                  <TableRow key={professor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={professor.avatar_url || ''} alt={`${professor.first_name} ${professor.last_name}`} />
                          <AvatarFallback>{getInitials(professor.first_name, professor.last_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{professor.first_name} {professor.last_name}</p>
                          {professor.title && (
                            <p className="text-xs text-muted-foreground">{professor.title}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{professor.email}</TableCell>
                    <TableCell>{professor.department_id ? getDepartmentName(professor.department_id) : 'Not Assigned'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                        Active
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {filteredProfessors?.length === 0 && professors?.length > 0 ? 
                'No professors match your search criteria.' : 'No professors found in the system.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessorManagement;
