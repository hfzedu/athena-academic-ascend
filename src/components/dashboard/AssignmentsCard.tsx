
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

type AssignmentStatus = 'completed' | 'pending' | 'overdue' | 'ai-assisted';

interface Assignment {
  id: number;
  title: string;
  course: string;
  due: string;
  status: AssignmentStatus;
  aiAssisted: boolean;
  completion?: number;
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Completed'
  },
  pending: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'Pending'
  },
  overdue: {
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Overdue'
  },
  'ai-assisted': {
    icon: Brain,
    color: 'text-athena-accent',
    bgColor: 'bg-athena-accent/10',
    label: 'AI Assisted'
  }
};

const AssignmentItem = ({ assignment }: { assignment: Assignment }) => {
  const status = statusConfig[assignment.status];
  const StatusIcon = status.icon;
  
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn("rounded-full p-1.5", status.bgColor)}>
        <StatusIcon className={cn("h-4 w-4", status.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium truncate">{assignment.title}</h4>
          {assignment.aiAssisted && (
            <span className="inline-flex items-center rounded-full bg-athena-accent/10 px-1.5 py-0.5 text-xs font-medium text-athena-accent">
              <Brain className="mr-1 h-3 w-3" />
              AI
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{assignment.course}</p>
      </div>
      <div className="text-xs text-right">
        <span className={cn(
          assignment.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {assignment.due}
        </span>
      </div>
    </div>
  );
};

const AssignmentsCard = () => {
  // Mock data for assignments
  const assignments: Assignment[] = [
    { 
      id: 1, 
      title: 'Neural Networks Project', 
      course: 'Machine Learning',
      due: 'Today',
      status: 'pending',
      aiAssisted: true,
      completion: 75
    },
    { 
      id: 2, 
      title: 'Literature Review', 
      course: 'Advanced Research Methods',
      due: 'Yesterday',
      status: 'overdue',
      aiAssisted: false,
      completion: 50
    },
    { 
      id: 3, 
      title: 'Database Design Quiz', 
      course: 'Database Systems',
      due: '3 days ago',
      status: 'completed',
      aiAssisted: false,
      completion: 100
    },
    { 
      id: 4, 
      title: 'Algorithm Analysis', 
      course: 'Algorithms',
      due: 'Tomorrow',
      status: 'ai-assisted',
      aiAssisted: true,
      completion: 90
    },
  ];

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const overdueCount = assignments.filter(a => a.status === 'overdue').length;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Assignments</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
              {pendingCount} Pending
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                {overdueCount} Overdue
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>Track your course assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {assignments.map((assignment) => (
            <AssignmentItem key={assignment.id} assignment={assignment} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentsCard;
