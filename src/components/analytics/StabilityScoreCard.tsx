import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { StabilityScore } from '@/utils/asoIntelligence';
import { cn } from '@/lib/utils';

interface StabilityScoreCardProps {
  stabilityScore: StabilityScore;
}

export function StabilityScoreCard({ stabilityScore }: StabilityScoreCardProps) {
  // Handle insufficient data case
  if (stabilityScore.score === null) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-lg">ASO Stability Score</CardTitle>
            </div>
          </div>
          <CardDescription>Measures volatility across key performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm text-center">{stabilityScore.message}</p>
            <p className="text-xs text-zinc-500 mt-2">Need at least 7 days for analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Color mapping for score display
  const colorClasses = {
    green: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/30',
      ring: 'ring-green-500/20'
    },
    yellow: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      ring: 'ring-yellow-500/20'
    },
    orange: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      ring: 'ring-orange-500/20'
    },
    red: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
      ring: 'ring-red-500/20'
    },
    gray: {
      bg: 'bg-zinc-500/20',
      text: 'text-zinc-400',
      border: 'border-zinc-500/30',
      ring: 'ring-zinc-500/20'
    }
  };

  const colors = colorClasses[stabilityScore.color];

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-yodel-orange" />
            <CardTitle className="text-lg">ASO Stability Score</CardTitle>
          </div>
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium border',
            colors.bg,
            colors.text,
            colors.border
          )}>
            {stabilityScore.score}/100
          </div>
        </div>
        <CardDescription>
          {stabilityScore.interpretation} • {stabilityScore.period}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metric Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">Volatility Breakdown</h4>

          {stabilityScore.breakdown && (
            <div className="grid grid-cols-2 gap-3">
              {/* Impressions */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Impressions</span>
                  <span className={cn(
                    'font-medium',
                    stabilityScore.breakdown.impressions.score >= 80 ? 'text-green-400' :
                    stabilityScore.breakdown.impressions.score >= 60 ? 'text-yellow-400' :
                    'text-orange-400'
                  )}>
                    {stabilityScore.breakdown.impressions.score}/100
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      stabilityScore.breakdown.impressions.score >= 80 ? 'bg-green-500' :
                      stabilityScore.breakdown.impressions.score >= 60 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    )}
                    style={{ width: `${stabilityScore.breakdown.impressions.score}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500">CV: {stabilityScore.breakdown.impressions.cv.toFixed(3)}</p>
              </div>

              {/* Downloads */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Downloads</span>
                  <span className={cn(
                    'font-medium',
                    stabilityScore.breakdown.downloads.score >= 80 ? 'text-green-400' :
                    stabilityScore.breakdown.downloads.score >= 60 ? 'text-yellow-400' :
                    'text-orange-400'
                  )}>
                    {stabilityScore.breakdown.downloads.score}/100
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      stabilityScore.breakdown.downloads.score >= 80 ? 'bg-green-500' :
                      stabilityScore.breakdown.downloads.score >= 60 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    )}
                    style={{ width: `${stabilityScore.breakdown.downloads.score}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500">CV: {stabilityScore.breakdown.downloads.cv.toFixed(3)}</p>
              </div>

              {/* CVR */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Conversion Rate</span>
                  <span className={cn(
                    'font-medium',
                    stabilityScore.breakdown.cvr.score >= 80 ? 'text-green-400' :
                    stabilityScore.breakdown.cvr.score >= 60 ? 'text-yellow-400' :
                    'text-orange-400'
                  )}>
                    {stabilityScore.breakdown.cvr.score}/100
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      stabilityScore.breakdown.cvr.score >= 80 ? 'bg-green-500' :
                      stabilityScore.breakdown.cvr.score >= 60 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    )}
                    style={{ width: `${stabilityScore.breakdown.cvr.score}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500">CV: {stabilityScore.breakdown.cvr.cv.toFixed(3)}</p>
              </div>

              {/* Direct Share */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Direct Install %</span>
                  <span className={cn(
                    'font-medium',
                    stabilityScore.breakdown.directShare.score >= 80 ? 'text-green-400' :
                    stabilityScore.breakdown.directShare.score >= 60 ? 'text-yellow-400' :
                    'text-orange-400'
                  )}>
                    {stabilityScore.breakdown.directShare.score}/100
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      stabilityScore.breakdown.directShare.score >= 80 ? 'bg-green-500' :
                      stabilityScore.breakdown.directShare.score >= 60 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    )}
                    style={{ width: `${stabilityScore.breakdown.directShare.score}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500">CV: {stabilityScore.breakdown.directShare.cv.toFixed(3)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Insight */}
        <div className={cn(
          'p-3 rounded-lg border',
          colors.bg,
          colors.border
        )}>
          <p className="text-sm text-zinc-200">
            {stabilityScore.score >= 80 && (
              <>Your ASO performance shows <strong className={colors.text}>very stable</strong> trends with minimal volatility. This indicates consistent execution and predictable outcomes.</>
            )}
            {stabilityScore.score >= 60 && stabilityScore.score < 80 && (
              <>Your ASO performance is <strong className={colors.text}>stable</strong> with acceptable volatility levels. Some fluctuations are present but within normal ranges.</>
            )}
            {stabilityScore.score >= 40 && stabilityScore.score < 60 && (
              <>Your ASO performance shows <strong className={colors.text}>moderate volatility</strong>. Consider investigating drivers of fluctuation to improve predictability.</>
            )}
            {stabilityScore.score >= 20 && stabilityScore.score < 40 && (
              <>Your ASO performance is <strong className={colors.text}>unstable</strong> with significant volatility. Review recent changes and market conditions.</>
            )}
            {stabilityScore.score < 20 && (
              <>Your ASO performance is <strong className={colors.text}>highly volatile</strong>. Immediate investigation recommended to identify root causes.</>
            )}
          </p>
        </div>

        {/* Methodology note */}
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Calculated using Coefficient of Variation across {stabilityScore.dataPoints} days. Lower CV = higher stability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
