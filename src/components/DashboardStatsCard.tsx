import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercentageWithSuffix } from '@/utils/format';
import { 
  StatCardBase, 
  StatCardLabel, 
  StatCardValue, 
  StatCardDelta, 
  StatCardSubLabel 
} from './StatCardBase';

/**
 * DashboardStatsCard
 *
 * The canonical component for displaying KPIs and statistical summaries across all 
 * Yodel analytics and reporting interfaces. Built on StatCardBase foundation for
 * consistent design system compliance.
 * 
 * Features:
 * - Design system compliant styling and tokens
 * - Responsive typography and layout
 * - Accessibility compliant with proper ARIA labels
 * - Optional trend indicators with semantic colors
 * - Support for both numeric and percentage formatting
 * - Optional sub-labels for action recommendations
 *
 * Standard Grid Pattern:
 * - Mobile: 2 columns (grid-cols-2)
 * - Tablet: 3 columns (sm:grid-cols-3)  
 * - Desktop: 6 columns (xl:grid-cols-6)
 *
 * Props:
 * - label: string — Metric identifier (e.g., "Downloads", "Conversion Rate")
 * - value: number — Raw numeric value for display
 * - variant?: 'number' | 'percentage' — Formatting mode (default: 'number')
 * - decimals?: number — Decimal places for percentage variant (default: 1)
 * - delta?: number — Optional change percentage (e.g., +3.2, -1.4)
 * - subLabel?: string — Optional action/status indicator (e.g., "Scale", "Optimize")
 * - subLabelVariant?: — Color variant for subLabel
 * - className?: string — Additional CSS classes
 *
 * Usage Examples:
 * ```jsx
 * // Standard KPI grid
 * <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
 *   <DashboardStatsCard label="Impressions" value={1203456} delta={3.2} />
 *   <DashboardStatsCard label="Downloads" value={45678} delta={-1.4} />
 *   <DashboardStatsCard label="CVR" value={2.85} variant="percentage" delta={0.6} />
 *   <DashboardStatsCard 
 *     label="App Store Search" 
 *     value={98765} 
 *     delta={4.1} 
 *     subLabel="Scale" 
 *     subLabelVariant="success" 
 *   />
 * </div>
 * ```
 */
export type DashboardStatsCardProps = {
  /** Metric name/description */
  label: string;
  
  /** Raw numeric value */
  value: number;
  
  /** Formatting mode */
  variant?: 'number' | 'percentage';
  
  /** Decimal places for percentage variant */
  decimals?: number;
  
  /** Optional change percentage */
  delta?: number;
  
  /** Optional action/status indicator */
  subLabel?: string;
  
  /** Color variant for subLabel */
  subLabelVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  
  /** Additional CSS classes */
  className?: string;
};

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({
  label,
  value,
  variant = 'number',
  decimals = 1,
  delta,
  subLabel,
  subLabelVariant = 'neutral',
  className,
}) => {
  const formattedValue = useMemo(() => {
    if (variant === 'percentage') {
      return formatPercentageWithSuffix(value, decimals);
    }
    return formatNumber(value);
  }, [value, variant, decimals]);

  return (
    <StatCardBase 
      data-testid="dashboard-stat-card" 
      className={className}
    >
      <div className="flex flex-col items-center text-center gap-2 w-full">
        {/* Header with label and optional subLabel */}
        <div className="flex items-center justify-between w-full mb-1">
          <StatCardLabel className="flex-1">{label}</StatCardLabel>
          {subLabel && (
            <StatCardSubLabel variant={subLabelVariant}>
              {subLabel}
            </StatCardSubLabel>
          )}
        </div>
        
        {/* Main value */}
        <StatCardValue>
          {formattedValue}
        </StatCardValue>
        
        {/* Optional delta indicator */}
        {delta !== undefined && delta !== null && (
          <StatCardDelta delta={delta} />
        )}
      </div>
    </StatCardBase>
  );
};

export default DashboardStatsCard;
