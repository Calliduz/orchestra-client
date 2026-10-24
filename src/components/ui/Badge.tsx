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

  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  // Default: Crisp neutral technical chip
  let colorClasses = 'bg-hud-elevated text-hud-secondary border-hud-border';
  let dotColor = 'bg-hud-secondary';

  if (norm === 'PRESENT' || norm === 'OPEN') {
    // Verified / Active / Present -> Phosphor Lime
    colorClasses = 'bg-hud-lime-bg text-hud-lime border-hud-lime-border';
    dotColor = 'bg-hud-lime';
  } else if (norm === 'LATE') {
    // Tardy / Grace window -> Amber
    colorClasses = 'bg-hud-amber-bg text-hud-amber border-hud-amber-border';
    dotColor = 'bg-hud-amber';
  } else if (norm === 'CUT' || norm === 'ABSENT' || norm === 'LOCKED' || norm === 'CLOSED') {
    // Incomplete / Absent / Locked -> Restrained Rose
    colorClasses = 'bg-hud-rose-bg text-hud-rose border-hud-rose-border';
    dotColor = 'bg-hud-rose';
  } else if (norm === 'EXCUSED') {
    // Excused slip -> Restrained Slate
    colorClasses = 'bg-hud-slate-bg text-hud-slate border-hud-slate-border';
    dotColor = 'bg-hud-slate';
  } else if (norm === 'RFID_TAP' || norm === 'KEYPAD_OTP' || norm === 'AUTO_ABSENT') {
    // Hardware Methods -> Neutral Monochrome Chip
    colorClasses = 'bg-hud-elevated text-hud-secondary border-hud-border';
    dotColor = 'bg-hud-secondary';
  } else if (norm === 'MANUAL_OVERRIDE') {
    colorClasses = 'bg-hud-elevated text-hud-text border-hud-border';
    dotColor = 'bg-hud-amber';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium border tracking-wider uppercase select-none rounded-sm transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
