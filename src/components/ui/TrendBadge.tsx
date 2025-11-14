import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number; // percentage change
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function TrendBadge({
  value,
  label = 'vs last period',
  size = 'sm',
  showIcon = true
}: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const colorClass = isNeutral
    ? 'text-zinc-400 bg-zinc-800/50'
    : isPositive
      ? 'text-green-400 bg-green-500/10'
      : 'text-red-400 bg-red-500/10';

  const sizeClasses = {
    sm: {
      container: 'text-xs px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs'
    },
    md: {
      container: 'text-sm px-2.5 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm'
    },
    lg: {
      container: 'text-base px-3 py-2',
      icon: 'h-5 w-5',
      text: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        colorClass,
        classes.container
      )}
    >
      {showIcon && <Icon className={classes.icon} />}
      <span className={classes.text}>
        {isPositive && '+'}{value.toFixed(1)}%
      </span>
      {label && (
        <span className={cn('text-zinc-500', classes.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
