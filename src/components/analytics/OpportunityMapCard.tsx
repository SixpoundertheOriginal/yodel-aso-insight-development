import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import type { OpportunityCandidate } from '@/utils/asoIntelligence';
import { cn } from '@/lib/utils';

interface OpportunityMapCardProps {
  opportunities: OpportunityCandidate[];
}

// ✅ PHASE B: Memoized to prevent unnecessary re-renders
export const OpportunityMapCard = memo(function OpportunityMapCard({ opportunities }: OpportunityMapCardProps) {
  // Handle no opportunities case
  if (opportunities.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-yodel-orange" />
            <CardTitle className="text-lg">ASO Opportunity Map</CardTitle>
          </div>
          <CardDescription>Prioritized optimization recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <TrendingUp className="h-12 w-12 mb-4 opacity-50 text-green-500" />
            <p className="text-sm font-medium text-green-400">Excellent Performance!</p>
            <p className="text-xs text-zinc-500 mt-2">No high-priority optimization opportunities identified</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority color mapping
  const priorityColors = {
    high: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      badge: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    medium: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    },
    low: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-yodel-orange" />
            <CardTitle className="text-lg">ASO Opportunity Map</CardTitle>
          </div>
          <span className="text-sm text-zinc-400">
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
          </span>
        </div>
        <CardDescription>Prioritized by potential impact on downloads</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {opportunities.map((opp, index) => {
          const colors = priorityColors[opp.priority];

          return (
            <div
              key={opp.id}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                colors.bg,
                colors.border
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-zinc-500">#{index + 1}</span>
                  <div>
                    <h4 className="font-semibold text-zinc-200">{opp.category}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{opp.message}</p>
                  </div>
                </div>
                <div className={cn('px-2 py-1 rounded text-xs font-medium border', colors.badge)}>
                  {opp.priority.toUpperCase()}
                </div>
              </div>

              {/* Score and Gap */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Opportunity Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn('text-2xl font-bold', colors.text)}>
                      {opp.score.toFixed(0)}
                    </span>
                    <span className="text-sm text-zinc-500">/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Performance Gap</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-zinc-300">
                      {Math.abs(opp.gap).toFixed(1)}
                      {opp.category.includes('%') || opp.category.includes('Rate') || opp.category.includes('Share') ? '%' : ''}
                    </span>
                    <span className="text-sm text-zinc-500">behind</span>
                  </div>
                </div>
              </div>

              {/* Current vs Benchmark */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Current</span>
                  <span className="text-zinc-300 font-medium">
                    {opp.currentValue.toFixed(1)}
                    {opp.category.includes('%') || opp.category.includes('Rate') || opp.category.includes('Share') ? '%' : ''}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-zinc-600 h-2 rounded-full"
                    style={{ width: `${Math.min((opp.currentValue / opp.benchmark) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Benchmark</span>
                  <span className={cn('font-medium', colors.text)}>
                    {opp.benchmark.toFixed(1)}
                    {opp.category.includes('%') || opp.category.includes('Rate') || opp.category.includes('Share') ? '%' : ''}
                  </span>
                </div>
              </div>

              {/* Actionable Insight */}
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-yodel-orange">Action:</strong> {opp.actionableInsight}
                </p>
              </div>
            </div>
          );
        })}

        {/* Summary note */}
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Opportunities ranked by gap-to-benchmark scoring. Focus on high-priority items for maximum impact.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
