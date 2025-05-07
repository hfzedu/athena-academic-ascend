
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/providers/AuthProvider';

export default function InstructorGradebookPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    // Simulate API call to fetch gradebook data
    const fetchData = async () => {
      setIsLoading(true);
      // In a real app, fetch course, students, and assignment data
      setTimeout(() => {
        setCourse({
          id: courseId,
          code: 'CS101',
          title: 'Introduction to Computer Science',
        });
        setStudents([
          { id: 1, name: 'Alice Johnson', grades: { 'assignment1': 85, 'assignment2': 92, 'midterm': 88 } },
          { id: 2, name: 'Bob Smith', grades: { 'assignment1': 78, 'assignment2': 84, 'midterm': 76 } },
          { id: 3, name: 'Charlie Brown', grades: { 'assignment1': 92, 'assignment2': 88, 'midterm': 95 } },
          { id: 4, name: 'Diana Prince', grades: { 'assignment1': 95, 'assignment2': 90, 'midterm': 91 } },
        ]);
        setAssignments([
          { id: 'assignment1', name: 'Assignment 1', maxPoints: 100, weight: 15 },
          { id: 'assignment2', name: 'Assignment 2', maxPoints: 100, weight: 15 },
          { id: 'midterm', name: 'Midterm Exam', maxPoints: 100, weight: 30 },
        ]);
        setIsLoading(false);
      }, 1000);
    };
    
    fetchData();
  }, [courseId, user]);
  
  const calculateGradeTotal = (grades: Record<string, number>) => {
    return assignments.reduce((total, assignment) => {
      const grade = grades[assignment.id] || 0;
      const weightedGrade = (grade / assignment.maxPoints) * assignment.weight;
      return total + weightedGrade;
    }, 0);
  };
  
  const handleGradeChange = (studentId: number, assignmentId: string, value: string) => {
    // Update the grades in state
    const numValue = parseInt(value, 10) || 0;
    setStudents(students.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          grades: {
            ...student.grades,
            [assignmentId]: numValue
          }
        };
      }
      return student;
    }));
  };
  
  const handleSaveGrades = () => {
    console.log("Saving grades:", students);
    // In a real app, send updated grades to the server
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-full max-w-sm" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Gradebook</h1>
        <p className="text-muted-foreground">
          {course.code} - {course.title}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
          <CardDescription>
            Enter and manage grades for all assignments. Click Save when finished.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Student</TableHead>
                  {assignments.map(assignment => (
                    <TableHead key={assignment.id}>
                      {assignment.name} ({assignment.weight}%)
                    </TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 bg-card font-medium">
                      {student.name}
                    </TableCell>
                    {assignments.map(assignment => (
                      <TableCell key={`${student.id}-${assignment.id}`}>
                        <Input
                          type="number"
                          min="0"
                          max={assignment.maxPoints}
                          value={student.grades[assignment.id] || ''}
                          onChange={(e) => handleGradeChange(
                            student.id, 
                            assignment.id, 
                            e.target.value
                          )}
                          className="w-20"
                        />
                        <span className="text-xs text-muted-foreground ml-2">
                          /{assignment.maxPoints}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="font-medium">
                      {calculateGradeTotal(student.grades).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveGrades}>
              Save Grades
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
