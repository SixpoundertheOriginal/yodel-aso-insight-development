import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Lightbulb, Sparkles } from 'lucide-react';
import type { TwoPathConversionMetrics, DerivedKPIs } from '@/utils/twoPathCalculator';
import { generateDerivedKpiInsights } from '@/services/dashboard-narrative.service';

interface InsightNarrativeCardProps {
  searchMetrics: TwoPathConversionMetrics;
  browseMetrics: TwoPathConversionMetrics;
  derivedKpis: DerivedKPIs;
  isLoading?: boolean;
}

export function InsightNarrativeCard({
  searchMetrics,
  browseMetrics,
  derivedKpis,
  isLoading = false
}: InsightNarrativeCardProps) {

  const insights = useMemo(() => {
    return generateDerivedKpiInsights(derivedKpis, searchMetrics, browseMetrics);
  }, [derivedKpis, searchMetrics, browseMetrics]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-[200px] animate-pulse bg-muted rounded-lg" />
      </Card>
    );
  }

  const hasInsights = insights.length > 0;

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 border-blue-500/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <Sparkles className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">ASO Intelligence</h3>
          <p className="text-xs text-muted-foreground">Auto-generated diagnostic insights</p>
        </div>
      </div>

      {!hasInsights ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Analyzing performance metrics...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900/70 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed flex-1">
                {insight}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {hasInsights && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-muted-foreground">
            These insights are generated from your App Store Connect data and two-path conversion analysis.
            Use them to prioritize ASO improvements and creative testing.
          </p>
        </div>
      )}
    </Card>
  );
}
