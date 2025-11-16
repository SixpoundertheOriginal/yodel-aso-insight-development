/**
 * DESIGN REGISTRY: Icon System
 *
 * Standardized icon sizing across the application.
 * Replaces inconsistent h-3 w-3, h-4 w-4, h-5 w-5 patterns with semantic sizes.
 *
 * @packageDocumentation
 */

/**
 * Icon sizing system
 */
export const icons = {
  /**
   * Size scale (generic usage)
   */
  sizes: {
    xs: 'h-3 w-3',    // 12px - Inline text icons
    sm: 'h-4 w-4',    // 16px - Card headers, labels, buttons
    md: 'h-5 w-5',    // 20px - Section headers, default size
    lg: 'h-6 w-6',    // 24px - Page headers, large buttons
    xl: 'h-8 w-8',    // 32px - Dashboard hero, large displays
  },

  /**
   * Semantic sizing (recommended usage)
   */
  semantic: {
    /** Icons in card headers */
    cardHeader: 'h-5 w-5',

    /** Icons in section headers */
    sectionHeader: 'h-6 w-6',

    /** Icons in buttons */
    button: 'h-4 w-4',

    /** Icons inline with text */
    inline: 'h-3 w-3',

    /** Icons in badges/chips */
    badge: 'h-3 w-3',

    /** Icons in metric displays */
    metric: 'h-6 w-6',

    /** Icons in navigation */
    nav: 'h-5 w-5',
  },

  /**
   * Color modifiers (combine with size)
   */
  colors: {
    primary: 'text-yodel-orange',
    secondary: 'text-muted-foreground',
    muted: 'text-zinc-500',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400',
  },
} as const;

/**
 * Type exports
 */
export type Icons = typeof icons;
export type IconSizes = typeof icons.sizes;
export type IconColors = typeof icons.colors;
