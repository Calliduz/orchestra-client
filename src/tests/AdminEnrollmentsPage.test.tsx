import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminEnrollmentsPage } from '../pages/admin/AdminEnrollmentsPage.js';
import * as AuthContextModule from '../context/AuthContext.js';
import * as ToastContextModule from '../context/ToastContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext.js', () => ({
  useToast: vi.fn(),
}));

const mockSections = [
  {
    id: 'sec-1',
    sectionCode: 'AR101-BSIT3A',
    courseName: 'Computer Architecture and Organization',
    roomNumber: 'LAB-304',
    faculty: {
      firstName: 'Alan',
      lastName: 'Turing',
    },
    _count: {
      enrollments: 32,
      sessions: 14,
    },
  },
  {
    id: 'sec-2',
    sectionCode: 'AR102-BSCS2B',
    courseName: 'Microprocessor Systems',
    roomNumber: 'LAB-305',
    faculty: {
      firstName: 'Grace',
      lastName: 'Hopper',
    },
    _count: {
      enrollments: 28,
      sessions: 12,
    },
  },
];

const mockStudents = [
  { id: 's-1', firstName: 'John', lastName: 'Doe', email: 'john@orchestra.edu', studentId: 'ST-001', rfidUid: 'RFID1' },
  { id: 's-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@orchestra.edu', studentId: 'ST-002', rfidUid: 'RFID2' },
  { id: 's-3', firstName: 'Bob', lastName: 'Ross', email: 'bob@orchestra.edu', studentId: 'ST-003', rfidUid: 'RFID3' },
  { id: 's-4', firstName: 'Alice', lastName: 'Johnson', email: 'alice@orchestra.edu', studentId: 'ST-004', rfidUid: 'RFID4' },
];

const mockRoster = [
  {
    id: 'enr-1',
    studentId: 's-1',
    sectionId: 'sec-1',
    enrolledAt: '2026-10-01T08:00:00Z',
    student: mockStudents[0],
  },
  {
    id: 'enr-2',
    studentId: 's-2',
    sectionId: 'sec-1',
    enrolledAt: '2026-10-01T08:00:00Z',
    student: mockStudents[1],
  },
];

describe('AdminEnrollmentsPage Component', () => {
  const mockToast = {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      token: 'mock-admin-token',
      user: { role: 'ADMIN', email: 'admin@orchestra.edu' },
    });
    (ToastContextModule.useToast as any).mockReturnValue({
      toast: mockToast,
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/sections')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: mockSections }),
        });
      }
      if (url.includes('/api/v1/users?role=STUDENT')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: mockStudents }),
        });
      }
      if (url.includes('/api/v1/enrollments/section/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: mockRoster }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AdminEnrollmentsPage />
      </BrowserRouter>
    );

  it('renders analytics summary bar displaying Total Enrollments, Total Students, and Active Sections', async () => {
    renderComponent();

    // Verify Page Header
    expect(screen.getByText('Course Section Enrollments')).toBeInTheDocument();

    // Verify Analytics Summary Bar labels
    expect(screen.getByText('Total Enrollments')).toBeInTheDocument();
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('Active Sections')).toBeInTheDocument();

    await waitFor(() => {
      // Total Enrollments = 32 + 28 = 60
      expect(screen.getByText('60')).toBeInTheDocument();
      // Total Students = 4
      expect(screen.getByText('4')).toBeInTheDocument();
      // Active Sections = 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Verify subtexts
    expect(screen.getByText('Active student classroom seats')).toBeInTheDocument();
    expect(screen.getByText('Registered institutional students')).toBeInTheDocument();
    expect(screen.getByText('Configured course sections')).toBeInTheDocument();
  });
});
