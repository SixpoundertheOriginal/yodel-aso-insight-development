/**
 * Metadata Score Card
 *
 * Shows overall metadata score and breakdown by element.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award } from 'lucide-react';
import { 
  getScoreTier, 
  getScoreTierColors, 
  getScoreGlow, 
  getScoreTextGlow,
  cn
} from '@/design-registry';
import { auditTypography, auditSpacing, tacticalEffects } from '@/design-registry';
import type { UnifiedMetadataAuditResult } from './types';

interface MetadataScoreCardProps {
  auditResult: UnifiedMetadataAuditResult;
}

export const MetadataScoreCard: React.FC<MetadataScoreCardProps> = ({ auditResult }) => {
  const { overallScore, elements } = auditResult;
  
  // Get score-based colors and effects
  const tierColors = getScoreTierColors(overallScore);
  const scoreGlow = getScoreGlow(overallScore);
  const textGlow = getScoreTextGlow(overallScore);
  const tierName = getScoreTier(overallScore);

  return (
    <Card className={cn(
      "relative overflow-hidden",
      tacticalEffects.glassPanel.medium,
      tacticalEffects.gridOverlay.className,
      tacticalEffects.transitions.smooth
    )}>
      {/* L-shaped corner brackets */}
      <div className={cn(
        tacticalEffects.cornerBracket.topLeft,
        tacticalEffects.cornerBracket.colors.orange,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.topRight,
        tacticalEffects.cornerBracket.colors.orange,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomLeft,
        tacticalEffects.cornerBracket.colors.orange,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomRight,
        tacticalEffects.cornerBracket.colors.orange,
        tacticalEffects.cornerBracket.animated
      )} />

      <CardHeader>
        <CardTitle className={cn(
          "flex items-center gap-2 relative z-10",
          auditTypography.section.main
        )}>
          <Award className="h-5 w-5 text-orange-400" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))' }} />
          <span>Metadata Audit Score</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {/* Overall Score with Orbital Rings */}
        <div className="flex items-center justify-center py-6">
          <div className={cn("flex flex-col items-center", auditSpacing.score.containerGap)}>
            <div className="relative w-40 h-40">
              {/* Orbital rings (rotating) */}
              <div className={tacticalEffects.orbitalRing.outer} />
              <div className={tacticalEffects.orbitalRing.middle} />
              <div className={tacticalEffects.orbitalRing.inner} />
              
              {/* Score circle with hexagonal frame effect */}
              <div
                className={cn(
                  "absolute inset-6 flex items-center justify-center rounded-full border-2",
                  tierColors.border,
                  tierColors.bg,
                  tacticalEffects.transitions.smooth
                )}
                style={{ 
                  boxShadow: scoreGlow,
                  background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)'
                }}
              >
                <div className="text-center">
                  <div className={cn(auditTypography.score.hero, tierColors.text)} style={{ textShadow: textGlow }}>
                    {overallScore}
                  </div>
                  <div className={auditTypography.score.label}>/ 100</div>
                </div>
              </div>
            </div>
            
            <Badge
              variant="outline"
              className={cn(
                auditTypography.tier.badge,
                "px-4 py-1.5 mt-2",
                tierColors.badge,
                tacticalEffects.transitions.smooth,
                "hover:scale-105"
              )}
            >
              {tierName}
            </Badge>
            <p className={cn(auditTypography.tier.note, "mt-2")}>
              ASO Ranking Score (Title + Subtitle)
            </p>
          </div>
        </div>

        {/* ASO Ranking Element Scores */}
        <div className="pt-4 border-t border-zinc-800/50">
          <p className={cn(auditTypography.section.label, "text-center mb-4")}>
            ASO Ranking Elements
          </p>
          <div className={cn(auditSpacing.layout.gridCols2, auditSpacing.score.elementGrid)}>
            {/* Title */}
            <div className={cn(
              "group relative flex flex-col items-center p-4 rounded border",
              tacticalEffects.glassPanel.light,
              tacticalEffects.transitions.smooth,
              "hover:border-emerald-500/50",
              "border-emerald-700/40"
            )}
              style={{ boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)' }}
            >
              {/* L-brackets */}
              <div className={cn(tacticalEffects.cornerBracket.topLeft, tacticalEffects.cornerBracket.colors.emerald, "w-4 h-4 opacity-60 group-hover:opacity-100", tacticalEffects.transitions.bracket)} />
              <div className={cn(tacticalEffects.cornerBracket.bottomRight, tacticalEffects.cornerBracket.colors.emerald, "w-4 h-4 opacity-60 group-hover:opacity-100", tacticalEffects.transitions.bracket)} />
              
              <div className={cn(auditTypography.section.subsection, "mb-3")}>
                Title (65%)
              </div>
              <Badge
                variant="outline"
                className={cn(
                  auditTypography.score.small,
                  "px-4 py-1.5",
                  getScoreTierColors(elements.title.score).badge,
                  tacticalEffects.transitions.smooth,
                  "group-hover:scale-105"
                )}
              >
                {elements.title.score}
              </Badge>
            </div>

            {/* Subtitle */}
            <div className={cn(
              "group relative flex flex-col items-center p-4 rounded border",
              tacticalEffects.glassPanel.light,
              tacticalEffects.transitions.smooth,
              "hover:border-emerald-500/50",
              "border-emerald-700/40"
            )}
              style={{ boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)' }}
            >
              {/* L-brackets */}
              <div className={cn(tacticalEffects.cornerBracket.topLeft, tacticalEffects.cornerBracket.colors.emerald, "w-4 h-4 opacity-60 group-hover:opacity-100", tacticalEffects.transitions.bracket)} />
              <div className={cn(tacticalEffects.cornerBracket.bottomRight, tacticalEffects.cornerBracket.colors.emerald, "w-4 h-4 opacity-60 group-hover:opacity-100", tacticalEffects.transitions.bracket)} />
              
              <div className={cn(auditTypography.section.subsection, "mb-3")}>
                Subtitle (35%)
              </div>
              <Badge
                variant="outline"
                className={cn(
                  auditTypography.score.small,
                  "px-4 py-1.5",
                  getScoreTierColors(elements.subtitle.score).badge,
                  tacticalEffects.transitions.smooth,
                  "group-hover:scale-105"
                )}
              >
                {elements.subtitle.score}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description - Conversion Only */}
        <div className="pt-4 border-t border-zinc-800/50">
          <p className={cn(auditTypography.section.label, "text-center mb-4")}>
            Conversion Intelligence
          </p>
          <div className={cn(
            "relative flex flex-col items-center p-4 rounded border border-zinc-700/40 opacity-75",
            tacticalEffects.glassPanel.heavy,
            tacticalEffects.transitions.smooth,
            "hover:opacity-90"
          )}>
            
            <div className={cn(auditTypography.section.subsection, "mb-3 relative z-10")}>
              Description (0% Ranking)
            </div>
            <Badge
              variant="outline"
              className={cn(
                auditTypography.score.small,
                "px-4 py-1.5 border-zinc-700 text-zinc-400 relative z-10"
              )}
            >
              {elements.description.score}
            </Badge>
            <p className={cn(auditTypography.tier.note, "max-w-xs relative z-10 mt-2")}>
              Conversion quality only. Does NOT influence App Store ranking.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-zinc-800/50">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.4))' }} />
            <p className="text-sm text-zinc-400 font-light leading-relaxed">
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
