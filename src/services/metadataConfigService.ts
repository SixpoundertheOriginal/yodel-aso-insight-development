/**
 * Metadata Configuration Service
 *
 * Helper layer for accessing KPI and Formula registries.
 * Provides clean API surface for future admin UI development.
 *
 * All functions are pure, read-only helpers with no side effects.
 */

import { METADATA_FORMULA_REGISTRY } from '@/engine/metadata/metadataFormulaRegistry';
import type {
  KpiDefinition,
  KpiFamilyDefinition,
  KpiId,
  KpiFamilyId,
} from '@/engine/metadata/kpi/kpi.types';
import type {
  FormulaDefinition,
} from '@/engine/metadata/metadataFormulaRegistry';

// Import KPI registries
import kpiRegistryData from '@/engine/metadata/kpi/kpi.registry.json';
import familyRegistryData from '@/engine/metadata/kpi/kpi.families.json';

// Type the imported JSON data
const KPI_REGISTRY = kpiRegistryData as { kpis: KpiDefinition[] };
const FAMILY_REGISTRY = familyRegistryData as { families: KpiFamilyDefinition[] };

// ============================================================================
// KPI Registry Accessors
// ============================================================================

/**
 * Get all KPI definitions
 */
export function getAllKpis(): KpiDefinition[] {
  return KPI_REGISTRY.kpis;
}

/**
 * Get KPI definition by ID
 */
export function getKpiDefinition(id: KpiId): KpiDefinition | undefined {
  return KPI_REGISTRY.kpis.find(kpi => kpi.id === id);
}

/**
 * Get all editable KPIs, sorted by group and displayOrder
 */
export function getEditableKpis(): KpiDefinition[] {
  return KPI_REGISTRY.kpis
    .filter(kpi => kpi.admin?.editable === true)
    .sort((a, b) => {
      // Sort by group first
      const groupA = a.admin?.group || '';
      const groupB = b.admin?.group || '';
      if (groupA !== groupB) {
        return groupA.localeCompare(groupB);
      }
      // Then by displayOrder within group
      const orderA = a.admin?.displayOrder ?? 999;
      const orderB = b.admin?.displayOrder ?? 999;
      return orderA - orderB;
    });
}

/**
 * Get editable KPIs grouped by admin.group
 * Returns map of group name -> sorted KPI array
 */
export function getEditableKpisByGroup(): Record<string, KpiDefinition[]> {
  const editableKpis = getEditableKpis();
  const grouped: Record<string, KpiDefinition[]> = {};

  editableKpis.forEach(kpi => {
    const group = kpi.admin?.group || 'Other';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(kpi);
  });

  return grouped;
}

/**
 * Get KPIs by family ID
 */
export function getKpisByFamily(familyId: KpiFamilyId): KpiDefinition[] {
  return KPI_REGISTRY.kpis
    .filter(kpi => kpi.familyId === familyId)
    .sort((a, b) => {
      const orderA = a.admin?.displayOrder ?? 999;
      const orderB = b.admin?.displayOrder ?? 999;
      return orderA - orderB;
    });
}

/**
 * Get KPIs by tag
 */
export function getKpisByTag(tag: string): KpiDefinition[] {
  return KPI_REGISTRY.kpis.filter(kpi => kpi.admin?.tags?.includes(tag));
}

// ============================================================================
// Family Registry Accessors
// ============================================================================

/**
 * Get all family definitions
 */
export function getAllFamilies(): KpiFamilyDefinition[] {
  return FAMILY_REGISTRY.families;
}

/**
 * Get family definition by ID
 */
export function getFamilyDefinition(id: KpiFamilyId): KpiFamilyDefinition | undefined {
  return FAMILY_REGISTRY.families.find(family => family.id === id);
}

/**
 * Get all families sorted by displayOrder
 */
export function getFamiliesSorted(): KpiFamilyDefinition[] {
  return FAMILY_REGISTRY.families
    .slice()
    .sort((a, b) => {
      const orderA = a.admin?.displayOrder ?? 999;
      const orderB = b.admin?.displayOrder ?? 999;
      return orderA - orderB;
    });
}

/**
 * Get editable families (where weight can be adjusted)
 */
export function getEditableFamilies(): KpiFamilyDefinition[] {
  return FAMILY_REGISTRY.families.filter(family => family.admin?.editable === true);
}

// ============================================================================
// Formula Registry Accessors
// ============================================================================

/**
 * Get all formula definitions
 */
export function getAllFormulas(): FormulaDefinition[] {
  return METADATA_FORMULA_REGISTRY;
}

/**
 * Get formula definition by ID
 */
export function getFormulaDefinition(id: string): FormulaDefinition | undefined {
  return METADATA_FORMULA_REGISTRY.find(formula => formula.id === id);
}

/**
 * Get all editable formulas, sorted by group and displayOrder
 */
export function getEditableFormulas(): FormulaDefinition[] {
  return METADATA_FORMULA_REGISTRY
    .filter(formula => formula.admin?.editable === true)
    .sort((a, b) => {
      // Sort by group first
      const groupA = a.admin?.group || '';
      const groupB = b.admin?.group || '';
      if (groupA !== groupB) {
        return groupA.localeCompare(groupB);
      }
      // Then by displayOrder within group
      const orderA = a.admin?.displayOrder ?? 999;
      const orderB = b.admin?.displayOrder ?? 999;
      return orderA - orderB;
    });
}

/**
 * Get editable formulas grouped by admin.group
 * Returns map of group name -> sorted formula array
 */
export function getEditableFormulasByGroup(): Record<string, FormulaDefinition[]> {
  const editableFormulas = getEditableFormulas();
  const grouped: Record<string, FormulaDefinition[]> = {};

  editableFormulas.forEach(formula => {
    const group = formula.admin?.group || 'Other';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(formula);
  });

  return grouped;
}

/**
 * Get formulas by type
 */
export function getFormulasByType(type: string): FormulaDefinition[] {
  return METADATA_FORMULA_REGISTRY.filter(formula => formula.type === type);
}

// ============================================================================
// Combined Accessors (for Admin UI convenience)
// ============================================================================

/**
 * Get config summary for admin dashboard
 * Returns counts and metadata about current configuration
 */
export function getConfigSummary() {
  const allKpis = getAllKpis();
  const allFamilies = getAllFamilies();
  const allFormulas = getAllFormulas();

  return {
    kpis: {
      total: allKpis.length,
      editable: allKpis.filter(k => k.admin?.editable === true).length,
      byFamily: allFamilies.reduce((acc, family) => {
        acc[family.id] = getKpisByFamily(family.id).length;
        return acc;
      }, {} as Record<string, number>),
    },
    families: {
      total: allFamilies.length,
      editable: allFamilies.filter(f => f.admin?.editable === true).length,
    },
    formulas: {
      total: allFormulas.length,
      editable: allFormulas.filter(f => f.admin?.editable === true).length,
      byType: {
        weighted_sum: getFormulasByType('weighted_sum').length,
        ratio: getFormulasByType('ratio').length,
        composite: getFormulasByType('composite').length,
        threshold_based: getFormulasByType('threshold_based').length,
        custom: getFormulasByType('custom').length,
      },
    },
  };
}

/**
 * Validate that all family weights sum to 1.0 (100%)
 * Returns { valid: boolean, sum: number, error?: string }
 */
export function validateFamilyWeights() {
  const families = getAllFamilies();
  const sum = families.reduce((acc, family) => acc + family.weight, 0);
  const valid = Math.abs(sum - 1.0) < 0.0001; // Allow floating point tolerance

  return {
    valid,
    sum,
    error: valid ? undefined : `Family weights sum to ${sum.toFixed(4)}, expected 1.0`,
  };
}

/**
 * Get total weight sum for KPIs within each family
 *
 * NOTE: KPI weights within a family do NOT need to sum to 1.0.
 * The KPI Engine normalizes scores by dividing by total weight.
 * This function is informational only.
 *
 * Returns map of familyId -> total weight sum
 */
export function getKpiWeightSumsByFamily() {
  const families = getAllFamilies();
  const results: Record<string, number> = {};

  families.forEach(family => {
    const kpis = getKpisByFamily(family.id);
    const sum = kpis.reduce((acc, kpi) => acc + kpi.weight, 0);
    results[family.id] = sum;
  });

  return results;
}
