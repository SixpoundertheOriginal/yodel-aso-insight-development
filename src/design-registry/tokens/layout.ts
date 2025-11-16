/**
 * DESIGN REGISTRY: Layout System
 *
 * Standardized container widths, grid patterns, and responsive layouts.
 * Creates consistent page and component layouts.
 *
 * @packageDocumentation
 */

/**
 * Layout system for containers and grids
 */
export const layout = {
  /**
   * Container widths
   * Used in: Page containers, content wrappers
   */
  container: {
    sm: 'max-w-3xl mx-auto',      // ~768px - Narrow content
    md: 'max-w-5xl mx-auto',      // ~1024px - Standard content
    lg: 'max-w-7xl mx-auto',      // ~1280px - Wide content
    xl: 'max-w-screen-2xl mx-auto', // ~1536px - Full width
    full: 'max-w-full',           // 100% - No max width
  },

  /**
   * Grid patterns (common dashboard layouts)
   */
  grid: {
    /** 2-column grid (default on desktop) */
    twoCol: 'grid grid-cols-1 md:grid-cols-2 gap-6',

    /** 3-column grid (metrics, KPIs) */
    threeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',

    /** 4-column grid (dense layouts) */
    fourCol: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',

    /** KPI cards (typical dashboard layout) */
    kpi: 'grid grid-cols-1 md:grid-cols-2 gap-6',

    /** Dashboard grid (responsive 2-col) */
    dashboard: 'grid grid-cols-1 lg:grid-cols-2 gap-6',

    /** Metric grid (dense 3-col) */
    metrics: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',

    /** Full width single column */
    single: 'grid grid-cols-1 gap-6',
  },

  /**
   * Flex layouts
   */
  flex: {
    /** Horizontal stack with center alignment */
    row: 'flex flex-row items-center gap-4',

    /** Vertical stack */
    col: 'flex flex-col gap-4',

    /** Space between (common for headers) */
    between: 'flex items-center justify-between',

    /** Center aligned */
    center: 'flex items-center justify-center',

    /** Wrap on overflow */
    wrap: 'flex flex-wrap gap-4',
  },

  /**
   * Page sections
   */
  section: {
    /** Full page section with padding */
    page: 'container mx-auto p-6 space-y-6',

    /** Dashboard section */
    dashboard: 'space-y-6',

    /** Content section */
    content: 'space-y-4',
  },

  /**
   * Responsive breakpoints (informational, use with Tailwind utilities)
   */
  breakpoints: {
    sm: '640px',   // Mobile landscape
    md: '768px',   // Tablet
    lg: '1024px',  // Desktop
    xl: '1280px',  // Large desktop
    '2xl': '1536px', // Extra large
  },
} as const;

/**
 * Type exports
 */
export type Layout = typeof layout;
export type Container = typeof layout.container;
export type Grid = typeof layout.grid;
export type Flex = typeof layout.flex;
