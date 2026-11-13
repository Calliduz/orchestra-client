import React, { useState, useContext } from 'react';
import {
  Search,
  MailCheck,
  Edit3,
  Tag,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  X,
  Check,
} from 'lucide-react';
import { Badge, BadgeStatus } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { CopyButton } from '../ui/CopyButton.js';
import { Card } from '../ui/Card.js';
import { useToast } from '../../context/ToastContext.js';

export interface StudentRosterRow {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  rfidUid?: string | null;
  status: BadgeStatus;
  authMethod?: string | null;
  tapTimestamp?: string | null;
  isManualOverride?: boolean;
  overrideReason?: string | null;
  reverseReceiptSent?: boolean;
}

interface RosterTableProps {
  roster: StudentRosterRow[];
  onOpenOverride: (student: StudentRosterRow) => void;
  disabled?: boolean;
  sectionCode?: string;
  courseName?: string;
}

// Deterministic modern avatar gradient palette
const AVATAR_PALETTES = [
  'from-blue-600/30 to-indigo-600/30 text-blue-300 border-blue-500/40',
  'from-emerald-600/30 to-teal-600/30 text-emerald-300 border-emerald-500/40',
  'from-violet-600/30 to-purple-600/30 text-violet-300 border-purple-500/40',
  'from-amber-600/30 to-orange-600/30 text-amber-300 border-amber-500/40',
  'from-rose-600/30 to-pink-600/30 text-rose-300 border-rose-500/40',
  'from-cyan-600/30 to-sky-600/30 text-cyan-300 border-cyan-500/40',
  'from-fuchsia-600/30 to-pink-600/30 text-fuchsia-300 border-fuchsia-500/40',
  'from-teal-600/30 to-emerald-600/30 text-teal-300 border-teal-500/40',
  'from-indigo-600/30 to-sky-600/30 text-indigo-300 border-indigo-500/40',
];

function getAvatarPalette(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getStatusRingConfig(status: BadgeStatus) {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'PRESENT':
      return {
        ring: 'ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-slate-900',
        dot: 'bg-emerald-400 ring-2 ring-slate-900 shadow-[0_0_6px_rgba(16,185,129,0.7)]',
        label: 'Present',
      };
    case 'LATE':
      return {
        ring: 'ring-2 ring-amber-500/60 ring-offset-2 ring-offset-slate-900',
        dot: 'bg-amber-400 ring-2 ring-slate-900 shadow-[0_0_6px_rgba(245,158,11,0.7)]',
        label: 'Late',
      };
    case 'CUT':
      return {
        ring: 'ring-2 ring-rose-500/60 ring-offset-2 ring-offset-slate-900',
        dot: 'bg-rose-400 ring-2 ring-slate-900 shadow-[0_0_6px_rgba(239,68,68,0.7)]',
        label: 'Cut Session',
      };
    case 'EXCUSED':
      return {
        ring: 'ring-2 ring-purple-500/60 ring-offset-2 ring-offset-slate-900',
        dot: 'bg-purple-400 ring-2 ring-slate-900 shadow-[0_0_6px_rgba(168,85,247,0.7)]',
        label: 'Excused',
      };
    case 'ABSENT':
    default:
      return {
        ring: 'ring-1 ring-slate-700/60 ring-offset-1 ring-offset-slate-900',
        dot: 'bg-slate-500 ring-2 ring-slate-900',
        label: 'Absent',
      };
  }
}

export const RosterTable: React.FC<RosterTableProps> = ({
  roster,
  onOpenOverride,
  disabled = false,
  sectionCode,
  courseName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Safe toast access to avoid breaking if rendered outside ToastProvider
  let toast: ReturnType<typeof useToast>['toast'] | null = null;
  try {
    const toastContext = useToast();
    toast = toastContext.toast;
  } catch {
    toast = null;
  }

  const counts = {
    ALL: roster.length,
    PRESENT: roster.filter((r) => r.status === 'PRESENT').length,
    LATE: roster.filter((r) => r.status === 'LATE').length,
    CUT: roster.filter((r) => r.status === 'CUT').length,
    EXCUSED: roster.filter((r) => r.status === 'EXCUSED').length,
    ABSENT: roster.filter((r) => r.status === 'ABSENT').length,
  };

  const filteredRoster = roster.filter((student) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      student.fullName.toLowerCase().includes(q) ||
      student.studentNumber.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      (student.rfidUid && student.rfidUid.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'ALL' ? true : student.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExportCsv = () => {
    const exportTarget = filteredRoster.length > 0 ? filteredRoster : roster;
    if (exportTarget.length === 0) return;

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Student Number',
      'Full Name',
      'First Name',
      'Last Name',
      'Email Address',
      'Attendance Status',
      'Check-in Timestamp',
      'Ingress Method',
      'RFID UID',
      'Manual Override',
      'Override Reason',
      'Reverse Receipt Sent',
    ];

    const rows = exportTarget.map((student) => {
      const formattedTime = student.tapTimestamp
        ? new Date(student.tapTimestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : 'N/A';

      const methodLabel =
        student.authMethod === 'RFID_TAP'
          ? 'RFID Tag'
          : student.authMethod === 'KEYPAD_OTP'
          ? 'Keypad PIN'
          : student.authMethod || (student.tapTimestamp ? 'Normal' : 'N/A');

      return [
        escapeCsv(student.studentNumber),
        escapeCsv(student.fullName),
        escapeCsv(student.firstName),
        escapeCsv(student.lastName),
        escapeCsv(student.email),
        escapeCsv(student.status),
        escapeCsv(formattedTime),
        escapeCsv(methodLabel),
        escapeCsv(student.rfidUid ? `0x${student.rfidUid}` : 'N/A'),
        escapeCsv(student.isManualOverride ? 'Yes' : 'No'),
        escapeCsv(student.overrideReason || ''),
        escapeCsv(student.reverseReceiptSent ? 'Yes' : 'No'),
      ].join(',');
    });

    const sessionHeader = sectionCode ? `# Section: ${sectionCode}\r\n` : '';
    const courseHeader = courseName ? `# Course: ${courseName}\r\n` : '';
    const dateHeader = `# Export Date: ${new Date().toISOString()}\r\n`;
    const csvContent = `${sessionHeader}${courseHeader}${dateHeader}${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const cleanCode = (sectionCode || 'session').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-${cleanCode}-${dateStr}-${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);

    if (toast) {
      toast.success(
        'Attendance CSV Exported',
        `Generated CSV with ${exportTarget.length} student records for ${sectionCode || 'current session'}.`
      );
    }
  };

  const statusTabs = [
    {
      id: 'ALL',
      label: 'All',
      count: counts.ALL,
      icon: <Users className="w-3.5 h-3.5" />,
      activeClass:
        'bg-sky-500/20 text-sky-200 border-sky-500/40 shadow-xs shadow-sky-500/10',
      badgeClass:
        statusFilter === 'ALL'
          ? 'bg-sky-500/30 text-sky-100 border-sky-400/40'
          : 'bg-slate-800 text-slate-300 border-slate-700/60',
    },
    {
      id: 'PRESENT',
      label: 'Present',
      count: counts.PRESENT,
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      activeClass:
        'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-xs shadow-emerald-500/10',
      badgeClass:
        statusFilter === 'PRESENT'
          ? 'bg-emerald-500/30 text-emerald-100 border-emerald-400/50'
          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'LATE',
      label: 'Late',
      count: counts.LATE,
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      activeClass:
        'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-xs shadow-amber-500/10',
      badgeClass:
        statusFilter === 'LATE'
          ? 'bg-amber-500/30 text-amber-100 border-amber-400/50'
          : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    {
      id: 'CUT',
      label: 'Cut',
      count: counts.CUT,
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
      activeClass:
        'bg-rose-500/20 text-rose-200 border-rose-500/40 shadow-xs shadow-rose-500/10',
      badgeClass:
        statusFilter === 'CUT'
          ? 'bg-rose-500/30 text-rose-100 border-rose-400/50'
          : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    },
    {
      id: 'EXCUSED',
      label: 'Excused',
      count: counts.EXCUSED,
      icon: <Tag className="w-3.5 h-3.5 text-purple-400" />,
      activeClass:
        'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-xs shadow-purple-500/10',
      badgeClass:
        statusFilter === 'EXCUSED'
          ? 'bg-purple-500/30 text-purple-100 border-purple-400/50'
          : 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    {
      id: 'ABSENT',
      label: 'Absent',
      count: counts.ABSENT,
      icon: <UserX className="w-3.5 h-3.5 text-slate-400" />,
      activeClass:
        'bg-slate-700/60 text-slate-200 border-slate-500/50 shadow-xs',
      badgeClass:
        statusFilter === 'ABSENT'
          ? 'bg-slate-700 text-slate-100 border-slate-500/60'
          : 'bg-slate-800 text-slate-400 border-slate-700',
    },
  ];

  return (
    <Card
      title="Section Attendance Manifest"
      subtitle={
        sectionCode
          ? `${sectionCode} • Enrolled Records: ${roster.length} active students`
          : `Enrolled Records: ${roster.length} active students in database`
      }
      bodyClassName="p-0"
    >
      {/* 1. Interactive Status Filter Tabs Ribbon */}
      <div className="px-4 py-3 border-b border-white/[0.05] bg-slate-900/40 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max" role="tablist" aria-label="Filter roster by status">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all flex items-center gap-2 border select-none ${
                  isActive
                    ? `${tab.activeClass} font-semibold`
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold border transition-colors ${tab.badgeClass}`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Table Toolbar: Student Search Filter & Quick CSV Export Action */}
      <div className="p-4 border-b border-white/[0.04] bg-slate-900/20 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name, ID number, or email..."
            className="w-full pl-10 pr-9 py-2 text-xs border border-white/[0.08] bg-slate-950/50 text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/25 rounded-xl placeholder:text-slate-500 transition-colors font-body shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="text-xs text-slate-400 font-body">
            Showing{' '}
            <span className="text-sky-400 font-bold font-mono num-tabular">
              {filteredRoster.length}
            </span>{' '}
            of {roster.length} students
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={roster.length === 0}
            leftIcon={
              isExporting ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-sky-400" />
              )
            }
            className={`min-h-[38px] px-3.5 text-xs font-semibold rounded-xl transition-all border-white/[0.08] hover:border-sky-500/40 hover:bg-sky-500/10 ${
              isExporting ? 'border-emerald-500/40 text-emerald-300' : 'text-slate-200'
            }`}
          >
            {isExporting ? 'Exported!' : 'Quick CSV Export'}
          </Button>
        </div>
      </div>

      {/* 3. Spacious High-Readability Table with Modern Avatars */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.05]">
            <tr>
              <th className="py-3 px-3.5 w-10 text-center">#</th>
              <th className="py-3 px-3.5 min-w-[220px]">STUDENT &amp; CREDENTIAL</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[95px]">RFID UID</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[120px]">CHECK-IN &amp; INGRESS</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[110px]">STATUS</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-24">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03] text-xs">
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-slate-400 font-sans">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/[0.06] flex items-center justify-center text-slate-400 shadow-inner">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        No matching student records
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {searchQuery
                          ? `No records match "${searchQuery}" with status filter "${statusFilter}".`
                          : `No students found under status filter "${statusFilter}".`}
                      </div>
                    </div>
                    {(searchQuery || statusFilter !== 'ALL') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                        }}
                        className="text-xs mt-1 border-white/[0.08] hover:bg-white/[0.05]"
                      >
                        Reset Filter &amp; Search
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRoster.map((student, idx) => {
                const timeFormatted = student.tapTimestamp
                  ? new Date(student.tapTimestamp)
                      .toLocaleTimeString('en-US', {
                        hour12: true,
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                      .replace(/[\s\u202F]+/g, ' ')
                  : null;

                const initials = `${student.firstName[0] || ''}${student.lastName[0] || ''}`.toUpperCase();
                const avatarPalette = getAvatarPalette(
                  student.studentNumber || student.fullName || student.id
                );
                const statusRing = getStatusRingConfig(student.status);

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-hud-hover/50 transition-colors group"
                  >
                    <td className="py-3.5 px-3.5 text-hud-muted font-mono text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-3">
                        {/* Modern Avatar with deterministic background & subtle status ring */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br border flex items-center justify-center text-xs font-bold font-mono transition-transform duration-200 group-hover:scale-105 shadow-sm ${avatarPalette} ${statusRing.ring}`}
                            title={`${student.fullName} (${statusRing.label})`}
                          >
                            {initials}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusRing.dot}`}
                            title={`Status: ${statusRing.label}`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="font-sans font-bold text-sm text-hud-text group-hover:text-sky-300 transition-colors truncate">
                            {student.fullName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-hud-secondary mt-0.5">
                            <span className="font-semibold text-slate-300">
                              {student.studentNumber}
                            </span>
                            <CopyButton
                              text={student.studentNumber}
                              label=""
                              className="p-0 text-hud-muted hover:text-sky-600 dark:hover:text-sky-400"
                            />
                            <span className="text-hud-muted">•</span>
                            <span className="text-hud-muted truncate max-w-[140px]">
                              {student.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                      {student.rfidUid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/40 border border-white/[0.06] px-2 py-0.5 rounded-lg">
                          <Tag className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          <span>0x{student.rfidUid}</span>
                        </span>
                      ) : (
                        <span className="text-hud-muted text-xs">UNBOUND</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                      {timeFormatted ? (
                        <div>
                          <div className="text-hud-text font-bold text-xs num-tabular">
                            {timeFormatted}
                          </div>
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-sans font-semibold mt-0.5">
                            {student.authMethod === 'RFID_TAP'
                              ? 'RFID TAG'
                              : student.authMethod === 'KEYPAD_OTP'
                              ? 'KEYPAD PIN'
                              : student.authMethod}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-hud-muted text-xs">--:--:--</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                            PENDING
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge status={student.status} size="sm" />
                        {student.reverseReceiptSent && (
                          <span
                            title="Reverse-receipt attendance notification dispatched"
                            className="inline-flex text-emerald-500 dark:text-emerald-400 p-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-xs"
                          >
                            <MailCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {student.isManualOverride && (
                          <span
                            title={`Override: ${student.overrideReason || 'Manual adjustment'}`}
                            className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full"
                          >
                            EDITED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onOpenOverride(student)}
                        leftIcon={<Edit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                        className="min-h-[44px] min-w-[44px] px-3.5 text-xs bg-hud-surface hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border-hud-border/80 shadow-xs"
                      >
                        Override
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default RosterTable;
