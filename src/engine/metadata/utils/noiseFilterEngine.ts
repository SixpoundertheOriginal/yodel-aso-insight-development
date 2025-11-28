/**
 * Noise Filter Engine
 *
 * Identifies and filters meaningless keyword combinations that unlikely to drive
 * meaningful app discovery.
 *
 * **Noise Categories:**
 * 1. Gibberish: Random word combinations (e.g., "app free tracker learn")
 * 2. Over-generic: Too broad to be useful (e.g., "best app")
 * 3. Stopword-heavy: Mostly stopwords (e.g., "the best for you")
 * 4. Low relevance: Unrelated to app purpose
 *
 * **Performance Budget:** +50ms for all combos
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

// ==================== CONSTANTS ====================

/**
 * Stopwords and filler words
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  '&',
]);

/**
 * Over-generic terms that rarely drive meaningful discovery
 */
const OVER_GENERIC_TERMS = new Set([
  'app',
  'free',
  'best',
  'top',
  'new',
  'good',
  'great',
  'easy',
  'simple',
  'quick',
  'fast',
  'pro',
  'plus',
  'premium',
  '2024',
  '2025',
]);

/**
 * Noise confidence thresholds
 * - 0-30: Low noise (keep)
 * - 31-60: Medium noise (review)
 * - 61-100: High noise (filter)
 */
export const NOISE_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 100,
} as const;

// ==================== NOISE DETECTION ====================

/**
 * Calculate stopword ratio
 *
 * Combos with >50% stopwords are likely noise.
 */
function calculateStopwordRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  const stopwordCount = words.filter((word) => STOPWORDS.has(word)).length;
  return words.length > 0 ? stopwordCount / words.length : 0;
}

/**
 * Calculate over-generic ratio
 *
 * Combos with >50% over-generic terms are likely noise.
 */
function calculateOverGenericRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  const genericCount = words.filter((word) =>
    OVER_GENERIC_TERMS.has(word)
  ).length;
  return words.length > 0 ? genericCount / words.length : 0;
}

/**
 * Check if combo is gibberish
 *
 * Heuristics:
 * - Very long combos (5+ words) with low relevance
 * - Contains repeated words
 * - All words are generic
 */
function isGibberish(combo: ClassifiedCombo): boolean {
  const words = combo.text.toLowerCase().split(/\s+/);

  // Very long combos with low relevance are likely gibberish
  if (words.length > 5 && combo.relevanceScore < 1) {
    return true;
  }

  // Check for repeated words (e.g., "learn learn spanish")
  const uniqueWords = new Set(words);
  if (uniqueWords.size < words.length * 0.7) {
    return true; // >30% duplicate words
  }

  // All words are over-generic (e.g., "best free app pro")
  const allGeneric = words.every(
    (word) => OVER_GENERIC_TERMS.has(word) || STOPWORDS.has(word)
  );
  if (allGeneric) {
    return true;
  }

  return false;
}

/**
 * Calculate noise confidence score
 *
 * **Scoring Logic:**
 * - Stopword ratio: 0-30 points (>50% stopwords = 30 points)
 * - Over-generic ratio: 0-30 points (>50% generic = 30 points)
 * - Gibberish: +40 points
 * - Low relevance score: +20 points (relevanceScore = 0)
 * - Combo type: low_value = +20 points
 *
 * **Result:**
 * - 0-30: Low noise (keep)
 * - 31-60: Medium noise (review)
 * - 61-100: High noise (filter)
 *
 * @param combo - Classified combo
 * @param context - Optional context
 * @returns Noise confidence score (0-100)
 */
export function calculateNoiseConfidence(
  combo: ClassifiedCombo,
  context?: {
    verticalKeywords?: string[];
  }
): number {
  let score = 0;

  // 1. Stopword ratio (0-30 points)
  const stopwordRatio = calculateStopwordRatio(combo.text);
  score += Math.round(stopwordRatio * 60); // >50% = 30 points

  // 2. Over-generic ratio (0-30 points)
  const genericRatio = calculateOverGenericRatio(combo.text);
  score += Math.round(genericRatio * 60); // >50% = 30 points

  // 3. Gibberish check (+40 points)
  if (isGibberish(combo)) {
    score += 40;
  }

  // 4. Low relevance score (+20 points)
  if (combo.relevanceScore === 0) {
    score += 20;
  }

  // 5. Combo type: low_value (+20 points)
  if (combo.type === 'low_value') {
    score += 20;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// ==================== HIGH-VALUE DETECTION ====================

/**
 * Check if combo is high-value
 *
 * High-value combos meet ALL criteria:
 * - Noise confidence ≤ 30 (low noise)
 * - Relevance score ≥ 2 (good relevance)
 * - Type is NOT low_value
 * - Length is 2-4 words (sweet spot)
 *
 * @param combo - Classified combo
 * @param vertical - Optional vertical name for context
 * @returns true if combo is high-value
 */
export function isHighValueCombo(
  combo: ClassifiedCombo,
  vertical?: string
): boolean {
  const words = combo.text.split(/\s+/);
  const wordCount = words.length;

  // Criteria 1: Low noise
  const noiseConfidence = calculateNoiseConfidence(combo);
  if (noiseConfidence > NOISE_THRESHOLDS.LOW) {
    return false;
  }

  // Criteria 2: Good relevance
  if (combo.relevanceScore < 2) {
    return false;
  }

  // Criteria 3: Not low_value
  if (combo.type === 'low_value') {
    return false;
  }

  // Criteria 4: Optimal length (2-4 words)
  if (wordCount < 2 || wordCount > 4) {
    return false;
  }

  return true;
}

// ==================== FILTERING ====================

/**
 * Filter meaningless combos (noise confidence > threshold)
 *
 * @param combos - Array of classified combos
 * @param maxNoiseConfidence - Maximum allowed noise confidence (default: 30)
 * @returns Filtered array of combos
 */
export function filterMeaninglessCombos(
  combos: ClassifiedCombo[],
  maxNoiseConfidence: number = NOISE_THRESHOLDS.LOW
): ClassifiedCombo[] {
  return combos.filter((combo) => {
    const noiseConfidence = calculateNoiseConfidence(combo);
    return noiseConfidence <= maxNoiseConfidence;
  });
}

/**
 * Filter high-value combos only
 *
 * @param combos - Array of classified combos
 * @param vertical - Optional vertical name for context
 * @returns Array of high-value combos
 */
export function filterHighValueCombos(
  combos: ClassifiedCombo[],
  vertical?: string
): ClassifiedCombo[] {
  return combos.filter((combo) => isHighValueCombo(combo, vertical));
}

/**
 * Categorize combos by noise level
 *
 * @param combos - Array of classified combos
 * @returns Object with categorized combos
 */
export function categorizeCombosbyNoise(combos: ClassifiedCombo[]): {
  lowNoise: ClassifiedCombo[];
  mediumNoise: ClassifiedCombo[];
  highNoise: ClassifiedCombo[];
} {
  const lowNoise: ClassifiedCombo[] = [];
  const mediumNoise: ClassifiedCombo[] = [];
  const highNoise: ClassifiedCombo[] = [];

  combos.forEach((combo) => {
    const noiseConfidence = calculateNoiseConfidence(combo);

    if (noiseConfidence <= NOISE_THRESHOLDS.LOW) {
      lowNoise.push(combo);
    } else if (noiseConfidence <= NOISE_THRESHOLDS.MEDIUM) {
      mediumNoise.push(combo);
    } else {
      highNoise.push(combo);
    }
  });

  return { lowNoise, mediumNoise, highNoise };
}

// ==================== BATCH ANALYSIS ====================

/**
 * Analyze noise distribution across all combos
 *
 * @param combos - Array of classified combos
 * @returns Noise distribution statistics
 */
export function analyzeNoiseDistribution(combos: ClassifiedCombo[]): {
  totalCombos: number;
  lowNoiseCount: number;
  mediumNoiseCount: number;
  highNoiseCount: number;
  averageNoiseConfidence: number;
  noiseRatio: number; // high noise / total
} {
  const { lowNoise, mediumNoise, highNoise } =
    categorizeCombosbyNoise(combos);

  const totalCombos = combos.length;
  const lowNoiseCount = lowNoise.length;
  const mediumNoiseCount = mediumNoise.length;
  const highNoiseCount = highNoise.length;

  const totalNoiseConfidence = combos.reduce(
    (sum, combo) => sum + calculateNoiseConfidence(combo),
    0
  );
  const averageNoiseConfidence =
    totalCombos > 0 ? Math.round(totalNoiseConfidence / totalCombos) : 0;

  const noiseRatio = totalCombos > 0 ? highNoiseCount / totalCombos : 0;

  return {
    totalCombos,
    lowNoiseCount,
    mediumNoiseCount,
    highNoiseCount,
    averageNoiseConfidence,
    noiseRatio,
  };
}
