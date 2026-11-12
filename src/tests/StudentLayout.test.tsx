import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudentLayout } from '../components/layout/StudentLayout.js';
import * as AuthContextModule from '../context/AuthContext.js';
import * as ToastContextModule from '../context/ToastContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext.js', () => ({
  useToast: vi.fn(),
}));

vi.mock('../components/dashboard/EmergencyOtpModal.js', () => ({
  EmergencyOtpModal: () => <div data-testid="emergency-otp-modal" />,
}));

describe('StudentLayout Component (WCAG 2.1 AA / 2.2 SC 2.5.8 Touch Targets)', () => {
  const mockUser = {
    id: 'student-uuid-1',
    studentId: '2023-0001-CCS',
    firstName: 'Justine',
    lastName: 'Agbada',
    email: 'agbada.justine@student.orchestra.edu',
    role: 'STUDENT',
  };

  const mockToast = {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
    (ToastContextModule.useToast as any).mockReturnValue({
      toast: mockToast,
    });
  });

  it('renders sign out button with minimum 44x44px touch hitbox', () => {
    render(
      <MemoryRouter>
        <StudentLayout />
      </MemoryRouter>
    );

    const signOutBtn = screen.getByLabelText(/Sign out of Orchestra/i);
    expect(signOutBtn).toBeInTheDocument();
    expect(signOutBtn.className).toContain('min-w-[44px]');
    expect(signOutBtn.className).toContain('min-h-[44px]');
  });

  it('renders mobile navigation drawer toggle button with minimum 44x44px touch hitbox', () => {
    render(
      <MemoryRouter>
        <StudentLayout />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByLabelText(/Toggle navigation drawer/i);
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.className).toContain('min-w-[44px]');
    expect(toggleBtn.className).toContain('min-h-[44px]');
  });

  it('renders student navigation items with minimum 44px touch height', () => {
    render(
      <MemoryRouter>
        <StudentLayout />
      </MemoryRouter>
    );

    const navLink = screen.getByRole('link', { name: /Attendance Ledger/i });
    expect(navLink.className).toContain('min-h-[44px]');

    const emergencyPinBtn = screen.getByRole('button', { name: /Emergency PIN/i });
    expect(emergencyPinBtn.className).toContain('min-h-[44px]');
  });
});
