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

  it('provides quick filter chips and handles Room filter selection', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
      expect(screen.getByText('AR102-BSCS2B')).toBeInTheDocument();
    });

    // Verify filter chips exist
    expect(screen.getByRole('button', { name: /all sections/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scheduled today/i })).toBeInTheDocument();
    const roomChip = screen.getByRole('button', { name: /by department\/room/i });
    expect(roomChip).toBeInTheDocument();

    // Click By Department/Room chip
    fireEvent.click(roomChip);

    // Room select dropdown appears
    const roomSelect = screen.getByLabelText(/filter by specific room/i);
    expect(roomSelect).toBeInTheDocument();

    // Select LAB-304
    fireEvent.change(roomSelect, { target: { value: 'LAB-304' } });

    expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
    expect(screen.queryByText('AR102-BSCS2B')).not.toBeInTheDocument();

    // Reset filters
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
    expect(screen.getByText('AR102-BSCS2B')).toBeInTheDocument();
  });

  it('displays polished empty state when filter yields no matches and allows 1-click reset', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search code, course, faculty, or room/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentSectionXYZ' } });

    await waitFor(() => {
      expect(screen.getByText(/no matching course sections/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeInTheDocument();
    });

    // Click Reset All Filters button
    fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }));

    await waitFor(() => {
      expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
      expect(screen.getByText('AR102-BSCS2B')).toBeInTheDocument();
    });
  });

  it('triggers 1-click Copy Code & Schedule with clipboard write and toast feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('AR101-BSIT3A')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copy code & schedule/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('[AR101-BSIT3A] Computer Architecture and Organization')
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Copied to Clipboard',
      expect.stringContaining('AR101-BSIT3A')
    );
  });

  it('renders live Class Window Active badge when section schedule matches current day and time', async () => {
    const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayAbbrev = DAY_ABBREVS[new Date().getDay()];

    const activeNowSection = {
      id: 'sec-active',
      sectionCode: 'ACTIVE-LIVE-1',
      courseName: 'Live Active Architecture',
      roomNumber: 'LAB-LIVE',
      terminalId: 'TERM-LIVE',
      facultyId: 'fac-1',
      faculty: {
        id: 'fac-1',
        firstName: 'Alan',
        lastName: 'Turing',
        email: 'alan.turing@orchestra.edu',
      },
      defaultLateThresholdMins: 15,
      defaultCutThresholdMins: 45,
      scheduleDay: todayAbbrev,
      scheduleTime: '00:00',
      scheduleEndTime: '23:59',
      _count: { enrollments: 10, sessions: 5 },
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/sections')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: [activeNowSection] }),
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
      expect(screen.getByText('ACTIVE-LIVE-1')).toBeInTheDocument();
      expect(screen.getByText('Class Window Active')).toBeInTheDocument();
      expect(screen.getByTestId('class-window-active-badge')).toBeInTheDocument();
    });
  });
});
