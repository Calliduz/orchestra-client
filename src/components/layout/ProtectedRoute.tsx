import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'FACULTY' | 'STUDENT')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-mono tracking-wider">AUTHENTICATING SESSION...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If admin is allowed and user is faculty, redirect to /faculty
    if (user.role === 'FACULTY') {
      return <Navigate to="/faculty" replace />;
    }
    // If student, redirect to /student/attendance
    if (user.role === 'STUDENT') {
      return <Navigate to="/student/attendance" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

