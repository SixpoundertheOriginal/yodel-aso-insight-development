/**
 * N-gram Utility
 *
 * Generates and analyzes multi-word keyword combinations.
 */

import type { NgramAnalysis } from '../types';

/**
 * Generates n-grams (multi-word combinations) from tokens
 *
 * @param tokens - Array of tokens
 * @param minLength - Minimum n-gram length (default: 2)
 * @param maxLength - Maximum n-gram length (default: 3)
 * @returns Array of n-gram strings
 */
export function generateNgrams(
  tokens: string[],
  minLength: number = 2,
  maxLength: number = 3
): string[] {
  const ngrams: string[] = [];

  if (!tokens || tokens.length === 0) {
    return ngrams;
  }

  for (let n = minLength; n <= maxLength; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(' ');
      ngrams.push(ngram);
    }
  }

  return ngrams;
}

/**
 * Filters n-grams to only include meaningful combinations
 * (excludes combinations that are entirely stopwords)
 *
 * @param ngrams - Array of n-gram strings
 * @param stopwords - Set of stopwords
 * @returns Array of meaningful n-grams
 */
export function filterMeaningfulCombos(
  ngrams: string[],
  stopwords: Set<string>
): string[] {
  return ngrams.filter(ngram => {
    const tokens = ngram.split(' ');
    // At least one token must NOT be a stopword
    return tokens.some(token => !stopwords.has(token));
  });
}

/**
 * Generates meaningful n-gram combinations from tokens
 *
 * @param tokens - Array of tokens
 * @param stopwords - Set of stopwords
 * @param minLength - Minimum n-gram length
 * @param maxLength - Maximum n-gram length
 * @returns NgramAnalysis with all and meaningful combos
 */
export function analyzeCombinations(
  tokens: string[],
  stopwords: Set<string>,
  minLength: number = 2,
  maxLength: number = 3
): NgramAnalysis {
  const allCombos = generateNgrams(tokens, minLength, maxLength);
  const meaningfulCombos = filterMeaningfulCombos(allCombos, stopwords);

  return {
    allCombos,
    meaningfulCombos
  };
}

/**
 * Finds combinations in array B that are NOT in array A
 *
 * @param combosA - First array of combinations (e.g., title combos)
 * @param combosB - Second array of combinations (e.g., subtitle combos)
 * @returns Array of combinations unique to B
 */
export function findNewCombos(combosA: string[], combosB: string[]): string[] {
  const setA = new Set(combosA);
  return combosB.filter(combo => !setA.has(combo));
}

/**
 * Categorizes n-grams by their length
 *
 * @param ngrams - Array of n-gram strings
 * @returns Object with arrays categorized by length
 */
export function categorizeNgramsByLength(ngrams: string[]): Record<number, string[]> {
  const categorized: Record<number, string[]> = {
    2: [],
    3: [],
    4: []
  };

  for (const ngram of ngrams) {
    const length = ngram.split(' ').length;
    if (categorized[length]) {
      categorized[length].push(ngram);
    }
  }

  return categorized;
}

/**
 * Finds incremental combinations from subtitle that include at least one subtitle token
 * and are not present in title-only combinations
 *
 * @param titleTokens - Tokens from title
 * @param subtitleTokens - Tokens from subtitle
 * @param titleCombos - All combinations from title only
 * @param combinedTokens - Combined title + subtitle tokens
 * @param stopwords - Set of stopwords
 * @param minLength - Minimum n-gram length
 * @param maxLength - Maximum n-gram length
 * @returns Array of incremental combinations unique to subtitle
 */
export function findIncrementalCombinations(
  titleTokens: string[],
  subtitleTokens: string[],
  titleCombos: string[],
  combinedTokens: string[],
  stopwords: Set<string>,
  minLength: number = 2,
  maxLength: number = 4
): string[] {
  const titleTokenSet = new Set(titleTokens);
  const subtitleTokenSet = new Set(subtitleTokens);
  const titleComboSet = new Set(titleCombos);

  // Generate all combos from combined tokens
  const allCombinedCombos = generateNgrams(combinedTokens, minLength, maxLength);
  const meaningfulCombinedCombos = filterMeaningfulCombos(allCombinedCombos, stopwords);

  // Filter to only combos that:
  // 1. Include at least one subtitle token
  // 2. Are not present in title-only combinations
  const incrementalCombos = meaningfulCombinedCombos.filter(combo => {
    // Skip if already in title
    if (titleComboSet.has(combo)) {
      return false;
    }

    // Check if includes at least one subtitle token
    const comboTokens = combo.split(' ');
    const hasSubtitleToken = comboTokens.some(token =>
      subtitleTokenSet.has(token) && !titleTokenSet.has(token)
    );

    return hasSubtitleToken;
  });

  return incrementalCombos;
}

/**
 * Calculates combination coverage score based on count of meaningful combos
 *
 * @param meaningfulComboCount - Number of meaningful combinations
 * @returns Score from 0-100
 */
export function calculateComboCoverageScore(meaningfulComboCount: number): number {
  if (meaningfulComboCount === 0) {
    return 0;
  }

  // Scoring curve:
  // 0 combos = 0 points
  // 1-2 combos = 40-60 points
  // 3-4 combos = 70-85 points
  // 5+ combos = 90-100 points

  if (meaningfulComboCount >= 5) {
    return Math.min(100, 90 + (meaningfulComboCount - 5) * 2);
  }

  if (meaningfulComboCount >= 3) {
    return 70 + ((meaningfulComboCount - 3) * 7.5);
  }

  if (meaningfulComboCount >= 1) {
    return 40 + ((meaningfulComboCount - 1) * 10);
  }

  return 0;
}
