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
    });

    // Compute all KPIs
    const kpis: Record<KpiId, KpiResult> = {};
    const vector: number[] = [];

    for (const kpiDef of KPI_DEFINITIONS) {
      const rawValue = this.computeKpi(kpiDef.id, primitives);
      const normalized = this.normalizeValue(rawValue, kpiDef);

      kpis[kpiDef.id] = {
        id: kpiDef.id,
        familyId: kpiDef.familyId,
        value: rawValue,
        normalized,
        label: kpiDef.label,
      };

      vector.push(normalized);
    }

    // Compute family scores
    const families: Record<KpiFamilyId, KpiFamilyResult> = {};

    for (const familyDef of FAMILY_DEFINITIONS) {
      const familyKpis = KPI_DEFINITIONS.filter(k => k.familyId === familyDef.id);
      const weightedSum = familyKpis.reduce((sum, kpiDef) => {
        const kpiResult = kpis[kpiDef.id];
        return sum + (kpiResult.normalized * kpiDef.weight);
      }, 0);
      const totalWeight = familyKpis.reduce((sum, kpiDef) => sum + kpiDef.weight, 0);
      const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

      families[familyDef.id] = {
        id: familyDef.id,
        label: familyDef.label,
        score: Math.round(score * 100) / 100,
        kpiIds: familyKpis.map(k => k.id),
        weight: familyDef.weight,
      };
    }

    // Compute overall score (weighted average of family scores)
    const overallScore = FAMILY_DEFINITIONS.reduce((sum, familyDef) => {
      const familyResult = families[familyDef.id];
      return sum + (familyResult.score * familyDef.weight);
    }, 0);

    // Build result
    return {
      version: KPI_ENGINE_VERSION,
      vector,
      kpis,
      families,
      overallScore: Math.round(overallScore * 100) / 100,
      debug: {
        title,
        subtitle,
        tokensTitle,
        tokensSubtitle,
        titleHighValueKeywords: primitives.titleHighValueKeywordCount,
        subtitleHighValueKeywords: primitives.subtitleHighValueIncrementalKeywords,
        brandComboCount: primitives.brandComboCount,
        genericComboCount: primitives.genericComboCount,
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

    // Combo metrics
    const titleGenericComboCount = comboCoverage?.titleCombosClassified?.filter((c: any) => c.type === 'generic').length || 0;
    const titleBrandedComboCount = comboCoverage?.titleCombosClassified?.filter((c: any) => c.type === 'branded').length || 0;
    const subtitleIncrementalGenericComboCount = comboCoverage?.subtitleNewCombosClassified?.filter((c: any) => c.type === 'generic').length || 0;
    const lowValueComboCount = comboCoverage?.lowValueCombos?.length || 0;
    const totalCombos = comboCoverage?.totalCombos || 0;

    // Brand metrics
    const brandComboCount = comboCoverage?.titleCombosClassified?.filter((c: any) => c.brandClassification === 'brand').length || 0;
    const genericComboCount = comboCoverage?.titleCombosClassified?.filter((c: any) => c.brandClassification === 'generic').length || 0;
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

    // Intent metrics
    const navigationalCount = intentSignals?.navigationalCount || 0;
    const informationalCount = intentSignals?.informationalCount || 0;
    const commercialCount = intentSignals?.commercialCount || 0;
    const transactionalCount = intentSignals?.transactionalCount || 0;
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

      // Brand vs generic
      brandPresenceTitle,
      brandPresenceSubtitle,
      brandComboCount,
      genericComboCount,
      totalCombos,

      // Psychology
      urgencyCount,
      socialProofCount,
      benefitKeywordCount,
      actionVerbCount,
      totalMeaningfulTokens,
      repeatedTokens,

      // Intent
      navigationalCount,
      informationalCount,
      commercialCount,
      transactionalCount,
      totalIntentKeywords,
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

      case 'title_noise_ratio':
        return primitives.titleNoiseRatio;

      case 'subtitle_noise_ratio':
        return primitives.subtitleNoiseRatio;

      case 'title_combo_count_generic':
        return primitives.titleGenericComboCount;

      case 'title_combo_count_branded':
        return primitives.titleBrandedComboCount;

      case 'subtitle_combo_incremental_generic':
        return primitives.subtitleIncrementalGenericComboCount;

      case 'subtitle_low_value_combo_ratio':
        return primitives.lowValueComboRatio;

      case 'title_language_verb_pairs':
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
        return primitives.totalCombos > 0
          ? primitives.brandComboCount / primitives.totalCombos
          : 0;

      case 'generic_discovery_combo_ratio':
        return primitives.totalCombos > 0
          ? primitives.genericComboCount / primitives.totalCombos
          : 0;

      case 'overbranding_indicator':
        const brandRatio = primitives.totalCombos > 0 ? primitives.brandComboCount / primitives.totalCombos : 0;
        return brandRatio > 0.7 ? 1 : 0;

      // Psychology Alignment
      case 'urgency_signal':
        return Math.min(primitives.urgencyCount * 30, 100);

      case 'social_proof_signal':
        return Math.min(primitives.socialProofCount * 30, 100);

      case 'benefit_keyword_count':
        return primitives.benefitKeywordCount;

      case 'action_verb_density':
        return primitives.totalMeaningfulTokens > 0
          ? primitives.actionVerbCount / primitives.totalMeaningfulTokens
          : 0;

      // Intent Alignment
      case 'intent_alignment_title_primary':
        return this.calculateIntentAlignment(primitives);

      case 'intent_alignment_subtitle_primary':
        return this.calculateIntentAlignment(primitives);

      case 'navigational_bias':
        return primitives.totalIntentKeywords > 0
          ? (primitives.navigationalCount / primitives.totalIntentKeywords) * 100
          : 0;

      case 'generic_discovery_bias':
        const discoveryCount = primitives.informationalCount + primitives.commercialCount;
        return primitives.totalIntentKeywords > 0
          ? (discoveryCount / primitives.totalIntentKeywords) * 100
          : 0;

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
