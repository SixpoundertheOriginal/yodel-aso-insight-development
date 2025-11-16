/**
 * DESIGN REGISTRY: Elevation System
 *
 * Standardized shadow, z-index, and glass morphism effects.
 * Creates visual hierarchy through consistent elevation levels.
 *
 * @packageDocumentation
 */

/**
 * Elevation system for shadows and depth
 */
export const elevation = {
  /**
   * Shadow levels
   * Used in: Cards, modals, dropdowns
   */
  shadows: {
    none: 'shadow-none',
    sm: 'shadow-sm',             // Cards at rest, subtle elevation
    md: 'shadow-md',             // Hover states, slight lift
    lg: 'shadow-lg',             // Modals, dialogs, important elements
    xl: 'shadow-xl',             // Overlays, popover menus
    '2xl': 'shadow-2xl',         // Maximum elevation
    glow: 'shadow-glow-orange',  // Brand glow effect (yodel orange)
    glowBlue: 'shadow-glow-blue', // Blue accent glow
  },

  /**
   * Z-index layering
   * Used in: Modals, dropdowns, tooltips, toasts
   */
  zIndex: {
    base: 'z-0',           // Default layer
    dropdown: 'z-10',      // Dropdown menus
    sticky: 'z-20',        // Sticky headers
    modal: 'z-50',         // Modal dialogs
    tooltip: 'z-60',       // Tooltips
    toast: 'z-70',         // Toast notifications
  },

  /**
   * Glass morphism effects
   * Used in: Cards, overlays, modern UI elements
   */
  glass: {
    light: 'backdrop-blur-sm bg-card/50 border-border/50',
    medium: 'backdrop-blur-md bg-card/60 border-border/60',
    strong: 'backdrop-blur-xl bg-card/70 border-border/70',
  },

  /**
   * Hover elevation effects
   * Used in: Interactive cards, buttons
   */
  hover: {
    lift: 'hover:shadow-lg hover:scale-[1.02] transition-all duration-300',
    glow: 'hover:shadow-glow-orange transition-shadow duration-300',
    subtle: 'hover:shadow-md transition-shadow duration-200',
  },
} as const;

/**
 * Type exports
 */
export type Elevation = typeof elevation;
export type Shadows = typeof elevation.shadows;
export type ZIndex = typeof elevation.zIndex;
export type Glass = typeof elevation.glass;
