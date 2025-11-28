/**
 * Combo Priority Scorer
 *
 * Implements the approved V2.1 priority scoring formula:
 *
 * priority_score = (
 *   semantic_relevance * 0.30 +
 *   length_score * 0.25 +
 *   brand_hybrid_bonus * 0.20 +
 *   novelty_score * 0.15 +
 *   (100 - noise_confidence) * 0.10
 * )
 *
 * **Performance Budget:** +50ms for all combos
 */

import type {
  ClassifiedCombo,
  BrandClassification,
} from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type {
  PriorityScoreFactors,
  ClassifiedComboV2_1,
} from '@/components/AppAudit/UnifiedMetadataAuditModule/types.v2.1';

// ==================== CONSTANTS ====================

/**
 * Scoring weights (approved by user)
 */
const WEIGHTS = {
  SEMANTIC_RELEVANCE: 0.30,
  LENGTH_SCORE: 0.25,
  BRAND_HYBRID_BONUS: 0.20,
  NOVELTY_SCORE: 0.15,
  NOISE_INVERSE: 0.10,
} as const;

/**
 * Optimal combo length range (2-4 words)
 */
const OPTIMAL_LENGTH_MIN = 2;
const OPTIMAL_LENGTH_MAX = 4;

/**
 * High-value threshold (priority_score > 70)
 */
export const HIGH_VALUE_THRESHOLD = 70;

// ==================== SEMANTIC RELEVANCE ====================

/**
 * Calculate semantic relevance score
 *
 * **Heuristic Approach (V2.1 - No Embeddings):**
 * - Uses existing relevanceScore (0-3) from ClassifiedCombo
 * - Maps to 0-100 scale
 * - Falls back to combo type if relevanceScore unavailable
 *
 * **Future Enhancement (V2.2):**
 * - Sentence embeddings for true semantic similarity
 * - ASO Bible vertical keyword matching
 */
export function calculateSemanticRelevance(
  combo: ClassifiedCombo,
  context?: {
    verticalKeywords?: string[];
    appDescription?: string;
  }
): number {
  // Use existing relevanceScore (0-3) if available
  if (combo.relevanceScore !== undefined) {
    // Map 0-3 to 0-100 scale
    // 0 → 0, 1 → 33, 2 → 67, 3 → 100
    return Math.round((combo.relevanceScore / 3) * 100);
  }

  // Fallback: Use combo type
  switch (combo.type) {
    case 'branded':
      return 80; // Brand combos are usually relevant
    case 'generic':
      return 60; // Generic combos are moderately relevant
    case 'low_value':
      return 20; // Low-value combos are not very relevant
    default:
      return 50; // Neutral default
  }
}

// ==================== LENGTH SCORE ====================

/**
 * Calculate length score
 *
 * **Optimal Range:** 2-4 words
 * - 1 word: Too generic (50/100)
 * - 2 words: Good (80/100)
 * - 3 words: Ideal long-tail (100/100)
 * - 4 words: Good long-tail (90/100)
 * - 5+ words: Too specific, diminishing returns (60/100)
 */
export function calculateLengthScore(combo: ClassifiedCombo): number {
  const wordCount = combo.text.split(/\s+/).length;

  if (wordCount === 1) return 50; // Too generic
  if (wordCount === 2) return 80; // Good
  if (wordCount === 3) return 100; // Ideal long-tail
  if (wordCount === 4) return 90; // Good long-tail
  if (wordCount === 5) return 70; // Getting too specific
  return 60; // 6+ words: very specific, low search volume
}

// ==================== BRAND HYBRID BONUS ====================

/**
 * Check if combo is a brand hybrid (brand + generic)
 *
 * Examples:
 * - "duolingo spanish" (brand + generic) → true
 * - "learn spanish" (generic only) → false
 * - "duolingo app" (brand + brand) → false
 */
export function isBrandHybrid(combo: ClassifiedCombo): boolean {
  // Check if brand classification exists (Phase 5 Brand Intelligence)
  if (combo.brandClassification) {
    // If classified as 'generic', check if combo contains brand alias
    return (
      combo.brandClassification === 'generic' && !!combo.matchedBrandAlias
    );
  }

  // Fallback: Check combo type
  // If it's branded but not purely brand, it's likely a hybrid
  return combo.type === 'branded';
}

/**
 * Calculate brand hybrid bonus
 *
 * Brand + generic combos are HIGHLY valuable for ASO:
 * - Captures brand awareness + category intent
 * - Example: "duolingo spanish" → user knows brand + wants language learning
 *
 * **Scoring:**
 * - Brand hybrid: 100/100
 * - Not hybrid: 0/100
 */
export function calculateBrandHybridBonus(combo: ClassifiedCombo): number {
  return isBrandHybrid(combo) ? 100 : 0;
}

// ==================== NOVELTY SCORE ====================

/**
 * Calculate novelty score
 *
 * **Heuristic Approach (V2.1):**
 * - Long-tail combos (3+ words) are more novel
 * - Source matters: title+subtitle combos are more novel than title-only
 *
 * **Future Enhancement (V2.2):**
 * - Check combo uniqueness across category (requires database)
 * - Identify "blue ocean" keyword opportunities
 */
export function calculateNoveltyScore(combo: ClassifiedCombo): number {
  const wordCount = combo.text.split(/\s+/).length;

  // Long-tail = higher novelty
  if (wordCount >= 3) {
    // title+subtitle combos are more novel (require both elements)
    if (combo.source === 'title+subtitle') return 90;
    return 70;
  }

  // 2-word combos
  if (wordCount === 2) {
    if (combo.source === 'title+subtitle') return 60;
    return 40;
  }

  // 1-word combos are not novel
  return 20;
}

// ==================== NOISE CONFIDENCE ====================

/**
 * Placeholder for noise confidence
 *
 * This will be implemented in noiseFilterEngine.ts
 * For now, use a simple heuristic.
 */
export function calculateNoiseConfidence(combo: ClassifiedCombo): number {
  // If combo is marked as low_value, it's likely noise
  if (combo.type === 'low_value') return 70;

  // If relevanceScore is 0, it's likely noise
  if (combo.relevanceScore === 0) return 60;

  // Otherwise, assume low noise
  return 20;
}

// ==================== PRIORITY SCORE (MAIN) ====================

/**
 * Calculate composite priority score using approved formula
 *
 * @param combo - Classified combo to score
 * @param context - Optional context (vertical keywords, app description)
 * @returns Priority score factors and total score (0-100)
 */
export function calculateComboPriorityScore(
  combo: ClassifiedCombo,
  context?: {
    verticalKeywords?: string[];
    appDescription?: string;
    noiseConfidence?: number; // Pre-calculated noise confidence
  }
): PriorityScoreFactors {
  // Calculate individual factors
  const semanticRelevance = calculateSemanticRelevance(combo, context);
  const lengthScore = calculateLengthScore(combo);
  const brandHybridBonus = calculateBrandHybridBonus(combo);
  const noveltyScore = calculateNoveltyScore(combo);
  const noiseConfidence =
    context?.noiseConfidence ?? calculateNoiseConfidence(combo);
  const noiseInverse = 100 - noiseConfidence;

  // Apply approved formula
  const totalScore = Math.round(
    semanticRelevance * WEIGHTS.SEMANTIC_RELEVANCE +
      lengthScore * WEIGHTS.LENGTH_SCORE +
      brandHybridBonus * WEIGHTS.BRAND_HYBRID_BONUS +
      noveltyScore * WEIGHTS.NOVELTY_SCORE +
      noiseInverse * WEIGHTS.NOISE_INVERSE
  );

  return {
    semanticRelevance,
    lengthScore,
    brandHybridBonus,
    noveltyScore,
    noiseInverse,
    totalScore: Math.max(0, Math.min(100, totalScore)), // Clamp to 0-100
  };
}

// ==================== BATCH SCORING ====================

/**
 * Score all combos in a batch (optimized)
 *
 * @param combos - Array of classified combos
 * @param context - Optional context
 * @returns Array of V2.1 combos with priority scores
 */
export function scoreCombos(
  combos: ClassifiedCombo[],
  context?: {
    verticalKeywords?: string[];
    appDescription?: string;
  }
): ClassifiedComboV2_1[] {
  return combos.map((combo) => {
    const priorityFactors = calculateComboPriorityScore(combo, context);
    const priorityScore = priorityFactors.totalScore;

    // Determine flags
    const isHighValue = priorityScore > HIGH_VALUE_THRESHOLD;
    const isLongTail = combo.text.split(/\s+/).length >= 3;
    const noiseConfidence = 100 - priorityFactors.noiseInverse;

    const comboV2_1: ClassifiedComboV2_1 = {
      ...combo,
      priorityScore,
      priorityFactors,
      noiseConfidence,
      isHighValue,
      isLongTail,
      semanticRelevance: priorityFactors.semanticRelevance,
      noveltyScore: priorityFactors.noveltyScore,
    };

    return comboV2_1;
  });
}

// ==================== FILTERING ====================

/**
 * Filter combos by high value (priority_score > 70)
 */
export function filterHighValueCombos(
  combos: ClassifiedComboV2_1[]
): ClassifiedComboV2_1[] {
  return combos.filter((combo) => combo.isHighValue);
}

/**
 * Filter combos by brand hybrid
 */
export function filterBrandHybridCombos(
  combos: ClassifiedComboV2_1[]
): ClassifiedComboV2_1[] {
  return combos.filter((combo) => isBrandHybrid(combo));
}

/**
 * Filter combos by long-tail (3+ words)
 */
export function filterLongTailCombos(
  combos: ClassifiedComboV2_1[]
): ClassifiedComboV2_1[] {
  return combos.filter((combo) => combo.isLongTail);
}

/**
 * Filter combos by max noise confidence
 */
export function filterByMaxNoise(
  combos: ClassifiedComboV2_1[],
  maxNoiseConfidence: number
): ClassifiedComboV2_1[] {
  return combos.filter(
    (combo) => (combo.noiseConfidence ?? 0) <= maxNoiseConfidence
  );
}
