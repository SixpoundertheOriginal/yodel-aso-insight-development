/**
 * Combo Classifier Utility
 *
 * Multi-dimensional classification of keyword combinations.
 * All classification uses canonical token comparison for consistency.
 */

import { normalizeComboTokens } from './comboNormalizer';
import type { IntentType, TailLength } from '../types';

/**
 * Classifies combo by tail length
 *
 * @param combo - Combo string
 * @returns "short-tail" (2-word), "mid-tail" (3-word), or "long-tail" (4+ word)
 */
export function classifyByLength(combo: string): TailLength {
  const tokens = normalizeComboTokens(combo);
  const length = tokens.length;

  if (length === 2) return 'short-tail';
  if (length === 3) return 'mid-tail';
  return 'long-tail'; // 4+ words
}

/**
 * Checks if combo contains brand token
 *
 * Brand token is typically the first token in the title and has length > 2.
 * Examples: "pimsleur", "duolingo", "instagram"
 *
 * @param combo - Combo string
 * @param brandToken - Brand token to check (normalized)
 * @returns true if combo contains brand token
 */
export function classifyByBrandPresence(combo: string, brandToken: string): boolean {
  if (!brandToken || brandToken.length <= 2) {
    return false;
  }

  const tokens = normalizeComboTokens(combo);
  const normalizedBrand = brandToken.toLowerCase();

  return tokens.includes(normalizedBrand);
}

/**
 * Checks if combo contains category keyword
 *
 * Examples: "language", "learning", "lessons", "education"
 *
 * @param combo - Combo string
 * @param categoryKeywords - List of category keywords
 * @returns true if combo contains at least one category keyword
 */
export function classifyByCategoryPresence(
  combo: string,
  categoryKeywords: string[]
): boolean {
  if (!categoryKeywords || categoryKeywords.length === 0) {
    return false;
  }

  const tokens = normalizeComboTokens(combo);
  const categorySet = new Set(categoryKeywords.map(k => k.toLowerCase()));

  return tokens.some(token => categorySet.has(token));
}

/**
 * Checks if combo contains benefit keyword
 *
 * Examples: "learn", "improve", "master", "practice"
 *
 * @param combo - Combo string
 * @param benefitKeywords - List of benefit keywords
 * @returns true if combo contains at least one benefit keyword
 */
export function classifyByBenefitPresence(
  combo: string,
  benefitKeywords: string[]
): boolean {
  if (!benefitKeywords || benefitKeywords.length === 0) {
    return false;
  }

  const tokens = normalizeComboTokens(combo);
  const benefitSet = new Set(benefitKeywords.map(k => k.toLowerCase()));

  return tokens.some(token => benefitSet.has(token));
}

/**
 * Checks if combo contains CTA verb
 *
 * Examples: "learn", "start", "try", "speak", "book"
 *
 * @param combo - Combo string
 * @param ctaVerbs - List of CTA verbs
 * @returns true if combo contains at least one CTA verb
 */
export function classifyByVerbPresence(combo: string, ctaVerbs: string[]): boolean {
  if (!ctaVerbs || ctaVerbs.length === 0) {
    return false;
  }

  const tokens = normalizeComboTokens(combo);
  const verbSet = new Set(ctaVerbs.map(v => v.toLowerCase()));

  return tokens.some(token => verbSet.has(token));
}

/**
 * Checks if combo contains time hint keyword
 *
 * Examples: "day", "week", "month", "minutes", "fast", "quick"
 *
 * @param combo - Combo string
 * @param timeKeywords - List of time keywords
 * @returns true if combo contains at least one time keyword
 */
export function classifyByTimeHint(combo: string, timeKeywords: string[]): boolean {
  if (!timeKeywords || timeKeywords.length === 0) {
    return false;
  }

  const tokens = normalizeComboTokens(combo);
  const timeSet = new Set(timeKeywords.map(k => k.toLowerCase()));

  return tokens.some(token => timeSet.has(token));
}

/**
 * Calculates filler ratio for a combo
 *
 * Filler ratio = (stopword tokens) / (total tokens)
 *
 * @param combo - Combo string
 * @param stopwords - Set of stopwords
 * @returns Filler ratio from 0 to 1
 */
export function classifyByFillerRatio(combo: string, stopwords: Set<string>): number {
  const tokens = normalizeComboTokens(combo);

  if (tokens.length === 0) {
    return 0;
  }

  const fillerCount = tokens.filter(token => stopwords.has(token)).length;
  return fillerCount / tokens.length;
}

/**
 * Classifies combo intent based on semantic content
 *
 * Intent Types:
 * - Navigational: Contains brand token (e.g., "pimsleur language learning")
 * - Transactional: Contains CTA verb + (benefit OR category) (e.g., "learn spanish fast")
 * - Informational: Contains category/benefit but no brand/verb (e.g., "language learning tips")
 * - Noise: Filler ratio > 0.4 OR no semantic value
 *
 * @param combo - Combo string
 * @param brandToken - Brand token (first title token, length > 2)
 * @param categoryKeywords - List of category keywords
 * @param ctaVerbs - List of CTA verbs
 * @param stopwords - Set of stopwords
 * @returns Intent classification
 */
export function classifyIntent(
  combo: string,
  brandToken: string,
  categoryKeywords: string[],
  ctaVerbs: string[],
  stopwords: Set<string>
): IntentType {
  const tokens = normalizeComboTokens(combo);

  // Check filler ratio first (high filler = noise)
  const fillerRatio = classifyByFillerRatio(combo, stopwords);
  if (fillerRatio > 0.4) {
    return 'Noise';
  }

  // Check if combo has any semantic value
  const hasBrand = classifyByBrandPresence(combo, brandToken);
  const hasCategory = classifyByCategoryPresence(combo, categoryKeywords);
  const hasVerb = classifyByVerbPresence(combo, ctaVerbs);

  // No semantic value = Noise
  if (!hasBrand && !hasCategory && !hasVerb) {
    return 'Noise';
  }

  // Navigational: Contains brand
  if (hasBrand) {
    return 'Navigational';
  }

  // Transactional: CTA verb + (category OR benefit)
  if (hasVerb && hasCategory) {
    return 'Transactional';
  }

  // Informational: Category/benefit but no brand/verb
  if (hasCategory && !hasVerb) {
    return 'Informational';
  }

  // Default to Informational for combos with semantic value but unclear intent
  return 'Informational';
}
