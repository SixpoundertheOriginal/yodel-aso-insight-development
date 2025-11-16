import { useMemo } from 'react';
import { Search, LayoutGrid, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { generateCvrInsight } from '@/services/dashboard-narrative.service';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MetricValue, DeltaChip, LoadingSkeleton } from '@/design-registry';

/**
 * ASO Metric Card Component
 *
 * MIGRATION NOTE: Now uses Design Registry primitives (MetricValue, DeltaChip, LoadingSkeleton).
 *
 * Premium, futuristic card for displaying ASO visibility metrics:
 * - App Store Search (high-intent traffic)
 * - App Store Browse (discovery traffic)
 *
 * Features:
 * - Glassmorphism effect
 * - Gradient accents
 * - Hover animations
 * - Responsive layout
 * - Executive-friendly design
 * - Consistent number formatting via MetricValue
 * - Semantic delta indicators via DeltaChip
 */

interface AsoMetricCardProps {
  title: string;
  icon: 'search' | 'browse';
  impressions: number;
  downloads: number;
  cvr: number;
  impressionsDelta?: number;
  downloadsDelta?: number;
  cvrDelta?: number; // Absolute percentage point change (e.g., 0.5 means CVR went from 2.0% to 2.5%)
  isLoading?: boolean;
  // Two-path conversion display (optional)
  showTwoPathBreakdown?: boolean;
  directInstalls?: number;
  pdpInstalls?: number;
}

const ICON_MAP = {
  search: Search,
  browse: LayoutGrid
};

const GRADIENT_MAP = {
  search: 'from-blue-500 to-purple-600',
  browse: 'from-purple-500 to-pink-600'
};

export function AsoMetricCard({
  title,
  icon,
  impressions,
  downloads,
  cvr,
  impressionsDelta = 0,
  downloadsDelta = 0,
  cvrDelta,
  isLoading = false,
  showTwoPathBreakdown = false,
  directInstalls = 0,
  pdpInstalls = 0
}: AsoMetricCardProps) {

  const Icon = ICON_MAP[icon];
  const gradient = GRADIENT_MAP[icon];

  // Generate CVR insight narrative
  const cvrInsight = useMemo(() => {
    const metricType = icon === 'search' ? 'search' : 'browse';
    return generateCvrInsight(cvr, metricType, cvrDelta);
  }, [cvr, icon, cvrDelta]);

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <LoadingSkeleton height="h-[280px]" />
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      "hover:scale-[1.02] hover:shadow-2xl",
      "bg-card/50 backdrop-blur-xl border-border/50"
    )}>
      {/* Gradient Background Accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl",
        `bg-gradient-to-br ${gradient}`
      )} />

      <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg bg-gradient-to-br",
              gradient
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground/60">
                Organic Visibility
              </p>
            </div>
          </div>
          <TrendingUp className="h-5 w-5 text-muted-foreground/40" />
        </div>

        {/* Primary Metrics */}
        <div className="space-y-4">
          {/* Impressions */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Impressions
              </span>
              {impressionsDelta !== 0 && (
                <DeltaChip value={impressionsDelta} format="percentage" size="xs" />
              )}
            </div>
            <MetricValue value={impressions} format="compact" size="primary" />
          </div>

          {/* Downloads */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Downloads
              </span>
              {downloadsDelta !== 0 && (
                <DeltaChip value={downloadsDelta} format="percentage" size="xs" />
              )}
            </div>
            <MetricValue value={downloads} format="compact" size="primary" />
          </div>
        </div>

        {/* CVR Badge */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Conversion Rate
              </span>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
                      <Info className="h-3 w-3 text-muted-foreground/60" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-zinc-900 border-zinc-700 p-3"
                  >
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {cvrInsight}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              {cvrDelta !== undefined && Math.abs(cvrDelta) >= 0.1 && (
                <DeltaChip value={cvrDelta} format="points" size="xs" />
              )}
              <div className={cn(
                "px-3 py-1.5 rounded-full text-sm font-bold",
                "bg-gradient-to-r",
                gradient,
                "text-white"
              )}>
                {cvr.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Two-Path Install Breakdown (optional) */}
        {showTwoPathBreakdown && (directInstalls > 0 || pdpInstalls > 0) && (
          <div className="pt-4 border-t border-border/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Install Path Breakdown
            </div>
            <div className="flex gap-2 h-6 rounded overflow-hidden mb-2">
              <div
                className="bg-orange-500 flex items-center justify-center text-xs font-semibold text-white"
                style={{ width: `${(directInstalls / downloads) * 100}%` }}
              >
                {((directInstalls / downloads) * 100) > 15 && `${((directInstalls / downloads) * 100).toFixed(0)}%`}
              </div>
              <div
                className="bg-purple-500 flex items-center justify-center text-xs font-semibold text-white"
                style={{ width: `${(pdpInstalls / downloads) * 100}%` }}
              >
                {((pdpInstalls / downloads) * 100) > 15 && `${((pdpInstalls / downloads) * 100).toFixed(0)}%`}
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>
                  <MetricValue value={directInstalls} format="compact" size="small" className="inline" /> Direct
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>
                  <MetricValue value={pdpInstalls} format="compact" size="small" className="inline" /> PDP
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
