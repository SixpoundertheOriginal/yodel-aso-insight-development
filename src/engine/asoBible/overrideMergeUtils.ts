/**
 * Override Merge Utilities
 *
 * Deep merge logic for combining rule sets in the inheritance chain:
 * Base → Vertical → Market → Client
 *
 * Phase 8: Structure only (no rule sets to merge yet)
 */

import type { AsoBibleRuleSet, MergedRuleSet } from './ruleset.types';

// ============================================================================
// Main Merge Function
// ============================================================================

/**
 * Merge multiple rule sets in order of precedence
 *
 * Precedence (lowest to highest):
 * 1. Base (global defaults)
 * 2. Vertical (category-specific)
 * 3. Market (locale-specific)
 * 4. Client (app-specific)
 *
 * @param ruleSets - Array of rule sets to merge (in precedence order)
 * @returns Merged rule set with inheritance chain
 */
export function mergeRuleSets(...ruleSets: AsoBibleRuleSet[]): MergedRuleSet {
  const [base, vertical, market, client] = ruleSets;

  // Start with empty merged rule set
  const merged: MergedRuleSet = {
    id: 'merged',
    label: 'Merged RuleSet',
    description: 'Combined rule set from base + vertical + market + client',
    source: 'base',
    mergedAt: new Date().toISOString(),
    inheritanceChain: {
      base,
      vertical,
      market,
      client,
    },
  };

  // Merge each rule set in order (later overrides earlier)
  for (const ruleSet of ruleSets) {
    if (!ruleSet) continue;

    mergeInto(merged, ruleSet);
  }

  return merged;
}

// ============================================================================
// Deep Merge Helper
// ============================================================================

/**
 * Merge source rule set into target rule set
 * Performs deep merge for nested objects
 *
 * @param target - Target rule set (mutated)
 * @param source - Source rule set (read-only)
 */
function mergeInto(target: AsoBibleRuleSet, source: AsoBibleRuleSet): void {
  // Merge KPI overrides
  if (source.kpiOverrides) {
    target.kpiOverrides = {
      ...target.kpiOverrides,
      ...deepMergeObjects(target.kpiOverrides || {}, source.kpiOverrides),
    };
  }

  // Merge formula overrides
  if (source.formulaOverrides) {
    target.formulaOverrides = {
      ...target.formulaOverrides,
      ...deepMergeObjects(target.formulaOverrides || {}, source.formulaOverrides),
    };
  }

  // Merge intent overrides
  if (source.intentOverrides) {
    target.intentOverrides = {
      ...target.intentOverrides,
      ...source.intentOverrides,
    };
  }

  // Merge hook overrides
  if (source.hookOverrides) {
    target.hookOverrides = {
      ...target.hookOverrides,
      ...source.hookOverrides,
    };
  }

  // Merge recommendation overrides
  if (source.recommendationOverrides) {
    target.recommendationOverrides = {
      ...target.recommendationOverrides,
      ...source.recommendationOverrides,
    };
  }

  // Merge token relevance overrides
  if (source.tokenRelevanceOverrides) {
    target.tokenRelevanceOverrides = {
      ...target.tokenRelevanceOverrides,
      ...source.tokenRelevanceOverrides,
    };
  }

  // Merge stopword overrides (append, not replace)
  if (source.stopwordOverrides) {
    target.stopwordOverrides = [
      ...(target.stopwordOverrides || []),
      ...source.stopwordOverrides,
    ];
  }

  // Merge character limits (override)
  if (source.characterLimits) {
    target.characterLimits = {
      ...target.characterLimits,
      ...source.characterLimits,
    };
  }

  // Update metadata
  if (source.version) {
    target.version = source.version;
  }
  if (source.source) {
    target.source = source.source;
  }
}

// ============================================================================
// Deep Merge Objects (Recursive)
// ============================================================================

/**
 * Deep merge two objects
 * Nested objects are merged recursively
 * Arrays are replaced (not merged)
 *
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
function deepMergeObjects<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      // Recursively merge nested objects
      result[key] = deepMergeObjects(targetValue, sourceValue);
    } else {
      // Replace value (including arrays)
      result[key] = sourceValue;
    }
  }

  return result;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a plain object (not array, not null)
 *
 * @param value - Value to check
 * @returns True if plain object
 */
function isPlainObject(value: any): value is Record<string, any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate merged rule set for consistency
 *
 * @param merged - Merged rule set
 * @returns Validation errors (empty array if valid)
 */
export function validateMergedRuleSet(merged: MergedRuleSet): string[] {
  const errors: string[] = [];

  // Check for required fields
  if (!merged.id) {
    errors.push('Merged rule set missing required field: id');
  }

  if (!merged.mergedAt) {
    errors.push('Merged rule set missing required field: mergedAt');
  }

  // Validate inheritance chain
  if (!merged.inheritanceChain) {
    errors.push('Merged rule set missing inheritance chain');
  }

  // Check for circular references (future)
  // ...

  return errors;
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Get summary of merged rule set for debugging
 *
 * @param merged - Merged rule set
 * @returns Summary object
 */
export function getMergedRuleSetSummary(merged: MergedRuleSet): Record<string, any> {
  return {
    id: merged.id,
    source: merged.source,
    mergedAt: merged.mergedAt,
    hasKpiOverrides: !!merged.kpiOverrides && Object.keys(merged.kpiOverrides).length > 0,
    hasFormulaOverrides:
      !!merged.formulaOverrides && Object.keys(merged.formulaOverrides).length > 0,
    hasIntentOverrides:
      !!merged.intentOverrides && Object.keys(merged.intentOverrides).length > 0,
    hasHookOverrides: !!merged.hookOverrides && Object.keys(merged.hookOverrides).length > 0,
    hasRecommendationOverrides:
      !!merged.recommendationOverrides && Object.keys(merged.recommendationOverrides).length > 0,
    inheritanceChain: {
      hasBase: !!merged.inheritanceChain?.base,
      hasVertical: !!merged.inheritanceChain?.vertical,
      hasMarket: !!merged.inheritanceChain?.market,
      hasClient: !!merged.inheritanceChain?.client,
    },
    leakWarnings: merged.leakWarnings?.length || 0,
  };
}
