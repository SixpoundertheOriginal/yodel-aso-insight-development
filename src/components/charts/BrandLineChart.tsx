import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

export type BrandSeries = {
  key: string;
  label?: string;
  color?: string; // Optional; if omitted, provide via config prop
  type?: 'monotone' | 'linear';
  strokeWidth?: number;
  yAxisId?: string | number;
  dot?: boolean;
  strokeDasharray?: string; // dashed style e.g. '5 5'
};

export type BrandLineChartProps = {
  data: Record<string, any>[];
  xKey?: string;
  series: BrandSeries[];
  height?: number; // container height in pixels
  className?: string; // additional classes for ChartContainer
  config?: ChartConfig; // overrides auto-generated config
  xTickFormatter?: (value: any) => string | number;
  yTickFormatter?: (value: number) => string | number;
  tooltipIndicator?: 'dot' | 'line' | 'dashed';
  showLegend?: boolean;
  showVerticalGridLines?: boolean;
  yAxisWidth?: number;
};

const defaultXTickFormatter = (value: string) => {
  try {
    const d = new Date(value);
    const full = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // On small screens, show only day number
      const parts = full.split(' ');
      return parts.length > 1 ? parts[1] : full;
    }
    return full;
  } catch {
    return value;
  }
};

const defaultYTickFormatter = (value: number) =>
  typeof value === 'number' ? value.toLocaleString() : value;

export const BrandLineChart: React.FC<BrandLineChartProps> = ({
  data,
  xKey = 'date',
  series,
  height = 400,
  className,
  config,
  xTickFormatter = defaultXTickFormatter,
  yTickFormatter = defaultYTickFormatter,
  tooltipIndicator = 'dot',
  showLegend = true,
  showVerticalGridLines = false,
  yAxisWidth = 60,
}) => {
  const chartConfig: ChartConfig = useMemo(() => {
    if (config) return config;
    const entries = series.map((s) => [
      s.key,
      s.color ? { label: s.label || s.key, color: s.color } : { label: s.label || s.key },
    ]) as [string, { label: string; color?: string }][];
    return Object.fromEntries(entries);
  }, [config, series]);

  return (
    <div className="w-full" style={{ height }}>
      <ChartContainer noAspect config={chartConfig} className={`w-full h-full ${className || ''}`}>
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid vertical={showVerticalGridLines} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: any) => String(xTickFormatter(value))}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: number) => String(yTickFormatter(value))}
            width={yAxisWidth}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator={tooltipIndicator} />} />
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          {series.map((s) => (
            <Line
              key={s.key}
              type={s.type || 'monotone'}
              dataKey={s.key}
              stroke={`var(--color-${s.key})`}
              strokeWidth={s.strokeWidth || 2}
              dot={s.dot ?? false}
              activeDot={{ r: 6 }}
              yAxisId={s.yAxisId}
              strokeDasharray={s.strokeDasharray}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
};

export default BrandLineChart;
