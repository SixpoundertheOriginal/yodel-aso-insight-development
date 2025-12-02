/**
 * KPI Card Utilities - Smart Highlighting & Performance Detection
 *
 * Determines when cards should be highlighted based on:
 * - Outlier detection (exceptionally high/low values)
 * - Perfect scores (100%, 0 duplicates, etc.)
 * - Critical thresholds (< 70% coverage, etc.)
 */

import type { PerformanceLevel, CardVariant, CardSize } from './KpiCard';

// ===== PERFORMANCE LEVEL DETECTION =====

/**
 * Determine performance level based on percentage (0-100)
 */
export const getPerformanceFromPercentage = (value: number): PerformanceLevel => {
  if (value >= 95) return 'excellent';
  if (value >= 90) return 'good';
  if (value >= 70) return 'neutral';
  if (value >= 50) return 'warning';
  return 'critical';
};

/**
 * Determine performance level for inverted metrics (lower is better)
 * e.g., duplicates, noise
 */
export const getInvertedPerformance = (value: number): PerformanceLevel => {
  if (value === 0) return 'perfect';
  if (value <= 2) return 'excellent';
  if (value <= 5) return 'good';
  if (value <= 10) return 'warning';
  return 'critical';
};

// ===== SMART HIGHLIGHTING =====

/**
 * Determine if a card should be highlighted (outlier/exceptional)
 */
export interface HighlightCriteria {
  value: number;
  type: 'percentage' | 'count' | 'inverted';
  context?: {
    average?: number;
    max?: number;
    min?: number;
  };
}

export const shouldHighlight = (criteria: HighlightCriteria): boolean => {
  const { value, type, context } = criteria;

  switch (type) {
    case 'percentage':
      // Highlight perfect or critical percentages
      return value >= 95 || value < 50;

    case 'inverted':
      // Highlight perfect scores (0) or critical values (>10)
      return value === 0 || value > 10;

    case 'count':
      // Highlight if significantly above/below average
      if (context?.average !== undefined) {
        const threshold = context.average * 0.5; // 50% deviation
        return Math.abs(value - context.average) > threshold;
      }
      return false;

    default:
      return false;
  }
};

// ===== CARD SIZING =====

/**
 * Determine card size based on importance
 */
export interface SizingCriteria {
  metric: string;
  value: number;
  isKeyMetric?: boolean;
}

export const determineCardSize = (criteria: SizingCriteria): CardSize => {
  const { metric, value, isKeyMetric } = criteria;

  // Hero metrics (most important)
  const heroMetrics = ['coverage', 'efficiency', 'ranking'];
  if (heroMetrics.some(m => metric.toLowerCase().includes(m))) {
    return 'lg'; // 2x width
  }

  // Large metrics
  const largeMetrics = ['strongest', 'high-priority', 'total'];
  if (largeMetrics.some(m => metric.toLowerCase().includes(m)) || isKeyMetric) {
    return 'md';
  }

  // Standard size
  return 'sm';
};

// ===== VARIANT MAPPING =====

/**
 * Map metric names to visual variants
 */
export const getVariantForMetric = (metricName: string): CardVariant => {
  const name = metricName.toLowerCase();

  if (name.includes('strongest') || name.includes('tier 1')) {
    return 'strength-1';
  }
  if (name.includes('strong') || name.includes('tier 2')) {
    return 'strength-2';
  }
  if (name.includes('coverage')) {
    return 'coverage-high';
  }
  if (name.includes('efficiency') || name.includes('unique')) {
    return 'efficiency';
  }
  if (name.includes('duplicate') || name.includes('weak')) {
    return 'warning';
  }
  if (name.includes('critical') || name.includes('missing')) {
    return 'critical';
  }

  return 'neutral';
};

// ===== FORMATTER UTILITIES =====

/**
 * Format number with suffix (k, M, etc.)
 */
export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

// ===== PERFORMANCE ANALYSIS =====

/**
 * Analyze a set of metrics and return which ones are outliers
 */
export const analyzeMetrics = (metrics: Record<string, number>) => {
  const values = Object.values(metrics);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const outliers: string[] = [];
  const exceptional: string[] = [];

  Object.entries(metrics).forEach(([key, value]) => {
    // Check if outlier (> 50% deviation from average)
    if (Math.abs(value - average) > average * 0.5) {
      outliers.push(key);
    }

    // Check if exceptional (top 10% or bottom 10%)
    const range = max - min;
    if (value >= max - range * 0.1 || value <= min + range * 0.1) {
      exceptional.push(key);
    }
  });

  return {
    average,
    max,
    min,
    outliers,
    exceptional,
  };
};

// ===== EXPORT HELPER =====

/**
 * Get complete card configuration for a metric
 */
export interface CardConfig {
  size: CardSize;
  variant: CardVariant;
  performance?: PerformanceLevel;
  highlight: boolean;
  animateNumber: boolean;
}

export const getCardConfig = (
  metricName: string,
  value: number,
  options: {
    type?: 'percentage' | 'count' | 'inverted';
    isKeyMetric?: boolean;
    context?: {
      average?: number;
      max?: number;
      min?: number;
    };
  } = {}
): CardConfig => {
  const { type = 'count', isKeyMetric = false, context } = options;

  return {
    size: determineCardSize({ metric: metricName, value, isKeyMetric }),
    variant: getVariantForMetric(metricName),
    performance:
      type === 'percentage'
        ? getPerformanceFromPercentage(value)
        : type === 'inverted'
        ? getInvertedPerformance(value)
        : undefined,
    highlight: shouldHighlight({ value, type, context }),
    animateNumber: true,
  };
};
