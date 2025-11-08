import { ArrowUp, ArrowDown, Search, LayoutGrid, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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
  isLoading = false
}: AsoMetricCardProps) {

  const Icon = ICON_MAP[icon];
  const gradient = GRADIENT_MAP[icon];

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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conversion Rate
            </span>
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
    </Card>
  );
}
