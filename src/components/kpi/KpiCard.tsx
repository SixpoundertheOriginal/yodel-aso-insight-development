import React, { useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercentageWithSuffix } from '@/utils/format';
import './kpi-card.css';

export type KpiCardMode = 'compact' | 'regular' | 'dense';
export type KpiCardIntent = 'neutral' | 'good' | 'bad';

type Props = {
  label: string;
  value: string | number | null;
  unit?: '%' | '$' | string;
  delta?: number;
  intent?: KpiCardIntent;
  mode?: KpiCardMode;
  tooltipFullValue?: string;
  className?: string;
};

export const KpiCard: React.FC<Props> = ({
  label,
  value,
  unit,
  delta,
  intent = 'neutral',
  mode = 'regular',
  tooltipFullValue,
  className,
}) => {
  const display = useMemo(() => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    if (unit === '%') return formatPercentageWithSuffix(value, 1);
    return formatNumber(value);
  }, [value, unit]);

  const fullValue = useMemo(() => {
    if (tooltipFullValue) return tooltipFullValue;
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value + (unit || '');
    if (unit === '%') return formatPercentageWithSuffix(value, 2);
    return formatNumber(value);
  }, [tooltipFullValue, value, unit]);

  const resolvedIntent: KpiCardIntent = useMemo(() => {
    if (intent !== 'neutral') return intent;
    if (typeof delta !== 'number') return 'neutral';
    return delta >= 0 ? 'good' : 'bad';
  }, [intent, delta]);

  const padding = mode === 'compact' ? 'p-4' : mode === 'dense' ? 'p-3' : 'p-5';

  return (
    <div
      className={cn(
        'kpi-card kpi bg-background/60 border border-border rounded-lg shadow-sm',
        padding,
        'flex items-center gap-3 min-w-[280px]',
        className
      )}
      title={fullValue}
      aria-label={`${label}: ${fullValue}`}
      role="group"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="kpi-value font-mono tabular-nums whitespace-nowrap overflow-hidden text-ellipsis min-w-0 leading-none text-foreground">
          {display}{unit && unit !== '%' && typeof value !== 'string' ? unit : ''}
        </div>
      </div>
      {typeof delta === 'number' && (
        <div
          className={cn(
            'kpi-chip inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
            resolvedIntent === 'good' && 'text-emerald-600 bg-emerald-500/15 border border-emerald-500/30',
            resolvedIntent === 'bad' && 'text-red-600 bg-red-500/15 border border-red-500/30',
            resolvedIntent === 'neutral' && 'text-zinc-400 bg-zinc-500/10 border border-zinc-500/20'
          )}
          aria-label={`Change ${delta.toFixed(1)} percent`}
        >
          {delta >= 0 ? (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;

