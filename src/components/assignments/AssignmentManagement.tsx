
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AssignmentManagementProps {
  isInstructor?: boolean;
}

export function AssignmentManagement({ isInstructor = false }: AssignmentManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isInstructor ? 'Assignment Management' : 'My Assignments'}</CardTitle>
        <CardDescription>
          {isInstructor 
            ? 'Create and manage assignments for your courses' 
            : 'View and submit your assignments'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Assignment functionality will be implemented soon
          </p>
          {isInstructor && (
            <Button className="mt-4">
              Add Assignment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AssignmentManagement;
