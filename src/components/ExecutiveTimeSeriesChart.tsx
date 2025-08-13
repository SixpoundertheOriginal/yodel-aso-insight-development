import React, { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TimeSeriesPoint, TrafficSourceTimeSeriesPoint } from "@/hooks/useMockAsoData";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { chartColors } from "@/utils/chartConfig";
import { TRAFFIC_SOURCE_COLORS } from "@/utils/trafficSourceColors";

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
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }), [data]);

  const formattedTrafficData = useMemo(
    () =>
      trafficSourceTimeseriesData.map((item) => {
        const record = item as unknown as Record<string, number>;
        const base: Record<string, number | string> = {
          date: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
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

  const chartConfigObj = useMemo(() => {
    if (chartMode === "breakdown") {
      return selectedTrafficSources.reduce((acc, source) => {
        const key = sourceKeyMap[source];
        acc[key] = { label: source, color: TRAFFIC_SOURCE_COLORS[source] };
        return acc;
      }, {} as Record<string, { label: string; color: string }>) as ChartConfig;
    }
    const base = {
      impressions: { label: "Impressions", color: chartColors.impressions },
      downloads: { label: "Downloads", color: chartColors.downloads },
      product_page_views: {
        label: "Product Page Views",
        color: chartColors.product_page_views,
      },
      product_page_cvr: {
        label: "Product Page CVR",
        color: chartColors.product_page_cvr,
      },
      impressions_cvr: {
        label: "Impressions CVR",
        color: chartColors.impressions_cvr,
      },
    };
    return Object.fromEntries(
      Object.entries(base).filter(([key]) => visibleMetrics.includes(key))
    ) as ChartConfig;
  }, [chartMode, visibleMetrics, selectedTrafficSources]);

  const showLine = (metric: string) =>
    visibleMetrics.includes(metric) && (selectedKPI === 'all' || selectedKPI === metric);
  const getOpacity = (metric: string) => (showLine(metric) ? 1 : 0.2);

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
              {selectedTrafficSources.map((source) => {
                const key = sourceKeyMap[source];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </>
          )}
        </LineChart>
      </ChartContainer>
    </div>
  );
});

ExecutiveTimeSeriesChart.displayName = "ExecutiveTimeSeriesChart";
export default ExecutiveTimeSeriesChart;
