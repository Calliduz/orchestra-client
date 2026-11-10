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
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/40 border border-white/[0.05] rounded-xl overflow-x-auto">
          {(['ALL', 'PRESENT', 'LATE', 'CUT', 'EXCUSED', 'ABSENT'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === filter
                  ? 'bg-sky-600/30 text-sky-300 font-bold border border-sky-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <span>{filter}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === filter
                    ? 'bg-sky-500/20 text-sky-300 font-bold'
                    : 'bg-slate-800 text-slate-400'
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
      <div className="p-4 border-b border-white/[0.04] bg-slate-900/20 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-white/[0.06] bg-slate-950/40 text-slate-200 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 rounded-xl placeholder:text-slate-500 transition-colors font-body"
          />
        </div>

        <div className="text-xs text-slate-400 font-body">
          Records matched:{' '}
          <span className="text-sky-400 font-bold font-mono num-tabular">
            {filteredRoster.length}
          </span>{' '}
          of {roster.length}
        </div>
      </div>

      {/* Spacious High-Readability Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.05]">
            <tr>
              <th className="py-3 px-3.5 w-10 text-center">#</th>
              <th className="py-3 px-3.5 min-w-[210px]">STUDENT &amp; CREDENTIAL</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[95px]">RFID UID</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[110px]">CHECK-IN &amp; INGRESS</th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[110px]">STATUS</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap w-24">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03] text-xs">
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-hud-muted font-sans text-sm">
                  No matching records found in section manifest
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
                        <div className="w-8 h-8 rounded-full bg-slate-800/60 border border-white/[0.06] text-sky-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
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
                        className="py-1 px-3 text-xs bg-hud-surface hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border-hud-border/80 shadow-xs"
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
