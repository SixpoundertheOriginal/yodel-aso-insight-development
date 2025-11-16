/**
 * DESIGN REGISTRY: Semantic Color System
 *
 * Maps UI meaning to consistent color tokens across the application.
 * Replaces 12+ hardcoded gradient/color implementations with semantic system.
 *
 * @packageDocumentation
 */

/**
 * Color object structure for semantic colors
 */
export interface ColorToken {
  text: string;
  bg: string;
  border: string;
  icon?: string;
}

/**
 * Badge/chip color structure
 */
export interface BadgeColorToken extends ColorToken {
  badge: string;
}

/**
 * Gradient color structure for KPI cards
 */
export interface GradientColorToken {
  primary: string;
  text: string;
  icon: string;
}

/**
 * Semantic color system
 * Provides consistent color meanings across all components
 */
export const semanticColors = {
  /**
   * Delta/Trend colors for metric changes
   * Used in: DeltaChip, TrendBadge, metric comparisons
   */
  delta: {
    positive: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: 'text-green-500',
    },
    negative: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-500',
    },
    neutral: {
      text: 'text-zinc-400',
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/30',
      icon: 'text-zinc-500',
    },
  } as const,

  /**
   * Priority levels for intelligence/opportunity cards
   * Used in: OpportunityMapCard, priority badges, alerts
   */
  priority: {
    high: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
    medium: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    },
    low: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
  } as const,

  /**
   * Traffic source colors for ASO metrics
   * Used in: AsoMetricCard, traffic source charts
   */
  trafficSource: {
    search: {
      primary: 'from-blue-500 to-purple-600',
      text: 'text-purple-400',
      icon: 'text-purple-500',
    },
    browse: {
      primary: 'from-purple-500 to-pink-600',
      text: 'text-pink-400',
      icon: 'text-pink-500',
    },
    direct: {
      primary: 'from-orange-500 to-orange-600',
      text: 'text-orange-400',
      icon: 'text-orange-500',
    },
    pdp: {
      primary: 'from-purple-500 to-purple-600',
      text: 'text-purple-400',
      icon: 'text-purple-500',
    },
  } as const,

  /**
   * Metric type colors for KPI cards
   * Used in: TotalMetricCard, metric displays
   */
  metric: {
    impressions: {
      primary: 'from-cyan-500 to-blue-600',
      text: 'text-cyan-400',
      icon: 'text-cyan-500',
    },
    downloads: {
      primary: 'from-green-500 to-emerald-600',
      text: 'text-green-400',
      icon: 'text-green-500',
    },
    cvr: {
      primary: 'from-yodel-orange to-orange-600',
      text: 'text-yodel-orange',
      icon: 'text-yodel-orange',
    },
    pageViews: {
      primary: 'from-purple-500 to-purple-600',
      text: 'text-purple-400',
      icon: 'text-purple-500',
    },
  } as const,

  /**
   * Status indicator colors
   * Used in: Alerts, notifications, status badges
   */
  status: {
    success: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: 'text-green-500',
    },
    warning: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: 'text-yellow-500',
    },
    error: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: 'text-red-500',
    },
    info: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-500',
    },
  } as const,

  /**
   * Intelligence score levels
   * Used in: StabilityScoreCard, score badges, confidence levels
   */
  score: {
    excellent: {
      text: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      ring: 'ring-green-500/20',
    },
    good: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      ring: 'ring-yellow-500/20',
    },
    moderate: {
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/30',
      ring: 'ring-orange-500/20',
    },
    poor: {
      text: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      ring: 'ring-red-500/20',
    },
    neutral: {
      text: 'text-zinc-400',
      bg: 'bg-zinc-500/20',
      border: 'border-zinc-500/30',
      ring: 'ring-zinc-500/20',
    },
  } as const,

  /**
   * Confidence level colors (for simulations)
   * Used in: OutcomeSimulationCard, confidence badges
   */
  confidence: {
    high: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    medium: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    },
    low: {
      text: 'text-zinc-400',
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/30',
      badge: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    },
  } as const,

  /**
   * Brand colors (Yodel Mobile)
   * Used in: Primary actions, branding, hero sections
   */
  brand: {
    primary: {
      text: 'text-yodel-orange',
      bg: 'bg-yodel-orange',
      border: 'border-yodel-orange',
      hover: 'hover:bg-yodel-orange/90',
    },
    secondary: {
      text: 'text-yodel-blue',
      bg: 'bg-yodel-blue',
      border: 'border-yodel-blue',
      hover: 'hover:bg-yodel-blue/90',
    },
  } as const,
} as const;

/**
 * Helper function to get semantic color by key path
 *
 * @param path - Dot notation path to color (e.g., 'delta.positive')
 * @returns Color token object
 *
 * @example
 * ```ts
 * getSemanticColor('delta.positive') // { text: 'text-green-400', bg: 'bg-green-500/10', ... }
 * ```
 */
export function getSemanticColor(path: string): ColorToken | GradientColorToken | undefined {
  const keys = path.split('.');
  let current: any = semanticColors;

  for (const key of keys) {
    if (current[key] === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Type exports
 */
export type SemanticColors = typeof semanticColors;
export type DeltaColors = typeof semanticColors.delta;
export type PriorityColors = typeof semanticColors.priority;
export type TrafficSourceColors = typeof semanticColors.trafficSource;
export type MetricColors = typeof semanticColors.metric;
export type StatusColors = typeof semanticColors.status;
export type ScoreColors = typeof semanticColors.score;
