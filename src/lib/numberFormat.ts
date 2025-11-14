/**
 * Centralized number formatting utilities for consistent display
 * across the ASO AI Hub application
 */

export const formatNumber = {
  /**
   * Format scores (whole numbers, no decimals)
   * Example: 85.7234 → 85
   */
  score: (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/A';
    return Math.round(value).toString();
  },

  /**
   * Format percentages (1 decimal place max)
   * Example: 45.283 → 45.3%
   */
  percentage: (value: number | undefined | null, decimals: number = 1): string => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format ratios as percentages (whole numbers)
   * Example: 0.4534 → 45%
   */
  ratio: (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/A';
    return `${Math.round(value * 100)}%`;
  },

  /**
   * Format difficulty scores (1 decimal place)
   * Example: 7.543 → 7.5/10
   */
  difficulty: (value: number | undefined | null, maxValue: number = 10): string => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(1)}/${maxValue}`;
  },

  /**
   * Format large numbers with K/M abbreviations
   * Example: 12543 → 12.5K, 1250000 → 1.3M
   */
  volume: (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/A';

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  },

  /**
   * Format decimal numbers with specific precision
   * Example: 3.141592 → 3.1 (precision=1)
   */
  decimal: (value: number | undefined | null, decimals: number = 1): string => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  },

  /**
   * Format currency (whole dollars)
   * Example: 1234.56 → $1,235
   */
  currency: (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/A';
    return `$${Math.round(value).toLocaleString()}`;
  }
};

/**
 * Get semantic color for scores
 */
export const getScoreColor = (score: number | undefined | null): string => {
  if (score === undefined || score === null) return 'text-zinc-400';

  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-orange-400';
};

/**
 * Get semantic color label for scores
 */
export const getScoreLabel = (score: number | undefined | null): string => {
  if (score === undefined || score === null) return 'Unknown';

  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
};
