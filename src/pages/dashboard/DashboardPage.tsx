
import { useAuth } from '@/providers/AuthProvider';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import CoursesCard from '@/components/dashboard/CoursesCard';
import AssignmentsCard from '@/components/dashboard/AssignmentsCard';
import AttendanceCard from '@/components/dashboard/AttendanceCard';
import UpcomingCard from '@/components/dashboard/UpcomingCard';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';

export default function DashboardPage() {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WelcomeCard className="col-span-full md:col-span-2" />
        
        <CoursesCard />
        <AssignmentsCard />
        <AttendanceCard />
        
        <UpcomingCard className="lg:col-span-2" />
        <AIInsightsCard className="md:col-span-2 lg:col-span-1" />
      </div>
    </div>
  );
}
