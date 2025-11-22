/**
 * AUDIT TYPOGRAPHY TOKENS
 *
 * Specialized typography scales for audit components.
 * Provides consistent font sizing, weights, and spacing.
 */

export const auditTypography = {
  // Score displays
  score: {
    hero: 'text-4xl font-bold font-mono tracking-tight', // Main 0-100 score
    large: 'text-3xl font-bold font-mono tracking-tight', // Element scores
    medium: 'text-2xl font-bold font-mono tracking-tight', // Sub-scores
    small: 'text-xl font-bold font-mono', // Inline scores
    label: 'text-xs text-zinc-400 font-normal', // "/100" label
  },
  
  // Section headers
  section: {
    main: 'text-lg font-semibold', // "Metadata Audit Score"
    subsection: 'text-sm font-medium uppercase tracking-wide', // "ASO RANKING ELEMENTS"
    label: 'text-xs text-zinc-500 uppercase tracking-wider', // "CONVERSION INTELLIGENCE"
  },
  
  // Recommendations
  recommendation: {
    number: 'text-sm font-bold font-mono', // Recommendation index (1, 2, 3...)
    text: 'text-sm text-foreground', // Recommendation main text
    description: 'text-xs text-zinc-400 leading-relaxed', // Supporting text
  },
  
  // Keywords and badges
  keyword: {
    badge: 'text-xs font-normal', // Keyword chip text
    label: 'text-sm font-medium text-zinc-300', // "Title (7 keywords)"
    count: 'text-xs text-zinc-500', // "• 3 ignored"
    metric: 'text-xs text-zinc-400', // "14 keywords total"
  },
  
  // Rule details
  rule: {
    name: 'text-sm font-medium text-zinc-300', // Rule name
    score: 'text-2xl font-bold text-zinc-200', // Rule score
    description: 'text-xs text-zinc-400 leading-normal', // Rule explanation
    metadata: 'text-xs text-zinc-500 italic', // Character counts, etc.
    evidence: 'text-xs text-zinc-500 leading-relaxed', // Evidence snippets
  },
  
  // Tier labels and badges
  tier: {
    badge: 'text-sm font-medium', // "Exceptional", "Good", etc.
    note: 'text-xs text-zinc-500 text-center', // Small explanatory text
    label: 'text-xs text-zinc-400', // Tier description
  },
  
  // Card titles and descriptions
  card: {
    title: 'text-lg font-semibold', // Card header title
    subtitle: 'text-sm text-zinc-400', // Card subtitle
    description: 'text-sm text-zinc-400', // Card description
  },
  
  // Data and metrics
  metric: {
    value: 'text-2xl font-bold font-mono', // Metric value
    label: 'text-xs text-zinc-400 uppercase tracking-wide', // Metric label
    delta: 'text-sm font-medium', // Change indicator
  },
} as const;

export type AuditTypography = typeof auditTypography;
