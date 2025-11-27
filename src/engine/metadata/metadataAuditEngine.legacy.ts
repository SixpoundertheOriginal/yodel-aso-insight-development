/**
 * ⚠️ LEGACY: Client-Side Metadata Audit Engine
 *
 * ==================== MIGRATION NOTICE ====================
 * THIS FILE IS NO LONGER USED IN PRODUCTION
 * Migrated to edge function on: 2025-11-27
 * New location: supabase/functions/_shared/metadata-audit-engine.ts
 * Frontend now uses: useMetadataAuditV2 hook → metadata-audit-v2 edge function
 * =========================================================
 *
 * REASON FOR MIGRATION:
 * - Proper SaaS architecture (server-side processing)
 * - Single source of truth (no code duplication)
 * - Smaller frontend bundle size
 * - v2.0 features (capability analysis, gap detection, recommendations)
 * - Edge function can use service role for database access
 *
 * THIS FILE IS PRESERVED FOR:
 * - Reference during migration issues
 * - Potential offline mode in future
 * - Historical documentation
 * - Emergency rollback if edge function fails
 *
 * ⚠️ DO NOT DELETE - DO NOT USE IN NEW CODE ⚠️
 *
 * Original Description:
 * Evaluates app metadata using the centralized scoring registry.
 * Pure TypeScript, deterministic, no AI calls.
 */

import type { ScrapedMetadata } from '@/types/aso';
import { tokenizeForASO, filterStopwords, analyzeText } from './tokenization';
import { analyzeCombinations } from '@/modules/metadata-scoring/utils/ngram';
import { generateEnhancedCombos, filterLowValueCombos, separateCombosBySource } from '@/modules/metadata-scoring/utils/comboEngineV2';
import { dedupeCombos } from '@/modules/metadata-scoring/utils/comboDedupe';
import { getCanonicalComboString } from '@/modules/metadata-scoring/utils/comboNormalizer';
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
  type RuleEvaluationResult,
  type RuleAncestry
} from './metadataScoringRegistry';
import { getFormulaDefinition, applyFormulaComponentWeightOverride, applyFormulaOutputMultiplier } from './metadataFormulaRegistry';
import { getRuleConfig } from '@/services/ruleConfigLoader';
import type { EffectiveRuleConfig } from '@/services/ruleConfigLoader';
import { generateEnhancedRecommendations, type RecommendationSignals } from './utils/recommendationEngineV2';
import { getActiveRuleSet } from '@/engine/asoBible/rulesetLoader';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';
import { loadIntentPatterns, getIntentPatternCacheDiagnostics } from '@/engine/asoBible/intentEngine';
import { setIntentPatterns, classifyIntent } from '@/utils/comboIntentClassifier';
import { computeCombinedSearchIntentCoverage } from '@/engine/asoBible/searchIntentCoverageEngine';
import { generateAllPossibleCombos } from '@/engine/combos/comboGenerationEngine';
import { KpiEngine } from './kpi/kpiEngine';

// Performance Optimization Phase 1.3: Token Relevance Cache
// Memoize token relevance calculations to avoid redundant regex matching
const tokenRelevanceCache = new Map<string, 0 | 1 | 2 | 3>();

/**
 * Lightweight semantic relevance scoring for tokens (exported for use in registry)
 *
 * Phase 10: Now accepts optional activeRuleSet to support vertical-specific token relevance overrides
 * Performance Optimization Phase 1.3: Results are cached per token+vertical to avoid redundant regex computation.
 *
 * @param token - Token to evaluate
 * @param activeRuleSet - Optional merged rule set with vertical/market overrides
 * @returns Relevance score (0-3)
 *   3 = Languages, core intent verbs (learn, speak, study, master)
 *   2 = Strong domain nouns (lessons, courses, grammar, vocabulary)
 *   1 = Neutral but valid words
 *   0 = Numeric/time-only, generic adjectives, low-value tokens
 */
export function getTokenRelevance(token: string, activeRuleSet?: MergedRuleSet): 0 | 1 | 2 | 3 {
  const tokenLower = token.toLowerCase();

  // Phase 1.3: Check cache first to avoid regex computation
  const cacheKey = `${tokenLower}-${activeRuleSet?.verticalId || 'base'}`;
  if (tokenRelevanceCache.has(cacheKey)) {
    return tokenRelevanceCache.get(cacheKey)!;
  }

  // Phase 10: Check for vertical/market token relevance overrides
  if (activeRuleSet?.tokenRelevanceOverrides) {
    const override = activeRuleSet.tokenRelevanceOverrides[tokenLower];
    if (override !== undefined) {
      // Log override usage (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Token Relevance] Override applied for "${token}": ${override} (vertical: ${activeRuleSet.verticalId})`);
      }
      // Cache override result
      tokenRelevanceCache.set(cacheKey, override);
      return override;
    }
  }

  // Fallback to global patterns (Phase 9 behavior)

  // Level 0: Low-value tokens (numeric, time-bound, generic adjectives)
  const lowValuePatterns = /^(best|top|great|good|new|latest|free|premium|pro|plus|lite|\d+|one|two|three)$/i;
  if (lowValuePatterns.test(tokenLower)) {
    tokenRelevanceCache.set(cacheKey, 0);
    return 0;
  }

  // Level 3: Languages and core intent verbs
  const languages = /^(english|spanish|french|german|italian|chinese|japanese|korean|portuguese|russian|arabic|hindi|mandarin)$/i;
  const coreIntentVerbs = /^(learn|speak|study|master|practice|improve|understand|read|write|listen|teach)$/i;
  if (languages.test(tokenLower) || coreIntentVerbs.test(tokenLower)) {
    tokenRelevanceCache.set(cacheKey, 3);
    return 3;
  }

  // Level 2: Strong domain nouns
  const domainNouns = /^(lesson|lessons|course|courses|class|classes|grammar|vocabulary|pronunciation|conversation|fluency|language|languages|learning|app|application|tutorial|training|education|skill|skills|method|techniques|guide)$/i;
  if (domainNouns.test(tokenLower)) {
    tokenRelevanceCache.set(cacheKey, 2);
    return 2;
  }

  // Level 1: Everything else (neutral but valid)
  tokenRelevanceCache.set(cacheKey, 1);
  return 1;
}

export class MetadataAuditEngine {
  private static readonly DEFAULT_DISCOVERY_THRESHOLDS = {
    excellent: 5,
    good: 3,
    moderate: 1,
  };
  /**
   * Lightweight semantic relevance scoring for tokens
   * (Delegates to exported function for use in registry)
   *
   * Phase 10: Now accepts optional activeRuleSet for vertical-specific overrides
   */
  static getTokenRelevance(token: string, activeRuleSet?: MergedRuleSet): 0 | 1 | 2 | 3 {
    return getTokenRelevance(token, activeRuleSet);
  }

  /**
   * Evaluates all metadata elements and returns unified audit result
   * Phase 15.7: Now async to support Bible config loading
   * Phase 1.2: Accepts optional pre-loaded ruleset for caching optimization
   *
   * @param metadata - Scraped app metadata from orchestrator
   * @param options - Optional evaluation options
   * @returns Unified metadata audit result
   */
  static async evaluate(
    metadata: ScrapedMetadata,
    options?: {
      competitorData?: any[];
      locale?: string;
      cachedRuleSet?: MergedRuleSet; // Performance Optimization Phase 1.2
    }
  ): Promise<UnifiedMetadataAuditResult> {
    // Phase 8: Load active rule set (Base → Vertical → Market → Client)
    // Phase 1.2: Use cached ruleset if provided to avoid database hit
    const activeRuleSet = options?.cachedRuleSet || await getActiveRuleSet(
      {
        appId: metadata.appId,
        category: metadata.applicationCategory,
        title: metadata.title,
        subtitle: metadata.subtitle,
        description: metadata.description,
      },
      options?.locale || 'en-US'
    );

    // Log cache usage (development only)
    if (process.env.NODE_ENV === 'development' && options?.cachedRuleSet) {
      console.log('[MetadataAuditEngine] Using cached ruleset (Performance Phase 1.2)');
    }

    // Log active rule set (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Metadata Audit Engine] Active RuleSet:', {
        verticalId: activeRuleSet.verticalId,
        marketId: activeRuleSet.marketId,
        leakWarnings: activeRuleSet.leakWarnings?.length || 0,
      });
    }

    // Load configuration
    const stopwordsData = getStopwords();
    const stopwords = new Set(stopwordsData.stopwords || []);
    const semanticRules = getSemanticRules();

    // Phase 16.7: Load intent patterns for Bible-driven combo classification
    // Uses Hybrid Model (Option B): Try DB first, fall back to minimal defaults if DB empty/fails
    const intentPatterns = await loadIntentPatterns(
      activeRuleSet.verticalId,
      activeRuleSet.marketId,
      metadata.organizationId,  // Optional app/client context
      metadata.appId
    );

    // Inject patterns into combo classifier (cached for synchronous use)
    setIntentPatterns(intentPatterns);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Intent Engine] Loaded ${intentPatterns.length} patterns for classification`);
    }

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
      },
      // Phase 8: Include active rule set for future override logic
      activeRuleSet
    };

    // Evaluate each element (Phase 15.7: await async evaluators)
    const [titleResult, subtitleResult, descriptionResult] = await Promise.all([
      this.evaluateElement('title', metadata.title || '', context),
      this.evaluateElement('subtitle', metadata.subtitle || '', context),
      this.evaluateElement('description', metadata.description || '', context)
    ]);

    const elementResults: Record<MetadataElement, ElementScoringResult> = {
      title: titleResult,
      subtitle: subtitleResult,
      description: descriptionResult
    };

    // Calculate weighted overall score (RANKING elements only: title + subtitle)
    const overallScore = this.calculateOverallScore(elementResults, activeRuleSet);

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
      metadata,      // Pass metadata for brand intelligence (Phase 5)
      activeRuleSet  // Phase 20: Pass activeRuleSet for vertical-specific token relevance
    );

    // Phase 17: Search Intent Coverage (Bible-driven, token-level)
    // Uses same intent patterns loaded earlier for combo classification
    const intentDiagnostics = getIntentPatternCacheDiagnostics();
    const fallbackMode = intentDiagnostics.fallbackMode;
    const intentCoverage = computeCombinedSearchIntentCoverage(
      titleTokens,
      subtitleTokens,
      intentPatterns,
      fallbackMode
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Search Intent Coverage] Title: ${intentCoverage.title.score}%, Subtitle: ${intentCoverage.subtitle.score}%, Overall: ${intentCoverage.overallScore}%`);
    }

    // Phase 18: KPI Engine (Bible-driven KPI computation)
    // Computes 9 Intent Quality KPIs + all other KPI families
    const kpiResult = KpiEngine.evaluate({
      title: metadata.title || '',
      subtitle: metadata.subtitle || '',
      locale: options?.locale || 'en-US',
      platform: metadata.platform === 'android' ? 'android' : 'ios',
      tokensTitle: titleTokens,
      tokensSubtitle: subtitleTokens,
      comboCoverage: {
        totalCombos: comboCoverage.totalCombos,
        titleCombos: comboCoverage.titleCombos,
        subtitleNewCombos: comboCoverage.subtitleNewCombos,
        allCombinedCombos: comboCoverage.allCombinedCombos,
        titleCombosClassified: comboCoverage.titleCombosClassified,
        subtitleNewCombosClassified: comboCoverage.subtitleNewCombosClassified,
        lowValueCombos: comboCoverage.lowValueCombos,
        stats: comboCoverage.stats,
      },
      intentCoverage,  // Phase 18: Pass Intent Coverage data for Intent Quality KPIs
      activeRuleSet,   // Phase 10: Pass active rule set for weight overrides
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[KPI Engine] Overall Score: ${kpiResult.overallScore}%, Intent Quality Score: ${kpiResult.families.intent_quality?.score || 'N/A'}%`);
    }

    // Generate enhanced recommendations using V2 engine
    const recommendations = this.generateRecommendationsV2(
      elementResults,
      keywordCoverage,
      comboCoverage,
      conversionInsights,
      activeRuleSet
    );
    const topRecommendations = recommendations.rankingRecommendations;
    const conversionRecommendations = recommendations.conversionRecommendations;

    // Phase 20: Get Intent Engine diagnostics for DEV panel
    // Attach diagnostics flag to intent coverage for downstream consumers
    intentCoverage.fallbackMode = intentDiagnostics.fallbackMode;
    intentCoverage.diagnostics = intentDiagnostics;
    intentCoverage.ancestry = MetadataAuditEngine.buildIntentCoverageAncestry(
      intentDiagnostics,
      activeRuleSet
    );
    const ruleSetDiagnostics = {
      leakWarnings: activeRuleSet.leakWarnings || [],
      ruleSetSource: activeRuleSet.source,
      verticalId: activeRuleSet.verticalId,
      marketId: activeRuleSet.marketId,
      discoveryThresholdSource: activeRuleSet.discoveryThresholds ? 'ruleset' : 'default',
      overrideScopesApplied: Object.entries(activeRuleSet.inheritanceChain || {})
        .filter(([, value]) => Boolean(value))
        .map(([scope]) => scope),
    };

    // Phase 21: Build Vertical Context from template metadata
    const verticalContext = MetadataAuditEngine.buildVerticalContext(activeRuleSet);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Vertical Intelligence] Vertical context built:', {
        hasVerticalContext: !!verticalContext,
        categoryId: activeRuleSet.categoryId,
        categoryName: activeRuleSet.categoryName,
        verticalId: activeRuleSet.verticalId,
        verticalName: activeRuleSet.verticalName,
        hasCategoryTemplate: !!activeRuleSet.categoryTemplateMeta,
        hasVerticalTemplate: !!activeRuleSet.verticalTemplateMeta,
        hasMarketTemplate: !!activeRuleSet.marketTemplateMeta,
        hasClientTemplate: !!activeRuleSet.clientTemplateMeta,
      });
    }

    return {
      overallScore,
      elements: elementResults,
      topRecommendations,
      conversionRecommendations,
      keywordCoverage,
      comboCoverage,
      conversionInsights,
      intentCoverage,  // Phase 17: Include Search Intent Coverage result
      kpiResult,       // Phase 18: Include KPI Engine result
      intentEngineDiagnostics: intentDiagnostics,  // Phase 20: Intent Engine diagnostics (DEV ONLY)
      ruleSetDiagnostics,
      verticalContext,  // Phase 21: Vertical Intelligence Layer
    };
  }

  /**
   * Evaluates a single element using its registered rules
   * Phase 15.7: Now async to support Bible config loading
   */
  private static async evaluateElement(
    element: MetadataElement,
    text: string,
    context: EvaluationContext
  ): Promise<ElementScoringResult> {
    const config = METADATA_SCORING_REGISTRY.find(c => c.element === element);
    if (!config) {
      throw new Error(`No config found for element: ${element}`);
    }

    // Evaluate all rules (Phase 15.7: await each evaluator as it may be async)
    const ruleResults: RuleEvaluationResult[] = await Promise.all(
      config.rules.map(async rule => {
        try {
          const result = await rule.evaluator(text, context);
          return await MetadataAuditEngine.attachRuleAncestry(
            result,
            rule.id,
            context.activeRuleSet
          );
        } catch (error) {
          console.error(`[MetadataAuditEngine] Rule ${rule.id} failed:`, error);
          const fallbackResult: RuleEvaluationResult = {
            ruleId: rule.id,
            passed: false,
            score: 0,
            message: `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
            evidence: []
          };
          return await MetadataAuditEngine.attachRuleAncestry(
            fallbackResult,
            rule.id,
            context.activeRuleSet
          );
        }
      })
    );

    // Calculate weighted element score
    const score = ruleResults.reduce((total, result, index) => {
      const ruleWeight = config.rules[index].weight;
      const contribution = result.score * ruleWeight;

      // Debug NaN issues
      if (isNaN(contribution)) {
        console.error(`[MetadataAuditEngine] NaN detected in ${element} rule ${result.ruleId}:`, {
          score: result.score,
          weight: ruleWeight,
          contribution
        });
      }

      return total + contribution;
    }, 0);

    // Final NaN check
    if (isNaN(score)) {
      console.error(`[MetadataAuditEngine] Final ${element} score is NaN:`, {
        ruleResults: ruleResults.map(r => ({ id: r.ruleId, score: r.score })),
        weights: config.rules.map((r, i) => ({ id: r.id, weight: r.weight }))
      });
    }

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
    elementResults: Record<MetadataElement, ElementScoringResult>,
    activeRuleSet?: MergedRuleSet
  ): number {
    const formulaId = 'metadata_overall_score';
    const formula = getFormulaDefinition(formulaId);
    const baseComponents = formula?.components ?? [
      { id: 'title_score', weight: 0.65 },
      { id: 'subtitle_score', weight: 0.35 },
    ];

    const adjustedComponents = baseComponents.map(component => {
      const adjustedWeight = applyFormulaComponentWeightOverride(
        formulaId,
        component.id,
        component.weight,
        activeRuleSet
      );
      return {
        id: component.id,
        weight: adjustedWeight,
      };
    });

    const weightSum =
      adjustedComponents.reduce((sum, component) => sum + component.weight, 0) || 1;

    let weightedScore = 0;
    for (const component of adjustedComponents) {
      const normalizedWeight = component.weight / weightSum;
      let elementScore = 0;

      if (component.id === 'title_score') {
        elementScore = elementResults.title.score;
      } else if (component.id === 'subtitle_score') {
        elementScore = elementResults.subtitle.score;
      } else if (component.id === 'description_score') {
        elementScore = elementResults.description.score;
      }

      weightedScore += elementScore * normalizedWeight;
    }

    const adjustedScore = applyFormulaOutputMultiplier(
      weightedScore,
      formulaId,
      activeRuleSet
    );

    return Math.round(adjustedScore);
  }

  private static buildIntentCoverageAncestry(
    diagnostics: ReturnType<typeof getIntentPatternCacheDiagnostics>,
    activeRuleSet?: MergedRuleSet
  ): { scope: 'base' | 'vertical' | 'market' | 'client'; sourceId?: string } {
    if (diagnostics.fallbackMode) {
      return {
        scope: 'base',
        sourceId: 'fallback_intent_patterns',
      };
    }

    if (diagnostics.loadedScopes?.organizationId) {
      return {
        scope: 'client',
        sourceId: diagnostics.loadedScopes.organizationId,
      };
    }

    if (diagnostics.loadedScopes?.marketId) {
      return {
        scope: 'market',
        sourceId: diagnostics.loadedScopes.marketId,
      };
    }

    if (diagnostics.loadedScopes?.verticalId) {
      return {
        scope: 'vertical',
        sourceId: diagnostics.loadedScopes.verticalId,
      };
    }

    return {
      scope: 'base',
      sourceId: activeRuleSet?.inheritanceChain?.base?.id,
    };
  }

  /**
   * Build Vertical Context from active rule set template metadata
   *
   * Phase 21: Vertical Intelligence Layer
   *
   * Merges vertical/market/client template metadata into a single VerticalContext
   * for consumption by front-end panels.
   *
   * @param activeRuleSet - Active merged rule set with template metadata
   * @returns VerticalContext or undefined if no template metadata exists
   */
  private static buildVerticalContext(activeRuleSet?: MergedRuleSet): any | undefined {
    if (!activeRuleSet) {
      return undefined;
    }

    // Phase 2A: Include category template in check
    const hasTemplateData =
      activeRuleSet.categoryTemplateMeta ||
      activeRuleSet.verticalTemplateMeta ||
      activeRuleSet.marketTemplateMeta ||
      activeRuleSet.clientTemplateMeta;

    if (!hasTemplateData) {
      return undefined;
    }

    // Phase 2A: Deep merge template metadata: category → vertical → market → client (last wins)
    const mergedTemplate = {
      ...(activeRuleSet.categoryTemplateMeta || {}),
      ...(activeRuleSet.verticalTemplateMeta || {}),
      ...(activeRuleSet.marketTemplateMeta || {}),
      ...(activeRuleSet.clientTemplateMeta || {}),
    };

    // Build VerticalContext from merged template (Phase 2A: added category fields)
    const verticalContext: any = {
      categoryId: activeRuleSet.categoryId,
      categoryName: activeRuleSet.categoryName,
      categoryConfidence: activeRuleSet.categoryConfidence,
      verticalId: activeRuleSet.verticalId || 'base',
      verticalName: activeRuleSet.verticalName || 'Base',
      marketId: activeRuleSet.marketId,
      marketName: activeRuleSet.marketName,
      ruleSetSource: activeRuleSet.source || 'base',
    };

    // Include template sections if they exist
    if (mergedTemplate.overview) {
      verticalContext.overview = mergedTemplate.overview;
    }

    if (mergedTemplate.benchmarks) {
      verticalContext.benchmarks = mergedTemplate.benchmarks;
    }

    if (mergedTemplate.keyword_clusters) {
      verticalContext.keyword_clusters = mergedTemplate.keyword_clusters;
    }

    if (mergedTemplate.conversion_drivers) {
      verticalContext.conversion_drivers = mergedTemplate.conversion_drivers;
    }

    if (mergedTemplate.kpi_modifiers) {
      verticalContext.kpi_modifiers = mergedTemplate.kpi_modifiers;
    }

    // Build inheritance chain (Phase 2A: added category layer)
    verticalContext.inheritanceChain = {};

    if (activeRuleSet.inheritanceChain?.base) {
      verticalContext.inheritanceChain.base = {
        id: activeRuleSet.inheritanceChain.base.id,
        name: activeRuleSet.inheritanceChain.base.label || 'Base',
      };
    }

    if (activeRuleSet.inheritanceChain?.category && activeRuleSet.categoryId) {
      verticalContext.inheritanceChain.category = {
        id: activeRuleSet.categoryId,
        name: activeRuleSet.categoryName || '',
        confidence: activeRuleSet.categoryConfidence,
      };
    }

    if (activeRuleSet.inheritanceChain?.vertical) {
      verticalContext.inheritanceChain.vertical = {
        id: activeRuleSet.verticalId || '',
        name: activeRuleSet.verticalName || '',
      };
    }

    if (activeRuleSet.inheritanceChain?.market) {
      verticalContext.inheritanceChain.market = {
        id: activeRuleSet.marketId || '',
        name: activeRuleSet.marketName || '',
      };
    }

    if (activeRuleSet.inheritanceChain?.client && activeRuleSet.appId) {
      verticalContext.inheritanceChain.client = {
        id: activeRuleSet.appId,
        name: 'Client',
      };
    }

    return verticalContext;
  }

  private static async attachRuleAncestry(
    result: RuleEvaluationResult,
    ruleId: string,
    activeRuleSet?: MergedRuleSet
  ): Promise<RuleEvaluationResult> {
    if (result.ancestry) {
      return result;
    }

    const config = await getRuleConfig(ruleId, activeRuleSet);
    const ancestry = MetadataAuditEngine.resolveRuleAncestry(config, activeRuleSet);

    return {
      ...result,
      ancestry,
    };
  }

  private static resolveRuleAncestry(
    config: EffectiveRuleConfig | null,
    activeRuleSet?: MergedRuleSet
  ): RuleAncestry {
    const scope = (config?.override_source as RuleAncestry['scope']) || 'base';
    const chain = activeRuleSet?.inheritanceChain;

    switch (scope) {
      case 'client':
        return { scope, sourceId: chain?.client?.id || activeRuleSet?.appId };
      case 'market':
        return { scope, sourceId: chain?.market?.id || activeRuleSet?.marketId };
      case 'vertical':
        return { scope, sourceId: chain?.vertical?.id || activeRuleSet?.verticalId };
      default:
        return { scope: 'base', sourceId: chain?.base?.id };
    }
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
   *
   * Phase 10: Now accepts activeRuleSet for vertical-specific templates
   */
  private static generateRecommendationsV2(
    elementResults: Record<MetadataElement, ElementScoringResult>,
    keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'],
    comboCoverage: UnifiedMetadataAuditResult['comboCoverage'],
    conversionInsights: UnifiedMetadataAuditResult['conversionInsights'],
    activeRuleSet?: MergedRuleSet
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
      descriptionCtaStrength: conversionInsights.description.ctaStrength,
      activeRuleSet  // Phase 10: Pass activeRuleSet for vertical-specific templates
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
  private static classifyCombo(combo: string, titleTokens: string[], activeRuleSet?: MergedRuleSet): { type: 'branded' | 'generic' | 'low_value'; relevanceScore: number } {
    const comboLower = combo.toLowerCase();
    const comboWords = comboLower.split(' ');

    // Calculate average relevance score of combo words
    // Phase 20: Use activeRuleSet for vertical-specific token relevance
    const avgRelevance = comboWords.reduce((sum, word) => sum + this.getTokenRelevance(word, activeRuleSet), 0) / comboWords.length;

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
    metadata?: ScrapedMetadata,  // Optional metadata for brand intelligence (Phase 5)
    activeRuleSet?: MergedRuleSet  // Phase 20: Optional activeRuleSet for vertical-specific token relevance
  ): UnifiedMetadataAuditResult['comboCoverage'] {
    // Use V2 engine for enhanced combo generation
    // Phase 20: Pass activeRuleSet to getTokenRelevance for vertical-specific scoring
    const allEnhancedCombos = generateEnhancedCombos({
      titleTokens,
      subtitleTokens,
      stopwords,
      getTokenRelevance: (token: string) => this.getTokenRelevance(token, activeRuleSet),
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
    // Phase 20: Pass activeRuleSet for vertical-specific token relevance scoring
    const titleCombosClassified = titleOnly.map(combo => ({
      text: combo.text,
      ...this.classifyCombo(combo.text, titleTokens, activeRuleSet)
    }));

    const subtitleNewCombosClassified = subtitleIncremental.map(combo => ({
      text: combo.text,
      ...this.classifyCombo(combo.text, titleTokens, activeRuleSet)
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

    // Phase 16.7: Intent Classification Post-Processor
    // Enrich combos with search intent classification using Intent Engine
    // Intent patterns were loaded at the start of evaluate() and injected via setIntentPatterns()
    titleCombosEnriched = titleCombosEnriched.map(combo => ({
      ...combo,
      intentClass: classifyIntent(combo),
    }));

    subtitleCombosEnriched = subtitleCombosEnriched.map(combo => ({
      ...combo,
      intentClass: classifyIntent(combo),
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MetadataAuditEngine] Intent classification applied to ${titleCombosEnriched.length + subtitleCombosEnriched.length} combos`);
    }

    const meaningfulTitleTokens = titleTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const meaningfulSubtitleTokens = subtitleTokens.filter(t => !stopwords.has(t) && t.length > 2);
    const possibleCombosRaw = generateAllPossibleCombos(
      meaningfulTitleTokens,
      meaningfulSubtitleTokens,
      {
        minLength: 2,
        maxLength: 4,
        includeTitle: true,
        includeSubtitle: true,
        includeCross: true,
      }
    );
    const possibleCombos = dedupeCombos(possibleCombosRaw);
    const canonicalExisting = new Set(allCombinedCombos.map(combo => getCanonicalComboString(combo)));
    const missingCombos = possibleCombos.filter(
      combo => !canonicalExisting.has(getCanonicalComboString(combo))
    );
    const totalPossible = possibleCombos.length;
    const existingCount = canonicalExisting.size;
    const coveragePct = totalPossible > 0 ? Math.round((existingCount / totalPossible) * 100) : 0;
    const discoveryThresholds = activeRuleSet?.discoveryThresholds || MetadataAuditEngine.DEFAULT_DISCOVERY_THRESHOLDS;

    return {
      totalCombos: valuable.length,
      titleCombos,
      subtitleNewCombos,
      allCombinedCombos,
      titleCombosClassified: titleCombosEnriched,
      subtitleNewCombosClassified: subtitleCombosEnriched,
      lowValueCombos,
      stats: {
        total: totalPossible,
        totalPossible,
        existing: existingCount,
        missing: missingCombos.length,
        coveragePct,
        coverage: coveragePct,
        thresholds: discoveryThresholds,
        missingExamples: missingCombos.slice(0, 10),
      },
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
