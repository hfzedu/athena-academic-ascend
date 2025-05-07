
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseManagement } from '@/components/courses/CourseManagement';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export default function CoursesListPage() {
  const { userProfile } = useAuth();
  const isInstructor = userProfile?.role === 'instructor' || userProfile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        
        {isInstructor && (
          <Button asChild>
            <Link to="/admin/courses">
              <Plus className="mr-2 h-4 w-4" /> Add Course
            </Link>
          </Button>
        )}
      </div>
      
      <CourseManagement isAdmin={isInstructor} />
    </div>
  );
}
