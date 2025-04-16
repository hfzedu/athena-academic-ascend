
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Event {
  id: number;
  title: string;
  type: 'class' | 'exam' | 'meeting';
  time: string;
  location: string;
}

const eventTypeConfig = {
  class: {
    color: 'bg-blue-500',
    label: 'Class'
  },
  exam: {
    color: 'bg-red-500',
    label: 'Exam'
  },
  meeting: {
    color: 'bg-green-500',
    label: 'Meeting'
  }
};

const EventItem = ({ event }: { event: Event }) => {
  const typeConfig = eventTypeConfig[event.type];
  
  return (
    <div className="flex gap-3 items-center py-3">
      <div className="flex flex-col items-center">
        <div className="text-xs font-medium text-muted-foreground">{event.time.split(' ')[0]}</div>
        <div className="text-sm font-bold">{event.time.split(' ')[1]}</div>
      </div>
      <div className={cn("w-2 h-full self-stretch rounded-full", typeConfig.color)}></div>
      <div className="flex-1">
        <h4 className="text-sm font-medium">{event.title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{event.time}</span>
          <span>•</span>
          <span>{event.location}</span>
        </div>
      </div>
    </div>
  );
};

const UpcomingCard = () => {
  // Mock data for upcoming events
  const events: Event[] = [
    {
      id: 1,
      title: 'Advanced Algorithms',
      type: 'class',
      time: 'Today 10:00 AM',
      location: 'Room 302'
    },
    {
      id: 2,
      title: 'Machine Learning Midterm',
      type: 'exam',
      time: 'Today 2:00 PM',
      location: 'Hall B'
    },
    {
      id: 3,
      title: 'Study Group - Databases',
      type: 'meeting',
      time: 'Tomorrow 11:30 AM',
      location: 'Library'
    },
    {
      id: 4,
      title: 'Computer Networks',
      type: 'class',
      time: 'Tomorrow 2:00 PM',
      location: 'Room 105'
    }
  ];

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Upcoming</CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">Next 48 hours</div>
        </div>
        <CardDescription>Your upcoming classes and events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 divide-y">
          {events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingCard;
