import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrafficSource, AsoMetrics, MetricSummary } from '@/hooks/useMockAsoData';
import { formatPercentage } from '@/utils/format';

interface TrafficSourceKpiCardsProps {
  sources: TrafficSource[];
  selectedKPI: string;
  onSourceClick: (sourceName: string) => void;
  summary: AsoMetrics;
}

const getKPIValueForTrafficSource = (source: TrafficSource, kpiId: string): MetricSummary => {
  if (source.metrics && (source.metrics as any)[kpiId]) {
    return (source.metrics as any)[kpiId] as MetricSummary;
  }
  return { value: 0, delta: 0 };
};

const categorizeTrafficSource = (metric: MetricSummary, threshold: number) => {
  const { value, delta } = metric;
  if (value > threshold && delta > 0) return { action: 'Scale', color: 'text-green-500' };
  if (value > threshold && delta < 0) return { action: 'Optimize', color: 'text-yellow-500' };
  if (value < threshold && delta < 0) return { action: 'Investigate', color: 'text-red-500' };
  if (value < threshold && delta > 0) return { action: 'Expand', color: 'text-blue-500' };
  return { action: 'Monitor', color: 'text-zinc-500' };
};

export const TrafficSourceKpiCards: React.FC<TrafficSourceKpiCardsProps> = ({ sources, selectedKPI, onSourceClick, summary }) => {
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
        const displayValue = isPercentage
          ? `${metric.value.toFixed(2)}%`
          : metric.value.toLocaleString();
        return (
          <Card key={source.name} className="bg-zinc-800 hover:bg-zinc-700 cursor-pointer" onClick={() => onSourceClick(source.name)}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">{source.name}</CardTitle>
              <span className={`text-xs font-semibold ${category.color}`}>{category.action}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayValue}</div>
              <p className={`text-xs ${metric.delta >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                {metric.delta >= 0 ? '+' : ''}{formatPercentage(Math.abs(metric.delta))}%
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TrafficSourceKpiCards;
