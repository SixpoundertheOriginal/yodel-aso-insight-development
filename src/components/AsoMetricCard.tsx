import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Search, LayoutGrid, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { generateCvrInsight } from '@/services/dashboard-narrative.service';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * ASO Metric Card Component
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
  isLoading = false
}: AsoMetricCardProps) {

  const Icon = ICON_MAP[icon];
  const gradient = GRADIENT_MAP[icon];

  // Generate CVR insight narrative
  const cvrInsight = useMemo(() => {
    const metricType = icon === 'search' ? 'search' : 'browse';
    return generateCvrInsight(cvr, metricType, cvrDelta);
  }, [cvr, icon, cvrDelta]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatPercent = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="h-[280px] animate-pulse bg-muted" />
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
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  impressionsDelta >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {impressionsDelta >= 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(impressionsDelta))}
                </div>
              )}
            </div>
            <div className="text-4xl font-bold tracking-tight">
              {formatNumber(impressions)}
            </div>
          </div>

          {/* Downloads */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Downloads
              </span>
              {downloadsDelta !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  downloadsDelta >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {downloadsDelta >= 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(downloadsDelta))}
                </div>
              )}
            </div>
            <div className="text-4xl font-bold tracking-tight">
              {formatNumber(downloads)}
            </div>
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
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded",
                  cvrDelta >= 0
                    ? "text-green-500 bg-green-500/10"
                    : "text-red-500 bg-red-500/10"
                )}>
                  {cvrDelta >= 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(cvrDelta).toFixed(1)}pp
                </div>
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
      </div>
    </Card>
  );
}
