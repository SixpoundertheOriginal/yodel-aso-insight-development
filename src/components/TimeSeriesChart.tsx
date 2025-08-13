import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TimeSeriesPoint, TrafficSourceTimeSeriesPoint } from "@/hooks/useMockAsoData";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { chartColors } from "@/utils/chartConfig";
import { TRAFFIC_SOURCE_COLORS } from "@/utils/trafficSourceColors";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  selectedKPI?: string;
  trafficSourceTimeseriesData?: TrafficSourceTimeSeriesPoint[];
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = React.memo(({ data, selectedKPI = 'all', trafficSourceTimeseriesData = [] }) => {
  const [chartMode, setChartMode] = useState<'total' | 'breakdown'>('total');

  const formattedData = useMemo(() => data.map(item => {
    const product_page_cvr = item.product_page_views > 0
      ? (item.downloads / item.product_page_views) * 100
      : 0;
    const impressions_cvr = item.impressions > 0
      ? (item.downloads / item.impressions) * 100
      : 0;
    return {
      ...item,
      product_page_cvr,
      impressions_cvr,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }), [data]);

  const formattedTrafficData = useMemo(
    () =>
      trafficSourceTimeseriesData.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        webReferrer: item.webReferrer_downloads,
        appStoreSearch: item.appStoreSearch_downloads,
        appReferrer: item.appReferrer_downloads,
        appleSearchAds: item.appleSearchAds_downloads,
        appStoreBrowse: item.appStoreBrowse_downloads,
      })),
    [trafficSourceTimeseriesData]
  );

  const chartData = chartMode === 'breakdown' ? formattedTrafficData : formattedData;

  const chartConfigObj = useMemo(() => {
    if (chartMode === 'breakdown') {
      return {
        webReferrer: { label: 'Web Referrer', color: TRAFFIC_SOURCE_COLORS['Web Referrer'] },
        appStoreSearch: { label: 'App Store Search', color: TRAFFIC_SOURCE_COLORS['App Store Search'] },
        appReferrer: { label: 'App Referrer', color: TRAFFIC_SOURCE_COLORS['App Referrer'] },
        appleSearchAds: { label: 'Apple Search Ads', color: TRAFFIC_SOURCE_COLORS['Apple Search Ads'] },
        appStoreBrowse: { label: 'App Store Browse', color: TRAFFIC_SOURCE_COLORS['App Store Browse'] },
      } satisfies ChartConfig;
    }
    return {
      impressions: { label: "Impressions", color: chartColors.impressions },
      downloads: { label: "Downloads", color: chartColors.downloads },
      product_page_views: { label: "Product Page Views", color: chartColors.product_page_views },
      product_page_cvr: { label: "Product Page CVR", color: chartColors.product_page_cvr },
      impressions_cvr: { label: "Impressions CVR", color: chartColors.impressions_cvr },
    } satisfies ChartConfig;
  }, [chartMode]);

  const showLine = (metric: string) => selectedKPI === 'all' || selectedKPI === metric;
  const getOpacity = (metric: string) => (selectedKPI === 'all' || selectedKPI === metric ? 1 : 0.2);

  return (
    <div className="w-full h-[450px] space-y-4">
      <div className="flex justify-end">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartMode('total')}
            className={`px-3 py-1 rounded ${chartMode === 'total' ? 'bg-white shadow' : ''}`}
          >
            Total Performance
          </button>
          <button
            onClick={() => setChartMode('breakdown')}
            className={`px-3 py-1 rounded ${chartMode === 'breakdown' ? 'bg-white shadow' : ''}`}
          >
            By Traffic Source
          </button>
        </div>
      </div>
      <ChartContainer config={chartConfigObj} className="w-full h-full">
        <LineChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              if (window.innerWidth < 768) {
                return value.split(' ')[1];
              }
              return value;
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.toLocaleString()}
            width={60}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {chartMode === 'total' ? (
            <>
              {showLine('impressions') && (
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="var(--color-impressions)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity('impressions')}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
              {showLine('downloads') && (
                <Line
                  type="monotone"
                  dataKey="downloads"
                  stroke="var(--color-downloads)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity('downloads')}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
              {showLine('product_page_views') && (
                <Line
                  type="monotone"
                  dataKey="product_page_views"
                  stroke="var(--color-product_page_views)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity('product_page_views')}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
              {showLine('product_page_cvr') && (
                <Line
                  type="monotone"
                  dataKey="product_page_cvr"
                  stroke="var(--color-product_page_cvr)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity('product_page_cvr')}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
              {showLine('impressions_cvr') && (
                <Line
                  type="monotone"
                  dataKey="impressions_cvr"
                  stroke="var(--color-impressions_cvr)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity('impressions_cvr')}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="webReferrer" stroke="var(--color-webReferrer)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="appStoreSearch" stroke="var(--color-appStoreSearch)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="appReferrer" stroke="var(--color-appReferrer)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="appleSearchAds" stroke="var(--color-appleSearchAds)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="appStoreBrowse" stroke="var(--color-appStoreBrowse)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            </>
          )}
        </LineChart>
      </ChartContainer>
    </div>
  );
});

TimeSeriesChart.displayName = "TimeSeriesChart";
export default TimeSeriesChart;
