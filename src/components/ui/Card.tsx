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
      className={`bg-slate-900/60 border border-white/[0.06] text-hud-text relative rounded-2xl shadow-xl backdrop-blur-sm transition-all ${className}`}
    >
      {(title || action || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/[0.05] rounded-t-2xl gap-2">
          <div>
            {title && (
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans font-bold text-sm tracking-tight text-white">
                  {title}
                </h3>
                {badge && <div>{badge}</div>}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 font-body">
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
