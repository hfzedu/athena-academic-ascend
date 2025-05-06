
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AttendanceRosterProps {
  sectionId: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  avatar?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

const AttendanceRoster = ({ sectionId }: AttendanceRosterProps) => {
  // Mock student data
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'Jessica Parker', studentId: '10023456', status: 'present' },
    { id: '2', name: 'Michael Rodriguez', studentId: '10023457', status: 'present' },
    { id: '3', name: 'Emma Thompson', studentId: '10023458', status: 'absent' },
    { id: '4', name: 'James Wilson', studentId: '10023459', status: 'present' },
    { id: '5', name: 'Sophia Martinez', studentId: '10023460', status: 'late' },
    { id: '6', name: 'Benjamin Taylor', studentId: '10023461', status: 'present' },
    { id: '7', name: 'Isabella Johnson', studentId: '10023462', status: 'present' },
    { id: '8', name: 'Ethan Anderson', studentId: '10023463', status: 'excused', notes: 'Medical appointment' },
    { id: '9', name: 'Olivia Thomas', studentId: '10023464', status: 'present' },
    { id: '10', name: 'William Jackson', studentId: '10023465', status: 'absent' },
    { id: '11', name: 'Charlotte White', studentId: '10023466', status: 'present' },
    { id: '12', name: 'Daniel Harris', studentId: '10023467', status: 'present' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // Filter students based on search query
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId.includes(searchQuery)
  );

  // Update student status
  const updateStudentStatus = (studentId: string, status: Student['status']) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId ? { ...student, status } : student
      )
    );
  };

  // Add note to student
  const addStudentNote = (studentId: string, note: string) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId ? { ...student, notes: note } : student
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or student ID..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <div className="grid grid-cols-12 text-sm font-medium p-3 bg-muted/50 border-b">
          <div className="col-span-5">Student</div>
          <div className="col-span-2">ID</div>
          <div className="col-span-4">Status</div>
          <div className="col-span-1 text-right">Notes</div>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="divide-y">
            {filteredStudents.map(student => (
              <div key={student.id} className="grid grid-cols-12 items-center p-3 hover:bg-muted/30 group">
                <div className="col-span-5 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={student.avatar} alt={student.name} />
                    <AvatarFallback className="text-xs">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{student.name}</span>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">{student.studentId}</div>
                <div className="col-span-4">
                  <RadioGroup 
                    className="flex items-center gap-3" 
                    value={student.status}
                    onValueChange={(value) => updateStudentStatus(student.id, value as Student['status'])}
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="present" id={`present-${student.id}`} className="text-green-500" />
                      <Label htmlFor={`present-${student.id}`} className="text-xs flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />P
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="absent" id={`absent-${student.id}`} className="text-destructive" />
                      <Label htmlFor={`absent-${student.id}`} className="text-xs flex items-center">
                        <X className="h-3 w-3 mr-1 text-destructive" />A
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="late" id={`late-${student.id}`} className="text-amber-500" />
                      <Label htmlFor={`late-${student.id}`} className="text-xs flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-amber-500" />L
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="excused" id={`excused-${student.id}`} className="text-blue-500" />
                      <Label htmlFor={`excused-${student.id}`} className="text-xs flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1 text-blue-500" />E
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="col-span-1 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-1 opacity-50 hover:opacity-100 group-hover:opacity-100"
                    onClick={() => {
                      const note = prompt("Add note for " + student.name, student.notes || "");
                      if (note !== null) {
                        addStudentNote(student.id, note);
                      }
                    }}
                  >
                    {student.notes ? "Edit" : "Add"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            No students found matching your search criteria
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRoster;
