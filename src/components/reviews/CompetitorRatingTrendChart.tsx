/**
 * COMPETITOR RATING TREND CHART
 *
 * Multi-line chart showing rating trends over time for primary app and competitors
 * Integrates with global chart filters for time range and visibility
 */

import React, { useMemo } from 'react';
import { TrendingUp, Info } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompetitorChartFilters } from '@/hooks/useCompetitorChartFilters';
import { useCompetitorRatingTrends } from '@/hooks/useCompetitorRatingTrends';

interface CompetitorRatingTrendChartProps {
  organizationId: string;
  primaryAppId: string | null; // monitored_app_id
  competitorApps: Array<{
    appId: string; // app_store_id
    appName: string;
    appIcon: string;
    monitoredAppId?: string;
  }>;
  className?: string;
}

// Color palette for different apps
const APP_COLORS = [
  '#3b82f6', // blue (primary)
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export const CompetitorRatingTrendChart: React.FC<CompetitorRatingTrendChartProps> = ({
  organizationId,
  primaryAppId,
  competitorApps,
  className,
}) => {
  const { getVisibleCompetitors, getDateRange } = useCompetitorChartFilters();
  const visibleCompetitors = getVisibleCompetitors();
  const { startDate, endDate } = getDateRange();

  // Fetch historical rating data
  const { data: trends, isLoading, error } = useCompetitorRatingTrends({
    organizationId,
    primaryAppId,
    competitorAppIds: competitorApps,
    startDate,
    endDate,
    enabled: true,
  });

  // Filter trends based on visibility
  const visibleTrends = useMemo(() => {
    if (!trends) return [];

    const visibleAppIds = new Set(visibleCompetitors.map(c => c.appId));
    return trends.filter(trend => visibleAppIds.has(trend.appId));
  }, [trends, visibleCompetitors]);

  // Transform data for Recharts (merge all app data by date)
  const chartData = useMemo(() => {
    if (!visibleTrends || visibleTrends.length === 0) return [];

    // Collect all unique dates across all apps
    const dateSet = new Set<string>();
    visibleTrends.forEach(trend => {
      trend.data.forEach(point => dateSet.add(point.date));
    });

    // Sort dates
    const sortedDates = Array.from(dateSet).sort();

    // Build chart data with all apps for each date
    return sortedDates.map(date => {
      const dataPoint: any = { date };

      visibleTrends.forEach(trend => {
        const point = trend.data.find(d => d.date === date);
        dataPoint[trend.appId] = point ? point.rating : null;
      });

      return dataPoint;
    });
  }, [visibleTrends]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!visibleTrends || visibleTrends.length === 0) return null;

    const primaryTrend = visibleTrends.find(t => t.isPrimary);
    if (!primaryTrend || primaryTrend.data.length === 0) return null;

    const firstRating = primaryTrend.data[0].rating;
    const lastRating = primaryTrend.data[primaryTrend.data.length - 1].rating;
    const change = lastRating - firstRating;
    const changePercent = (change / firstRating) * 100;

    return {
      current: lastRating,
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [visibleTrends]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rating Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Failed to load rating trends
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!trends || trends.length === 0 || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rating Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-sm text-muted-foreground">
            <Info className="h-8 w-8 mb-2 opacity-50" />
            <p>No historical rating data available</p>
            <p className="text-xs mt-1">Data will appear once snapshots are collected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-base">Rating Trends</CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Average app store rating over time. Data from daily snapshots of review intelligence.
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>

          {/* Current Stats */}
          {stats && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">
                  {stats.current.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Current Rating</div>
              </div>
              <Badge
                variant={stats.isPositive ? 'default' : 'destructive'}
                className="text-xs"
              >
                {stats.isPositive ? '+' : ''}
                {stats.change.toFixed(2)} ({stats.changePercent > 0 ? '+' : ''}
                {stats.changePercent.toFixed(1)}%)
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(parseISO(date), 'MMM d')}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '12px',
              }}
              labelFormatter={(date) => format(parseISO(date as string), 'MMM d, yyyy')}
              formatter={(value: any, name: string) => {
                const trend = visibleTrends.find(t => t.appId === name);
                return [
                  `${Number(value).toFixed(2)} ★`,
                  trend?.appName || name,
                ];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const trend = visibleTrends.find(t => t.appId === value);
                return (
                  <span className="text-xs">
                    {trend?.appName || value}
                    {trend?.isPrimary && ' (You)'}
                  </span>
                );
              }}
            />

            {/* Render lines for each visible app */}
            {visibleTrends.map((trend, index) => (
              <Line
                key={trend.appId}
                type="monotone"
                dataKey={trend.appId}
                stroke={APP_COLORS[index % APP_COLORS.length]}
                strokeWidth={trend.isPrimary ? 3 : 2}
                dot={chartData.length <= 30}
                activeDot={{ r: 6 }}
                connectNulls
                name={trend.appName}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Footer Note */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>
            Showing {visibleTrends.length} app{visibleTrends.length !== 1 ? 's' : ''} •{' '}
            {chartData.length} data point{chartData.length !== 1 ? 's' : ''} •{' '}
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
