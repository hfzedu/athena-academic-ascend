
import { Outlet } from 'react-router-dom';
import { AthenaHeader } from '@/components/AthenaHeader';
import { AthenaSidebar } from '@/components/AthenaSidebar';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AthenaSidebar />
      <div className="flex flex-col flex-1">
        <AthenaHeader />
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4 border-b pb-4">
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
