import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Signal, TrendingUp, Download, Eye } from 'lucide-react';

interface TrafficSourceComparisonChartProps {
  data: any[];
  isLoading?: boolean;
}

const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  'Apple_Search_Ads': 'Apple Search Ads',
  'App_Store_Browse': 'App Store Browse',
  'App_Store_Search': 'App Store Search',
  'App_Referrer': 'App Referrer',
  'Web_Referrer': 'Web Referrer',
  'Event_Notification': 'Event Notification',
  'Institutional_Purchase': 'Institutional Purchase',
  'Unavailable': 'Unavailable'
};

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b'  // slate
];

export function TrafficSourceComparisonChart({
  data = [],
  isLoading = false
}: TrafficSourceComparisonChartProps) {

  // Aggregate data by traffic source
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const grouped = data.reduce((acc: any, row: any) => {
      const source = row.traffic_source;
      if (!acc[source]) {
        acc[source] = {
          traffic_source: source,
          displayName: TRAFFIC_SOURCE_LABELS[source] || source,
          impressions: 0,
          downloads: 0,
          product_page_views: 0
        };
      }

      acc[source].impressions += row.impressions || 0;
      acc[source].downloads += (row.downloads || row.installs || 0);
      acc[source].product_page_views += row.product_page_views || 0;

      return acc;
    }, {});

    // Convert to array and calculate CVR
    const result = Object.values(grouped).map((source: any) => ({
      ...source,
      cvr: source.impressions > 0 ? (source.downloads / source.impressions) * 100 : 0
    }));

    // Sort by CVR descending
    return result
      .filter((s: any) => s.impressions > 0)
      .sort((a: any, b: any) => b.cvr - a.cvr);
  }, [data]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4">
        <p className="font-semibold mb-3">{data.displayName}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <span className="text-sm font-medium">{formatNumber(data.impressions)}</span>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs text-muted-foreground">Downloads</span>
            </div>
            <span className="text-sm font-medium">{formatNumber(data.downloads)}</span>
          </div>

          <div className="flex items-center justify-between gap-6 pt-2 border-t">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Conversion Rate</span>
            </div>
            <span className="text-sm font-bold text-amber-500">{data.cvr.toFixed(2)}%</span>
          </div>
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
          No traffic source data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Signal className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Traffic Source Performance</h3>
        </div>
        <Badge variant="secondary">
          Sorted by CVR
        </Badge>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="cvr" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend with metrics */}
      <div className="mt-4 pt-4 border-t space-y-2">
        {chartData.map((source: any, index) => (
          <div key={source.traffic_source} className="flex items-center justify-between py-2 hover:bg-muted/50 rounded px-2 transition-colors">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm font-medium">{source.displayName}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">{formatNumber(source.impressions)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{formatNumber(source.downloads)}</span>
              <Badge variant="outline" className="ml-2">
                {source.cvr.toFixed(2)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
