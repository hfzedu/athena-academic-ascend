
import React from 'react';
import { Bell, Settings, User, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AthenaHeaderProps {
  toggleSidebar: () => void;
}

const AthenaHeader = ({ toggleSidebar }: AthenaHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 backdrop-blur px-4">
      <div className="flex items-center gap-2 lg:gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-athena-primary to-athena-accent animate-pulse-light"></div>
            <div className="absolute inset-0.5 rounded-full bg-card flex items-center justify-center">
              <span className="text-xl font-bold text-athena-primary">A</span>
            </div>
          </div>
          <span className="hidden font-semibold text-lg md:inline-block">
            <span className="text-gradient">Athena</span>
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-athena-accent"></span>
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src="" alt="User" />
          <AvatarFallback className="bg-gradient-to-r from-athena-primary to-athena-secondary text-white">JS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default AthenaHeader;
