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
import { TrafficSourceTimeSeriesPoint } from '@/hooks/useMockAsoData';
import { TRAFFIC_SOURCE_COLORS } from '@/utils/trafficSourceColors';

interface AnalyticsTrafficSourceChartProps {
  trafficSourceTimeseriesData: TrafficSourceTimeSeriesPoint[];
  selectedMetric: string;
}

export function AnalyticsTrafficSourceChart({
  trafficSourceTimeseriesData,
  selectedMetric,
}: AnalyticsTrafficSourceChartProps) {
  const metric = selectedMetric === 'all' ? 'downloads' : selectedMetric;

  const trafficSourceKeys = [
    { key: 'webReferrer', name: 'Web Referrer' },
    { key: 'appStoreSearch', name: 'App Store Search' },
    { key: 'appReferrer', name: 'App Referrer' },
    { key: 'appleSearchAds', name: 'Apple Search Ads' },
    { key: 'appStoreBrowse', name: 'App Store Browse' },
  ];

  const metricLabel = useMemo(() => {
    switch (metric) {
      case 'impressions':
        return 'Impressions';
      case 'downloads':
        return 'Downloads';
      case 'product_page_views':
        return 'Product Page Views';
      case 'product_page_cvr':
        return 'Product Page CVR';
      case 'impressions_cvr':
        return 'Impressions CVR';
      default:
        return metric;
    }
  }, [metric]);

  const chartData = useMemo(() => {
    return trafficSourceTimeseriesData.map((point) => {
      const row: any = { date: point.date };
      trafficSourceKeys.forEach(({ key }) => {
        if (metric === 'product_page_cvr') {
          const downloads = (point as any)[`${key}_downloads`] || 0;
          const views = (point as any)[`${key}_product_page_views`] || 0;
          row[key] = views > 0 ? (downloads / views) * 100 : 0;
        } else if (metric === 'impressions_cvr') {
          const downloads = (point as any)[`${key}_downloads`] || 0;
          const impressions = (point as any)[`${key}_impressions`] || 0;
          row[key] = impressions > 0 ? (downloads / impressions) * 100 : 0;
        } else {
          row[key] = (point as any)[`${key}_${metric}`] || 0;
        }
      });
      return row;
    });
  }, [trafficSourceTimeseriesData, metric, trafficSourceKeys]);

  return (
    <div className="bg-background border border-border p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-foreground text-lg font-semibold">Performance Metrics</h3>
        <span className="text-muted-foreground text-sm">
          {metricLabel} by Traffic Source
        </span>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend />
          {trafficSourceKeys.map(({ key, name }) => (
            <Line
              key={`${key}_${metric}`}
              dataKey={key}
              stroke={
                TRAFFIC_SOURCE_COLORS[name as keyof typeof TRAFFIC_SOURCE_COLORS]
              }
              name={`${name} ${metricLabel}`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsTrafficSourceChart;
