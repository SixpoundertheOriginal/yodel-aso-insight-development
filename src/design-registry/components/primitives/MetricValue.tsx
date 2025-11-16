/**
 * DESIGN REGISTRY: MetricValue Primitive
 *
 * Formatted number display component with consistent styling.
 * Replaces 7+ inline formatNumber() implementations.
 *
 * @packageDocumentation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { formatters } from '../../tokens/formatters';
import { typography } from '../../tokens/typography';
import type { MetricValueProps } from '../../types';

/**
 * MetricValue - Formatted number display
 *
 * Displays numbers with consistent formatting and typography.
 * Supports multiple formats and size variants.
 *
 * @example
 * ```tsx
 * // Compact format for large numbers
 * <MetricValue value={1500000} format="compact" size="hero" />
 * // Output: "1.5M" with hero typography
 *
 * // Full format with thousands separators
 * <MetricValue value={1234567} format="full" size="primary" />
 * // Output: "1,234,567" with primary typography
 *
 * // Percentage format
 * <MetricValue value={12.5} format="percentage" size="secondary" />
 * // Output: "12.5%" with secondary typography
 *
 * // Ratio format
 * <MetricValue value={2.5} format="ratio" size="small" />
 * // Output: "2.5:1" with small typography
 * ```
 */
export const MetricValue: React.FC<MetricValueProps> = ({
  value,
  format = 'compact',
  size = 'primary',
  decimals = 1,
  className,
}) => {
  // Format the value based on type
  const formattedValue = React.useMemo(() => {
    switch (format) {
      case 'compact':
        return formatters.number.compact(value, decimals);
      case 'full':
        return formatters.number.full(value);
      case 'precise':
        return formatters.number.precise(value, decimals);
      case 'percentage':
        return formatters.percentage.standard(value, decimals);
      case 'ratio':
        return formatters.ratio(value, decimals);
      case 'currency':
        return formatters.currency(value);
      default:
        return value.toString();
    }
  }, [value, format, decimals]);

  // Get typography class for size
  const typographyClass = typography.metric[size];

  return (
    <span className={cn(typographyClass, className)}>
      {formattedValue}
    </span>
  );
};

MetricValue.displayName = 'MetricValue';
