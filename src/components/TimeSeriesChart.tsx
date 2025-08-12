
import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TimeSeriesPoint } from "@/hooks/useMockAsoData";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { chartColors } from "@/utils/chartConfig";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  selectedKPI?: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = React.memo(({ 
  data,
  selectedKPI = 'all',
}) => {
  // Format the date to be more readable and calculate CVR metrics
  const formattedData = data.map(item => {
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
  });

  const chartConfigObj = {
    impressions: { label: "Impressions", color: chartColors.impressions },
    downloads: { label: "Downloads", color: chartColors.downloads },
    product_page_views: { label: "Product Page Views", color: chartColors.product_page_views },
    product_page_cvr: { label: "Product Page CVR", color: chartColors.product_page_cvr },
    impressions_cvr: { label: "Impressions CVR", color: chartColors.impressions_cvr },
  } satisfies ChartConfig;

  const showLine = (metric: string) => selectedKPI === 'all' || selectedKPI === metric;
  const getOpacity = (metric: string) => selectedKPI === 'all' || selectedKPI === metric ? 1 : 0.2;

  return (
    <div className="w-full h-[450px]">
      <ChartContainer config={chartConfigObj} className="w-full h-full">
        <LineChart data={formattedData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              if (window.innerWidth < 768) {
                return value.split(' ')[1]; // Just show the day on mobile
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
        </LineChart>
      </ChartContainer>
    </div>
  );
});

TimeSeriesChart.displayName = "TimeSeriesChart";
export default TimeSeriesChart;
