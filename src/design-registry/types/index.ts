/**
 * DESIGN REGISTRY: TypeScript Type Definitions
 *
 * Centralized type definitions for the design system.
 * Ensures type safety across all design tokens and components.
 *
 * @packageDocumentation
 */

/**
 * Format types for number formatters
 */
export type FormatType = 'compact' | 'full' | 'precise' | 'percentage' | 'ratio' | 'currency';

/**
 * Delta format types
 */
export type DeltaFormat = 'percentage' | 'points' | 'number';

/**
 * Metric size variants
 */
export type MetricSize = 'hero' | 'primary' | 'secondary' | 'small';

/**
 * Priority levels for intelligence/opportunity features
 */
export type PriorityLevel = 'high' | 'medium' | 'low';

/**
 * Score levels for intelligence metrics
 */
export type ScoreLevel = 'excellent' | 'good' | 'moderate' | 'poor' | 'neutral';

/**
 * Confidence levels for simulations
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Traffic source types
 */
export type TrafficSourceType = 'search' | 'browse' | 'direct' | 'pdp';

/**
 * Metric types
 */
export type MetricType = 'impressions' | 'downloads' | 'cvr' | 'pageViews';

/**
 * Status types
 */
export type StatusType = 'success' | 'warning' | 'error' | 'info';

/**
 * Delta direction
 */
export type DeltaDirection = 'positive' | 'negative' | 'neutral';

/**
 * Icon sizes
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spacing sizes
 */
export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Card padding variants
 */
export type CardPadding = 'compact' | 'default' | 'comfortable';

/**
 * Shadow levels
 */
export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'glow' | 'glowBlue';

/**
 * Z-index layers
 */
export type ZIndexLayer = 'base' | 'dropdown' | 'sticky' | 'modal' | 'tooltip' | 'toast';

/**
 * Animation durations
 */
export type AnimationDuration = 'instant' | 'fast' | 'normal' | 'slow' | 'slower';

/**
 * Container widths
 */
export type ContainerWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Grid patterns
 */
export type GridPattern = 'twoCol' | 'threeCol' | 'fourCol' | 'kpi' | 'dashboard' | 'metrics' | 'single';

/**
 * Typography variants
 */
export type TypographyVariant =
  | 'display.xl' | 'display.lg' | 'display.md' | 'display.sm'
  | 'section.primary' | 'section.secondary' | 'section.tertiary'
  | 'card.title' | 'card.subtitle' | 'card.label'
  | 'metric.hero' | 'metric.primary' | 'metric.secondary' | 'metric.small'
  | 'body.lg' | 'body.md' | 'body.sm'
  | 'label.primary' | 'label.secondary' | 'label.tertiary';

/**
 * Brand color variants
 */
export type BrandColor = 'primary' | 'secondary';

/**
 * Date format types
 */
export type DateFormatType = 'short' | 'medium' | 'long';

/**
 * Props for primitive components
 */
export interface PrimitiveProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Delta chip props
 */
export interface DeltaChipProps extends PrimitiveProps {
  value: number;
  format?: DeltaFormat;
  size?: SpacingSize;
  showIcon?: boolean;
}

/**
 * Metric value props
 */
export interface MetricValueProps extends PrimitiveProps {
  value: number;
  format?: FormatType;
  size?: MetricSize;
  decimals?: number;
}

/**
 * Section header props
 */
export interface SectionHeaderProps extends PrimitiveProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}

/**
 * Loading skeleton props
 */
export interface LoadingSkeletonProps extends PrimitiveProps {
  height?: string;
  width?: string;
  count?: number;
}

/**
 * Zero state variant types
 */
export type ZeroStateVariant = 'default' | 'subtle' | 'emphasized';

/**
 * Zero state props
 */
export interface ZeroStateProps extends PrimitiveProps {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: ZeroStateVariant;
}

/**
 * Badge variant types
 */
export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'status' | 'priority' | 'score' | 'trafficSource';

/**
 * Badge props
 */
export interface BadgeProps extends PrimitiveProps {
  variant?: BadgeVariant;
  status?: StatusType;
  priority?: PriorityLevel;
  score?: ScoreLevel;
  trafficSource?: TrafficSourceType;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Icon semantic usage types
 */
export type IconSemantic = 'cardHeader' | 'sectionHeader' | 'button' | 'inline' | 'chart' | 'badge';

/**
 * Icon color types
 */
export type IconColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted';

/**
 * Icon wrapper props
 */
export interface IconWrapperProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  size?: IconSize;
  semantic?: IconSemantic;
  color?: IconColor;
  strokeWidth?: number;
  className?: string;
}

/**
 * KPI card template props
 */
export interface KpiCardProps extends PrimitiveProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  gradient: string;
  children: React.ReactNode;
  isLoading?: boolean;
}
