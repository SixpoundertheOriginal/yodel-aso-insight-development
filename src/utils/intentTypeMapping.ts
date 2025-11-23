/**
 * Intent Type Mapping
 *
 * Provides bidirectional mapping between:
 * - Combo Intent Types (used in UI/local reasoning): 'learning' | 'outcome' | 'brand' | 'noise'
 * - Search Intent Types (used in Phase 9 overrides): 'informational' | 'commercial' | 'transactional' | 'navigational'
 *
 * Phase 10: Resolves intent type mismatch between combo classifier and search intent system
 */

/**
 * Combo intent type (used in KeywordComboWorkbench and UI)
 */
export type ComboIntentType = 'learning' | 'outcome' | 'brand' | 'noise';

/**
 * Search intent type (used in Phase 9 intentOverrides)
 */
export type SearchIntentType = 'informational' | 'commercial' | 'transactional' | 'navigational';

/**
 * Maps combo intent type to search intent type
 *
 * Mapping logic:
 * - learning → informational (user wants to learn/discover)
 * - outcome → commercial (user seeks specific outcome/benefit)
 * - brand → navigational (user searching for specific brand)
 * - noise → informational (fallback for low-value content)
 *
 * @param comboIntent - Combo intent type
 * @returns Corresponding search intent type
 */
export function mapComboToSearchIntent(comboIntent: ComboIntentType): SearchIntentType {
  switch (comboIntent) {
    case 'learning':
      return 'informational';
    case 'outcome':
      return 'commercial';
    case 'brand':
      return 'navigational';
    case 'noise':
      return 'informational'; // Fallback
  }
}

/**
 * Maps search intent type to combo intent type
 *
 * Mapping logic:
 * - informational → learning (discovery/learning intent)
 * - commercial → outcome (outcome/benefit seeking)
 * - transactional → outcome (action-oriented, maps to outcome)
 * - navigational → brand (brand/app specific search)
 *
 * @param searchIntent - Search intent type
 * @returns Corresponding combo intent type
 */
export function mapSearchToComboIntent(searchIntent: SearchIntentType): ComboIntentType {
  switch (searchIntent) {
    case 'informational':
      return 'learning';
    case 'commercial':
      return 'outcome';
    case 'transactional':
      return 'outcome'; // Transactional maps to outcome (action-oriented)
    case 'navigational':
      return 'brand';
  }
}

/**
 * Get human-readable description of mapping
 *
 * @param comboIntent - Combo intent type
 * @returns Description of mapping logic
 */
export function getIntentMappingDescription(comboIntent: ComboIntentType): string {
  const searchIntent = mapComboToSearchIntent(comboIntent);

  const descriptions: Record<ComboIntentType, string> = {
    learning: `Maps to 'informational' - user wants to discover/learn`,
    outcome: `Maps to 'commercial' - user seeks specific outcome/benefit`,
    brand: `Maps to 'navigational' - user searching for specific brand/app`,
    noise: `Maps to 'informational' - fallback for low-value content`,
  };

  return descriptions[comboIntent];
}
