/**
 * AUDIT UTILITIES
 *
 * Helper functions for audit scoring, tier calculation, and color application.
 * Centralized logic for consistent behavior across components.
 */

import { auditColors } from '../tokens/auditColors';
import { cyberpunkEffects } from '../tokens/cyberpunkEffects';
import type { ScoreTierColors, KeywordTypeColors, RecommendationPriorityColors } from '../tokens/auditColors';

/**
 * Get human-readable score tier name
 */
export function getScoreTier(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Get score tier colors object
 */
export function getScoreTierColors(score: number): ScoreTierColors {
  if (score >= 80) return auditColors.scoreTier.excellent;
  if (score >= 70) return auditColors.scoreTier.good;
  if (score >= 60) return auditColors.scoreTier.fair;
  return auditColors.scoreTier.poor;
}

/**
 * Get score glow effect (box-shadow value)
 */
export function getScoreGlow(score: number): string {
  if (score >= 80) return cyberpunkEffects.glow.emerald.moderate;
  if (score >= 60) return cyberpunkEffects.glow.yellow.moderate;
  return cyberpunkEffects.glow.red.moderate;
}

/**
 * Get score text glow (text-shadow value)
 */
export function getScoreTextGlow(score: number): string {
  if (score >= 80) return cyberpunkEffects.textGlow.emerald;
  if (score >= 60) return cyberpunkEffects.textGlow.yellow;
  return cyberpunkEffects.textGlow.red;
}

/**
 * Get keyword type colors
 */
export function getKeywordTypeColors(
  type: 'title' | 'subtitle' | 'description' | 'brand' | 'generic' | 'competitor'
): KeywordTypeColors {
  return auditColors.keywordType[type];
}

/**
 * Get recommendation priority colors
 */
export function getRecommendationColors(
  priority: 'high' | 'medium' | 'low' = 'high'
): RecommendationPriorityColors {
  return auditColors.recommendationPriority[priority];
}

/**
 * Get rule state colors
 */
export function getRuleStateColors(passed: boolean) {
  return passed ? auditColors.ruleState.passed : auditColors.ruleState.failed;
}

/**
 * Combine Tailwind classes with proper deduplication
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const auditUtils = {
  getScoreTier,
  getScoreTierColors,
  getScoreGlow,
  getScoreTextGlow,
  getKeywordTypeColors,
  getRecommendationColors,
  getRuleStateColors,
  cn,
};
