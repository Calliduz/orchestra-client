import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Scissors, FileCheck, UserX } from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { Badge, BadgeStatus } from '../ui/Badge.js';
import { sounds } from '../../utils/audio.js';

interface StudentRosterItem {
  id: string;
  studentNumber: string;
  fullName: string;
  email: string;
  status: BadgeStatus;
  overrideReason?: string | null;
}

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRosterItem | null;
  onApplyOverride: (studentId: string, status: string, reason: string) => Promise<void>;
}

const STATUS_OPTIONS: {
  status: BadgeStatus;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  colorActive: string;
  borderActive: string;
  bgActive: string;
  textActive: string;
}[] = [
  {
    status: 'PRESENT',
    label: 'PRESENT',
    desc: 'On-time arrival (< late threshold)',
    icon: CheckCircle2,
    colorActive: 'emerald',
    borderActive: 'border-emerald-500 dark:border-emerald-400',
    bgActive: 'bg-emerald-50 dark:bg-emerald-950/30',
    textActive: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    status: 'LATE',
    label: 'LATE',
    desc: 'Tardy grace window exceeded',
    icon: Clock,
    colorActive: 'amber',
    borderActive: 'border-amber-500 dark:border-amber-400',
    bgActive: 'bg-amber-50 dark:bg-amber-950/30',
    textActive: 'text-amber-700 dark:text-amber-300',
  },
  {
    status: 'CUT',
    label: 'CUT',
    desc: 'Exceeded cut-off punctuality limit',
    icon: Scissors,
    colorActive: 'rose',
    borderActive: 'border-rose-500 dark:border-rose-400',
    bgActive: 'bg-rose-50 dark:bg-rose-950/30',
    textActive: 'text-rose-700 dark:text-rose-300',
  },
  {
    status: 'EXCUSED',
    label: 'EXCUSED',
    desc: 'Authorized absence (Clinic / Dean)',
    icon: FileCheck,
    colorActive: 'sky',
    borderActive: 'border-sky-500 dark:border-sky-400',
    bgActive: 'bg-sky-50 dark:bg-sky-950/30',
    textActive: 'text-sky-700 dark:text-sky-300',
  },
  {
    status: 'ABSENT',
    label: 'ABSENT',
    desc: 'Unverified / No ingress recorded',
    icon: UserX,
    colorActive: 'slate',
    borderActive: 'border-slate-500 dark:border-slate-400',
    bgActive: 'bg-slate-100 dark:bg-slate-800/80',
    textActive: 'text-slate-800 dark:text-slate-200',
  },
];

const QUICK_JUSTIFICATIONS = [
  'University Clinic Medical Referral',
  "Dean's Office Excused Slip",
  'Reader Hardware Misread / Card Error',
  'Official University Competition',
  'Severe Transit Delay / Flash Flood',
];

export const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  student,
  onApplyOverride,
}) => {
  const [status, setStatus] = useState<string>('EXCUSED');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setStatus(student.status || 'EXCUSED');
      setReason(student.overrideReason || 'University Clinic Medical Referral');
      setError(null);
    }
  }, [student]);

  const handleSelectStatus = (newStatus: string) => {
    setStatus(newStatus);
    sounds.playKeyChirp();
  };

  const handleSelectPresetReason = (preset: string) => {
    setReason(preset);
    sounds.playKeyChirp();
  };

  const handleSubmit = async () => {
    if (!student) return;
    if (!reason.trim()) {
      setError('Please provide an official justification remark.');
      sounds.playErrorBuzz();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onApplyOverride(student.studentNumber || student.id, status, reason.trim());
      sounds.playSuccessChime();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Override application failed');
      sounds.playErrorBuzz();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Attendance Override"
      description={`Override ingress record for ${student.fullName} (${student.studentNumber})`}
      confirmLabel="Apply Override"
      confirmVariant="primary"
      onConfirm={handleSubmit}
      isLoading={isSubmitting}
    >
      <div className="space-y-4 font-body text-xs">
        {/* Student Summary Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between rounded-xl shadow-tactile">
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm font-sans">
              {student.fullName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ID: {student.studentNumber} · {student.email}
            </div>
          </div>
          <div>
            <Badge status={student.status} size="sm" />
          </div>
        </div>

        {/* Interactive Status Card Grid */}
        <div>
          <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-sans">
            Target Status Classification
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = status === opt.status;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.status}
                  type="button"
                  onClick={() => handleSelectStatus(opt.status)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all shadow-xs ${
                    isSelected
                      ? `${opt.borderActive} ${opt.bgActive} ring-2 ring-sky-500/30`
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? opt.textActive
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-sans font-bold text-xs ${
                          isSelected
                            ? opt.textActive
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason / Remarks */}
        <div>
          <label htmlFor="reason-input" className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-sans">
            Official Justification Memo
          </label>
          <input
            id="reason-input"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. University Clinic Medical Referral"
            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-body text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none rounded-xl placeholder:text-slate-400 transition-colors shadow-tactile"
          />

          {/* 1-Click Quick Justification Chips */}
          <div className="mt-2.5 space-y-1.5">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick Justification Presets:
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_JUSTIFICATIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPresetReason(preset)}
                  className="px-2.5 py-1 text-[11px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 text-slate-600 dark:text-slate-300 rounded-lg shadow-2xs transition-colors"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs rounded-xl shadow-xs">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OverrideModal;
