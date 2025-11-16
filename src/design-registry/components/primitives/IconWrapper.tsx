/**
 * DESIGN REGISTRY: IconWrapper Primitive
 *
 * Consistent icon sizing and styling wrapper.
 * Standardizes icon usage across all components.
 *
 * @packageDocumentation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { icons } from '../../tokens/icons';
import type { IconWrapperProps } from '../../types';

/**
 * IconWrapper - Standardized icon sizing and colors
 *
 * Wraps lucide-react icons with consistent sizing and semantic colors.
 * Ensures all icons follow design registry standards.
 *
 * @example
 * ```tsx
 * // Semantic sizing
 * <IconWrapper icon={TrendingUp} semantic="cardHeader" />
 * <IconWrapper icon={Activity} semantic="sectionHeader" />
 * <IconWrapper icon={X} semantic="button" />
 *
 * // Size variants
 * <IconWrapper icon={Star} size="sm" />
 * <IconWrapper icon={Star} size="md" />
 * <IconWrapper icon={Star} size="lg" />
 *
 * // Semantic colors
 * <IconWrapper icon={CheckCircle} color="success" />
 * <IconWrapper icon={AlertCircle} color="warning" />
 * <IconWrapper icon={XCircle} color="error" />
 *
 * // Custom styling
 * <IconWrapper
 *   icon={Zap}
 *   size="lg"
 *   color="primary"
 *   className="animate-pulse"
 * />
 * ```
 */
export const IconWrapper: React.FC<IconWrapperProps> = ({
  icon: Icon,
  size,
  semantic,
  color,
  strokeWidth,
  className,
}) => {
  // Determine size class (semantic takes precedence)
  const sizeClass = semantic ? icons.semantic[semantic] : size ? icons.sizes[size] : icons.sizes.md;

  // Determine color class
  const colorClass = color ? icons.colors[color] : '';

  return (
    <Icon
      className={cn(sizeClass, colorClass, className)}
      strokeWidth={strokeWidth}
    />
  );
};

IconWrapper.displayName = 'IconWrapper';
