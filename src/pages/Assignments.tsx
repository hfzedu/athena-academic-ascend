
import React, { useState } from 'react';
import AthenaHeader from '@/components/AthenaHeader';
import AthenaSidebar from '@/components/AthenaSidebar';
import AssignmentManagement from '@/components/assignments/AssignmentManagement';
import { useAuth } from '@/providers/AuthProvider';

const Assignments = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <AthenaSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col md:ml-72">
        <AthenaHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <h1 className="text-3xl font-bold tracking-tight mb-6">
              {profile?.role === 'professor' || profile?.role === 'teaching_assistant' 
                ? 'Assignment Management' 
                : 'My Assignments'}
            </h1>
            <AssignmentManagement />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Assignments;
