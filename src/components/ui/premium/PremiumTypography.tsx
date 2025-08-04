import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  gradient?: 'orange' | 'blue' | 'success' | 'none';
  animated?: boolean;
}

interface DataTypographyProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export const PremiumTypography = {
  // Display fonts for hero sections and main titles
  Display: ({ children, className, gradient = 'orange', animated = false }: TypographyProps) => (
    <h1 className={cn(
      "font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-foreground',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h1>
  ),

  // Page title - smaller than Display
  PageTitle: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h1 className={cn(
      "font-display text-2xl md:text-3xl font-bold leading-tight tracking-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-foreground',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h1>
  ),

  // Section titles and card headers
  SectionTitle: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h2 className={cn(
      "font-display text-xl md:text-2xl font-semibold leading-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-foreground',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h2>
  ),

  // Card titles
  CardTitle: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <h3 className={cn(
      "font-sans text-lg font-semibold leading-snug text-foreground",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h3>
  ),

  // Data/metric values
  MetricValue: ({ children, className, animated = false }: DataTypographyProps) => (
    <div className={cn(
      "font-mono text-2xl md:text-3xl font-bold leading-none text-foreground",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </div>
  ),

  // Data labels
  DataLabel: ({ children, className, animated = false }: DataTypographyProps) => (
    <span className={cn(
      "font-sans text-sm font-medium leading-normal text-zinc-400 uppercase tracking-wide",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </span>
  ),

  // Regular headings
  H1: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h1 className={cn(
      "font-sans text-3xl md:text-4xl font-bold leading-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-foreground',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h1>
  ),

  H2: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h2 className={cn(
      "font-sans text-2xl md:text-3xl font-semibold leading-tight",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-foreground',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h2>
  ),

  H3: ({ children, className, gradient = 'none', animated = false }: TypographyProps) => (
    <h3 className={cn(
      "font-sans text-xl md:text-2xl font-semibold leading-snug",
      gradient !== 'none' && {
        'orange': 'bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent',
        'blue': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
        'success': 'bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent'
      }[gradient],
      gradient === 'none' && 'text-foreground',
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </h3>
  ),

  // Body text
  Body: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <p className={cn(
      "font-sans text-base leading-relaxed text-zinc-300",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </p>
  ),

  BodyLarge: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <p className={cn(
      "font-sans text-lg leading-relaxed text-zinc-300",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </p>
  ),

  // Small text and captions
  Caption: ({ children, className, animated = false }: Omit<TypographyProps, 'gradient'>) => (
    <span className={cn(
      "font-sans text-sm text-zinc-400 leading-normal",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </span>
  ),

  // Percentage and delta values
  PercentageValue: ({ children, className, animated = false }: DataTypographyProps) => (
    <span className={cn(
      "font-mono text-sm font-semibold leading-none",
      animated && 'animate-fade-in',
      className
    )}>
      {children}
    </span>
  )
};