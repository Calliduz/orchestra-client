import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StudentPortalPage } from '../pages/student/StudentPortalPage.js';
import * as AuthContextModule from '../context/AuthContext.js';
import * as SocketContextModule from '../context/SocketContext.js';
import * as ToastContextModule from '../context/ToastContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/SocketContext.js', () => ({
  useSocket: vi.fn(),
}));

vi.mock('../context/ToastContext.js', () => ({
  useToast: vi.fn(),
}));

describe('StudentPortalPage Component', () => {
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

  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockAttendanceData = {
    success: true,
    data: {
      student: { id: 'student-uuid-1', studentId: '2023-0001-CCS', name: 'Justine Agbada' },
      kpi: {
        total: 10,
        present: 8,
        late: 1,
        excused: 1,
        absent: 0,
        rate: 90.0,
      },
      logs: [
        {
          id: 'log-1',
          timestamp: '2026-11-12T08:00:00.000Z',
          status: 'PRESENT',
          authMethod: 'RFID_TAP',
          session: {
            id: 'sess-1',
            courseCode: 'CS101',
            courseName: 'Data Structures & Algorithms',
            room: 'Lab 603',
          },
        },
        {
          id: 'log-2',
          timestamp: '2026-11-11T09:30:00.000Z',
          status: 'LATE',
          authMethod: 'KEYPAD_OTP',
          session: {
            id: 'sess-2',
            courseCode: 'CS102',
            courseName: 'Computer Architecture',
            room: 'Lab 402',
          },
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: mockUser,
      token: 'mock-jwt-token',
    });
    (SocketContextModule.useSocket as any).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });
    (ToastContextModule.useToast as any).mockReturnValue({
      toast: mockToast,
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/students/my-attendance')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAttendanceData),
        });
      }
      return Promise.reject(new Error(`Unhandled url: ${url}`));
    });
  });

  it('renders student attendance portal header and KPI metrics', async () => {
    render(<StudentPortalPage />);

    expect(screen.getByText('Student Attendance Portal')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('90.0%')[0]).toBeInTheDocument();
      expect(screen.getAllByText('8')[0]).toBeInTheDocument(); // Present
      // Both Late and Excused are 1
      expect(screen.getAllByText('1')).toHaveLength(2);
    });
  });

  it('renders attendance history ledger with records', async () => {
    render(<StudentPortalPage />);

    await waitFor(() => {
      expect(screen.getByText(/Data Structures & Algorithms/i)).toBeInTheDocument();
      expect(screen.getByText(/Computer Architecture/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Lab 603')).toBeInTheDocument();
    expect(screen.getByText(/RFID Badge/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Keypad PIN/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filters attendance records when clicking status filter buttons', async () => {
    render(<StudentPortalPage />);

    await waitFor(() => {
      expect(screen.getByText(/Data Structures & Algorithms/i)).toBeInTheDocument();
    });

    // Filter by 'LATE'
    const lateFilterBtn = screen.getByRole('button', { name: /^LATE$/i });
    fireEvent.click(lateFilterBtn);

    expect(screen.getByText(/Computer Architecture/i)).toBeInTheDocument();
    expect(screen.queryByText(/Data Structures & Algorithms/i)).not.toBeInTheDocument();
  });

  it('listens for attendance:updated socket event and updates UI', async () => {
    let capturedHandler: any = null;
    mockSocket.on.mockImplementation((event: string, handler: any) => {
      if (event === 'attendance:updated') {
        capturedHandler = handler;
      }
    });

    render(<StudentPortalPage />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('attendance:updated', expect.any(Function));
    });

    // Simulate socket event
    expect(capturedHandler).toBeDefined();
    await act(async () => {
      capturedHandler({
        studentId: 'student-uuid-1',
        status: 'PRESENT',
        timestamp: new Date().toISOString(),
      });
    });

    expect(mockToast.info).toHaveBeenCalledWith(
      'Live Attendance Updated',
      expect.stringContaining('PRESENT')
    );
  });

  it('opens EmergencyOtpModal when clicking Emergency Keypad PIN button', async () => {
    render(<StudentPortalPage />);

    const otpBtn = screen.getByRole('button', { name: /Emergency Keypad PIN/i });
    await act(async () => {
      fireEvent.click(otpBtn);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Emergency Keypad PIN Ingress')).toBeInTheDocument();
  });

  it('renders status filter buttons with minimum 44px touch height (WCAG SC 2.5.8)', async () => {
    render(<StudentPortalPage />);

    await waitFor(() => {
      expect(screen.getAllByText('90.0%')[0]).toBeInTheDocument();
    });

    const statuses = ['ALL', 'PRESENT', 'LATE', 'EXCUSED', 'ABSENT'];
    for (const status of statuses) {
      const btn = screen.getByRole('button', { name: new RegExp(`^${status}$`, 'i') });
      expect(btn.className).toContain('min-h-[44px]');
    }
  });
});
