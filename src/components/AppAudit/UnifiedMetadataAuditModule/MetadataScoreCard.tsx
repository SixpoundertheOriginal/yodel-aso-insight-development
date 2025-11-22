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
    <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-zinc-700 overflow-hidden before:absolute before:inset-0 before:bg-[var(--scanline-overlay)] before:opacity-20 before:pointer-events-none before:animate-scanline-move">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 relative z-10">
          <Award className="h-5 w-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <span className="bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">
            Metadata Audit Score
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {/* Overall Score */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {/* Outer glow ring */}
              <div className={`absolute inset-0 w-32 h-32 rounded-full blur-xl opacity-40 ${
                overallScore >= 80 ? 'bg-emerald-400' : overallScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              } animate-cyber-pulse`} />
              
              {/* Score circle */}
              <div
                className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 ${getScoreColor(
                  overallScore
                )} transition-all duration-300 hover:scale-105`}
                style={{
                  boxShadow: overallScore >= 80 
                    ? 'var(--cyber-glow-emerald)' 
                    : overallScore >= 60 
                    ? '0 0 15px rgba(251, 191, 36, 0.4)' 
                    : '0 0 15px rgba(239, 68, 68, 0.4)'
                }}
              >
                <div className="text-center animate-counter-up">
                  <div className="text-4xl font-bold font-mono tracking-tight" style={{
                    textShadow: overallScore >= 80 
                      ? '0 0 10px rgba(52, 211, 153, 0.5)' 
                      : overallScore >= 60 
                      ? '0 0 10px rgba(251, 191, 36, 0.5)' 
                      : '0 0 10px rgba(239, 68, 68, 0.5)'
                  }}>{overallScore}</div>
                  <div className="text-xs text-zinc-400">/ 100</div>
                </div>
              </div>
            </div>
            
            <Badge
              variant="outline"
              className={`text-sm px-3 py-1 ${getScoreColor(overallScore)} transition-all duration-300 hover:scale-105 hover:animate-badge-glow`}
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
          <p className="text-xs text-zinc-500 uppercase mb-3 text-center tracking-wider">ASO Ranking Elements</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="group relative flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-emerald-700/30 transition-all duration-300 hover:border-emerald-500/50 hover:bg-zinc-800/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {/* Corner accent */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400/50 rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400/50 rounded-br-lg" />
              
              <div className="text-xs text-zinc-400 uppercase mb-2 tracking-wide">Title (65%)</div>
              <Badge
                variant="outline"
                className={`text-xl px-4 py-1 ${getScoreColor(elements.title.score)} transition-all duration-300 group-hover:scale-110`}
              >
                {elements.title.score}
              </Badge>
            </div>

            {/* Subtitle */}
            <div className="group relative flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-emerald-700/30 transition-all duration-300 hover:border-emerald-500/50 hover:bg-zinc-800/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {/* Corner accent */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400/50 rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400/50 rounded-br-lg" />
              
              <div className="text-xs text-zinc-400 uppercase mb-2 tracking-wide">Subtitle (35%)</div>
              <Badge
                variant="outline"
                className={`text-xl px-4 py-1 ${getScoreColor(elements.subtitle.score)} transition-all duration-300 group-hover:scale-110`}
              >
                {elements.subtitle.score}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description - Conversion Only */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-3 text-center tracking-wider">Conversion Intelligence</p>
          <div className="relative flex flex-col items-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 opacity-70 transition-all duration-300 hover:opacity-90">
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 opacity-10 rounded-lg" style={{
              backgroundImage: 'var(--grid-overlay)',
              backgroundSize: '20px 20px'
            }} />
            
            <div className="text-xs text-zinc-500 uppercase mb-2 tracking-wide relative z-10">Description (0% Ranking)</div>
            <Badge
              variant="outline"
              className="text-xl px-4 py-1 border-zinc-700 text-zinc-400 relative z-10"
            >
              {elements.description.score}
            </Badge>
            <p className="text-xs text-zinc-500 text-center mt-2 max-w-xs relative z-10">
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
