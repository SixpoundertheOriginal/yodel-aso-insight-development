/**
 * Utility functions for Unified Metadata Audit Module
 *
 * Scoped helpers for the Insight Panel subsystem.
 */

/**
 * Formats a numeric score to a fixed number of decimal places
 *
 * @param value - Raw numeric score
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number with max decimals
 *
 * @example
 * formatScore(76.66666666666667) → 76.67
 * formatScore(100) → 100
 * formatScore(NaN) → 0
 */
export const formatScore = (value: number, decimals: number = 2): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(decimals));
};

/**
 * Formats a numeric score as a percentage string
 *
 * @param value - Raw numeric score (0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 *
 * @example
 * formatScoreAsPercent(76.66666666666667) → "76.67%"
 * formatScoreAsPercent(100) → "100%"
 */
export const formatScoreAsPercent = (value: number, decimals: number = 2): string => {
  return `${formatScore(value, decimals)}%`;
};

/**
 * Recommendation severity levels (for parsing)
 */
export type RecommendationSeverity = 'critical' | 'strong' | 'moderate' | 'optional' | 'success';

/**
 * Parsed recommendation structure
 */
export interface ParsedRecommendation {
  category: string;      // e.g., "RANKING", "INTENT", "BRAND"
  severity: RecommendationSeverity;
  message: string;       // Clean message without tags
  rawMessage: string;    // Original message with tags
}

/**
 * Parses a recommendation string with inline tags into structured data
 *
 * @param rawMessage - Original recommendation string
 * @returns Parsed recommendation object
 *
 * @example
 * parseRecommendation("[RANKING][critical] Title has few keywords")
 * → { category: "RANKING", severity: "critical", message: "Title has few keywords", rawMessage: "..." }
 */
export const parseRecommendation = (rawMessage: string): ParsedRecommendation => {
  // Extract [CATEGORY] tag
  const categoryMatch = rawMessage.match(/^\[([A-Z]+)\]/);
  const category = categoryMatch ? categoryMatch[1] : 'GENERAL';

  // Extract [severity] tag
  const severityMatch = rawMessage.match(/\[(critical|strong|moderate|optional|success)\]/i);
  const severity = severityMatch
    ? (severityMatch[1].toLowerCase() as RecommendationSeverity)
    : 'moderate';

  // Remove all tags to get clean message
  const message = rawMessage
    .replace(/^\[[A-Z]+\]/, '')           // Remove [CATEGORY]
    .replace(/\[(critical|strong|moderate|optional|success)\]/i, '') // Remove [severity]
    .trim();

  return {
    category,
    severity,
    message,
    rawMessage
  };
};

/**
 * Normalizes a message string for deduplication comparison
 *
 * @param message - Message to normalize
 * @returns Normalized string (lowercase, no punctuation, trimmed)
 */
export const normalizeMessage = (message: string): string => {
  return message
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
};

/**
 * Deduplicates an array of recommendations
 * Keeps the first occurrence of each unique message
 *
 * @param recommendations - Array of raw recommendation strings
 * @returns Deduplicated array
 */
export const deduplicateRecommendations = (recommendations: string[]): string[] => {
  const seen = new Set<string>();
  return recommendations.filter(rec => {
    const parsed = parseRecommendation(rec);
    const key = `${parsed.category}:${normalizeMessage(parsed.message)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Sorts recommendations by severity (most critical first)
 *
 * @param recommendations - Array of raw recommendation strings
 * @returns Sorted array
 */
export const sortRecommendationsBySeverity = (recommendations: string[]): string[] => {
  const severityOrder: Record<RecommendationSeverity, number> = {
    critical: 0,
    strong: 1,
    moderate: 2,
    optional: 3,
    success: 4
  };

  return [...recommendations].sort((a, b) => {
    const parsedA = parseRecommendation(a);
    const parsedB = parseRecommendation(b);
    return severityOrder[parsedA.severity] - severityOrder[parsedB.severity];
  });
};

/**
 * Gets color classes for a recommendation severity
 *
 * @param severity - Severity level
 * @returns Tailwind color classes
 */
export const getSeverityColors = (severity: RecommendationSeverity): {
  border: string;
  text: string;
  bg: string;
  glow: string;
} => {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-red-400/30',
        text: 'text-red-400',
        bg: 'bg-red-900/10',
        glow: '0 0 20px rgba(248, 113, 113, 0.3)'
      };
    case 'strong':
      return {
        border: 'border-orange-400/30',
        text: 'text-orange-400',
        bg: 'bg-orange-900/10',
        glow: '0 0 20px rgba(251, 146, 60, 0.3)'
      };
    case 'moderate':
      return {
        border: 'border-yellow-400/30',
        text: 'text-yellow-400',
        bg: 'bg-yellow-900/10',
        glow: '0 0 20px rgba(250, 204, 21, 0.3)'
      };
    case 'optional':
      return {
        border: 'border-blue-400/30',
        text: 'text-blue-400',
        bg: 'bg-blue-900/10',
        glow: '0 0 20px rgba(96, 165, 250, 0.3)'
      };
    case 'success':
      return {
        border: 'border-emerald-400/30',
        text: 'text-emerald-400',
        bg: 'bg-emerald-900/10',
        glow: '0 0 20px rgba(52, 211, 153, 0.3)'
      };
  }
};

/**
 * Gets color classes for a recommendation category
 *
 * @param category - Category name
 * @returns Tailwind color classes
 */
export const getCategoryColors = (category: string): {
  border: string;
  text: string;
  bg: string;
} => {
  switch (category.toUpperCase()) {
    case 'RANKING':
      return {
        border: 'border-orange-400/30',
        text: 'text-orange-400',
        bg: 'bg-orange-900/10'
      };
    case 'INTENT':
      return {
        border: 'border-blue-400/30',
        text: 'text-blue-400',
        bg: 'bg-blue-900/10'
      };
    case 'BRAND':
      return {
        border: 'border-purple-400/30',
        text: 'text-purple-400',
        bg: 'bg-purple-900/10'
      };
    case 'CONVERSION':
      return {
        border: 'border-emerald-400/30',
        text: 'text-emerald-400',
        bg: 'bg-emerald-900/10'
      };
    default:
      return {
        border: 'border-zinc-700',
        text: 'text-zinc-400',
        bg: 'bg-zinc-900/10'
      };
  }
};
