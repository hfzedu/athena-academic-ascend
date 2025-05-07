
# Jamia Academia - Architecture Documentation

This document provides an overview of the Jamia Academia application architecture and serves as a reference for developers. When making significant architectural changes, please update this document to reflect those changes.

## System Overview

Jamia Academia is a modern academic management platform built with React, TypeScript, and Supabase. It provides features for course management, student enrollment, attendance tracking, assignment management, and more.

## Application Architecture

```
Jamia Academia
├── App (Main Application Entry)
│   ├── AuthProvider (Auth State Management)
│   ├── ThemeProvider (Dark/Light Mode)
│   └── QueryClientProvider (Data Fetching)
│
├── Services (API/Data Layer)
│   ├── authService (Authentication Operations)
│   ├── profileService (User Profiles Management)
│   ├── courseService (Course Operations)
│   ├── sectionService (Course Sections)
│   ├── enrollmentService (Student Enrollments)
│   ├── attendanceService (Attendance Records)
│   ├── assignmentService (Assignment Management)
│   └── studentService (Student Management)
│
├── Components
│   ├── UI Components (Shadcn/UI Based)
│   │   └── (buttons, forms, modals, cards, etc.)
│   │
│   ├── Layout Components
│   │   ├── MainAppLayout
│   │   ├── AuthLayout
│   │   ├── AdminLayout
│   │   ├── AthenaHeader (App Header)
│   │   └── AthenaSidebar (Navigation)
│   │
│   ├── Feature Components
│   │   ├── Courses
│   │   ├── Assignments
│   │   ├── Attendance
│   │   ├── Students
│   │   └── Dashboard Widgets
│   │
│   └── Auth Components
│       ├── Login/Register Forms
│       ├── AuthGuard (Route Protection)
│       └── RoleGuard (Role-Based Access)
│
├── Pages
│   ├── Index/Landing
│   ├── Auth Pages
│   ├── Dashboard
│   ├── Admin Dashboard
│   ├── Instructor Dashboard
│   ├── Profile Management
│   ├── Course Management
│   ├── Assignments Management
│   └── Attendance Management
│
├── Hooks
│   ├── useAuth
│   ├── useMobile
│   ├── useToast
│   └── useProtectedApi
│
└── Integrations
    └── Supabase
        ├── client.ts (Supabase Client)
        └── types.ts (Database Types)
```

## Key Components

### Auth Flow
The authentication flow is handled by the `AuthProvider` which manages user session state and provides auth-related functions to the entire application. Authentication guards protect routes based on login status and user roles.

### Data Management
Data fetching and state management is handled using TanStack Query (React Query), which provides caching, background fetching, and optimistic updates.

### Services
Our services layer acts as an abstraction over the Supabase client, providing type-safe functions for interacting with the database.

### UI Components
We use Shadcn UI components, which are built on Radix UI primitives and styled with Tailwind CSS.

## Application Flow

1. The application starts from `main.tsx`, which renders the `App` component
2. `App.tsx` sets up providers (Auth, Theme, Query Client) and defines routes
3. Routes are protected using Guards (AuthGuard, RoleGuard)
4. Components interact with the Services layer to fetch and manipulate data
5. Services use the Supabase client to interact with the backend

## Database Structure

### Main Tables
- profiles: User profile information
- departments: Academic departments
- courses: Academic courses
- course_sections: Individual class sections for courses
- enrollments: Student enrollments in course sections
- attendance_records: Student attendance tracking
- assignments: Course assignments

### Key Relationships
- Profiles belong to Departments
- Courses belong to Departments
- Course Sections belong to Courses
- Course Sections have a Professor (from profiles)
- Enrollments connect Students to Course Sections
- Attendance Records track student attendance in sections
- Assignments belong to course sections

## Development Guidelines

### Adding New Features
1. Create new components in the appropriate directory
2. Add service functions if needed
3. Update routes if necessary
4. Update this architecture document if making significant changes

### Code Organization
- Create small, focused components
- Keep business logic in services or custom hooks
- Use TypeScript types for all data structures
- Follow the existing pattern for new features

## Planned Improvements

- Enhanced analytics dashboard
- AI-powered learning recommendations
- Real-time notifications
- Mobile application

