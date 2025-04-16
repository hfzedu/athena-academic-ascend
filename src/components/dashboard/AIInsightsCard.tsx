
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Clock, BookOpen } from 'lucide-react';

interface InsightProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const Insight = ({ icon: Icon, title, description }: InsightProps) => {
  return (
    <div className="flex gap-3 items-start p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="rounded-full bg-primary/10 p-2 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

const AIInsightsCard = () => {
  // Mock data for AI insights
  const insights = [
    {
      icon: TrendingUp,
      title: 'Performance Prediction',
      description: 'You\'re on track to improve your GPA by 0.3 points this semester based on current performance.'
    },
    {
      icon: Clock,
      title: 'Time Management',
      description: 'Allocating 2 more hours to Database Systems could improve your upcoming test score by 15%.'
    },
    {
      icon: BookOpen,
      title: 'Learning Pattern',
      description: 'You perform best when studying in 25-minute intervals with short breaks between sessions.'
    }
  ];

  return (
    <Card className="card-hover relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full -z-10"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-athena-accent/10 to-transparent rounded-tr-full -z-10"></div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="ai-pulse rounded-lg">
            <div className="p-1 bg-card rounded-lg">
              <Brain className="h-5 w-5 text-athena-accent" />
            </div>
          </div>
          <CardTitle className="text-lg font-semibold">AI Insights</CardTitle>
        </div>
        <CardDescription>Personalized insights powered by AI</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {insights.map((insight, index) => (
            <Insight 
              key={index}
              icon={insight.icon}
              title={insight.title}
              description={insight.description}
            />
          ))}
        </div>
        <Button className="mt-4 w-full bg-gradient-to-r from-athena-primary to-athena-accent hover:opacity-90">
          <Brain className="mr-2 h-4 w-4" />
          Get More Insights
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIInsightsCard;
