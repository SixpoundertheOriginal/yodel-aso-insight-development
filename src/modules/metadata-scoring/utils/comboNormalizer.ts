/**
 * Combo Normalizer Utility
 *
 * Global canonicalization layer for all combination operations.
 * Ensures consistent token normalization across classification, scoring, and deduplication.
 */

/**
 * Normalizes a combo string into canonical tokens
 *
 * Rules:
 * - Convert to lowercase
 * - Remove all punctuation
 * - Split into tokens
 * - Filter out empty tokens
 *
 * @param combo - Raw combo string (e.g., "Learn Spanish!")
 * @returns Array of normalized tokens (e.g., ["learn", "spanish"])
 */
export function normalizeComboTokens(combo: string): string[] {
  if (!combo || typeof combo !== 'string') {
    return [];
  }

  return combo
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Gets the canonical string representation of a combo
 *
 * Convenience wrapper around normalizeComboTokens() that joins tokens back into a string.
 * Useful for deduplication and comparison operations.
 *
 * @param combo - Raw combo string
 * @returns Canonical combo string with normalized tokens joined by spaces
 */
export function getCanonicalComboString(combo: string): string {
  const normalizedTokens = normalizeComboTokens(combo);
  return normalizedTokens.join(' ');
}
