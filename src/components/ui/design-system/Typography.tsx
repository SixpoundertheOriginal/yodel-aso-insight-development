
import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export const Heading1: React.FC<TypographyProps> = ({ children, className }) => (
  <h1 className={cn("text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight", className)}>
    {children}
  </h1>
);

export const Heading2: React.FC<TypographyProps> = ({ children, className }) => (
  <h2 className={cn("text-2xl md:text-3xl font-semibold text-white leading-tight tracking-tight", className)}>
    {children}
  </h2>
);

export const Heading3: React.FC<TypographyProps> = ({ children, className }) => (
  <h3 className={cn("text-xl md:text-2xl font-semibold text-white leading-snug", className)}>
    {children}
  </h3>
);

export const Heading4: React.FC<TypographyProps> = ({ children, className }) => (
  <h4 className={cn("text-lg md:text-xl font-medium text-white leading-snug", className)}>
    {children}
  </h4>
);

export const GradientHeading: React.FC<TypographyProps & { variant?: 'orange' | 'blue' }> = ({ 
  children, 
  className,
  variant = 'orange'
}) => (
  <h2 className={cn(
    "text-2xl md:text-3xl font-bold leading-tight tracking-tight",
    variant === 'orange' ? "text-gradient-orange-vibrant" : "text-gradient-blue-vibrant",
    className
  )}>
    {children}
  </h2>
);

export const Body: React.FC<TypographyProps> = ({ children, className }) => (
  <p className={cn("text-base text-zinc-300 leading-relaxed", className)}>
    {children}
  </p>
);

export const BodyLarge: React.FC<TypographyProps> = ({ children, className }) => (
  <p className={cn("text-lg text-zinc-300 leading-relaxed", className)}>
    {children}
  </p>
);

export const BodySmall: React.FC<TypographyProps> = ({ children, className }) => (
  <p className={cn("text-sm text-zinc-400 leading-normal", className)}>
    {children}
  </p>
);

export const Caption: React.FC<TypographyProps> = ({ children, className }) => (
  <span className={cn("text-xs text-zinc-500 leading-normal", className)}>
    {children}
  </span>
);

export const Label: React.FC<TypographyProps & React.ComponentPropsWithoutRef<'label'>> = ({ 
  children, 
  className, 
  ...props 
}) => (
  <label {...props} className={cn("text-sm font-medium text-zinc-300 leading-normal", className)}>
    {children}
  </label>
);

export const Badge: React.FC<TypographyProps & { variant?: 'success' | 'warning' | 'error' | 'info' | 'default' }> = ({ 
  children, 
  className,
  variant = 'default'
}) => {
  const variantClasses = {
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    default: "bg-zinc-800 text-zinc-300 border-zinc-700"
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border",
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
};

export const Highlight: React.FC<TypographyProps & { variant?: 'orange' | 'blue' }> = ({ 
  children, 
  className,
  variant = 'orange'
}) => (
  <span className={cn(
    "font-medium",
    variant === 'orange' ? "text-yodel-orange" : "text-yodel-blue",
    className
  )}>
    {children}
  </span>
);
