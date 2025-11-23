/**
 * Ruleset Normalizer
 *
 * Phase 12: Converts raw DB override payloads into strongly-typed NormalizedRuleSet
 *
 * Responsibilities:
 * - Validate and sanitize DB data
 * - Transform DB rows into engine-ready structures
 * - Clamp values to safe ranges
 * - Log warnings for invalid entries (dev only)
 *
 * Pure functions only - no side effects, no DB calls
 */

import type {
  TokenRelevanceOverride,
  HookPatternOverride,
  StopwordOverride,
  KpiWeightOverride,
  FormulaOverride,
  RecommendationTemplate,
} from '@/services/rulesetStorage/dbRulesetService';

// ============================================================================
// Types
// ============================================================================

export type RulesetSource = 'base' | 'vertical' | 'market' | 'client';

export interface NormalizedTokenOverrides {
  [token: string]: {
    relevance: 0 | 1 | 2 | 3;
    source: RulesetSource;
  };
}

export interface NormalizedIntentOverrides {
  informational: string[];
  commercial: string[];
  transactional: string[];
  navigational: string[];
}

export interface NormalizedHookOverrides {
  [category: string]: {
    keywords: string[];
    weight: number;
  };
}

export interface NormalizedKpiWeightOverrides {
  [kpiId: string]: {
    weightMultiplier: number;
  };
}

export interface NormalizedFormulaOverrides {
  [formulaId: string]: {
    multiplier: number;
    componentWeights?: Record<string, number>;
  };
}

export interface NormalizedRecommendationTemplates {
  [recommendationId: string]: {
    message: string;
  };
}

export interface NormalizedRuleSet {
  tokenOverrides: NormalizedTokenOverrides;
  intentOverrides: NormalizedIntentOverrides;
  hookOverrides: NormalizedHookOverrides;
  stopwordOverrides: string[];
  kpiWeightOverrides: NormalizedKpiWeightOverrides;
  formulaOverrides: NormalizedFormulaOverrides;
  recommendationTemplates: NormalizedRecommendationTemplates;

  meta: {
    vertical?: string;
    market?: string;
    organizationId?: string;
    source: RulesetSource;
  };
}

export interface DbRulesetOverridesBundle {
  tokenOverrides: TokenRelevanceOverride[];
  hookOverrides: HookPatternOverride[];
  stopwordOverrides: StopwordOverride[];
  kpiOverrides: KpiWeightOverride[];
  formulaOverrides: FormulaOverride[];
  recommendationOverrides: RecommendationTemplate[];
  meta: {
    vertical?: string;
    market?: string;
    organizationId?: string;
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Clamp relevance to valid range (0-3)
 */
function clampRelevance(value: number): 0 | 1 | 2 | 3 {
  const clamped = Math.max(0, Math.min(3, Math.floor(value)));
  return clamped as 0 | 1 | 2 | 3;
}

/**
 * Clamp weight multiplier to safe range (0.5-2.0)
 */
function clampMultiplier(value: number, min = 0.5, max = 2.0): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate and lowercase token
 */
function normalizeToken(token: string): string {
  return token.toLowerCase().trim();
}

/**
 * Deduplicate array
 */
function deduplicateArray<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalize token relevance overrides from DB rows
 *
 * @param dbRows - Raw DB rows from aso_token_relevance_overrides
 * @returns Normalized token overrides map
 */
export function normalizeTokenOverrides(
  dbRows: TokenRelevanceOverride[]
): NormalizedTokenOverrides {
  const normalized: NormalizedTokenOverrides = {};

  for (const row of dbRows) {
    if (!row.token) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Normalizer] Skipping token override with empty token:', row);
      }
      continue;
    }

    const token = normalizeToken(row.token);
    const relevance = clampRelevance(row.relevance);

    // Determine source
    const source: RulesetSource = row.organization_id
      ? 'client'
      : row.market
      ? 'market'
      : row.vertical
      ? 'vertical'
      : 'base';

    normalized[token] = {
      relevance,
      source,
    };

    // Log validation warnings in dev
    if (process.env.NODE_ENV === 'development' && row.relevance !== relevance) {
      console.warn(
        `[Normalizer] Clamped token relevance: "${token}" from ${row.relevance} to ${relevance}`
      );
    }
  }

  return normalized;
}

/**
 * Normalize intent pattern overrides from DB rows
 *
 * Note: Phase 11 DB has intent_pattern_overrides table, but we don't have rows yet.
 * This is a placeholder for future implementation.
 *
 * @param dbRows - Raw DB rows (placeholder)
 * @returns Normalized intent overrides
 */
export function normalizeIntentOverrides(dbRows: any[]): NormalizedIntentOverrides {
  // Default empty structure
  const normalized: NormalizedIntentOverrides = {
    informational: [],
    commercial: [],
    transactional: [],
    navigational: [],
  };

  // Future: Parse DB rows and populate categories
  // For now, return empty structure

  return normalized;
}

/**
 * Normalize hook pattern overrides from DB rows
 *
 * @param dbRows - Raw DB rows from aso_hook_pattern_overrides
 * @returns Normalized hook overrides map
 */
export function normalizeHookOverrides(
  dbRows: HookPatternOverride[]
): NormalizedHookOverrides {
  const normalized: NormalizedHookOverrides = {};

  for (const row of dbRows) {
    if (!row.hook_category) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Normalizer] Skipping hook override with empty category:', row);
      }
      continue;
    }

    const category = row.hook_category;
    const weight = clampMultiplier(row.weight_multiplier);
    const keywords = row.keywords
      ? deduplicateArray(row.keywords.map((k) => k.toLowerCase().trim()))
      : [];

    normalized[category] = {
      keywords,
      weight,
    };

    // Log validation warnings in dev
    if (process.env.NODE_ENV === 'development' && row.weight_multiplier !== weight) {
      console.warn(
        `[Normalizer] Clamped hook weight: "${category}" from ${row.weight_multiplier} to ${weight}`
      );
    }
  }

  return normalized;
}

/**
 * Normalize stopword overrides from DB rows
 *
 * @param dbRows - Raw DB rows from aso_stopword_overrides
 * @returns Normalized stopwords array
 */
export function normalizeStopwords(dbRows: StopwordOverride[]): string[] {
  const allStopwords: string[] = [];

  for (const row of dbRows) {
    if (!row.stopwords || !Array.isArray(row.stopwords)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Normalizer] Skipping stopword override with invalid array:', row);
      }
      continue;
    }

    // Lowercase and trim all stopwords
    const normalized = row.stopwords.map((word) => word.toLowerCase().trim());
    allStopwords.push(...normalized);
  }

  // Deduplicate
  return deduplicateArray(allStopwords);
}

/**
 * Normalize KPI weight overrides from DB rows
 *
 * @param dbRows - Raw DB rows from aso_kpi_weight_overrides
 * @returns Normalized KPI weight overrides map
 */
export function normalizeKpiWeightOverrides(
  dbRows: KpiWeightOverride[]
): NormalizedKpiWeightOverrides {
  const normalized: NormalizedKpiWeightOverrides = {};

  for (const row of dbRows) {
    if (!row.kpi_id) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Normalizer] Skipping KPI override with empty kpi_id:', row);
      }
      continue;
    }

    const kpiId = row.kpi_id;
    const weightMultiplier = clampMultiplier(row.weight_multiplier);

    normalized[kpiId] = {
      weightMultiplier,
    };

    // Log validation warnings in dev
    if (process.env.NODE_ENV === 'development' && row.weight_multiplier !== weightMultiplier) {
      console.warn(
        `[Normalizer] Clamped KPI weight: "${kpiId}" from ${row.weight_multiplier} to ${weightMultiplier}`
      );
    }
  }

  return normalized;
}

/**
 * Normalize formula overrides from DB rows
 *
 * @param dbRows - Raw DB rows from aso_formula_overrides
 * @returns Normalized formula overrides map
 */
export function normalizeFormulaOverrides(
  dbRows: FormulaOverride[]
): NormalizedFormulaOverrides {
  const normalized: NormalizedFormulaOverrides = {};

  for (const row of dbRows) {
    if (!row.formula_id) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Normalizer] Skipping formula override with empty formula_id:', row);
      }
      continue;
    }

    const formulaId = row.formula_id;
    const payload = row.override_payload || {};

    // Extract multiplier (if present)
    const multiplier = payload.multiplier
      ? clampMultiplier(payload.multiplier, 0.5, 2.0)
      : 1.0;

    // Extract component weights (if present)
    const componentWeights = payload.component_weights || undefined;

    normalized[formulaId] = {
      multiplier,
      componentWeights,
    };

    // Log validation warnings in dev
    if (process.env.NODE_ENV === 'development' && payload.multiplier && payload.multiplier !== multiplier) {
      console.warn(
        `[Normalizer] Clamped formula multiplier: "${formulaId}" from ${payload.multiplier} to ${multiplier}`
      );
    }
  }

  return normalized;
}

/**
 * Normalize recommendation templates from DB rows
 *
 * @param dbRows - Raw DB rows from aso_recommendation_templates
 * @returns Normalized recommendation templates map
 */
export function normalizeRecommendationTemplates(
  dbRows: RecommendationTemplate[]
): NormalizedRecommendationTemplates {
  const normalized: NormalizedRecommendationTemplates = {};

  for (const row of dbRows) {
    if (!row.recommendation_id || !row.message) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Normalizer] Skipping recommendation template with missing fields:', row);
      }
      continue;
    }

    normalized[row.recommendation_id] = {
      message: row.message.trim(),
    };
  }

  return normalized;
}

// ============================================================================
// Combined Normalizer
// ============================================================================

/**
 * Build a complete NormalizedRuleSet from DB override bundle
 *
 * @param bundle - Bundle of all DB overrides
 * @returns Complete normalized ruleset
 */
export function buildNormalizedRuleSet(
  bundle: DbRulesetOverridesBundle
): NormalizedRuleSet {
  // Determine source
  const source: RulesetSource = bundle.meta.organizationId
    ? 'client'
    : bundle.meta.market
    ? 'market'
    : bundle.meta.vertical
    ? 'vertical'
    : 'base';

  return {
    tokenOverrides: normalizeTokenOverrides(bundle.tokenOverrides),
    intentOverrides: normalizeIntentOverrides([]), // Placeholder
    hookOverrides: normalizeHookOverrides(bundle.hookOverrides),
    stopwordOverrides: normalizeStopwords(bundle.stopwordOverrides),
    kpiWeightOverrides: normalizeKpiWeightOverrides(bundle.kpiOverrides),
    formulaOverrides: normalizeFormulaOverrides(bundle.formulaOverrides),
    recommendationTemplates: normalizeRecommendationTemplates(bundle.recommendationOverrides),

    meta: {
      vertical: bundle.meta.vertical,
      market: bundle.meta.market,
      organizationId: bundle.meta.organizationId,
      source,
    },
  };
}

/**
 * Create an empty normalized ruleset (for base layer)
 *
 * @param source - Source type
 * @returns Empty normalized ruleset
 */
export function createEmptyNormalizedRuleSet(source: RulesetSource = 'base'): NormalizedRuleSet {
  return {
    tokenOverrides: {},
    intentOverrides: {
      informational: [],
      commercial: [],
      transactional: [],
      navigational: [],
    },
    hookOverrides: {},
    stopwordOverrides: [],
    kpiWeightOverrides: {},
    formulaOverrides: {},
    recommendationTemplates: {},

    meta: {
      source,
    },
  };
}
