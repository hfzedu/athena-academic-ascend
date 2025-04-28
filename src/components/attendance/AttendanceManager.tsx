
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Download, Save, Edit, Plus } from 'lucide-react';
import AttendanceRoster from './AttendanceRoster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const AttendanceManager = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  // Mock data for courses and sections
  const [courses, setCourses] = useState([
    { id: 'cs101', name: 'Introduction to Computer Science' },
    { id: 'cs201', name: 'Data Structures' },
    { id: 'cs301', name: 'Algorithms' },
    { id: 'math202', name: 'Linear Algebra' },
  ]);

  const [sections, setSections] = useState([
    { id: 'sec1', courseId: 'cs101', name: 'Section A - Mon/Wed 10:00 AM' },
    { id: 'sec2', courseId: 'cs101', name: 'Section B - Tue/Thu 2:00 PM' },
    { id: 'sec3', courseId: 'cs201', name: 'Section A - Mon/Wed 1:00 PM' },
    { id: 'sec4', courseId: 'cs301', name: 'Section A - Tue/Thu 9:00 AM' },
    { id: 'sec5', courseId: 'math202', name: 'Section A - Mon/Wed/Fri 3:00 PM' },
  ]);

  const editCourseForm = useForm({
    defaultValues: {
      name: '',
      code: '',
    }
  });

  const addCourseForm = useForm({
    defaultValues: {
      name: '',
      code: '',
      sectionName: '',
      schedule: '',
    }
  });

  // Filter sections based on selected course
  const filteredSections = sections.filter(section => section.courseId === selectedCourse);

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    editCourseForm.reset({
      name: course.name,
      code: course.id,
    });
    setIsEditCourseOpen(true);
  };

  const handleAddCourse = () => {
    addCourseForm.reset();
    setIsAddCourseOpen(true);
  };

  const onSubmitEditCourse = (data: any) => {
    setCourses(prevCourses => 
      prevCourses.map(course => 
        course.id === editingCourse.id ? { ...course, name: data.name, id: data.code } : course
      )
    );
    
    // Update course ID in sections if changed
    if (data.code !== editingCourse.id) {
      setSections(prevSections => 
        prevSections.map(section => 
          section.courseId === editingCourse.id ? { ...section, courseId: data.code } : section
        )
      );
    }
    
    setIsEditCourseOpen(false);
    toast.success('Course updated successfully');
  };

  const onSubmitAddCourse = (data: any) => {
    const newCourseId = data.code;
    const newSectionId = `sec${sections.length + 1}`;
    
    // Add new course
    setCourses(prevCourses => [
      ...prevCourses, 
      { id: newCourseId, name: data.name }
    ]);
    
    // Add new section
    setSections(prevSections => [
      ...prevSections,
      { id: newSectionId, courseId: newCourseId, name: `${data.sectionName} - ${data.schedule}` }
    ]);
    
    setSelectedCourse(newCourseId);
    setSelectedSection(newSectionId);
    setIsAddCourseOpen(false);
    toast.success('Course and section added successfully');
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">Record and manage student attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-athena-primary" />
          <span className="text-sm font-medium">April 28, 2025</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Select Course & Section</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddCourse}>
                <Plus className="h-4 w-4 mr-1" />
                Add Course
              </Button>
            </div>
            <CardDescription>Choose a course and section to manage attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Course</label>
                {selectedCourse && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs" 
                    onClick={() => handleEditCourse(courses.find(course => course.id === selectedCourse))}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select 
                value={selectedSection} 
                onValueChange={setSelectedSection}
                disabled={!selectedCourse || filteredSections.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedCourse 
                      ? "Select a course first" 
                      : filteredSections.length === 0 
                        ? "No sections available" 
                        : "Select a section"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredSections.map(section => (
                    <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-medium mb-2">Attendance Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Manual
                </Button>
                <Button variant="outline" className="justify-start">
                  <span className="mr-2 text-lg font-bold">QR</span>
                  Generate Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Attendance Summary</CardTitle>
            <CardDescription>Current attendance statistics for the selected section</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSection ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">24</div>
                    <div className="text-xs text-muted-foreground">Present</div>
                  </div>
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="text-2xl font-bold">3</div>
                    <div className="text-xs text-muted-foreground">Absent</div>
                  </div>
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold">2</div>
                    <div className="text-xs text-muted-foreground">Late</div>
                  </div>
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <AlertCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">1</div>
                    <div className="text-xs text-muted-foreground">Excused</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-sm text-muted-foreground">April 28, 2025, 10:15 AM</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                    <Button size="sm">
                      <Save className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                Select a course and section to view attendance
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedSection && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Attendance Roster</CardTitle>
                <CardDescription>Mark attendance for each student</CardDescription>
              </div>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="present">Present</TabsTrigger>
                  <TabsTrigger value="absent">Absent</TabsTrigger>
                  <TabsTrigger value="late">Late</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <AttendanceRoster sectionId={selectedSection} />
          </CardContent>
        </Card>
      )}

      {/* Edit Course Dialog */}
      <Dialog open={isEditCourseOpen} onOpenChange={setIsEditCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <Form {...editCourseForm}>
            <form onSubmit={editCourseForm.handleSubmit(onSubmitEditCourse)} className="space-y-4">
              <FormField
                control={editCourseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Course name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCourseForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Course code" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditCourseOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <Form {...addCourseForm}>
            <form onSubmit={addCourseForm.handleSubmit(onSubmitAddCourse)} className="space-y-4">
              <FormField
                control={addCourseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Course name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={addCourseForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Course code" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={addCourseForm.control}
                name="sectionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Section A" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={addCourseForm.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mon/Wed 10:00 AM" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the days and times for this section
                    </FormDescription>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddCourseOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Course</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttendanceManager;
