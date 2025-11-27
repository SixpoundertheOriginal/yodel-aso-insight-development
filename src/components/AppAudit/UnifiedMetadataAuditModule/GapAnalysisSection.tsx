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
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-600" />
          🎯 Capability Gap Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparing detected capabilities vs metadata presence for {verticalName}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Gap Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Overall Gap Score</h3>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(overallGapScore)}`}>
                {overallGapScore}/100
              </div>
              <div className="text-xs text-muted-foreground">
                {getScoreLabel(overallGapScore)}
              </div>
            </div>
          </div>
          <Progress value={overallGapScore} className="h-2" />
        </div>

        {/* Gap Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalGaps}</div>
            <div className="text-xs text-muted-foreground">Total Gaps</div>
          </div>
          <div className="text-center border-x">
            <div className="text-2xl font-bold text-red-600">{criticalGaps}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{highGaps}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
        </div>

        {/* Prioritized Gaps */}
        {prioritizedGaps && prioritizedGaps.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Top Capability Gaps
            </h3>
            <div className="space-y-2">
              {prioritizedGaps.slice(0, 10).map((gap, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:border-amber-300 transition-colors"
                >
                  <Badge variant="outline" className={getSeverityBadge(gap.severity)}>
                    {gap.severity}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-sm">
                      {gap.capability.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {gap.description}
                    </div>
                    {gap.impactScore && (
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingDown className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-700">
                          Impact: {gap.impactScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {prioritizedGaps.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                + {prioritizedGaps.length - 10} more gaps
              </p>
            )}
          </div>
        )}

        {/* No Gaps Message */}
        {totalGaps === 0 && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-green-700 font-semibold mb-1">
              💎 Perfect Alignment!
            </div>
            <div className="text-sm text-green-600">
              All detected capabilities are present in your metadata
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
