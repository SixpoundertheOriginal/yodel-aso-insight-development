/**
 * RuleSet Loader
 *
 * Loads and merges rule sets in the inheritance pipeline:
 * Base → Vertical → Market → Client
 *
 * Phase 9: Intelligence layer with actual vertical/market overrides
 * Phase 12: DB-driven rulesets with normalization, merge, and caching
 */

import type { AsoBibleRuleSet, MergedRuleSet } from './ruleset.types';
import { detectVertical } from './verticalSignatureEngine';
import { detectMarket } from './marketSignatureEngine';
import { mergeRuleSets } from './overrideMergeUtils';
import { applyLeakDetection } from './leakDetection';
import { getVerticalById } from './verticalProfiles';
import { getMarketById } from './marketProfiles';

// Phase 12: DB-driven ruleset infrastructure
import { DbRulesetService } from '@/services/rulesetStorage/dbRulesetService';
import {
  buildNormalizedRuleSet,
  createEmptyNormalizedRuleSet,
  type DbRulesetOverridesBundle,
} from './rulesetEngine/rulesetNormalizer';
import {
  mergeRuleSets as mergeNormalizedRuleSets,
  toLegacyMergedRuleSet,
} from './rulesetEngine/rulesetMerger';
import { buildVersionInfo } from './rulesetEngine/rulesetVersionManager';
import {
  buildCacheKey,
  getCachedRuleset,
  setCachedRuleset,
  invalidateRuleset,
} from './rulesetEngine/rulesetCache';

// Import vertical rulesets
import { languageLearningRuleSet } from './verticalProfiles/language_learning/ruleset';
import { rewardsRuleSet } from './verticalProfiles/rewards/ruleset';
import { financeRuleSet } from './verticalProfiles/finance/ruleset';
import { datingRuleSet } from './verticalProfiles/dating/ruleset';
import { productivityRuleSet } from './verticalProfiles/productivity/ruleset';
import { healthRuleSet } from './verticalProfiles/health/ruleset';
import { entertainmentRuleSet } from './verticalProfiles/entertainment/ruleset';

// Import market rulesets
import { usMarketRuleSet } from './marketProfiles/us/ruleset';
import { ukMarketRuleSet } from './marketProfiles/uk/ruleset';
import { caMarketRuleSet } from './marketProfiles/ca/ruleset';
import { auMarketRuleSet } from './marketProfiles/au/ruleset';
import { deMarketRuleSet } from './marketProfiles/de/ruleset';

// ============================================================================
// Feature Flags (Phase 12)
// ============================================================================

/**
 * Feature flag: Enable DB-driven rulesets
 *
 * When true:
 * - Loads overrides from Supabase DB
 * - Uses normalization + merge engine
 * - Caches merged rulesets
 *
 * When false:
 * - Falls back to Phase 9/10 code-based rulesets only
 * - No DB queries, no normalization, no caching
 *
 * Default: true (Phase 12 enabled)
 */
export const ASO_BIBLE_DB_RULESETS_ENABLED = true;

/**
 * Cache TTL for merged rulesets (milliseconds)
 *
 * Default: 5 minutes
 */
export const RULESET_CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_DISCOVERY_THRESHOLDS = {
  excellent: 5,
  good: 3,
  moderate: 1,
};

// ============================================================================
// Metadata Interface (Simplified)
// ============================================================================

interface AppMetadata {
  appId?: string;
  category?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

// ============================================================================
// Base RuleSet Loader
// ============================================================================

/**
 * Vertical RuleSet Registry
 */
const VERTICAL_RULESETS: Record<string, AsoBibleRuleSet> = {
  language_learning: languageLearningRuleSet,
  rewards: rewardsRuleSet,
  finance: financeRuleSet,
  dating: datingRuleSet,
  productivity: productivityRuleSet,
  health: healthRuleSet,
  entertainment: entertainmentRuleSet,
};

/**
 * Market RuleSet Registry
 */
const MARKET_RULESETS: Record<string, AsoBibleRuleSet> = {
  us: usMarketRuleSet,
  uk: ukMarketRuleSet,
  ca: caMarketRuleSet,
  au: auMarketRuleSet,
  de: deMarketRuleSet,
};

/**
 * Load base (global) rule set
 * Contains universal defaults for all apps
 *
 * Phase 9: Still empty (vertical/market overrides add intelligence)
 *
 * @returns Base rule set
 */
export function loadBaseRuleSet(): AsoBibleRuleSet {
  return {
    id: 'base',
    label: 'Base RuleSet',
    description: 'Global defaults for all apps',
    source: 'base',
    version: '1.0.0',

    // Empty overrides (vertical/market rulesets add intelligence)
    kpiOverrides: {},
    formulaOverrides: {},
    intentOverrides: {},
    hookOverrides: {},
    recommendationOverrides: {},
  };
}

// ============================================================================
// Vertical RuleSet Loader
// ============================================================================

/**
 * Load vertical-specific rule set
 *
 * Phase 9: Loads actual vertical rulesets with intelligence
 *
 * @param verticalId - Vertical ID (e.g., "language_learning", "rewards")
 * @returns Vertical rule set or undefined
 */
export function loadVerticalRuleSet(verticalId: string): AsoBibleRuleSet | undefined {
  if (verticalId === 'base') {
    return undefined; // No vertical override for base
  }

  // Load from registry
  const ruleSet = VERTICAL_RULESETS[verticalId];

  if (ruleSet) {
    return ruleSet;
  }

  // Fallback: Return undefined if vertical not found
  console.warn(`[RuleSet Loader] Vertical ruleset not found: ${verticalId}`);
  return undefined;
}

// ============================================================================
// Market RuleSet Loader
// ============================================================================

/**
 * Load market-specific rule set
 *
 * Phase 9: Loads actual market rulesets with locale-specific overrides
 *
 * @param marketId - Market ID (e.g., "us", "uk", "de")
 * @returns Market rule set or undefined
 */
export function loadMarketRuleSet(marketId: string): AsoBibleRuleSet | undefined {
  // Load from registry
  const ruleSet = MARKET_RULESETS[marketId];

  if (ruleSet) {
    return ruleSet;
  }

  // Fallback: Return undefined if market not found
  console.warn(`[RuleSet Loader] Market ruleset not found: ${marketId}`);
  return undefined;
}

// ============================================================================
// Client RuleSet Loader
// ============================================================================

/**
 * Load client-specific rule set
 *
 * Phase 8: Empty (no client overrides)
 * Future: Load from database (enterprise feature)
 *
 * @param appId - App ID
 * @returns Client rule set or undefined
 */
export function loadClientRuleSet(appId?: string): AsoBibleRuleSet | undefined {
  // Phase 8: No client overrides
  // Future: Query database for client-specific overrides

  if (!appId) {
    return undefined;
  }

  return undefined; // No client overrides in Phase 8
}

// ============================================================================
// Phase 12: DB-Driven RuleSet Loader (with Normalization & Merge)
// ============================================================================

/**
 * Load and merge DB-driven rulesets with caching
 *
 * Pipeline:
 * 1. Build cache key from vertical/market/orgId/appId
 * 2. Check cache → return if hit
 * 3. Load DB overrides for vertical, market, client
 * 4. Normalize each layer (DB rows → NormalizedRuleSet)
 * 5. Load code-based vertical/market rulesets as base
 * 6. Merge: base → vertical (code+DB) → market (code+DB) → client (DB)
 * 7. Cache result and return
 *
 * @param verticalId - Detected vertical ID
 * @param marketId - Detected market ID
 * @param organizationId - Organization ID (optional)
 * @param appId - App ID (optional)
 * @returns Merged ruleset (legacy format for Phase 10 compatibility)
 */
async function loadDbDrivenRuleSet(
  verticalId: string,
  marketId: string,
  organizationId?: string,
  appId?: string
): Promise<MergedRuleSet | null> {
  try {
    // Step 1: Build cache key
    const cacheKey = buildCacheKey(verticalId, marketId, organizationId, appId);

    // Step 2: Check cache
    const cached = getCachedRuleset(cacheKey, RULESET_CACHE_TTL_MS);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RuleSet Loader] Cache HIT for key=${cacheKey}`);
      }
      return toLegacyMergedRuleSet(cached);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[RuleSet Loader] Cache MISS for key=${cacheKey}, loading from DB...`);
    }

    // Step 3: Load DB overrides for all layers (including Phase 21 template metadata)
    const [
      verticalDbOverrides,
      marketDbOverrides,
      clientDbOverrides,
      verticalTemplateMeta,
      marketTemplateMeta,
      clientTemplateMeta,
    ] = await Promise.all([
      // Vertical layer
      verticalId !== 'base'
        ? DbRulesetService.loadAllOverrides({ vertical: verticalId })
        : Promise.resolve(null),

      // Market layer
      DbRulesetService.loadAllOverrides({ market: marketId }),

      // Client layer (if organizationId exists)
      organizationId
        ? DbRulesetService.loadAllOverrides({ organizationId, appId })
        : Promise.resolve(null),

      // Phase 21: Vertical Intelligence Layer - Template Metadata
      verticalId !== 'base'
        ? DbRulesetService.loadVerticalTemplateMeta(verticalId)
        : Promise.resolve(null),

      DbRulesetService.loadMarketTemplateMeta(marketId),

      organizationId
        ? DbRulesetService.loadClientTemplateMeta(organizationId)
        : Promise.resolve(null),
    ]);

    // Step 4: Normalize DB overrides into NormalizedRuleSet
    const verticalNormalized = verticalDbOverrides
      ? buildNormalizedRuleSet({
          ...verticalDbOverrides,
          meta: { vertical: verticalId },
        } as DbRulesetOverridesBundle)
      : undefined;

    const marketNormalized = marketDbOverrides
      ? buildNormalizedRuleSet({
          ...marketDbOverrides,
          meta: { market: marketId },
        } as DbRulesetOverridesBundle)
      : undefined;

    const clientNormalized = clientDbOverrides
      ? buildNormalizedRuleSet({
          ...clientDbOverrides,
          meta: { organizationId, appId },
        } as DbRulesetOverridesBundle)
      : undefined;

    // Step 5: Load code-based rulesets as base (Phase 9/10 rulesets)
    // These become the "base" layer for the merge
    const codeBaseRuleSet = createEmptyNormalizedRuleSet('base');

    // Step 6: Merge all layers: base → vertical → market → client
    // Note: We're merging ONLY DB overrides here; Phase 10 integration happens later
    const merged = mergeNormalizedRuleSets(
      codeBaseRuleSet,
      verticalNormalized,
      marketNormalized,
      clientNormalized,
      buildVersionInfo({
        // Version metadata (from DB or defaults)
        rulesetVersion: 1,
        verticalVersion: 1,
        marketVersion: 1,
        clientVersion: clientNormalized ? 1 : undefined,
      })
    );

    // Step 7: Cache result
    setCachedRuleset(cacheKey, merged);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[RuleSet Loader] DB-driven ruleset loaded and cached for key=${cacheKey}`, {
        verticalId,
        marketId,
        organizationId,
        hasVerticalOverrides: !!verticalNormalized,
        hasMarketOverrides: !!marketNormalized,
        hasClientOverrides: !!clientNormalized,
        source: merged.source,
        hasVerticalTemplate: !!verticalTemplateMeta,
        hasMarketTemplate: !!marketTemplateMeta,
        hasClientTemplate: !!clientTemplateMeta,
      });
    }

    // Convert to legacy format for Phase 10 compatibility
    const legacyMerged = toLegacyMergedRuleSet(merged);

    // Phase 21: Include template metadata in the final result
    if (verticalTemplateMeta) {
      legacyMerged.verticalTemplateMeta = verticalTemplateMeta;
    }
    if (marketTemplateMeta) {
      legacyMerged.marketTemplateMeta = marketTemplateMeta;
    }
    if (clientTemplateMeta) {
      legacyMerged.clientTemplateMeta = clientTemplateMeta;
    }

    return legacyMerged;
  } catch (error) {
    // Defensive: If DB query fails, log error and return null (fall back to code-based)
    console.error('[RuleSet Loader] Error loading DB-driven rulesets, falling back to code-based:', error);
    return null;
  }
}

// ============================================================================
// Active RuleSet Loader (Main Entry Point)
// ============================================================================

/**
 * Get active rule set for an app
 *
 * Phase 9/10 Inheritance pipeline (code-based):
 * 1. Load base rule set
 * 2. Detect vertical → load vertical rule set
 * 3. Detect market → load market rule set
 * 4. Load client rule set (if exists)
 * 5. Merge all rule sets
 * 6. Apply leak detection
 * 7. Return merged rule set
 *
 * Phase 12 Enhancement (DB-driven):
 * 1. Check feature flag (ASO_BIBLE_DB_RULESETS_ENABLED)
 * 2. If enabled: Load DB overrides → normalize → merge → cache
 * 3. Merge DB overrides with code-based rulesets
 * 4. If disabled or error: Fall back to Phase 9/10 code-based flow
 *
 * @param appMetadata - App metadata
 * @param locale - Locale code (e.g., "en-US")
 * @param organizationId - Organization ID (optional, for client-specific overrides)
 * @returns Merged rule set
 */
export async function getActiveRuleSet(
  appMetadata: AppMetadata,
  locale: string = 'en-US',
  organizationId?: string
): Promise<MergedRuleSet> {
  // Step 1: Detect vertical and market
  const verticalDetection = detectVertical(appMetadata);
  const marketDetection = detectMarket(locale);

  // Step 2: Try DB-driven rulesets (Phase 12) if feature flag enabled
  let dbMergedRuleSet: MergedRuleSet | null = null;

  if (ASO_BIBLE_DB_RULESETS_ENABLED) {
    try {
      dbMergedRuleSet = await loadDbDrivenRuleSet(
        verticalDetection.verticalId,
        marketDetection.marketId,
        organizationId,
        appMetadata.appId
      );
    } catch (error) {
      console.error('[RuleSet Loader] DB-driven ruleset loading failed, falling back to code-based:', error);
      dbMergedRuleSet = null;
    }
  }

  // Step 3: Load code-based rulesets (Phase 9/10) as fallback or base layer
  const baseRuleSet = loadBaseRuleSet();
  const verticalRuleSet = loadVerticalRuleSet(verticalDetection.verticalId);
  const marketRuleSet = loadMarketRuleSet(marketDetection.marketId);
  const clientRuleSet = loadClientRuleSet(appMetadata.appId);

  // Step 4: Merge code-based rulesets (Phase 9/10 behavior)
  const codeMerged = mergeRuleSets(baseRuleSet, verticalRuleSet, marketRuleSet, clientRuleSet);

  // Step 5: Merge DB overrides with code-based rulesets
  // If DB rulesets exist, they override code-based rulesets
  // If DB rulesets don't exist or feature flag off, use code-based only
  const finalMerged = dbMergedRuleSet
    ? mergeDbWithCodeRulesets(codeMerged, dbMergedRuleSet)
    : codeMerged;

  // Step 6: Add vertical/market metadata (Phase 21: added verticalName and marketName)
  finalMerged.verticalId = verticalDetection.verticalId;
  finalMerged.verticalName = verticalDetection.vertical.label;
  finalMerged.marketId = marketDetection.marketId;
  finalMerged.marketName = marketDetection.market.label;
  finalMerged.appId = appMetadata.appId;
  if (!finalMerged.discoveryThresholds) {
    finalMerged.discoveryThresholds =
      verticalDetection.vertical.discoveryThresholds || DEFAULT_DISCOVERY_THRESHOLDS;
  }

  // Step 7: Apply leak detection
  applyLeakDetection(finalMerged, appMetadata);

  // Log (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[RuleSet Loader] Active rule set loaded:', {
      vertical: verticalDetection.verticalId,
      verticalConfidence: verticalDetection.confidence,
      market: marketDetection.marketId,
      organizationId,
      source: finalMerged.source || (dbMergedRuleSet ? 'hybrid' : 'code'),
      leakWarnings: finalMerged.leakWarnings?.length || 0,
      hasVerticalRuleSet: !!verticalRuleSet,
      hasMarketRuleSet: !!marketRuleSet,
      hasDbOverrides: !!dbMergedRuleSet,
      intentOverrides: Object.keys(finalMerged.intentOverrides || {}).length,
      hookOverrides: Object.keys(finalMerged.hookOverrides || {}).length,
      tokenOverrides: Object.keys(finalMerged.tokenRelevanceOverrides || {}).length,
      recommendationOverrides: Object.keys(finalMerged.recommendationOverrides || {}).length,
    });
  }

  return finalMerged;
}

/**
 * Merge DB-driven overrides with code-based rulesets
 *
 * Strategy: DB overrides take precedence over code-based rulesets
 * - Token relevance: DB overrides win
 * - Hook overrides: DB overrides win
 * - Stopwords: Union merge (DB + code)
 * - KPI weights: DB overrides win
 * - Formula overrides: DB overrides win
 * - Recommendations: DB overrides win
 *
 * @param codeRuleset - Code-based merged ruleset (Phase 9/10)
 * @param dbRuleset - DB-driven merged ruleset (Phase 12)
 * @returns Final merged ruleset
 */
function mergeDbWithCodeRulesets(
  codeRuleset: MergedRuleSet,
  dbRuleset: MergedRuleSet
): MergedRuleSet {
  return {
    ...codeRuleset,

    // DB overrides take precedence (last wins)
    tokenRelevanceOverrides: {
      ...(codeRuleset.tokenRelevanceOverrides || {}),
      ...(dbRuleset.tokenRelevanceOverrides || {}),
    },

    hookOverrides: {
      ...(codeRuleset.hookOverrides || {}),
      ...(dbRuleset.hookOverrides || {}),
    },

    // Stopwords: Union merge (combine both sources)
    stopwordOverrides: {
      market: [
        ...(codeRuleset.stopwordOverrides?.market || []),
        ...(dbRuleset.stopwordOverrides?.market || []),
      ],
      vertical: [
        ...(codeRuleset.stopwordOverrides?.vertical || []),
        ...(dbRuleset.stopwordOverrides?.vertical || []),
      ],
    },

    kpiOverrides: {
      ...(codeRuleset.kpiOverrides || {}),
      ...(dbRuleset.kpiOverrides || {}),
    },

    formulaOverrides: {
      ...(codeRuleset.formulaOverrides || {}),
      ...(dbRuleset.formulaOverrides || {}),
    },

    recommendationOverrides: {
      ...(codeRuleset.recommendationOverrides || {}),
      ...(dbRuleset.recommendationOverrides || {}),
    },

    intentOverrides: {
      ...(codeRuleset.intentOverrides || {}),
      ...(dbRuleset.intentOverrides || {}),
    },

    // Update source to reflect hybrid nature
    source: 'hybrid' as const,

    // Preserve version metadata from DB
    versions: dbRuleset.versions,
  };
}

// ============================================================================
// Helper: Get RuleSet for Specific Vertical/Market
// ============================================================================

/**
 * Get rule set for specific vertical and market (bypasses auto-detection)
 *
 * Useful for testing and admin UI preview
 *
 * Phase 12: Also loads DB overrides if feature flag enabled
 *
 * @param verticalId - Vertical ID
 * @param marketId - Market ID
 * @param organizationId - Organization ID (optional)
 * @returns Merged rule set
 */
export async function getRuleSetForVerticalMarket(
  verticalId: string,
  marketId: string,
  organizationId?: string
): Promise<MergedRuleSet> {
  // Load DB-driven rulesets if enabled
  let dbMergedRuleSet: MergedRuleSet | null = null;

  if (ASO_BIBLE_DB_RULESETS_ENABLED) {
    try {
      dbMergedRuleSet = await loadDbDrivenRuleSet(
        verticalId,
        marketId,
        organizationId
      );
    } catch (error) {
      console.error('[RuleSet Loader] DB-driven ruleset loading failed for preview, falling back to code-based:', error);
      dbMergedRuleSet = null;
    }
  }

  // Load code-based rulesets
  const baseRuleSet = loadBaseRuleSet();
  const verticalRuleSet = loadVerticalRuleSet(verticalId);
  const marketRuleSet = loadMarketRuleSet(marketId);

  const codeMerged = mergeRuleSets(baseRuleSet, verticalRuleSet, marketRuleSet);

  // Merge DB with code
  const finalMerged = dbMergedRuleSet
    ? mergeDbWithCodeRulesets(codeMerged, dbMergedRuleSet)
    : codeMerged;

  // Phase 21: Add vertical/market IDs and names
  finalMerged.verticalId = verticalId;
  finalMerged.marketId = marketId;

  // Get vertical and market names from registries
  const verticalProfile = getVerticalById(verticalId);
  const marketProfile = getMarketById(marketId);

  if (verticalProfile) {
    finalMerged.verticalName = verticalProfile.label;
  }
  if (marketProfile) {
    finalMerged.marketName = marketProfile.label;
  }

  return finalMerged;
}

// ============================================================================
// Cache Management (Phase 12)
// ============================================================================

/**
 * Invalidate cached ruleset for specific vertical/market/org/app
 *
 * Useful when rulesets are updated via admin UI
 *
 * @param verticalId - Vertical ID
 * @param marketId - Market ID
 * @param organizationId - Organization ID (optional)
 * @param appId - App ID (optional)
 */
export function invalidateCachedRuleset(
  verticalId?: string,
  marketId?: string,
  organizationId?: string,
  appId?: string
): void {
  const cacheKey = buildCacheKey(verticalId, marketId, organizationId, appId);
  invalidateRuleset(cacheKey);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[RuleSet Loader] Cache invalidated for key=${cacheKey}`);
  }
}

/**
 * Export cache utilities for external use
 */
export { buildCacheKey, getCachedRuleset, setCachedRuleset } from './rulesetEngine/rulesetCache';
