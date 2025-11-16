import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { Badge, ZeroState, DeltaChip, formatters } from '@/design-registry';
import type { SimulationScenario } from '@/utils/asoIntelligence';
import { cn } from '@/lib/utils';

/**
 * MIGRATION NOTE: Now uses Design Registry primitives:
 * - ZeroState for empty state display
 * - Badge for confidence indicators
 * - DeltaChip for impact percentages
 * - formatters.number.precise() and formatters.number.full() for value formatting
 */

interface OutcomeSimulationCardProps {
  scenarios: SimulationScenario[];
}

export const OutcomeSimulationCard = memo(function OutcomeSimulationCard({ scenarios }: OutcomeSimulationCardProps) {
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
          <ZeroState
            icon={Sparkles}
            title="No scenarios available"
            description="Insufficient data for projections"
          />
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
          const impactPercentage = (scenario.estimatedImpact.delta / scenario.estimatedImpact.currentValue) * 100;

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
                <Badge variant="status" status={scenario.confidence === 'high' ? 'success' : scenario.confidence === 'medium' ? 'warning' : 'default'}>
                  {scenario.confidence.toUpperCase()}
                </Badge>
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
                    {formatters.number.precise(scenario.improvement.currentValue, 1)}%
                  </span>
                  <ArrowRight className="h-4 w-4 text-yodel-orange" />
                  <span className="text-lg font-bold text-yodel-orange">
                    {formatters.number.precise(scenario.improvement.improvedValue, 1)}%
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
                  <DeltaChip value={impactPercentage} format="percentage" size="sm" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-zinc-300">
                    {formatters.number.full(scenario.estimatedImpact.currentValue)}
                  </span>
                  <ArrowRight className="h-5 w-5 text-yodel-orange" />
                  <span className="text-2xl font-bold text-yodel-orange">
                    {formatters.number.full(scenario.estimatedImpact.projectedValue)}
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
});
