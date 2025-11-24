/**
 * Competitor Comparison Dashboard
 *
 * Main dashboard showing comparison results across all 7 dimensions:
 * 1. KPI Comparison
 * 2. Intent Gap Analysis
 * 3. Combo Gap Analysis
 * 4. Keyword Opportunities
 * 5. Discovery Footprint
 * 6. Character Usage
 * 7. Brand Strength
 *
 * Plus Summary and Recommendations
 *
 * @module components/CompetitorAnalysis/CompetitorComparisonDashboard
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Zap,
  AlertTriangle,
  BarChart3,
  Copy,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CompetitorComparisonResult } from '@/services/competitor-comparison.service';
import { toast } from 'sonner';

interface CompetitorComparisonDashboardProps {
  comparison: CompetitorComparisonResult;
  targetAppName: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const CompetitorComparisonDashboard: React.FC<CompetitorComparisonDashboardProps> = ({
  comparison,
  targetAppName,
  onRefresh,
  refreshing = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'recommendations', 'kpi'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getPositionBadge = (position: 'leading' | 'competitive' | 'behind') => {
    const config = {
      leading: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: TrendingUp },
      competitive: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Minus },
      behind: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: TrendingDown },
    };
    const { color, icon: Icon } = config[position];
    return (
      <Badge variant="outline" className={`${color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {position.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };
    return (
      <Badge variant="outline" className={`${colors[priority]} text-xs`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getGapIndicator = (gap: number, reverseColor: boolean = false) => {
    const isPositive = gap > 0;
    const color = reverseColor
      ? isPositive
        ? 'text-red-400'
        : 'text-emerald-400'
      : isPositive
      ? 'text-emerald-400'
      : 'text-red-400';

    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{isPositive ? '+' : ''}{gap.toFixed(1)}</span>
      </div>
    );
  };

  const handleCopyRecommendation = (rec: any) => {
    const text = `${rec.action}\n\nReason: ${rec.reasoning}\nExpected Impact: ${rec.expectedImpact}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied recommendation to clipboard');
  };

  const handleExport = () => {
    // TODO: Implement export to CSV/PDF
    toast.info('Export feature coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Competitive Analysis</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Comparing {targetAppName} against {comparison.competitorIds.length} competitor
            {comparison.competitorIds.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border-violet-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-violet-300 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Position
            </CardTitle>
            {getPositionBadge(comparison.summary.overallPosition)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strengths */}
          {comparison.summary.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-400 mb-2">✅ STRENGTHS</p>
              <ul className="space-y-1">
                {comparison.summary.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {comparison.summary.weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-400 mb-2">⚠️ AREAS TO IMPROVE</p>
              <ul className="space-y-1">
                {comparison.summary.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Wins */}
          {comparison.summary.quickWins.length > 0 && (
            <div className="p-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
              <p className="text-xs font-medium text-violet-300 mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                QUICK WINS
              </p>
              <ul className="space-y-1">
                {comparison.summary.quickWins.map((win, idx) => (
                  <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-violet-400 mt-1">→</span>
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection('recommendations')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-zinc-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-violet-400" />
              Recommendations ({comparison.recommendations.length})
            </CardTitle>
            {expandedSections.has('recommendations') ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has('recommendations') && (
          <CardContent className="space-y-3">
            {comparison.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(rec.priority)}
                      <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                        {rec.category.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                        {rec.implementationDifficulty} to implement
                      </Badge>
                    </div>

                    {/* Action */}
                    <p className="text-sm font-medium text-zinc-100">{rec.action}</p>

                    {/* Reasoning */}
                    <p className="text-xs text-zinc-400">{rec.reasoning}</p>

                    {/* Expected Impact */}
                    <div className="flex items-start gap-2 p-2 bg-emerald-900/10 rounded border border-emerald-500/20">
                      <TrendingUp className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-emerald-400">{rec.expectedImpact}</p>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyRecommendation(rec)}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* KPI Comparison */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection('kpi')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-zinc-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-400" />
              KPI Comparison
            </CardTitle>
            {expandedSections.has('kpi') ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has('kpi') && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overall Score */}
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-400">Overall Score</p>
                  {getGapIndicator(comparison.kpiComparison.gaps.overallScoreGap)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-violet-400">
                    {comparison.kpiComparison.target.overallScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    vs {comparison.kpiComparison.averageCompetitor.overallScore.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Title Score */}
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-400">Title Score</p>
                  {getGapIndicator(comparison.kpiComparison.gaps.titleScoreGap)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-400">
                    {comparison.kpiComparison.target.titleScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    vs {comparison.kpiComparison.averageCompetitor.titleScore.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Subtitle Score */}
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-400">Subtitle Score</p>
                  {getGapIndicator(comparison.kpiComparison.gaps.subtitleScoreGap)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">
                    {comparison.kpiComparison.target.subtitleScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    vs {comparison.kpiComparison.averageCompetitor.subtitleScore.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Description Score */}
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-400">Description Score</p>
                  {getGapIndicator(comparison.kpiComparison.gaps.descriptionScoreGap)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-400">
                    {comparison.kpiComparison.target.descriptionScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    vs {comparison.kpiComparison.averageCompetitor.descriptionScore.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Win/Loss Summary */}
            <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{comparison.kpiComparison.wins}</p>
                <p className="text-xs text-zinc-500">Wins</p>
              </div>
              <div className="h-8 w-px bg-zinc-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{comparison.kpiComparison.losses}</p>
                <p className="text-xs text-zinc-500">Losses</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Intent Gap Analysis */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection('intent')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-zinc-300">
              Intent Gap Analysis
            </CardTitle>
            {expandedSections.has('intent') ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has('intent') && (
          <CardContent className="space-y-4">
            {/* Intent Bars */}
            <div className="space-y-3">
              {(['informational', 'commercial', 'transactional', 'navigational'] as const).map((intent) => {
                const targetValue = comparison.intentGap.target[intent];
                const competitorValue = comparison.intentGap.averageCompetitor[intent];
                const gap = comparison.intentGap.gaps[intent];

                return (
                  <div key={intent}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-zinc-400 capitalize">{intent}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">
                          {targetValue.toFixed(0)}% vs {competitorValue.toFixed(0)}%
                        </span>
                        {getGapIndicator(gap)}
                      </div>
                    </div>
                    <div className="flex gap-2 h-2">
                      <div
                        className="bg-violet-500 rounded"
                        style={{ width: `${targetValue}%` }}
                      />
                      <div
                        className="bg-zinc-600 rounded"
                        style={{ width: `${competitorValue}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insights */}
            {comparison.intentGap.insights.length > 0 && (
              <div className="p-3 bg-violet-900/10 rounded-lg border border-violet-500/20">
                <p className="text-xs font-medium text-violet-400 mb-2">INSIGHTS</p>
                <ul className="space-y-1">
                  {comparison.intentGap.insights.map((insight, idx) => (
                    <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Combo Gap Analysis */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection('combos')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-zinc-300">
              Combo Opportunities ({comparison.comboGap.missingOpportunities.length})
            </CardTitle>
            {expandedSections.has('combos') ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has('combos') && (
          <CardContent className="space-y-3">
            {comparison.comboGap.missingOpportunities.slice(0, 10).map((opp, idx) => (
              <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-zinc-100">{opp.combo}</p>
                      <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                        {opp.strategicValue.toFixed(0)}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{opp.recommendation}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {opp.competitorNames.map((name, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                    {opp.usedByCompetitors}/{comparison.competitorIds.length}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Keyword Opportunities */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection('keywords')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-zinc-300">
              Keyword Opportunities ({comparison.keywordOpportunities.topOpportunities.length})
            </CardTitle>
            {expandedSections.has('keywords') ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has('keywords') && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {comparison.keywordOpportunities.topOpportunities.map((kw, idx) => {
                const colors = {
                  high: 'border-red-500/30 text-red-400 bg-red-500/10',
                  medium: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
                  low: 'border-zinc-600 text-zinc-400 bg-zinc-800/30',
                };
                return (
                  <div key={idx} className={`px-3 py-2 rounded-lg border ${colors[kw.impact]}`}>
                    <p className="text-sm font-medium">{kw.keyword}</p>
                    <p className="text-xs opacity-75">{kw.reason}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
