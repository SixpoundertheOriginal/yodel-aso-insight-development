export const THEME_COLORS = {
  // Text Colors
  primary: 'text-foreground',
  secondary: 'text-muted-foreground',

  // Semantic Colors
  warning: 'text-warning-foreground',
  success: 'text-success-foreground',
  error: 'text-destructive',
  info: 'text-info-foreground',

  // Background Colors
  warning_bg: 'bg-warning/10',
  success_bg: 'bg-success/10',
  error_bg: 'bg-destructive/10',
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS;

