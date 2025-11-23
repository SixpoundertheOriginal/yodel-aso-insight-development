/**
 * Recommendations Panel
 *
 * Displays top recommendations prioritized by impact.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn, getRecommendationColors, auditTypography, auditSpacing, cyberpunkEffects } from '@/design-registry';
import type { UnifiedMetadataAuditResult } from './types';
import { RecommendationCard } from './RecommendationCard';
import { parseRecommendation, deduplicateRecommendations, sortRecommendationsBySeverity } from './utils';

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

  // Merge, deduplicate, and sort recommendations
  const processedRecommendations = useMemo(() => {
    // Merge all sources
    const merged = type === 'ranking'
      ? [...recommendations, ...comboRecommendations, ...intentRecommendations]
      : [...recommendations, ...comboRecommendations];

    // Deduplicate based on normalized message
    const deduped = deduplicateRecommendations(merged);

    // Sort by severity (critical first)
    const sorted = sortRecommendationsBySeverity(deduped);

    return sorted;
  }, [recommendations, comboRecommendations, intentRecommendations, type]);

  const defaultTitle = type === 'ranking' ? 'ASO Ranking Recommendations' : 'Conversion Recommendations';
  const defaultDescription = type === 'ranking'
    ? 'Prioritized by impact - addressing these will improve your App Store search ranking.'
    : 'Optional optimizations to improve conversion quality and user engagement.';

  const emptyMessage = type === 'ranking'
    ? 'No critical ranking issues detected. Your title and subtitle are performing well.'
    : 'No critical conversion issues detected. Your description quality is good.';

  const recColors = getRecommendationColors('high');

  if (processedRecommendations.length === 0) {
    return (
      <Card className="bg-emerald-900/10 border-emerald-400/30">
        <CardHeader>
          <CardTitle className={cn(auditSpacing.layout.flex, auditSpacing.layout.flexGap, "text-emerald-400")}>
            <CheckCircle2 className="h-5 w-5" />
            No Critical Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={auditTypography.card.description}>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="relative bg-black/40 border border-zinc-800/50 rounded-xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <AlertCircle
            className="h-4 w-4 text-orange-400"
            style={{ filter: `drop-shadow(0 0 8px rgba(251, 146, 60, 0.4))` }}
          />
          <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">
            {title || defaultTitle}
          </span>
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          {description || defaultDescription}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedRecommendations.map((rec, index) => {
            const parsed = parseRecommendation(rec);
            return (
              <RecommendationCard
                key={index}
                category={parsed.category}
                severity={parsed.severity}
                message={parsed.message}
                index={index}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
