/**
 * Metadata Scoring Module - Type Definitions
 *
 * Pure TypeScript types for deterministic metadata scoring.
 * No AI calls, no async operations - just pure scoring logic.
 */

/**
 * Token analysis result showing categorization of tokens
 */
export interface TokenAnalysis {
  /** Meaningful tokens that contribute to keyword coverage */
  coreTokens: string[];
  /** Stopwords and generic filler tokens */
  fillerTokens: string[];
  /** Tokens that appear multiple times (redundancy) */
  duplicates: string[];
}

/**
 * N-gram (multi-word combination) analysis
 */
export interface NgramAnalysis {
  /** All n-grams generated (2-word, 3-word, etc.) */
  allCombos: string[];
  /** Meaningful combinations (excluding those with only stopwords) */
  meaningfulCombos: string[];
}

/**
 * Title scoring result with detailed breakdown
 */
export interface TitleScoreResult {
  /** Overall title score (0-100) */
  score: number;

  /** Character usage efficiency score */
  characterUsageScore: number;

  /** Unique keyword density score */
  uniqueKeywordScore: number;

  /** Keyword combination coverage score */
  comboCoverageScore: number;

  /** Semantic quality score (based on positive/negative patterns) */
  semanticScore: number;

  /** Penalty for filler tokens and duplicates */
  duplicationPenalty: number;

  /** Detailed breakdown for debugging and UI display */
  breakdown: {
    /** List of filler tokens found */
    fillerTokens: string[];
    /** List of duplicate tokens found */
    duplicates: string[];
    /** List of meaningful keyword combinations */
    combos: string[];
    /** Total character count */
    characterCount: number;
    /** Max allowed characters */
    maxCharacters: number;
  };
}

/**
 * Subtitle scoring result with incremental value analysis
 */
export interface SubtitleScoreResult {
  /** Overall subtitle score (0-100) */
  score: number;

  /** Character usage efficiency score */
  characterUsageScore: number;

  /** Incremental value score (how much new info vs title) */
  incrementalValueScore: number;

  /** New unique token contribution score */
  newTokenScore: number;

  /** New keyword combination contribution score */
  newComboScore: number;

  /** Keyword combination coverage score */
  comboCoverageScore: number;

  /** Semantic quality score */
  semanticScore: number;

  /** Penalty for filler tokens and duplicates */
  duplicationPenalty: number;

  /** Detailed breakdown for debugging and UI display */
  breakdown: {
    /** Tokens unique to subtitle (not in title) */
    newTokens: string[];
    /** Combinations unique to subtitle */
    newCombos: string[];
    /** List of filler tokens found */
    fillerTokens: string[];
    /** List of duplicate tokens found */
    duplicates: string[];
    /** Total character count */
    characterCount: number;
    /** Max allowed characters */
    maxCharacters: number;
  };
}

/**
 * Combined metadata score (title + subtitle)
 */
export interface CombinedMetadataScoreResult {
  /** Weighted combined metadata score (0-100) */
  metadataScore: number;

  /** Title scoring details */
  title: TitleScoreResult;

  /** Subtitle scoring details */
  subtitle: SubtitleScoreResult;
}

/**
 * Configuration loaded from metadata_scoring.json
 */
export interface MetadataScoringConfig {
  title: {
    weight_in_metadata_score: number;
    character_usage_weight: number;
    unique_keyword_weight: number;
    combination_coverage_weight: number;
    semantic_quality_weight: number;
    duplication_penalty_weight: number;
    max_chars: number;
  };
  subtitle: {
    weight_in_metadata_score: number;
    character_usage_weight: number;
    incremental_value_weight: number;
    combination_coverage_weight: number;
    semantic_quality_weight: number;
    duplication_penalty_weight: number;
    max_chars: number;
  };
  combos: {
    min_ngram: number;
    max_ngram: number;
    weights: {
      "2": number;
      "3": number;
      "4": number;
    };
  };
  penalties: {
    duplication_penalty: number;
  };
}

/**
 * Stopwords configuration
 */
export interface StopwordsConfig {
  stopwords: string[];
}

/**
 * Semantic pattern for scoring
 */
export interface SemanticPattern {
  pattern: string;
  bonus?: number;
  penalty?: number;
  reason: string;
}

/**
 * Semantic rules configuration
 */
export interface SemanticRulesConfig {
  /** Category identifier (e.g., "language_learning", "fitness") */
  category?: string;
  /** Keywords that indicate category relevance */
  category_keywords?: string[];
  /** Brand-related keywords (optional for future use) */
  brand_keywords?: string[];

  title?: {
    brand_required: boolean;
    category_required: boolean;
    benefit_optional: boolean;
  };
  subtitle?: {
    verb_required: boolean;
    benefit_required: boolean;
    time_hint_optional: boolean;
  };
  benefit_keywords?: string[];
  time_keywords?: string[];
  cta_verbs?: string[];
  positive_patterns: SemanticPattern[];
  negative_patterns: SemanticPattern[];
  capitalization_rules: {
    all_caps_penalty: number;
    proper_case_bonus: number;
  };
}

/**
 * Phase 2: Advanced Combination Intelligence Types
 */

/**
 * Intent classification for combinations
 */
export type IntentType = 'Navigational' | 'Informational' | 'Transactional' | 'Noise';

/**
 * Tail length classification for combinations
 */
export type TailLength = 'short-tail' | 'mid-tail' | 'long-tail';

/**
 * Classified combination with all metadata
 */
export interface ClassifiedCombo {
  /** Original combo string */
  combo: string;
  /** Length classification */
  length: TailLength;
  /** Intent classification */
  intent: IntentType;
  /** Contains brand token */
  hasBrand: boolean;
  /** Contains category keyword */
  hasCategory: boolean;
  /** Contains benefit keyword */
  hasBenefit: boolean;
  /** Contains CTA verb */
  hasVerb: boolean;
  /** Contains time hint keyword */
  hasTimeHint: boolean;
  /** Filler ratio (0-1) */
  fillerRatio: number;
  /** Impact score (0-100) */
  impactScore: number;
  /** Is new from subtitle */
  isNew: boolean;
  /** Is part of redundant group */
  isRedundant: boolean;
}

/**
 * Impact score breakdown for a combination
 */
export interface ComboImpactScore {
  /** Original combo string */
  combo: string;
  /** Overall impact score (0-100) */
  score: number;
  /** Detailed breakdown */
  breakdown: {
    /** Category bonus (+30) */
    categoryBonus: number;
    /** Action/verb/benefit bonus (+30) */
    actionBonus: number;
    /** Length bonus (+20 for 4-word, +10 for 3-word) */
    lengthBonus: number;
    /** Filler penalty (-30 if ratio > 0.4) */
    fillerPenalty: number;
    /** Duplication penalty (-20 if has duplicates) */
    duplicationPenalty: number;
  };
}

/**
 * Group of redundant combinations
 */
export interface RedundantGroup {
  /** Shared pattern (e.g., "learn spanish") */
  pattern: string;
  /** Pattern type */
  type: 'prefix' | 'suffix';
  /** Combos in this redundant group */
  combos: string[];
  /** Number of wasted tokens from repetition */
  wastedTokens: number;
}

/**
 * Redundancy analysis result
 */
export interface RedundancyAnalysis {
  /** Redundancy score (0-100, higher = more redundant) */
  redundancyScore: number;
  /** List of redundant groups */
  redundantGroups: RedundantGroup[];
}

/**
 * Strategic opportunity insights
 */
export interface OpportunityInsights {
  /** Missing semantic clusters (e.g., "time-based urgency") */
  missingClusters: string[];
  /** Potential new combos to add */
  potentialCombos: string[];
  /** Estimated score gain (0-100) */
  estimatedGain: number;
  /** Human-readable recommendations */
  actionableInsights: string[];
}

/**
 * Enhanced combination analysis result
 */
export interface ComboAnalysisEnhanced {
  /** All classified combos */
  combos: ClassifiedCombo[];
  /** Aggregate metrics */
  metrics: {
    /** Long-tail strength (0-100, avg impact of 4-word combos) */
    longTailStrength: number;
    /** Intent diversity (0-100, coverage of intent types) */
    intentDiversity: number;
    /** Category coverage (0-100, % combos with category) */
    categoryCoverage: number;
    /** Redundancy index (0-100, from redundancy analysis) */
    redundancyIndex: number;
    /** Average filler ratio (0-1, avg across all combos) */
    avgFillerRatio: number;
  };
  /** Strategic insights */
  insights: OpportunityInsights;
}
