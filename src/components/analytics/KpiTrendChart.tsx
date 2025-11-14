import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { detectAnomalies, type Anomaly } from '@/utils/anomalyDetection';
import { AnomalyMarker } from './AnomalyMarker';

interface KpiTrendChartProps {
  data: any[];
  isLoading?: boolean;
}

type KpiMetric = 'impressions' | 'downloads' | 'product_page_views' | 'cvr' | 'download_velocity';

const KPI_OPTIONS = [
  { value: 'impressions', label: 'Impressions', color: '#3b82f6', format: 'number' },
  { value: 'downloads', label: 'Downloads', color: '#10b981', format: 'number' },
  { value: 'product_page_views', label: 'Product Page Views', color: '#8b5cf6', format: 'number' },
  { value: 'cvr', label: 'Conversion Rate', color: '#f59e0b', format: 'percent' },
  { value: 'download_velocity', label: 'Download Velocity', color: '#ef4444', format: 'number' }
];

export function KpiTrendChart({ data = [], isLoading = false }: KpiTrendChartProps) {
  const [selectedKpi, setSelectedKpi] = useState<KpiMetric>('impressions');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // Transform data for charting
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by date and sum metrics
    const grouped = data.reduce((acc: any, row: any) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          impressions: 0,
          downloads: 0,
          installs: 0,
          product_page_views: 0
        };
      }

      acc[date].impressions += row.impressions || 0;
      acc[date].downloads += (row.downloads || row.installs || 0);
      acc[date].installs += (row.installs || row.downloads || 0);
      acc[date].product_page_views += row.product_page_views || 0;

      return acc;
    }, {});

    // Convert to array and calculate derived metrics
    const result = Object.values(grouped).map((day: any) => ({
      date: day.date,
      dateFormatted: format(parseISO(day.date), 'MMM dd'),
      impressions: day.impressions,
      downloads: Math.max(day.downloads, day.installs),
      product_page_views: day.product_page_views,
      cvr: day.impressions > 0 ? ((day.downloads || day.installs) / day.impressions) * 100 : 0,
      download_velocity: day.downloads || day.installs // Downloads per day
    }));

    // Sort by date
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Detect anomalies for selected KPI
  const anomalies = useMemo(() => {
    if (chartData.length < 8) return []; // Need at least 8 days for 7-day window

    const dataPoints = chartData.map(d => ({
      date: d.date,
      value: d[selectedKpi]
    }));

    const kpiConfig = KPI_OPTIONS.find(k => k.value === selectedKpi);
    const metricName = kpiConfig?.label || 'Metric';

    return detectAnomalies(dataPoints, metricName, 2.5, 7);
  }, [chartData, selectedKpi]);

  const selectedKpiConfig = KPI_OPTIONS.find(k => k.value === selectedKpi);

  const formatValue = (value: number) => {
    if (!selectedKpiConfig) return value.toLocaleString();

    if (selectedKpiConfig.format === 'percent') {
      return `${value.toFixed(2)}%`;
    }

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const anomaly = anomalies.find(a => a.date === data.date);

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">
          {format(parseISO(data.date), 'MMMM dd, yyyy')}
        </p>

        {/* Anomaly indicator */}
        {anomaly && (
          <div className="mb-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-500">
                {anomaly.type === 'spike' ? 'Spike' : 'Drop'} Detected
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                {anomaly.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}σ from expected
            </p>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              {selectedKpiConfig?.label}
            </span>
            <span className="text-sm font-bold" style={{ color: selectedKpiConfig?.color }}>
              {formatValue(data[selectedKpi])}
            </span>
          </div>

          {/* Show context metrics */}
          {selectedKpi !== 'impressions' && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="text-xs text-muted-foreground">Impressions</span>
              <span className="text-xs">{formatValue(data.impressions)}</span>
            </div>
          )}

          {selectedKpi !== 'downloads' && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Downloads</span>
              <span className="text-xs">{formatValue(data.downloads)}</span>
            </div>
          )}

          {selectedKpi !== 'cvr' && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">CVR</span>
              <span className="text-xs">{data.cvr.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-[400px] animate-pulse bg-muted rounded-lg" />
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available for the selected period
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">KPI Trend Analysis</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                chartType === 'area'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                chartType === 'line'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Line
            </button>
          </div>

          {/* KPI Selector */}
          <Select value={selectedKpi} onValueChange={(v) => setSelectedKpi(v as KpiMetric)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KPI_OPTIONS.map((kpi) => (
                <SelectItem key={kpi.value} value={kpi.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: kpi.color }}
                    />
                    {kpi.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        {chartType === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${selectedKpi}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={selectedKpiConfig?.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={selectedKpiConfig?.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="dateFormatted"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={selectedKpi}
              stroke={selectedKpiConfig?.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color${selectedKpi})`}
              dot={(props: any) => {
                const anomaly = anomalies.find(a => a.date === props.payload?.date);
                if (anomaly) {
                  return <AnomalyMarker anomaly={anomaly} cx={props.cx} cy={props.cy} size={16} />;
                }
                return null; // No dots for non-anomaly points in area chart
              }}
              activeDot={{ r: 5, fill: selectedKpiConfig?.color }}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="dateFormatted"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={selectedKpi}
              stroke={selectedKpiConfig?.color}
              strokeWidth={3}
              dot={(props: any) => {
                const anomaly = anomalies.find(a => a.date === props.payload?.date);
                if (anomaly) {
                  return <AnomalyMarker anomaly={anomaly} cx={props.cx} cy={props.cy} size={18} />;
                }
                return <Dot {...props} fill={selectedKpiConfig?.color} r={4} />;
              }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
        {chartData.length > 0 && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Period Total</p>
              <p className="text-lg font-bold">
                {formatValue(chartData.reduce((sum, d) => sum + d[selectedKpi], 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Daily Average</p>
              <p className="text-lg font-bold">
                {formatValue(chartData.reduce((sum, d) => sum + d[selectedKpi], 0) / chartData.length)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Peak Day</p>
              <p className="text-lg font-bold">
                {formatValue(Math.max(...chartData.map(d => d[selectedKpi])))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data Points</p>
              <p className="text-lg font-bold">{chartData.length} days</p>
            </div>
          </>
        )}
      </div>

      {/* Anomaly Summary */}
      {anomalies.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-semibold text-yellow-500">
              {anomalies.length} {anomalies.length === 1 ? 'Anomaly' : 'Anomalies'} Detected
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Spikes: </span>
              <span className="font-medium">{anomalies.filter(a => a.type === 'spike').length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Drops: </span>
              <span className="font-medium">{anomalies.filter(a => a.type === 'drop').length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">High Severity: </span>
              <span className="font-medium text-red-400">{anomalies.filter(a => a.severity === 'high').length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Medium/Low: </span>
              <span className="font-medium">{anomalies.filter(a => a.severity !== 'high').length}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Hover over highlighted data points for details
          </p>
        </div>
      )}
    </Card>
  );
}
