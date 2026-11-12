import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmergencyOtpModal } from '../components/dashboard/EmergencyOtpModal.js';
import * as AuthContextModule from '../context/AuthContext.js';
import * as ToastContextModule from '../context/ToastContext.js';

vi.mock('../context/AuthContext.js', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext.js', () => ({
  useToast: vi.fn(),
}));

describe('EmergencyOtpModal Component', () => {
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

  const mockOtpResponse = {
    success: true,
    data: {
      otp: '582914',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      expiresInSeconds: 60,
      studentId: '2023-0001-CCS',
      studentName: 'Agbada, Justine Jay',
      sectionCode: 'CS101-LAB',
      courseName: 'Data Structures',
      roomNumber: 'Lab 304',
      terminalId: 'TERM-CL304',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: mockUser,
      token: 'mock-jwt-token',
    });
    (ToastContextModule.useToast as any).mockReturnValue({
      toast: mockToast,
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string, opts: any) => {
      if (url.includes('/api/v1/otp/request')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOtpResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });
  });

  it('does not render when isOpen is false', () => {
    render(<EmergencyOtpModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('automatically requests and displays 6-digit PIN with countdown timer on open', async () => {
    render(<EmergencyOtpModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Emergency Keypad PIN Ingress')).toBeInTheDocument();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/otp/request'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            identifier: '2023-0001-CCS',
            studentId: '2023-0001-CCS',
          }),
        })
      );
    });

    await waitFor(() => {
      const pinElement = screen.getByTestId('otp-pin-display');
      expect(pinElement).toHaveTextContent('582914');
      expect(screen.getByText(/ACTIVE INGRESS PIN/i)).toBeInTheDocument();
      expect(screen.getByText(/Terminal Keypad Entry Instructions/i)).toBeInTheDocument();
    });
  });

  it('toggles PIN masking (anti-shoulder surfing) when clicking mask toggle', async () => {
    render(<EmergencyOtpModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('otp-pin-display')).toHaveTextContent('582914');
    });

    // Click mask button
    const maskButton = screen.getByTitle(/Mask PIN/i);
    fireEvent.click(maskButton);

    // Verify digits are masked
    expect(screen.getByTestId('otp-pin-display')).toHaveTextContent('••••••');

    // Click reveal button to unmask
    const revealButton = screen.getByTitle(/Reveal PIN/i);
    fireEvent.click(revealButton);
    expect(screen.getByTestId('otp-pin-display')).toHaveTextContent('582914');
  });

  it('announces PIN state via aria-live status container', async () => {
    render(<EmergencyOtpModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    render(<EmergencyOtpModal isOpen={true} onClose={handleClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('otp-pin-display')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders PIN masking toggle button with minimum 44px touch height (WCAG SC 2.5.8)', async () => {
    render(<EmergencyOtpModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('otp-pin-display')).toBeInTheDocument();
    });

    const maskButton = screen.getByTitle(/Mask PIN/i);
    expect(maskButton.className).toContain('min-h-[44px]');
  });
});
