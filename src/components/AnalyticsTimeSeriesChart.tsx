import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TimeSeriesPoint, TrafficSourceTimeSeriesPoint } from '@/hooks/useMockAsoData';
import { TRAFFIC_SOURCE_COLORS } from '@/utils/trafficSourceColors';
import { chartColors } from '@/utils/chartConfig';

interface AnalyticsTimeSeriesChartProps {
  timeseriesData: TimeSeriesPoint[];
  trafficSourceTimeseriesData?: TrafficSourceTimeSeriesPoint[];
  selectedMetric: string;
}

export function AnalyticsTimeSeriesChart({
  timeseriesData,
  trafficSourceTimeseriesData = [],
  selectedMetric,
}: AnalyticsTimeSeriesChartProps) {
  // Always show breakdown by traffic source when traffic source data is available  
  const shouldShowBreakdown = trafficSourceTimeseriesData.length > 0;
  
  // Define the traffic source data keys for downloads (the current available breakdown)
  const trafficSourceKeys = [
    { key: 'webReferrer', name: 'Web Referrer' },
    { key: 'appStoreSearch', name: 'App Store Search' },
    { key: 'appReferrer', name: 'App Referrer' },
    { key: 'appleSearchAds', name: 'Apple Search Ads' },
    { key: 'appStoreBrowse', name: 'App Store Browse' }
  ];

  // For now, only downloads breakdown is available in the data structure
  // TODO: Extend TrafficSourceTimeSeriesPoint to include other metrics breakdown
  const canShowBreakdown = shouldShowBreakdown && (selectedMetric === 'downloads' || selectedMetric === 'all');
  const chartData = canShowBreakdown ? trafficSourceTimeseriesData : timeseriesData;

  return (
    <div className="bg-background border border-border p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-foreground text-lg font-semibold">Performance Metrics</h3>
        {canShowBreakdown && (
          <span className="text-muted-foreground text-sm">
            {selectedMetric === 'all' ? 'Downloads' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1).replace('_', ' ')} by Traffic Source
          </span>
        )}
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
          {canShowBreakdown ? (
            <>
              {trafficSourceKeys.map(({ key, name }) => (
                <Line 
                  key={key}
                  dataKey={key} 
                  stroke={TRAFFIC_SOURCE_COLORS[name as keyof typeof TRAFFIC_SOURCE_COLORS]} 
                  name={name} 
                  strokeWidth={2} 
                  dot={false} 
                />
              ))}
            </>
          ) : (
            <>
              <Line dataKey="impressions" stroke={chartColors.impressions} name="Impressions" strokeWidth={2} dot={false} />
              <Line dataKey="downloads" stroke={chartColors.downloads} name="Downloads" strokeWidth={2} dot={false} />
              <Line dataKey="product_page_views" stroke={chartColors.product_page_views} name="Product Page Views" strokeWidth={2} dot={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsTimeSeriesChart;

