
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ArrowRight } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

const WelcomeCard = () => {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  let greeting = "Good morning";
  
  if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon";
  } else if (hour >= 18) {
    greeting = "Good evening";
  }

  return (
    <Card className="bg-gradient-to-br from-athena-primary to-athena-secondary text-white overflow-hidden relative">
      <CardContent className="p-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-1">
              {greeting}, {profile?.first_name || 'User'}!
            </h2>
            <p className="text-white/80">Welcome back to Athena. Here's your learning snapshot.</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">85%</div>
              <div className="text-xs text-white/80">Attendance Rate</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">4</div>
              <div className="text-xs text-white/80">Due Assignments</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">3.8</div>
              <div className="text-xs text-white/80">Current GPA</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button className="bg-white text-athena-primary hover:bg-white/90 flex-1">
              View Schedule
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm flex-1">
              <Brain className="mr-1 h-4 w-4" />
              AI Assistant
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;
