/**
 * Types for Unified Metadata Audit V2
 *
 * Matches backend UnifiedMetadataAuditResult from metadata-audit-v2 Edge Function.
 */

import type { CombinedSearchIntentCoverage } from '@/engine/asoBible/searchIntentCoverageEngine';
import type { LeakWarning } from '@/engine/asoBible/ruleset.types';

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
  source?: 'title' | 'subtitle' | 'title+subtitle';  // Combo source

  // Phase 5: Brand Intelligence (optional fields)
  brandClassification?: BrandClassification;
  matchedBrandAlias?: string;
  matchedCompetitor?: string;

  // Keyword Combo Workbench: Client-side editing fields (optional)
  userMarkedAsNoise?: boolean;  // User-controlled noise flag
  userEditedText?: string;       // Edited version (original preserved in text)
  intentClass?: 'learning' | 'outcome' | 'brand' | 'noise';  // Intent classification
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
    totalCombos: number;
    titleCombos: string[];
    subtitleNewCombos: string[];
    allCombinedCombos: string[];
    // Classified combos (V2.1+)
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
    lowValueCombos?: ClassifiedCombo[];
    stats?: {
      total: number;
      totalPossible?: number;
      existing: number;
      missing: number;
      coveragePct: number;
      coverage?: number;
      thresholds?: {
        excellent: number;
        good: number;
        moderate: number;
      };
      missingExamples?: string[];
    };
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
