import React from 'react';
import { cn } from '@/lib/utils';

interface LayoutSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'none' | 'subtle' | 'gradient';
}

export const LayoutSection: React.FC<LayoutSectionProps> = ({
  children,
  spacing = 'md',
  background = 'none',
  className,
  ...props
}) => {
  const spacingClasses = {
    none: '',
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-24'
  };

  const backgroundClasses = {
    none: '',
    subtle: 'bg-zinc-900/30 backdrop-blur-sm',
    gradient: 'bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm'
  };

  return (
    <section
      className={cn(
        'w-full',
        spacingClasses[spacing],
        backgroundClasses[background],
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
};

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'xl',
  padding = 'md',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4',
    md: 'px-6 lg:px-8',
    lg: 'px-8 lg:px-12'
  };

  return (
    <div
      className={cn(
        'mx-auto w-full',
        sizeClasses[size],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = 'md',
  animated = true,
  className,
  ...props
}) => {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12'
  };

  const getGridCols = () => {
    const classes = ['grid'];
    
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    
    return classes.join(' ');
  };

  return (
    <div
      className={cn(
        getGridCols(),
        gapClasses[gap],
        animated && 'animate-fade-in',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};