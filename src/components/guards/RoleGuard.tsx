
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

type RoleGuardProps = {
  children?: React.ReactNode;
  allowedRoles: string[];
};

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { userProfile } = useAuth();
  
  // If user doesn't have a profile or role doesn't match, redirect to dashboard
  if (!userProfile || !userProfile.role || !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // User has the required role, render the protected route
  return <>{children || <Outlet />}</>;
}
