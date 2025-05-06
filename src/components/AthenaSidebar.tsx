import React from 'react';
import {
  Home,
  Calendar,
  Book,
  ListChecks,
  Users,
  BarChart,
  MessageSquare,
  Settings,
  UserPlus,
  Brain,
  Building,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

const AthenaSidebar = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrator' || profile?.role === 'department_head';

  return (
    <div className="w-64 bg-gray-900 text-gray-200 h-screen overflow-y-auto">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-white">Athena</h1>
      </div>
      <nav className="p-4">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Calendar className="h-4 w-4" />
          <span>Attendance</span>
        </NavLink>
        <NavLink
          to="/courses"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Book className="h-4 w-4" />
          <span>Courses</span>
        </NavLink>
        <NavLink
          to="/assignments"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <ListChecks className="h-4 w-4" />
          <span>Assignments</span>
        </NavLink>
        <NavLink
          to="/students"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Users className="h-4 w-4" />
          <span>Students</span>
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/administration"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
                isActive ? 'bg-gray-800 text-white' : ''
              }`
            }
          >
            <Building className="h-4 w-4" />
            <span>Administration</span>
          </NavLink>
        )}
        <NavLink
          to="/schedule"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Calendar className="h-4 w-4" />
          <span>Schedule</span>
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <BarChart className="h-4 w-4" />
          <span>Analytics</span>
        </NavLink>
        <NavLink
          to="/study-groups"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Users className="h-4 w-4" />
          <span>Study Groups</span>
        </NavLink>
        <NavLink
          to="/ai-chat"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <MessageSquare className="h-4 w-4" />
          <span>AI Chat</span>
        </NavLink>
         <NavLink
          to="/ai-assistant"
          className={({ isActive }) =>
            `flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-white' : ''
            }`
          }
        >
          <Brain className="h-4 w-4" />
          <span>AI Assistant</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default AthenaSidebar;
