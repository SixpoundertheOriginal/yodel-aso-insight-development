/**
 * Enhanced Combination Analysis Service
 *
 * Main orchestration service that integrates all Phase 2 intelligence layers:
 * - Canonicalization & deduplication
 * - Multi-dimensional classification
 * - Impact scoring
 * - Redundancy detection
 * - Opportunity identification
 */

import { tokenize } from '../utils/tokenizer';
import { analyzeCombinations, findIncrementalCombinations } from '../utils/ngram';
import { dedupeCombos } from '../utils/comboDedupe';
import {
  classifyByLength,
  classifyByBrandPresence,
  classifyByCategoryPresence,
  classifyByBenefitPresence,
  classifyByVerbPresence,
  classifyByTimeHint,
  classifyByFillerRatio,
  classifyIntent
} from '../utils/comboClassifier';
import { calculateComboImpact, calculateAvgImpactFromScores } from '../utils/comboImpact';
import { findRedundantCombos } from '../utils/comboRedundancy';
import { identifyOpportunities } from './comboOpportunityService';
import {
  getMetadataScoringConfig,
  getStopwords,
  getSemanticRules
} from './configLoader';
import type { ComboAnalysisEnhanced, ClassifiedCombo, IntentType } from '../types';

/**
 * Analyzes combinations with advanced intelligence
 *
 * Processing pipeline:
 * 1. Tokenize title and subtitle
 * 2. Generate combinations using existing ngram utilities
 * 3. Deduplicate using canonical comparison
 * 4. Classify each combo (length, intent, semantic features)
 * 5. Score each combo for impact
 * 6. Detect redundancy patterns
 * 7. Identify opportunities
 * 8. Calculate aggregate metrics
 *
 * @param title - App title
 * @param subtitle - App subtitle
 * @param options - Optional configuration
 * @param options.source - Source of metadata ('live' | 'cache'). Used for tracking determinism.
 * @returns ComboAnalysisEnhanced with classified combos, metrics, and insights
 */
export function analyzeEnhancedCombinations(
  title: string,
  subtitle: string,
  options?: {
    source?: 'live' | 'cache';
  }
): ComboAnalysisEnhanced {
  const source = options?.source || 'live';
  // Load configuration
  const config = getMetadataScoringConfig();
  const stopwords = getStopwords();
  const semanticRules = getSemanticRules();

  const categoryKeywords = semanticRules.category_keywords || [];
  const benefitKeywords = semanticRules.benefit_keywords || [];
  const ctaVerbs = semanticRules.cta_verbs || [];
  const timeKeywords = semanticRules.time_keywords || [];

  // Step 1: Tokenize
  const titleTokens = tokenize(title);
  const subtitleTokens = tokenize(subtitle);
  const combinedTokens = [...titleTokens, ...subtitleTokens];

  // Step 2: Generate combinations
  const titleAnalysis = analyzeCombinations(
    titleTokens,
    stopwords,
    config.combos.min_ngram,
    config.combos.max_ngram
  );

  const combinedAnalysis = analyzeCombinations(
    combinedTokens,
    stopwords,
    config.combos.min_ngram,
    config.combos.max_ngram
  );

  // Find incremental combinations from subtitle
  const incrementalCombos = findIncrementalCombinations(
    titleTokens,
    subtitleTokens,
    titleAnalysis.meaningfulCombos,
    combinedTokens,
    stopwords,
    config.combos.min_ngram,
    config.combos.max_ngram
  );

  const newComboSet = new Set(incrementalCombos);

  // Step 3: Deduplicate
  const allMeaningfulCombos = dedupeCombos(combinedAnalysis.meaningfulCombos);

  // Step 4: Detect redundancy
  const redundancyAnalysis = findRedundantCombos(allMeaningfulCombos);
  const redundantComboSet = new Set<string>();
  redundancyAnalysis.redundantGroups.forEach(group => {
    group.combos.forEach(combo => redundantComboSet.add(combo));
  });

  // Determine brand token (first title token with length > 2)
  const brandToken = titleTokens.find(t => t.length > 2) || '';

  // Step 5: Classify and score each combo
  const classifiedCombos: ClassifiedCombo[] = allMeaningfulCombos.map(combo => {
    // Classification
    const length = classifyByLength(combo);
    const intent = classifyIntent(
      combo,
      brandToken,
      categoryKeywords,
      ctaVerbs,
      stopwords
    );

    const hasBrand = classifyByBrandPresence(combo, brandToken);
    const hasCategory = classifyByCategoryPresence(combo, categoryKeywords);
    const hasBenefit = classifyByBenefitPresence(combo, benefitKeywords);
    const hasVerb = classifyByVerbPresence(combo, ctaVerbs);
    const hasTimeHint = classifyByTimeHint(combo, timeKeywords);
    const fillerRatio = classifyByFillerRatio(combo, stopwords);

    // Impact scoring
    const impactResult = calculateComboImpact(
      combo,
      categoryKeywords,
      benefitKeywords,
      ctaVerbs,
      stopwords,
      combinedTokens
    );

    // Flags
    const isNew = newComboSet.has(combo);
    const isRedundant = redundantComboSet.has(combo);

    return {
      combo,
      length,
      intent,
      hasBrand,
      hasCategory,
      hasBenefit,
      hasVerb,
      hasTimeHint,
      fillerRatio,
      impactScore: impactResult.score,
      isNew,
      isRedundant
    };
  });

  // Step 6: Calculate aggregate metrics

  // Long-tail strength: avg impact of 4-word combos
  const longTailCombos = classifiedCombos.filter(c => c.length === 'long-tail');
  const longTailStrength = longTailCombos.length > 0
    ? calculateAvgImpactFromScores(longTailCombos.map(c => c.impactScore))
    : 0;

  // Intent diversity: coverage of intent types (0-100)
  const intentTypes = new Set<IntentType>(classifiedCombos.map(c => c.intent));
  const intentDiversity = Math.round((intentTypes.size / 4) * 100); // 4 possible intents

  // Category coverage: % combos with category keyword
  const categoryCount = classifiedCombos.filter(c => c.hasCategory).length;
  const categoryCoverage = classifiedCombos.length > 0
    ? Math.round((categoryCount / classifiedCombos.length) * 100)
    : 0;

  // Redundancy index: from redundancy analysis
  const redundancyIndex = redundancyAnalysis.redundancyScore;

  // Avg filler ratio: average across all combos
  const totalFillerRatio = classifiedCombos.reduce((sum, c) => sum + c.fillerRatio, 0);
  const avgFillerRatio = classifiedCombos.length > 0
    ? totalFillerRatio / classifiedCombos.length
    : 0;

  // Step 7: Identify opportunities
  const insights = identifyOpportunities(
    titleTokens,
    subtitleTokens,
    allMeaningfulCombos,
    categoryKeywords,
    benefitKeywords,
    ctaVerbs,
    timeKeywords
  );

  return {
    combos: classifiedCombos,
    metrics: {
      longTailStrength,
      intentDiversity,
      categoryCoverage,
      redundancyIndex,
      avgFillerRatio
    },
    insights
  };
}
