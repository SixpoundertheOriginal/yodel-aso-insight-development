/**
 * Formula Admin Service
 *
 * Phase 14: Formula Registry admin layer
 *
 * Provides read/write access to formula registry with admin capabilities:
 * - Get formulas with usage stats (which KPIs use them)
 * - Update formula parameters (stored as DB overrides)
 * - Create new formulas (within type system)
 * - Deprecate formulas (mark as deprecated, not delete)
 *
 * All changes are stored as database overrides, not code modifications.
 */

import {
  getAllFormulas,
  getFormulaDefinition,
  getAllKpis,
} from '@/services/metadataConfigService';
import type { FormulaDefinition, FormulaComponent } from '@/engine/metadata/metadataFormulaRegistry';

// ============================================================================
// Extended Types for Admin UI
// ============================================================================

/**
 * Formula with usage stats
 */
export interface FormulaWithUsage extends FormulaDefinition {
  /** KPI IDs that use this formula */
  usedByKpis: string[];

  /** Number of KPIs using this formula */
  usageCount: number;

  /** Is this formula deprecated? */
  deprecated?: boolean;

  /** Deprecation reason */
  deprecationReason?: string;
}

/**
 * Request to update formula parameters
 */
export interface UpdateFormulaRequest {
  formulaId: string;
  updates: {
    description?: string;
    notes?: string;
    components?: FormulaComponent[];
    thresholds?: any[];
    tags?: string[];
  };
}

/**
 * Request to create a new formula
 */
export interface CreateFormulaRequest {
  id: string;
  label: string;
  description: string;
  type: 'weighted_sum' | 'ratio' | 'composite' | 'threshold_based' | 'custom';
  components?: FormulaComponent[];
  thresholds?: any[];
  admin?: {
    editable: boolean;
    inputType?: 'slider' | 'number' | 'readonly';
    group?: string;
    helpText?: string;
    notes?: string;
  };
}

/**
 * Request to deprecate a formula
 */
export interface DeprecateFormulaRequest {
  formulaId: string;
  reason: string;
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all formulas with usage statistics
 *
 * @returns Array of formulas with KPI usage counts
 */
export function getAllFormulasWithUsage(): FormulaWithUsage[] {
  const formulas = getAllFormulas();
  const kpis = getAllKpis();

  return formulas.map((formula) => {
    // Find KPIs that reference this formula
    // NOTE: This is simplified - in production, we'd need a proper KPI -> formula mapping
    const usedByKpis: string[] = [];

    // Check if any KPI uses this formula (based on naming convention for now)
    kpis.forEach((kpi) => {
      // This is a placeholder - we'd need proper formula references in KPI definitions
      // For now, just check if the formula ID appears in KPI description or notes
      if (
        kpi.description?.includes(formula.id) ||
        kpi.admin?.notes?.includes(formula.id)
      ) {
        usedByKpis.push(kpi.id);
      }
    });

    return {
      ...formula,
      usedByKpis,
      usageCount: usedByKpis.length,
      deprecated: false, // TODO: Add deprecated flag from DB admin meta
      deprecationReason: undefined,
    };
  });
}

/**
 * Get single formula with usage detail
 *
 * @param formulaId - Formula identifier
 * @returns Formula with usage stats or null
 */
export function getFormulaWithUsage(formulaId: string): FormulaWithUsage | null {
  const formula = getFormulaDefinition(formulaId);
  if (!formula) return null;

  const allFormulas = getAllFormulasWithUsage();
  return allFormulas.find((f) => f.id === formulaId) || null;
}

/**
 * Get formulas by type
 *
 * @param type - Formula type
 * @returns Array of formulas of the specified type
 */
export function getFormulasByType(
  type: 'weighted_sum' | 'ratio' | 'composite' | 'threshold_based' | 'custom'
): FormulaWithUsage[] {
  const allFormulas = getAllFormulasWithUsage();
  return allFormulas.filter((f) => f.type === type);
}

/**
 * Get editable formulas
 *
 * @returns Array of formulas that can be edited
 */
export function getEditableFormulas(): FormulaWithUsage[] {
  const allFormulas = getAllFormulasWithUsage();
  return allFormulas.filter((f) => f.admin?.editable === true);
}

/**
 * Get deprecated formulas
 *
 * @returns Array of deprecated formulas
 */
export function getDeprecatedFormulas(): FormulaWithUsage[] {
  const allFormulas = getAllFormulasWithUsage();
  return allFormulas.filter((f) => f.deprecated === true);
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Update formula parameters
 *
 * NOTE: This stores parameters as DB overrides, not code changes.
 * Core formula definitions remain in code.
 */
export async function updateFormulaParameters(
  request: UpdateFormulaRequest
): Promise<boolean> {
  // TODO: Implement formula parameter override table
  // For Phase 14, we'll focus on viewing formulas
  // Parameter updates can be added later when the DB schema is extended

  console.warn('updateFormulaParameters not yet implemented - needs formula override table');
  return false;
}

/**
 * Create a new formula
 *
 * NOTE: New formulas are stored in DB, not code.
 * They must follow existing type system (weighted_sum, ratio, etc.)
 */
export async function createFormula(
  request: CreateFormulaRequest
): Promise<boolean> {
  // TODO: Implement formula creation in DB
  // For Phase 14, this is a placeholder for future functionality

  console.warn('createFormula not yet implemented - needs formula creation table');
  return false;
}

/**
 * Deprecate a formula
 *
 * Marks a formula as deprecated but does not delete it.
 * Deprecated formulas are still used in historical scoring but hidden from UI.
 */
export async function deprecateFormula(
  request: DeprecateFormulaRequest
): Promise<boolean> {
  // TODO: Implement formula deprecation in DB admin meta

  console.warn('deprecateFormula not yet implemented - needs admin meta table');
  return false;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate formula component weights sum to 1.0
 *
 * For weighted_sum and composite formulas, component weights should sum to 1.0
 */
export function validateComponentWeights(components: FormulaComponent[]): {
  valid: boolean;
  sum: number;
  error?: string;
} {
  const sum = components.reduce((acc, comp) => acc + comp.weight, 0);
  const valid = Math.abs(sum - 1.0) < 0.0001; // Allow floating point tolerance

  return {
    valid,
    sum,
    error: valid ? undefined : `Component weights sum to ${sum.toFixed(4)}, expected 1.0`,
  };
}

/**
 * Normalize component weights to sum to 1.0
 *
 * Takes an array of components and returns normalized weights
 */
export function normalizeComponentWeights(
  components: FormulaComponent[]
): FormulaComponent[] {
  const sum = components.reduce((acc, comp) => acc + comp.weight, 0);

  if (sum === 0) {
    // Equal distribution if sum is 0
    const equalWeight = 1.0 / components.length;
    return components.map((comp) => ({ ...comp, weight: equalWeight }));
  }

  // Normalize to sum = 1.0
  return components.map((comp) => ({
    ...comp,
    weight: comp.weight / sum,
  }));
}

/**
 * Validate formula ID is unique
 */
export function isFormulaIdUnique(formulaId: string): boolean {
  const existing = getFormulaDefinition(formulaId);
  return !existing;
}

/**
 * Check if formula can be safely deprecated
 *
 * A formula can be deprecated if:
 * - It's not used by any active KPIs
 * - OR it has been explicitly overridden for all KPIs that use it
 */
export function canDeprecateFormula(formulaId: string): {
  canDeprecate: boolean;
  reason?: string;
  affectedKpis?: string[];
} {
  const formula = getFormulaWithUsage(formulaId);
  if (!formula) {
    return { canDeprecate: false, reason: 'Formula not found' };
  }

  if (formula.usageCount === 0) {
    return { canDeprecate: true };
  }

  return {
    canDeprecate: false,
    reason: `Formula is used by ${formula.usageCount} KPI(s)`,
    affectedKpis: formula.usedByKpis,
  };
}

/**
 * Get formula statistics summary
 */
export function getFormulaStatistics() {
  const allFormulas = getAllFormulasWithUsage();

  return {
    total: allFormulas.length,
    editable: allFormulas.filter((f) => f.admin?.editable === true).length,
    deprecated: allFormulas.filter((f) => f.deprecated === true).length,
    byType: {
      weighted_sum: allFormulas.filter((f) => f.type === 'weighted_sum').length,
      ratio: allFormulas.filter((f) => f.type === 'ratio').length,
      composite: allFormulas.filter((f) => f.type === 'composite').length,
      threshold_based: allFormulas.filter((f) => f.type === 'threshold_based').length,
      custom: allFormulas.filter((f) => f.type === 'custom').length,
    },
    totalUsage: allFormulas.reduce((acc, f) => acc + f.usageCount, 0),
  };
}
