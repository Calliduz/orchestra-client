import React, { useState } from 'react';
import { Search, MailCheck, MailWarning, Edit3, ShieldCheck, Tag, Clock } from 'lucide-react';
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
              className={`px-2.5 py-1 border transition-colors ${
                statusFilter === filter
                  ? 'bg-[#15200A] text-[#CCFF00] border-[#395316] font-bold shadow-[0_0_8px_rgba(204,255,0,0.15)]'
                  : 'bg-[#0E131A] text-[#7E8B9B] border-[#1E2632] hover:border-[#384659] hover:text-[#E2E8F0]'
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
      <div className="p-3 border-b border-[#1E2632] bg-[#0A0D12] flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, or institutional email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-[#1E2632] bg-[#0E131A] text-[#E2E8F0] focus:outline-none focus:border-[#CCFF00] rounded-none placeholder:text-[#525F70]"
          />
        </div>

        <div className="text-[11px] font-mono text-[#7E8B9B]">
          MATCHED: <span className="text-[#CCFF00] font-bold num-tabular">{filteredRoster.length}</span> / {roster.length}
        </div>
      </div>

      {/* High-Density Tabular Ledger */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#E2E8F0]">
          <thead className="bg-[#0E131A] text-[10px] font-mono font-semibold text-[#7E8B9B] uppercase tracking-wider border-b border-[#1E2632]">
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
          <tbody className="divide-y divide-[#171E28]">
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#6A7888] font-mono text-xs">
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
                    className="hover:bg-[#121721] transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-[#525F70] text-[11px] font-mono">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#CBD5E1]">
                          {student.studentNumber}
                        </span>
                        <CopyButton text={student.studentNumber} label="" className="border-0 bg-transparent p-0" />
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-none bg-[#161D27] border border-[#263140] flex items-center justify-center text-[10px] font-mono font-bold text-[#CCFF00] shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-sans font-medium text-xs text-[#F1F5F9] group-hover:text-[#CCFF00] transition-colors">
                            {student.fullName}
                          </div>
                          <div className="font-mono text-[10px] text-[#6A7888]">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {student.rfidUid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#A5B4FC] bg-[#11162B] border border-[#252E58] px-1.5 py-0.2">
                          <Tag className="w-2.5 h-2.5 opacity-60" />
                          <span>0x{student.rfidUid}</span>
                        </span>
                      ) : (
                        <span className="text-[#525F70] text-[10px]">UNBOUND</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {timeFormatted ? (
                        <span className="text-[#E2E8F0] font-medium num-tabular">
                          {timeFormatted}
                        </span>
                      ) : (
                        <span className="text-[#525F70] text-[11px]">--:--:--</span>
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
                        <span className="text-[#525F70] text-[10px]">PENDING</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge status={student.status} size="sm" />
                        {student.isManualOverride && (
                          <span
                            title={`Override: ${student.overrideReason || 'Manual adjustment'}`}
                            className="text-[9px] font-mono text-[#C084FC] bg-[#1E112B] border border-[#44265E] px-1 py-0.2"
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
                          className="inline-flex text-[#CCFF00]"
                        >
                          <MailCheck className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-[#3E4A5B] font-mono text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onOpenOverride(student)}
                        leftIcon={<Edit3 className="w-3 h-3 text-[#94A3B8]" />}
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
