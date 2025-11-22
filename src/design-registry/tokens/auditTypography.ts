/**
 * AUDIT TYPOGRAPHY TOKENS
 *
 * Specialized typography scales for audit components.
 * Provides consistent font sizing, weights, and spacing.
 */

export const auditTypography = {
  // Score displays (monospace, light weight, technical readout style)
  score: {
    hero: 'text-4xl font-mono font-light tracking-wider', // Main 0-100 score
    large: 'text-3xl font-mono font-light tracking-wide', // Element scores
    medium: 'text-2xl font-mono font-normal tracking-wide', // Sub-scores
    small: 'text-xl font-mono font-normal tracking-normal', // Inline scores
    label: 'text-[10px] uppercase tracking-widest font-medium text-zinc-500', // "/100" label - small caps
  },
  
  // Section headers (all caps, wider tracking, lighter weight)
  section: {
    main: 'text-base font-normal tracking-wide uppercase text-zinc-300', // "METADATA AUDIT SCORE"
    subsection: 'text-xs font-medium uppercase tracking-[0.2em] text-zinc-400', // "ASO RANKING ELEMENTS"
    label: 'text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium', // "CONVERSION INTELLIGENCE"
  },
  
  // Recommendations (monospace numbers, lighter weight)
  recommendation: {
    number: 'text-sm font-mono font-bold tracking-wider', // Recommendation index (1, 2, 3...)
    title: 'text-sm font-normal text-zinc-200', // Recommendation main text
    description: 'text-xs text-zinc-400 leading-relaxed font-light', // Supporting text
  },
  
  // Keywords and badges (monospace, uppercase labels)
  keyword: {
    badge: 'text-[11px] font-mono tracking-wide', // Keyword chip text
    label: 'text-xs font-medium uppercase tracking-wider text-zinc-300', // "TITLE (7 KEYWORDS)"
    count: 'text-[10px] text-zinc-500 uppercase tracking-widest', // "• 3 IGNORED"
    metric: 'text-xs text-zinc-400', // "14 keywords total"
  },
  
  // Rule details (uppercase, monospace scores)
  rule: {
    name: 'text-xs font-medium uppercase tracking-wide text-zinc-300', // Rule name
    score: 'text-xl font-mono font-normal text-zinc-200', // Rule score
    description: 'text-xs text-zinc-400 leading-normal font-light', // Rule explanation
    metadata: 'text-[10px] text-zinc-500 italic tracking-wide', // Character counts, etc.
    evidence: 'text-xs text-zinc-500 leading-relaxed', // Evidence snippets
  },
  
  // Tier labels and badges (uppercase, wider tracking)
  tier: {
    badge: 'text-xs font-medium uppercase tracking-widest', // "EXCEPTIONAL", "GOOD", etc.
    note: 'text-[10px] text-zinc-500 text-center uppercase tracking-wide', // Small explanatory text
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
