import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TrafficSource } from '@/hooks/useMockAsoData';
import { getTrafficSourceColor } from '@/utils/trafficSourceColors';

interface TrafficSourceConversionData {
  trafficSource: string;
  conversionRate: number;
  impressions: number;
  downloads: number;
  color: string;
}

function processTrafficSourceConversions(sources: TrafficSource[]): TrafficSourceConversionData[] {
  return sources.map((source) => {
    const impressions = source.metrics.impressions.value;
    const downloads = source.metrics.downloads.value;
    const views = source.metrics.product_page_views.value;
    const conversionRate = views > 0
      ? (downloads / views) * 100
      : impressions > 0
        ? (downloads / impressions) * 100
        : 0;
    return {
      trafficSource: source.name,
      conversionRate,
      impressions,
      downloads,
      color: getTrafficSourceColor(source.name),
    };
  });
}

interface Props {
  data: TrafficSource[];
}

export const ConversionRateByTrafficSourceChart: React.FC<Props> = ({ data }) => {
  const chartData = useMemo(() => processTrafficSourceConversions(data), [data]);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">Conversion Rate by Traffic Source</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="trafficSource"
            tick={{ fill: '#D1D5DB', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis
            tick={{ fill: '#D1D5DB', fontSize: 12 }}
            label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.375rem' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Conversion Rate']}
            labelStyle={{ color: '#F9FAFB' }}
          />
          <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="border-t border-zinc-700 mt-4 pt-2">
        <p className="text-sm text-gray-400">
          Conversion rate calculated as downloads ÷ impressions for each traffic source
        </p>
      </div>
    </div>
  );
};

export default ConversionRateByTrafficSourceChart;

