import React, { useState, useMemo, useEffect } from "react";
import { TimeSeriesPoint, TrafficSourceTimeSeriesPoint } from "@/hooks/useMockAsoData";
import { chartColors } from "@/utils/chartConfig";
import { TRAFFIC_SOURCE_COLORS } from "@/utils/trafficSourceColors";
import BrandLineChart, { type BrandSeries } from '@/components/charts/BrandLineChart';

const sourceKeyMap: Record<string, string> = {
  "App Store Search": "appStoreSearch",
  "App Store Browse": "appStoreBrowse",
  "App Referrer": "appReferrer",
  "Apple Search Ads": "appleSearchAds",
  "Web Referrer": "webReferrer",
};

interface ExecutiveTimeSeriesChartProps {
  data: TimeSeriesPoint[];
  selectedKPI?: string;
  trafficSourceTimeseriesData?: TrafficSourceTimeSeriesPoint[];
  mode?: "total" | "breakdown";
  showModeToggle?: boolean;
  visibleMetrics?: string[];
  breakdownMetric?: "impressions" | "downloads" | "product_page_views";
  selectedTrafficSources?: string[];
}

const ExecutiveTimeSeriesChart: React.FC<ExecutiveTimeSeriesChartProps> = React.memo(
  ({
    data,
    selectedKPI = "all",
    trafficSourceTimeseriesData = [],
    mode = "total",
    showModeToggle = true,
    visibleMetrics = [
      "impressions",
      "downloads",
      "product_page_views",
      "product_page_cvr",
      "impressions_cvr",
    ],
    breakdownMetric = "downloads",
    selectedTrafficSources = [
      "App Store Search",
      "App Store Browse",
      "Apple Search Ads",
      "App Referrer",
      "Web Referrer",
    ],
  }) => {
    const [chartMode, setChartMode] = useState<"total" | "breakdown">(mode);

  useEffect(() => {
    setChartMode(mode);
  }, [mode]);

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
      // Keep date raw; BrandLineChart formats consistently
      date: item.date,
    };
  }), [data]);

  const formattedTrafficData = useMemo(
    () =>
      trafficSourceTimeseriesData.map((item) => {
        const record = item as unknown as Record<string, number>;
        const base: Record<string, number | string> = {
          // Keep date raw; BrandLineChart formats consistently
          date: item.date,
        };
        selectedTrafficSources.forEach((source) => {
          const key = sourceKeyMap[source];
          base[key] = record[`${key}_${breakdownMetric}`] || 0;
        });
        return base;
      }),
    [trafficSourceTimeseriesData, breakdownMetric, selectedTrafficSources]
  );

  const chartData = chartMode === "breakdown" ? formattedTrafficData : formattedData;

  // Chart colors are applied through BrandLineChart via series.color

  const showLine = (metric: string) =>
    visibleMetrics.includes(metric) && (selectedKPI === 'all' || selectedKPI === metric);

  return (
    <div className="w-full h-[450px] space-y-4">
      {showModeToggle && (
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
      )}
      {chartMode === 'total' ? (
        <BrandLineChart
          data={chartData}
          series={(
            [
              ['impressions', 'Impressions', chartColors.impressions],
              ['downloads', 'Downloads', chartColors.downloads],
              ['product_page_views', 'Product Page Views', chartColors.product_page_views],
              ['product_page_cvr', 'Product Page CVR', chartColors.product_page_cvr],
              ['impressions_cvr', 'Impressions CVR', chartColors.impressions_cvr],
            ] as const
          )
            .filter(([key]) => showLine(key))
            .map(([key, label, color]) => ({ key, label, color })) as BrandSeries[]}
          height={450}
          tooltipIndicator="dot"
          showLegend
        />
      ) : (
        <BrandLineChart
          data={chartData}
          series={selectedTrafficSources.map((source) => ({
            key: sourceKeyMap[source],
            label: source,
            color: TRAFFIC_SOURCE_COLORS[source],
          }))}
          height={450}
          tooltipIndicator="dot"
          showLegend
        />
      )}
    </div>
  );
});

ExecutiveTimeSeriesChart.displayName = "ExecutiveTimeSeriesChart";
export default ExecutiveTimeSeriesChart;
