/**
 * KPI Engine - Core Implementation
 *
 * Phase 1: Title & Subtitle KPI Engine
 * Version: v1
 *
 * Registry-driven KPI computation for metadata quality assessment.
 * Produces deterministic, reproducible KPI vectors for benchmarking.
 */

import { tokenizeForASO, analyzeText } from '../tokenization';
import { getTokenRelevance } from '../metadataAuditEngine';
import { computeBrandRatioStats, getNoiseSeverity } from '../utils/brandNoiseHelpers';
import { applyFormulaComponentWeightOverride, applyFormulaOutputMultiplier } from '../metadataFormulaRegistry';
import kpiRegistryData from './kpi.registry.json';
import familyRegistryData from './kpi.families.json';
import type {
  KpiEngineVersion,
  KpiEngineInput,
  KpiEngineResult,
  KpiDefinition,
  KpiFamilyDefinition,
  KpiResult,
  KpiFamilyResult,
  KpiId,
  KpiFamilyId,
} from './kpi.types';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Current KPI Engine Version
 */
export const KPI_ENGINE_VERSION: KpiEngineVersion = 'v1';

/**
 * Character limits by platform
 */
const CHAR_LIMITS = {
  ios: {
    title: 30,
    subtitle: 30,
  },
  android: {
    title: 50,
    subtitle: 80,
  },
};

/**
 * Action verbs for hook strength calculation
 */
const ACTION_VERBS = new Set([
  'learn', 'master', 'speak', 'practice', 'improve', 'discover',
  'unlock', 'transform', 'achieve', 'build', 'create', 'track',
  'save', 'boost', 'gain', 'reach', 'grow', 'start', 'get',
]);

/**
 * Benefit keywords
 */
const BENEFIT_KEYWORDS = new Set([
  'free', 'easy', 'fast', 'simple', 'powerful', 'advanced',
  'professional', 'complete', 'ultimate', 'perfect', 'quick',
  'effective', 'proven', 'guaranteed', 'unlimited', 'premium',
]);

/**
 * Urgency words
 */
const URGENCY_WORDS = new Set([
  'now', 'today', 'instant', 'instantly', 'immediate', 'immediately',
  'quick', 'quickly', 'fast', 'rapid', 'rapidly',
]);

/**
 * Social proof words
 */
const SOCIAL_PROOF_WORDS = new Set([
  'million', 'millions', 'thousand', 'thousands', 'top', 'best',
  'trusted', 'popular', 'leading', '#1', 'rated', 'award',
]);

/**
 * Language keywords for semantic pair detection
 */
const LANGUAGES = new Set([
  'english', 'spanish', 'french', 'german', 'italian', 'chinese',
  'japanese', 'korean', 'portuguese', 'russian', 'arabic', 'hindi',
]);

const INTENT_KPI_IDS = new Set<KpiId>([
  'informational_intent_coverage_score',
  'commercial_intent_coverage_score',
  'transactional_intent_coverage_score',
  'navigational_noise_ratio',
  'intent_balance_score',
  'intent_diversity_score',
  'intent_gap_index',
  'intent_alignment_score',
  'intent_quality_score',
]);

const INTENT_FALLBACK_NORMALIZED_FLOOR = 50;

type KpiOverrideEntry = {
  scope: 'base' | 'vertical' | 'market' | 'client';
  multiplier: number;
  sourceId?: string;
};
const KPI_OVERALL_FORMULA_ID = 'kpi_overall_score';

// ============================================================================
// Registry Loading
// ============================================================================

/**
 * Load KPI definitions from registry
 */
const KPI_DEFINITIONS: KpiDefinition[] = kpiRegistryData.kpis;

/**
 * Load family definitions from registry
 */
const FAMILY_DEFINITIONS: KpiFamilyDefinition[] = familyRegistryData.families;

/**
 * Create lookup maps for faster access
 */
const KPI_MAP = new Map<KpiId, KpiDefinition>(
  KPI_DEFINITIONS.map(kpi => [kpi.id, kpi])
);

const FAMILY_MAP = new Map<KpiFamilyId, KpiFamilyDefinition>(
  FAMILY_DEFINITIONS.map(family => [family.id, family])
);

// ============================================================================
// Phase 10: KPI Weight Override Helpers
// ============================================================================

/**
 * Apply KPI weight override from active rule set
 *
 * Phase 10: Applies vertical/market-specific weight multipliers
 *
 * @param baseWeight - Base weight from KPI definition
 * @param kpiId - KPI identifier
 * @param activeRuleSet - Optional active rule set with overrides
 * @returns Adjusted weight (multiplier applied)
 */
function applyKpiWeightOverride(
  baseWeight: number,
  kpiId: KpiId,
  activeRuleSet?: any
): number {
  const overrideMeta = resolveKpiOverrideProvenance(kpiId, activeRuleSet);
  const multiplier = Math.max(0.5, Math.min(2.0, overrideMeta.multiplier));
  const adjustedWeight = baseWeight * multiplier;

  if (process.env.NODE_ENV === 'development' && multiplier !== 1) {
    console.log(
      `[KPI Override] "${kpiId}" weight: ${baseWeight} → ${adjustedWeight} (${multiplier}x, scope=${overrideMeta.provenance.at(-1)?.scope})`
    );
  }

  return adjustedWeight;
}

/**
 * Normalize KPI weights to sum to 1.0
 *
 * Phase 10: Called after applying all weight overrides
 *
 * @param weights - Record of KPI ID → weight
 * @returns Normalized weights (sum = 1.0)
 */
function normalizeKpiWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalized[key] = value / sum;
  }
  return normalized;
}

function resolveKpiOverrideProvenance(
  kpiId: KpiId,
  activeRuleSet?: MergedRuleSet
): { multiplier: number; provenance: KpiOverrideEntry[] } {
  const provenance: KpiOverrideEntry[] = [];
  provenance.push({ scope: 'base', multiplier: 1, sourceId: activeRuleSet?.inheritanceChain?.base?.id });

  const addEntry = (scope: 'vertical' | 'market' | 'client', ruleset?: any) => {
    const override = ruleset?.kpiOverrides?.[kpiId];
    if (override?.weight) {
      provenance.push({ scope, multiplier: override.weight, sourceId: ruleset?.id });
    }
  };

  const chain = activeRuleSet?.inheritanceChain;
  if (chain) {
    addEntry('vertical', chain.vertical);
    addEntry('market', chain.market);
    addEntry('client', chain.client);
  }

  const finalMultiplier = activeRuleSet?.kpiOverrides?.[kpiId]?.weight || 1;

  return {
    multiplier: finalMultiplier,
    provenance,
  };
}

// ============================================================================
// KPI Engine Class
// ============================================================================

export class KpiEngine {
  /**
   * Evaluate KPIs for given title and subtitle
   *
   * @param input - KPI engine input with title, subtitle, and optional precomputed data
   * @returns Complete KPI result with vector, KPI map, family map, and overall score
   */
  static evaluate(input: KpiEngineInput): KpiEngineResult {
    // Normalize input
    const title = (input.title || '').trim();
    const subtitle = (input.subtitle || '').trim();
    const platform = input.platform || 'ios';
    const locale = input.locale || 'us';

    // Tokenize if not provided
    const tokensTitle = input.tokensTitle || tokenizeForASO(title);
    const tokensSubtitle = input.tokensSubtitle || tokenizeForASO(subtitle);

    // Get stopwords from analyzeText
    const titleAnalysis = analyzeText(title, new Set());
    const subtitleAnalysis = analyzeText(subtitle, new Set());

    // Compute primitive metrics
    const primitives = this.computePrimitives({
      title,
      subtitle,
      platform,
      tokensTitle,
      tokensSubtitle,
      titleAnalysis,
      subtitleAnalysis,
      comboCoverage: input.comboCoverage,
      brandSignals: input.brandSignals,
      intentSignals: input.intentSignals,
      intentCoverage: input.intentCoverage, // Phase 18: Bible-driven intent coverage
      activeRuleSet: input.activeRuleSet, // Phase 21: Vertical Intelligence Layer
    });

    // Compute all KPIs
    const kpis: Record<KpiId, KpiResult> = {};
    const vector: number[] = [];

    const intentFallbackMode = !!primitives.intentFallbackMode;

    const overrideMetaMap: Record<string, ReturnType<typeof resolveKpiOverrideProvenance>> = {};

    for (const kpiDef of KPI_DEFINITIONS) {
      const rawValue = this.computeKpi(kpiDef.id, primitives);
      let normalized = this.normalizeValue(rawValue, kpiDef);

      if (intentFallbackMode && INTENT_KPI_IDS.has(kpiDef.id)) {
        normalized = Math.max(normalized, INTENT_FALLBACK_NORMALIZED_FLOOR);
      }

       const overrideMeta = resolveKpiOverrideProvenance(kpiDef.id, input.activeRuleSet);
       overrideMetaMap[kpiDef.id] = overrideMeta;

      kpis[kpiDef.id] = {
        id: kpiDef.id,
        familyId: kpiDef.familyId,
        value: rawValue,
        normalized,
        label: kpiDef.label,
        effectiveWeight: kpiDef.weight * overrideMeta.multiplier,
        overrideMultiplier: overrideMeta.multiplier,
        provenance: overrideMeta.provenance,
      };

      vector.push(normalized);
    }

    // Phase 10: Compute family scores with KPI weight overrides
    const families: Record<KpiFamilyId, KpiFamilyResult> = {};

    for (const familyDef of FAMILY_DEFINITIONS) {
      const familyKpis = KPI_DEFINITIONS.filter(k => k.familyId === familyDef.id);

      // Phase 10: Apply weight overrides and normalize
      const adjustedWeights: Record<string, number> = {};
      familyKpis.forEach(kpiDef => {
        const overrideMeta = overrideMetaMap[kpiDef.id];
        if (overrideMeta) {
          adjustedWeights[kpiDef.id] = kpiDef.weight * overrideMeta.multiplier;
        } else {
          adjustedWeights[kpiDef.id] = applyKpiWeightOverride(kpiDef.weight, kpiDef.id, input.activeRuleSet);
        }
      });

      // Normalize weights to sum to 1.0
      const normalizedWeights = normalizeKpiWeights(adjustedWeights);

      // Compute weighted sum using normalized weights
      const weightedSum = familyKpis.reduce((sum, kpiDef) => {
        const kpiResult = kpis[kpiDef.id];
        const weight = normalizedWeights[kpiDef.id];
        return sum + (kpiResult.normalized * weight);
      }, 0);

      families[familyDef.id] = {
        id: familyDef.id,
        label: familyDef.label,
        score: Math.round(weightedSum * 100) / 100,
        kpiIds: familyKpis.map(k => k.id),
        weight: familyDef.weight,
      };
    }

    // Compute overall score (weighted average of family scores)
    const adjustedOverallWeights: Record<string, number> = {};
    FAMILY_DEFINITIONS.forEach(familyDef => {
      adjustedOverallWeights[familyDef.id] = applyFormulaComponentWeightOverride(
        KPI_OVERALL_FORMULA_ID,
        familyDef.id,
        familyDef.weight,
        input.activeRuleSet
      );
    });
    const normalizedOverallWeights = normalizeKpiWeights(adjustedOverallWeights);

    const overallScore = FAMILY_DEFINITIONS.reduce((sum, familyDef) => {
      const familyResult = families[familyDef.id];
      const weight = normalizedOverallWeights[familyDef.id] ?? familyDef.weight;
      return sum + (familyResult.score * weight);
    }, 0);

    const adjustedOverallScore = applyFormulaOutputMultiplier(
      overallScore,
      KPI_OVERALL_FORMULA_ID,
      input.activeRuleSet
    );

    // Build result
    return {
      version: KPI_ENGINE_VERSION,
      vector,
      kpis,
      families,
      overallScore: Math.round(adjustedOverallScore * 100) / 100,
      debug: {
        title,
        subtitle,
        tokensTitle,
        tokensSubtitle,
        titleHighValueKeywords: primitives.titleHighValueKeywordCount,
        subtitleHighValueKeywords: primitives.subtitleHighValueIncrementalKeywords,
        brandComboCount: primitives.brandStats?.branded,
        genericComboCount: primitives.brandStats?.generic,
      },
    };
  }

  /**
   * Compute primitive metrics from input data
   */
  private static computePrimitives(data: {
    title: string;
    subtitle: string;
    platform: 'ios' | 'android';
    tokensTitle: string[];
    tokensSubtitle: string[];
    titleAnalysis: any;
    subtitleAnalysis: any;
    comboCoverage?: any;
    brandSignals?: any;
    intentSignals?: any;
    intentCoverage?: any; // Phase 18: Bible-driven intent coverage
    activeRuleSet?: any; // Phase 21: Vertical Intelligence Layer
  }) {
    const {
      title,
      subtitle,
      platform,
      tokensTitle,
      tokensSubtitle,
      titleAnalysis,
      subtitleAnalysis,
      comboCoverage,
      brandSignals,
      intentSignals,
      intentCoverage, // Phase 18
    } = data;

    // Character counts
    const titleCharCount = title.length;
    const subtitleCharCount = subtitle.length;
    const titleCharLimit = CHAR_LIMITS[platform].title;
    const subtitleCharLimit = CHAR_LIMITS[platform].subtitle;

    // Word counts
    const titleWordCount = title.split(/\s+/).filter(w => w.length > 0).length;
    const subtitleWordCount = subtitle.split(/\s+/).filter(w => w.length > 0).length;

    // Keyword analysis
    const titleMeaningfulTokens = tokensTitle.filter(t => t.length > 2);
    const subtitleMeaningfulTokens = tokensSubtitle.filter(t => t.length > 2);
    const titleHighValueTokens = titleMeaningfulTokens.filter(t => getTokenRelevance(t) >= 2);
    const subtitleHighValueTokens = subtitleMeaningfulTokens.filter(t => getTokenRelevance(t) >= 2);
    const titleHighValueSet = new Set(titleHighValueTokens);
    const subtitleHighValueIncremental = subtitleHighValueTokens.filter(t => !titleHighValueSet.has(t));

    // Token density
    const titleTokenDensity = tokensTitle.length > 0 ? titleMeaningfulTokens.length / tokensTitle.length : 0;
    const subtitleTokenDensity = tokensSubtitle.length > 0 ? subtitleMeaningfulTokens.length / tokensSubtitle.length : 0;

    // Noise ratios
    const titleNoiseRatio = titleAnalysis.noiseRatio || 0;
    const subtitleNoiseRatio = subtitleAnalysis.noiseRatio || 0;
    const titleNoiseInfo = getNoiseSeverity(titleNoiseRatio);
    const subtitleNoiseInfo = getNoiseSeverity(subtitleNoiseRatio);

    // Combo metrics
    const titleGenericComboCount = comboCoverage?.titleCombosClassified?.filter((c: any) => c.type === 'generic').length || 0;
    const titleBrandedComboCount = comboCoverage?.titleCombosClassified?.filter((c: any) => c.type === 'branded').length || 0;
    const subtitleIncrementalGenericComboCount = comboCoverage?.subtitleNewCombosClassified?.filter((c: any) => c.type === 'generic').length || 0;
    const lowValueComboCount = comboCoverage?.lowValueCombos?.length || 0;
    const totalCombos =
      (comboCoverage?.stats?.existing ??
        comboCoverage?.totalCombos ??
        0);

    // Brand metrics
    const brandStats = computeBrandRatioStats(
      comboCoverage?.titleCombosClassified,
      comboCoverage?.lowValueCombos
    );
    const brandPresenceTitle = brandSignals?.brandPresenceTitle || 0;
    const brandPresenceSubtitle = brandSignals?.brandPresenceSubtitle || 0;

    // Language-verb pairs
    const titleLanguageVerbPairs = this.countLanguageVerbPairs(tokensTitle);

    // Unique keyword coverage
    const allMeaningfulTokens = new Set([...titleMeaningfulTokens, ...subtitleMeaningfulTokens]);
    const totalUniqueKeywordCoverage = allMeaningfulTokens.size;

    // Hook strength components
    const titleActionVerbs = tokensTitle.filter(t => ACTION_VERBS.has(t.toLowerCase())).length;
    const subtitleActionVerbs = tokensSubtitle.filter(t => ACTION_VERBS.has(t.toLowerCase())).length;
    const titleBenefitWords = tokensTitle.filter(t => BENEFIT_KEYWORDS.has(t.toLowerCase())).length;
    const subtitleBenefitWords = tokensSubtitle.filter(t => BENEFIT_KEYWORDS.has(t.toLowerCase())).length;

    // Psychology metrics
    const urgencyCount = [...tokensTitle, ...tokensSubtitle].filter(t => URGENCY_WORDS.has(t.toLowerCase())).length;
    const socialProofCount = [...tokensTitle, ...tokensSubtitle].filter(t => SOCIAL_PROOF_WORDS.has(t.toLowerCase())).length;
    const benefitKeywordCount = titleBenefitWords + subtitleBenefitWords;
    const actionVerbCount = titleActionVerbs + subtitleActionVerbs;
    const totalMeaningfulTokens = titleMeaningfulTokens.length + subtitleMeaningfulTokens.length;

    // Redundancy
    const allTokens = [...tokensTitle, ...tokensSubtitle];
    const tokenCounts = new Map<string, number>();
    allTokens.forEach(t => {
      const lower = t.toLowerCase();
      tokenCounts.set(lower, (tokenCounts.get(lower) || 0) + 1);
    });
    const repeatedTokens = Array.from(tokenCounts.values()).filter(count => count > 1).length;

    // Phase 18: Intent metrics (prefer Bible-driven intentCoverage over legacy intentSignals)
    let navigationalCount = 0;
    let informationalCount = 0;
    let commercialCount = 0;
    let transactionalCount = 0;
    let unclassifiedCount = 0;
    let totalTokens = 0;
    let intentCoverageScore = 0;
    let intentBalanceScore = 0;
    let intentDiversityScore = 0;
    let intentGapIndex = 0;
    let intentFallbackMode = false;

    if (intentCoverage) {
      // Phase 18: Use Bible-driven Intent Coverage (Phase 17)
      const combined = intentCoverage.combinedDistribution;
      navigationalCount = combined.navigational || 0;
      informationalCount = combined.informational || 0;
      commercialCount = combined.commercial || 0;
      transactionalCount = combined.transactional || 0;
      unclassifiedCount = combined.unclassified || 0;
      totalTokens = navigationalCount + informationalCount + commercialCount + transactionalCount + unclassifiedCount;
      intentCoverageScore = intentCoverage.overallScore || 0;
      intentFallbackMode = !!intentCoverage.fallbackMode;

      // Calculate balance score (entropy-based)
      intentBalanceScore = this.calculateIntentBalanceScore(combined);

      // Calculate diversity score (number of distinct intent types present)
      intentDiversityScore = this.calculateIntentDiversityScore(combined);

      // Calculate gap index (number of missing important intent types)
      intentGapIndex = this.calculateIntentGapIndex(combined);
    } else if (intentSignals) {
      // Fallback: Legacy Autocomplete Intelligence
      navigationalCount = intentSignals.navigationalCount || 0;
      informationalCount = intentSignals.informationalCount || 0;
      commercialCount = intentSignals.commercialCount || 0;
      transactionalCount = intentSignals.transactionalCount || 0;
      totalTokens = navigationalCount + informationalCount + commercialCount + transactionalCount;
    }

    const totalIntentKeywords = navigationalCount + informationalCount + commercialCount + transactionalCount;

    return {
      // Structural
      titleCharCount,
      subtitleCharCount,
      titleCharLimit,
      subtitleCharLimit,
      titleWordCount,
      subtitleWordCount,
      titleTokenDensity,
      subtitleTokenDensity,

      // Keyword architecture
      titleHighValueKeywordCount: titleHighValueTokens.length,
      subtitleHighValueIncrementalKeywords: subtitleHighValueIncremental.length,
      titleNoiseRatio,
      subtitleNoiseRatio,
      titleGenericComboCount,
      titleBrandedComboCount,
      subtitleIncrementalGenericComboCount,
      lowValueComboRatio: totalCombos > 0 ? lowValueComboCount / totalCombos : 0,
      titleLanguageVerbPairs,
      totalUniqueKeywordCoverage,

      // Hook strength
      titleActionVerbs,
      subtitleActionVerbs,
      titleBenefitWords,
      subtitleBenefitWords,
      titleMeaningfulTokens: titleMeaningfulTokens.length,
      subtitleMeaningfulTokens: subtitleMeaningfulTokens.length,
      titleNoiseInfo,
      subtitleNoiseInfo,

      // Brand vs generic
      brandPresenceTitle,
      brandPresenceSubtitle,
      brandStats,
      totalCombos,

      // Psychology
      urgencyCount,
      socialProofCount,
      benefitKeywordCount,
      actionVerbCount,
      totalMeaningfulTokens,
      repeatedTokens,

      // Intent (Legacy + Phase 18 Bible-driven)
      navigationalCount,
      informationalCount,
      commercialCount,
      transactionalCount,
      unclassifiedCount,
      totalTokens,
      totalIntentKeywords,
      intentCoverageScore, // Phase 18: Overall intent coverage (0-100)
      intentBalanceScore, // Phase 18: Entropy-based balance
      intentDiversityScore, // Phase 18: Number of distinct intent types
      intentGapIndex, // Phase 18: Missing intent types
      intentFallbackMode,

      // Phase 21: Vertical Intelligence Layer
      activeRuleSet: data.activeRuleSet,
      tokensTitle,
      tokensSubtitle,
    };
  }

  /**
   * Count language-verb semantic pairs (e.g., "learn spanish", "speak french")
   */
  private static countLanguageVerbPairs(tokens: string[]): number {
    let count = 0;
    for (let i = 0; i < tokens.length - 1; i++) {
      const token1 = tokens[i].toLowerCase();
      const token2 = tokens[i + 1].toLowerCase();

      const hasLanguage = LANGUAGES.has(token1) || LANGUAGES.has(token2);
      const hasVerb = ACTION_VERBS.has(token1) || ACTION_VERBS.has(token2);

      if (hasLanguage && hasVerb) {
        count++;
      }
    }
    return count;
  }

  /**
   * Compute a single KPI value from primitives
   */
  private static computeKpi(kpiId: KpiId, primitives: any): number {
    switch (kpiId) {
      // Clarity & Structure
      case 'title_char_usage':
        return primitives.titleCharLimit > 0 ? (primitives.titleCharCount / primitives.titleCharLimit) * 100 : 0;

      case 'subtitle_char_usage':
        return primitives.subtitleCharLimit > 0 ? (primitives.subtitleCharCount / primitives.subtitleCharLimit) * 100 : 0;

      case 'title_word_count':
        return primitives.titleWordCount;

      case 'subtitle_word_count':
        return primitives.subtitleWordCount;

      case 'title_token_density':
        return primitives.titleTokenDensity;

      case 'subtitle_token_density':
        return primitives.subtitleTokenDensity;

      // Keyword Architecture
      case 'title_high_value_keyword_count':
        return primitives.titleHighValueKeywordCount;

      case 'subtitle_high_value_incremental_keywords':
        return primitives.subtitleHighValueIncrementalKeywords;

      case 'title_noise_ratio': {
        const baseScore = Math.max(0, Math.min(100, 100 - primitives.titleNoiseRatio * 100));
        return Math.max(0, baseScore - primitives.titleNoiseInfo.penalty);
      }

      case 'subtitle_noise_ratio': {
        const baseScore = Math.max(0, Math.min(100, 100 - primitives.subtitleNoiseRatio * 100));
        return Math.max(0, baseScore - primitives.subtitleNoiseInfo.penalty);
      }

      case 'title_combo_count_generic':
        return primitives.titleGenericComboCount;

      case 'title_combo_count_branded':
        return primitives.titleBrandedComboCount;

      case 'subtitle_combo_incremental_generic':
        return primitives.subtitleIncrementalGenericComboCount;

      case 'subtitle_low_value_combo_ratio':
        return primitives.lowValueComboRatio;

      case 'title_semantic_keyword_pairs':
      case 'title_language_verb_pairs': // Legacy alias for backwards compatibility
        return primitives.titleLanguageVerbPairs;

      case 'total_unique_keyword_coverage':
        return primitives.totalUniqueKeywordCoverage;

      // Hook Strength
      case 'hook_strength_title':
        return this.calculateHookStrength(
          primitives.titleActionVerbs,
          primitives.titleBenefitWords,
          primitives.titleMeaningfulTokens
        );

      case 'hook_strength_subtitle':
        return this.calculateHookStrength(
          primitives.subtitleActionVerbs,
          primitives.subtitleBenefitWords,
          primitives.subtitleMeaningfulTokens
        );

      case 'specificity_score':
        return this.calculateSpecificityScore(primitives);

      case 'benefit_density':
        return primitives.totalMeaningfulTokens > 0
          ? primitives.benefitKeywordCount / primitives.totalMeaningfulTokens
          : 0;

      case 'redundancy_penalty':
        return primitives.repeatedTokens * 10; // Penalty increases with repeated tokens

      // Brand vs Generic
      case 'brand_presence_title':
        return primitives.brandPresenceTitle;

      case 'brand_presence_subtitle':
        return primitives.brandPresenceSubtitle;

      case 'brand_combo_ratio':
        return primitives.brandStats?.brandRatio || 0;

      case 'generic_discovery_combo_ratio':
        return primitives.brandStats?.genericRatio || 0;

      case 'overbranding_indicator':
        return primitives.brandStats?.brandRatio > 0.7 ? 1 : 0;

      // Psychology Alignment
      case 'urgency_signal': {
        const scaled = Math.log(primitives.urgencyCount + 1) * 40;
        return Math.min(100, Math.round(scaled));
      }

      case 'social_proof_signal': {
        const scaled = Math.log(primitives.socialProofCount + 1) * 40;
        return Math.min(100, Math.round(scaled));
      }

      case 'benefit_keyword_count':
        return primitives.benefitKeywordCount;

      case 'action_verb_density':
        return primitives.totalMeaningfulTokens > 0
          ? primitives.actionVerbCount / primitives.totalMeaningfulTokens
          : 0;

      // Phase 18: Intent Quality (Bible-driven)
      case 'informational_intent_coverage_score':
        return primitives.totalTokens > 0
          ? (primitives.informationalCount / primitives.totalTokens) * 100
          : 0;

      case 'commercial_intent_coverage_score':
        return primitives.totalTokens > 0
          ? (primitives.commercialCount / primitives.totalTokens) * 100
          : 0;

      case 'transactional_intent_coverage_score':
        return primitives.totalTokens > 0
          ? (primitives.transactionalCount / primitives.totalTokens) * 100
          : 0;

      case 'navigational_noise_ratio':
        // navigational + unclassified = noise (lower is better)
        const noiseCount = primitives.navigationalCount + primitives.unclassifiedCount;
        return primitives.totalTokens > 0
          ? (noiseCount / primitives.totalTokens) * 100
          : 0;

      case 'intent_balance_score':
        return primitives.intentBalanceScore;

      case 'intent_diversity_score':
        return primitives.intentDiversityScore;

      case 'intent_gap_index':
        return primitives.intentGapIndex;

      case 'intent_alignment_score':
        // Vertical-specific intent alignment
        // TODO: Implement vertical-specific expectations
        return primitives.intentCoverageScore; // For now, use overall coverage

      case 'intent_quality_score':
        // Weighted blend of all intent quality metrics
        return this.calculateIntentQualityScore(primitives);

      // Phase 21: Vertical Intelligence Layer - Vertical Modifier KPIs
      case 'vertical_legitimacy_signal':
        return this.calculateVerticalModifierScore(
          'vertical_legitimacy_signal',
          primitives,
          primitives.activeRuleSet
        );

      case 'vertical_speed_signal':
        return this.calculateVerticalModifierScore(
          'vertical_speed_signal',
          primitives,
          primitives.activeRuleSet
        );

      case 'vertical_benefit_specificity':
        return this.calculateVerticalModifierScore(
          'vertical_benefit_specificity',
          primitives,
          primitives.activeRuleSet
        );

      case 'vertical_trust_reassurance':
        return this.calculateVerticalModifierScore(
          'vertical_trust_reassurance',
          primitives,
          primitives.activeRuleSet
        );

      case 'vertical_effort_ratio':
        return this.calculateVerticalModifierScore(
          'vertical_effort_ratio',
          primitives,
          primitives.activeRuleSet
        );

      case 'vertical_feature_clarity':
        return this.calculateVerticalModifierScore(
          'vertical_feature_clarity',
          primitives,
          primitives.activeRuleSet
        );

      default:
        return 0;
    }
  }

  /**
   * Calculate hook strength (0-100)
   */
  private static calculateHookStrength(
    actionVerbs: number,
    benefitWords: number,
    meaningfulTokens: number
  ): number {
    if (meaningfulTokens === 0) return 0;

    const actionScore = Math.min(actionVerbs * 30, 50);
    const benefitScore = Math.min(benefitWords * 20, 30);
    const densityScore = Math.min((actionVerbs + benefitWords) / meaningfulTokens * 100, 20);

    return Math.min(actionScore + benefitScore + densityScore, 100);
  }

  /**
   * Calculate specificity score (0-100)
   */
  private static calculateSpecificityScore(primitives: any): number {
    // High-value keywords indicate specificity
    const specificityFromKeywords = Math.min(
      (primitives.titleHighValueKeywordCount + primitives.subtitleHighValueIncrementalKeywords) * 15,
      60
    );

    // Language-verb pairs indicate specificity
    const specificityFromPairs = Math.min(primitives.titleLanguageVerbPairs * 20, 40);

    return Math.min(specificityFromKeywords + specificityFromPairs, 100);
  }

  /**
   * Calculate intent alignment (0-100)
   * @deprecated Legacy method - use intent_quality KPIs instead
   */
  private static calculateIntentAlignment(primitives: any): number {
    if (primitives.totalIntentKeywords === 0) return 0;

    // Good alignment = balanced intent distribution
    const intentCounts = [
      primitives.navigationalCount,
      primitives.informationalCount,
      primitives.commercialCount,
      primitives.transactionalCount,
    ].filter(c => c > 0);

    // More intent types = better alignment
    const diversityScore = (intentCounts.length / 4) * 50;

    // Discovery bias (informational + commercial) is preferred
    const discoveryCount = primitives.informationalCount + primitives.commercialCount;
    const discoveryScore = primitives.totalIntentKeywords > 0
      ? (discoveryCount / primitives.totalIntentKeywords) * 50
      : 0;

    return Math.min(diversityScore + discoveryScore, 100);
  }

  /**
   * Phase 18: Calculate intent balance score using Shannon entropy (0-100)
   * Higher entropy = more balanced distribution
   */
  private static calculateIntentBalanceScore(distribution: any): number {
    const counts = [
      distribution.informational || 0,
      distribution.commercial || 0,
      distribution.transactional || 0,
      distribution.navigational || 0,
    ];

    const total = counts.reduce((sum, c) => sum + c, 0);
    if (total === 0) return 0;

    // Calculate Shannon entropy
    let entropy = 0;
    for (const count of counts) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to 0-100 (max entropy for 4 categories is log2(4) = 2)
    const maxEntropy = Math.log2(4);
    const normalizedEntropy = (entropy / maxEntropy) * 100;

    return Math.round(normalizedEntropy);
  }

  /**
   * Phase 18: Calculate intent diversity score (0-100)
   * Number of distinct intent types present, scaled 0-100
   */
  private static calculateIntentDiversityScore(distribution: any): number {
    const counts = [
      distribution.informational || 0,
      distribution.commercial || 0,
      distribution.transactional || 0,
      distribution.navigational || 0,
    ];

    // Count non-zero intent types
    const presentTypes = counts.filter(c => c > 0).length;

    // Scale to 0-100 (4 types = 100, 3 types = 75, 2 types = 50, 1 type = 25, 0 types = 0)
    return Math.round((presentTypes / 4) * 100);
  }

  /**
   * Phase 18: Calculate intent gap index (0-100)
   * Measures how many important intent types are missing
   * Lower is better (0 = no gaps, 100 = all gaps)
   */
  private static calculateIntentGapIndex(distribution: any): number {
    const counts = [
      distribution.informational || 0,
      distribution.commercial || 0,
      distribution.transactional || 0,
      // Note: navigational is not counted as "important" since it's brand-focused
    ];

    // Count missing important intent types
    const missingTypes = counts.filter(c => c === 0).length;

    // Scale to 0-100 (0 missing = 0, 1 missing = 33, 2 missing = 67, 3 missing = 100)
    return Math.round((missingTypes / 3) * 100);
  }

  /**
   * Phase 18: Calculate overall intent quality score (0-100)
   * Weighted blend of all intent quality metrics
   */
  private static calculateIntentQualityScore(primitives: any): number {
    if (primitives.intentFallbackMode) {
      return INTENT_FALLBACK_NORMALIZED_FLOOR;
    }

    if (primitives.totalTokens === 0) return 0;

    // Calculate coverage scores
    const informationalCoverage = primitives.totalTokens > 0
      ? (primitives.informationalCount / primitives.totalTokens) * 100
      : 0;
    const commercialCoverage = primitives.totalTokens > 0
      ? (primitives.commercialCount / primitives.totalTokens) * 100
      : 0;
    const transactionalCoverage = primitives.totalTokens > 0
      ? (primitives.transactionalCount / primitives.totalTokens) * 100
      : 0;

    // Calculate noise ratio (lower is better, so invert it)
    const noiseCount = primitives.navigationalCount + primitives.unclassifiedCount;
    const noiseRatio = primitives.totalTokens > 0
      ? (noiseCount / primitives.totalTokens) * 100
      : 0;
    const noiseScore = Math.max(0, 100 - noiseRatio); // Invert: 0% noise = 100 score

    // Weighted blend
    const qualityScore =
      informationalCoverage * 0.25 +    // 25% weight on informational
      commercialCoverage * 0.20 +       // 20% weight on commercial
      transactionalCoverage * 0.15 +    // 15% weight on transactional
      primitives.intentBalanceScore * 0.20 + // 20% weight on balance
      primitives.intentDiversityScore * 0.10 + // 10% weight on diversity
      noiseScore * 0.10;                // 10% weight on noise (inverted)

    return Math.round(Math.min(100, qualityScore));
  }

  /**
   * Calculate Vertical Modifier KPI score (Phase 21: Vertical Intelligence Layer)
   *
   * Formula: count(matched_tokens) * 25 * weight_multiplier, capped at 100
   *
   * Tokens are loaded from vertical template metadata's kpi_modifiers section.
   * Each KPI has its own token list and weight multiplier.
   *
   * @param kpiId - KPI ID (e.g., 'vertical_legitimacy_signal')
   * @param primitives - KPI primitives (includes title/subtitle tokens)
   * @param activeRuleSet - Active merged rule set with template metadata
   * @returns Score 0-100
   */
  private static calculateVerticalModifierScore(
    kpiId: string,
    primitives: any,
    activeRuleSet?: any
  ): number {
    // If no active rule set or no template metadata, return 0
    if (!activeRuleSet) {
      return 0;
    }

    // Merge template metadata: vertical → market → client (last wins)
    const mergedTemplate = {
      ...(activeRuleSet.verticalTemplateMeta || {}),
      ...(activeRuleSet.marketTemplateMeta || {}),
      ...(activeRuleSet.clientTemplateMeta || {}),
    };

    // Get kpi_modifiers from merged template
    const kpiModifiers = mergedTemplate.kpi_modifiers;
    if (!kpiModifiers || !kpiModifiers[kpiId]) {
      return 0;
    }

    const modifier = kpiModifiers[kpiId];

    // Check if modifier is enabled (default: true)
    if (modifier.enabled === false) {
      return 0;
    }

    // Get tokens and weight
    const tokens = modifier.tokens || [];
    const weightMultiplier = modifier.weight || 1.0;

    // Clamp weight to 0.5-2.0 range
    const clampedWeight = Math.max(0.5, Math.min(2.0, weightMultiplier));

    // Get title + subtitle tokens
    const allTokens = [
      ...(primitives.tokensTitle || []),
      ...(primitives.tokensSubtitle || []),
    ].map((t: string) => t.toLowerCase());

    // Count how many vertical tokens appear in title+subtitle
    const matchedTokens = tokens.filter((token: string) =>
      allTokens.includes(token.toLowerCase())
    );

    const matchCount = matchedTokens.length;

    // Formula: count * 25 * weight, capped at 100
    const score = Math.min(100, matchCount * 25 * clampedWeight);

    if (process.env.NODE_ENV === 'development' && matchCount > 0) {
      console.log(`[KPI Engine] ${kpiId}: matched ${matchCount} tokens (${matchedTokens.join(', ')}), score=${score}`);
    }

    return Math.round(score);
  }

  /**
   * Normalize KPI value to 0-100 scale based on direction and bounds
   */
  private static normalizeValue(value: number, def: KpiDefinition): number {
    const { minValue, maxValue, direction, targetValue, targetTolerance } = def;

    // Clamp to bounds
    const clamped = Math.max(minValue, Math.min(maxValue, value));

    switch (direction) {
      case 'higher_is_better':
        // Linear normalization: 0 at min, 100 at max
        if (maxValue === minValue) return 100;
        return ((clamped - minValue) / (maxValue - minValue)) * 100;

      case 'lower_is_better':
        // Inverse normalization: 100 at min, 0 at max
        if (maxValue === minValue) return 100;
        return ((maxValue - clamped) / (maxValue - minValue)) * 100;

      case 'target_range':
        // Peak at target, decline outside tolerance
        if (targetValue === undefined || targetTolerance === undefined) {
          // Fallback to higher_is_better
          return ((clamped - minValue) / (maxValue - minValue)) * 100;
        }

        const distance = Math.abs(clamped - targetValue);
        if (distance <= targetTolerance) {
          // Within tolerance: 100
          return 100;
        } else {
          // Outside tolerance: decline linearly
          const maxDistance = Math.max(
            Math.abs(maxValue - targetValue),
            Math.abs(minValue - targetValue)
          );
          const decay = ((maxDistance - distance) / maxDistance) * 100;
          return Math.max(0, decay);
        }

      default:
        return 0;
    }
  }
}
