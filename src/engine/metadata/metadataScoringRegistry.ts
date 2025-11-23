/**
 * Metadata Scoring Registry
 *
 * Centralized registry of all metadata scoring rules.
 * Based on existing Metadata Scoring Analysis logic with curated additions.
 */

import type { ScrapedMetadata } from '@/types/aso';
import type { BenchmarkComparison } from '@/services/benchmark-registry.service';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';
import { tokenizeForASO, analyzeText } from './tokenization';
import { analyzeCombinations } from '@/modules/metadata-scoring/utils/ngram';
import { getTokenRelevance } from './metadataAuditEngine';
import { getRuleConfig } from '@/services/ruleConfigLoader';

/**
 * Metadata element types
 */
export type MetadataElement = 'title' | 'subtitle' | 'description';

/**
 * Combo classification type
 */
export type ComboType = 'branded' | 'generic' | 'low_value';

/**
 * Classified combo with relevance scoring
 */
export interface ClassifiedCombo {
  text: string;
  type: ComboType;
  relevanceScore: number;  // 0-3
}

/**
 * Rule evaluation result
 */
export interface RuleEvaluationResult {
  ruleId: string;
  passed: boolean;
  score: number;          // 0-100 contribution to element score
  bonus?: number;
  penalty?: number;
  message: string;
  evidence?: string[];
}

/**
 * Evaluation context (shared across all rules)
 */
export interface EvaluationContext {
  metadata: ScrapedMetadata;
  competitorData?: any[];
  category?: string;
  titleTokens: string[];
  subtitleTokens: string[];
  descriptionTokens: string[];
  stopwords: Set<string>;
  semanticRules: {
    category_keywords?: string[];
    benefit_keywords?: string[];
    cta_verbs?: string[];
    time_keywords?: string[];
    positive_patterns: Array<{ pattern: string; bonus?: number; reason: string }>;
    negative_patterns: Array<{ pattern: string; penalty?: number; reason: string }>;
  };
  // Phase 8/10: Active rule set (Base → Vertical → Market → Client)
  activeRuleSet?: MergedRuleSet;
}

/**
 * Rule configuration
 */
export interface RuleConfig {
  id: string;
  name: string;
  description: string;
  weight: number;         // Weight in element score (0-1)
  evaluator: (text: string, context: EvaluationContext) => RuleEvaluationResult | Promise<RuleEvaluationResult>;
}

/**
 * Element evaluation config
 */
export interface ElementConfig {
  element: MetadataElement;
  maxCharacters: number;
  weight: number;         // Weight in overall metadata score (0-1)
  rules: RuleConfig[];
}

/**
 * Element scoring result
 */
export interface ElementScoringResult {
  element: MetadataElement;
  score: number;          // 0-100
  ruleResults: RuleEvaluationResult[];
  recommendations: string[];
  insights: string[];
  metadata: {
    characterUsage: number;
    maxCharacters: number;
    keywords: string[];
    combos?: string[];
    ignoredKeywords?: string[];   // Stopwords + short tokens (for transparency)
    noiseRatio?: number;          // 0-1 proportion of ignored tokens
    benchmarkComparison?: BenchmarkComparison;
  };
}

/**
 * Unified metadata audit result
 */
export interface UnifiedMetadataAuditResult {
  overallScore: number;   // Weighted average of RANKING elements only (title + subtitle)
  elements: {
    title: ElementScoringResult;
    subtitle: ElementScoringResult;
    description: ElementScoringResult;  // Kept for UI compatibility, but weight = 0
  };
  topRecommendations: string[];  // Ranking recommendations (title + subtitle)
  conversionRecommendations: string[];  // Conversion recommendations (description)
  keywordCoverage: {
    totalUniqueKeywords: number;
    titleKeywords: string[];
    subtitleNewKeywords: string[];
    descriptionNewKeywords: string[];
    titleIgnoredCount?: number;  // Number of ignored tokens (stopwords + short tokens)
    subtitleIgnoredCount?: number;
    descriptionIgnoredCount?: number;
  };
  comboCoverage: {
    totalCombos: number;
    titleCombos: string[];
    subtitleNewCombos: string[];
    allCombinedCombos: string[];
    // Classified combos (V2.1+)
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
    lowValueCombos?: ClassifiedCombo[];
  };
  conversionInsights: {
    description: {
      score: number;  // Conversion quality score (0-100), NOT ranking score
      readability: number;  // Flesch-Kincaid score
      hookStrength: number;  // Opening hook quality
      featureMentions: number;  // Number of features detected
      ctaStrength: number;  // CTA presence and quality
      noiseRatio: number;  // Proportion of stopwords
      recommendations: string[];  // Conversion-specific recommendations
    };
  };
}

/**
 * Helper: Count syllables in a word (for readability calculation)
 */
function countSyllables(word: string): number {
  if (!word || word.length === 0) return 0;

  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent 'e' at the end
  if (word.endsWith('e') && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

/**
 * Hook Categories for Description Opening Hook Strength
 *
 * Phase 10: Category-based hook scoring with vertical-specific weight multipliers
 */
interface HookCategory {
  keywords: string[];
  weight: number;
}

type HookCategoryType =
  | 'learning_educational'
  | 'outcome_benefit'
  | 'status_authority'
  | 'ease_of_use'
  | 'time_to_result'
  | 'trust_safety';

const DEFAULT_HOOK_CATEGORIES: Record<HookCategoryType, HookCategory> = {
  learning_educational: {
    keywords: ['learn', 'master', 'study', 'practice', 'discover', 'understand', 'improve', 'develop'],
    weight: 1.0
  },
  outcome_benefit: {
    keywords: ['achieve', 'unlock', 'transform', 'gain', 'revolutionize', 'experience', 'reach', 'attain'],
    weight: 1.0
  },
  status_authority: {
    keywords: ['#1', 'leading', 'trusted', 'award', 'top', 'best', 'rated', 'proven'],
    weight: 0.9
  },
  ease_of_use: {
    keywords: ['easy', 'simple', 'quick', 'fast', 'effortless', 'straightforward', 'intuitive'],
    weight: 0.8
  },
  time_to_result: {
    keywords: ['instant', 'today', 'now', 'minutes', 'immediately', 'quickly', 'rapid'],
    weight: 0.7
  },
  trust_safety: {
    keywords: ['secure', 'safe', 'protected', 'guaranteed', 'privacy', 'trusted', 'reliable'],
    weight: 0.8
  }
};

/**
 * Calculate hook strength score using category-based weighted scoring
 *
 * Phase 10: Replaces binary hook detection with multi-category weighted system
 *
 * @param text - Text to analyze (typically first paragraph)
 * @param activeRuleSet - Optional merged rule set with vertical-specific hook overrides
 * @returns Hook score (0-100) and matched categories
 */
function calculateHookScore(
  text: string,
  activeRuleSet?: MergedRuleSet
): { score: number; matchedCategories: string[]; totalWeight: number } {
  const textLower = text.toLowerCase();
  const matchedCategories: string[] = [];
  let totalWeight = 0;

  // Apply vertical-specific multipliers to base weights
  const categories = { ...DEFAULT_HOOK_CATEGORIES };
  if (activeRuleSet?.hookOverrides) {
    Object.entries(activeRuleSet.hookOverrides).forEach(([category, multiplier]) => {
      if (categories[category as HookCategoryType]) {
        categories[category as HookCategoryType].weight *= multiplier;

        // Log override usage (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Hook Scoring] Category "${category}" weight multiplied by ${multiplier} (vertical: ${activeRuleSet.verticalId})`);
        }
      }
    });
  }

  // Check each category for keyword matches
  Object.entries(categories).forEach(([categoryName, category]) => {
    const hasMatch = category.keywords.some(keyword => textLower.includes(keyword));
    if (hasMatch) {
      matchedCategories.push(categoryName);
      totalWeight += category.weight;
    }
  });

  // Calculate score: base 30 + (totalWeight * 35) capped at 100
  // - No matches: 30
  // - 1 category (weight 1.0): 65
  // - 2 categories (weight 2.0): 100
  const baseScore = 30;
  const weightedBonus = Math.min(70, totalWeight * 35);
  const score = Math.min(100, baseScore + weightedBonus);

  return { score, matchedCategories, totalWeight };
}

/**
 * METADATA SCORING REGISTRY
 *
 * Based on existing metadata-scoring module logic with additions from Element Analysis.
 */
export const METADATA_SCORING_REGISTRY: ElementConfig[] = [
  // ===================================================================
  // TITLE (Primary ASO Ranking Factor)
  // ===================================================================
  {
    element: 'title',
    maxCharacters: 30,
    weight: 0.65,  // 65% of overall ASO score (primary ranking factor)
    rules: [
      {
        id: 'title_character_usage',
        name: 'Character Usage Efficiency',
        description: 'Measures how well the title uses available character space',
        weight: 0.25,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('title_character_usage', ctx.activeRuleSet);
          const effectiveWeight = ruleConfig?.weight ?? 0.25;

          const charCount = text.length;
          const maxChars = 30;
          const usagePercent = (charCount / maxChars) * 100;

          // Use thresholds from Bible if available
          const thresholdLow = ruleConfig?.threshold_low ?? 70;
          const thresholdHigh = ruleConfig?.threshold_high ?? 100;

          let score = 0;
          if (usagePercent < 50) score = 40;
          else if (usagePercent < thresholdLow) score = 60;
          else if (usagePercent < 90) score = 85;
          else if (usagePercent <= thresholdHigh) score = 100;
          else score = 0; // Over limit

          return {
            ruleId: 'title_character_usage',
            passed: usagePercent >= thresholdLow && usagePercent <= thresholdHigh,
            score,
            message: `Using ${charCount}/${maxChars} characters (${Math.round(usagePercent)}%)`,
            evidence: []
          };
        }
      },
      {
        id: 'title_unique_keywords',
        name: 'Unique Keyword Density',
        description: 'Evaluates meaningful keyword coverage with semantic relevance weighting',
        weight: 0.30,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('title_unique_keywords', ctx.activeRuleSet);

          const analysis = analyzeText(text, ctx.stopwords);
          const keywords = analysis.keywords;

          // Filter to only relevance >= 1 (exclude level 0 tokens)
          const relevantKeywords = keywords.filter(k => getTokenRelevance(k, ctx.activeRuleSet) >= 1);
          const uniqueRelevant = new Set(relevantKeywords);

          // Calculate relevance-weighted score
          const avgRelevance = relevantKeywords.length > 0
            ? relevantKeywords.reduce((sum, k) => sum + getTokenRelevance(k, ctx.activeRuleSet), 0) / relevantKeywords.length
            : 0;

          // Base score from keyword count, boosted by average relevance
          const baseScore = Math.min(80, uniqueRelevant.size * 20);
          const relevanceBonus = avgRelevance * 10; // Up to +30 for level 3 tokens
          const score = Math.min(100, baseScore + relevanceBonus);

          return {
            ruleId: 'title_unique_keywords',
            passed: uniqueRelevant.size >= 2,
            score,
            message: `${uniqueRelevant.size} unique keywords (avg relevance: ${avgRelevance.toFixed(1)})`,
            evidence: Array.from(uniqueRelevant)
          };
        }
      },
      {
        id: 'title_combo_coverage',
        name: 'Keyword Combination Coverage',
        description: 'Evaluates multi-word keyword combinations (2-4 words)',
        weight: 0.30,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('title_combo_coverage', ctx.activeRuleSet);

          const tokens = tokenizeForASO(text);
          const comboAnalysis = analyzeCombinations(tokens, ctx.stopwords, 2, 4);
          const comboCount = comboAnalysis.meaningfulCombos.length;

          let score = 0;
          if (comboCount === 0) score = 20;
          else if (comboCount <= 2) score = 50;
          else if (comboCount <= 5) score = 75;
          else score = 90;

          return {
            ruleId: 'title_combo_coverage',
            passed: comboCount >= 2,
            score,
            message: `${comboCount} meaningful keyword combinations`,
            evidence: comboAnalysis.meaningfulCombos.slice(0, 5)
          };
        }
      },
      {
        id: 'title_filler_penalty',
        name: 'Filler Token Penalty',
        description: 'Penalizes excessive use of stopwords and generic terms using noise ratio',
        weight: 0.15,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('title_filler_penalty', ctx.activeRuleSet);

          const analysis = analyzeText(text, ctx.stopwords);
          const noiseRatio = analysis.noiseRatio;
          const ignoredCount = analysis.ignored.length;

          let penalty = 0;
          if (noiseRatio > 0.5) penalty = 30;
          else if (noiseRatio > 0.3) penalty = 15;

          const score = Math.max(0, 100 - penalty);

          return {
            ruleId: 'title_filler_penalty',
            passed: noiseRatio <= 0.3,
            score,
            penalty,
            message: `${ignoredCount} filler tokens (${Math.round(noiseRatio * 100)}% noise ratio)`,
            evidence: analysis.ignored
          };
        }
      }
    ]
  },

  // ===================================================================
  // SUBTITLE (Secondary ASO Ranking Factor)
  // ===================================================================
  {
    element: 'subtitle',
    maxCharacters: 30,
    weight: 0.35,  // 35% of overall ASO score (will be 20% when keyword field is added at 15%)
    rules: [
      {
        id: 'subtitle_character_usage',
        name: 'Character Usage Efficiency',
        description: 'Measures how well the subtitle uses available character space',
        weight: 0.20,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('subtitle_character_usage', ctx.activeRuleSet);
          const thresholdLow = ruleConfig?.threshold_low ?? 70;
          const thresholdHigh = ruleConfig?.threshold_high ?? 100;

          const charCount = text.length;
          const maxChars = 30;
          const usagePercent = charCount > 0 ? (charCount / maxChars) * 100 : 0;

          let score = 0;
          if (charCount === 0) score = 0;
          else if (usagePercent < 50) score = 40;
          else if (usagePercent < thresholdLow) score = 60;
          else if (usagePercent < 90) score = 85;
          else if (usagePercent <= thresholdHigh) score = 100;
          else score = 0;

          return {
            ruleId: 'subtitle_character_usage',
            passed: usagePercent >= thresholdLow && usagePercent <= thresholdHigh,
            score,
            message: charCount > 0
              ? `Using ${charCount}/${maxChars} characters (${Math.round(usagePercent)}%)`
              : 'No subtitle set',
            evidence: []
          };
        }
      },
      {
        id: 'subtitle_incremental_value',
        name: 'Incremental Value',
        description: 'Measures how much NEW high-value information subtitle adds vs title',
        weight: 0.40,  // Highest weight - most important for subtitle
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('subtitle_incremental_value', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'subtitle_incremental_value',
              passed: false,
              score: 0,
              message: 'No subtitle provided',
              evidence: []
            };
          }

          // Get relevant title tokens (relevance >= 2)
          const titleRelevantTokens = new Set(
            ctx.titleTokens.filter(t => getTokenRelevance(t, ctx.activeRuleSet) >= 2)
          );

          // Analyze subtitle
          const analysis = analyzeText(text, ctx.stopwords);
          const subtitleKeywords = analysis.keywords;

          // Count only high-value NEW keywords (relevance >= 2, not in title)
          const newHighValueTokens = subtitleKeywords.filter(t => {
            const relevance = getTokenRelevance(t, ctx.activeRuleSet);
            return relevance >= 2 && !titleRelevantTokens.has(t);
          });

          // Calculate score based on high-value incremental keywords
          const incrementalCount = newHighValueTokens.length;
          let score = 0;
          if (incrementalCount === 0) score = 20;
          else if (incrementalCount === 1) score = 50;
          else if (incrementalCount === 2) score = 75;
          else if (incrementalCount >= 3) score = 95;

          return {
            ruleId: 'subtitle_incremental_value',
            passed: incrementalCount >= 2,
            score,
            message: `${incrementalCount} new high-value keywords`,
            evidence: newHighValueTokens
          };
        }
      },
      {
        id: 'subtitle_combo_coverage',
        name: 'New Combination Coverage',
        description: 'Evaluates NEW multi-word combinations vs title',
        weight: 0.25,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('subtitle_combo_coverage', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'subtitle_combo_coverage',
              passed: false,
              score: 0,
              message: 'No subtitle provided',
              evidence: []
            };
          }

          const titleComboAnalysis = analyzeCombinations(ctx.titleTokens, ctx.stopwords, 2, 4);
          const titleComboSet = new Set(titleComboAnalysis.meaningfulCombos);

          const combinedTokens = [...ctx.titleTokens, ...ctx.subtitleTokens];
          const combinedComboAnalysis = analyzeCombinations(combinedTokens, ctx.stopwords, 2, 4);
          const newCombos = combinedComboAnalysis.meaningfulCombos.filter(c => !titleComboSet.has(c));

          const newComboCount = newCombos.length;

          let score = 0;
          if (newComboCount === 0) score = 20;
          else if (newComboCount <= 2) score = 50;
          else if (newComboCount <= 5) score = 80;
          else score = 95;

          return {
            ruleId: 'subtitle_combo_coverage',
            passed: newComboCount >= 2,
            score,
            message: `${newComboCount} new keyword combinations`,
            evidence: newCombos.slice(0, 5)
          };
        }
      },
      {
        id: 'subtitle_complementarity',
        name: 'Title Complementarity',
        description: 'Ensures subtitle complements (not duplicates) title based on relevant tokens',
        weight: 0.15,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('subtitle_complementarity', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'subtitle_complementarity',
              passed: false,
              score: 0,
              message: 'No subtitle provided',
              evidence: []
            };
          }

          // Get relevant title tokens (relevance >= 2)
          const titleRelevantTokens = new Set(
            ctx.titleTokens.filter(t => getTokenRelevance(t, ctx.activeRuleSet) >= 2)
          );

          // Get relevant subtitle tokens
          const analysis = analyzeText(text, ctx.stopwords);
          const subtitleRelevantTokens = analysis.keywords.filter(t => getTokenRelevance(t, ctx.activeRuleSet) >= 2);

          // Calculate overlap of relevant tokens only
          const overlapTokens = subtitleRelevantTokens.filter(t => titleRelevantTokens.has(t));
          const overlapRatio = subtitleRelevantTokens.length > 0
            ? overlapTokens.length / subtitleRelevantTokens.length
            : 0;

          // Less overlap = better complementarity
          const score = Math.max(0, (1 - overlapRatio) * 100);

          return {
            ruleId: 'subtitle_complementarity',
            passed: overlapRatio < 0.4,
            score,
            message: overlapRatio < 0.3
              ? 'Excellent complementarity with title'
              : overlapRatio < 0.5
              ? 'Good complementarity'
              : 'Too much overlap with title',
            evidence: overlapTokens
          };
        }
      }
    ]
  },

  // ===================================================================
  // DESCRIPTION (Conversion Intelligence - NOT ASO Ranking)
  // ===================================================================
  {
    element: 'description',
    maxCharacters: 4000,
    weight: 0.00,  // 0% ASO weight - description does NOT influence App Store ranking, only conversion
    rules: [
      {
        id: 'description_hook_strength',
        name: 'Opening Hook Strength',
        description: 'Evaluates the first paragraph\'s ability to capture attention using category-based weighted scoring',
        weight: 0.30,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('description_hook_strength', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'description_hook_strength',
              passed: false,
              score: 0,
              message: 'No description provided',
              evidence: []
            };
          }

          const firstParagraph = text.split('\n')[0] || '';
          const firstSentence = firstParagraph.split('.')[0] || '';

          // Phase 10: Category-based hook scoring with vertical-specific weights
          const hookResult = calculateHookScore(firstParagraph, ctx.activeRuleSet);

          // Bonus for strong opening sentence length
          const hasStrongOpening = firstSentence.length >= 50 && firstSentence.length <= 150;
          const lengthBonus = hasStrongOpening ? 10 : 0;

          // Final score with length bonus
          const finalScore = Math.min(100, hookResult.score + lengthBonus);

          // Build message based on matched categories
          let message: string;
          if (hookResult.matchedCategories.length === 0) {
            message = 'Consider adding compelling hook words in first sentence';
          } else if (hookResult.matchedCategories.length === 1) {
            message = `Good opening hook (${hookResult.matchedCategories[0]})`;
          } else {
            message = `Strong opening hook (${hookResult.matchedCategories.length} categories: ${hookResult.matchedCategories.join(', ')})`;
          }

          return {
            ruleId: 'description_hook_strength',
            passed: finalScore >= 60,
            score: finalScore,
            message,
            evidence: hookResult.matchedCategories
          };
        }
      },
      {
        id: 'description_feature_mentions',
        name: 'Feature Mentions',
        description: 'Counts explicit feature/benefit mentions',
        weight: 0.25,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('description_feature_mentions', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'description_feature_mentions',
              passed: false,
              score: 0,
              message: 'No description provided',
              evidence: []
            };
          }

          const featureCount = (text.match(/\b(feature|tool|function|capability|benefit)\b/gi) || []).length;
          const score = Math.min(100, featureCount * 15);

          return {
            ruleId: 'description_feature_mentions',
            passed: featureCount >= 3,
            score,
            message: `${featureCount} feature mention${featureCount !== 1 ? 's' : ''}`,
            evidence: []
          };
        }
      },
      {
        id: 'description_cta_strength',
        name: 'Call-to-Action Strength',
        description: 'Evaluates presence of conversion-focused CTAs',
        weight: 0.20,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('description_cta_strength', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'description_cta_strength',
              passed: false,
              score: 0,
              message: 'No description provided',
              evidence: []
            };
          }

          const ctaVerbs = ctx.semanticRules.cta_verbs || ['download', 'try', 'start', 'get', 'join', 'subscribe'];
          const lowerText = text.toLowerCase();
          const foundCtas = ctaVerbs.filter(v => lowerText.includes(v.toLowerCase()));

          const score = Math.min(100, foundCtas.length * 25);

          return {
            ruleId: 'description_cta_strength',
            passed: foundCtas.length >= 2,
            score,
            message: `${foundCtas.length} CTA${foundCtas.length !== 1 ? 's' : ''} detected`,
            evidence: foundCtas
          };
        }
      },
      {
        id: 'description_readability',
        name: 'Readability Score',
        description: 'Flesch-Kincaid Reading Ease (0-100, higher is better)',
        weight: 0.25,
        evaluator: async (text, ctx) => {
          // Phase 15.7: Try Bible first, fallback to code default
          const ruleConfig = await getRuleConfig('description_readability', ctx.activeRuleSet);
          if (!text || text.length === 0) {
            return {
              ruleId: 'description_readability',
              passed: false,
              score: 0,
              message: 'No description provided',
              evidence: []
            };
          }

          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const words = text.split(/\s+/).filter(w => w.length > 0);

          if (sentences.length === 0 || words.length === 0) {
            return {
              ruleId: 'description_readability',
              passed: false,
              score: 0,
              message: 'Insufficient content for readability analysis',
              evidence: []
            };
          }

          const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
          const avgWordsPerSentence = words.length / sentences.length;
          const avgSyllablesPerWord = syllables / words.length;

          // Flesch Reading Ease formula
          const readingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
          const score = Math.max(0, Math.min(100, Math.round(readingEase)));

          let readabilityLevel = 'Difficult';
          if (score >= 80) readabilityLevel = 'Very easy';
          else if (score >= 60) readabilityLevel = 'Easy';
          else if (score >= 40) readabilityLevel = 'Moderate';

          return {
            ruleId: 'description_readability',
            passed: score >= 60,
            score,
            message: `Flesch-Kincaid: ${score}/100 (${readabilityLevel})`,
            evidence: []
          };
        }
      }
    ]
  }
];
