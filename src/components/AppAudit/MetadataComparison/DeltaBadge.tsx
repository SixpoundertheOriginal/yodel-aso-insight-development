/**
 * DeltaBadge Component
 *
 * Visual indicator for metric changes (deltas) between baseline and draft.
 * Shows +/- value with color coding (green=improvement, red=decline).
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDelta, getDeltaBadgeClasses, getDeltaEmoji } from '@/utils/metadataComparison';

interface DeltaBadgeProps {
  /** Delta value (can be positive or negative) */
  value: number;
  /** Number of decimal places to show */
  decimals?: number;
  /** Suffix to append (e.g., '%', ' combos') */
  suffix?: string;
  /** Inverse mode: lower is better (e.g., duplicates) */
  inverse?: boolean;
  /** Show sign even if positive */
  showSign?: boolean;
  /** Show emoji indicator (▲/▼) */
  showEmoji?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  value,
  decimals = 0,
  suffix = '',
  inverse = false,
  showSign = true,
  showEmoji = true,
  size = 'md',
}) => {
  const { formatted, isPositive, isNeutral } = formatDelta(value, {
    showSign,
    decimals,
    suffix,
    inverse,
  });

  const badgeClasses = getDeltaBadgeClasses(value, inverse);
  const emoji = showEmoji ? getDeltaEmoji(value, inverse) : null;

  // Size classes
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  if (isNeutral) {
    return (
      <Badge
        variant="outline"
        className={`${badgeClasses} ${sizeClasses[size]} font-mono`}
      >
        {emoji && <span className="mr-1">{emoji}</span>}
        {formatted}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`${badgeClasses} ${sizeClasses[size]} font-mono font-medium`}
    >
      {emoji && <span className="mr-1">{emoji}</span>}
      {formatted}
    </Badge>
  );
};

/**
 * Compact delta badge (just +/- number, no border)
 */
export const CompactDeltaBadge: React.FC<DeltaBadgeProps> = ({
  value,
  decimals = 0,
  suffix = '',
  inverse = false,
}) => {
  if (value === 0) {
    return <span className="text-zinc-500 text-xs">—</span>;
  }

  const { formatted, isPositive } = formatDelta(value, {
    showSign: true,
    decimals,
    suffix,
    inverse,
  });

  const colorClass = isPositive ? 'text-emerald-400' : 'text-red-400';

  return (
    <span className={`${colorClass} text-xs font-mono font-medium`}>
      {formatted}
    </span>
  );
};
