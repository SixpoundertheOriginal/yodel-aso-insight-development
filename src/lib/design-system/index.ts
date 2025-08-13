// Enterprise ASO Dashboard Design System - Main Export
// Centralized access to all design system components and utilities

// Design tokens and theme system
export { designTokens, chartTheme, getTrafficSourceColor, cssVariables } from './tokens';
export type { DesignTokens, ChartTheme } from './tokens';

// Base components
export { 
  BaseCard, 
  EnterpriseMetricCard, 
  ChartContainer, 
  EnterpriseTypography 
} from './base-components';
export type { 
  BaseCardProps, 
  EnterpriseMetricCardProps, 
  ChartContainerProps 
} from './base-components';

// Chart theming utilities
export { 
  rechartsTheme, 
  chartJsTheme, 
  getChartColorPalette, 
  getTrafficSourcePalette, 
  baseChartConfig, 
  rechartsConfig, 
  applyChartTheme 
} from './chart-theme';

// Import tokens for utility functions
import { designTokens, type DesignTokens } from './tokens';

// Utility functions for consistent design system usage
export const designSystemUtils = {
  // Get consistent spacing value
  getSpacing: (size: keyof typeof designTokens.spacing) => designTokens.spacing[size],
  
  // Get consistent font size
  getFontSize: (size: keyof typeof designTokens.typography.fontSize) => 
    designTokens.typography.fontSize[size],
  
  // Get consistent border radius
  getBorderRadius: (size: keyof typeof designTokens.borderRadius) => 
    designTokens.borderRadius[size],
  
  // Get consistent shadow
  getShadow: (size: keyof typeof designTokens.shadows) => designTokens.shadows[size],
  
  // Get semantic color
  getSemanticColor: (type: keyof typeof designTokens.colors.semantic) => 
    designTokens.colors.semantic[type],
  
  // Get brand color
  getBrandColor: (type: keyof typeof designTokens.colors.brand) => 
    designTokens.colors.brand[type],
};

// CSS custom properties generator for runtime theming
export const generateCSSCustomProperties = (tokens: DesignTokens) => {
  return {
    '--brand-primary': tokens.colors.brand.primary,
    '--brand-secondary': tokens.colors.brand.secondary,
    '--brand-accent': tokens.colors.brand.accent,
    '--semantic-success': tokens.colors.semantic.success,
    '--semantic-warning': tokens.colors.semantic.warning,
    '--semantic-error': tokens.colors.semantic.error,
    '--semantic-info': tokens.colors.semantic.info,
    '--font-family': tokens.typography.fontFamily,
  };
};

// Widget factory pattern for scalable dashboard components
export interface WidgetConfig {
  type: 'metric' | 'chart' | 'summary' | 'custom';
  title: string;
  variant?: string;
  data?: any;
  props?: Record<string, any>;
}

export const createWidget = (config: WidgetConfig): React.ComponentType => {
  // This will be expanded in Phase 3 for dynamic widget creation
  throw new Error('Widget factory not yet implemented - Part of Phase 3');
};

// Multi-tenant theming support (for Phase 4)
export interface TenantTheme {
  organizationId: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customCSS?: string;
  logoUrl?: string;
}

export const applyTenantTheme = (theme: TenantTheme): void => {
  // This will be implemented in Phase 4 for white-label support
  throw new Error('Tenant theming not yet implemented - Part of Phase 4');
};