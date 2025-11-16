/**
 * DESIGN REGISTRY: Number Formatters
 *
 * Single source of truth for all number formatting across the application.
 * Replaces 7+ inline formatNumber() implementations with centralized, tested utilities.
 *
 * @packageDocumentation
 */

/**
 * Number formatters for metrics, KPIs, and analytics
 */
export const formatters = {
  /**
   * Number formatting utilities
   */
  number: {
    /**
     * Compact format for large numbers (e.g., 1.5K, 2.5M)
     * Used in: KPI cards, metric displays, dashboards
     *
     * @param value - The number to format
     * @param decimals - Number of decimal places (default: 1)
     * @returns Formatted string with K/M suffix
     *
     * @example
     * ```ts
     * formatters.number.compact(1500) // "1.5K"
     * formatters.number.compact(2500000) // "2.5M"
     * formatters.number.compact(500) // "500"
     * formatters.number.compact(2500000, 2) // "2.50M"
     * ```
     */
    compact: (value: number, decimals: number = 1): string => {
      if (!isFinite(value) || isNaN(value)) {
        return '0';
      }

      const absValue = Math.abs(value);
      const sign = value < 0 ? '-' : '';

      if (absValue >= 1_000_000) {
        return `${sign}${(absValue / 1_000_000).toFixed(decimals)}M`;
      }
      if (absValue >= 1_000) {
        return `${sign}${(absValue / 1_000).toFixed(decimals)}K`;
      }
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    },

    /**
     * Full number format with locale-aware thousands separators
     * Used in: Tables, tooltips, detailed views
     *
     * @param value - The number to format
     * @returns Formatted string with commas (e.g., "1,234,567")
     *
     * @example
     * ```ts
     * formatters.number.full(1234567) // "1,234,567"
     * formatters.number.full(500) // "500"
     * ```
     */
    full: (value: number): string => {
      if (!isFinite(value) || isNaN(value)) {
        return '0';
      }
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    },

    /**
     * Precise number format with fixed decimal places
     * Used in: Scientific data, precise metrics, coefficients
     *
     * @param value - The number to format
     * @param decimals - Number of decimal places (default: 2)
     * @returns Formatted string with exact decimals
     *
     * @example
     * ```ts
     * formatters.number.precise(0.12345, 2) // "0.12"
     * formatters.number.precise(1234.56, 3) // "1,234.560"
     * ```
     */
    precise: (value: number, decimals: number = 2): string => {
      if (!isFinite(value) || isNaN(value)) {
        return '0.00';
      }
      return value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
  },

  /**
   * Percentage formatting utilities
   */
  percentage: {
    /**
     * Standard percentage format (e.g., "12.5%")
     * Used in: CVR, growth rates, standard metrics
     *
     * @param value - The percentage value (e.g., 12.5 for 12.5%)
     * @param decimals - Number of decimal places (default: 1)
     * @returns Formatted string with % suffix
     *
     * @example
     * ```ts
     * formatters.percentage.standard(12.5) // "12.5%"
     * formatters.percentage.standard(12.567, 2) // "12.57%"
     * ```
     */
    standard: (value: number, decimals: number = 1): string => {
      if (!isFinite(value) || isNaN(value)) {
        return '0.0%';
      }
      return `${value.toFixed(decimals)}%`;
    },

    /**
     * Delta percentage format with sign (e.g., "+5.2%", "-3.1%")
     * Used in: Trend indicators, change metrics, deltas
     *
     * @param value - The percentage change value
     * @param decimals - Number of decimal places (default: 1)
     * @returns Formatted string with sign and % suffix
     *
     * @example
     * ```ts
     * formatters.percentage.delta(5.2) // "+5.2%"
     * formatters.percentage.delta(-3.1) // "-3.1%"
     * formatters.percentage.delta(0.05) // "+0.1%"
     * ```
     */
    delta: (value: number, decimals: number = 1): string => {
      if (!isFinite(value) || isNaN(value)) {
        return '0.0%';
      }
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(decimals)}%`;
    },

    /**
     * Percentage points format (e.g., "5.2pp")
     * Used in: Absolute percentage changes, CVR deltas
     *
     * @param value - The percentage point change
     * @param decimals - Number of decimal places (default: 1)
     * @returns Formatted string with pp suffix
     *
     * @example
     * ```ts
     * formatters.percentage.points(5.2) // "5.2pp"
     * formatters.percentage.points(-3.1) // "-3.1pp"
     * ```
     */
    points: (value: number, decimals: number = 1): string => {
      if (!isFinite(value) || isNaN(value)) {
        return '0.0pp';
      }
      return `${value.toFixed(decimals)}pp`;
    },
  },

  /**
   * Ratio formatting (e.g., "2.5:1")
   * Used in: Search/Browse ratio, conversion ratios
   *
   * @param value - The ratio value
   * @param decimals - Number of decimal places (default: 1)
   * @returns Formatted string with :1 suffix, or ∞ for very large values
   *
   * @example
   * ```ts
   * formatters.ratio(2.5) // "2.5:1"
   * formatters.ratio(1000) // "∞"
   * formatters.ratio(0.5) // "0.5:1"
   * ```
   */
  ratio: (value: number, decimals: number = 1): string => {
    if (!isFinite(value) || isNaN(value)) {
      return '0.0:1';
    }
    if (value >= 999) {
      return '∞';
    }
    return `${value.toFixed(decimals)}:1`;
  },

  /**
   * Currency formatting (future-ready)
   * Used in: Revenue metrics, pricing (when implemented)
   *
   * @param value - The dollar amount
   * @param currency - Currency code (default: 'USD')
   * @returns Formatted currency string
   *
   * @example
   * ```ts
   * formatters.currency(1234.56) // "$1,235"
   * formatters.currency(1234567) // "$1,234,567"
   * ```
   */
  currency: (value: number, currency: string = 'USD'): string => {
    if (!isFinite(value) || isNaN(value)) {
      return '$0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  /**
   * Date formatting utilities
   */
  date: {
    /**
     * Short date format (e.g., "Jan 15")
     * Used in: Chart axes, compact date displays
     *
     * @param date - Date string or Date object
     * @returns Formatted short date
     *
     * @example
     * ```ts
     * formatters.date.short('2024-01-15') // "Jan 15"
     * ```
     */
    short: (date: string | Date): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) {
        return '';
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    /**
     * Medium date format (e.g., "Jan 15, 2024")
     * Used in: Card headers, date pickers
     *
     * @param date - Date string or Date object
     * @returns Formatted medium date
     *
     * @example
     * ```ts
     * formatters.date.medium('2024-01-15') // "Jan 15, 2024"
     * ```
     */
    medium: (date: string | Date): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) {
        return '';
      }
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    },

    /**
     * Long date format (e.g., "January 15, 2024")
     * Used in: Reports, formal displays
     *
     * @param date - Date string or Date object
     * @returns Formatted long date
     *
     * @example
     * ```ts
     * formatters.date.long('2024-01-15') // "January 15, 2024"
     * ```
     */
    long: (date: string | Date): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) {
        return '';
      }
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    },
  },
};

/**
 * Type exports for formatter functions
 */
export type NumberFormatter = typeof formatters.number;
export type PercentageFormatter = typeof formatters.percentage;
export type DateFormatter = typeof formatters.date;
export type Formatters = typeof formatters;
