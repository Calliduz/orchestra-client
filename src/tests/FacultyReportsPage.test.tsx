import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FacultyReportsPage } from '../pages/faculty/FacultyReportsPage.js';
import * as AuthContextModule from '../context/AuthContext.js';
import * as ToastContextModule from '../context/ToastContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext.js', () => ({
  useToast: vi.fn(),
}));

const mockSessions = [
  {
    id: 'sess-001',
    sectionId: 'sec-001',
    status: 'CLOSED',
    startTime: '2026-11-14T08:00:00Z',
    endTime: '2026-11-14T10:00:00Z',
    lateThresholdMins: 15,
    cutThresholdMins: 45,
    section: {
      id: 'sec-001',
      sectionCode: 'IT304-CS3A',
      courseName: 'Embedded Systems',
      roomNumber: 'LAB-304',
    },
    faculty: {
      id: 'fac-001',
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan@orchestra.edu',
    },
    attendanceLogs: [
      { id: 'log-1', studentId: 'stud-1', status: 'PRESENT' },
      { id: 'log-2', studentId: 'stud-2', status: 'LATE' },
    ],
  },
];

describe('FacultyReportsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (AuthContextModule.useAuth as any) = vi.fn().mockReturnValue({
      user: { id: 'fac-001', email: 'alan@orchestra.edu', role: 'FACULTY', firstName: 'Alan', lastName: 'Turing' } as any,
      token: 'mock-faculty-jwt',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
      isFaculty: true,
    });

    (ToastContextModule.useToast as any) = vi.fn().mockReturnValue({
      toasts: [],
      dismissToast: vi.fn(),
      toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
      },
    });

    // Mock createObjectURL & revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-download-url');
    window.URL.revokeObjectURL = vi.fn();

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/sessions/my')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSessions }),
        });
      }
      if (url.includes('/sections')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [mockSessions[0].section] }),
        });
      }
      if (url.includes('/export/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({
            'Content-Disposition': 'attachment; filename=Test_Export.csv',
          }),
          blob: () => Promise.resolve(new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' })),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it('renders 1-Click LMS and Institutional Export buttons', async () => {
    render(
      <MemoryRouter>
        <FacultyReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('IT304-CS3A').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('INSTITUTIONAL PDF')).toBeInTheDocument();
    expect(screen.getByText('CANVAS')).toBeInTheDocument();
    expect(screen.getByText('MOODLE')).toBeInTheDocument();
    expect(screen.getByText('XLSX')).toBeInTheDocument();
  });

  it('downloads Canvas SIS export carrying Authorization token header', async () => {
    render(
      <MemoryRouter>
        <FacultyReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CANVAS')).toBeInTheDocument();
    });

    const canvasBtn = screen.getByText('CANVAS');
    fireEvent.click(canvasBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/sess-001/export/canvas'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-faculty-jwt',
          }),
        })
      );
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('downloads Institutional Master PDF carrying Authorization token header', async () => {
    render(
      <MemoryRouter>
        <FacultyReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INSTITUTIONAL PDF')).toBeInTheDocument();
    });

    const pdfBtn = screen.getByText('INSTITUTIONAL PDF');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/sess-001/export/institutional-pdf'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-faculty-jwt',
          }),
        })
      );
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
