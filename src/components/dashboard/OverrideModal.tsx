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
      setError('ERR_EMPTY_REASON: Provide an official justification remark.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onApplyOverride(student.studentNumber || student.id, status, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'ERR_OVERRIDE_FAILED');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MANUAL ATTENDANCE OVERRIDE"
      description={`Override ingress record for ${student.fullName} [${student.studentNumber}]`}
      confirmLabel="APPLY_OVERRIDE"
      confirmVariant="primary"
      onConfirm={handleSubmit}
      isLoading={isSubmitting}
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Student Summary */}
        <div className="p-3 bg-[#0C0F12] border border-[#212830] flex items-center justify-between">
          <div>
            <div className="font-bold text-[#E6EDF3] text-sm">
              {student.fullName}
            </div>
            <div className="text-[11px] text-[#7D8794]">
              ID: {student.studentNumber} // {student.email}
            </div>
          </div>
          <div>
            <Badge status={student.status} size="sm" />
          </div>
        </div>

        {/* Status Selection */}
        <div>
          <label htmlFor="status-select" className="block text-[10px] text-[#7D8794] uppercase tracking-wider mb-1 font-bold">
            // TARGET_STATUS_FLAG
          </label>
          <select
            id="status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-[#2D3540] bg-[#14191E] text-[#E6EDF3] font-mono text-xs focus:ring-1 focus:ring-[#CCFF00] focus:outline-none rounded-none"
          >
            <option value="PRESENT">[PRESENT] On-Time Ingress</option>
            <option value="LATE">[LATE] Tardy Grace Period</option>
            <option value="CUT">[CUT] Cut-Off Threshold Exceeded</option>
            <option value="EXCUSED">[EXCUSED] Authorized Absence (Clinic/Dean)</option>
            <option value="ABSENT">[ABSENT] Unverified / Non-Attendance</option>
          </select>
        </div>

        {/* Reason / Remarks */}
        <div>
          <label htmlFor="reason-input" className="block text-[10px] text-[#7D8794] uppercase tracking-wider mb-1 font-bold">
            // JUSTIFICATION_MEMO
          </label>
          <input
            id="reason-input"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. University Clinic Referral - Acute Fever"
            className="w-full px-3 py-2 border border-[#2D3540] bg-[#14191E] text-[#E6EDF3] font-mono text-xs focus:ring-1 focus:ring-[#CCFF00] focus:outline-none rounded-none"
          />
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {['Clinic Medical Referral', "Dean's Excused Slip", 'Card Reader Hardware Misread', 'Official University Delegation'].map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="px-2 py-0.5 text-[10px] border border-[#212830] bg-[#0C0F12] hover:border-[#CCFF00] text-[#7D8794] hover:text-[#CCFF00] transition"
                >
                  +{preset}
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="p-2 border border-[#5E1212] bg-[#260505] text-[#FF3333] text-[11px]">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
export default OverrideModal;
