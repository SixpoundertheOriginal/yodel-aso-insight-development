import React from 'react';
import { cn } from '@/lib/utils';

interface GradientBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'yodel' | 'blue' | 'success' | 'dark' | 'aurora';
  intensity?: 'subtle' | 'medium' | 'strong';
  animated?: boolean;
  children?: React.ReactNode;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  variant = 'yodel',
  intensity = 'medium',
  animated = false,
  children,
  className,
  ...props
}) => {
  const gradients = {
    yodel: {
      subtle: 'bg-gradient-to-br from-orange-500/10 via-zinc-900 to-orange-600/10',
      medium: 'bg-gradient-to-br from-orange-500/20 via-zinc-900 to-orange-600/20',
      strong: 'bg-gradient-to-br from-orange-500/30 via-zinc-800 to-orange-600/30'
    },
    blue: {
      subtle: 'bg-gradient-to-br from-blue-500/10 via-zinc-900 to-blue-600/10',
      medium: 'bg-gradient-to-br from-blue-500/20 via-zinc-900 to-blue-600/20',
      strong: 'bg-gradient-to-br from-blue-500/30 via-zinc-800 to-blue-600/30'
    },
    success: {
      subtle: 'bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-emerald-600/10',
      medium: 'bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-emerald-600/20',
      strong: 'bg-gradient-to-br from-emerald-500/30 via-zinc-800 to-emerald-600/30'
    },
    dark: {
      subtle: 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950',
      medium: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900',
      strong: 'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800'
    },
    aurora: {
      subtle: 'bg-gradient-to-br from-orange-500/5 via-blue-500/5 to-emerald-500/5',
      medium: 'bg-gradient-to-br from-orange-500/10 via-blue-500/10 to-emerald-500/10',
      strong: 'bg-gradient-to-br from-orange-500/20 via-blue-500/20 to-emerald-500/20'
    }
  };

  const animatedClasses = animated ? 'animate-gradient-x bg-[length:200%_200%]' : '';

  return (
    <div
      className={cn(
        'min-h-full w-full',
        gradients[variant][intensity],
        animatedClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};