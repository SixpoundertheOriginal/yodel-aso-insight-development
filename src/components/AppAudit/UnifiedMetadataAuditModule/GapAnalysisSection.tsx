/**
 * Gap Analysis Section - Phase 3: Capability Gap Analysis
 *
 * Displays gaps between detected capabilities and metadata presence:
 * - Overall gap score
 * - Prioritized gaps by severity
 * - Vertical benchmark comparison
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Target } from 'lucide-react';
import type { GapAnalysisResult } from '@/types/gapAnalysis';
import { Progress } from '@/components/ui/progress';

interface GapAnalysisSectionProps {
  gapAnalysis: GapAnalysisResult;
  verticalName?: string;
}

export const GapAnalysisSection: React.FC<GapAnalysisSectionProps> = ({
  gapAnalysis,
  verticalName = 'your vertical',
}) => {
  const { overallGapScore, totalGaps, criticalGaps, highGaps, prioritizedGaps } = gapAnalysis;

  // Color coding for gap score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  // Severity badge styling
  const getSeverityBadge = (severity: 'critical' | 'high' | 'moderate' | 'low') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-400/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-400/30';
      case 'moderate':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-400/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/30';
    }
  };

  return (
    <Card className="group relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-200">
          <Target className="h-5 w-5 text-amber-400" />
          🎯 Capability Gap Analysis
        </CardTitle>
        <p className="text-sm text-zinc-400">
          Comparing detected capabilities vs metadata presence for {verticalName}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Gap Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-zinc-200">Overall Gap Score</h3>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(overallGapScore)}`}>
                {overallGapScore}/100
              </div>
              <div className="text-xs text-zinc-500">
                {getScoreLabel(overallGapScore)}
              </div>
            </div>
          </div>
          <Progress value={overallGapScore} className="h-2" />
        </div>

        {/* Gap Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-200">{totalGaps}</div>
            <div className="text-xs text-zinc-500">Total Gaps</div>
          </div>
          <div className="text-center border-x border-zinc-700">
            <div className="text-2xl font-bold text-red-400">{criticalGaps}</div>
            <div className="text-xs text-zinc-500">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{highGaps}</div>
            <div className="text-xs text-zinc-500">High Priority</div>
          </div>
        </div>

        {/* Prioritized Gaps */}
        {prioritizedGaps && prioritizedGaps.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Top Capability Gaps
            </h3>
            <div className="space-y-2">
              {prioritizedGaps.slice(0, 10).map((gap, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700 hover:border-amber-400/50 transition-colors"
                >
                  <Badge variant="outline" className={getSeverityBadge(gap.severity)}>
                    {gap.severity}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-sm text-zinc-200">
                      {gap.capability.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {gap.description}
                    </div>
                    {gap.impactScore && (
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingDown className="h-3 w-3 text-amber-400" />
                        <span className="text-xs text-amber-400">
                          Impact: {gap.impactScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {prioritizedGaps.length > 10 && (
              <p className="text-xs text-zinc-500 text-center">
                + {prioritizedGaps.length - 10} more gaps
              </p>
            )}
          </div>
        )}

        {/* No Gaps Message */}
        {totalGaps === 0 && (
          <div className="p-6 bg-emerald-500/10 border border-emerald-400/30 rounded-lg text-center">
            <div className="text-emerald-400 font-semibold mb-1">
              💎 Perfect Alignment!
            </div>
            <div className="text-sm text-emerald-300">
              All detected capabilities are present in your metadata
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
