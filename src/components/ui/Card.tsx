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
      className={`bg-hud-surface border border-hud-border text-hud-text relative rounded-sm ${
        withCorners ? 'corner-hud' : ''
      } ${className}`}
    >
      {(title || action || badge) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-hud-border bg-hud-elevated rounded-t-sm">
          <div>
            {title && (
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans font-semibold text-xs tracking-wider uppercase text-hud-text">
                  {title}
                </h3>
                {badge && <div>{badge}</div>}
              </div>
            )}
            {subtitle && (
              <p className="font-mono text-[11px] text-hud-secondary mt-0.5 tracking-tight">
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
