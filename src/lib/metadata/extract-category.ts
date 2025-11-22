/**
 * Category Extraction Utility
 *
 * Shared utility for extracting and normalizing app categories from metadata.
 * Used by both ASO AI Audit and Creative Intelligence modules.
 *
 * Maps iTunes/App Store categories to Creative Intelligence Registry categories.
 *
 * Enterprise Creative Intelligence Module
 */

import type { ScrapedMetadata } from '@/types/aso';

/**
 * Map of iTunes primaryGenreName to Creative Intelligence Registry categories
 *
 * iTunes categories → Registry categories:
 * - Social Networking → social networking
 * - Productivity → productivity
 * - Games → games
 * - Entertainment → entertainment
 * - Education → education (TBD: may map to productivity for now)
 * - Reference → productivity
 * - Business → productivity
 * - Utilities → productivity
 * - And so on...
 */
const CATEGORY_MAPPING: Record<string, string> = {
  // Direct matches (lowercased)
  'games': 'games',
  'productivity': 'productivity',
  'social networking': 'social networking',
  'entertainment': 'entertainment',

  // Education-related
  'education': 'education',  // Now has dedicated rubric
  'reference': 'education',  // Reference apps are educational
  'books': 'education',      // Books/reading apps are educational

  // Business/Productivity categories
  'business': 'productivity',
  'finance': 'productivity',
  'utilities': 'productivity',

  // Social/Communication categories
  'social': 'social networking',
  'photo & video': 'social networking',
  'lifestyle': 'social networking',

  // Entertainment-related
  'music': 'entertainment',
  'news': 'entertainment',
  'magazines & newspapers': 'entertainment',
  'sports': 'entertainment',
  'travel': 'entertainment',
  'food & drink': 'entertainment',
  'shopping': 'entertainment',

  // Health & Fitness
  'health & fitness': 'productivity',
  'medical': 'productivity',

  // Other
  'weather': 'productivity',
  'navigation': 'productivity',
  'graphics & design': 'productivity',
  'developer tools': 'productivity',
};

/**
 * Extract and normalize category from app metadata
 *
 * This function:
 * 1. Extracts category from iOS (primaryGenreName/applicationCategory) or Android (category)
 * 2. Normalizes to lowercase
 * 3. Maps to Creative Intelligence Registry category
 * 4. Falls back to "productivity" if no match
 *
 * @param metadata - Scraped app metadata from orchestrator
 * @returns Normalized category key for Creative Intelligence Registry
 *
 * @example
 * extractCategory({ applicationCategory: "Education" }) → "productivity"
 * extractCategory({ applicationCategory: "Games" }) → "games"
 * extractCategory({ applicationCategory: "Social Networking" }) → "social networking"
 */
export function extractCategory(metadata: ScrapedMetadata | null | undefined): string {
  if (!metadata) {
    return 'productivity'; // Fallback for null/undefined
  }

  // Priority 1: applicationCategory (from iTunes primaryGenreName)
  const rawCategory = metadata.applicationCategory || metadata.category || '';

  if (!rawCategory || rawCategory === 'Unknown') {
    return 'productivity'; // Fallback for missing/unknown
  }

  // Normalize to lowercase for lookup
  const normalized = rawCategory.toLowerCase().trim();

  // Map to registry category
  const registryCategory = CATEGORY_MAPPING[normalized];

  if (registryCategory) {
    console.log('[extractCategory] Mapped:', {
      raw: rawCategory,
      normalized,
      registry: registryCategory
    });
    return registryCategory;
  }

  // No mapping found - fallback to productivity
  console.warn('[extractCategory] No mapping found, using fallback:', {
    raw: rawCategory,
    normalized,
    fallback: 'productivity',
  });

  return 'productivity';
}

/**
 * Format category for display (capitalize)
 *
 * @example
 * formatCategoryForDisplay("social networking") → "Social Networking"
 * formatCategoryForDisplay("games") → "Games"
 */
export function formatCategoryForDisplay(category: string): string {
  return category
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get detailed category information
 *
 * Returns both raw category from metadata and mapped registry category
 */
export function getCategoryDetails(metadata: ScrapedMetadata | null | undefined): {
  raw: string;
  registry: string;
  display: string;
} {
  const raw = metadata?.applicationCategory || metadata?.category || 'Unknown';
  const registry = extractCategory(metadata);
  const display = formatCategoryForDisplay(registry);

  return { raw, registry, display };
}
