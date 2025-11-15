import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import type { Attribution } from '@/utils/asoIntelligence';
import { cn } from '@/lib/utils';

interface AnomalyAttributionCardProps {
  anomaly: {
    date: string;
    type: 'spike' | 'drop';
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  };
  attributions: Attribution[];
}

export function AnomalyAttributionCard({ anomaly, attributions }: AnomalyAttributionCardProps) {
  // Handle no attributions case
  if (attributions.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yodel-orange" />
            <CardTitle className="text-lg">Anomaly Attribution</CardTitle>
          </div>
          <CardDescription>Root cause analysis for detected anomalies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <Lightbulb className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm text-center">No anomalies detected</p>
            <p className="text-xs text-zinc-500 mt-2">Performance metrics are within expected ranges</p>
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

  // Anomaly type colors
  const anomalyTypeColors = {
    spike: 'text-green-400',
    drop: 'text-red-400'
  };

  // Category icons mapping
  const categoryLabels: Record<string, string> = {
    metadata: '🔍 Metadata & Keywords',
    creative: '🎨 Creative Assets',
    brand: '🎯 Brand & Marketing',
    algorithm: '⚙️ Algorithm & Platform',
    technical: '🔧 Technical Issue',
    featuring: '⭐ App Store Featuring'
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yodel-orange" />
          <CardTitle className="text-lg">Anomaly Attribution</CardTitle>
        </div>
        <CardDescription>
          <span className={anomalyTypeColors[anomaly.type]}>
            {anomaly.type === 'spike' ? '📈 Spike' : '📉 Drop'}
          </span>
          {' '}on {anomaly.date} • {anomaly.explanation}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Attributions List */}
        {attributions.map((attribution, index) => {
          const colors = confidenceColors[attribution.confidence];

          return (
            <div
              key={`${attribution.category}-${index}`}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                colors.bg,
                colors.border
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-zinc-200">
                      {categoryLabels[attribution.category] || attribution.category}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn('px-2 py-0.5 rounded text-xs font-medium border', colors.badge)}>
                        {attribution.confidence.toUpperCase()} confidence
                      </div>
                      {attribution.relatedMetrics.length > 0 && (
                        <span className="text-xs text-zinc-500">
                          {attribution.relatedMetrics.length} related {attribution.relatedMetrics.length === 1 ? 'metric' : 'metrics'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border border-zinc-700">
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {attribution.message}
                </p>
              </div>

              {/* Related Metrics */}
              {attribution.relatedMetrics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {attribution.relatedMetrics.map((metric) => (
                    <span
                      key={metric}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              )}

              {/* Actionable Insight */}
              {attribution.actionableInsight && (
                <div className="bg-yodel-orange/10 border border-yodel-orange/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-yodel-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-yodel-orange mb-1">Recommended Action</p>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {attribution.actionableInsight}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Methodology note */}
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Attributions ranked by confidence level based on correlated metric changes and pattern matching.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
