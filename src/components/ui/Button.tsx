import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-mono tracking-wide uppercase transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-hud-lime disabled:opacity-35 disabled:cursor-not-allowed select-none rounded-sm';

  const sizeStyles = {
    sm: 'text-[10px] px-2.5 py-1.5 gap-1.5 border',
    md: 'text-xs px-3.5 py-2 gap-2 border',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5 border',
  };

  const variantStyles = {
    primary:
      'bg-hud-lime hover:brightness-105 active:scale-[0.98] text-black font-bold border-hud-lime shadow-[0_0_12px_rgba(204,255,0,0.18)]',
    secondary:
      'bg-hud-elevated hover:bg-hud-hover active:bg-hud-surface text-hud-text font-medium border-hud-border hover:border-hud-muted',
    danger:
      'bg-hud-rose-bg hover:bg-hud-rose hover:text-black text-hud-rose font-bold border-hud-rose-border transition-colors',
    outline:
      'bg-transparent hover:bg-hud-lime-bg text-hud-secondary border-hud-border hover:border-hud-lime hover:text-hud-lime',
    ghost:
      'bg-transparent hover:bg-hud-hover text-hud-secondary hover:text-hud-text border-transparent',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
