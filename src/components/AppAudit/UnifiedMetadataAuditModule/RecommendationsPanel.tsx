/**
 * Recommendations Panel
 *
 * Displays top recommendations prioritized by impact.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from './types';

interface RecommendationsPanelProps {
  recommendations: string[];
  type?: 'ranking' | 'conversion';
  title?: string;
  description?: string;
  comboCoverage?: UnifiedMetadataAuditResult['comboCoverage'];  // Optional for combo-based insights
  intentRecommendations?: string[];  // Optional intent-based recommendations (Phase 4)
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  type = 'ranking',
  title,
  description,
  comboCoverage,
  intentRecommendations = [],
}) => {
  // Generate combo-based recommendations for ranking type
  const comboRecommendations = useMemo(() => {
    if (type !== 'ranking' || !comboCoverage) return [];

    const comboRecs: string[] = [];

    // Get counts
    const allCombos = [
      ...(comboCoverage.titleCombosClassified || []),
      ...(comboCoverage.subtitleNewCombosClassified || [])
    ];
    const brandedCount = allCombos.filter(c => c.type === 'branded').length;
    const genericCount = allCombos.filter(c => c.type === 'generic').length;
    const lowValueCount = (comboCoverage.lowValueCombos || []).length;

    // Scenario 1: Branded >> Generic (too brand-focused)
    if (brandedCount >= 4 && genericCount <= 2) {
      comboRecs.push(
        "[RANKING] Strong branded coverage but limited generic discovery combos. Consider adding more generic phrases (e.g. 'learn spanish', 'language lessons', 'speak french') to reach non-brand-aware users."
      );
    }

    // Scenario 2: Very few generic combos overall
    if (genericCount <= 3 && genericCount > 0) {
      comboRecs.push(
        "[RANKING] Only a few generic discovery combos detected. Adding more non-branded phrases in title/subtitle can unlock additional search volume."
      );
    }

    // Scenario 3: Low-value combos dominate
    if (lowValueCount >= genericCount && lowValueCount > 0) {
      comboRecs.push(
        "[RANKING] A significant share of your combinations are numeric or time-based (e.g. 'in 30 days'). These have limited impact on search. Consider refocusing on intent-driven phrases such as 'learn spanish', 'language lessons', 'speak fluently'."
      );
    }

    return comboRecs;
  }, [type, comboCoverage]);

  // Merge original recommendations with combo and intent recommendations
  const allRecommendations = useMemo(() => {
    // For ranking type: merge intent recommendations as well
    if (type === 'ranking') {
      return [...recommendations, ...comboRecommendations, ...intentRecommendations];
    }
    // For conversion type: only merge combo recommendations (intent is ranking-specific)
    return [...recommendations, ...comboRecommendations];
  }, [recommendations, comboRecommendations, intentRecommendations, type]);

  const defaultTitle = type === 'ranking' ? 'ASO Ranking Recommendations' : 'Conversion Recommendations';
  const defaultDescription = type === 'ranking'
    ? 'Prioritized by impact - addressing these will improve your App Store search ranking.'
    : 'Optional optimizations to improve conversion quality and user engagement.';

  const emptyMessage = type === 'ranking'
    ? 'No critical ranking issues detected. Your title and subtitle are performing well.'
    : 'No critical conversion issues detected. Your description quality is good.';

  if (allRecommendations.length === 0) {
    return (
      <Card className="bg-emerald-900/10 border-emerald-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            No Critical Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-400" />
          {title || defaultTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-400 mb-4">
          {description || defaultDescription}
        </p>
        <div className="space-y-3">
          {allRecommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-400/20 text-orange-400 text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{rec}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
