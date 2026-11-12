import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute.js';
import * as AuthContextModule from '../context/AuthContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading indicator when auth session is loading', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/AUTHENTICATING SESSION.../i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is unauthenticated', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected child component when user role is authorized', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', role: 'STUDENT', studentId: '2023-0001-CCS' },
    });

    render(
      <MemoryRouter initialEntries={['/student/attendance']}>
        <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
          <div>Student Attendance Portal Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Student Attendance Portal Content')).toBeInTheDocument();
  });

  it('redirects STUDENT to /student/attendance when accessing unauthorized faculty route', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 's1', role: 'STUDENT', studentId: '2023-0001-CCS' },
    });

    render(
      <MemoryRouter initialEntries={['/faculty']}>
        <Routes>
          <Route
            path="/faculty"
            element={
              <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                <div>Faculty Only Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/student/attendance" element={<div>Student Attendance Redirect Target</div>} />
          <Route path="/otp" element={<div>Wrong OTP Redirect</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify it broke the login trap by redirecting to /student/attendance, NOT /otp
    expect(screen.getByText('Student Attendance Redirect Target')).toBeInTheDocument();
    expect(screen.queryByText('Wrong OTP Redirect')).not.toBeInTheDocument();
    expect(screen.queryByText('Faculty Only Content')).not.toBeInTheDocument();
  });

  it('redirects FACULTY to /faculty when accessing unauthorized route', () => {
    (AuthContextModule.useAuth as any).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'f1', role: 'FACULTY' },
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Admin Only Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/faculty" element={<div>Faculty Portal Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Faculty Portal Redirect Target')).toBeInTheDocument();
    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
  });
});
