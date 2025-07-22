
import React from 'react';
import { cn } from '@/lib/utils';

interface YodelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  withHover?: boolean;
  gradientColor?: 'orange' | 'blue' | 'dark';
  withGlow?: boolean;
}

export const YodelCard: React.FC<YodelCardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className,
  withHover = false,
  gradientColor = 'orange',
  withGlow = false,
  ...props
}) => {
  const baseClasses = "rounded-xl transition-all duration-200";
  
  const variants = {
    default: "bg-yodel-richBlack-light border border-zinc-800",
    elevated: "bg-yodel-richBlack-light border border-zinc-800 shadow-lg",
    outlined: "bg-transparent border-2 border-zinc-700 hover:border-zinc-600",
    glass: "bg-yodel-richBlack-light/50 backdrop-blur-sm border border-zinc-800/50 shadow-lg",
    gradient: gradientColor === 'orange' 
      ? "bg-gradient-to-br from-yodel-orange/10 to-transparent border border-yodel-orange/20" 
      : gradientColor === 'blue'
        ? "bg-gradient-to-br from-yodel-blue/10 to-transparent border border-yodel-blue/20"
        : "bg-gradient-to-br from-zinc-800 to-yodel-richBlack border border-zinc-700"
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const hoverClasses = withHover 
    ? "hover:-translate-y-1 hover:shadow-xl" 
    : "";
    
  const glowClasses = withGlow
    ? gradientColor === 'orange'
      ? "shadow-glow-sm hover:shadow-glow"
      : gradientColor === 'blue'
        ? "shadow-glow-blue-sm hover:shadow-glow-blue"
        : ""
    : "";

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        paddings[padding],
        hoverClasses,
        glowClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface YodelCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  withBorder?: boolean;
}

export const YodelCardHeader: React.FC<YodelCardHeaderProps> = ({
  children,
  className,
  withBorder = false,
  ...props
}) => (
  <div className={cn(
    "mb-4",
    withBorder && "pb-4 border-b border-zinc-800",
    className
  )} {...props}>
    {children}
  </div>
);

interface YodelCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const YodelCardContent: React.FC<YodelCardContentProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("", className)} {...props}>
    {children}
  </div>
);

interface YodelCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  withBorder?: boolean;
}

export const YodelCardFooter: React.FC<YodelCardFooterProps> = ({
  children,
  className,
  withBorder = true,
  ...props
}) => (
  <div className={cn(
    "mt-6",
    withBorder && "pt-4 border-t border-zinc-800",
    className
  )} {...props}>
    {children}
  </div>
);
