
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { AssignmentManagement } from '@/components/assignments/AssignmentManagement';

export default function AssignmentsPage() {
  const { userProfile } = useAuth();
  const isInstructor = userProfile?.role === 'instructor' || userProfile?.role === 'admin';
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
      </div>
      
      <AssignmentManagement isInstructor={isInstructor} />
    </div>
  );
}
