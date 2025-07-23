import React from 'react';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  pulse = false,
  label,
  className
}) => {
  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const statusClasses = {
    success: 'bg-emerald-500 shadow-emerald-500/50',
    warning: 'bg-yellow-500 shadow-yellow-500/50',
    error: 'bg-red-500 shadow-red-500/50',
    info: 'bg-blue-500 shadow-blue-500/50',
    neutral: 'bg-zinc-500 shadow-zinc-500/50'
  };

  const pulseClasses = pulse ? 'animate-pulse' : '';

  if (label) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <div
          className={cn(
            'rounded-full shadow-lg',
            sizeClasses[size],
            statusClasses[status],
            pulseClasses
          )}
        />
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full shadow-lg',
        sizeClasses[size],
        statusClasses[status],
        pulseClasses,
        className
      )}
    />
  );
};