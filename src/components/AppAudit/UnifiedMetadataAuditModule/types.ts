/**
 * Types for Unified Metadata Audit V2
 *
 * Matches backend UnifiedMetadataAuditResult from metadata-audit-v2 Edge Function.
 */

import type { CombinedSearchIntentCoverage } from '@/engine/asoBible/searchIntentCoverageEngine';
import type { LeakWarning } from '@/engine/asoBible/ruleset.types';
import type { AppCapabilityMap } from '@/types/auditV2';
import type { GapAnalysisResult } from '@/types/gapAnalysis';
import type { ExecutiveRecommendations } from '@/types/executiveRecommendations';

export type MetadataElement = 'title' | 'subtitle' | 'description';

export type ComboType = 'branded' | 'generic' | 'low_value';

/**
 * Brand classification type (Phase 5)
 * - brand: Contains canonical brand name or aliases
 * - generic: Meaningful keywords/combos without brand
 * - competitor: Contains competitor brand names
 */
export type BrandClassification = 'brand' | 'generic' | 'competitor';

export interface ClassifiedCombo {
  text: string;
  type: ComboType;
  relevanceScore: number;  // 0-3
  source?: 'title' | 'subtitle' | 'title+subtitle' | 'custom';  // Combo source (custom for user-added keywords)

  // Phase 5: Brand Intelligence (optional fields)
  brandClassification?: BrandClassification;
  matchedBrandAlias?: string;
  matchedCompetitor?: string;

  // Keyword Combo Workbench: Client-side editing fields (optional)
  userMarkedAsNoise?: boolean;  // User-controlled noise flag
  userEditedText?: string;       // Edited version (original preserved in text)
  intentClass?: 'learning' | 'outcome' | 'brand' | 'noise';  // Intent classification

  // V2.1 Enhanced metrics (optional for backward compatibility)
  priorityScore?: number;
  noiseConfidence?: number;
  enhancedStrategicValue?: number;
  searchVolumeEstimate?: number;
  competitionLevel?: string;
  isCompetitorBranded?: boolean;
}

/**
 * ComboStrength enum - 10-tier strength classification
 * v2.3: Backend-only combo generation
 */
export enum ComboStrength {
  TITLE_CONSECUTIVE = 'title_consecutive',           // Tier 1: 🔥🔥🔥 (score: 100)
  TITLE_NON_CONSECUTIVE = 'title_non_consecutive',   // Tier 2: 🔥🔥 (score: 85)
  TITLE_KEYWORDS_CROSS = 'title_keywords_cross',     // Tier 2: 🔥⚡ (score: 85)
  CROSS_ELEMENT = 'cross_element',                   // Tier 3: ⚡ (score: 70)
  KEYWORDS_CONSECUTIVE = 'keywords_consecutive',     // Tier 4: 💤 (score: 50)
  SUBTITLE_CONSECUTIVE = 'subtitle_consecutive',     // Tier 4: 💤 (score: 50)
  KEYWORDS_SUBTITLE_CROSS = 'keywords_subtitle_cross', // Tier 5: 💤⚡ (score: 35)
  KEYWORDS_NON_CONSECUTIVE = 'keywords_non_consecutive', // Tier 6: 💤💤 (score: 25)
  SUBTITLE_NON_CONSECUTIVE = 'subtitle_non_consecutive', // Tier 6: 💤💤 (score: 25)
  THREE_WAY_CROSS = 'three_way_cross',               // Tier 7: 💤💤💤 (score: 15)
  MISSING = 'missing',                               // Missing: ❌ (score: 0)
}

/**
 * GeneratedCombo - Rich combo object from backend with strength classification
 * v2.3: Replaces frontend combo generation
 */
export interface GeneratedCombo {
  id: string;                              // UUID for stable identity
  text: string;                            // Combo text (e.g., "meditation mindfulness")
  keywords: string[];                      // Individual keywords in combo
  length: number;                          // Number of words (2, 3, or 4)
  exists: boolean;                         // Exists in metadata?
  source: 'title' | 'subtitle' | 'keywords' | 'both' | 'cross' | 'missing';
  strength: ComboStrength;                 // 10-tier strength classification
  strengthScore: number;                   // Numeric score (0-100)
  isConsecutive: boolean;                  // Words appear consecutively?
  canStrengthen: boolean;                  // Can be strengthened?
  strengtheningSuggestion?: string;        // How to strengthen
  isBranded: boolean;                      // Contains brand keywords?
  isGeneric: boolean;                      // Generic (non-branded)?
}

export interface RuleEvaluationResult {
  ruleId: string;
  passed: boolean;
  score: number;
  bonus?: number;
  penalty?: number;
  message: string;
  evidence?: string[];
}

export interface BenchmarkComparison {
  score: number;
  categoryAverage: number;
  percentile: number;
  vsAverage: number;
  tier: string;
  message: string;
  insight: string;
}

export interface ElementScoringResult {
  element: MetadataElement;
  score: number;
  ruleResults: RuleEvaluationResult[];
  recommendations: string[];
  insights: string[];
  metadata: {
    characterUsage: number;
    maxCharacters: number;
    keywords: string[];
    combos?: string[];
    benchmarkComparison?: BenchmarkComparison | null;
  };
}

/**
 * Vertical Context - Vertical Intelligence Layer (Phase 21 + Phase 2A)
 *
 * Provides vertical-specific intelligence for metadata optimization
 */
export interface VerticalContext {
  // Phase 2A: Category fields
  categoryId?: string;
  categoryName?: string;
  categoryConfidence?: 'high' | 'medium' | 'low';
  categorySource?: 'genre_id' | 'genre_name' | 'fallback';

  verticalId: string;
  verticalName: string;
  marketId?: string;
  marketName?: string;
  ruleSetSource: 'base' | 'category' | 'vertical' | 'market' | 'client';

  // Template metadata
  overview?: {
    category_keywords: string[];
    discovery_drivers: string[];
    retention_hooks: string[];
    description?: string;
  };

  benchmarks?: {
    generic_combo_count: { excellent: number; good: number; moderate: number };
    intent_balance_targets: Record<string, number>;
    custom?: Record<string, number | { min: number; max: number; target: number }>;
  };

  keyword_clusters?: Array<{
    cluster_name: string;
    keywords: string[];
    intent_type: string;
    weight?: number;
    examples?: string[];
  }>;

  conversion_drivers?: Array<{
    hook_category: string;
    weight_multiplier: number;
    examples: string[];
    keywords?: string[];
  }>;

  kpi_modifiers?: Record<
    string,
    {
      tokens: string[];
      weight: number;
      description?: string;
      enabled?: boolean;
    }
  >;

  // Inheritance info (Phase 2A: added category layer)
  inheritanceChain?: {
    base?: { id: string; name: string };
    category?: { id: string; name: string; confidence?: 'high' | 'medium' | 'low' };
    vertical?: { id: string; name: string };
    market?: { id: string; name: string };
    client?: { id: string; name: string };
  };
}

export interface UnifiedMetadataAuditResult {
  overallScore: number;  // Ranking score only (title + subtitle)
  elements: {
    title: ElementScoringResult;
    subtitle: ElementScoringResult;
    description: ElementScoringResult;  // Kept for UI compatibility, weight = 0
  };
  topRecommendations: string[];  // Ranking recommendations
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
    // NEW v2.3: Backend-generated rich combo objects with strength classification
    combos?: GeneratedCombo[];
    stats?: {
      totalPossible: number;
      existing: number;
      missing: number;
      coveragePct: number;
      // Strength tier breakdown (10 tiers)
      titleConsecutive?: number;
      titleNonConsecutive?: number;
      titleKeywordsCross?: number;
      crossElement?: number;
      keywordsConsecutive?: number;
      subtitleConsecutive?: number;
      keywordsSubtitleCross?: number;
      keywordsNonConsecutive?: number;
      subtitleNonConsecutive?: number;
      threeWayCross?: number;
      missing?: number;
    };
    // NEW v2.3: Pre-calculated stats by brand type (for frontend filtering)
    statsByBrandType?: {
      all: {
        totalPossible: number;
        existing: number;
        missing: number;
        coveragePct: number;
        titleConsecutive: number;
        titleNonConsecutive: number;
        titleKeywordsCross: number;
        crossElement: number;
        keywordsConsecutive: number;
        subtitleConsecutive: number;
        keywordsSubtitleCross: number;
        keywordsNonConsecutive: number;
        subtitleNonConsecutive: number;
        threeWayCross: number;
      };
      generic: {
        totalPossible: number;
        existing: number;
        missing: number;
        coveragePct: number;
        titleConsecutive: number;
        titleNonConsecutive: number;
        titleKeywordsCross: number;
        crossElement: number;
        keywordsConsecutive: number;
        subtitleConsecutive: number;
        keywordsSubtitleCross: number;
        keywordsNonConsecutive: number;
        subtitleNonConsecutive: number;
        threeWayCross: number;
      };
      branded: {
        totalPossible: number;
        existing: number;
        missing: number;
        coveragePct: number;
        titleConsecutive: number;
        titleNonConsecutive: number;
        titleKeywordsCross: number;
        crossElement: number;
        keywordsConsecutive: number;
        subtitleConsecutive: number;
        keywordsSubtitleCross: number;
        keywordsNonConsecutive: number;
        subtitleNonConsecutive: number;
        threeWayCross: number;
      };
    };
    // Legacy fields (backward compatibility)
    totalCombos: number;
    titleCombos: string[];
    subtitleNewCombos: string[];
    allCombinedCombos: string[];
    twoWordCombos?: number; // v2.1: Count of 2-word combos
    threeWordCombos?: number; // v2.1: Count of 3-word combos
    fourWordCombos?: number; // v2.2: Count of 4-word combos
    // Classified combos (V2.1+)
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
    lowValueCombos?: ClassifiedCombo[];
  };
  conversionInsights: {
    description: {
      score: number;  // Conversion quality score, NOT ranking
      readability: number;
      hookStrength: number;
      featureMentions: number;
      ctaStrength: number;
      noiseRatio: number;
      recommendations: string[];
    };
  };
  // Phase 17: Search Intent Coverage (Bible-driven, token-level)
  intentCoverage?: CombinedSearchIntentCoverage;
  // Phase 20: Intent Engine Diagnostics (DEV ONLY)
  intentEngineDiagnostics?: {
    patternsLoaded: number;
    fallbackMode: boolean;
    cacheTtlRemaining: number; // seconds until cache expires
  };
  ruleSetDiagnostics?: {
    leakWarnings?: LeakWarning[];
    ruleSetSource?: string;
    verticalId?: string;
    marketId?: string;
    discoveryThresholdSource?: 'ruleset' | 'default';
    overrideScopesApplied?: string[];
    snapshotCreatedAt?: string;
    snapshotAgeMs?: number;
  };

  // Vertical Intelligence Layer (Phase 21)
  verticalContext?: VerticalContext;

  // v2.0: Description Intelligence (Phase 2)
  capabilityMap?: AppCapabilityMap;

  // v2.0: Gap Analysis (Phase 3)
  gapAnalysis?: GapAnalysisResult;

  // v2.0: Executive Recommendations (Phase 4)
  executiveRecommendations?: ExecutiveRecommendations;

  // v2.1: Keyword Frequency Analysis (Competitive Intelligence)
  keywordFrequency?: KeywordFrequencyResult[];

  // KPI Engine results (UI compatibility)
  kpis?: {
    overall_score?: number;
    [key: string]: any;
  };
}

/**
 * Keyword Frequency Analysis Result
 * Shows which keywords appear in the most combinations (strategic keywords)
 */
export interface KeywordFrequencyResult {
  keyword: string;
  totalCombos: number;
  twoWordCombos: number;
  threeWordCombos: number;
  fourPlusCombos: number;
  sampleCombos: string[]; // Max 5 samples
}

export interface MetadataAuditV2Response {
  success: boolean;
  data?: UnifiedMetadataAuditResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  _meta?: {
    app_id: string;
    platform: string;
    locale: string;
    source: string;
    executionTimeMs: number;
  };
}
