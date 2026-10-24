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
      className={`bg-hud-surface border border-hud-border text-hud-text relative rounded-xl shadow-md ${className}`}
    >
      {(title || action || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-hud-border/60 bg-hud-elevated/30 rounded-t-xl gap-2">
          <div>
            {title && (
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans font-semibold text-sm tracking-wide text-hud-text">
                  {title}
                </h3>
                {badge && <div>{badge}</div>}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-hud-secondary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="text-xs">{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
