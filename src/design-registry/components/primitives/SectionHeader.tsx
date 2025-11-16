/**
 * DESIGN REGISTRY: SectionHeader Primitive
 *
 * Standard section header with icon and optional subtitle.
 * Replaces 8+ inconsistent section header implementations.
 *
 * @packageDocumentation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { typography } from '../../tokens/typography';
import { spacing } from '../../tokens/spacing';
import { icons } from '../../tokens/icons';
import type { SectionHeaderProps } from '../../types';

/**
 * SectionHeader - Consistent section titles
 *
 * Displays section headers with optional icon and subtitle.
 * Uses semantic typography and spacing tokens.
 *
 * @example
 * ```tsx
 * // Basic section header
 * <SectionHeader title="ASO Organic Visibility" />
 *
 * // With icon
 * <SectionHeader
 *   icon={TrendingUp}
 *   title="Two-Path Conversion Analysis"
 * />
 *
 * // With icon and subtitle
 * <SectionHeader
 *   icon={Activity}
 *   title="ASO Intelligence Layer"
 *   subtitle="Advanced performance metrics"
 * />
 * ```
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  className,
  children,
}) => {
  return (
    <div className={cn('flex items-center gap-3', spacing.section.md, className)}>
      {Icon && (
        <Icon className={cn(icons.semantic.sectionHeader, icons.colors.primary)} />
      )}
      <div className="flex-1">
        <h2 className={typography.section.primary}>{title}</h2>
        {subtitle && (
          <p className={typography.card.subtitle}>{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
};

SectionHeader.displayName = 'SectionHeader';
