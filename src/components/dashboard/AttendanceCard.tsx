
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, X, AlertTriangle, Calendar } from 'lucide-react';

const AttendanceCard = () => {
  // Mock data for attendance
  const attendanceData = {
    overall: 85,
    courses: [
      { id: 1, name: 'Data Structures', present: 12, total: 14 },
      { id: 2, name: 'Machine Learning', present: 11, total: 14 },
      { id: 3, name: 'Computer Networks', present: 13, total: 14 },
    ],
    upcoming: { name: 'Algorithms', time: '10:00 AM', location: 'Room 302' }
  };

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Attendance</CardTitle>
          <div className="flex items-center text-sm font-medium">
            <span className="text-green-500">{attendanceData.overall}%</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span>Overall</span>
          </div>
        </div>
        <CardDescription>Your attendance metrics and next class</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {attendanceData.courses.map(course => (
            <div key={course.id}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{course.name}</span>
                <span className="text-sm text-muted-foreground">
                  {course.present}/{course.total} classes
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Progress
                  value={(course.present / course.total) * 100}
                  className="h-2"
                />
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-green-500">{course.present}</span>
                  <X className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-medium text-destructive">{course.total - course.present}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-1.5">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Next: {attendanceData.upcoming.name}</h4>
                <p className="text-xs text-muted-foreground">Today at {attendanceData.upcoming.time} • {attendanceData.upcoming.location}</p>
              </div>
              
              {attendanceData.overall < 75 && (
                <div className="ml-auto rounded-full bg-amber-500/10 p-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCard;
