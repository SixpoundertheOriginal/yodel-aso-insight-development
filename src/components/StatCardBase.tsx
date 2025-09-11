import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StatCardBase
 * 
 * Shared foundation component for all stat cards in the design system.
 * Provides consistent styling tokens, layout structure, and accessibility features.
 * 
 * This component should not be used directly - instead use:
 * - DashboardStatsCard for standard KPI metrics
 * - TrafficSourceKpiCards for analytics with action recommendations
 * 
 * Design System Tokens:
 * - Background: bg-background/60 (consistent card surface)
 * - Border: border-border rounded-lg (system border + 8px radius)
 * - Shadow: shadow-sm (subtle elevation)
 * - Padding: p-6 (24px internal spacing)
 * - Min Size: min-w-[180px] min-h-[100px] (prevents layout collapse)
 */

export interface StatCardBaseProps {
  /** Card content - typically includes label, value, and optional indicators */
  children: React.ReactNode;
  
  /** Additional CSS classes for customization */
  className?: string;
  
  /** Click handler for interactive cards */
  onClick?: () => void;
  
  /** Whether the card should show interactive states (hover, cursor) */
  interactive?: boolean;
  
  /** Test identifier */
  'data-testid'?: string;
}

export const StatCardBase: React.FC<StatCardBaseProps> = ({
  children,
  className,
  onClick,
  interactive = false,
  'data-testid': testId,
}) => {
  return (
    <Card 
      data-testid={testId}
      className={cn(
        // DS Foundation Tokens
        'bg-background/60 border-border rounded-lg shadow-sm',
        // Interactive states
        interactive && 'hover:bg-background/80 cursor-pointer transition-colors',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 min-w-[180px] min-h-[100px] w-full h-full flex flex-col justify-center">
        {children}
      </CardContent>
    </Card>
  );
};

/**
 * StatCardLabel
 * 
 * Consistent label component for stat cards.
 * Uses DS typography tokens for metric identifiers.
 */
export interface StatCardLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const StatCardLabel: React.FC<StatCardLabelProps> = ({ children, className }) => (
  <div className={cn('text-xs text-muted-foreground text-center w-full mb-1', className)}>
    {children}
  </div>
);

/**
 * StatCardValue
 * 
 * Consistent value component for stat cards.
 * Uses DS typography tokens for primary data display.
 */
export interface StatCardValueProps {
  children: React.ReactNode;
  className?: string;
}

export const StatCardValue: React.FC<StatCardValueProps> = ({ children, className }) => (
  <div className={cn(
    'font-mono text-2xl md:text-3xl font-bold text-white text-center w-full',
    className
  )}>
    {children}
  </div>
);

/**
 * StatCardDelta
 * 
 * Consistent delta/trend indicator for stat cards.
 * Includes proper accessibility features and semantic colors.
 */
export interface StatCardDeltaProps {
  /** Delta value (e.g., 3.2 for +3.2% or -1.5 for -1.5%) */
  delta: number;
  
  /** Additional CSS classes */
  className?: string;
}

export const StatCardDelta: React.FC<StatCardDeltaProps> = ({ delta, className }) => {
  const isPositive = delta >= 0;
  const abs = Math.abs(delta);
  const signed = `${isPositive ? '+' : '-'}${abs.toFixed(1)}%`;
  const aria = `${isPositive ? 'Up' : 'Down'} ${abs.toFixed(1)} percent`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-sm',
        isPositive ? 'text-emerald-500' : 'text-red-500',
        className
      )}
      role="status"
      aria-label={aria}
    >
      {isPositive ? (
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{signed}</span>
    </div>
  );
};

/**
 * StatCardSubLabel
 * 
 * Optional sub-label component for action indicators or secondary information.
 * Used in specialized cards like TrafficSourceKpiCards.
 */
export interface StatCardSubLabelProps {
  children: React.ReactNode;
  
  /** Color variant for different action types */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  
  /** Additional CSS classes */
  className?: string;
}

const subLabelVariants = {
  success: 'text-green-500',
  warning: 'text-yellow-500', 
  error: 'text-red-500',
  info: 'text-blue-500',
  neutral: 'text-zinc-500'
};

export const StatCardSubLabel: React.FC<StatCardSubLabelProps> = ({ 
  children, 
  variant = 'neutral', 
  className 
}) => (
  <span className={cn('text-xs font-semibold', subLabelVariants[variant], className)}>
    {children}
  </span>
);

export default StatCardBase;