import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ConversionRateTimeSeriesPoint } from '@/hooks/useMockAsoData';
import type { CVRType } from '@/utils/processTrafficSourceCVR';
import { getTrafficSourceColor } from '@/utils/trafficSourceColors';

interface ConversionRateTimeSeriesChartProps {
  data: ConversionRateTimeSeriesPoint[];
  trafficSources: string[];
  cvrType: CVRType;
  loading?: boolean;
}

export const ConversionRateTimeSeriesChart: React.FC<ConversionRateTimeSeriesChartProps> = ({
  data,
  trafficSources,
  cvrType,
  loading = false,
}) => {
  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();

    data.forEach((point) => {
      if (!dateMap.has(point.date)) {
        dateMap.set(point.date, { date: point.date });
      }
      const dateData = dateMap.get(point.date);
      const cvrValue =
        cvrType === 'productpage'
          ? point.cvr_from_product_page_views
          : point.cvr_from_impressions;
      dateData[point.traffic_source] = cvrValue;
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [data, cvrType]);

  const filteredTrafficSources = trafficSources.filter(
    (source) => !['App Referrer', 'Web Referrer'].includes(source),
  );

  if (loading) {
    return <div className="h-64 flex items-center justify-center">Loading chart...</div>;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          {cvrType === 'productpage'
            ? 'Product Page Conversion Rate by Traffic Source Over Time'
            : 'Impression Conversion Rate by Traffic Source Over Time'}
        </h3>
        <p className="text-sm text-gray-400">
          {cvrType === 'productpage'
            ? 'Downloads ÷ Product Page Views for each traffic source'
            : 'Downloads ÷ Impressions for each traffic source'}
          {' • App Referrer and Web Referrer excluded due to reporting inaccuracies'}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
            stroke="#9ca3af"
          />
          <YAxis
            label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }}
            domain={[0, 'dataMax']}
            stroke="#9ca3af"
          />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
            }}
          />
          <Legend />
          {filteredTrafficSources.map((source, index) => (
            <Line
              key={source}
              type="monotone"
              dataKey={source}
              stroke={getTrafficSourceColor(source)}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConversionRateTimeSeriesChart;
