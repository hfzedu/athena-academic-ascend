
import { useState } from 'react';
import AttendanceManager from '@/components/attendance/AttendanceManager';
import AttendanceRoster from '@/components/attendance/AttendanceRoster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/providers/AuthProvider';

export default function AttendancePage() {
  const { userProfile } = useAuth();
  const isInstructor = userProfile?.role === 'instructor' || userProfile?.role === 'admin';
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
      </div>

      {isInstructor ? (
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="manage">Manage Attendance</TabsTrigger>
            <TabsTrigger value="reports">Attendance Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="manage">
            <AttendanceManager />
          </TabsContent>
          <TabsContent value="reports">
            <AttendanceRoster />
          </TabsContent>
        </Tabs>
      ) : (
        <AttendanceRoster />
      )}
    </div>
  );
}
