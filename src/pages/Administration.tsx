
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import DepartmentManagement from '@/components/administration/DepartmentManagement';
import ProfessorManagement from '@/components/administration/ProfessorManagement';
import { useAuth } from '@/providers/AuthProvider';

const Administration = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const { profile, loading } = useAuth();
  
  // Check if user has admin privileges
  const isAdmin = profile?.role === 'administrator' || profile?.role === 'department_head';
  
  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to access the administration area.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Administration</h1>
          <p className="text-muted-foreground">Manage academic departments, staff, and system settings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="professors">Professors</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="departments">
              <DepartmentManagement />
            </TabsContent>
            <TabsContent value="professors">
              <ProfessorManagement />
            </TabsContent>
            <TabsContent value="settings">
              <Card className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-4">System Settings</h2>
                <p className="text-muted-foreground">
                  System settings and configuration options will be available soon.
                </p>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Administration;
