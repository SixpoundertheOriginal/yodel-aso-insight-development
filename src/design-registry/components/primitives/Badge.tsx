/**
 * DESIGN REGISTRY: Badge Primitive
 *
 * Enhanced badge component with semantic color variants.
 * Extends shadcn/ui Badge with design registry integration.
 *
 * @packageDocumentation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { semanticColors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import type { BadgeProps } from '../../types';

/**
 * Badge - Semantic status and category indicators
 *
 * Displays badges with semantic color variants for status, priority, and scores.
 * Extends shadcn/ui Badge with design registry semantic colors.
 *
 * @example
 * ```tsx
 * // Status badges
 * <Badge variant="status" status="success">Active</Badge>
 * <Badge variant="status" status="error">Failed</Badge>
 *
 * // Priority badges
 * <Badge variant="priority" priority="high">High Priority</Badge>
 * <Badge variant="priority" priority="low">Low Priority</Badge>
 *
 * // Score badges
 * <Badge variant="score" score="excellent">95/100</Badge>
 * <Badge variant="score" score="poor">45/100</Badge>
 *
 * // Traffic source badges
 * <Badge variant="trafficSource" trafficSource="search">Search</Badge>
 * <Badge variant="trafficSource" trafficSource="browse">Browse</Badge>
 *
 * // Default badge
 * <Badge>Default Badge</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  status,
  priority,
  score,
  trafficSource,
  size = 'md',
  className,
  children,
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  // Get semantic colors based on variant
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'status':
        if (!status) return '';
        const statusColors = semanticColors.status[status];
        return cn(statusColors.bg, statusColors.text, statusColors.border, 'border');

      case 'priority':
        if (!priority) return '';
        const priorityColors = semanticColors.priority[priority];
        return cn(priorityColors.bg, priorityColors.text, priorityColors.border, 'border');

      case 'score':
        if (!score) return '';
        const scoreColors = semanticColors.score[score];
        return cn(scoreColors.bg, scoreColors.text, scoreColors.border, 'border');

      case 'trafficSource':
        if (!trafficSource) return '';
        const trafficColors = semanticColors.trafficSource[trafficSource];
        return cn(trafficColors.text, 'bg-card/50 border border-border/50');

      case 'outline':
        return 'border border-border bg-transparent text-foreground hover:bg-accent';

      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';

      case 'destructive':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';

      case 'default':
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        sizeClasses[size],
        getVariantClasses(),
        className
      )}
    >
      {children}
    </div>
  );
};

Badge.displayName = 'Badge';
