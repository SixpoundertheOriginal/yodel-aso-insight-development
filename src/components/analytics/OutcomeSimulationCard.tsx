import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import type { SimulationScenario } from '@/utils/asoIntelligence';
import { cn } from '@/lib/utils';

interface OutcomeSimulationCardProps {
  scenarios: SimulationScenario[];
}

export function OutcomeSimulationCard({ scenarios }: OutcomeSimulationCardProps) {
  // Handle no scenarios case
  if (scenarios.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yodel-orange" />
            <CardTitle className="text-lg">Expected Outcome Simulations</CardTitle>
          </div>
          <CardDescription>Impact projections for targeted improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm text-center">No scenarios available</p>
            <p className="text-xs text-zinc-500 mt-2">Insufficient data for projections</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Confidence level colors
  const confidenceColors = {
    high: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-500/30',
      badge: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    medium: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    },
    low: {
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/30',
      badge: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yodel-orange" />
            <CardTitle className="text-lg">Expected Outcome Simulations</CardTitle>
          </div>
          <span className="text-sm text-zinc-400">
            Top {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}
          </span>
        </div>
        <CardDescription>Projected download impact from targeted improvements</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {scenarios.map((scenario, index) => {
          const colors = confidenceColors[scenario.confidence];
          const impactPercentage = ((scenario.estimatedImpact.delta / scenario.estimatedImpact.currentValue) * 100).toFixed(1);

          return (
            <div
              key={scenario.id}
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
                    <h4 className="font-semibold text-zinc-200">{scenario.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{scenario.description}</p>
                  </div>
                </div>
                <div className={cn('px-2 py-1 rounded text-xs font-medium border', colors.badge)}>
                  {scenario.confidence.toUpperCase()}
                </div>
              </div>

              {/* Improvement Detail */}
              <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-2">Improvement Target</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-300 font-medium">
                    {scenario.improvement.metric}
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-zinc-400">
                    {scenario.improvement.currentValue.toFixed(1)}%
                  </span>
                  <ArrowRight className="h-4 w-4 text-yodel-orange" />
                  <span className="text-lg font-bold text-yodel-orange">
                    {scenario.improvement.improvedValue.toFixed(1)}%
                  </span>
                  <span className="text-xs text-zinc-500">({scenario.improvement.change})</span>
                </div>
              </div>

              {/* Estimated Impact */}
              <div>
                <p className="text-xs text-zinc-400 mb-2">Estimated Download Impact</p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Current</span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    <span className="text-sm text-zinc-400">Projected</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">+{impactPercentage}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-zinc-300">
                    {scenario.estimatedImpact.currentValue.toLocaleString()}
                  </span>
                  <ArrowRight className="h-5 w-5 text-yodel-orange" />
                  <span className="text-2xl font-bold text-yodel-orange">
                    {scenario.estimatedImpact.projectedValue.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                  <p className="text-sm font-semibold text-green-400">
                    {scenario.estimatedImpact.deltaFormatted}
                  </p>
                </div>
              </div>

              {/* Calculation note */}
              <div className="mt-3 pt-3 border-t border-zinc-700">
                <p className="text-xs text-zinc-500 italic">
                  {scenario.calculation}
                </p>
              </div>
            </div>
          );
        })}

        {/* Disclaimer */}
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Simulations assume all else constant. Actual results may vary based on execution, market conditions, and competitive dynamics.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
