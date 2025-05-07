
import { Outlet } from 'react-router-dom';
import Logo from '@/components/Logo';

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 rounded-lg shadow-lg bg-card">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
