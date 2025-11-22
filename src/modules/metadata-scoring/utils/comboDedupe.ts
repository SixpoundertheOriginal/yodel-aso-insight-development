/**
 * Combo Deduplication Utility
 *
 * Removes duplicate combinations using canonical token comparison.
 * Ensures consistent, clean combo outputs across the analysis pipeline.
 */

import { getCanonicalComboString } from './comboNormalizer';

/**
 * Deduplicates an array of combos using canonical token comparison
 *
 * Two combos are considered duplicates if they have the same canonical form:
 * - "Learn Spanish" and "learn spanish" → same canonical form → duplicate
 * - "Language Learning" and "Learning Language" → different canonical forms → not duplicate
 *
 * @param combos - Array of combo strings
 * @returns Deduplicated array (preserves first occurrence order)
 */
export function dedupeCombos(combos: string[]): string[] {
  if (!combos || combos.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const combo of combos) {
    const canonical = getCanonicalComboString(combo);

    if (!seen.has(canonical)) {
      seen.add(canonical);
      deduped.push(combo); // Preserve original case/formatting
    }
  }

  return deduped;
}
