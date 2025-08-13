// Enterprise ASO Dashboard Design System - Design Tokens
// Secure, Scalable, Branded Token Architecture

export interface DesignTokens {
  colors: {
    brand: {
      primary: string;
      secondary: string;
      accent: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Yodel Mobile Enterprise Design Tokens
export const designTokens: DesignTokens = {
  colors: {
    brand: {
      primary: '#F97316',        // Yodel Mobile orange (matching current branding)
      secondary: '#1F2937',      // Dark theme base
      accent: '#F97316',         // Consistent with charts
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    neutral: {
      50: '#F9FAFB',           // Light backgrounds
      100: '#F3F4F6',          // Card backgrounds
      200: '#E5E7EB',          // Borders
      300: '#D1D5DB',          // Dividers
      400: '#9CA3AF',          // Placeholder text
      500: '#6B7280',          // Secondary text
      600: '#4B5563',          // Body text
      700: '#374151',          // Headings
      800: '#1F2937',          // Dark borders
      900: '#111827',          // Dark backgrounds
      950: '#030712',          // Darkest backgrounds
    },
  },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: {
      xs: '0.75rem',           // 12px - small labels
      sm: '0.875rem',          // 14px - body text
      base: '1rem',            // 16px - base body
      lg: '1.125rem',          // 18px - subheadings
      xl: '1.25rem',           // 20px - headings
      '2xl': '1.5rem',         // 24px - large headings
      '3xl': '1.875rem',       // 30px - metrics
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.5rem',              // 8px
    sm: '0.75rem',             // 12px
    md: '1rem',                // 16px
    lg: '1.5rem',              // 24px
    xl: '2rem',                // 32px
    '2xl': '3rem',             // 48px
    '3xl': '4rem',             // 64px
  },
  borderRadius: {
    sm: '0.375rem',            // 6px
    md: '0.5rem',              // 8px
    lg: '0.75rem',             // 12px
    xl: '1rem',                // 16px
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
};

// Chart Theme System - Unified styling for all data visualizations
export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
    grid: string;
    text: string;
    background: string;
    trafficSources: {
      [key: string]: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      label: string;
      title: string;
      legend: string;
    };
  };
  spacing: {
    padding: string;
    margin: string;
  };
}

export const chartTheme: ChartTheme = {
  colors: {
    primary: designTokens.colors.brand.primary,      // #F97316 - Main data series
    secondary: designTokens.colors.semantic.info,    // #3B82F6 - Secondary data series
    tertiary: designTokens.colors.semantic.success,  // #10B981 - Third data series
    quaternary: designTokens.colors.semantic.warning, // #F59E0B - Fourth data series
    grid: designTokens.colors.neutral[800],          // Subtle grid lines
    text: designTokens.colors.neutral[100],          // Light text for dark mode
    background: 'transparent',                       // Inherit from card
    trafficSources: {
      'App Store Search': '#F97316',                 // Yodel orange
      'Apple Search Ads': '#3B82F6',                 // Blue
      'App Store Browse': '#10B981',                 // Green
      'App Referrer': '#F59E0B',                     // Yellow
      'Web Referrer': '#EF4444',                     // Red
      'Default': '#6B7280',                          // Gray fallback
    },
  },
  typography: {
    fontFamily: designTokens.typography.fontFamily,
    fontSize: {
      label: designTokens.typography.fontSize.sm,
      title: designTokens.typography.fontSize.lg,
      legend: designTokens.typography.fontSize.xs,
    },
  },
  spacing: {
    padding: designTokens.spacing.md,
    margin: designTokens.spacing.sm,
  },
};

// Utility function to get traffic source color
export const getTrafficSourceColor = (trafficSource: string): string => {
  return chartTheme.colors.trafficSources[trafficSource] || 
         chartTheme.colors.trafficSources['Default'];
};

// CSS variable names mapping for runtime theme switching
export const cssVariables = {
  colors: {
    brand: {
      primary: '--brand-primary',
      secondary: '--brand-secondary',
      accent: '--brand-accent',
    },
    semantic: {
      success: '--semantic-success',
      warning: '--semantic-warning',
      error: '--semantic-error',
      info: '--semantic-info',
    },
  },
} as const;