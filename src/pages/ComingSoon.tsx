
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AthenaHeader from '@/components/AthenaHeader';
import AthenaSidebar from '@/components/AthenaSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const ComingSoon = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Convert path to title (e.g., "/ai-chat" -> "AI Chat")
  const pageTitle = location.pathname
    .split('/')
    .filter(Boolean)
    .map(word => word.split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    )
    .join(' ');

  return (
    <div className="min-h-screen flex bg-background">
      <AthenaSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col md:ml-72">
        <AthenaHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <Card className="w-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">{pageTitle}</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  This feature is coming soon! We're working hard to bring you the best experience possible.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComingSoon;
