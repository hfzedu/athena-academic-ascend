
import { useState } from 'react';
import { StudentManagement } from '@/components/students/StudentManagement';

export default function StudentsListPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Students</h1>
      <StudentManagement />
    </div>
  );
}
