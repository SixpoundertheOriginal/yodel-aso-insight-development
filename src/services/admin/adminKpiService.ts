/**
 * KPI Admin Service
 *
 * Phase 14: KPI Registry admin layer
 *
 * Provides read/write access to KPI registry with admin capabilities:
 * - Get KPIs with effective weights (base + overrides)
 * - Update KPI metadata (stored as DB overrides)
 * - Update KPI weights
 * - Update KPI formula mappings
 *
 * All changes are stored as database overrides, not code modifications.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getAllKpis,
  getAllFamilies,
  getKpiDefinition,
  getFamilyDefinition,
  getKpisByFamily,
} from '@/services/metadataConfigService';
import { getRuleSetForVerticalMarket } from '@/engine/asoBible/rulesetLoader';
import type { MergedRuleSet, AsoBibleRuleSet } from '@/engine/asoBible/ruleset.types';
import type {
  KpiDefinition,
  KpiFamilyDefinition,
  KpiId,
  KpiFamilyId,
} from '@/engine/metadata/kpi/kpi.types';

// ============================================================================
// Extended Types for Admin UI
// ============================================================================

/**
 * KPI with admin metadata and effective weights
 */
export interface KpiWithAdminMeta extends KpiDefinition {
  /** Effective weight after applying overrides */
  effectiveWeight?: number;

  /** Is this KPI overridden in the current ruleset? */
  hasOverride?: boolean;

  /** Override multiplier (if any) */
  overrideMultiplier?: number;

  /** Provenance of overrides (scope + multiplier) */
  provenance?: Array<{
    scope: 'base' | 'vertical' | 'market' | 'client';
    multiplier: number;
    sourceId?: string;
    label?: string;
  }>;

  /** Formula ID reference */
  formulaRef?: string;

  /** Is this KPI enabled? */
  enabled?: boolean;

  /** Is this KPI experimental? */
  experimental?: boolean;
}

/**
 * Family with admin metadata and stats
 */
export interface FamilyWithStats extends KpiFamilyDefinition {
  /** Number of KPIs in this family */
  kpiCount: number;

  /** Effective weight after applying overrides */
  effectiveWeight?: number;

  /** Is this family overridden? */
  hasOverride?: boolean;

  /** Override multiplier (if any) */
  overrideMultiplier?: number;
}

/**
 * Request to update KPI admin metadata
 */
export interface UpdateKpiMetaRequest {
  kpiId: KpiId;
  updates: {
    description?: string;
    notes?: string;
    tags?: string[];
    enabled?: boolean;
    experimental?: boolean;
    formulaRef?: string;
  };
}

/**
 * Request to update KPI weight
 */
export interface UpdateKpiWeightRequest {
  kpiId: KpiId;
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  weight: number;
}

/**
 * Request to update family weight
 */
export interface UpdateFamilyWeightRequest {
  familyId: KpiFamilyId;
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  weight: number;
}

interface KpiOverrideRecord {
  id: string;
  scope: 'base' | 'vertical' | 'market' | 'client';
  vertical?: string | null;
  market?: string | null;
  organization_id?: string | null;
  kpi_name: string;
  weight: number;
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all KPIs with admin metadata and effective weights
 *
 * @param vertical - Optional vertical filter for effective weights
 * @param market - Optional market filter for effective weights
 * @param organizationId - Optional organization filter for effective weights
 * @returns Array of KPIs with admin metadata
 */
export async function getAllKpisWithAdminMeta(
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<KpiWithAdminMeta[]> {
  const baseKpis = getAllKpis();
  const mergedRuleSet = await loadMergedRuleSetForContext(vertical, market, organizationId);
  const overrides = await fetchKpiOverrides();

  return baseKpis.map((kpi) => {
    const resolution = resolveKpiWeight(
      kpi.id,
      kpi.weight,
      mergedRuleSet,
      overrides,
      vertical,
      market,
      organizationId
    );

    return {
      ...kpi,
      effectiveWeight: resolution.effectiveWeight,
      hasOverride: resolution.overrideMultiplier !== 1,
      overrideMultiplier: resolution.overrideMultiplier,
      provenance: resolution.provenance,
      formulaRef: kpi.admin?.notes || undefined,
      enabled: true,
      experimental: false,
    };
  });
}

/**
 * Get single KPI with admin metadata
 */
export async function getKpiWithAdminMeta(
  kpiId: KpiId,
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<KpiWithAdminMeta | null> {
  const baseKpi = getKpiDefinition(kpiId);
  if (!baseKpi) return null;

  const mergedRuleSet = await loadMergedRuleSetForContext(vertical, market, organizationId);
  const overrides = await fetchKpiOverrides();
  const resolution = resolveKpiWeight(
    kpiId,
    baseKpi.weight,
    mergedRuleSet,
    overrides,
    vertical,
    market,
    organizationId
  );

  return {
    ...baseKpi,
    effectiveWeight: resolution.effectiveWeight,
    hasOverride: resolution.overrideMultiplier !== 1,
    overrideMultiplier: resolution.overrideMultiplier,
    provenance: resolution.provenance,
    formulaRef: baseKpi.admin?.notes || undefined,
    enabled: true,
    experimental: false,
  };
}

/**
 * Get all families with stats and admin metadata
 */
export async function getAllFamiliesWithStats(
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<FamilyWithStats[]> {
  const baseFamilies = getAllFamilies();

  // TODO: Fetch family weight overrides when that table exists
  // For now, just return base families with stats

  return baseFamilies.map((family) => ({
    ...family,
    kpiCount: getKpisByFamily(family.id).length,
    effectiveWeight: family.weight,
    hasOverride: false,
    overrideMultiplier: 1.0,
  }));
}

/**
 * Get family with stats
 */
export async function getFamilyWithStats(
  familyId: KpiFamilyId,
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<FamilyWithStats | null> {
  const baseFamily = getFamilyDefinition(familyId);
  if (!baseFamily) return null;

  return {
    ...baseFamily,
    kpiCount: getKpisByFamily(familyId).length,
    effectiveWeight: baseFamily.weight,
    hasOverride: false,
    overrideMultiplier: 1.0,
  };
}

async function loadMergedRuleSetForContext(
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<MergedRuleSet | null> {
  try {
    if (!vertical && !market && !organizationId) {
      return await getRuleSetForVerticalMarket('base', 'global');
    }
    return await getRuleSetForVerticalMarket(
      vertical || 'base',
      market || 'global',
      organizationId
    );
  } catch (error) {
    console.warn('[Admin KPI] Failed to load merged rule set:', error);
    return null;
  }
}

async function fetchKpiOverrides(): Promise<KpiOverrideRecord[]> {
  const { data, error } = await supabase
    .from('aso_kpi_weight_overrides')
    .select('*')
    .eq('is_active', true);

  if (error || !data) {
    return [];
  }

  return data as KpiOverrideRecord[];
}

function resolveKpiWeight(
  kpiId: KpiId,
  baseWeight: number,
  mergedRuleSet: MergedRuleSet | null,
  overrideRecords: KpiOverrideRecord[],
  vertical?: string,
  market?: string,
  organizationId?: string
) {
  const candidates: Array<{
    scope: 'base' | 'vertical' | 'market' | 'client';
    multiplier: number;
    sourceId?: string;
  }> = [];

  const inheritance = mergedRuleSet?.inheritanceChain;
  if (inheritance) {
    addCandidateFromRuleSet(candidates, 'base', inheritance.base, kpiId);
    addCandidateFromRuleSet(candidates, 'vertical', inheritance.vertical, kpiId);
    addCandidateFromRuleSet(candidates, 'market', inheritance.market, kpiId);
    addCandidateFromRuleSet(candidates, 'client', inheritance.client, kpiId);
  }

  const matchingOverrides = overrideRecords.filter((record) => {
    if (record.kpi_name !== kpiId) return false;

    if (record.scope === 'client') {
      return organizationId ? record.organization_id === organizationId : false;
    }
    if (record.scope === 'market') {
      return market ? record.market === market : false;
    }
    if (record.scope === 'vertical') {
      return vertical ? record.vertical === vertical : false;
    }
    return false;
  });

  const dbOverride = matchingOverrides.sort((a, b) => scopePriority(a.scope) - scopePriority(b.scope))[0];
  if (dbOverride) {
    candidates.push({
      scope: dbOverride.scope,
      multiplier: dbOverride.weight,
      sourceId: dbOverride.id,
    });
  }

  const winner = candidates.sort((a, b) => scopePriority(b.scope) - scopePriority(a.scope))[0];
  const overrideMultiplier = winner?.multiplier ?? 1;
  const effectiveWeight = baseWeight * overrideMultiplier;
  const provenance = [
    {
      scope: 'base' as const,
      multiplier: 1,
      sourceId: inheritance?.base?.id,
    },
  ];

  if (winner && winner.scope !== 'base') {
    provenance.push(winner);
  }

  return {
    effectiveWeight,
    overrideMultiplier,
    provenance,
  };
}

function addCandidateFromRuleSet(
  list: Array<{ scope: 'base' | 'vertical' | 'market' | 'client'; multiplier: number; sourceId?: string }>,
  scope: 'base' | 'vertical' | 'market' | 'client',
  ruleSet: AsoBibleRuleSet | undefined,
  kpiId: KpiId
) {
  const override = ruleSet?.kpiOverrides?.[kpiId];
  if (override?.weight) {
    list.push({
      scope,
      multiplier: override.weight,
      sourceId: ruleSet?.id,
    });
  }
}

function scopePriority(scope: string): number {
  switch (scope) {
    case 'client':
      return 4;
    case 'market':
      return 3;
    case 'vertical':
      return 2;
    default:
      return 1;
  }
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Update KPI admin metadata
 *
 * NOTE: This stores metadata as DB overrides, not code changes.
 * Core KPI definitions remain in code.
 */
export async function updateKpiAdminMeta(
  request: UpdateKpiMetaRequest
): Promise<boolean> {
  // TODO: Implement KPI admin metadata table
  // For Phase 14, we'll focus on weight overrides
  // Metadata updates (description, notes, etc.) can be added later

  console.warn('updateKpiAdminMeta not yet implemented - needs admin metadata table');
  return false;
}

/**
 * Update KPI weight override
 *
 * Creates or updates a weight override for the given scope.
 * Weight is a multiplier (0.5x - 2.0x) applied to the base KPI weight.
 */
export async function updateKpiWeight(
  request: UpdateKpiWeightRequest
): Promise<boolean> {
  const { kpiId, scope, vertical, market, organizationId, weight } = request;

  // Validate weight bounds
  if (weight < 0.5 || weight > 2.0) {
    console.error('KPI weight multiplier must be between 0.5 and 2.0');
    return false;
  }

  // Upsert override
  const { error } = await supabase
    .from('aso_kpi_weight_overrides')
    .upsert(
      {
        scope,
        vertical: vertical || null,
        market: market || null,
        organization_id: organizationId || null,
        kpi_name: kpiId,
        weight,
        is_active: true,
        version: 1,
      },
      {
        onConflict: 'scope,vertical,market,organization_id,kpi_name',
      }
    );

  if (error) {
    console.error('Error updating KPI weight:', error);
    return false;
  }

  // TODO: Invalidate ruleset cache
  return true;
}

/**
 * Delete KPI weight override
 */
export async function deleteKpiWeightOverride(
  overrideId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('aso_kpi_weight_overrides')
    .delete()
    .eq('id', overrideId);

  if (error) {
    console.error('Error deleting KPI weight override:', error);
    return false;
  }

  // TODO: Invalidate ruleset cache
  return true;
}

/**
 * Update family weight override
 *
 * NOTE: Family weight overrides are not yet implemented in DB schema.
 * This is a placeholder for future implementation.
 */
export async function updateFamilyWeight(
  request: UpdateFamilyWeightRequest
): Promise<boolean> {
  console.warn('updateFamilyWeight not yet implemented - needs family weight overrides table');
  return false;
}

/**
 * Update KPI formula reference
 *
 * Changes which formula a KPI uses for computation.
 * Stored as admin metadata override.
 */
export async function updateKpiFormulaRef(
  kpiId: KpiId,
  formulaId: string
): Promise<boolean> {
  // TODO: Implement KPI-formula mapping table
  console.warn('updateKpiFormulaRef not yet implemented - needs KPI-formula mapping table');
  return false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize family weights to sum to 1.0
 *
 * Takes an array of family weights and returns normalized values.
 * Used when user adjusts family weights in the admin UI.
 */
export function normalizeFamilyWeights(
  weights: Array<{ familyId: KpiFamilyId; weight: number }>
): Array<{ familyId: KpiFamilyId; weight: number }> {
  const sum = weights.reduce((acc, w) => acc + w.weight, 0);

  if (sum === 0) {
    // Equal distribution if sum is 0
    const equalWeight = 1.0 / weights.length;
    return weights.map((w) => ({ ...w, weight: equalWeight }));
  }

  // Normalize to sum = 1.0
  return weights.map((w) => ({
    familyId: w.familyId,
    weight: w.weight / sum,
  }));
}

/**
 * Validate KPI weight multiplier bounds
 */
export function isValidKpiWeightMultiplier(weight: number): boolean {
  return weight >= 0.5 && weight <= 2.0;
}

/**
 * Get KPIs grouped by family with effective weights
 */
export async function getKpisByFamilyWithWeights(
  familyId: KpiFamilyId,
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<KpiWithAdminMeta[]> {
  const allKpis = await getAllKpisWithAdminMeta(vertical, market, organizationId);
  return allKpis.filter((kpi) => kpi.familyId === familyId);
}
