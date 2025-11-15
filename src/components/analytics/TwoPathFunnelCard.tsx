import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, MousePointer, Zap, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateTwoPathMetricsFromData } from '@/utils/twoPathCalculator';
import { generateTwoPathAnalysis } from '@/services/dashboard-narrative.service';

interface TwoPathFunnelCardProps {
  data: any[];
  trafficSource?: 'search' | 'browse' | 'total';
  isLoading?: boolean;
}

export function TwoPathFunnelCard({
  data = [],
  trafficSource = 'total',
  isLoading = false
}: TwoPathFunnelCardProps) {

  const metrics = useMemo(() => {
    return calculateTwoPathMetricsFromData(data);
  }, [data]);

  const analysis = useMemo(() => {
    if (metrics.impressions === 0) {
      return { narrative: 'No data available', insights: [] };
    }
    return generateTwoPathAnalysis(metrics, trafficSource === 'total' ? 'search' : trafficSource);
  }, [metrics, trafficSource]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      </Card>
    );
  }

  const hasData = metrics.impressions > 0;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yodel-orange" />
          <h3 className="text-lg font-semibold">Two-Path Conversion Model</h3>
        </div>
        {hasData && (
          <Badge variant="secondary" className="text-green-600">
            {metrics.total_cvr.toFixed(2)}% Total CVR
          </Badge>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No conversion data available for the selected period</p>
        </div>
      ) : (
        <>
          {/* Two-Path Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Path 1: Direct Install */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-orange-500" />
                <h4 className="text-sm font-semibold text-orange-400">Direct Install Path</h4>
                <Badge variant="outline" className="ml-auto text-orange-400 border-orange-400/30">
                  {metrics.direct_install_share.toFixed(0)}%
                </Badge>
              </div>

              {/* Impressions */}
              <div className="relative rounded-lg p-4 bg-gradient-to-r from-blue-500 to-blue-600">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium text-sm">Impressions</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatNumber(metrics.impressions)}</div>
                  </div>
                </div>
              </div>

              {/* Arrow down */}
              <div className="flex items-center justify-center">
                <div className="text-orange-500 text-xs font-semibold">
                  ↓ GET Button ({metrics.direct_cvr.toFixed(2)}% CVR)
                </div>
              </div>

              {/* Direct Downloads */}
              <div className="relative rounded-lg p-4 bg-gradient-to-r from-orange-500 to-orange-600">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4" />
                    <span className="font-medium text-sm">Direct Installs</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatNumber(metrics.direct_installs)}</div>
                    <div className="text-xs opacity-90">
                      {metrics.direct_install_share.toFixed(0)}% of total
                    </div>
                  </div>
                </div>
              </div>

              {/* Path explanation */}
              <div className="text-xs text-muted-foreground bg-orange-500/5 p-3 rounded-lg border border-orange-500/20">
                <p>Users tap GET in search results and install without visiting the product page. Common in high-intent Search traffic.</p>
              </div>
            </div>

            {/* Path 2: PDP-Driven Install */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <MousePointer className="h-4 w-4 text-purple-500" />
                <h4 className="text-sm font-semibold text-purple-400">PDP-Driven Install Path</h4>
                <Badge variant="outline" className="ml-auto text-purple-400 border-purple-400/30">
                  {metrics.pdp_install_share.toFixed(0)}%
                </Badge>
              </div>

              {/* Impressions */}
              <div className="relative rounded-lg p-4 bg-gradient-to-r from-blue-500 to-blue-600">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium text-sm">Impressions</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatNumber(metrics.impressions)}</div>
                  </div>
                </div>
              </div>

              {/* Arrow down */}
              <div className="flex items-center justify-center">
                <div className="text-purple-500 text-xs font-semibold">
                  ↓ Tap Through ({metrics.tap_through_rate.toFixed(1)}%)
                </div>
              </div>

              {/* Product Page Views */}
              <div className="relative rounded-lg p-4 bg-gradient-to-r from-purple-500 to-purple-600">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <MousePointer className="h-4 w-4" />
                    <span className="font-medium text-sm">Product Page Views</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatNumber(metrics.product_page_views)}</div>
                  </div>
                </div>
              </div>

              {/* Arrow down */}
              <div className="flex items-center justify-center">
                <div className="text-purple-500 text-xs font-semibold">
                  ↓ Convert ({metrics.pdp_cvr.toFixed(1)}% CVR)
                </div>
              </div>

              {/* PDP Downloads */}
              <div className="relative rounded-lg p-4 bg-gradient-to-r from-purple-500 to-purple-600">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4" />
                    <span className="font-medium text-sm">PDP Installs</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatNumber(metrics.pdp_driven_installs)}</div>
                    <div className="text-xs opacity-90">
                      {metrics.pdp_install_share.toFixed(0)}% of total
                    </div>
                  </div>
                </div>
              </div>

              {/* Path explanation */}
              <div className="text-xs text-muted-foreground bg-purple-500/5 p-3 rounded-lg border border-purple-500/20">
                <p>Users visit the product page to view screenshots and details before installing. Dominant path for Browse traffic.</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6 pt-6 border-t">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Tap-Through Rate</p>
              <p className="text-xl font-bold">{metrics.tap_through_rate.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Icon + Title</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">PDP Conversion</p>
              <p className="text-xl font-bold">{metrics.pdp_cvr.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Creatives</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Funnel Leak</p>
              <p className="text-xl font-bold">{metrics.funnel_leak_rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">PDP Drop-off</p>
            </div>
          </div>

          {/* Analysis Narrative */}
          {analysis.narrative && (
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-400">Two-Path Analysis</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {analysis.narrative}
                  </p>
                  {analysis.insights.length > 0 && (
                    <ul className="text-sm text-zinc-300 space-y-1 mt-3">
                      {analysis.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
