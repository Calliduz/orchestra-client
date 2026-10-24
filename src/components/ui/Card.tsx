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
}) => {
  return (
    <div
      className={`bg-hud-surface border border-hud-border text-hud-text relative rounded-2xl shadow-tactile transition-shadow hover:shadow-md ${className}`}
    >
      {(title || action || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-hud-border/70 bg-hud-elevated/30 rounded-t-2xl gap-2">
          <div>
            {title && (
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans font-bold text-sm tracking-tight text-hud-text">
                  {title}
                </h3>
                {badge && <div>{badge}</div>}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-hud-secondary mt-0.5 font-body">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="text-xs">{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
