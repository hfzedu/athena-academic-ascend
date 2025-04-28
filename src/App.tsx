
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback"; 
import NotFound from "./pages/NotFound";
import Attendance from "./pages/Attendance";
import Courses from "./pages/Courses";
import ComingSoon from "./pages/ComingSoon";
import Assignments from "./pages/Assignments";
import Students from "./pages/Students";
import { ToastProvider } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route element={<AuthGuard />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/schedule" element={<ComingSoon />} />
                  <Route path="/analytics" element={<ComingSoon />} />
                  <Route path="/study-groups" element={<ComingSoon />} />
                  <Route path="/ai-chat" element={<ComingSoon />} />
                  <Route path="/ai-assistant" element={<ComingSoon />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
