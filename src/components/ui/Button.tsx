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
    'inline-flex items-center justify-center font-mono font-medium tracking-wide uppercase transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-[#CCFF00] disabled:opacity-35 disabled:cursor-not-allowed select-none rounded-none';

  const sizeStyles = {
    sm: 'text-[10px] px-2.5 py-1.5 gap-1.5 border',
    md: 'text-xs px-3.5 py-2 gap-2 border',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5 border',
  };

  const variantStyles = {
    primary:
      'bg-[#CCFF00] hover:bg-[#D4FF1A] active:bg-[#B8E600] text-[#080A0D] font-bold border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.18)] hover:shadow-[0_0_14px_rgba(204,255,0,0.3)]',
    secondary:
      'bg-[#141A23] hover:bg-[#1A222E] active:bg-[#10151C] text-[#E2E8F0] border-[#253040] hover:border-[#3E4D63]',
    danger:
      'bg-[#DC2626] hover:bg-[#EF4444] active:bg-[#B91C1C] text-white font-bold border-[#DC2626] shadow-[0_0_10px_rgba(220,38,38,0.25)]',
    outline:
      'bg-transparent hover:bg-[#121720] active:bg-[#171E2A] text-[#CBD5E1] border-[#253040] hover:border-[#CCFF00] hover:text-[#CCFF00]',
    ghost:
      'bg-transparent hover:bg-[#121720] text-[#8C98A8] hover:text-[#F1F5F9] border-transparent',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
