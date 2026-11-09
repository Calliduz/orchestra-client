import React from 'react';

export type BadgeStatus =
  | 'PRESENT'
  | 'LATE'
  | 'CUT'
  | 'EXCUSED'
  | 'ABSENT'
  | 'OPEN'
  | 'CLOSED'
  | 'LOCKED'
  | 'RFID_TAP'
  | 'KEYPAD_OTP'
  | 'MANUAL_OVERRIDE'
  | 'AUTO_ABSENT'
  | string;

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  className = '',
  size = 'md',
  dot = true,
}) => {
  const norm = status?.toUpperCase() || '';
  const displayLabel = label || norm.replace(/_/g, ' ');

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1';

  // Default: Crisp neutral technical chip
  let colorClasses = 'bg-slate-800/80 text-slate-300 border-slate-700/80';
  let dotColor = 'bg-slate-400';

  if (norm === 'PRESENT' || norm === 'OPEN') {
    colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    dotColor = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]';
  } else if (norm === 'LATE') {
    colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]';
  } else if (norm === 'CUT' || norm === 'ABSENT' || norm === 'LOCKED' || norm === 'CLOSED') {
    colorClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]';
  } else if (norm === 'EXCUSED') {
    colorClasses = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    dotColor = 'bg-sky-500 shadow-[0_0_6px_rgba(56,189,248,0.7)]';
  } else if (norm === 'RFID_TAP' || norm === 'KEYPAD_OTP' || norm === 'AUTO_ABSENT') {
    colorClasses = 'bg-slate-800/90 text-slate-300 border-slate-700/80';
    dotColor = 'bg-sky-400';
  } else if (norm === 'MANUAL_OVERRIDE') {
    colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-500/30';
    dotColor = 'bg-amber-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-semibold border tracking-wide uppercase select-none rounded-full transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
