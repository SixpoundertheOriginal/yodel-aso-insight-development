/**
 * DESIGN REGISTRY: RAW TOKEN VALUES
 *
 * These are the primitive values that all semantic tokens are built from.
 * Do NOT import these directly in components - use semantic tokens from tokens/ instead.
 *
 * @packageDocumentation
 */

export const RAW_TOKENS = {
  /**
   * Color palette - Yodel Mobile brand colors + semantic colors
   */
  colors: {
    // Brand Orange
    orange: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316', // Main brand color
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },
    // Brand Blue
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6', // Main blue accent
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    // Semantic Colors
    green: {
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
    },
    red: {
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
    },
    yellow: {
      400: '#FACC15',
      500: '#EAB308',
      600: '#CA8A04',
    },
    purple: {
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
    },
    pink: {
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
    },
    cyan: {
      400: '#22D3EE',
      500: '#06B6D4',
      600: '#0891B2',
    },
    // Grayscale
    zinc: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
      950: '#09090B',
    },
  },

  /**
   * Spacing scale (based on 4px grid)
   */
  spacing: {
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
  },

  /**
   * Font sizes (responsive with clamp)
   */
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },

  /**
   * Font weights
   */
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  /**
   * Border radius
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  /**
   * Shadows
   */
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  /**
   * Z-index scale
   */
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    modal: 50,
    tooltip: 60,
    toast: 70,
  },

  /**
   * Animation durations (in milliseconds)
   */
  duration: {
    instant: 0,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500,
  },

  /**
   * Opacity values
   */
  opacity: {
    0: '0',
    10: '0.1',
    20: '0.2',
    30: '0.3',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    80: '0.8',
    90: '0.9',
    100: '1',
  },
} as const;

/**
 * Type helper for accessing raw token values
 */
export type RawTokens = typeof RAW_TOKENS;
