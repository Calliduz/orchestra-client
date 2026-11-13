import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RosterTable, StudentRosterRow } from '../components/dashboard/RosterTable.js';
import { ToastProvider } from '../context/ToastContext.js';

const mockRoster: StudentRosterRow[] = [
  {
    id: 's-1',
    studentNumber: '2024-0001',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john.doe@university.edu',
    rfidUid: 'A1B2C3D4',
    status: 'PRESENT',
    authMethod: 'RFID_TAP',
    tapTimestamp: '2026-11-13T08:05:22.000Z',
    reverseReceiptSent: true,
  },
  {
    id: 's-2',
    studentNumber: '2024-0002',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    email: 'jane.smith@university.edu',
    rfidUid: 'E5F6A1B2',
    status: 'LATE',
    authMethod: 'KEYPAD_OTP',
    tapTimestamp: '2026-11-13T08:21:45.000Z',
  },
  {
    id: 's-3',
    studentNumber: '2024-0003',
    firstName: 'Robert',
    lastName: 'Johnson',
    fullName: 'Robert Johnson',
    email: 'robert.j@university.edu',
    status: 'CUT',
    authMethod: 'RFID_TAP',
    tapTimestamp: '2026-11-13T08:50:10.000Z',
    isManualOverride: true,
    overrideReason: 'Late entry permission granted',
  },
  {
    id: 's-4',
    studentNumber: '2024-0004',
    firstName: 'Alice',
    lastName: 'Wong',
    fullName: 'Alice Wong',
    email: 'alice.w@university.edu',
    status: 'ABSENT',
  },
];

describe('RosterTable Component', () => {
  const onOpenOverride = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithToast = (ui: React.ReactElement) => {
    return render(<ToastProvider>{ui}</ToastProvider>);
  };

  it('renders status filter tabs with color-coded count badges', () => {
    renderWithToast(
      <RosterTable
        roster={mockRoster}
        onOpenOverride={onOpenOverride}
        sectionCode="AR101-BSIT3A"
        courseName="Computer Architecture"
      />
    );

    // Filter tabs exist with proper counts
    expect(screen.getByRole('tab', { name: /all/i })).toHaveTextContent('4');
    expect(screen.getByRole('tab', { name: /present/i })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /late/i })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /cut/i })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /absent/i })).toHaveTextContent('1');

    // All 4 students are shown initially
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument();
    expect(screen.getByText('Alice Wong')).toBeInTheDocument();
  });

  it('filters students by 1-click status tabs', () => {
    renderWithToast(
      <RosterTable
        roster={mockRoster}
        onOpenOverride={onOpenOverride}
        sectionCode="AR101-BSIT3A"
      />
    );

    // Click Present tab
    const presentTab = screen.getByRole('tab', { name: /present/i });
    fireEvent.click(presentTab);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Robert Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Alice Wong')).not.toBeInTheDocument();

    // Click Absent tab
    const absentTab = screen.getByRole('tab', { name: /absent/i });
    fireEvent.click(absentTab);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Alice Wong')).toBeInTheDocument();

    // Click All tab to restore
    const allTab = screen.getByRole('tab', { name: /all/i });
    fireEvent.click(allTab);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('supports instant student search filtering by name, ID number, and email', () => {
    renderWithToast(
      <RosterTable
        roster={mockRoster}
        onOpenOverride={onOpenOverride}
        sectionCode="AR101-BSIT3A"
      />
    );

    const searchInput = screen.getByPlaceholderText(/search students by name/i);

    // Search by name
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    // Search by student ID
    fireEvent.change(searchInput, { target: { value: '2024-0004' } });
    expect(screen.getByText('Alice Wong')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();

    // Search by email
    fireEvent.change(searchInput, { target: { value: 'robert.j@' } });
    expect(screen.getByText('Robert Johnson')).toBeInTheDocument();

    // Clear search using clear button
    const clearButton = screen.getByLabelText(/clear search/i);
    fireEvent.click(clearButton);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders modern avatar badges with initials and status ring indicators', () => {
    renderWithToast(
      <RosterTable
        roster={mockRoster}
        onOpenOverride={onOpenOverride}
      />
    );

    // Initials displayed inside avatar badges
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument();
    expect(screen.getByText('RJ')).toBeInTheDocument();
    expect(screen.getByText('AW')).toBeInTheDocument();
  });

  it('triggers Quick CSV Export and generates download link', () => {
    // Mock URL.createObjectURL and revokeObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:http://localhost/test-uuid');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    renderWithToast(
      <RosterTable
        roster={mockRoster}
        onOpenOverride={onOpenOverride}
        sectionCode="AR101-BSIT3A"
      />
    );

    const exportBtn = screen.getByRole('button', { name: /quick csv export/i });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it('displays empty state with reset button when filter yields no matches', () => {
    renderWithToast(
      <RosterTable
        roster={mockRoster}
        onOpenOverride={onOpenOverride}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search students by name/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentStudent' } });

    expect(screen.getByText(/no matching student records/i)).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /reset filter & search/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
