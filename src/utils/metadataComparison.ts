/**
 * Metadata Comparison Utilities
 *
 * Helpers for calculating deltas and formatting comparison data
 */

import type { MetadataDeltas } from '@/types/metadataOptimization';

/**
 * Format delta value with sign and color indicator
 */
export function formatDelta(value: number, options?: {
  showSign?: boolean;
  decimals?: number;
  suffix?: string;
  inverse?: boolean; // For metrics where lower is better (e.g., duplicates)
}): {
  formatted: string;
  isPositive: boolean;
  isNeutral: boolean;
  color: 'green' | 'red' | 'gray';
} {
  const {
    showSign = true,
    decimals = 0,
    suffix = '',
    inverse = false,
  } = options || {};

  const isNeutral = value === 0;
  const isPositive = inverse ? value < 0 : value > 0;

  const sign = isNeutral ? '' : (value > 0 ? '+' : '');
  const formatted = showSign
    ? `${sign}${value.toFixed(decimals)}${suffix}`
    : `${Math.abs(value).toFixed(decimals)}${suffix}`;

  const color = isNeutral ? 'gray' : (isPositive ? 'green' : 'red');

  return { formatted, isPositive, isNeutral, color };
}

/**
 * Get CSS classes for delta badge
 */
export function getDeltaBadgeClasses(
  value: number,
  inverse: boolean = false
): string {
  if (value === 0) {
    return 'border-zinc-600 text-zinc-400 bg-zinc-800/30';
  }

  const isPositive = inverse ? value < 0 : value > 0;

  if (isPositive) {
    return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
  } else {
    return 'border-red-500/40 text-red-400 bg-red-500/10';
  }
}

/**
 * Get emoji indicator for delta
 */
export function getDeltaEmoji(value: number, inverse: boolean = false): string {
  if (value === 0) return '—';

  const isPositive = inverse ? value < 0 : value > 0;

  if (isPositive) {
    return value > 0 ? '▲' : '▼';
  } else {
    return value > 0 ? '▼' : '▲';
  }
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  baseline: number,
  draft: number
): number {
  if (baseline === 0) {
    return draft > 0 ? 100 : 0;
  }

  return ((draft - baseline) / baseline) * 100;
}

/**
 * Get summary message for deltas
 */
export function getDeltaSummary(deltas: MetadataDeltas): {
  message: string;
  sentiment: 'positive' | 'negative' | 'neutral';
} {
  // Count positive and negative changes
  const positiveChanges: string[] = [];
  const negativeChanges: string[] = [];

  if (deltas.excellentCombos > 0) positiveChanges.push(`+${deltas.excellentCombos} Excellent combos`);
  if (deltas.excellentCombos < 0) negativeChanges.push(`${deltas.excellentCombos} Excellent combos`);

  if (deltas.coveragePct > 0) positiveChanges.push(`+${deltas.coveragePct.toFixed(1)}% Coverage`);
  if (deltas.coveragePct < 0) negativeChanges.push(`${deltas.coveragePct.toFixed(1)}% Coverage`);

  if (deltas.duplicates < 0) positiveChanges.push(`${Math.abs(deltas.duplicates)} fewer duplicates`);
  if (deltas.duplicates > 0) negativeChanges.push(`+${deltas.duplicates} duplicates`);

  if (deltas.uniqueKeywords > 0) positiveChanges.push(`+${deltas.uniqueKeywords} unique keywords`);
  if (deltas.uniqueKeywords < 0) negativeChanges.push(`${deltas.uniqueKeywords} unique keywords`);

  // Determine overall sentiment
  let sentiment: 'positive' | 'negative' | 'neutral';
  if (positiveChanges.length > negativeChanges.length) {
    sentiment = 'positive';
  } else if (negativeChanges.length > positiveChanges.length) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  // Build message
  let message = '';
  if (positiveChanges.length === 0 && negativeChanges.length === 0) {
    message = 'No significant changes detected';
  } else if (sentiment === 'positive') {
    message = `Improved: ${positiveChanges.join(', ')}`;
    if (negativeChanges.length > 0) {
      message += ` | Declined: ${negativeChanges.join(', ')}`;
    }
  } else if (sentiment === 'negative') {
    message = `Declined: ${negativeChanges.join(', ')}`;
    if (positiveChanges.length > 0) {
      message += ` | Improved: ${positiveChanges.join(', ')}`;
    }
  } else {
    message = `Mixed: ${[...positiveChanges, ...negativeChanges].join(', ')}`;
  }

  return { message, sentiment };
}

/**
 * Get color class for sentiment
 */
export function getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive':
      return 'text-emerald-400';
    case 'negative':
      return 'text-red-400';
    case 'neutral':
      return 'text-zinc-400';
  }
}
