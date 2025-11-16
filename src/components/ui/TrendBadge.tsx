/**
 * TrendBadge - Legacy wrapper for DeltaChip
 *
 * MIGRATION NOTE: This component now uses the Design Registry DeltaChip primitive.
 * All new code should use DeltaChip directly from @/design-registry.
 *
 * This wrapper maintains backward compatibility for existing components.
 */

import { DeltaChip } from '@/design-registry';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number; // percentage change
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function TrendBadge({
  value,
  label = 'vs last period',
  size = 'sm',
  showIcon = true
}: TrendBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <DeltaChip
        value={value}
        format="percentage"
        size={size}
        showIcon={showIcon}
      />
      {label && (
        <span className={cn('text-zinc-500', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')}>
          {label}
        </span>
      )}
    </div>
  );
}
