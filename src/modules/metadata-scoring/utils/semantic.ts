/**
 * Semantic Utility
 *
 * Applies semantic scoring rules based on patterns and heuristics.
 */

import type { SemanticRulesConfig } from '../types';

/**
 * Applies semantic scoring rules to tokens
 *
 * @param tokens - Array of tokens to analyze
 * @param rules - Semantic rules configuration
 * @returns Score adjustment (positive or negative)
 */
export function applySemanticRules(
  tokens: string[],
  rules: SemanticRulesConfig
): number {
  let score = 0;

  // Check each token against positive patterns
  for (const token of tokens) {
    for (const pattern of rules.positive_patterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(token)) {
        score += pattern.bonus || 0;
      }
    }

    for (const pattern of rules.negative_patterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(token)) {
        score -= pattern.penalty || 0;
      }
    }
  }

  return score;
}

/**
 * Checks capitalization quality of text
 *
 * @param text - Original text (before tokenization)
 * @param rules - Semantic rules configuration
 * @returns Score adjustment based on capitalization
 */
export function checkCapitalization(
  text: string,
  rules: SemanticRulesConfig
): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Check if text is ALL CAPS (excluding spaces and punctuation)
  const alphaText = text.replace(/[^a-zA-Z]/g, '');
  if (alphaText.length === 0) {
    return 0;
  }

  const uppercaseCount = (alphaText.match(/[A-Z]/g) || []).length;
  const uppercaseRatio = uppercaseCount / alphaText.length;

  // ALL CAPS penalty (>90% uppercase)
  if (uppercaseRatio > 0.9) {
    return -rules.capitalization_rules.all_caps_penalty;
  }

  // Proper case bonus (15-50% uppercase - suggests proper nouns/branding)
  if (uppercaseRatio >= 0.15 && uppercaseRatio <= 0.5) {
    return rules.capitalization_rules.proper_case_bonus;
  }

  return 0;
}

/**
 * Calculates semantic quality score for text
 *
 * @param text - Original text
 * @param tokens - Tokenized text
 * @param rules - Semantic rules configuration
 * @returns Semantic score (can be positive or negative)
 */
export function calculateSemanticScore(
  text: string,
  tokens: string[],
  rules: SemanticRulesConfig
): number {
  const patternScore = applySemanticRules(tokens, rules);
  const capitalizationScore = checkCapitalization(text, rules);

  return patternScore + capitalizationScore;
}

/**
 * Calculates duplication penalty based on duplicate count
 *
 * @param duplicateCount - Number of duplicate tokens
 * @param penaltyPerToken - Penalty per duplicate token
 * @returns Penalty score (always non-negative)
 */
export function calculateDuplicationPenalty(
  duplicateCount: number,
  penaltyPerToken: number
): number {
  return duplicateCount * penaltyPerToken;
}

/**
 * Calculates filler penalty based on filler token count
 *
 * @param fillerCount - Number of filler tokens (stopwords)
 * @param penaltyPerToken - Penalty per filler token
 * @returns Penalty score (always non-negative)
 */
export function calculateFillerPenalty(
  fillerCount: number,
  penaltyPerToken: number
): number {
  return fillerCount * penaltyPerToken;
}

/**
 * Checks if title meets semantic role requirements
 *
 * @param tokens - Tokenized title
 * @param rules - Semantic rules configuration
 * @returns Object with role fulfillment status and score adjustment
 */
export function checkTitleRoles(
  tokens: string[],
  rules: SemanticRulesConfig
): { hasBrand: boolean; hasCategory: boolean; hasBenefit: boolean; score: number } {
  const titleRules = rules.title;
  const benefitKeywords = new Set(rules.benefit_keywords || []);

  // Simple heuristics for role detection
  // Brand: typically first token with capital letter, or a unique/proper noun
  const hasBrand = tokens.length > 0 && tokens[0].length > 2;

  // Category: detect generic category keywords or descriptive terms
  const categoryTerms = ['app', 'game', 'language', 'learning', 'book', 'tracker', 'lessons'];
  const hasCategory = tokens.some(token => categoryTerms.includes(token));

  // Benefit: check against benefit keywords
  const hasBenefit = tokens.some(token => benefitKeywords.has(token));

  // Calculate score adjustment
  let score = 0;
  if (titleRules.brand_required && !hasBrand) {
    score -= 5;
  }
  if (titleRules.category_required && !hasCategory) {
    score -= 5;
  }
  if (titleRules.benefit_optional && hasBenefit) {
    score += 3;
  }

  return { hasBrand, hasCategory, hasBenefit, score };
}

/**
 * Checks if subtitle meets semantic role requirements
 *
 * @param tokens - Tokenized subtitle
 * @param rules - Semantic rules configuration
 * @returns Object with role fulfillment status and score adjustment
 */
export function checkSubtitleRoles(
  tokens: string[],
  rules: SemanticRulesConfig
): { hasVerb: boolean; hasBenefit: boolean; hasTimeHint: boolean; score: number } {
  const subtitleRules = rules.subtitle;
  const ctaVerbs = new Set(rules.cta_verbs || []);
  const benefitKeywords = new Set(rules.benefit_keywords || []);
  const timeKeywords = new Set(rules.time_keywords || []);

  // Check for verb (CTA verb)
  const hasVerb = tokens.some(token => ctaVerbs.has(token));

  // Check for benefit keywords
  const hasBenefit = tokens.some(token => benefitKeywords.has(token));

  // Check for time hints
  const hasTimeHint = tokens.some(token => timeKeywords.has(token));

  // Calculate score adjustment
  let score = 0;
  if (subtitleRules.verb_required && !hasVerb) {
    score -= 5;
  }
  if (subtitleRules.benefit_required && !hasBenefit) {
    score -= 5;
  }
  if (subtitleRules.time_hint_optional && hasTimeHint) {
    score += 3;
  }

  return { hasVerb, hasBenefit, hasTimeHint, score };
}
