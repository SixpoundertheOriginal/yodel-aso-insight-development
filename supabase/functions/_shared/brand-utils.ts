/**
 * Brand Utilities for ASO Audit
 *
 * Provides brand keyword extraction and filtering for combo analysis.
 * Used to focus ranking potential analysis on generic keywords only.
 *
 * Phase 1.2: Backend Brand Infrastructure
 */

/**
 * Extract brand keywords from app name (auto-detection)
 *
 * Strategy: First 1-3 words before punctuation (-, :, |, etc.)
 *
 * Examples:
 *   "Duolingo - Learn Spanish" → ["duolingo"]
 *   "My Fitness Pal - Calorie Counter" → ["my", "fitness", "pal"]
 *   "Calm: Sleep & Meditation" → ["calm"]
 *   "Headspace: Meditation & Sleep" → ["headspace"]
 *   "Learn Spanish" → [] (no clear brand, generic title)
 *
 * @param appName - Full app name/title
 * @returns Array of lowercase brand keywords
 */
export function extractBrandKeywords(appName: string): string[] {
  if (!appName || appName.trim().length === 0) {
    return [];
  }

  // Normalize: lowercase, trim
  const normalized = appName.toLowerCase().trim();

  // Split on common separators: - : | ( [ •
  const separators = /[\-:\|\(\[\•]/;
  const parts = normalized.split(separators);

  if (parts.length === 0) {
    return [];
  }

  // Take first part (before separator)
  const brandPart = parts[0].trim();

  if (brandPart.length === 0) {
    return [];
  }

  // Remove common words that indicate no brand
  const genericWords = new Set([
    'learn', 'free', 'best', 'top', 'new', 'official', 'the',
    'my', 'your', 'our', 'app', 'pro', 'plus', 'premium'
  ]);

  // Split brand part into words
  const words = brandPart
    .split(/\s+/)
    .map(w => w.replace(/[^\w]/g, '')) // Remove punctuation
    .filter(w => w.length > 0)
    .filter(w => !genericWords.has(w)); // Filter generic words

  // Take first 1-3 words as brand
  const brandWords = words.slice(0, 3);

  // If no words left after filtering, no clear brand
  if (brandWords.length === 0) {
    return [];
  }

  return brandWords;
}

/**
 * Check if combo contains any brand keywords (substring match)
 *
 * Uses substring matching to catch variations:
 *   - "duolingo" matches "duolingo spanish"
 *   - "duolingo" matches "duolingos" (typo/plural)
 *
 * @param combo - Keyword combo to check (e.g., "duolingo spanish")
 * @param brandKeywords - Brand keywords to search for (e.g., ["duolingo", "duo"])
 * @returns true if combo contains any brand keyword
 */
export function containsBrandKeyword(
  combo: string,
  brandKeywords: string[]
): boolean {
  if (!combo || !brandKeywords || brandKeywords.length === 0) {
    return false;
  }

  const lowerCombo = combo.toLowerCase();

  return brandKeywords.some(brand => {
    const lowerBrand = brand.toLowerCase();
    return lowerCombo.includes(lowerBrand);
  });
}

/**
 * Classify combo as own brand, competitor brand, or generic
 *
 * Classification logic:
 *   - If contains own brand keyword → 'brand'
 *   - Else if contains competitor brand keyword → 'competitor_brand'
 *   - Else → 'generic'
 *
 * Both 'brand' and 'competitor_brand' should be excluded from
 * generic ranking potential analysis.
 *
 * @param combo - Keyword combo to classify
 * @param ownBrandKeywords - App's own brand keywords
 * @param competitorBrandKeywords - Competitor brand keywords
 * @returns Classification: 'brand' | 'competitor_brand' | 'generic'
 */
export function classifyCombo(
  combo: string,
  ownBrandKeywords: string[],
  competitorBrandKeywords: string[]
): 'brand' | 'competitor_brand' | 'generic' {
  // Check own brand first (higher priority)
  if (containsBrandKeyword(combo, ownBrandKeywords)) {
    return 'brand';
  }

  // Check competitor brands
  if (containsBrandKeyword(combo, competitorBrandKeywords)) {
    return 'competitor_brand';
  }

  // Generic combo
  return 'generic';
}

/**
 * Filter combos to only generic (non-branded) combos
 *
 * Removes combos containing:
 *   - Own brand keywords (e.g., "duolingo spanish")
 *   - Competitor brand keywords (e.g., "babbel german")
 *
 * @param combos - Array of combo strings
 * @param ownBrandKeywords - App's own brand keywords
 * @param competitorBrandKeywords - Competitor brand keywords (optional)
 * @returns Array of generic combos only
 */
export function filterGenericCombos(
  combos: string[],
  ownBrandKeywords: string[],
  competitorBrandKeywords: string[] = []
): string[] {
  return combos.filter(combo => {
    const classification = classifyCombo(combo, ownBrandKeywords, competitorBrandKeywords);
    return classification === 'generic';
  });
}

/**
 * Get brand statistics for combos
 *
 * Useful for debugging and analysis.
 *
 * @param combos - Array of combo strings
 * @param ownBrandKeywords - App's own brand keywords
 * @param competitorBrandKeywords - Competitor brand keywords
 * @returns Stats object with counts
 */
export function getBrandStats(
  combos: string[],
  ownBrandKeywords: string[],
  competitorBrandKeywords: string[] = []
) {
  let brandCount = 0;
  let competitorBrandCount = 0;
  let genericCount = 0;

  combos.forEach(combo => {
    const classification = classifyCombo(combo, ownBrandKeywords, competitorBrandKeywords);
    if (classification === 'brand') {
      brandCount++;
    } else if (classification === 'competitor_brand') {
      competitorBrandCount++;
    } else {
      genericCount++;
    }
  });

  return {
    total: combos.length,
    brand: brandCount,
    competitorBrand: competitorBrandCount,
    generic: genericCount,
    brandRatio: combos.length > 0 ? brandCount / combos.length : 0,
    genericRatio: combos.length > 0 ? genericCount / combos.length : 0,
  };
}
