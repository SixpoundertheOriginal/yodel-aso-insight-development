/**
 * Metadata Score Card
 *
 * Shows overall metadata score and breakdown by element.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from './types';

interface MetadataScoreCardProps {
  auditResult: UnifiedMetadataAuditResult;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'border-emerald-400/30 text-emerald-400 bg-emerald-400/10';
  if (score >= 60) return 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10';
  return 'border-red-400/30 text-red-400 bg-red-400/10';
};

const getScoreTier = (score: number): string => {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Improvement';
};

export const MetadataScoreCard: React.FC<MetadataScoreCardProps> = ({ auditResult }) => {
  const { overallScore, elements } = auditResult;

  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-400" />
          Metadata Audit Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex items-center justify-center w-32 h-32 rounded-full border-4 ${getScoreColor(
                overallScore
              )}`}
            >
              <div className="text-center">
                <div className="text-4xl font-bold">{overallScore}</div>
                <div className="text-xs text-zinc-400">/ 100</div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-sm px-3 py-1 ${getScoreColor(overallScore)}`}
            >
              {getScoreTier(overallScore)}
            </Badge>
            <p className="text-xs text-zinc-500 text-center mt-1">
              ASO Ranking Score<br/>(Title + Subtitle)
            </p>
          </div>
        </div>

        {/* ASO Ranking Element Scores */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-3 text-center">ASO Ranking Elements</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-emerald-700/30">
              <div className="text-xs text-zinc-400 uppercase mb-2">Title (65%)</div>
              <Badge
                variant="outline"
                className={`text-xl px-4 py-1 ${getScoreColor(elements.title.score)}`}
              >
                {elements.title.score}
              </Badge>
            </div>

            {/* Subtitle */}
            <div className="flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-emerald-700/30">
              <div className="text-xs text-zinc-400 uppercase mb-2">Subtitle (35%)</div>
              <Badge
                variant="outline"
                className={`text-xl px-4 py-1 ${getScoreColor(elements.subtitle.score)}`}
              >
                {elements.subtitle.score}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description - Conversion Only */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-3 text-center">Conversion Intelligence</p>
          <div className="flex flex-col items-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 opacity-70">
            <div className="text-xs text-zinc-500 uppercase mb-2">Description (0% Ranking)</div>
            <Badge
              variant="outline"
              className="text-xl px-4 py-1 border-zinc-700 text-zinc-400"
            >
              {elements.description.score}
            </Badge>
            <p className="text-xs text-zinc-500 text-center mt-2 max-w-xs">
              Conversion quality only. Does NOT influence App Store ranking.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-zinc-700">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-400">
              {overallScore >= 80 ? (
                <>
                  Your metadata is performing <span className="text-emerald-400 font-medium">excellently</span>.
                  {auditResult.topRecommendations.length > 0 &&
                    ' Minor optimizations available below.'}
                </>
              ) : overallScore >= 60 ? (
                <>
                  Your metadata is performing <span className="text-yellow-400 font-medium">well</span> with
                  room for improvement. Review recommendations below.
                </>
              ) : (
                <>
                  Your metadata has <span className="text-red-400 font-medium">significant optimization
                  opportunities</span>. Prioritize the recommendations below.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
