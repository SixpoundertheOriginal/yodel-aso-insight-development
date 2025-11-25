/**
 * LLM Visibility Score Card
 *
 * Shows overall LLM visibility score and 6 sub-scores with orbital rings effect.
 * Follows MetadataScoreCard design patterns.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, BookOpen, FileText, MessageSquare, Shield } from 'lucide-react';
import {
  getScoreTier,
  getScoreTierColors,
  getScoreGlow,
  getScoreTextGlow,
  cn,
  auditTypography,
  tacticalEffects,
} from '@/design-registry';
import type { LLMVisibilityAnalysis } from '@/engine/llmVisibility/llmVisibility.types';

interface LLMVisibilityScoreCardProps {
  analysis: LLMVisibilityAnalysis;
}

export const LLMVisibilityScoreCard: React.FC<LLMVisibilityScoreCardProps> = ({ analysis }) => {
  const { score } = analysis;

  // Get score-based colors and effects
  const tierColors = getScoreTierColors(score.overall);
  const scoreGlow = getScoreGlow(score.overall);
  const textGlow = getScoreTextGlow(score.overall);
  const tierName = getScoreTier(score.overall);

  const subScores = [
    {
      id: 'factual',
      label: 'Factual Grounding',
      score: score.factual_grounding,
      icon: Target,
      description: 'Concrete, verifiable facts',
      weight: 25,
    },
    {
      id: 'clusters',
      label: 'Semantic Coverage',
      score: score.semantic_clusters,
      icon: BookOpen,
      description: 'Topic & keyword coverage',
      weight: 25,
    },
    {
      id: 'structure',
      label: 'Structure & Readability',
      score: score.structure_readability,
      icon: FileText,
      description: 'LLM-friendly formatting',
      weight: 15,
    },
    {
      id: 'intent',
      label: 'Intent Coverage',
      score: score.intent_coverage,
      icon: MessageSquare,
      description: 'Matches user queries',
      weight: 15,
    },
    {
      id: 'snippets',
      label: 'Snippet Quality',
      score: score.snippet_quality,
      icon: Brain,
      description: 'Quotable text segments',
      weight: 10,
    },
    {
      id: 'safety',
      label: 'Safety & Credibility',
      score: score.safety_credibility,
      icon: Shield,
      description: 'Avoids risky claims',
      weight: 10,
    },
  ];

  return (
    <Card className={cn(
      "relative overflow-hidden",
      tacticalEffects.glassPanel.medium,
      tacticalEffects.gridOverlay.className,
      tacticalEffects.transitions.smooth
    )}>
      {/* Corner brackets */}
      <div className={cn(
        tacticalEffects.cornerBracket.topLeft,
        tacticalEffects.cornerBracket.colors.cyan,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.topRight,
        tacticalEffects.cornerBracket.colors.cyan,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomLeft,
        tacticalEffects.cornerBracket.colors.cyan,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomRight,
        tacticalEffects.cornerBracket.colors.cyan,
        tacticalEffects.cornerBracket.animated
      )} />

      <CardHeader>
        <CardTitle className={cn(
          "flex items-center gap-2 relative z-10",
          auditTypography.section.main
        )}>
          <Brain className="h-5 w-5 text-cyan-400" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }} />
          <span>LLM Visibility Score</span>
          <Badge
            variant="outline"
            className="ml-2 text-xs font-normal border-cyan-500/30 text-cyan-300"
          >
            v{score.rules_version}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {/* Overall Score with Orbital Rings */}
        <div className="flex items-center justify-center py-6">
          <div className="relative">
            {/* Orbital rings */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-20"
              style={{
                background: `radial-gradient(circle, ${tierColors.ring} 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                boxShadow: scoreGlow,
              }}
            />

            {/* Score container */}
            <div className={cn(
              "relative flex flex-col items-center justify-center",
              "w-40 h-40 rounded-full",
              "border-4",
              "bg-gradient-to-br from-zinc-900/90 to-zinc-950/90",
              "backdrop-blur-sm"
            )}
            style={{
              borderColor: tierColors.ring,
              boxShadow: `0 0 40px ${tierColors.ring}40`,
            }}
            >
              <div
                className={cn(
                  "text-6xl font-bold tracking-tight mb-1",
                  tierColors.text
                )}
                style={{ textShadow: textGlow }}
              >
                {Math.round(score.overall)}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {tierName}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Your app description scores <strong className={tierColors.text}>{Math.round(score.overall)}/100</strong> for
            LLM discoverability. When users ask ChatGPT, Claude, or Perplexity for app recommendations,
            this score reflects how likely your app is to be retrieved and quoted.
          </p>
        </div>

        {/* Sub-scores Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/50">
          {subScores.map((item) => {
            const Icon = item.icon;
            const itemTierColors = getScoreTierColors(item.score);
            const itemTierName = getScoreTier(item.score);

            return (
              <div
                key={item.id}
                className={cn(
                  "relative p-4 rounded-lg",
                  "border border-zinc-800/50",
                  "bg-zinc-950/30",
                  "hover:bg-zinc-900/40",
                  "transition-all duration-200",
                  "group"
                )}
              >
                {/* Score badge */}
                <div className="flex items-start justify-between mb-3">
                  <Icon className="h-4 w-4 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        itemTierColors.text
                      )}
                    >
                      {Math.round(item.score)}
                    </span>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      {itemTierName}
                    </span>
                  </div>
                </div>

                {/* Label */}
                <div>
                  <div className="text-xs font-medium text-zinc-300 mb-1 flex items-center gap-2">
                    {item.label}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-700/50 text-zinc-500">
                      {item.weight}%
                    </Badge>
                  </div>
                  <div className="text-[11px] text-zinc-500 leading-tight">
                    {item.description}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      itemTierColors.bg
                    )}
                    style={{
                      width: `${item.score}%`,
                      boxShadow: `0 0 8px ${itemTierColors.ring}60`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-zinc-600 pt-4 border-t border-zinc-800/30">
          Analyzed with rule-based engine • No LLM API calls • Deterministic results
        </div>
      </CardContent>
    </Card>
  );
};
