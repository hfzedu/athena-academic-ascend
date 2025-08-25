
import React from 'react';
import { Settings, Search, Menu, LogOut, UserPlus, BookPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import NotificationBell from '@/components/common/NotificationBell';

interface AthenaHeaderProps {
  toggleSidebar?: () => void;
}

const AthenaHeader = ({ toggleSidebar }: AthenaHeaderProps) => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const userName = userProfile ? 
    `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'User' : 
    'User';

  const userInitials = userProfile ? 
    `${userProfile.firstName?.[0] || ''}${userProfile.lastName?.[0] || ''}`.toUpperCase() : 
    'JA';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 backdrop-blur px-4">
      <div className="flex items-center gap-2 lg:gap-4">
        {toggleSidebar && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="hidden font-semibold text-lg md:inline-block">
            <span className="text-gradient">Jamia Academia</span>
          </span>
        </div>
      </div>
      
      <div className="relative hidden md:block max-w-md w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search courses, assignments, resources..."
          className="pl-8 w-full bg-background"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <NotificationBell />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage src={userProfile?.avatarUrl || ''} alt={userName} />
              <AvatarFallback className="bg-gradient-to-r from-athena-primary to-athena-secondary text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userProfile?.email || ''}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => navigate('/courses')}>
              <BookPlus className="h-4 w-4" />
              <span>Add Course</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => navigate('/assignments')}>
              <FileText className="h-4 w-4" />
              <span>Add Assignment</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AthenaHeader;

export { AthenaHeader };
