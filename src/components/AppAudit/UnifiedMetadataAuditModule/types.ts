/**
 * Types for Unified Metadata Audit V2
 *
 * Matches backend UnifiedMetadataAuditResult from metadata-audit-v2 Edge Function.
 */

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
