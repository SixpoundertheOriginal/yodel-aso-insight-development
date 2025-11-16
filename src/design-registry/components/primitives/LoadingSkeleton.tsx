/**
 * DESIGN REGISTRY: LoadingSkeleton Primitive
 *
 * Consistent loading skeleton component.
 * Replaces 8+ different loading state implementations.
 *
 * @packageDocumentation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '../../tokens/motion';
import type { LoadingSkeletonProps } from '../../types';

/**
 * LoadingSkeleton - Consistent loading states
 *
 * Displays animated skeleton placeholders during data loading.
 * Supports custom heights, widths, and multiple skeleton lines.
 *
 * @example
 * ```tsx
 * // Single skeleton line
 * <LoadingSkeleton height="h-[280px]" />
 *
 * // Multiple skeleton lines for text
 * <LoadingSkeleton height="h-4" width="w-full" count={3} />
 *
 * // Card skeleton
 * <LoadingSkeleton height="h-32" width="w-full" />
 * ```
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 'h-4',
  width = 'w-full',
  count = 1,
  className,
  children,
}) => {
  // If only one skeleton, render it directly
  if (count === 1) {
    return (
      <div
        className={cn(
          'animate-pulse bg-muted rounded',
          height,
          width,
          className
        )}
      >
        {children}
      </div>
    );
  }

  // If multiple skeletons, render a stack
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse bg-muted rounded',
            height,
            width,
            className
          )}
        />
      ))}
    </div>
  );
};

LoadingSkeleton.displayName = 'LoadingSkeleton';
