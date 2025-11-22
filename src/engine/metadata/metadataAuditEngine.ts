/**
 * Metadata Audit Engine
 *
 * Evaluates app metadata using the centralized scoring registry.
 * Pure TypeScript, deterministic, no AI calls.
 */

import type { ScrapedMetadata } from '@/types/aso';
import { tokenizeForASO, filterStopwords, analyzeText } from './tokenization';
import { analyzeCombinations } from '@/modules/metadata-scoring/utils/ngram';
import { generateEnhancedCombos, filterLowValueCombos, separateCombosBySource } from '@/modules/metadata-scoring/utils/comboEngineV2';
import { getStopwords, getSemanticRules } from '@/modules/metadata-scoring/services/configLoader';
import { BenchmarkRegistryService } from '@/services/benchmark-registry.service';
import { BrandIntelligenceService } from '@/services/brand-intelligence.service';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import {
  METADATA_SCORING_REGISTRY,
  type MetadataElement,
  type EvaluationContext,
  type ElementScoringResult,
  type UnifiedMetadataAuditResult,
  type RuleEvaluationResult
} from './metadataScoringRegistry';
import { generateEnhancedRecommendations, type RecommendationSignals } from './utils/recommendationEngineV2';

/**
 * Lightweight semantic relevance scoring for tokens (exported for use in registry)
 *
 * @param token - Token to evaluate
 * @returns Relevance score (0-3)
 *   3 = Languages, core intent verbs (learn, speak, study, master)
 *   2 = Strong domain nouns (lessons, courses, grammar, vocabulary)
 *   1 = Neutral but valid words
 *   0 = Numeric/time-only, generic adjectives, low-value tokens
 */
export function getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Level 0: Low-value tokens (numeric, time-bound, generic adjectives)
  const lowValuePatterns = /^(best|top|great|good|new|latest|free|premium|pro|plus|lite|\d+|one|two|three)$/i;
  if (lowValuePatterns.test(tokenLower)) {
    return 0;
  }

  // Level 3: Languages and core intent verbs
  const languages = /^(english|spanish|french|german|italian|chinese|japanese|korean|portuguese|russian|arabic|hindi|mandarin)$/i;
  const coreIntentVerbs = /^(learn|speak|study|master|practice|improve|understand|read|write|listen|teach)$/i;
  if (languages.test(tokenLower) || coreIntentVerbs.test(tokenLower)) {
    return 3;
  }

  // Level 2: Strong domain nouns
  const domainNouns = /^(lesson|lessons|course|courses|class|classes|grammar|vocabulary|pronunciation|conversation|fluency|language|languages|learning|app|application|tutorial|training|education|skill|skills|method|techniques|guide)$/i;
  if (domainNouns.test(tokenLower)) {
    return 2;
  }

  // Level 1: Everything else (neutral but valid)
  return 1;
}

export class MetadataAuditEngine {
  /**
   * Lightweight semantic relevance scoring for tokens
   * (Delegates to exported function for use in registry)
   */
  static getTokenRelevance(token: string): 0 | 1 | 2 | 3 {
    return getTokenRelevance(token);
  }

  /**
   * Evaluates all metadata elements and returns unified audit result
   *
   * @param metadata - Scraped app metadata from orchestrator
   * @param options - Optional evaluation options
   * @returns Unified metadata audit result
   */
  static evaluate(
    metadata: ScrapedMetadata,
    options?: {
      competitorData?: any[];
    }
  ): UnifiedMetadataAuditResult {
    // Load configuration
    const stopwordsData = getStopwords();
    const stopwords = new Set(stopwordsData.stopwords || []);
    const semanticRules = getSemanticRules();

    // Tokenize all elements upfront using ASO-aware tokenizer
    const titleTokens = tokenizeForASO(metadata.title || '');
    const subtitleTokens = tokenizeForASO(metadata.subtitle || '');
    const descriptionTokens = tokenizeForASO(metadata.description || '');

    // Build evaluation context (shared across all rules)
    const context: EvaluationContext = {
      metadata,
      competitorData: options?.competitorData,
      category: metadata.applicationCategory,
      titleTokens,
      subtitleTokens,
      descriptionTokens,
      stopwords,
      semanticRules: {
        category_keywords: semanticRules.category_keywords || [],
        benefit_keywords: semanticRules.benefit_keywords || [],
        cta_verbs: semanticRules.cta_verbs || [],
        time_keywords: semanticRules.time_keywords || [],
        positive_patterns: semanticRules.positive_patterns || [],
        negative_patterns: semanticRules.negative_patterns || []
      }
    };

    // Evaluate each element
    const elementResults: Record<MetadataElement, ElementScoringResult> = {
      title: this.evaluateElement('title', metadata.title || '', context),
      subtitle: this.evaluateElement('subtitle', metadata.subtitle || '', context),
      description: this.evaluateElement('description', metadata.description || '', context)
    };

    // Calculate weighted overall score (RANKING elements only: title + subtitle)
    const overallScore = this.calculateOverallScore(elementResults);

    // Build conversion insights from description
    const conversionInsights = this.buildConversionInsights(elementResults.description);

    // Keyword coverage analysis
    const keywordCoverage = this.analyzeKeywordCoverage(
      titleTokens,
      subtitleTokens,
      descriptionTokens,
      stopwords
    );

    // Combo coverage analysis
    const comboCoverage = this.analyzeComboCoverage(
      titleTokens,
      subtitleTokens,
      stopwords,
      metadata  // Pass metadata for brand intelligence (Phase 5)
    );

    // Generate enhanced recommendations using V2 engine
    const recommendations = this.generateRecommendationsV2(
      elementResults,
      keywordCoverage,
      comboCoverage,
      conversionInsights
    );
    const topRecommendations = recommendations.rankingRecommendations;
    const conversionRecommendations = recommendations.conversionRecommendations;

    return {
      overallScore,
      elements: elementResults,
      topRecommendations,
      conversionRecommendations,
      keywordCoverage,
      comboCoverage,
      conversionInsights
    };
  }

  /**
   * Evaluates a single element using its registered rules
   */
  private static evaluateElement(
    element: MetadataElement,
    text: string,
    context: EvaluationContext
  ): ElementScoringResult {
    const config = METADATA_SCORING_REGISTRY.find(c => c.element === element);
    if (!config) {
      throw new Error(`No config found for element: ${element}`);
    }

    // Evaluate all rules
    const ruleResults: RuleEvaluationResult[] = config.rules.map(rule => {
      try {
        return rule.evaluator(text, context);
      } catch (error) {
        console.error(`[MetadataAuditEngine] Rule ${rule.id} failed:`, error);
        return {
          ruleId: rule.id,
          passed: false,
          score: 0,
          message: `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
          evidence: []
        };
      }
    });

    // Calculate weighted element score
    const score = ruleResults.reduce((total, result, index) => {
      const ruleWeight = config.rules[index].weight;
      return total + (result.score * ruleWeight);
    }, 0);

    // Extract recommendations from failed rules
    const recommendations = ruleResults
      .filter(r => !r.passed)
      .map(r => r.message);

    // Extract insights from passed rules
    const insights = ruleResults
      .filter(r => r.passed && r.evidence && r.evidence.length > 0)
      .map(r => r.message);

    // Metadata aggregation with noise metrics
    const textAnalysis = analyzeText(text, context.stopwords);
    const tokens = tokenizeForASO(text);
    const combos = this.extractCombos(tokens, context.stopwords);

    // Benchmark comparison
    const benchmarkComparison = context.category
      ? BenchmarkRegistryService.compareToCategory(context.category, element, Math.round(score))
      : undefined;

    return {
      element,
      score: Math.round(score),
      ruleResults,
      recommendations,
      insights,
      metadata: {
        characterUsage: text.length,
        maxCharacters: config.maxCharacters,
        keywords: textAnalysis.keywords,
        combos,
        ignoredKeywords: textAnalysis.ignored,
        noiseRatio: textAnalysis.noiseRatio,
        benchmarkComparison
      }
    };
  }

  /**
   * Calculates weighted overall metadata score
   */
  private static calculateOverallScore(
    elementResults: Record<MetadataElement, ElementScoringResult>
  ): number {
    const weightedSum = METADATA_SCORING_REGISTRY.reduce((total, config) => {
      const elementResult = elementResults[config.element];
      return total + (elementResult.score * config.weight);
    }, 0);

    return Math.round(weightedSum);
  }

  /**
   * Aggregates top recommendations across all elements
   * @deprecated Use aggregateRankingRecommendations or aggregateConversionRecommendations instead
   */
  private static aggregateTopRecommendations(
    elementResults: Record<MetadataElement, ElementScoringResult>
  ): string[] {
    const allRecommendations: Array<{ element: MetadataElement; message: string; priority: number }> = [];

    Object.entries(elementResults).forEach(([element, result]) => {
      result.recommendations.forEach(rec => {
        // Priority: Lower score = higher priority
        const priority = 100 - result.score;
        allRecommendations.push({
          element: element as MetadataElement,
          message: `[${element.toUpperCase()}] ${rec}`,
          priority
        });
      });
    });

    // Sort by priority (highest first) and take top 5
    return allRecommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(r => r.message);
  }

  /**
   * Generates recommendations using V2 engine (strategic, consultant-style)
   */
  private static generateRecommendationsV2(
    elementResults: Record<MetadataElement, ElementScoringResult>,
    keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'],
    comboCoverage: UnifiedMetadataAuditResult['comboCoverage'],
    conversionInsights: UnifiedMetadataAuditResult['conversionInsights']
  ): {
    rankingRecommendations: string[];
    conversionRecommendations: string[];
  } {
    // Extract keyword counts with relevance filtering
    const titleKeywords = keywordCoverage.titleKeywords;
    const subtitleKeywords = keywordCoverage.subtitleNewKeywords;

    const titleHighValueKeywords = titleKeywords.filter(k => getTokenRelevance(k) >= 2);
    const subtitleHighValueKeywords = subtitleKeywords.filter(k => getTokenRelevance(k) >= 2);

    // Extract noise ratios from rule results
    const titleFillerRule = elementResults.title.ruleResults.find(r => r.ruleId === 'title_filler_penalty');
    const subtitleFillerRule = elementResults.subtitle.ruleResults.find(r => r.ruleId === 'subtitle_filler_penalty');

    const titleNoiseRatio = titleFillerRule?.evidence
      ? titleFillerRule.evidence.length / (titleKeywords.length + titleFillerRule.evidence.length)
      : undefined;
    const subtitleNoiseRatio = subtitleFillerRule?.evidence
      ? subtitleFillerRule.evidence.length / (subtitleKeywords.length + subtitleFillerRule.evidence.length)
      : undefined;

    // Extract combo data
    const allCombos = [
      ...(comboCoverage.titleCombosClassified || []),
      ...(comboCoverage.subtitleNewCombosClassified || [])
    ];
    const brandedCombos = allCombos.filter(c => c.type === 'branded');
    const genericCombos = allCombos.filter(c => c.type === 'generic');
    const lowValueCombos = comboCoverage.lowValueCombos || [];

    // Build signals for recommendation engine
    const signals: RecommendationSignals = {
      titleResult: elementResults.title,
      subtitleResult: elementResults.subtitle,
      descriptionResult: elementResults.description,
      titleKeywordCount: titleKeywords.length,
      subtitleKeywordCount: subtitleKeywords.length,
      titleHighValueKeywordCount: titleHighValueKeywords.length,
      subtitleHighValueKeywordCount: subtitleHighValueKeywords.length,
      titleNoiseRatio,
      subtitleNoiseRatio,
      brandedCombos,
      genericCombos,
      lowValueCombos,
      descriptionHookStrength: conversionInsights.description.hookStrength,
      descriptionFeatureMentions: conversionInsights.description.featureMentions,
      descriptionReadability: conversionInsights.description.readability,
      descriptionCtaStrength: conversionInsights.description.ctaStrength
    };

    return generateEnhancedRecommendations(signals);
  }

  /**
   * Builds conversion insights from description evaluation
   */
  private static buildConversionInsights(
    descriptionResult: ElementScoringResult
  ): UnifiedMetadataAuditResult['conversionInsights'] {
    // Extract rule scores for conversion metrics
    const hookRule = descriptionResult.ruleResults.find(r => r.ruleId === 'description_hook_strength');
    const featureRule = descriptionResult.ruleResults.find(r => r.ruleId === 'description_feature_mentions');
    const ctaRule = descriptionResult.ruleResults.find(r => r.ruleId === 'description_cta_strength');
    const readabilityRule = descriptionResult.ruleResults.find(r => r.ruleId === 'description_readability');

    return {
      description: {
        score: descriptionResult.score,
        readability: readabilityRule?.score || 0,
        hookStrength: hookRule?.score || 0,
        featureMentions: featureRule?.score || 0,
        ctaStrength: ctaRule?.score || 0,
        noiseRatio: descriptionResult.metadata.noiseRatio || 0,
        recommendations: descriptionResult.recommendations
      }
    };
  }

  /**
   * Analyzes keyword coverage across all text elements
   */
  private static analyzeKeywordCoverage(
    titleTokens: string[],
    subtitleTokens: string[],
    descriptionTokens: string[],
    stopwords: Set<string>
  ): {
    totalUniqueKeywords: number;
    titleKeywords: string[];
    subtitleNewKeywords: string[];
    descriptionNewKeywords: string[];
    titleIgnoredCount?: number;
    subtitleIgnoredCount?: number;
    descriptionIgnoredCount?: number;
  } {
    // Filter out stopwords and short tokens
    const titleKeywords = titleTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const titleIgnoredCount = titleTokens.length - titleKeywords.length;
    const titleKeywordSet = new Set(titleKeywords);

    const subtitleKeywords = subtitleTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const subtitleIgnoredCount = subtitleTokens.length - subtitleKeywords.length;
    const subtitleNewKeywords = subtitleKeywords.filter(t => !titleKeywordSet.has(t));

    const allTitleSubtitleSet = new Set([...titleKeywords, ...subtitleKeywords]);
    const descriptionKeywords = descriptionTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const descriptionIgnoredCount = descriptionTokens.length - descriptionKeywords.length;
    const descriptionNewKeywords = descriptionKeywords.filter(t => !allTitleSubtitleSet.has(t));

    const allUniqueKeywords = new Set([...titleKeywords, ...subtitleKeywords, ...descriptionKeywords]);

    // Sort keywords by relevance score (descending)
    const sortByRelevance = (keywords: string[]) =>
      keywords.sort((a, b) => this.getTokenRelevance(b) - this.getTokenRelevance(a));

    return {
      totalUniqueKeywords: allUniqueKeywords.size,
      titleKeywords: sortByRelevance([...titleKeywords]),
      subtitleNewKeywords: sortByRelevance([...subtitleNewKeywords]),
      descriptionNewKeywords: sortByRelevance(descriptionNewKeywords.slice(0, 20)), // Limit description keywords
      titleIgnoredCount,
      subtitleIgnoredCount,
      descriptionIgnoredCount
    };
  }

  /**
   * Classifies a combo as branded, generic, or low_value
   */
  private static classifyCombo(combo: string, titleTokens: string[]): { type: 'branded' | 'generic' | 'low_value'; relevanceScore: number } {
    const comboLower = combo.toLowerCase();
    const comboWords = comboLower.split(' ');

    // Calculate average relevance score of combo words
    const avgRelevance = comboWords.reduce((sum, word) => sum + this.getTokenRelevance(word), 0) / comboWords.length;

    // Low-value: Average relevance score is 0, or contains low-value patterns
    const lowValuePatterns = [
      /^\d+/,  // Starts with number
      /day|week|month|year|trial|limited|offer|sale|deal/i,  // Time-bound
      /new|latest|updated|version/i  // Version/update markers
    ];

    if (avgRelevance === 0 || lowValuePatterns.some(pattern => pattern.test(comboLower))) {
      return { type: 'low_value', relevanceScore: 0 };
    }

    // Branded: Contains app-specific tokens from title
    // Use first 1-2 meaningful tokens from title as brand indicators
    const brandTokens = titleTokens
      .filter(t => this.getTokenRelevance(t) >= 2)  // Only use high-relevance tokens as brand
      .slice(0, 2)
      .map(t => t.toLowerCase());
    const isBranded = comboWords.some(word => brandTokens.includes(word));

    if (isBranded) {
      return { type: 'branded', relevanceScore: 3 };
    }

    // Generic: Everything else (meaningful keyword combinations)
    // Use average relevance, capped at 2
    return { type: 'generic', relevanceScore: Math.min(2, Math.round(avgRelevance)) };
  }

  /**
   * Analyzes keyword combination coverage using Combo Engine V2
   * Features:
   * - Stopword-bridged combos ("learn the language")
   * - Cross-element combos (title + subtitle)
   * - Semantic pairing detection ("speak spanish")
   * - ASO relevance-driven generation
   * - Brand intelligence classification (Phase 5)
   */
  private static analyzeComboCoverage(
    titleTokens: string[],
    subtitleTokens: string[],
    stopwords: Set<string>,
    metadata?: ScrapedMetadata  // Optional metadata for brand intelligence (Phase 5)
  ): UnifiedMetadataAuditResult['comboCoverage'] {
    // Use V2 engine for enhanced combo generation
    const allEnhancedCombos = generateEnhancedCombos({
      titleTokens,
      subtitleTokens,
      stopwords,
      getTokenRelevance: this.getTokenRelevance.bind(this),
      minLength: 2,
      maxLength: 4
    });

    // Filter out low-value combos (time-bound, numeric)
    const { valuable, lowValue } = filterLowValueCombos(allEnhancedCombos);

    // Separate by source
    const { titleOnly, subtitleIncremental } = separateCombosBySource(valuable);

    // Convert enhanced combos to legacy string format for backward compatibility
    const titleCombos = titleOnly.map(c => c.text);
    const subtitleNewCombos = subtitleIncremental.map(c => c.text);
    const allCombinedCombos = valuable.map(c => c.text);

    // Classify combos for UI display (V2.1 compatibility)
    const titleCombosClassified = titleOnly.map(combo => ({
      text: combo.text,
      ...this.classifyCombo(combo.text, titleTokens)
    }));

    const subtitleNewCombosClassified = subtitleIncremental.map(combo => ({
      text: combo.text,
      ...this.classifyCombo(combo.text, titleTokens)
    }));

    const lowValueCombos = lowValue.map(combo => ({
      text: combo.text,
      type: 'low_value' as const,
      relevanceScore: 0
    }));

    // PHASE 5: Brand Intelligence Post-Processor
    // Enrich combos with brand classification (brand/generic/competitor)
    // This is a NON-INVASIVE enrichment layer - existing classification remains unchanged
    // CONTROLLED BY: AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED feature flag
    let titleCombosEnriched = titleCombosClassified;
    let subtitleCombosEnriched = subtitleNewCombosClassified;

    if (AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED && metadata) {
      try {
        // Extract brand info from metadata
        const brandInfo = BrandIntelligenceService.extractCanonicalBrand(metadata);

        // Classify combos with brand awareness
        const titleBrandClassified = BrandIntelligenceService.classifyCombos(
          titleCombos,
          brandInfo
        );
        const subtitleBrandClassified = BrandIntelligenceService.classifyCombos(
          subtitleNewCombos,
          brandInfo
        );

        // Merge brand classification with existing classification
        titleCombosEnriched = titleCombosClassified.map((combo, idx) => ({
          ...combo,
          brandClassification: titleBrandClassified[idx]?.classification,
          matchedBrandAlias: titleBrandClassified[idx]?.matchedBrandAlias,
          matchedCompetitor: titleBrandClassified[idx]?.matchedCompetitor,
        }));

        subtitleCombosEnriched = subtitleNewCombosClassified.map((combo, idx) => ({
          ...combo,
          brandClassification: subtitleBrandClassified[idx]?.classification,
          matchedBrandAlias: subtitleBrandClassified[idx]?.matchedBrandAlias,
          matchedCompetitor: subtitleBrandClassified[idx]?.matchedCompetitor,
        }));

        console.log(`[MetadataAuditEngine] Brand classification enabled: ${titleCombosEnriched.length + subtitleCombosEnriched.length} combos enriched`);
      } catch (error) {
        console.error('[MetadataAuditEngine] Brand classification failed:', error);
        // Graceful fallback: use existing classification without brand enrichment
      }
    }

    return {
      totalCombos: valuable.length,
      titleCombos,
      subtitleNewCombos,
      allCombinedCombos,
      titleCombosClassified: titleCombosEnriched,
      subtitleNewCombosClassified: subtitleCombosEnriched,
      lowValueCombos
    };
  }

  /**
   * Extracts keywords from text using ASO-aware tokenization
   */
  private static extractKeywords(text: string, stopwords: Set<string>): string[] {
    const tokens = tokenizeForASO(text);
    return tokens.filter(t => !stopwords.has(t) && t.length > 2);
  }

  /**
   * Extracts combinations from tokens
   */
  private static extractCombos(tokens: string[], stopwords: Set<string>): string[] {
    const comboAnalysis = analyzeCombinations(tokens, stopwords, 2, 4);
    return comboAnalysis.meaningfulCombos.slice(0, 10); // Limit to top 10
  }
}
