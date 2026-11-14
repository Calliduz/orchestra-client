import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TerminalMonitorPage } from '../pages/TerminalMonitorPage.js';
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
    enabled: true,
    setEnabled: vi.fn(),
    playKeyChirp: vi.fn(),
    playSuccessChime: vi.fn(),
    playErrorBuzz: vi.fn(),
  },
}));

const mockFleetData = [
  {
    terminalId: 'TERM-CL304',
    rssi: -65,
    freeHeap: 215000,
    uptimeSec: 3600,
    readerStatus: 'MFRC522 OK',
    version: 'v1.0.4-PRO',
    lastSeen: new Date().toISOString(),
    status: 'ONLINE' as const,
    roomNumber: 'LAB-304',
    isQuietMode: false,
  },
  {
    terminalId: 'TERM-AUDITORIUM',
    rssi: -84,
    freeHeap: 180000,
    uptimeSec: 7200,
    readerStatus: 'MFRC522 OK',
    version: 'v1.0.4-PRO',
    lastSeen: new Date().toISOString(),
    status: 'WEAK_RSSI' as const,
    roomNumber: 'AUD-MAIN',
    isQuietMode: true,
  },
  {
    terminalId: 'TERM-OFFLINE-LAB',
    rssi: -95,
    freeHeap: 50000,
    uptimeSec: 100,
    readerStatus: 'STANDBY',
    version: 'v1.0.4',
    lastSeen: new Date(Date.now() - 300000).toISOString(),
    status: 'OFFLINE' as const,
    roomNumber: 'ROOM-101',
    isQuietMode: false,
  },
];

describe('TerminalMonitorPage Component', () => {
  const mockSetTerminalId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (AuthContextModule.useAuth as any) = vi.fn().mockReturnValue({
      user: { id: 'admin-1', email: 'admin@orchestra.edu', role: 'ADMIN', firstName: 'System', lastName: 'Admin' } as any,
      token: 'mock-admin-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
      isAdmin: true,
      isFaculty: false,
    });

    vi.spyOn(SocketContextModule, 'useSocket').mockReturnValue({
      socket: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      } as any,
      terminalId: 'TERM-CL304',
      setTerminalId: mockSetTerminalId,
      isConnected: true,
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

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/hardware/terminals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockFleetData }),
        });
      }
      if (url.includes('/hardware/status/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            terminalId: 'TERM-CL304',
            isLocked: true,
            status: 'LOCKED',
            authorizedFaculty: [],
            isQuietMode: false,
          }),
        });
      }
      if (url.includes('/hardware/quiet-mode')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { terminalId: 'TERM-CL304', isQuietMode: true },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it('renders fleet health monitoring cards with accurate status badges', async () => {
    render(<TerminalMonitorPage />);

    await waitFor(() => {
      expect(screen.getAllByText('TERM-CL304').length).toBeGreaterThan(0);
      expect(screen.getByText('TERM-AUDITORIUM')).toBeInTheDocument();
      expect(screen.getByText('TERM-OFFLINE-LAB')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
    expect(screen.getByText('WEAK RSSI')).toBeInTheDocument();
    expect(screen.getByText('OFFLINE ALERT')).toBeInTheDocument();
  });

  it('displays Free Heap memory gauge, Wi-Fi RSSI, and uptime', async () => {
    render(<TerminalMonitorPage />);

    await waitFor(() => {
      expect(screen.getAllByText('FREE HEAP MEMORY').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('-65 dBm')).toBeInTheDocument();
    expect(screen.getByText('-84 dBm')).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600s uptime
  });

  it('toggles Lecture Quiet Mode and includes auth headers', async () => {
    render(<TerminalMonitorPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Quiet: OFF/i).length).toBeGreaterThan(0);
    });

    const quietBtns = screen.getAllByText(/Quiet: OFF/i);
    fireEvent.click(quietBtns[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/hardware/quiet-mode'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-admin-token',
            'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
          }),
        })
      );
    });
  });
});
