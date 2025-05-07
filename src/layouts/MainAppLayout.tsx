
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AthenaHeader } from '@/components/AthenaHeader';
import { AthenaSidebar } from '@/components/AthenaSidebar';

export default function MainAppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AthenaSidebar />
      <div className="flex flex-col flex-1">
        <AthenaHeader />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </div>
  );
}
