import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.js';
import { Badge, BadgeStatus } from '../ui/Badge.js';

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

  const handleSubmit = async () => {
    if (!student) return;
    if (!reason.trim()) {
      setError('Please provide an official justification remark.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onApplyOverride(student.studentNumber || student.id, status, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Override application failed');
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
      <div className="space-y-4 font-mono text-xs">
        {/* Student Summary */}
        <div className="p-3 bg-hud-bg border border-hud-border flex items-center justify-between rounded-sm">
          <div>
            <div className="font-bold text-hud-text text-sm font-sans">
              {student.fullName}
            </div>
            <div className="text-[11px] text-hud-secondary font-mono mt-0.5">
              ID: {student.studentNumber} · {student.email}
            </div>
          </div>
          <div>
            <Badge status={student.status} size="sm" />
          </div>
        </div>

        {/* Status Selection */}
        <div>
          <label htmlFor="status-select" className="block text-[11px] text-hud-secondary uppercase tracking-wider mb-1.5 font-medium">
            Target Status Flag
          </label>
          <select
            id="status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-hud-border bg-hud-bg text-hud-text font-mono text-xs focus:border-hud-lime focus:outline-none rounded-sm transition-colors"
          >
            <option value="PRESENT">PRESENT — On-Time Ingress</option>
            <option value="LATE">LATE — Tardy Grace Period</option>
            <option value="CUT">CUT — Cut-Off Threshold Exceeded</option>
            <option value="EXCUSED">EXCUSED — Authorized Absence (Clinic/Dean)</option>
            <option value="ABSENT">ABSENT — Unverified / Non-Attendance</option>
          </select>
        </div>

        {/* Reason / Remarks */}
        <div>
          <label htmlFor="reason-input" className="block text-[11px] text-hud-secondary uppercase tracking-wider mb-1.5 font-medium">
            Justification Memo
          </label>
          <input
            id="reason-input"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. University Clinic Referral - Acute Fever"
            className="w-full px-3 py-2 border border-hud-border bg-hud-bg text-hud-text font-mono text-xs focus:border-hud-lime focus:outline-none rounded-sm placeholder:text-hud-muted transition-colors"
          />
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {['Clinic Medical Referral', "Dean's Excused Slip", 'Card Reader Hardware Misread', 'Official University Delegation'].map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="px-2 py-0.5 text-[10px] border border-hud-border bg-hud-elevated hover:border-hud-lime text-hud-secondary hover:text-hud-lime rounded-sm transition-colors"
                >
                  +{preset}
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="p-2.5 border border-hud-rose-border bg-hud-rose-bg text-hud-rose text-xs rounded-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OverrideModal;
