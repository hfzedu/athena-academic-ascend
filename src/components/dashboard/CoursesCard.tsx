
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: number;
  name: string;
  code: string;
  progress: number;
  grade: string;
  color: string;
}

const CourseItem = ({ course }: { course: Course }) => {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-1">
        <div className={cn("w-2 h-10 rounded-full", `bg-${course.color}-500`)}></div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{course.name}</h4>
            <span className="text-sm font-medium">{course.grade}</span>
          </div>
          <p className="text-xs text-muted-foreground">{course.code}</p>
        </div>
      </div>
      <div className="pl-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium">{course.progress}%</span>
        </div>
        <Progress value={course.progress} className="h-1.5" />
      </div>
    </div>
  );
};

const CoursesCard = () => {
  // Mock data for courses
  const courses: Course[] = [
    {
      id: 1,
      name: 'Data Structures',
      code: 'CS 2100',
      progress: 65,
      grade: 'A-',
      color: 'blue'
    },
    {
      id: 2,
      name: 'Machine Learning',
      code: 'CS 4501',
      progress: 42,
      grade: 'B+',
      color: 'purple'
    },
    {
      id: 3,
      name: 'Computer Networks',
      code: 'CS 3502',
      progress: 78,
      grade: 'A',
      color: 'green'
    },
    {
      id: 4,
      name: 'Database Systems',
      code: 'CS 4750',
      progress: 51,
      grade: 'B',
      color: 'amber'
    }
  ];

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Courses</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">GPA: 3.8</span>
          </div>
        </div>
        <CardDescription>Your enrolled courses and progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {courses.map((course) => (
            <CourseItem key={course.id} course={course} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CoursesCard;
