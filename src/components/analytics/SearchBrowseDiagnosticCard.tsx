import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Search, Compass, TrendingUp, Lightbulb } from 'lucide-react';
import { Badge, LoadingSkeleton, ZeroState, formatters } from '@/design-registry';
import { cn } from '@/lib/utils';
import type { TwoPathConversionMetrics } from '@/utils/twoPathCalculator';
import { generateSearchBrowseDiagnostic } from '@/services/dashboard-narrative.service';

/**
 * MIGRATION NOTE: Now uses Design Registry primitives:
 * - LoadingSkeleton for loading states
 * - ZeroState for empty states
 * - Badge for CVR comparison indicators
 * - formatters.number.compact() for install counts
 * - formatters.number.precise() for percentages/CVR values
 * - Removed inline formatNumber() function
 */

interface SearchBrowseDiagnosticCardProps {
  searchMetrics: TwoPathConversionMetrics;
  browseMetrics: TwoPathConversionMetrics;
  isLoading?: boolean;
}

export function SearchBrowseDiagnosticCard({
  searchMetrics,
  browseMetrics,
  isLoading = false
}: SearchBrowseDiagnosticCardProps) {

  const insights = useMemo(() => {
    return generateSearchBrowseDiagnostic(searchMetrics, browseMetrics);
  }, [searchMetrics, browseMetrics]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingSkeleton height="h-[400px]" />
      </Card>
    );
  }

  const hasData = searchMetrics.impressions > 0 || browseMetrics.impressions > 0;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-yodel-orange" />
          <h3 className="text-lg font-semibold">Search vs Browse Diagnostic</h3>
        </div>
      </div>

      {!hasData ? (
        <ZeroState
          icon={TrendingUp}
          title="No diagnostic data available"
          description="Select a time period with traffic data to view the Search vs Browse comparison"
        />
      ) : (
        <>
          {/* Comparison Table */}
          <div className="space-y-4 mb-6">
            {/* Header Row */}
            <div className="grid grid-cols-3 gap-4 pb-3 border-b border-zinc-800">
              <div className="text-sm font-medium text-muted-foreground">Metric</div>
              <div className="text-sm font-medium text-center flex items-center justify-center gap-2">
                <Search className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400">Search</span>
              </div>
              <div className="text-sm font-medium text-center flex items-center justify-center gap-2">
                <Compass className="h-4 w-4 text-purple-400" />
                <span className="text-purple-400">Browse</span>
              </div>
            </div>

            {/* Direct Installs */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-sm">
                <div className="font-medium">Direct Installs</div>
                <div className="text-xs text-muted-foreground">Bypass PDP</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{formatters.number.compact(searchMetrics.direct_installs)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatters.number.precise(searchMetrics.direct_install_share, 0)}% of total
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{formatters.number.compact(browseMetrics.direct_installs)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatters.number.precise(browseMetrics.direct_install_share, 0)}% of total
                </div>
              </div>
            </div>

            {/* PDP Installs */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-sm">
                <div className="font-medium">PDP Installs</div>
                <div className="text-xs text-muted-foreground">Through product page</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{formatters.number.compact(searchMetrics.pdp_driven_installs)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatters.number.precise(searchMetrics.pdp_install_share, 0)}% of total
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{formatters.number.compact(browseMetrics.pdp_driven_installs)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatters.number.precise(browseMetrics.pdp_install_share, 0)}% of total
                </div>
              </div>
            </div>

            {/* Install Share Visualization */}
            <div className="grid grid-cols-3 gap-4 items-center pt-2">
              <div className="text-sm font-medium">Install Path Split</div>
              <div className="space-y-1">
                <div className="flex gap-1 h-6 rounded overflow-hidden">
                  <div
                    className="bg-orange-500 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ width: `${searchMetrics.direct_install_share}%` }}
                  >
                    {searchMetrics.direct_install_share > 15 && `${formatters.number.precise(searchMetrics.direct_install_share, 0)}%`}
                  </div>
                  <div
                    className="bg-purple-500 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ width: `${searchMetrics.pdp_install_share}%` }}
                  >
                    {searchMetrics.pdp_install_share > 15 && `${formatters.number.precise(searchMetrics.pdp_install_share, 0)}%`}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    Direct
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    PDP
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-1 h-6 rounded overflow-hidden">
                  <div
                    className="bg-orange-500 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ width: `${browseMetrics.direct_install_share}%` }}
                  >
                    {browseMetrics.direct_install_share > 15 && `${formatters.number.precise(browseMetrics.direct_install_share, 0)}%`}
                  </div>
                  <div
                    className="bg-purple-500 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ width: `${browseMetrics.pdp_install_share}%` }}
                  >
                    {browseMetrics.pdp_install_share > 15 && `${formatters.number.precise(browseMetrics.pdp_install_share, 0)}%`}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    Direct
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    PDP
                  </span>
                </div>
              </div>
            </div>

            {/* Total CVR */}
            <div className="grid grid-cols-3 gap-4 items-center pt-3 border-t border-zinc-800">
              <div className="text-sm">
                <div className="font-medium">Total CVR</div>
                <div className="text-xs text-muted-foreground">Overall conversion</div>
              </div>
              <div className="text-center">
                <Badge variant={searchMetrics.total_cvr > browseMetrics.total_cvr ? 'default' : 'secondary'} className={cn(
                  searchMetrics.total_cvr > browseMetrics.total_cvr ? 'bg-green-600' : ''
                )}>
                  {formatters.number.precise(searchMetrics.total_cvr, 2)}%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={browseMetrics.total_cvr > searchMetrics.total_cvr ? 'default' : 'secondary'} className={cn(
                  browseMetrics.total_cvr > searchMetrics.total_cvr ? 'bg-green-600' : ''
                )}>
                  {formatters.number.precise(browseMetrics.total_cvr, 2)}%
                </Badge>
              </div>
            </div>

            {/* Direct CVR */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-sm">
                <div className="font-medium">Direct CVR</div>
                <div className="text-xs text-muted-foreground">GET button only</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-400">{formatters.number.precise(searchMetrics.direct_cvr, 2)}%</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-400">{formatters.number.precise(browseMetrics.direct_cvr, 2)}%</div>
              </div>
            </div>

            {/* PDP CVR */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-sm">
                <div className="font-medium">PDP CVR</div>
                <div className="text-xs text-muted-foreground">Product page → Install</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{formatters.number.precise(searchMetrics.pdp_cvr, 2)}%</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{formatters.number.precise(browseMetrics.pdp_cvr, 2)}%</div>
              </div>
            </div>
          </div>

          {/* Diagnostic Insights */}
          {insights.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-400">Diagnostic Insights</h4>
                  <ul className="text-sm text-zinc-300 space-y-2">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
