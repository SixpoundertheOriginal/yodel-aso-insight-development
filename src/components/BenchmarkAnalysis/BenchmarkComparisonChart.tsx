import React, { useMemo } from 'react';
import type { TimeSeriesPoint } from '@/hooks/useMockAsoData';
import BrandLineChart from '@/components/charts/BrandLineChart';
import { PremiumCard, PremiumCardHeader, PremiumCardContent, PremiumTypography, StatusIndicator } from '@/components/ui/premium';
import { chartColors } from '@/utils/chartConfig';

interface BenchmarkComparisonChartProps {
  timeseriesData: TimeSeriesPoint[];
  benchmarkValue: number;
}

const BenchmarkComparisonChart: React.FC<BenchmarkComparisonChartProps> = ({
  timeseriesData,
  benchmarkValue,
}) => {
  const chartData = useMemo(() => timeseriesData.map((item) => ({
    date: item.date,
    conversion_rate: item.product_page_views > 0 ? (item.downloads / item.product_page_views) * 100 : 0,
    benchmark: benchmarkValue || 0,
  })), [timeseriesData, benchmarkValue]);

  const yTick = (v: number) => `${Math.round(v)}%`;

  return (
    <PremiumCard variant="glow" intensity="strong" glowColor="blue" className="overflow-hidden">
      <PremiumCardHeader className="bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
        <PremiumTypography.SectionTitle className="flex items-center gap-3">
          Conversion Rate vs Industry Benchmark
          <StatusIndicator status="info" size="sm" />
        </PremiumTypography.SectionTitle>
      </PremiumCardHeader>
      <PremiumCardContent className="p-6">
        <BrandLineChart
          data={chartData}
          series={[
            { key: 'conversion_rate', label: 'Your Performance', color: chartColors.product_page_cvr },
            ...(benchmarkValue > 0 ? [{ key: 'benchmark', label: 'Industry Benchmark', color: '#6b7280', strokeDasharray: '5 5' as const }] : []),
          ] as any}
          height={360}
          yTickFormatter={yTick}
          tooltipIndicator="dot"
          showLegend
        />
      </PremiumCardContent>
    </PremiumCard>
  );
};

export default BenchmarkComparisonChart;
