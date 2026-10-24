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

  let colorClasses = 'bg-[#12161D] text-[#94A3B8] border-[#242D38]';
  let dotColor = 'bg-[#94A3B8]';

  if (norm === 'PRESENT' || norm === 'OPEN') {
    colorClasses = 'bg-[#112209] text-[#CCFF00] border-[#29420D]';
    dotColor = 'bg-[#CCFF00]';
  } else if (norm === 'LATE') {
    colorClasses = 'bg-[#221603] text-[#F59E0B] border-[#4D3308]';
    dotColor = 'bg-[#F59E0B]';
  } else if (norm === 'CUT') {
    colorClasses = 'bg-[#261204] text-[#FB923C] border-[#57270D]';
    dotColor = 'bg-[#FB923C]';
  } else if (norm === 'EXCUSED') {
    colorClasses = 'bg-[#081B24] text-[#38BDF8] border-[#133F54]';
    dotColor = 'bg-[#38BDF8]';
  } else if (norm === 'ABSENT' || norm === 'LOCKED' || norm === 'CLOSED') {
    colorClasses = 'bg-[#220B0B] text-[#F87171] border-[#4A1515]';
    dotColor = 'bg-[#F87171]';
  } else if (norm === 'RFID_TAP') {
    colorClasses = 'bg-[#101429] text-[#A5B4FC] border-[#242E5E]';
    dotColor = 'bg-[#818CF8]';
  } else if (norm === 'KEYPAD_OTP') {
    colorClasses = 'bg-[#061D1C] text-[#5EEAD4] border-[#134945]';
    dotColor = 'bg-[#2DD4BF]';
  } else if (norm === 'MANUAL_OVERRIDE') {
    colorClasses = 'bg-[#1C1129] text-[#D8B4FE] border-[#422666]';
    dotColor = 'bg-[#C084FC]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium border tracking-wider uppercase select-none ${sizeClasses} ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
