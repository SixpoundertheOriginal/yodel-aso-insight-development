import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { TimeSeriesPoint } from '@/hooks/useMockAsoData';

interface BenchmarkComparisonChartProps {
  timeseriesData: TimeSeriesPoint[];
  benchmarkValue: number;
}

const BenchmarkComparisonChart: React.FC<BenchmarkComparisonChartProps> = ({
  timeseriesData,
  benchmarkValue,
}) => {
  const chartData = useMemo(
    () =>
      timeseriesData.map((item) => ({
        date: item.date,
        conversion_rate:
          item.product_page_views > 0
            ? (item.downloads / item.product_page_views) * 100
            : 0,
      })),
    [timeseriesData]
  );

  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground mb-4">
        Conversion Rate vs Industry Benchmark
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="conversion_rate"
            stroke="#ef4444"
            strokeWidth={2}
            name="Your Performance"
            dot={false}
          />
          <ReferenceLine
            y={benchmarkValue}
            stroke="#6b7280"
            strokeDasharray="5 5"
            label={`Industry: ${benchmarkValue}%`}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default BenchmarkComparisonChart;
