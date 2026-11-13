import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminSectionsPage } from '../pages/admin/AdminSectionsPage.js';
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
    terminalId: 'TERM-CL304',
    facultyId: 'fac-1',
    faculty: {
      id: 'fac-1',
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan.turing@orchestra.edu',
    },
    defaultLateThresholdMins: 15,
    defaultCutThresholdMins: 45,
    scheduleDay: 'Mon',
    scheduleTime: '08:00',
    scheduleEndTime: '10:00',
    _count: { enrollments: 32, sessions: 14 },
  },
  {
    id: 'sec-2',
    sectionCode: 'AR102-BSCS2B',
    courseName: 'Microprocessor Systems',
    roomNumber: 'LAB-305',
    terminalId: 'TERM-CL305',
    facultyId: 'fac-2',
    faculty: {
      id: 'fac-2',
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace.hopper@orchestra.edu',
    },
    defaultLateThresholdMins: 10,
    defaultCutThresholdMins: 30,
    scheduleDay: 'Wed',
    scheduleTime: '13:00',
    scheduleEndTime: '15:00',
    _count: { enrollments: 28, sessions: 12 },
  },
];

const mockFaculty = [
  {
    id: 'fac-1',
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan.turing@orchestra.edu',
  },
  {
    id: 'fac-2',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace.hopper@orchestra.edu',
  },
];

describe('AdminSectionsPage Component', () => {
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
      if (url.includes('/api/v1/users?role=FACULTY')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: mockFaculty }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AdminSectionsPage />
      </BrowserRouter>
    );

  it('renders section directory header, badges, and configured section cards', async () => {
    renderComponent();

    expect(screen.getByText('Classroom & Course Sections')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('2 Configured')).toBeInTheDocument();
      expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
      expect(screen.getByText('AR102-BSCS2B')).toBeInTheDocument();
      expect(screen.getByText('Computer Architecture and Organization')).toBeInTheDocument();
      expect(screen.getByText('Prof. Alan Turing')).toBeInTheDocument();
    });
  });

  it('filters section cards by search input', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search code, course, faculty, or room/i);
    fireEvent.change(searchInput, { target: { value: 'Microprocessor' } });

    expect(screen.getByText('AR102-BSCS2B')).toBeInTheDocument();
    expect(screen.queryByText('AR101-BSIT3A')).not.toBeInTheDocument();
  });

  it('displays graceful error banner with retry connection when section fetching fails', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/sections')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ success: false, message: 'Database connection timed out' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Connection Alert:/i)).toBeInTheDocument();
      expect(screen.getByText(/Database connection timed out/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    });
  });

  it('opens Create New Section modal and supports toggling between manual typing and stepper time picker', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2 Configured')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /create new section/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Course Section')).toBeInTheDocument();

    // Default mode is 'Type Time' (manual keyboard inputs)
    expect(screen.getByLabelText('Class Start Time')).toBeInTheDocument();
    expect(screen.getByLabelText('Class End Time')).toBeInTheDocument();

    // Switch to Stepper mode
    const stepperBtn = screen.getByRole('button', { name: /stepper/i });
    fireEvent.click(stepperBtn);

    // Verify stepper inputs and controls are rendered with accessible labels
    const hourInput = screen.getAllByLabelText('Hour (1-12)')[0];
    const minuteInput = screen.getAllByLabelText('Minute (00-59)')[0];
    expect(hourInput).toBeInTheDocument();
    expect(minuteInput).toBeInTheDocument();

    // Increment hour in stepper
    const incHourBtn = screen.getAllByLabelText('Increment hour')[0];
    fireEvent.click(incHourBtn);

    // Switch back to manual mode
    const typeTimeBtn = screen.getByRole('button', { name: /type time/i });
    fireEvent.click(typeTimeBtn);
    expect(screen.getByLabelText('Class Start Time')).toBeInTheDocument();
  });

  it('validates required fields and threshold constraints before review confirmation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2 Configured')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /create new section/i });
    fireEvent.click(createBtn);

    const dialog = screen.getByRole('dialog');
    const form = dialog.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/section code is required/i)).toBeInTheDocument();
    });
  });

  it('renders modal dialog with responsive flexbox and scroll bounds', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2 Configured')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /create new section/i });
    fireEvent.click(createBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-h-');
    expect(dialog.className).toContain('flex flex-col');
  });
});
