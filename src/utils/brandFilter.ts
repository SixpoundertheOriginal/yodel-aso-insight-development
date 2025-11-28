/**
 * Brand Filter Utility
 *
 * Filters branded keywords from generic keyword suggestions.
 * Branded keywords don't help algorithmic visibility since users
 * must already know the brand to search for it.
 *
 * Examples (for "Inspire" app):
 * ✅ GENERIC: "self care wellness", "daily habits routine"
 * ❌ BRANDED: "inspire app", "inspire self care"
 */

export interface BrandFilterableCombo {
  text: string;
  [key: string]: any;
}

/**
 * Check if a combo contains branded keywords
 *
 * @param comboText - The combo text to check (e.g., "inspire self care")
 * @param brandName - The app's brand name (e.g., "Inspire")
 * @returns true if combo is GENERIC (no brand), false if BRANDED
 *
 * @example
 * isGenericCombo("self care wellness", "Inspire") // true - no brand
 * isGenericCombo("inspire app", "Inspire") // false - contains brand
 * isGenericCombo("inspire self care", "Inspire") // false - contains brand
 */
export function isGenericCombo(
  comboText: string,
  brandName: string | null
): boolean {
  // If no brand detected, all combos are considered generic
  if (!brandName || brandName.trim().length === 0) {
    return true;
  }

  const normalized = comboText.toLowerCase().trim();
  const brand = brandName.toLowerCase().trim();

  // Split into words and check if brand word exists
  const comboWords = normalized.split(/\s+/);

  // Check if brand appears as a whole word in the combo
  return !comboWords.includes(brand);
}

/**
 * Filter an array of combos to only include generic (non-branded) ones
 *
 * @param combos - Array of combos to filter
 * @param brandName - The app's brand name
 * @returns Filtered array containing only generic combos
 *
 * @example
 * const combos = [
 *   { text: "inspire app" },
 *   { text: "self care wellness" },
 *   { text: "inspire meditation" },
 *   { text: "daily habits" }
 * ];
 *
 * filterGenericCombos(combos, "Inspire")
 * // Returns: [
 * //   { text: "self care wellness" },
 * //   { text: "daily habits" }
 * // ]
 */
export function filterGenericCombos<T extends BrandFilterableCombo>(
  combos: T[],
  brandName: string | null
): T[] {
  return combos.filter(combo => isGenericCombo(combo.text, brandName));
}

/**
 * Count how many combos were filtered out (branded)
 *
 * @param totalCombos - Total number of combos before filtering
 * @param genericCombos - Number of generic combos after filtering
 * @returns Number of branded combos that were filtered out
 */
export function countBrandedCombosFiltered(
  totalCombos: number,
  genericCombos: number
): number {
  return Math.max(0, totalCombos - genericCombos);
}

/**
 * Get statistics about brand filtering
 *
 * @param combos - All combos
 * @param brandName - The app's brand name
 * @returns Statistics object with counts
 */
export function getBrandFilterStats(
  combos: BrandFilterableCombo[],
  brandName: string | null
): {
  total: number;
  generic: number;
  branded: number;
  percentageFiltered: number;
} {
  const total = combos.length;
  const generic = filterGenericCombos(combos, brandName).length;
  const branded = total - generic;
  const percentageFiltered = total > 0 ? Math.round((branded / total) * 100) : 0;

  return {
    total,
    generic,
    branded,
    percentageFiltered,
  };
}
