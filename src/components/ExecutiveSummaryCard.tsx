import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { generateDashboardSummary } from '@/services/dashboard-narrative.service';

interface TrafficSourceData {
  traffic_source: string;
  traffic_source_display?: string;
  impressions: number;
  downloads: number;
  cvr: number;
}

interface MetricsSummary {
  impressions: number;
  downloads: number;
  cvr: number;
}

interface ExecutiveSummaryCardProps {
  summary: MetricsSummary;
  trafficSources: TrafficSourceData[];
  dateRange: { start: string; end: string };
  organizationName: string;
  delta?: {
    impressions: number;
    downloads: number;
    cvr: number;
  };
  isLoading?: boolean;
}

export function ExecutiveSummaryCard({
  summary,
  trafficSources,
  dateRange,
  organizationName,
  delta,
  isLoading = false
}: ExecutiveSummaryCardProps) {
  // Generate narrative using template-based service
  const narrative = useMemo(() => {
    if (!summary || summary.impressions === 0) {
      return 'No data available for the selected period. Adjust your date range or app selection to view analytics.';
    }

    return generateDashboardSummary(
      {
        impressions: summary.impressions,
        downloads: summary.downloads,
        cvr: summary.cvr
      },
      trafficSources,
      dateRange,
      organizationName,
      delta
    );
  }, [summary, trafficSources, dateRange, organizationName, delta]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-yodel-orange" />
          <span className="text-zinc-400">Generating executive summary...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-zinc-700 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2 flex items-center gap-2">
            📊 Executive Summary
          </h2>
          <p className="text-zinc-300 leading-relaxed">
            {narrative}
          </p>
        </div>
      </div>
    </Card>
  );
}
