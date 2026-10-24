import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  withCorners?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  bodyClassName = '',
  withCorners = false,
}) => {
  return (
    <div
      className={`bg-[#0D1117] border border-[#1E2632] text-[#E2E8F0] shadow-sm relative ${
        withCorners ? 'corner-hud' : ''
      } ${className}`}
    >
      {(title || action || badge) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2632] bg-[#111720]/80">
          <div>
            {title && (
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans font-semibold text-xs tracking-wider uppercase text-[#F1F5F9]">
                  {title}
                </h3>
                {badge && <div>{badge}</div>}
              </div>
            )}
            {subtitle && (
              <p className="font-mono text-[11px] text-[#7E8B9B] mt-0.5 tracking-tight">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="font-mono text-xs">{action}</div>}
        </div>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
