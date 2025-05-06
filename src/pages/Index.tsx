
import React, { useState } from 'react';
import AthenaHeader from '@/components/AthenaHeader';
import AthenaSidebar from '@/components/AthenaSidebar';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import AttendanceCard from '@/components/dashboard/AttendanceCard';
import AssignmentsCard from '@/components/dashboard/AssignmentsCard';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import CoursesCard from '@/components/dashboard/CoursesCard';
import UpcomingCard from '@/components/dashboard/UpcomingCard';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Fixed sidebar on larger screens, toggle-able on mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative md:flex ${sidebarOpen ? 'block' : 'hidden md:block'}`}>
        <AthenaSidebar />
      </div>
      
      <div className="flex-1 flex flex-col w-full">
        <AthenaHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto p-4">
          <div className="container py-6 space-y-6 animate-fade-in">
            <WelcomeCard />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AttendanceCard />
              <AssignmentsCard />
              <AIInsightsCard />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CoursesCard />
              <UpcomingCard />
            </div>
            
            {/* Footer */}
            <footer className="mt-auto pt-6 pb-4">
              <div className="text-center text-sm text-muted-foreground">
                <p>Athena • AI-Powered Academic Management • 2025</p>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
