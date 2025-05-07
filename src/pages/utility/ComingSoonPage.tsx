
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ComingSoonPageProps {
  featureName?: string;
}

export default function ComingSoonPage({ featureName = 'This feature' }: ComingSoonPageProps) {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{featureName} is Coming Soon</CardTitle>
          <CardDescription>
            We're working hard to bring you exciting new features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="py-10">
            <img 
              src="/placeholder.svg" 
              alt="Coming Soon" 
              className="mx-auto h-40 w-auto"
            />
            <p className="mt-6 text-muted-foreground">
              {featureName} is currently in development and will be available soon.
              Thank you for your patience.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
