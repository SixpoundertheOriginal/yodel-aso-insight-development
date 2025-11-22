/**
 * KPI Engine - Type Definitions
 *
 * Phase 1: Title & Subtitle KPI Engine
 * Version: v1
 *
 * This module defines the core types for the registry-driven KPI Engine.
 * All KPIs are defined in JSON registries and evaluated deterministically.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * KPI Engine Version
 * Used for versioning KPI definitions and ensuring reproducibility
 */
export type KpiEngineVersion = 'v1';

/**
 * Unique identifier for a KPI
 * e.g., 'title_char_usage', 'brand_presence_title'
 */
export type KpiId = string;

/**
 * Unique identifier for a KPI family
 * e.g., 'clarity_structure', 'keyword_architecture'
 */
export type KpiFamilyId = string;

/**
 * Platform type
 */
export type Platform = 'ios' | 'android';

// ============================================================================
// KPI Definition Types
// ============================================================================

/**
 * Metric type classification
 * - score: 0-100 normalized score
 * - count: absolute count (e.g., 5 keywords)
 * - ratio: 0-1 ratio (e.g., 0.75 brand ratio)
 * - flag: binary 0/1 indicator
 */
export type KpiMetricType = 'score' | 'count' | 'ratio' | 'flag';

/**
 * Direction for KPI optimization
 * - higher_is_better: max value is optimal (e.g., keyword count)
 * - lower_is_better: min value is optimal (e.g., noise ratio)
 * - target_range: optimal value is in middle (e.g., brand balance)
 */
export type KpiDirection = 'higher_is_better' | 'lower_is_better' | 'target_range';

/**
 * KPI Definition from Registry
 *
 * Defines a single KPI with metadata for computation and normalization
 */
export interface KpiDefinition {
  /** Unique KPI identifier */
  id: KpiId;

  /** Family this KPI belongs to */
  familyId: KpiFamilyId;

  /** Human-readable label */
  label: string;

  /** Detailed description of what this KPI measures */
  description: string;

  /** Weight for aggregation within family (0-1) */
  weight: number;

  /** Type of metric */
  metricType: KpiMetricType;

  /** Minimum expected value (for normalization) */
  minValue: number;

  /** Maximum expected value (for normalization) */
  maxValue: number;

  /** Direction for optimization */
  direction: KpiDirection;

  /** Optional: Target value for target_range direction */
  targetValue?: number;

  /** Optional: Target range tolerance for target_range direction */
  targetTolerance?: number;
}

/**
 * KPI Family Definition from Registry
 *
 * Groups related KPIs into logical families for aggregation
 */
export interface KpiFamilyDefinition {
  /** Unique family identifier */
  id: KpiFamilyId;

  /** Human-readable label */
  label: string;

  /** Detailed description */
  description: string;

  /** Weight for overall KPI score aggregation (0-1) */
  weight: number;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Brand signals from Brand Intelligence service
 */
export interface BrandSignals {
  /** Canonical brand name */
  canonicalBrand: string;

  /** Brand aliases for matching */
  brandAliases: string[];

  /** Number of brand combos detected */
  brandComboCount: number;

  /** Number of generic combos detected */
  genericComboCount: number;

  /** Brand presence in title (0-1) */
  brandPresenceTitle: number;

  /** Brand presence in subtitle (0-1) */
  brandPresenceSubtitle: number;
}

/**
 * Intent signals from Intent Intelligence service
 */
export interface IntentSignals {
  /** Navigational keyword count */
  navigationalCount: number;

  /** Informational keyword count */
  informationalCount: number;

  /** Commercial keyword count */
  commercialCount: number;

  /** Transactional keyword count */
  transactionalCount: number;

  /** Dominant intent type */
  dominantIntent: 'navigational' | 'informational' | 'commercial' | 'transactional' | null;
}

/**
 * Combo coverage data from Combo Engine V2
 */
export interface ComboCoverageInput {
  /** Total combo count */
  totalCombos: number;

  /** Title combos */
  titleCombos: string[];

  /** Subtitle new combos (incremental) */
  subtitleNewCombos: string[];

  /** All combined combos */
  allCombinedCombos: string[];

  /** Title combos classified by type */
  titleCombosClassified?: Array<{
    text: string;
    type: 'branded' | 'generic' | 'low_value';
    relevanceScore: number;
    brandClassification?: 'brand' | 'generic' | 'competitor';
  }>;

  /** Subtitle combos classified by type */
  subtitleNewCombosClassified?: Array<{
    text: string;
    type: 'branded' | 'generic' | 'low_value';
    relevanceScore: number;
    brandClassification?: 'brand' | 'generic' | 'competitor';
  }>;

  /** Low value combos */
  lowValueCombos?: Array<{
    text: string;
    type: 'low_value';
    relevanceScore: number;
  }>;
}

/**
 * KPI Engine Input
 *
 * All data needed to compute KPIs for Title & Subtitle
 */
export interface KpiEngineInput {
  /** App title text */
  title: string;

  /** App subtitle text */
  subtitle: string;

  /** Locale/region (e.g., 'us', 'gb') */
  locale: string;

  /** Platform */
  platform: Platform;

  /** Optional: Precomputed title tokens (if not provided, will tokenize) */
  tokensTitle?: string[];

  /** Optional: Precomputed subtitle tokens */
  tokensSubtitle?: string[];

  /** Optional: Precomputed combo coverage */
  comboCoverage?: ComboCoverageInput;

  /** Optional: Precomputed brand signals */
  brandSignals?: BrandSignals;

  /** Optional: Precomputed intent signals */
  intentSignals?: IntentSignals;
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Single KPI result with computed value and normalization
 */
export interface KpiResult {
  /** KPI identifier */
  id: KpiId;

  /** Family identifier */
  familyId: KpiFamilyId;

  /** Raw computed value */
  value: number;

  /** Normalized value (0-100 scale) */
  normalized: number;

  /** Human-readable label */
  label: string;

  /** Optional: Debug information */
  debug?: {
    minValue: number;
    maxValue: number;
    direction: KpiDirection;
    targetValue?: number;
  };
}

/**
 * KPI Family result with aggregated score
 */
export interface KpiFamilyResult {
  /** Family identifier */
  id: KpiFamilyId;

  /** Human-readable label */
  label: string;

  /** Aggregated family score (weighted average of member KPIs, 0-100) */
  score: number;

  /** KPI IDs in this family */
  kpiIds: KpiId[];

  /** Weight used for overall aggregation */
  weight: number;
}

/**
 * KPI Engine Result
 *
 * Complete output with vector, KPI map, family map, and metadata
 */
export interface KpiEngineResult {
  /** Engine version for reproducibility */
  version: KpiEngineVersion;

  /**
   * KPI vector (ordered array of normalized values)
   * Order is stable based on registry sort order
   */
  vector: number[];

  /**
   * KPI map (keyed by KPI ID)
   * Provides detailed information for each KPI
   */
  kpis: Record<KpiId, KpiResult>;

  /**
   * Family map (keyed by family ID)
   * Provides aggregated scores by family
   */
  families: Record<KpiFamilyId, KpiFamilyResult>;

  /**
   * Overall KPI score (weighted average of all families, 0-100)
   */
  overallScore: number;

  /**
   * Optional: Debug information for inspection
   */
  debug?: {
    /** Input title */
    title: string;

    /** Input subtitle */
    subtitle: string;

    /** Title tokens */
    tokensTitle: string[];

    /** Subtitle tokens */
    tokensSubtitle: string[];

    /** Title high-value keyword count */
    titleHighValueKeywords: number;

    /** Subtitle high-value keyword count */
    subtitleHighValueKeywords: number;

    /** Brand combo count */
    brandComboCount: number;

    /** Generic combo count */
    genericComboCount: number;
  };
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * KPI Registry (loaded from JSON)
 */
export interface KpiRegistry {
  /** Array of KPI definitions */
  kpis: KpiDefinition[];
}

/**
 * Family Registry (loaded from JSON)
 */
export interface FamilyRegistry {
  /** Array of family definitions */
  families: KpiFamilyDefinition[];
}
