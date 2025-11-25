/**
 * Ruleset Merger
 *
 * Phase 12: Merges base → vertical → market → client into final MergedRuleSet
 *
 * Responsibilities:
 * - Compose multiple normalized rulesets
 * - Apply override precedence (client > market > vertical > base)
 * - Union merge for arrays (stopwords)
 * - Last-wins merge for scalars (weights, multipliers)
 * - Attach version metadata
 *
 * Pure functions only - no side effects, no DB calls
 */

import type {
  NormalizedRuleSet,
  NormalizedTokenOverrides,
  NormalizedHookOverrides,
  NormalizedKpiWeightOverrides,
  NormalizedRecommendationTemplates,
} from './rulesetNormalizer';
import type { RulesetVersionInfo } from './rulesetVersionManager';

// ============================================================================
// Types
// ============================================================================

export interface MergedRuleSet {
  // Identifiers
  verticalId?: string;
  marketId?: string;
  organizationId?: string;
  appId?: string;

  // Override payloads (engine-ready format)
  tokenRelevanceOverrides?: Record<string, 0 | 1 | 2 | 3>;
  hookOverrides?: Record<string, number>;
  stopwordOverrides?: {
    market?: string[];
    vertical?: string[];
  };
  kpiOverrides?: Record<string, { weight: number }>;
  formulaOverrides?: Record<string, number>;
  recommendationOverrides?: Record<string, { message: string }>;

  // Version metadata
  versions?: RulesetVersionInfo;

  // Metadata
  source: 'code' | 'database' | 'hybrid';
  leakWarnings?: string[];
}

// ============================================================================
// Merge Helpers
// ============================================================================

/**
 * Merge token overrides with client > market > vertical > base precedence
 *
 * @param layers - Array of normalized rulesets (in priority order: base, vertical, market, client)
 * @returns Merged token overrides (simple map of token → relevance)
 */
function mergeTokenOverrides(...layers: NormalizedRuleSet[]): Record<string, 0 | 1 | 2 | 3> {
  const merged: Record<string, 0 | 1 | 2 | 3> = {};

  // Apply layers in order (base → vertical → market → client)
  // Last layer wins for each token
  for (const layer of layers) {
    for (const [token, override] of Object.entries(layer.tokenOverrides)) {
      merged[token] = override.relevance;
    }
  }

  return merged;
}

/**
 * Merge hook overrides with client > market > vertical > base precedence
 *
 * @param layers - Array of normalized rulesets
 * @returns Merged hook overrides (category → weight multiplier)
 */
function mergeHookOverrides(...layers: NormalizedRuleSet[]): Record<string, number> {
  const merged: Record<string, number> = {};

  // Apply layers in order
  for (const layer of layers) {
    for (const [category, override] of Object.entries(layer.hookOverrides)) {
      // For hooks, we only care about the weight multiplier
      // Keywords are managed in code (Phase 10)
      merged[category] = override.weight;
    }
  }

  return merged;
}

/**
 * Merge stopwords with union strategy (deduplicated)
 *
 * @param layers - Array of normalized rulesets
 * @returns Merged stopwords array
 */
function mergeStopwords(...layers: NormalizedRuleSet[]): string[] {
  const allStopwords = new Set<string>();

  // Union merge: collect all stopwords from all layers
  for (const layer of layers) {
    for (const stopword of layer.stopwordOverrides) {
      allStopwords.add(stopword);
    }
  }

  return Array.from(allStopwords).sort();
}

/**
 * Merge KPI weight overrides with client > market > vertical > base precedence
 *
 * @param layers - Array of normalized rulesets
 * @returns Merged KPI weight overrides
 */
function mergeKpiWeightOverrides(
  ...layers: NormalizedRuleSet[]
): Record<string, { weight: number }> {
  const merged: Record<string, { weight: number }> = {};

  // Apply layers in order
  for (const layer of layers) {
    for (const [kpiId, override] of Object.entries(layer.kpiWeightOverrides)) {
      merged[kpiId] = {
        weight: override.weightMultiplier,
      };
    }
  }

  return merged;
}

/**
 * Merge formula overrides with client > market > vertical > base precedence
 *
 * @param layers - Array of normalized rulesets
 * @returns Merged formula overrides
 */
function mergeFormulaOverrides(...layers: NormalizedRuleSet[]): Record<string, number> {
  const merged: Record<string, number> = {};

  for (const layer of layers) {
    for (const [formulaId, override] of Object.entries(layer.formulaOverrides)) {
      const normalizedMultiplier = clampMultiplier(override.multiplier);

      if (normalizedMultiplier !== 1) {
        merged[formulaId] = normalizedMultiplier;
      }

      if (override.componentWeights) {
        for (const [componentId, weightMultiplier] of Object.entries(override.componentWeights)) {
          merged[`${formulaId}.${componentId}`] = clampMultiplier(weightMultiplier);
        }
      }
    }
  }

  return merged;
}

function clampMultiplier(value?: number, min = 0.5, max = 2.0): number {
  if (value === undefined || Number.isNaN(value)) {
    return 1;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Merge recommendation templates with client > market > vertical > base precedence
 *
 * @param layers - Array of normalized rulesets
 * @returns Merged recommendation templates
 */
function mergeRecommendationTemplates(
  ...layers: NormalizedRuleSet[]
): Record<string, { message: string }> {
  const merged: Record<string, { message: string }> = {};

  // Apply layers in order (last wins)
  for (const layer of layers) {
    for (const [recommendationId, override] of Object.entries(layer.recommendationTemplates)) {
      merged[recommendationId] = { ...override };
    }
  }

  return merged;
}

// ============================================================================
// Main Merge Function
// ============================================================================

/**
 * Merge base → vertical → market → client into final MergedRuleSet
 *
 * Precedence: client > market > vertical > base
 *
 * @param base - Base ruleset (Phase 9/10 code-based defaults)
 * @param vertical - Vertical-specific overrides (optional)
 * @param market - Market-specific overrides (optional)
 * @param client - Client-specific overrides (optional)
 * @param versions - Version metadata (optional)
 * @returns Complete merged ruleset ready for engine consumption
 */
export function mergeRuleSets(
  base: NormalizedRuleSet,
  vertical?: NormalizedRuleSet,
  market?: NormalizedRuleSet,
  client?: NormalizedRuleSet,
  versions?: RulesetVersionInfo
): MergedRuleSet {
  // Build layers array (base → vertical → market → client)
  const layers: NormalizedRuleSet[] = [base];
  if (vertical) layers.push(vertical);
  if (market) layers.push(market);
  if (client) layers.push(client);

  // Determine source
  const hasDbOverrides = vertical || market || client;
  const source: MergedRuleSet['source'] = hasDbOverrides
    ? layers.some((l) => l.meta.source !== 'base')
      ? 'hybrid'
      : 'database'
    : 'code';

  // Merge all override types
  const tokenRelevanceOverrides = mergeTokenOverrides(...layers);
  const hookOverrides = mergeHookOverrides(...layers);
  const stopwords = mergeStopwords(...layers);
  const kpiOverrides = mergeKpiWeightOverrides(...layers);
  const formulaOverrides = mergeFormulaOverrides(...layers);
  const recommendationOverrides = mergeRecommendationTemplates(...layers);

  // Build final merged ruleset
  const merged: MergedRuleSet = {
    // Identifiers
    verticalId: vertical?.meta.vertical || base.meta.vertical,
    marketId: market?.meta.market || base.meta.market,
    organizationId: client?.meta.organizationId,

    // Override payloads
    tokenRelevanceOverrides: Object.keys(tokenRelevanceOverrides).length > 0
      ? tokenRelevanceOverrides
      : undefined,

    hookOverrides: Object.keys(hookOverrides).length > 0
      ? hookOverrides
      : undefined,

    stopwordOverrides: stopwords.length > 0
      ? {
          // Separate market and vertical stopwords for Phase 10 compatibility
          market: market ? market.stopwordOverrides : undefined,
          vertical: vertical ? vertical.stopwordOverrides : undefined,
        }
      : undefined,

    kpiOverrides: Object.keys(kpiOverrides).length > 0
      ? kpiOverrides
      : undefined,

    formulaOverrides: Object.keys(formulaOverrides).length > 0
      ? formulaOverrides
      : undefined,

    recommendationOverrides: Object.keys(recommendationOverrides).length > 0
      ? recommendationOverrides
      : undefined,

    // Version metadata
    versions,

    // Metadata
    source,
    leakWarnings: [],
  };

  // Log merge summary in dev
  if (process.env.NODE_ENV === 'development') {
    console.log('[Ruleset Merger] Merged ruleset:', {
      source: merged.source,
      verticalId: merged.verticalId,
      marketId: merged.marketId,
      organizationId: merged.organizationId,
      tokenOverrides: Object.keys(tokenRelevanceOverrides || {}).length,
      hookOverrides: Object.keys(hookOverrides || {}).length,
      stopwords: stopwords.length,
      kpiOverrides: Object.keys(kpiOverrides || {}).length,
      formulaOverrides: Object.keys(formulaOverrides || {}).length,
      recommendationOverrides: Object.keys(recommendationOverrides || {}).length,
    });
  }

  return merged;
}

/**
 * Check if merged ruleset has any active overrides
 *
 * @param merged - Merged ruleset
 * @returns True if ruleset has at least one override
 */
export function hasActiveOverrides(merged: MergedRuleSet): boolean {
  return !!(
    merged.tokenRelevanceOverrides ||
    merged.hookOverrides ||
    merged.stopwordOverrides ||
    merged.kpiOverrides ||
    merged.formulaOverrides ||
    merged.recommendationOverrides
  );
}

/**
 * Convert merged ruleset to legacy format (Phase 9/10 compatibility)
 *
 * This ensures backward compatibility with existing code that expects
 * the old MergedRuleSet structure from Phase 9.
 *
 * @param merged - New merged ruleset
 * @returns Legacy-compatible merged ruleset
 */
export function toLegacyMergedRuleSet(merged: MergedRuleSet): any {
  return {
    id: `${merged.verticalId || 'base'}:${merged.marketId || 'global'}`,
    label: `${merged.verticalId || 'Base'} + ${merged.marketId || 'Global'}`,
    source: merged.source,
    version: '1.0.0',

    // Override payloads (Phase 10 format)
    tokenRelevanceOverrides: merged.tokenRelevanceOverrides,
    hookOverrides: merged.hookOverrides,
    stopwordOverrides: merged.stopwordOverrides,
    kpiOverrides: merged.kpiOverrides,
    formulaOverrides: merged.formulaOverrides,
    recommendationOverrides: merged.recommendationOverrides,

    // Metadata
    verticalId: merged.verticalId,
    marketId: merged.marketId,
    appId: merged.appId,
    leakWarnings: merged.leakWarnings,
  };
}
