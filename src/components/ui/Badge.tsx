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

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  // Default: Crisp neutral technical chip
  let colorClasses = 'bg-hud-elevated/70 text-hud-secondary border-hud-border/70';
  let dotColor = 'bg-hud-secondary';

  if (norm === 'PRESENT' || norm === 'OPEN') {
    colorClasses = 'bg-hud-lime-bg text-emerald-400 border-hud-lime-border';
    dotColor = 'bg-emerald-400';
  } else if (norm === 'LATE') {
    colorClasses = 'bg-hud-amber-bg text-amber-400 border-hud-amber-border';
    dotColor = 'bg-amber-400';
  } else if (norm === 'CUT' || norm === 'ABSENT' || norm === 'LOCKED' || norm === 'CLOSED') {
    colorClasses = 'bg-hud-rose-bg text-rose-400 border-hud-rose-border';
    dotColor = 'bg-rose-400';
  } else if (norm === 'EXCUSED') {
    colorClasses = 'bg-hud-slate-bg text-slate-300 border-hud-slate-border';
    dotColor = 'bg-slate-400';
  } else if (norm === 'RFID_TAP' || norm === 'KEYPAD_OTP' || norm === 'AUTO_ABSENT') {
    colorClasses = 'bg-hud-elevated/80 text-hud-secondary border-hud-border/60';
    dotColor = 'bg-hud-secondary';
  } else if (norm === 'MANUAL_OVERRIDE') {
    colorClasses = 'bg-hud-elevated text-hud-text border-hud-border';
    dotColor = 'bg-amber-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium border tracking-wide uppercase select-none rounded-md transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
