import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'glow';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ripple?: boolean;
  children: React.ReactNode;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  ripple = true,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";
  
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-foreground focus:ring-orange-500/50 shadow-sm hover:shadow-lg hover:shadow-orange-500/25",
    secondary: "bg-zinc-700 hover:bg-zinc-600 text-foreground focus:ring-zinc-500 shadow-sm hover:shadow-md",
    outline: "border border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-foreground hover:bg-zinc-800 focus:ring-zinc-500",
    ghost: "text-zinc-400 hover:text-foreground hover:bg-zinc-800/50 focus:ring-zinc-500",
    gradient: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-foreground focus:ring-blue-500/50 shadow-sm hover:shadow-lg hover:shadow-blue-500/25",
    glow: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-foreground focus:ring-orange-500/50 shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105"
  };

  const sizes = {
    xs: "px-2 py-1 text-xs h-6 gap-1",
    sm: "px-3 py-1.5 text-sm h-8 gap-1.5",
    md: "px-4 py-2 text-sm h-10 gap-2",
    lg: "px-6 py-3 text-base h-12 gap-2",
    xl: "px-8 py-4 text-lg h-14 gap-3"
  };

  const rippleClasses = ripple ? "active:scale-95" : "";

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        rippleClasses,
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isLoading && leftIcon && <span>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span>{rightIcon}</span>}
    </button>
  );
};