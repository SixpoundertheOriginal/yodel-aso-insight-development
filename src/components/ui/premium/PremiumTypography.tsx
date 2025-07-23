import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  gradient?: 'orange' | 'blue' | 'success' | 'none';
  animated?: boolean;
}

export const PremiumTypography = {
  H1: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h1 className={cn(
      "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-white',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h1>
  ),

  H2: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h2 className={cn(
      "text-3xl md:text-4xl font-semibold leading-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-white',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h2>
  ),

  H3: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h3 className={cn(
      "text-2xl md:text-3xl font-semibold leading-snug",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-white',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h3>
  ),

  Body: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <p className={cn(
      "text-base leading-relaxed text-zinc-300",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </p>
  ),

  BodyLarge: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <p className={cn(
      "text-lg leading-relaxed text-zinc-300",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </p>
  ),

  Caption: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <span className={cn(
      "text-sm text-zinc-400 leading-normal",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </span>
  )
};