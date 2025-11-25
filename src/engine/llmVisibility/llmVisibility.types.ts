/**
 * LLM Visibility Engine - Type Definitions
 *
 * Analyzes app descriptions for LLM discoverability and retrieval quality.
 *
 * Phase 1: Rule-based analysis (no LLM calls)
 * Phase 2: AI-powered optimization (with LLM generation)
 *
 * The goal: Optimize descriptions so when users ask ChatGPT/Claude/Perplexity
 * "what's the best fitness app for me?", the app description is easily
 * retrievable and quotable by LLMs.
 */

// ============================================================================
// Core Scoring Components
// ============================================================================

/**
 * Overall LLM Visibility Score (0-100)
 * Composite of 6 sub-scores
 */
export interface LLMVisibilityScore {
  /** Overall score (0-100) */
  overall: number;

  /** Sub-scores */
  factual_grounding: number;     // 0-100: Concrete, verifiable facts
  semantic_clusters: number;      // 0-100: Coverage of key semantic topics
  structure_readability: number;  // 0-100: Chunking, bullets, sentence length
  intent_coverage: number;        // 0-100: Matches user search intents
  snippet_quality: number;        // 0-100: Quotable, self-contained snippets
  safety_credibility: number;     // 0-100: Avoids unverifiable claims

  /** Metadata */
  rules_version: string;
  analyzed_at: string;
  cache_hit?: boolean;
}

/**
 * Analysis result with diagnostics
 */
export interface LLMVisibilityAnalysis {
  score: LLMVisibilityScore;
  findings: LLMFinding[];
  snippets: LLMSnippet[];
  cluster_coverage: ClusterCoverage;
  intent_coverage: IntentCoverage;
  structure_metrics: StructureMetrics;
  metadata: AnalysisMetadata;
}

/**
 * Diagnostic finding (issue/opportunity)
 */
export interface LLMFinding {
  id: string;
  type: 'missing_fact' | 'weak_cluster' | 'structure_issue' | 'safety_risk' | 'intent_gap' | 'snippet_opportunity';
  severity: 'critical' | 'warning' | 'info';
  category: string;  // e.g., 'factual_grounding', 'semantic_clusters'
  message: string;
  suggestion?: string;
  section?: string;  // Which part of description
  impact_score?: number;  // Estimated score impact if fixed
}

/**
 * LLM-friendly snippet
 */
export interface LLMSnippet {
  text: string;
  reason: string;  // Why this is a good snippet
  section: string;  // Where it came from
  quality_score: number;  // 0-100
  intents_matched?: string[];  // Which user intents this answers
}

/**
 * Semantic cluster coverage
 */
export interface ClusterCoverage {
  overall_coverage: number;  // 0-100
  clusters: Array<{
    name: string;
    keywords: string[];
    coverage_score: number;  // 0-100: How well this cluster is represented
    mentions: number;
    examples: string[];  // Sentences that match this cluster
  }>;
}

/**
 * Individual intent item
 */
export interface IntentItem {
  intent_type: 'task' | 'comparison' | 'problem' | 'feature' | 'safety';
  coverage_score: number;  // 0-100
  patterns_matched: string[];
  examples: string[];
}

/**
 * Intent coverage (aligned with existing intent engine)
 */
export interface IntentCoverage {
  overall_coverage: number;  // 0-100
  intents: IntentItem[];

  /** Compare with existing intent engine results */
  comparison_with_intent_engine?: {
    detected_by_rules: string[];
    detected_by_llm_visibility: string[];
    agreement_score: number;  // 0-100
  };
}

/**
 * Structure and readability metrics
 */
export interface StructureMetrics {
  has_sections: boolean;
  section_count: number;
  sections_detected: string[];

  has_bullets: boolean;
  bullet_count: number;

  sentence_count: number;
  avg_sentence_length: number;  // words
  max_sentence_length: number;

  paragraph_count: number;
  avg_paragraph_length: number;  // sentences

  readability_score: number;  // 0-100 (Flesch-Kincaid adapted)
  chunking_quality: number;  // 0-100 (how well it chunks for LLM retrieval)
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
  app_id: string;
  description_length: number;
  description_hash: string;  // For caching
  rules_version: string;
  rules_scope: 'base' | 'vertical' | 'market' | 'client';
  vertical_id?: string;
  market_id?: string;
  analyzed_at: string;
  analysis_duration_ms: number;
}

// ============================================================================
// Registry & Rules
// ============================================================================

/**
 * LLM Visibility Rules Registry
 * Similar to KPI registry, intent patterns, etc.
 */
export interface LLMVisibilityRules {
  version: string;

  /** Score weights (must sum to 1.0) */
  weights: {
    factual_grounding: number;
    semantic_clusters: number;
    structure_readability: number;
    intent_coverage: number;
    snippet_quality: number;
    safety_credibility: number;
  };

  /** Structure rules */
  structure_rules: {
    required_sections?: string[];  // e.g., ["Summary", "Key Features"]
    max_sentence_length: number;  // words
    min_bullet_points: number;
    ideal_paragraph_length: number;  // sentences
  };

  /** Semantic clusters (vertical-specific) */
  clusters: Record<string, {
    keywords: string[];
    weight: number;  // Importance of this cluster (0-1)
  }>;

  /** Factual grounding rules */
  factual_rules: {
    required_facts: string[];  // e.g., ["age range", "offline support"]
    fact_patterns: Record<string, RegExp>;  // Regex to detect facts
    avoid_patterns: Array<{
      pattern: string | RegExp;
      reason: string;
    }>;
  };

  /** Intent patterns (aligned with existing intent engine) */
  intent_rules: {
    task_intent: string[];
    comparison_intent: string[];
    problem_intent: string[];
    feature_intent: string[];
    safety_intent: string[];
  };

  /** Snippet quality rules */
  snippet_rules: {
    min_snippet_length: number;  // characters
    max_snippet_length: number;
    ideal_snippet_count: number;
    snippet_patterns: Array<{
      name: string;
      pattern: RegExp;
      quality_boost: number;  // 0-1
    }>;
  };

  /** Safety & credibility */
  safety_rules: {
    forbidden_phrases: string[];  // Unverifiable claims
    risky_patterns: Array<{
      pattern: string | RegExp;
      severity: 'critical' | 'warning';
      reason: string;
    }>;
  };
}

/**
 * Rule overrides (per vertical/market/client)
 * Similar to aso_kpi_weight_overrides pattern
 */
export interface LLMVisibilityRuleOverride {
  id: string;
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organization_id?: string;

  /** Partial rules to merge with base */
  rules_override: Partial<LLMVisibilityRules>;

  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Optimization (Phase 2 - with LLM)
// ============================================================================

/**
 * Optimized description result (generated by LLM in Phase 2)
 */
export interface LLMOptimizedDescription {
  original_description: string;
  optimized_description: string;

  improvements: Array<{
    category: string;
    before: string;
    after: string;
    reason: string;
    score_impact: number;  // Estimated delta
  }>;

  comparison: {
    original_score: LLMVisibilityScore;
    optimized_score: LLMVisibilityScore;
    delta: number;
  };

  snippets: LLMSnippet[];

  metadata: {
    generated_at: string;
    llm_model?: string;  // Phase 2
    generation_time_ms?: number;
    tokens_used?: number;
    cost_usd?: number;
  };
}

/**
 * Snapshot for version history
 */
export interface LLMDescriptionSnapshot {
  id: string;
  organization_id: string;
  monitored_app_id: string;

  source: 'original' | 'ai_generated' | 'manual_edit';
  description_text: string;

  analysis_id?: string;  // FK to analysis
  score?: LLMVisibilityScore;

  is_active: boolean;
  created_by?: string;
  created_at: string;
}

// ============================================================================
// Database Types (for Supabase integration)
// ============================================================================

/**
 * Database row for llm_visibility_analysis
 */
export interface LLMVisibilityAnalysisRow {
  id: string;
  organization_id: string;

  // App identification (one of these will be set)
  monitored_app_id: string | null;  // UUID for monitored apps
  app_store_id: string | null;       // App Store ID like "6443828422" for ad-hoc analysis

  /** Scores */
  overall_score: number;
  factual_grounding_score: number;
  semantic_clusters_score: number;
  structure_readability_score: number;
  intent_coverage_score: number;
  snippet_quality_score: number;
  safety_credibility_score: number;

  /** Structured data (JSONB) */
  findings_json: LLMFinding[];
  snippets_json: LLMSnippet[];
  cluster_coverage_json: ClusterCoverage;
  intent_coverage_json: IntentCoverage;
  structure_metrics_json: StructureMetrics;

  /** Metadata */
  description_hash: string;  // For caching
  description_length: number;
  rules_version: string;
  rules_scope: 'base' | 'vertical' | 'market' | 'client';
  vertical_id?: string;
  market_id?: string;

  /** Audit trail */
  source_snapshot_id?: string;  // FK to aso_audit_snapshots
  analysis_duration_ms: number;
  cache_hit: boolean;

  created_at: string;
  updated_at: string;
}

/**
 * Cache entry
 */
export interface LLMVisibilityCacheEntry {
  cache_key: string;  // hash(description + rules_version)
  analysis_id: string;
  result: LLMVisibilityAnalysis;
  hit_count: number;
  created_at: string;
  expires_at: string;
}
