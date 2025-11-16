/**
 * DESIGN REGISTRY
 *
 * Single source of truth for all UI tokens, utilities, and design primitives.
 * Import from here to access the complete design system.
 *
 * @example
 * ```ts
 * import { formatters, semanticColors, typography, cn } from '@/design-registry';
 *
 * // Use formatters
 * const formatted = formatters.number.compact(1500000); // "1.5M"
 *
 * // Use semantic colors
 * const deltaClass = semanticColors.delta.positive.text; // "text-green-400"
 *
 * // Use typography
 * const headerClass = typography.section.primary; // "text-2xl font-bold..."
 *
 * // Use utility
 * const merged = cn('p-4', 'bg-red-500', { 'p-6': isLarge });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// RAW TOKENS
// ============================================================================
export { RAW_TOKENS, type RawTokens } from './constants/tokens';

// ============================================================================
// FORMATTERS
// ============================================================================
export {
  formatters,
  type Formatters,
  type NumberFormatter,
  type PercentageFormatter,
  type DateFormatter,
} from './tokens/formatters';

// ============================================================================
// SEMANTIC COLORS
// ============================================================================
export {
  semanticColors,
  getSemanticColor,
  type SemanticColors,
  type DeltaColors,
  type PriorityColors,
  type TrafficSourceColors,
  type MetricColors,
  type StatusColors,
  type ScoreColors,
  type ColorToken,
  type BadgeColorToken,
  type GradientColorToken,
} from './tokens/colors';

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export {
  typography,
  fontWeight,
  fontSize,
  textColor,
  type Typography,
  type FontWeight,
  type FontSize,
  type TextColor,
} from './tokens/typography';

// ============================================================================
// SPACING
// ============================================================================
export {
  spacing,
  spacingScale,
  type Spacing,
  type SpacingScale,
} from './tokens/spacing';

// ============================================================================
// ICONS
// ============================================================================
export {
  icons,
  type Icons,
  type IconSizes,
  type IconColors,
} from './tokens/icons';

// ============================================================================
// ELEVATION
// ============================================================================
export {
  elevation,
  type Elevation,
  type Shadows,
  type ZIndex,
  type Glass,
} from './tokens/elevation';

// ============================================================================
// MOTION
// ============================================================================
export {
  motion,
  type Motion,
  type Duration,
  type Transitions,
  type Animations,
} from './tokens/motion';

// ============================================================================
// LAYOUT
// ============================================================================
export {
  layout,
  type Layout,
  type Container,
  type Grid,
  type Flex,
} from './tokens/layout';

// ============================================================================
// MICROCOPY
// ============================================================================
export {
  microcopy,
  type Microcopy,
  type LoadingMessages,
  type EmptyMessages,
  type ErrorMessages,
} from './tokens/microcopy';

// ============================================================================
// UTILITIES
// ============================================================================
export {
  cn,
  applySemanticColor,
  responsive,
  states,
} from './utils/classBuilder';

// ============================================================================
// TYPES
// ============================================================================
export type {
  FormatType,
  DeltaFormat,
  MetricSize,
  PriorityLevel,
  ScoreLevel,
  ConfidenceLevel,
  TrafficSourceType,
  MetricType,
  StatusType,
  DeltaDirection,
  IconSize,
  SpacingSize,
  CardPadding,
  ShadowLevel,
  ZIndexLayer,
  AnimationDuration,
  ContainerWidth,
  GridPattern,
  TypographyVariant,
  BrandColor,
  DateFormatType,
  ZeroStateVariant,
  BadgeVariant,
  IconSemantic,
  IconColor,
  PrimitiveProps,
  DeltaChipProps,
  MetricValueProps,
  SectionHeaderProps,
  LoadingSkeletonProps,
  ZeroStateProps,
  BadgeProps,
  IconWrapperProps,
  KpiCardProps,
} from './types';

// ============================================================================
// PRIMITIVE COMPONENTS (Phase 2 - Complete)
// ============================================================================
export {
  DeltaChip,
  MetricValue,
  SectionHeader,
  LoadingSkeleton,
  ZeroState,
  Badge,
  IconWrapper,
} from './components/primitives';

// ============================================================================
// TEMPLATE COMPONENTS (Phase 3 - Coming soon)
// ============================================================================
// export { KpiCard } from './components/templates/KpiCard';
// export { IntelligenceCard } from './components/templates/IntelligenceCard';
// export { InsightCard } from './components/templates/InsightCard';
// export { MetricGrid } from './components/templates/MetricGrid';
