/**
 * DESIGN REGISTRY: Typography System
 *
 * Consistent typography hierarchy for all text elements across the application.
 * Replaces inconsistent font-size/weight combinations with semantic type scale.
 *
 * @packageDocumentation
 */

/**
 * Typography hierarchy system
 */
export const typography = {
  /**
   * Display text (page titles, hero sections)
   */
  display: {
    xl: 'text-5xl font-bold tracking-tight',
    lg: 'text-4xl font-bold tracking-tight',
    md: 'text-3xl font-bold tracking-tight',
    sm: 'text-2xl font-bold tracking-tight',
  },

  /**
   * Section headers
   * Used in: Dashboard sections, page sections
   */
  section: {
    primary: 'text-2xl font-bold tracking-tight text-zinc-100',
    secondary: 'text-xl font-semibold text-zinc-200',
    tertiary: 'text-lg font-semibold text-zinc-300',
  },

  /**
   * Card titles and headers
   * Used in: All card components
   */
  card: {
    title: 'text-lg font-semibold text-zinc-200',
    subtitle: 'text-sm text-muted-foreground',
    label: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
  },

  /**
   * Metric values (numbers, KPIs)
   * Used in: KPI cards, metric displays
   */
  metric: {
    hero: 'text-5xl font-bold tracking-tight',      // Main dashboard KPIs
    primary: 'text-4xl font-bold tracking-tight',   // Card main values
    secondary: 'text-2xl font-bold tracking-tight', // Supporting metrics
    small: 'text-xl font-bold',                     // Inline metrics
  },

  /**
   * Body text
   * Used in: Descriptions, insights, narratives
   */
  body: {
    lg: 'text-base text-zinc-200 leading-relaxed',
    md: 'text-sm text-zinc-300 leading-relaxed',
    sm: 'text-xs text-zinc-400 leading-relaxed',
  },

  /**
   * Labels and microcopy
   * Used in: Form labels, chip labels, metadata
   */
  label: {
    primary: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
    secondary: 'text-xs text-muted-foreground',
    tertiary: 'text-xs text-zinc-500',
  },

  /**
   * Interactive elements
   * Used in: Buttons, links, navigation
   */
  interactive: {
    button: 'text-sm font-medium',
    link: 'text-sm font-medium hover:text-foreground transition-colors',
    nav: 'text-sm font-medium text-muted-foreground hover:text-foreground',
  },

  /**
   * Table text
   * Used in: Data tables, grids
   */
  table: {
    header: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
    cell: 'text-sm text-zinc-300',
    caption: 'text-xs text-zinc-500',
  },
} as const;

/**
 * Font weight tokens (for custom combinations)
 */
export const fontWeight = {
  normal: 'font-normal',     // 400
  medium: 'font-medium',     // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold',         // 700
} as const;

/**
 * Font size tokens (for custom combinations)
 */
export const fontSize = {
  xs: 'text-xs',       // 12px
  sm: 'text-sm',       // 14px
  base: 'text-base',   // 16px
  lg: 'text-lg',       // 18px
  xl: 'text-xl',       // 20px
  '2xl': 'text-2xl',   // 24px
  '3xl': 'text-3xl',   // 30px
  '4xl': 'text-4xl',   // 36px
  '5xl': 'text-5xl',   // 48px
} as const;

/**
 * Text color tokens (for custom combinations)
 */
export const textColor = {
  primary: 'text-foreground',
  secondary: 'text-muted-foreground',
  tertiary: 'text-zinc-500',
  disabled: 'text-zinc-600',
  inverse: 'text-background',
} as const;

/**
 * Type exports
 */
export type Typography = typeof typography;
export type FontWeight = typeof fontWeight;
export type FontSize = typeof fontSize;
export type TextColor = typeof textColor;
