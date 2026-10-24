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
      title="Section Ingress Manifest"
      subtitle={`Enrolled Records: ${roster.length} active students in database`}
      action={
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {['ALL', 'PRESENT', 'LATE', 'CUT', 'EXCUSED', 'ABSENT'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 border rounded-sm transition-all ${
                statusFilter === filter
                  ? 'bg-hud-lime-bg text-hud-lime border-hud-lime-border font-bold shadow-[0_0_8px_rgba(204,255,0,0.1)]'
                  : 'bg-hud-surface text-hud-secondary border-hud-border hover:border-hud-muted hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      }
      bodyClassName="p-0"
    >
      {/* Search Header Strip */}
      <div className="p-3 border-b border-hud-border bg-hud-surface flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-hud-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, or institutional email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-hud-border bg-hud-bg text-hud-text focus:outline-none focus:border-hud-lime rounded-sm placeholder:text-hud-muted transition-colors"
          />
        </div>

        <div className="text-[11px] font-mono text-hud-secondary">
          MATCHED: <span className="text-hud-lime font-bold num-tabular">{filteredRoster.length}</span> / {roster.length}
        </div>
      </div>

      {/* High-Density Tabular Ledger */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-hud-text">
          <thead className="bg-hud-elevated text-[10px] font-mono font-semibold text-hud-secondary uppercase tracking-wider border-b border-hud-border">
            <tr>
              <th className="py-2.5 px-3 w-8">#</th>
              <th className="py-2.5 px-3">STUDENT ID</th>
              <th className="py-2.5 px-3">STUDENT / CREDENTIAL</th>
              <th className="py-2.5 px-3">RFID UID</th>
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">METHOD</th>
              <th className="py-2.5 px-3">STATUS</th>
              <th className="py-2.5 px-3 text-center">RECEIPT</th>
              <th className="py-2.5 px-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hud-subtle">
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-hud-muted font-mono text-xs">
                  NO MATCHING RECORDS IN SECTION MANIFEST
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
                    className="hover:bg-hud-hover/60 transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-hud-muted text-[11px] font-mono">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-hud-secondary group-hover:text-hud-text transition-colors">
                          {student.studentNumber}
                        </span>
                        <CopyButton text={student.studentNumber} label="" className="border-0 bg-transparent p-0" />
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-sm bg-hud-elevated border border-hud-border flex items-center justify-center text-[10px] font-mono font-bold text-hud-lime shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-sans font-medium text-xs text-hud-text group-hover:text-hud-lime transition-colors">
                            {student.fullName}
                          </div>
                          <div className="font-mono text-[10px] text-hud-muted">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {student.rfidUid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-hud-secondary bg-hud-elevated border border-hud-border px-1.5 py-0.2 rounded-sm">
                          <Tag className="w-2.5 h-2.5 opacity-60 text-hud-muted" />
                          <span>0x{student.rfidUid}</span>
                        </span>
                      ) : (
                        <span className="text-hud-muted text-[10px]">UNBOUND</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {timeFormatted ? (
                        <span className="text-hud-text font-medium num-tabular">
                          {timeFormatted}
                        </span>
                      ) : (
                        <span className="text-hud-muted text-[11px]">--:--:--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
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
                        <span className="text-hud-muted text-[10px]">PENDING</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge status={student.status} size="sm" />
                        {student.isManualOverride && (
                          <span
                            title={`Override: ${student.overrideReason || 'Manual adjustment'}`}
                            className="text-[9px] font-mono text-hud-amber bg-hud-amber-bg border border-hud-amber-border px-1 py-0.2 rounded-sm"
                          >
                            OVERRIDE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {student.reverseReceiptSent ? (
                        <span
                          title="Reverse-receipt attendance notification dispatched to student email"
                          className="inline-flex text-hud-lime"
                        >
                          <MailCheck className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-hud-muted font-mono text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onOpenOverride(student)}
                        leftIcon={<Edit3 className="w-3 h-3 text-hud-secondary" />}
                        className="py-1 px-2 text-[10px]"
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
