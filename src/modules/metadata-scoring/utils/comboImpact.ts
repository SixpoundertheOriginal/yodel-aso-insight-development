/**
 * Combo Impact Scoring Utility
 *
 * Deterministic SEO/ASO impact scoring for keyword combinations.
 * Scores range from 0-100 based on semantic value and quality.
 */

import { normalizeComboTokens } from './comboNormalizer';
import {
  classifyByCategoryPresence,
  classifyByBenefitPresence,
  classifyByVerbPresence,
  classifyByFillerRatio,
  classifyByLength
} from './comboClassifier';
import type { ComboImpactScore } from '../types';

/**
 * Calculates impact score for a single combination
 *
 * Scoring Formula:
 * - Base: 50
 * - +30 if contains category keyword
 * - +30 if contains action/verb/benefit keyword
 * - +20 if long-tail (4-word)
 * - +10 if mid-tail (3-word)
 * - -30 if filler ratio > 0.4
 * - -20 if has duplicated tokens within combo
 * - Clamp to 0-100
 *
 * @param combo - Combo string
 * @param categoryKeywords - List of category keywords
 * @param benefitKeywords - List of benefit keywords
 * @param ctaVerbs - List of CTA verbs
 * @param stopwords - Set of stopwords
 * @param allComboTokens - All tokens across all combos (for detecting cross-combo duplicates)
 * @returns ComboImpactScore with breakdown
 */
export function calculateComboImpact(
  combo: string,
  categoryKeywords: string[],
  benefitKeywords: string[],
  ctaVerbs: string[],
  stopwords: Set<string>,
  allComboTokens: string[] = []
): ComboImpactScore {
  const tokens = normalizeComboTokens(combo);

  // Base score
  let score = 50;

  // Category bonus (+30)
  const hasCategory = classifyByCategoryPresence(combo, categoryKeywords);
  const categoryBonus = hasCategory ? 30 : 0;
  score += categoryBonus;

  // Action bonus (+30 if has verb OR benefit)
  const hasVerb = classifyByVerbPresence(combo, ctaVerbs);
  const hasBenefit = classifyByBenefitPresence(combo, benefitKeywords);
  const actionBonus = (hasVerb || hasBenefit) ? 30 : 0;
  score += actionBonus;

  // Length bonus (+20 for long-tail, +10 for mid-tail)
  const length = classifyByLength(combo);
  let lengthBonus = 0;
  if (length === 'long-tail') {
    lengthBonus = 20;
  } else if (length === 'mid-tail') {
    lengthBonus = 10;
  }
  score += lengthBonus;

  // Filler penalty (-30 if filler ratio > 0.4)
  const fillerRatio = classifyByFillerRatio(combo, stopwords);
  const fillerPenalty = fillerRatio > 0.4 ? -30 : 0;
  score += fillerPenalty;

  // Duplication penalty (-20 if has duplicate tokens within combo)
  const tokenSet = new Set(tokens);
  const hasDuplicates = tokenSet.size < tokens.length;
  const duplicationPenalty = hasDuplicates ? -20 : 0;
  score += duplicationPenalty;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    combo,
    score,
    breakdown: {
      categoryBonus,
      actionBonus,
      lengthBonus,
      fillerPenalty,
      duplicationPenalty
    }
  };
}

/**
 * Calculates average impact score across multiple combos
 *
 * @param impactScores - Array of ComboImpactScore objects
 * @returns Average score (0-100), or 0 if no scores
 */
export function calculateAvgImpact(impactScores: ComboImpactScore[]): number {
  if (!impactScores || impactScores.length === 0) {
    return 0;
  }

  const total = impactScores.reduce((sum, score) => sum + score.score, 0);
  return Math.round(total / impactScores.length);
}

/**
 * Calculates average impact from an array of numeric scores
 *
 * @param scores - Array of impact scores (0-100)
 * @returns Average score, or 0 if no scores
 */
export function calculateAvgImpactFromScores(scores: number[]): number {
  if (!scores || scores.length === 0) {
    return 0;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round(total / scores.length);
}
