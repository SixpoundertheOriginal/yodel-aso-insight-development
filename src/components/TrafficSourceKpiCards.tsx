import React from 'react';
import { TrafficSource, AsoMetrics, MetricSummary } from '@/hooks/useMockAsoData';
import { formatNumber, formatPercentageWithSuffix } from '@/utils/format';
import { 
  StatCardBase, 
  StatCardLabel, 
  StatCardValue, 
  StatCardDelta, 
  StatCardSubLabel 
} from './StatCardBase';

interface TrafficSourceKpiCardsProps {
  sources: TrafficSource[];
  selectedKPI: string;
  summary: AsoMetrics;
  disableClicks?: boolean;
  onSourceClick?: (sourceName: string) => void;
}

const getKPIValueForTrafficSource = (source: TrafficSource, kpiId: string): MetricSummary => {
  if (source.metrics && (source.metrics as any)[kpiId]) {
    return (source.metrics as any)[kpiId] as MetricSummary;
  }
  return { value: 0, delta: 0 };
};

const categorizeTrafficSource = (metric: MetricSummary, threshold: number) => {
  const { value, delta } = metric;
  if (value > threshold && delta > 0) return { action: 'Scale', variant: 'success' as const };
  if (value > threshold && delta < 0) return { action: 'Optimize', variant: 'warning' as const };
  if (value < threshold && delta < 0) return { action: 'Investigate', variant: 'error' as const };
  if (value < threshold && delta > 0) return { action: 'Expand', variant: 'info' as const };
  return { action: 'Monitor', variant: 'neutral' as const };
};

export const TrafficSourceKpiCards: React.FC<TrafficSourceKpiCardsProps> = ({
  sources,
  selectedKPI,
  summary,
  disableClicks = false,
  onSourceClick,
}) => {
  const threshold = summary && (summary as any)[selectedKPI]
    ? ((summary as any)[selectedKPI].value || 0) * 0.1
    : 0;

  const sortedSources = [...sources].sort((a, b) => {
    const aVal = getKPIValueForTrafficSource(a, selectedKPI).value;
    const bVal = getKPIValueForTrafficSource(b, selectedKPI).value;
    return bVal - aVal;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {sortedSources.map(source => {
        const metric = getKPIValueForTrafficSource(source, selectedKPI);
        const category = categorizeTrafficSource(metric, threshold);
        const isPercentage = selectedKPI.includes('cvr');
        const formattedValue = isPercentage
          ? formatPercentageWithSuffix(metric.value, 2)
          : formatNumber(metric.value);
        const clickable = !disableClicks && !!onSourceClick;
        
        return (
          <StatCardBase
            key={source.name}
            interactive={clickable}
            onClick={clickable ? () => onSourceClick!(source.name) : undefined}
            data-testid="traffic-source-kpi-card"
          >
            <div className="flex flex-col items-center text-center gap-2 w-full">
              {/* Header with source name and action indicator */}
              <div className="flex items-center justify-between w-full mb-1">
                <StatCardLabel className="flex-1 text-left">{source.name}</StatCardLabel>
                <StatCardSubLabel variant={category.variant}>
                  {category.action}
                </StatCardSubLabel>
              </div>
              
              {/* Main value */}
              <StatCardValue>
                {formattedValue}
              </StatCardValue>
              
              {/* Delta indicator */}
              {metric.delta !== 0 && (
                <StatCardDelta delta={metric.delta} />
              )}
            </div>
          </StatCardBase>
        );
      })}
    </div>
  );
};

export default TrafficSourceKpiCards;
