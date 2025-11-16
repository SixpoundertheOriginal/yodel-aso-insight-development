/**
 * DESIGN REGISTRY: DeltaChip Primitive
 *
 * Reusable trend indicator component with semantic colors.
 * Replaces 6+ inline delta logic implementations across the app.
 *
 * @packageDocumentation
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { semanticColors } from '../../tokens/colors';
import { formatters } from '../../tokens/formatters';
import type { DeltaChipProps } from '../../types';

/**
 * DeltaChip - Trend indicator with semantic colors
 *
 * Displays numeric changes with appropriate color coding and icons.
 * Supports percentage, points, and number formats.
 *
 * @example
 * ```tsx
 * // Positive percentage change
 * <DeltaChip value={5.2} format="percentage" />
 * // Output: "+5.2%" with green color and up arrow
 *
 * // Negative percentage points change
 * <DeltaChip value={-3.1} format="points" />
 * // Output: "-3.1pp" with red color and down arrow
 *
 * // Neutral change (below threshold)
 * <DeltaChip value={0.05} format="percentage" />
 * // Output: "+0.1%" with neutral color and minus icon
 * ```
 */
export const DeltaChip: React.FC<DeltaChipProps> = ({
  value,
  format = 'percentage',
  size = 'sm',
  showIcon = true,
  className,
}) => {
  // Determine direction
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;

  // Select appropriate icon
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  // Get semantic colors
  const colors = isNeutral
    ? semanticColors.delta.neutral
    : isPositive
      ? semanticColors.delta.positive
      : semanticColors.delta.negative;

  // Format value based on type
  const formattedValue =
    format === 'percentage'
      ? formatters.percentage.delta(value)
      : format === 'points'
        ? formatters.percentage.points(value)
        : formatters.number.compact(value);

  // Size classes
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
    xl: 'text-lg px-4 py-2',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{formattedValue}</span>
    </div>
  );
};

DeltaChip.displayName = 'DeltaChip';
