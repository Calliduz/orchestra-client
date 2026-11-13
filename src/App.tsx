import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { AdminLayout } from './components/layout/AdminLayout.js';
import { FacultyLayout } from './components/layout/FacultyLayout.js';
import { StudentLayout } from './components/layout/StudentLayout.js';

// Lazy Loaded Auth & Public Pages
const LoginPage = lazy(() =>
  import('./pages/LoginPage.js').then((m) => ({ default: m.LoginPage }))
);
const StudentOtpPage = lazy(() =>
  import('./pages/StudentOtpPage.js').then((m) => ({ default: m.StudentOtpPage || m.default }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage.js').then((m) => ({ default: m.NotFoundPage || m.default }))
);

// Lazy Loaded Student Pages
const StudentPortalPage = lazy(() =>
  import('./pages/student/StudentPortalPage.js').then((m) => ({ default: m.StudentPortalPage || m.default }))
);

// Lazy Loaded Admin Pages
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage.js').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminSectionsPage = lazy(() =>
  import('./pages/admin/AdminSectionsPage.js').then((m) => ({ default: m.AdminSectionsPage }))
);
const AdminEnrollmentsPage = lazy(() =>
  import('./pages/admin/AdminEnrollmentsPage.js').then((m) => ({ default: m.AdminEnrollmentsPage }))
);
const CardEnrollmentPage = lazy(() =>
  import('./pages/CardEnrollmentPage.js').then((m) => ({ default: m.CardEnrollmentPage || m.default }))
);
const TerminalMonitorPage = lazy(() =>
  import('./pages/TerminalMonitorPage.js').then((m) => ({ default: m.TerminalMonitorPage || m.default }))
);

// Lazy Loaded Faculty Pages
const FacultyClassroomsPage = lazy(() =>
  import('./pages/faculty/FacultyClassroomsPage.js').then((m) => ({ default: m.FacultyClassroomsPage }))
);
const FacultyDashboardPage = lazy(() =>
  import('./pages/FacultyDashboardPage.js').then((m) => ({ default: m.FacultyDashboardPage || m.default }))
);
const FacultyReportsPage = lazy(() =>
  import('./pages/faculty/FacultyReportsPage.js').then((m) => ({ default: m.FacultyReportsPage }))
);
const FacultyAnalyticsPage = lazy(() =>
  import('./pages/faculty/FacultyAnalyticsPage.js').then((m) => ({ default: m.FacultyAnalyticsPage }))
);
const FacultyStudentsPage = lazy(() =>
  import('./pages/faculty/FacultyStudentsPage.js').then((m) => ({ default: m.FacultyStudentsPage }))
);

const PageLoadingSpinner: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono tracking-widest text-slate-400">LOADING MODULE...</span>
    </div>
  </div>
);

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

  if (user.role === 'STUDENT') {
    return <Navigate to="/student/attendance" replace />;
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
              <Suspense fallback={<PageLoadingSpinner />}>
                <Routes>
                  {/* Root Entry */}
                  <Route path="/" element={<RootRedirect />} />

                  {/* Public & Auth Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/otp" element={<StudentOtpPage />} />

                  {/* Student Portal (Protected: STUDENT or ADMIN) */}
                  <Route
                    path="/student"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                        <StudentLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/student/attendance" replace />} />
                    <Route path="attendance" element={<StudentPortalPage />} />
                  </Route>

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

                  {/* Faculty Portal (Protected: FACULTY only) */}
                  <Route
                    path="/faculty"
                    element={
                      <ProtectedRoute allowedRoles={['FACULTY']}>
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
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </SocketProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
