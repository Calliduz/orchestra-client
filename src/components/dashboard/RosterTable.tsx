import React, { useState } from 'react';
import { Search, MailCheck, Edit3, Tag } from 'lucide-react';
import { Badge, BadgeStatus } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { CopyButton } from '../ui/CopyButton.js';
import { Card } from '../ui/Card.js';

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
}

export const RosterTable: React.FC<RosterTableProps> = ({
  roster,
  onOpenOverride,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const counts = {
    ALL: roster.length,
    PRESENT: roster.filter((r) => r.status === 'PRESENT').length,
    LATE: roster.filter((r) => r.status === 'LATE').length,
    CUT: roster.filter((r) => r.status === 'CUT').length,
    EXCUSED: roster.filter((r) => r.status === 'EXCUSED').length,
    ABSENT: roster.filter((r) => r.status === 'ABSENT').length,
  };

  const filteredRoster = roster.filter((student) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : student.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Card
      title="Section Attendance Manifest"
      subtitle={`Enrolled Records: ${roster.length} active students in database`}
      action={
        <div className="flex items-center gap-1.5 p-1 bg-hud-elevated/60 border border-hud-border/70 rounded-2xl shadow-tactile overflow-x-auto">
          {(['ALL', 'PRESENT', 'LATE', 'CUT', 'EXCUSED', 'ABSENT'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 text-xs rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === filter
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-hud-secondary hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <span>{filter}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  statusFilter === filter
                    ? 'bg-sky-800/60 text-white'
                    : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {counts[filter]}
              </span>
            </button>
          ))}
        </div>
      }
      bodyClassName="p-0"
    >
      {/* Search Header Strip */}
      <div className="p-4 border-b border-hud-border/70 bg-hud-elevated/30 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-hud-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-hud-border/80 bg-hud-surface text-hud-text focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl placeholder:text-hud-muted transition-colors shadow-sm font-body"
          />
        </div>

        <div className="text-xs text-hud-secondary font-body">
          Records matched:{' '}
          <span className="text-sky-600 dark:text-sky-400 font-bold font-mono num-tabular">
            {filteredRoster.length}
          </span>{' '}
          of {roster.length}
        </div>
      </div>

      {/* Spacious High-Readability Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-hud-text">
          <thead className="bg-hud-elevated/60 text-xs font-semibold text-hud-secondary uppercase tracking-wider border-b border-hud-border/60">
            <tr>
              <th className="py-3 px-3.5 w-10 text-center">#</th>
              <th className="py-3 px-3.5 min-w-[220px]">STUDENT &amp; CREDENTIAL</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[100px]">RFID UID</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[90px]">CHECK-IN</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[90px]">INGRESS</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[100px]">STATUS</th>
              <th className="py-3 px-2 text-center whitespace-nowrap min-w-[70px]">RECEIPT</th>
              <th className="py-3 px-3 text-right whitespace-nowrap min-w-[90px]">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hud-subtle text-xs">
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-hud-muted font-sans text-sm">
                  No matching records found in section manifest
                </td>
              </tr>
            ) : (
              filteredRoster.map((student, idx) => {
                const timeFormatted = student.tapTimestamp
                  ? new Date(student.tapTimestamp).toLocaleTimeString('en-US', {
                      hour12: false,
                    })
                  : null;

                const initials = `${student.firstName[0] || ''}${student.lastName[0] || ''}`.toUpperCase();

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
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-sky-300 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans font-bold text-sm text-hud-text group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors truncate">
                            {student.fullName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-hud-secondary mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {student.studentNumber}
                            </span>
                            <CopyButton
                              text={student.studentNumber}
                              label=""
                              className="p-0 text-hud-muted hover:text-sky-600 dark:hover:text-sky-400"
                            />
                            <span className="text-hud-muted">•</span>
                            <span className="text-hud-muted truncate max-w-[150px]">
                              {student.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                      {student.rfidUid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-hud-text bg-hud-elevated border border-hud-border px-2 py-0.5 rounded-lg shadow-sm">
                          <Tag className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          <span>0x{student.rfidUid}</span>
                        </span>
                      ) : (
                        <span className="text-hud-muted text-xs">UNBOUND</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                      {timeFormatted ? (
                        <span className="text-hud-text font-semibold num-tabular">
                          {timeFormatted}
                        </span>
                      ) : (
                        <span className="text-hud-muted text-xs font-mono">--:--:--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono whitespace-nowrap">
                      {student.authMethod ? (
                        <Badge
                          status={student.authMethod}
                          label={
                            student.authMethod === 'RFID_TAP'
                              ? 'RFID'
                              : student.authMethod === 'KEYPAD_OTP'
                              ? 'KEYPAD'
                              : student.authMethod
                          }
                          size="sm"
                          dot={false}
                        />
                      ) : (
                        <span className="text-hud-muted text-xs">PENDING</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge status={student.status} size="sm" />
                        {student.isManualOverride && (
                          <span
                            title={`Override: ${student.overrideReason || 'Manual adjustment'}`}
                            className="text-[10px] font-mono font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full"
                          >
                            OVERRIDE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      {student.reverseReceiptSent ? (
                        <span
                          title="Reverse-receipt attendance notification dispatched to student email"
                          className="inline-flex text-emerald-500 dark:text-emerald-400"
                        >
                          <MailCheck className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-hud-muted font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onOpenOverride(student)}
                        leftIcon={<Edit3 className="w-3.5 h-3.5 text-hud-secondary" />}
                        className="py-1 px-2.5 text-xs hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold"
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
