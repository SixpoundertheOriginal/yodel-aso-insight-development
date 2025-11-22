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

  const recColors = getRecommendationColors('high');

  if (allRecommendations.length === 0) {
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
      className="relative bg-zinc-900 border-zinc-800 overflow-hidden before:absolute before:inset-0 before:bg-[var(--grid-overlay)] before:opacity-5 before:pointer-events-none" 
      style={{ backgroundSize: '30px 30px' }}
    >
      <CardHeader>
        <CardTitle className={cn(auditSpacing.layout.flex, auditSpacing.layout.flexGap)}>
          <AlertCircle 
            className="h-5 w-5 text-orange-400" 
            style={{ filter: `drop-shadow(${cyberpunkEffects.glow.orange.moderate})` }}
          />
          <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">
            {title || defaultTitle}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn(auditTypography.card.description, "mb-4")}>
          {description || defaultDescription}
        </p>
        <div className={auditSpacing.recommendation.itemGap}>
          {allRecommendations.map((rec, index) => (
            <div
              key={index}
              className={cn(
                "group relative flex items-start",
                auditSpacing.recommendation.numberGap,
                auditSpacing.recommendation.innerPadding,
                "bg-zinc-800/30 rounded-lg border border-zinc-800",
                cyberpunkEffects.transitions.smooth,
                recColors.hoverBorder,
                recColors.hoverBg,
                recColors.hoverShadow,
                cyberpunkEffects.animations.slideInLeft
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              {/* Corner accents */}
              <div className={cn(
                "absolute top-0 right-0 w-2 h-2 border-t border-r border-orange-400/30 opacity-0 group-hover:opacity-100",
                cyberpunkEffects.transitions.smooth
              )} />
              <div className={cn(
                "absolute bottom-0 left-8 w-2 h-2 border-b border-l border-orange-400/30 opacity-0 group-hover:opacity-100",
                cyberpunkEffects.transitions.smooth
              )} />
              
              <div 
                className={cn(
                  "flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full",
                  recColors.number,
                  auditTypography.recommendation.number,
                  cyberpunkEffects.transitions.smooth,
                  "group-hover:bg-orange-400/30 group-hover:scale-110"
                )}
                style={{ 
                  boxShadow: recColors.glow,
                }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <p className={auditTypography.recommendation.title}>{rec}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
