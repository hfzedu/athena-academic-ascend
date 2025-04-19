
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService } from '@/services/courseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/providers/AuthProvider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const CourseManagement = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const canManageCourses = profile?.role === 'professor' || profile?.role === 'administrator';

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseService.getCourses()
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, updates }: { courseId: string, updates: any }) =>
      courseService.updateCourse(courseId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update course: ' + error.message);
    }
  });

  if (isLoading) {
    return <div>Loading courses...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses?.map((course: any) => (
              <div key={course.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{course.code} - {course.name}</h3>
                    <p className="text-sm text-muted-foreground">{course.description || 'No description'}</p>
                  </div>
                  {canManageCourses && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Implement edit functionality
                        toast.info('Edit functionality coming soon');
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <Separator className="my-4" />
                <div className="text-sm">
                  <span className="font-medium">Credits:</span> {course.credits}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseManagement;
