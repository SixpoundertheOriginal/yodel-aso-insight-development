import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  Eye,
  Award,
  Palette,
  TrendingDown,
  Zap,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DerivedKPIs } from '@/utils/twoPathCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DerivedKpiGridProps {
  derivedKpis: DerivedKPIs;
  isLoading?: boolean;
}

export function DerivedKpiGrid({ derivedKpis, isLoading = false }: DerivedKpiGridProps) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="h-20 animate-pulse bg-muted rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Search/Browse Ratio',
      value: derivedKpis.search_browse_ratio,
      format: (v: number) => v >= 999 ? '∞' : `${v.toFixed(1)}:1`,
      icon: Scale,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      interpretation: derivedKpis.search_browse_ratio > 3
        ? 'Metadata-driven'
        : derivedKpis.search_browse_ratio < 0.5
          ? 'Creative-driven'
          : 'Balanced',
      tooltip: 'Ratio of Search to Browse impressions. Higher values indicate metadata-driven discovery, lower values suggest creative-driven growth.'
    },
    {
      label: 'First Impression Effectiveness',
      value: derivedKpis.first_impression_effectiveness,
      format: (v: number) => `${v.toFixed(1)}%`,
      icon: Eye,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      interpretation: derivedKpis.first_impression_effectiveness > 30
        ? 'Strong'
        : derivedKpis.first_impression_effectiveness < 15
          ? 'Needs work'
          : 'Moderate',
      tooltip: 'Percentage of impressions that result in product page views. Measures icon and title effectiveness.'
    },
    {
      label: 'Metadata Strength',
      value: derivedKpis.metadata_strength,
      format: (v: number) => v.toFixed(2),
      icon: Award,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      interpretation: derivedKpis.metadata_strength > 2
        ? 'Excellent'
        : derivedKpis.metadata_strength > 1
          ? 'Good'
          : 'Low',
      tooltip: 'Search CVR weighted by Search install contribution. Combines keyword relevance and conversion power.'
    },
    {
      label: 'Creative Strength',
      value: derivedKpis.creative_strength,
      format: (v: number) => v.toFixed(2),
      icon: Palette,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
      interpretation: derivedKpis.creative_strength > 2
        ? 'Excellent'
        : derivedKpis.creative_strength > 1
          ? 'Good'
          : 'Low',
      tooltip: 'Browse CVR weighted by Browse install contribution. Measures visual merchandising effectiveness.'
    },
    {
      label: 'Funnel Leak Rate',
      value: derivedKpis.funnel_leak_rate,
      format: (v: number) => `${v.toFixed(1)}%`,
      icon: TrendingDown,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      interpretation: derivedKpis.funnel_leak_rate < 50
        ? 'Excellent'
        : derivedKpis.funnel_leak_rate < 70
          ? 'Good'
          : 'High',
      tooltip: 'Percentage of product page visitors who don\'t install. Lower is better. Indicates creative asset quality.',
      invertGood: true
    },
    {
      label: 'Direct Install Propensity',
      value: derivedKpis.direct_install_propensity,
      format: (v: number) => `${v.toFixed(1)}%`,
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      interpretation: derivedKpis.direct_install_propensity > 40
        ? 'High intent'
        : derivedKpis.direct_install_propensity > 20
          ? 'Moderate'
          : 'Low',
      tooltip: 'Percentage of Search installs that bypass the product page. High values signal strong brand recognition or keyword-app fit.'
    }
  ];

  const getInterpretationColor = (interpretation: string, invertGood?: boolean) => {
    if (invertGood) {
      if (interpretation === 'Excellent' || interpretation === 'Good') return 'bg-green-600';
      if (interpretation === 'High' || interpretation === 'Needs work') return 'bg-red-600';
    } else {
      if (interpretation === 'Excellent' || interpretation === 'Strong' || interpretation === 'High intent') return 'bg-green-600';
      if (interpretation === 'Needs work' || interpretation === 'Low') return 'bg-red-600';
    }
    return 'bg-zinc-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className={cn("p-4 border", kpi.borderColor, "bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors")}>
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                <Icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{kpi.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold">{kpi.format(kpi.value)}</p>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  getInterpretationColor(kpi.interpretation, kpi.invertGood)
                )}
              >
                {kpi.interpretation}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
