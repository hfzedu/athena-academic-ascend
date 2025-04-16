
import React, { useState } from 'react';
import AthenaHeader from '@/components/AthenaHeader';
import AthenaSidebar from '@/components/AthenaSidebar';
import AttendanceManager from '@/components/attendance/AttendanceManager';

const Attendance = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <AthenaSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col md:ml-72">
        <AthenaHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="container py-6 space-y-6 animate-fade-in">
            <AttendanceManager />
            
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

export default Attendance;
