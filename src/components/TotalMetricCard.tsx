import { TrendingUp, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { TrendBadge } from '@/components/ui/TrendBadge';
import { MetricValue, LoadingSkeleton } from '@/design-registry';

/**
 * Total Metric Card Component
 *
 * MIGRATION NOTE: Now uses Design Registry primitives (MetricValue, LoadingSkeleton).
 *
 * Premium card for displaying aggregate metrics across all traffic sources:
 * - Total Impressions (all traffic)
 * - Total Downloads (all traffic)
 *
 * Features:
 * - Glassmorphism effect
 * - Gradient accents (Cyan for impressions, Green for downloads)
 * - Hover animations
 * - Large readable numbers from MetricValue primitive
 * - Optional delta indicators
 */

interface TotalMetricCardProps {
  type: 'impressions' | 'downloads';
  value: number;
  delta?: number;
  isLoading?: boolean;
}

const METRIC_CONFIG = {
  impressions: {
    label: 'Total Impressions',
    sublabel: 'All Traffic Sources',
    icon: Eye,
    gradient: 'from-cyan-500 to-blue-600',
    color: 'text-cyan-500'
  },
  downloads: {
    label: 'Total Downloads',
    sublabel: 'All Traffic Sources',
    icon: Download,
    gradient: 'from-green-500 to-emerald-600',
    color: 'text-green-500'
  }
};

export function TotalMetricCard({
  type,
  value,
  delta = 0,
  isLoading = false
}: TotalMetricCardProps) {

  const config = METRIC_CONFIG[type];
  const Icon = config.icon;

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <LoadingSkeleton height="h-[160px]" />
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
        `bg-gradient-to-br ${config.gradient}`
      )} />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg bg-gradient-to-br",
              config.gradient
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {config.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                {config.sublabel}
              </p>
            </div>
          </div>

          {delta !== undefined && Math.abs(delta) >= 0.1 && (
            <TrendBadge value={delta} label="" size="sm" showIcon={true} />
          )}
        </div>

        {/* Main Value - Using Design Registry MetricValue */}
        <div className="flex items-baseline gap-2">
          <MetricValue value={value} format="compact" size="hero" />
          <TrendingUp className={cn("h-6 w-6 mb-2", config.color)} />
        </div>
      </div>
    </Card>
  );
}
