
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  Users, 
  BarChart2, 
  MessageSquare,
  Brain,
  FileText,
  Layers,
  X
} from 'lucide-react';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isAIPowered?: boolean;
}

interface AthenaSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AthenaSidebar = ({ isOpen, setIsOpen }: AthenaSidebarProps) => {
  const location = useLocation();
  
  const NavItem = ({ icon: Icon, label, href, isAIPowered = false }: NavItemProps) => {
    const isActive = location.pathname === href;
    
    return (
      <Link 
        to={href} 
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
        )}
      >
        <div className="relative">
          {isAIPowered && (
            <div className="absolute -inset-1 rounded-md bg-athena-accent opacity-20 animate-pulse-light"></div>
          )}
          <Icon className={cn("h-5 w-5", isAIPowered && "text-athena-gold")} />
        </div>
        <span>{label}</span>
        {isAIPowered && (
          <span className="ml-auto text-xs font-medium rounded-full bg-sidebar-accent/50 px-1.5 py-0.5">
            AI
          </span>
        )}
      </Link>
    );
  };
  
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 bottom-0 left-0 z-50 w-72 border-r bg-sidebar flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-athena-accent to-athena-gold animate-pulse-light"></div>
              <div className="absolute inset-0.5 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xl font-bold text-white">J</span>
              </div>
            </div>
            <span className="font-semibold text-lg text-white">Jamia Academia</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>
        
        <nav className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            <NavItem icon={Home} label="Dashboard" href="/dashboard" />
            <NavItem icon={BookOpen} label="Courses" href="/courses" />
            <NavItem icon={Calendar} label="Schedule" href="/my-schedule" />
            <NavItem icon={FileText} label="Assignments" href="/assignments" isAIPowered />
            <NavItem icon={Layers} label="Attendance" href="/attendance" isAIPowered />
          </div>
          
          <div className="mt-8">
            <h4 className="px-3 text-xs font-medium uppercase text-sidebar-foreground/60">
              AI Features
            </h4>
            <div className="mt-2 space-y-1">
              <NavItem icon={Brain} label="Learning Assistant" href="/ai-assistant" isAIPowered />
              <NavItem icon={BarChart2} label="Analytics" href="/analytics" isAIPowered />
              <NavItem icon={Users} label="Study Groups" href="/study-groups" isAIPowered />
              <NavItem icon={MessageSquare} label="AI Chat" href="/ai-chat" isAIPowered />
            </div>
          </div>
        </nav>
        
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-athena-gold" />
              <span className="font-medium text-sidebar-foreground">AI Insights</span>
            </div>
            <p className="text-xs text-sidebar-foreground/80">
              Your next assignment is due in 3 days. Based on your schedule, the optimal time to work on it is tomorrow evening.
            </p>
            <Button variant="default" size="sm" className="mt-2 w-full bg-sidebar-primary hover:bg-sidebar-primary/90">
              View Suggestions
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AthenaSidebar;
