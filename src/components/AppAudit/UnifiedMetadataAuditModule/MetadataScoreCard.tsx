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
import { auditTypography, auditSpacing, cyberpunkEffects } from '@/design-registry';
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
          <div className={cn("flex flex-col items-center", auditSpacing.score.containerGap)}>
            <div className="relative">
              {/* Outer glow ring */}
              <div className={cn(
                "absolute inset-0 w-32 h-32 rounded-full blur-xl opacity-40",
                tierColors.text.replace('text-', 'bg-'),
                cyberpunkEffects.animations.cyberPulse
              )} />
              
              {/* Score circle */}
              <div
                className={cn(
                  "relative flex items-center justify-center w-32 h-32 rounded-full border-4",
                  tierColors.border,
                  tierColors.text,
                  tierColors.bg,
                  cyberpunkEffects.transitions.smooth,
                  cyberpunkEffects.hover.scale
                )}
                style={{ boxShadow: scoreGlow }}
              >
                <div className={cn("text-center", cyberpunkEffects.animations.counterUp)}>
                  <div className={auditTypography.score.hero} style={{ textShadow: textGlow }}>
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
                "px-3 py-1",
                tierColors.badge,
                cyberpunkEffects.transitions.smooth,
                cyberpunkEffects.hover.scale,
                "hover:animate-badge-glow"
              )}
            >
              {tierName}
            </Badge>
            <p className={cn(auditTypography.tier.note, auditSpacing.score.labelMargin)}>
              ASO Ranking Score<br/>(Title + Subtitle)
            </p>
          </div>
        </div>

        {/* ASO Ranking Element Scores */}
        <div>
          <p className={cn(auditTypography.section.label, "text-center", auditSpacing.section.subsectionMargin)}>
            ASO Ranking Elements
          </p>
          <div className={cn(auditSpacing.layout.gridCols2, auditSpacing.score.elementGrid)}>
            {/* Title */}
            <div className={cn(
              "group relative flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-emerald-700/30",
              cyberpunkEffects.transitions.smooth,
              "hover:border-emerald-500/50 hover:bg-zinc-800/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            )}>
              <div className={cn(cyberpunkEffects.cornerAccent.topLeft, cyberpunkEffects.cornerAccent.colors.emerald)} />
              <div className={cn(cyberpunkEffects.cornerAccent.bottomRight, cyberpunkEffects.cornerAccent.colors.emerald)} />
              
              <div className={cn(auditTypography.section.subsection, auditSpacing.score.subsectionMargin)}>
                Title (65%)
              </div>
              <Badge
                variant="outline"
                className={cn(
                  auditTypography.score.small,
                  "px-4 py-1",
                  getScoreTierColors(elements.title.score).badge,
                  cyberpunkEffects.transitions.smooth,
                  "group-hover:scale-110"
                )}
              >
                {elements.title.score}
              </Badge>
            </div>

            {/* Subtitle */}
            <div className={cn(
              "group relative flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-emerald-700/30",
              cyberpunkEffects.transitions.smooth,
              "hover:border-emerald-500/50 hover:bg-zinc-800/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            )}>
              <div className={cn(cyberpunkEffects.cornerAccent.topLeft, cyberpunkEffects.cornerAccent.colors.emerald)} />
              <div className={cn(cyberpunkEffects.cornerAccent.bottomRight, cyberpunkEffects.cornerAccent.colors.emerald)} />
              
              <div className={cn(auditTypography.section.subsection, auditSpacing.score.subsectionMargin)}>
                Subtitle (35%)
              </div>
              <Badge
                variant="outline"
                className={cn(
                  auditTypography.score.small,
                  "px-4 py-1",
                  getScoreTierColors(elements.subtitle.score).badge,
                  cyberpunkEffects.transitions.smooth,
                  "group-hover:scale-110"
                )}
              >
                {elements.subtitle.score}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description - Conversion Only */}
        <div>
          <p className={cn(auditTypography.section.label, "text-center", auditSpacing.section.subsectionMargin)}>
            Conversion Intelligence
          </p>
          <div className={cn(
            "relative flex flex-col items-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 opacity-70",
            cyberpunkEffects.transitions.smooth,
            "hover:opacity-90"
          )}>
            <div 
              className="absolute inset-0 opacity-10 rounded-lg" 
              style={{
                backgroundImage: cyberpunkEffects.overlay.grid,
                backgroundSize: '20px 20px'
              }} 
            />
            
            <div className={cn(auditTypography.section.subsection, auditSpacing.score.subsectionMargin, "relative z-10")}>
              Description (0% Ranking)
            </div>
            <Badge
              variant="outline"
              className={cn(
                auditTypography.score.small,
                "px-4 py-1 border-zinc-700 text-zinc-400 relative z-10"
              )}
            >
              {elements.description.score}
            </Badge>
            <p className={cn(auditTypography.tier.note, "max-w-xs relative z-10", auditSpacing.score.labelMargin)}>
              Conversion quality only. Does NOT influence App Store ranking.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className={auditSpacing.section.dividerMargin}>
          <div className={cn(auditSpacing.layout.flex, "items-start", auditSpacing.layout.flexGap)}>
            <TrendingUp className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className={auditTypography.card.description}>
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
