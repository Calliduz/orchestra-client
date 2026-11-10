import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { AdminLayout } from './components/layout/AdminLayout.js';
import { FacultyLayout } from './components/layout/FacultyLayout.js';

// Auth & Public Pages
import { LoginPage } from './pages/LoginPage.js';
import { StudentOtpPage } from './pages/StudentOtpPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Admin Pages
import { AdminUsersPage } from './pages/admin/AdminUsersPage.js';
import { AdminSectionsPage } from './pages/admin/AdminSectionsPage.js';
import { AdminEnrollmentsPage } from './pages/admin/AdminEnrollmentsPage.js';
import { CardEnrollmentPage } from './pages/CardEnrollmentPage.js';
import { TerminalMonitorPage } from './pages/TerminalMonitorPage.js';

// Faculty Pages
import { FacultyClassroomsPage } from './pages/faculty/FacultyClassroomsPage.js';
import { FacultyDashboardPage } from './pages/FacultyDashboardPage.js';
import { FacultyReportsPage } from './pages/faculty/FacultyReportsPage.js';
import { FacultyAnalyticsPage } from './pages/faculty/FacultyAnalyticsPage.js';
import { FacultyStudentsPage } from './pages/faculty/FacultyStudentsPage.js';

// Root redirect based on active session and user role
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        INITIALIZING ORCHESTRA...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/users" replace />;
  }

  return <Navigate to="/faculty" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SocketProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
              {/* Root Entry */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public & Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/otp" element={<StudentOtpPage />} />

              {/* Admin Portal (Protected: ADMIN only) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="sections" element={<AdminSectionsPage />} />
                <Route path="enrollments" element={<AdminEnrollmentsPage />} />
                <Route path="cards" element={<CardEnrollmentPage />} />
                <Route path="terminal" element={<TerminalMonitorPage />} />
              </Route>

              {/* Faculty Portal (Protected: FACULTY or ADMIN) */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                    <FacultyLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FacultyClassroomsPage />} />
                <Route path="live" element={<FacultyDashboardPage />} />
                <Route path="reports" element={<FacultyReportsPage />} />
                <Route path="analytics" element={<FacultyAnalyticsPage />} />
                <Route path="students" element={<FacultyStudentsPage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage onNavigate={() => {}} />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SocketProvider>
    </ToastProvider>
  </ThemeProvider>
);
};

export default App;
