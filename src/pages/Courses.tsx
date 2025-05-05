
import React, { useState } from 'react';
import AthenaHeader from '@/components/AthenaHeader';
import AthenaSidebar from '@/components/AthenaSidebar';
import CourseManagement from '@/components/courses/CourseManagement';

const Courses = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <AthenaSidebar />
      
      <div className="flex-1 flex flex-col md:ml-72">
        <AthenaHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <CourseManagement />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Courses;
