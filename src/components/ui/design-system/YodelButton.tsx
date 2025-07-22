
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface YodelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  withGlow?: boolean;
}

export const YodelButton: React.FC<YodelButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  withGlow = false,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yodel-richBlack disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 hover:-translate-y-0.5";
  
  const variants = {
    primary: "bg-yodel-orange hover:bg-yodel-orange-600 text-white focus:ring-yodel-orange/50 shadow-sm hover:shadow-md",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-white focus:ring-zinc-600/50 shadow-sm hover:shadow-md",
    outline: "border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-800/50 focus:ring-zinc-600/50",
    ghost: "text-zinc-400 hover:text-white hover:bg-zinc-800/50 focus:ring-zinc-600/50",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50 shadow-sm hover:shadow-md",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500/50 shadow-sm hover:shadow-md"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm h-8 gap-1.5",
    md: "px-4 py-2 text-sm h-10 gap-2",
    lg: "px-6 py-3 text-base h-12 gap-2.5"
  };

  const glowEffects = {
    primary: withGlow ? "shadow-glow-sm hover:shadow-glow" : "",
    secondary: "",
    outline: "",
    ghost: "",
    danger: withGlow ? "shadow-glow-sm hover:shadow-glow" : "",
    success: withGlow ? "shadow-glow-sm hover:shadow-glow" : ""
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        glowEffects[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && leftIcon && <span className={size === 'sm' ? "mr-1" : "mr-2"}>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className={size === 'sm' ? "ml-1" : "ml-2"}>{rightIcon}</span>}
    </button>
  );
};
