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
    'inline-flex items-center justify-center font-sans font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-xl';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-0 gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] min-w-[44px] sm:min-w-0 gap-2',
    lg: 'text-sm px-5 py-3 min-h-[44px] min-w-[44px] sm:min-w-0 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-bold shadow-md shadow-sky-600/20 border border-sky-400/20',
    secondary:
      'bg-slate-800/40 hover:bg-slate-800 active:scale-[0.98] text-slate-200 hover:text-white border border-white/[0.08] hover:border-white/[0.15] shadow-xs',
    danger:
      'bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 font-semibold border border-rose-500/20 hover:border-rose-500 transition-colors shadow-xs',
    outline:
      'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/[0.15] shadow-xs',
    ghost:
      'bg-transparent hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border-0',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="inline-flex items-center shrink-0">{leftIcon}</span>
      )}
      <span className="inline-flex items-center leading-none">{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex items-center shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
