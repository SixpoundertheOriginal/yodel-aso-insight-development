/**
 * Competitor Comparison Summary
 *
 * High-level overview showing competitive strength across KPI dimensions.
 * Displays at the top of the Comparison tab before the detailed table.
 *
 * Features:
 * - Radar chart comparing all apps across 6 key dimensions
 * - Strength badges showing best/worst performers per dimension
 * - Gap analysis highlights
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { UnifiedMetadataAuditResult } from '../AppAudit/UnifiedMetadataAuditModule/types';

interface CompetitorApp {
  id: string;
  name: string;
  audit: UnifiedMetadataAuditResult;
  isBaseline?: boolean;
}

interface CompetitorComparisonSummaryProps {
  baselineApp: CompetitorApp;
  competitorApps: CompetitorApp[];
}

interface DimensionScore {
  dimension: string;
  [key: string]: string | number; // Dynamic keys for each app
}

interface DimensionLeader {
  dimension: string;
  leader: string;
  leaderId: string;
  score: number;
  gap: number; // Gap from baseline
  isBaselineLeader: boolean;
}

/**
 * Extract 6 key dimensions from audit result
 */
const extractDimensions = (audit: UnifiedMetadataAuditResult) => {
  const titleIntentScore = audit.intentCoverage?.title?.score || 0;
  const subtitleIntentScore = audit.intentCoverage?.subtitle?.score || 0;

  // Safe access with fallbacks
  const titleKeywordsLength = audit.keywordCoverage?.titleKeywords?.length || 0;
  const subtitleKeywordsLength = audit.keywordCoverage?.subtitleNewKeywords?.length || 0;
  const allCombosLength = audit.comboCoverage?.allCombos?.length || 0;

  return {
    'Overall': audit.overallScore || 0,
    'Title': audit.elements?.title?.score || 0,
    'Subtitle': audit.elements?.subtitle?.score || 0,
    'Coverage': Math.round((titleKeywordsLength + subtitleKeywordsLength) / 30 * 100),
    'Combos': Math.round((allCombosLength / 50) * 100),
    'Intent': Math.round((titleIntentScore + subtitleIntentScore) / 2),
  };
};

/**
 * Get color for radar line based on app
 */
const getAppColor = (appId: string, isBaseline: boolean): string => {
  if (isBaseline) return '#10b981'; // emerald-500 for your app

  const colors = [
    '#8b5cf6', // violet-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#84cc16', // lime-500
    '#a855f7', // purple-500
    '#14b8a6', // teal-500
  ];

  return colors[Math.abs(hashCode(appId)) % colors.length];
};

// Simple hash function for consistent color assignment
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

export const CompetitorComparisonSummary: React.FC<CompetitorComparisonSummaryProps> = ({
  baselineApp,
  competitorApps,
}) => {
  const allApps = [baselineApp, ...competitorApps];

  // Build radar chart data
  const radarData: DimensionScore[] = useMemo(() => {
    const dimensions = ['Overall', 'Title', 'Subtitle', 'Coverage', 'Combos', 'Intent'];

    return dimensions.map((dimension) => {
      const dataPoint: DimensionScore = { dimension };

      allApps.forEach((app) => {
        const scores = extractDimensions(app.audit);
        dataPoint[app.name] = scores[dimension as keyof typeof scores];
      });

      return dataPoint;
    });
  }, [allApps]);

  // Find dimension leaders
  const dimensionLeaders: DimensionLeader[] = useMemo(() => {
    const dimensions = ['Overall', 'Title', 'Subtitle', 'Coverage', 'Combos', 'Intent'];

    return dimensions.map((dimension) => {
      let leader = allApps[0];
      let bestScore = extractDimensions(allApps[0].audit)[dimension as keyof ReturnType<typeof extractDimensions>];

      allApps.forEach((app) => {
        const score = extractDimensions(app.audit)[dimension as keyof ReturnType<typeof extractDimensions>];
        if (score > bestScore) {
          bestScore = score;
          leader = app;
        }
      });

      const baselineScore = extractDimensions(baselineApp.audit)[dimension as keyof ReturnType<typeof extractDimensions>];
      const gap = bestScore - baselineScore;

      return {
        dimension,
        leader: leader.name,
        leaderId: leader.id,
        score: bestScore,
        gap: Math.round(gap),
        isBaselineLeader: leader.id === baselineApp.id,
      };
    });
  }, [allApps, baselineApp]);

  // Count wins/losses
  const baselineWins = dimensionLeaders.filter((d) => d.isBaselineLeader).length;
  const competitorWins = dimensionLeaders.length - baselineWins;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card className="bg-zinc-950/80 border-zinc-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Baseline Wins */}
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{baselineWins}</div>
              <div className="text-sm text-zinc-400 mt-1">Dimensions You Lead</div>
            </div>

            {/* Competitor Wins */}
            <div className="text-center">
              <div className="text-3xl font-bold text-violet-400">{competitorWins}</div>
              <div className="text-sm text-zinc-400 mt-1">Dimensions Competitors Lead</div>
            </div>

            {/* Total Apps */}
            <div className="text-center">
              <div className="text-3xl font-bold text-zinc-300">{allApps.length}</div>
              <div className="text-sm text-zinc-400 mt-1">Total Apps Compared</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <Card className="bg-zinc-950/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-400" />
              Competitive Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                />
                {allApps.map((app) => (
                  <Radar
                    key={app.id}
                    name={app.name}
                    dataKey={app.name}
                    stroke={getAppColor(app.id, app.isBaseline || false)}
                    fill={getAppColor(app.id, app.isBaseline || false)}
                    fillOpacity={app.isBaseline ? 0.3 : 0.1}
                    strokeWidth={app.isBaseline ? 2 : 1}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dimension Leaders */}
        <Card className="bg-zinc-950/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Dimension Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dimensionLeaders.map((leader) => (
                <div
                  key={leader.dimension}
                  className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medium text-zinc-400 w-20">
                      {leader.dimension}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        leader.isBaselineLeader
                          ? 'border-emerald-500/40 text-emerald-400'
                          : 'border-violet-500/40 text-violet-400'
                      )}
                    >
                      {leader.leader}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-zinc-300">
                      {leader.score}
                    </span>
                    {!leader.isBaselineLeader && leader.gap > 0 && (
                      <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">
                        -{leader.gap}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap Analysis Alert */}
      {competitorWins > baselineWins && (
        <Card className="bg-orange-900/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-orange-400 mb-1">
                  Competitive Gap Detected
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed">
                  Competitors are leading in {competitorWins} out of {dimensionLeaders.length} key dimensions.
                  Review the detailed comparison table below to identify optimization opportunities.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
