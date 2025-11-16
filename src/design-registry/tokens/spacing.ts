/**
 * DESIGN REGISTRY: Spacing System
 *
 * Consistent spacing tokens for layout and component padding/margins.
 * Replaces inconsistent space-y-4, gap-6, p-6 patterns with semantic tokens.
 *
 * @packageDocumentation
 */

/**
 * Spacing system for consistent layouts
 */
export const spacing = {
  /**
   * Card padding variants
   * Used in: All card components
   */
  card: {
    compact: 'p-4',        // Tight spacing
    default: 'p-6',        // Standard spacing (most common)
    comfortable: 'p-8',    // Spacious layout
  },

  /**
   * Stack spacing (vertical)
   * Used in: Vertical layouts, flex columns
   */
  stack: {
    xs: 'space-y-2',   // 8px
    sm: 'space-y-3',   // 12px
    md: 'space-y-4',   // 16px
    lg: 'space-y-6',   // 24px
    xl: 'space-y-8',   // 32px
  },

  /**
   * Grid gaps
   * Used in: Grid layouts, dashboard grids
   */
  grid: {
    xs: 'gap-2',    // 8px
    sm: 'gap-3',    // 12px
    md: 'gap-4',    // 16px
    lg: 'gap-6',    // 24px
    xl: 'gap-8',    // 32px
  },

  /**
   * Section spacing (margins between major sections)
   * Used in: Dashboard sections, page sections
   */
  section: {
    sm: 'mb-4',    // 16px
    md: 'mb-6',    // 24px
    lg: 'mb-8',    // 32px
    xl: 'mb-12',   // 48px
  },

  /**
   * Inline spacing (horizontal gaps)
   * Used in: Flex rows, inline elements
   */
  inline: {
    xs: 'space-x-1',    // 4px
    sm: 'space-x-2',    // 8px
    md: 'space-x-3',    // 12px
    lg: 'space-x-4',    // 16px
  },

  /**
   * Component-specific spacing
   */
  component: {
    /** Card header to content spacing */
    cardHeader: 'mb-6',

    /** Icon to text spacing */
    iconText: 'gap-2',

    /** Button padding */
    button: {
      sm: 'px-3 py-1.5',
      md: 'px-4 py-2',
      lg: 'px-6 py-3',
    },

    /** Input padding */
    input: 'px-3 py-2',
  },
} as const;

/**
 * Raw spacing values (for custom combinations)
 */
export const spacingScale = {
  0: 'p-0',
  1: 'p-1',    // 4px
  2: 'p-2',    // 8px
  3: 'p-3',    // 12px
  4: 'p-4',    // 16px
  5: 'p-5',    // 20px
  6: 'p-6',    // 24px
  8: 'p-8',    // 32px
  10: 'p-10',  // 40px
  12: 'p-12',  // 48px
} as const;

/**
 * Type exports
 */
export type Spacing = typeof spacing;
export type SpacingScale = typeof spacingScale;
