import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Search, Compass, Lightbulb } from 'lucide-react';
import { generateTrafficSourceComparison } from '@/services/dashboard-narrative.service';

interface TrafficMetrics {
  impressions: number;
  downloads: number;
  cvr: number;
}

interface TrafficIntentInsightCardProps {
  searchMetrics: TrafficMetrics;
  browseMetrics: TrafficMetrics;
  isLoading?: boolean;
}

/**
 * Traffic Intent Insight Card
 *
 * Compares Search vs Browse traffic performance and provides strategic recommendations
 */
export function TrafficIntentInsightCard({
  searchMetrics,
  browseMetrics,
  isLoading = false
}: TrafficIntentInsightCardProps) {
  // Generate comparative narrative
  const insight = useMemo(() => {
    if (!searchMetrics || !browseMetrics) {
      return 'Insufficient data to compare traffic sources.';
    }

    if (searchMetrics.impressions === 0 && browseMetrics.impressions === 0) {
      return 'No traffic data available for this period.';
    }

    return generateTrafficSourceComparison(searchMetrics, browseMetrics);
  }, [searchMetrics, browseMetrics]);

  // Calculate distribution
  const totalImpressions = searchMetrics.impressions + browseMetrics.impressions;
  const searchPercent = totalImpressions > 0
    ? ((searchMetrics.impressions / totalImpressions) * 100)
    : 0;
  const browsePercent = totalImpressions > 0
    ? ((browseMetrics.impressions / totalImpressions) * 100)
    : 0;

  // Determine which has better CVR
  const searchBetter = searchMetrics.cvr > browseMetrics.cvr;
  const browseBetter = browseMetrics.cvr > searchMetrics.cvr;

  if (isLoading) {
    return (
      <Card className="p-6 bg-zinc-900 border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-zinc-800 animate-pulse" />
          <span className="text-zinc-400">Analyzing traffic intent...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-700">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10">
            <Lightbulb className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Traffic Intent Analysis
            </h3>
            <p className="text-sm text-zinc-400">
              Search vs Browse performance comparison
            </p>
          </div>
        </div>

        {/* Traffic Distribution */}
        <div className="grid grid-cols-2 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-zinc-300">Search</span>
              {searchBetter && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                  Best CVR
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Traffic Share</span>
                <span className="font-medium text-zinc-300">
                  {searchPercent.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">CVR</span>
                <span className="font-medium text-purple-400">
                  {searchMetrics.cvr.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Downloads</span>
                <span className="font-medium text-zinc-300">
                  {searchMetrics.downloads.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Browse */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">Browse</span>
              {browseBetter && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                  Best CVR
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Traffic Share</span>
                <span className="font-medium text-zinc-300">
                  {browsePercent.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">CVR</span>
                <span className="font-medium text-blue-400">
                  {browseMetrics.cvr.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Downloads</span>
                <span className="font-medium text-zinc-300">
                  {browseMetrics.downloads.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual distribution bar */}
        <div className="h-2 rounded-full overflow-hidden flex bg-zinc-800">
          <div
            className="bg-purple-500"
            style={{ width: `${searchPercent}%` }}
            title={`Search: ${searchPercent.toFixed(1)}%`}
          />
          <div
            className="bg-blue-500"
            style={{ width: `${browsePercent}%` }}
            title={`Browse: ${browsePercent.toFixed(1)}%`}
          />
        </div>

        {/* Insight narrative */}
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </Card>
  );
}
