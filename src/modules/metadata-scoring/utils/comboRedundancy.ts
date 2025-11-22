/**
 * Combo Redundancy Detection Utility
 *
 * Identifies redundant patterns (shared prefixes/suffixes) in combinations.
 * Uses canonical tokens for consistent comparison.
 */

import { normalizeComboTokens, getCanonicalComboString } from './comboNormalizer';
import type { RedundancyAnalysis, RedundantGroup } from '../types';

/**
 * Finds redundant combinations with shared prefixes or suffixes
 *
 * Example:
 * - "learn spanish fast", "learn spanish now" → prefix "learn spanish"
 * - "language learning app", "vocabulary learning app" → suffix "learning app"
 *
 * @param combos - Array of combo strings
 * @returns RedundancyAnalysis with score and groups
 */
export function findRedundantCombos(combos: string[]): RedundancyAnalysis {
  if (!combos || combos.length < 2) {
    return {
      redundancyScore: 0,
      redundantGroups: []
    };
  }

  const redundantGroups: RedundantGroup[] = [];
  const processedCombos = new Set<string>();

  // Find prefix-based redundancy (2-word prefixes)
  const prefixGroups = new Map<string, string[]>();

  for (const combo of combos) {
    const tokens = normalizeComboTokens(combo);

    // Only check combos with 3+ tokens
    if (tokens.length >= 3) {
      const prefix = tokens.slice(0, 2).join(' ');
      const canonical = getCanonicalComboString(combo);

      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, []);
      }
      prefixGroups.get(prefix)!.push(canonical);
    }
  }

  // Collect redundant prefix groups (2+ combos sharing prefix)
  for (const [prefix, group] of prefixGroups.entries()) {
    if (group.length >= 2) {
      // Calculate wasted tokens: prefix tokens * (group size - 1)
      const wastedTokens = 2 * (group.length - 1);

      redundantGroups.push({
        pattern: prefix,
        type: 'prefix',
        combos: group,
        wastedTokens
      });

      // Mark these combos as processed
      group.forEach(combo => processedCombos.add(combo));
    }
  }

  // Find suffix-based redundancy (2-word suffixes)
  const suffixGroups = new Map<string, string[]>();

  for (const combo of combos) {
    const tokens = normalizeComboTokens(combo);
    const canonical = getCanonicalComboString(combo);

    // Only check combos with 3+ tokens that weren't already in prefix groups
    if (tokens.length >= 3 && !processedCombos.has(canonical)) {
      const suffix = tokens.slice(-2).join(' ');

      if (!suffixGroups.has(suffix)) {
        suffixGroups.set(suffix, []);
      }
      suffixGroups.get(suffix)!.push(canonical);
    }
  }

  // Collect redundant suffix groups (2+ combos sharing suffix)
  for (const [suffix, group] of suffixGroups.entries()) {
    if (group.length >= 2) {
      // Calculate wasted tokens: suffix tokens * (group size - 1)
      const wastedTokens = 2 * (group.length - 1);

      redundantGroups.push({
        pattern: suffix,
        type: 'suffix',
        combos: group,
        wastedTokens
      });
    }
  }

  // Calculate redundancy score
  const totalWastedTokens = redundantGroups.reduce(
    (sum, group) => sum + group.wastedTokens,
    0
  );

  // Total tokens across all combos
  const totalTokens = combos.reduce((sum, combo) => {
    return sum + normalizeComboTokens(combo).length;
  }, 0);

  // Redundancy score = (wasted tokens / total tokens) * 100
  const redundancyScore = totalTokens > 0
    ? Math.round((totalWastedTokens / totalTokens) * 100)
    : 0;

  return {
    redundancyScore: Math.min(100, redundancyScore),
    redundantGroups
  };
}
