import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TimeSeriesPoint, TrafficSourceTimeSeriesPoint } from '@/hooks/useMockAsoData';
import { TRAFFIC_SOURCE_COLORS } from '@/utils/trafficSourceColors';

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
  const shouldShowBreakdown = selectedMetric === 'downloads' && trafficSourceTimeseriesData.length > 0;
  const chartData = shouldShowBreakdown ? trafficSourceTimeseriesData : timeseriesData;

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold">Performance Metrics</h3>
        {shouldShowBreakdown && (
          <span className="text-gray-400 text-sm">Downloads by Traffic Source</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '6px',
            }}
          />
          <Legend />
          {shouldShowBreakdown ? (
            <>
              <Line dataKey="webReferrer" stroke={TRAFFIC_SOURCE_COLORS['Web Referrer']} name="Web Referrer" strokeWidth={2} dot={false} />
              <Line dataKey="appStoreSearch" stroke={TRAFFIC_SOURCE_COLORS['App Store Search']} name="App Store Search" strokeWidth={2} dot={false} />
              <Line dataKey="appReferrer" stroke={TRAFFIC_SOURCE_COLORS['App Referrer']} name="App Referrer" strokeWidth={2} dot={false} />
              <Line dataKey="appleSearchAds" stroke={TRAFFIC_SOURCE_COLORS['Apple Search Ads']} name="Apple Search Ads" strokeWidth={2} dot={false} />
              <Line dataKey="appStoreBrowse" stroke={TRAFFIC_SOURCE_COLORS['App Store Browse']} name="App Store Browse" strokeWidth={2} dot={false} />
            </>
          ) : (
            <>
              <Line dataKey="impressions" stroke="#FFA726" name="Impressions" strokeWidth={2} dot={false} />
              <Line dataKey="downloads" stroke="#42A5F5" name="Downloads" strokeWidth={2} dot={false} />
              <Line dataKey="product_page_views" stroke="#AB47BC" name="Product Page Views" strokeWidth={2} dot={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsTimeSeriesChart;

