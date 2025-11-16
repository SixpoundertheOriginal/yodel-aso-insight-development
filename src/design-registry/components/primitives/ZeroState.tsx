/**
 * DESIGN REGISTRY: ZeroState Primitive
 *
 * Standard empty state component with consistent messaging.
 * Replaces 12+ inconsistent empty state implementations.
 *
 * @packageDocumentation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { typography } from '../../tokens/typography';
import { spacing } from '../../tokens/spacing';
import { icons } from '../../tokens/icons';
import { microcopy } from '../../tokens/microcopy';
import type { ZeroStateProps } from '../../types';

/**
 * ZeroState - Consistent empty state displays
 *
 * Displays empty states with optional icon, title, description, and action.
 * Uses semantic typography, spacing, and microcopy tokens.
 *
 * @example
 * ```tsx
 * // Basic empty state
 * <ZeroState
 *   title="No data available"
 *   description="Try adjusting your filters or date range"
 * />
 *
 * // With icon
 * <ZeroState
 *   icon={SearchX}
 *   title="No results found"
 *   description="We couldn't find any matching results"
 * />
 *
 * // With action button
 * <ZeroState
 *   icon={Database}
 *   title="No data available"
 *   description={microcopy.empty.noData}
 *   action={
 *     <Button onClick={handleRefresh}>
 *       Refresh Data
 *     </Button>
 *   }
 * />
 * ```
 */
export const ZeroState: React.FC<ZeroStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}) => {
  // Variant-specific styling
  const variantClasses = {
    default: 'text-muted-foreground',
    subtle: 'text-muted-foreground/60',
    emphasized: 'text-zinc-200',
  };

  const iconVariantClasses = {
    default: 'text-muted-foreground',
    subtle: 'text-muted-foreground/40',
    emphasized: 'text-yodel-orange',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        spacing.card.comfortable,
        className
      )}
    >
      {Icon && (
        <div className={cn('mb-4', iconVariantClasses[variant])}>
          <Icon className={icons.sizes.xl} strokeWidth={1.5} />
        </div>
      )}

      <h3 className={cn(typography.card.title, variantClasses[variant], 'mb-2')}>
        {title}
      </h3>

      {description && (
        <p className={cn(typography.body.sm, 'text-muted-foreground/80 mb-4 max-w-md')}>
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

ZeroState.displayName = 'ZeroState';
