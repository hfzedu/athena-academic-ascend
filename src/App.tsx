
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster"; // Assuming Shadcn/ui toaster
import { Toaster as SonnerToaster } from "@/components/ui/sonner"; // Assuming Shadcn/ui sonner
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Providers
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider"; // For light/dark mode
// import { I18nProvider } from "@/providers/I18nProvider"; // For internationalization

// Guards & Layouts
import AuthGuard from "@/components/guards/AuthGuard";
import RoleGuard from "@/components/guards/RoleGuard"; // For role-specific routes
import MainAppLayout from "@/layouts/MainAppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import AdminLayout from "@/layouts/AdminLayout"; // Optional dedicated admin layout

// Global Components
import GlobalErrorBoundary from "@/components/common/GlobalErrorBoundary";
import ScrollToTop from "@/components/common/ScrollToTop"; // Handles scroll restoration

// --- Page Imports (Lazy Loaded) ---
// Public / Index
const IndexPage = lazy(() => import("./pages/Index")); // Could be a landing page or redirect

// Auth
const AuthPage = lazy(() => import("./pages/auth/AuthPage")); // Unified Auth page or separate Login/Signup
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));

// Common App Pages
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const AttendancePage = lazy(() => import("./pages/app/AttendancePage"));
const CoursesListPage = lazy(() => import("./pages/app/courses/CoursesListPage"));
const CourseDetailPage = lazy(() => import("./pages/app/courses/CourseDetailPage"));
const AssignmentsPage = lazy(() => import("./pages/app/AssignmentsPage"));
const StudentsListPage = lazy(() => import("./pages/app/students/StudentsListPage")); // For admins/instructors
const MySchedulePage = lazy(() => import("./pages/app/schedule/MySchedulePage")); // Student's view
const MyProfilePage = lazy(() => import("./pages/app/profile/MyProfilePage"));
const SettingsPage = lazy(() => import("./pages/app/settings/SettingsPage"));

// Role-Specific Pages (Examples)
// Admin
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminUserManagerPage = lazy(() => import("./pages/admin/AdminUserManagerPage"));
const AdminCourseManagerPage = lazy(() => import("./pages/admin/AdminCourseManagerPage"));
// Instructor
const InstructorDashboardPage = lazy(() => import("./pages/instructor/InstructorDashboardPage"));
const InstructorGradebookPage = lazy(() => import("./pages/instructor/InstructorGradebookPage"));

// Utility & Placeholder Pages
const ComingSoonPage = lazy(() => import("./pages/utility/ComingSoonPage"));
const NotFoundPage = lazy(() => import("./pages/utility/NotFoundPage"));

// --- Query Client Configuration ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true, // Consider user preference or specific query needs
      retry: 1, // Retry failed queries once
    },
    mutations: {
      // Default mutation options if needed
    }
  },
});

// --- Loading Fallback Component ---
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-background text-foreground">
    {/* Replace with a branded spinner/loader component */}
    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span className="ml-3 text-lg">Loading...</span>
  </div>
);

// --- Main Application Component ---
const App = () => {
  return (
    <React.StrictMode>
      <GlobalErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="ams-ui-theme"> {/* Or "light", "dark" */}
            <TooltipProvider delayDuration={300}>
              <Toaster /> {/* For Shadcn/ui Toasts */}
              <SonnerToaster richColors position="top-right" /> {/* For Sonner Toasts */}
              <BrowserRouter>
                <AuthProvider> {/* Manages user session and profile data */}
                  <ScrollToTop /> {/* Handles scroll position on navigation */}
                  <Suspense fallback={<PageLoader />}>
                    <AppRoutes />
                  </Suspense>
                </AuthProvider>
              </BrowserRouter>
              <ReactQueryDevtools initialIsOpen={false} />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
};

// --- Application Routes Component ---
// This component now uses the Auth context to dynamically render routes
const AppRoutes = () => {
  const { user, isLoadingAuth, userProfile } = useAuth(); // userProfile might contain role from your DB

  if (isLoadingAuth) {
    return <PageLoader />; // Show loader while auth state is being determined
  }

  return (
    <Routes>
      {/* Publicly Accessible Index/Landing Page (No AuthGuard, No MainAppLayout if distinct) */}
      <Route path="/" element={<IndexPage />} /> {/* Example: Could be a marketing/landing page */}

      {/* Authentication Routes (using AuthLayout) */}
      <Route element={<AuthLayout />}>
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Application Routes (using AuthGuard and MainAppLayout) */}
      <Route element={<AuthGuard />}>
        <Route element={<MainAppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} /> {/* Generic dashboard, could redirect by role */}
          <Route path="/profile" element={<MyProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Common Academic Pages */}
          <Route path="/courses" element={<CoursesListPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} /> {/* Add details, sections, materials */}
          <Route path="/assignments" element={<AssignmentsPage />} /> {/* List assignments, submissions */}
          <Route path="/my-schedule" element={<MySchedulePage />} />
          <Route path="/attendance" element={<AttendancePage />} /> {/* Student view or instructor view */}

          {/* Feature Placeholders */}
          <Route path="/analytics" element={<ComingSoonPage />} />
          <Route path="/study-groups" element={<ComingSoonPage />} />
          <Route path="/ai-chat" element={<ComingSoonPage />} />
          <Route path="/ai-assistant" element={<ComingSoonPage />} />
        </Route>
      </Route>

      {/* Role-Protected Admin Routes (using AdminLayout and RoleGuard) */}
      <Route element={<AuthGuard />}>
        <Route element={<RoleGuard allowedRoles={['admin']}> 
          <AdminLayout />
        </RoleGuard>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUserManagerPage />} />
          <Route path="/admin/courses" element={<AdminCourseManagerPage />} />
          {/* Add more admin routes: sections, terms, departments, site settings, audit logs etc. */}
          <Route path="/admin/analytics" element={<ComingSoonPage />} />
        </Route>
      </Route>
      
      {/* Role-Protected Instructor Routes (could use MainAppLayout or a specific InstructorLayout) */}
      <Route element={<AuthGuard />}>
        <Route element={<RoleGuard allowedRoles={['instructor', 'admin']}>
          <MainAppLayout />
        </RoleGuard>}>
          <Route path="/instructor/dashboard" element={<InstructorDashboardPage />} />
          <Route path="/instructor/courses/:courseId/gradebook" element={<InstructorGradebookPage />} />
          <Route path="/instructor/students" element={<StudentsListPage />} /> {/* List students in their sections */}
          {/* Add more instructor routes: manage assignments, post announcements, manage section attendance */}
        </Route>
      </Route>

      {/* Fallback for Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
