/**
 * ASO Bible RuleSet Type Definitions
 *
 * Defines the structure for vertical-aware, market-aware rule sets
 * that override base KPI, formula, intent, hook, and recommendation logic.
 *
 * Phase 8: Structure only (no scoring changes)
 */

import type { KpiDefinition, KpiId } from '@/engine/metadata/kpi/kpi.types';

// ============================================================================
// Intent & Hook Override Types
// ============================================================================

export interface IntentPatternOverride {
  intent: string;
  pattern: RegExp | string;
  description?: string;
  priority?: number;
}

export interface HookPatternOverride {
  hook: string;
  pattern: RegExp | string;
  description?: string;
  priority?: number;
}

export interface DiscoveryThresholds {
  excellent: number;
  good: number;
  moderate: number;
  poor?: number;
}

// ============================================================================
// Recommendation Override Types
// ============================================================================

export interface RecommendationRuleDefinition {
  id: string;
  kpiId?: KpiId;
  severity: 'critical' | 'moderate' | 'minor';
  condition: string; // e.g., "kpi_score < 40"
  messageTemplate: string; // e.g., "Add {{category_example_1}}"
  chartId?: string;
  description?: string;
}

// ============================================================================
// Core RuleSet Definition
// ============================================================================

export interface AsoBibleRuleSet {
  id: string;
  label: string;
  description?: string;

  // Override containers (all optional for partial overrides)
  kpiOverrides?: Partial<Record<KpiId, Partial<KpiDefinition>>>;
  /**
   * Formula component override multipliers.
   * Key format: either formulaId (overall multiplier) or formulaId.componentId (component-specific).
   */
  formulaOverrides?: Record<string, number>;
  intentOverrides?: Record<string, IntentPatternOverride>;
  hookOverrides?: Record<string, HookPatternOverride>;
  recommendationOverrides?: Record<string, RecommendationRuleDefinition>;

  // Token relevance overrides (future)
  tokenRelevanceOverrides?: Record<string, 0 | 1 | 2 | 3>;

  // Stopword overrides (market-specific)
  stopwordOverrides?: string[];

  // Character limit overrides (market-specific)
  characterLimits?: {
    title?: number;
    subtitle?: number;
  };

  // Metadata
  version?: string;
  source?: 'base' | 'vertical' | 'market' | 'client';
  createdAt?: string;
  updatedAt?: string;

  // Vertical Intelligence Layer (Phase 21)
  verticalTemplateMeta?: Record<string, any>;
  marketTemplateMeta?: Record<string, any>;
  clientTemplateMeta?: Record<string, any>;
}

// ============================================================================
// Vertical Profile Definition
// ============================================================================

export interface VerticalProfile {
  id: string;
  label: string;

  // Automatic detection signals
  keywords: string[]; // e.g., ["learn", "language", "fluency"]
  categories: string[]; // App Store categories, e.g., ["Education"]

  description?: string;

  // Associated rule set (if exists)
  ruleSetId?: string;
  discoveryThresholds?: DiscoveryThresholds;
}

// ============================================================================
// Market Profile Definition
// ============================================================================

export interface MarketProfile {
  id: string;
  label: string;

  // Locale codes
  locales: string[]; // e.g., ["en-US", "en"]

  description?: string;

  // Associated rule set (if exists)
  ruleSetId?: string;
}

// ============================================================================
// Vertical Detection Result
// ============================================================================

export interface VerticalDetectionResult {
  verticalId: string;
  confidence: number; // 0-1
  matchedSignals: string[]; // e.g., ["category:Education", "keyword:learn"]
  vertical: VerticalProfile;
}

// ============================================================================
// Market Detection Result
// ============================================================================

export interface MarketDetectionResult {
  marketId: string;
  locale: string;
  market: MarketProfile;
}

// ============================================================================
// Merged RuleSet (Final Output)
// ============================================================================

export interface MergedRuleSet extends AsoBibleRuleSet {
  // Track inheritance chain
  inheritanceChain: {
    base?: AsoBibleRuleSet;
    vertical?: AsoBibleRuleSet;
    market?: AsoBibleRuleSet;
    client?: AsoBibleRuleSet;
  };

  // Leak detection warnings
  leakWarnings?: LeakWarning[];

  // Metadata
  verticalId?: string;
  verticalName?: string;
  marketId?: string;
  marketName?: string;
  appId?: string;
  mergedAt: string; // ISO timestamp
  discoveryThresholds?: DiscoveryThresholds;
}

// ============================================================================
// Leak Detection Types
// ============================================================================

export interface LeakWarning {
  type: 'vertical_mismatch' | 'pattern_leak' | 'recommendation_leak' | 'kpi_anomaly';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: Record<string, unknown>;
}
