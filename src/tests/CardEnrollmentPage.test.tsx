import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CardEnrollmentPage } from '../pages/CardEnrollmentPage.js';
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

vi.mock('../utils/audio.js', () => ({
  sounds: {
    playKeyChirp: vi.fn(),
    playSuccessChime: vi.fn(),
    playErrorBuzz: vi.fn(),
  },
}));

const mockUsers = [
  {
    id: 'u-1',
    studentId: '2024-0001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@orchestra.edu',
    role: 'STUDENT',
    rfidUid: 'A1B2C3D4',
  },
  {
    id: 'u-2',
    studentId: '2024-0002',
    firstName: 'Charles',
    lastName: 'Babbage',
    email: 'charles@orchestra.edu',
    role: 'STUDENT',
    rfidUid: null,
  },
  {
    id: 'u-3',
    studentId: 'FAC-001',
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan@orchestra.edu',
    role: 'FACULTY',
    rfidUid: 'E5F60718',
  },
  {
    id: 'u-4',
    studentId: 'FAC-002',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@orchestra.edu',
    role: 'FACULTY',
    rfidUid: null,
  },
];

describe('CardEnrollmentPage Component', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (AuthContextModule.useAuth as any).mockReturnValue({
      token: 'fake-token-xyz',
      user: { role: 'ADMIN' },
    });

    (SocketContextModule.useSocket as any).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      terminalId: 'TERM-CL304',
      setTerminalId: vi.fn(),
    });

    (ToastContextModule.useToast as any).mockReturnValue({
      toast: mockToast,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/users')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockUsers }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'OK' }),
        });
      })
    );
  });

  it('renders badge status filter chips with accurate user counts', async () => {
    render(<CardEnrollmentPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Lovelace/i).length).toBeGreaterThan(0);
    });

    // Verify filter chips: [All Users (4)], [Assigned Badges (2)], [Unassigned Badges (2)]
    expect(screen.getByText('All Users')).toBeInTheDocument();
    expect(screen.getByText('(4)')).toBeInTheDocument();
    expect(screen.getByText('Assigned Badges')).toBeInTheDocument();
    expect(screen.getByText('Unassigned Badges')).toBeInTheDocument();
  });

  it('filters table rows when clicking Assigned and Unassigned filter chips', async () => {
    render(<CardEnrollmentPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Lovelace/i).length).toBeGreaterThan(0);
    });

    const table = screen.getByRole('table');

    // Click Unassigned Badges filter
    const unassignedChip = screen.getByText('Unassigned Badges').closest('button')!;
    fireEvent.click(unassignedChip);

    // Charles (null rfid) and Grace (null rfid) should be visible in table
    expect(table.textContent).toContain('Babbage');
    expect(table.textContent).toContain('Hopper');
    // Ada (assigned) and Alan (assigned) should be filtered out from table
    expect(table.textContent).not.toContain('Lovelace');
    expect(table.textContent).not.toContain('Turing');

    // Click Assigned Badges filter
    const assignedChip = screen.getByText('Assigned Badges').closest('button')!;
    fireEvent.click(assignedChip);

    expect(table.textContent).toContain('Lovelace');
    expect(table.textContent).toContain('Turing');
    expect(table.textContent).not.toContain('Babbage');
    expect(table.textContent).not.toContain('Hopper');
  });

  it('toggles Unassigned First sorting to float unprovisioned users to the top', async () => {
    render(<CardEnrollmentPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Lovelace/i).length).toBeGreaterThan(0);
    });

    const unassignedToggle = screen.getByText('Unassigned First').closest('button')!;
    fireEvent.click(unassignedToggle);

    // Rows should be reordered with unassigned users (Babbage, Hopper) first
    const tableRows = screen.getAllByRole('row');
    // Header is row 0; Row 1 should be an unassigned user
    const row1Text = tableRows[1].textContent;
    expect(row1Text).toContain('Unassigned');
  });

  it('renders realistic virtual badge preview card with NFC chip graphic and hex UID', async () => {
    render(<CardEnrollmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Orchestra Physical Access/i)).toBeInTheDocument();
    });

    // Check virtual RFID card details
    expect(screen.getByText(/MIFARE Classic 1K/i)).toBeInTheDocument();
    expect(screen.getByTitle('NFC Contact & Contactless Smart Chip')).toBeInTheDocument();
    expect(screen.getByText(/Hexadecimal Badge UID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Map to Selected User/i })).toBeInTheDocument();
  });

  it('maps captured tag UID to selected user when clicking Map to Selected User button', async () => {
    render(<CardEnrollmentPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Lovelace/i).length).toBeGreaterThan(0);
    });

    // Simulate clicking a user row (Charles Babbage, who is unassigned) in table
    const tableRows = screen.getAllByRole('row');
    const charlesRow = tableRows.find((row) => row.textContent?.includes('Babbage'))!;
    fireEvent.click(charlesRow);

    // Enter a UID manually in the intercept input
    const uidInput = screen.getByPlaceholderText(/Enter or Tap UID/i);
    fireEvent.change(uidInput, { target: { value: '99AABBCC' } });

    // The Map to Selected User button should be enabled
    const mapButton = screen.getByRole('button', { name: /Map to Selected User/i });
    expect(mapButton).not.toBeDisabled();

    fireEvent.click(mapButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/u-2/rfid'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ rfidUid: '99AABBCC' }),
        })
      );
    });
  });
});
