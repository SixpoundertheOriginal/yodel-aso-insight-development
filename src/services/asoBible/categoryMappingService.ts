/**
 * ============================================================================
 * Phase 2A: Category Mapping Service
 * ============================================================================
 *
 * Purpose: Deterministic mapping from iOS App Store genre IDs to ASO Bible
 * category templates.
 *
 * Strategy:
 * 1. Primary: Match by primaryGenreId (most reliable, App Store provided)
 * 2. Fallback 1: Match by genre name normalization
 * 3. Fallback 2: Default to 'category_utilities' (most generic)
 *
 * Confidence Levels:
 * - high: Exact genre ID match
 * - medium: Genre name match
 * - low: Fallback to default
 */

export interface CategoryDetectionResult {
  categoryId: string;
  categoryName: string;
  genreId: number | null;
  confidence: 'high' | 'medium' | 'low';
  source: 'genre_id' | 'genre_name' | 'fallback';
}

/**
 * iOS App Store Genre ID → Category Mapping
 *
 * Source: Apple App Store Connect API documentation
 * Reference: https://developer.apple.com/documentation/appstoreconnectapi/list_all_app_categories
 */
const IOS_GENRE_ID_MAPPING: Record<number, { categoryId: string; categoryName: string }> = {
  // Entertainment
  6016: { categoryId: 'category_entertainment', categoryName: 'Entertainment' },

  // Games
  6014: { categoryId: 'category_games', categoryName: 'Games' },

  // Education
  6017: { categoryId: 'category_education', categoryName: 'Education' },

  // Finance
  6015: { categoryId: 'category_finance', categoryName: 'Finance' },

  // Health & Fitness
  6013: { categoryId: 'category_health_fitness', categoryName: 'Health & Fitness' },

  // Lifestyle
  6012: { categoryId: 'category_lifestyle', categoryName: 'Lifestyle' },

  // Utilities
  6002: { categoryId: 'category_utilities', categoryName: 'Utilities' },

  // Social Networking
  6005: { categoryId: 'category_social_networking', categoryName: 'Social Networking' },

  // Productivity
  6007: { categoryId: 'category_productivity', categoryName: 'Productivity' },

  // Travel
  6003: { categoryId: 'category_travel', categoryName: 'Travel' },

  // Shopping
  6024: { categoryId: 'category_shopping', categoryName: 'Shopping' },

  // Photo & Video
  6008: { categoryId: 'category_photo_video', categoryName: 'Photo & Video' },

  // Music
  6011: { categoryId: 'category_music', categoryName: 'Music' },

  // News
  6009: { categoryId: 'category_news', categoryName: 'News' },
};

/**
 * Genre Name → Category Mapping (for fallback matching)
 *
 * Normalized genre names map to category IDs
 */
const GENRE_NAME_MAPPING: Record<string, { categoryId: string; categoryName: string }> = {
  // Entertainment variations
  'entertainment': { categoryId: 'category_entertainment', categoryName: 'Entertainment' },
  'media': { categoryId: 'category_entertainment', categoryName: 'Entertainment' },
  'video': { categoryId: 'category_entertainment', categoryName: 'Entertainment' },
  'streaming': { categoryId: 'category_entertainment', categoryName: 'Entertainment' },

  // Games variations
  'games': { categoryId: 'category_games', categoryName: 'Games' },
  'gaming': { categoryId: 'category_games', categoryName: 'Games' },
  'game': { categoryId: 'category_games', categoryName: 'Games' },

  // Education variations
  'education': { categoryId: 'category_education', categoryName: 'Education' },
  'educational': { categoryId: 'category_education', categoryName: 'Education' },
  'learning': { categoryId: 'category_education', categoryName: 'Education' },
  'study': { categoryId: 'category_education', categoryName: 'Education' },

  // Finance variations
  'finance': { categoryId: 'category_finance', categoryName: 'Finance' },
  'financial': { categoryId: 'category_finance', categoryName: 'Finance' },
  'banking': { categoryId: 'category_finance', categoryName: 'Finance' },
  'investment': { categoryId: 'category_finance', categoryName: 'Finance' },

  // Health & Fitness variations
  'health': { categoryId: 'category_health_fitness', categoryName: 'Health & Fitness' },
  'fitness': { categoryId: 'category_health_fitness', categoryName: 'Health & Fitness' },
  'wellness': { categoryId: 'category_health_fitness', categoryName: 'Health & Fitness' },
  'health & fitness': { categoryId: 'category_health_fitness', categoryName: 'Health & Fitness' },
  'health and fitness': { categoryId: 'category_health_fitness', categoryName: 'Health & Fitness' },

  // Lifestyle variations
  'lifestyle': { categoryId: 'category_lifestyle', categoryName: 'Lifestyle' },

  // Utilities variations
  'utilities': { categoryId: 'category_utilities', categoryName: 'Utilities' },
  'utility': { categoryId: 'category_utilities', categoryName: 'Utilities' },
  'tools': { categoryId: 'category_utilities', categoryName: 'Utilities' },

  // Social Networking variations
  'social networking': { categoryId: 'category_social_networking', categoryName: 'Social Networking' },
  'social': { categoryId: 'category_social_networking', categoryName: 'Social Networking' },
  'communication': { categoryId: 'category_social_networking', categoryName: 'Social Networking' },

  // Productivity variations
  'productivity': { categoryId: 'category_productivity', categoryName: 'Productivity' },
  'business': { categoryId: 'category_productivity', categoryName: 'Productivity' },

  // Travel variations
  'travel': { categoryId: 'category_travel', categoryName: 'Travel' },
  'navigation': { categoryId: 'category_travel', categoryName: 'Travel' },

  // Shopping variations
  'shopping': { categoryId: 'category_shopping', categoryName: 'Shopping' },
  'ecommerce': { categoryId: 'category_shopping', categoryName: 'Shopping' },
  'e-commerce': { categoryId: 'category_shopping', categoryName: 'Shopping' },
  'retail': { categoryId: 'category_shopping', categoryName: 'Shopping' },

  // Photo & Video variations
  'photo & video': { categoryId: 'category_photo_video', categoryName: 'Photo & Video' },
  'photo': { categoryId: 'category_photo_video', categoryName: 'Photo & Video' },
  'photography': { categoryId: 'category_photo_video', categoryName: 'Photo & Video' },

  // Music variations
  'music': { categoryId: 'category_music', categoryName: 'Music' },
  'audio': { categoryId: 'category_music', categoryName: 'Music' },

  // News variations
  'news': { categoryId: 'category_news', categoryName: 'News' },
  'magazines': { categoryId: 'category_news', categoryName: 'News' },
  'magazines & newspapers': { categoryId: 'category_news', categoryName: 'News' },
};

/**
 * Default fallback category
 */
const DEFAULT_CATEGORY = {
  categoryId: 'category_utilities',
  categoryName: 'Utilities',
  genreId: 6002,
};

/**
 * CategoryMappingService
 *
 * Provides deterministic category detection for ASO Bible ruleset assignment
 */
export class CategoryMappingService {
  /**
   * Detect category from app metadata
   *
   * @param primaryGenreId - iOS App Store primary genre ID
   * @param primaryGenreName - iOS App Store primary genre name (optional, for fallback)
   * @returns CategoryDetectionResult with confidence level
   */
  static detectCategory(
    primaryGenreId?: number | null,
    primaryGenreName?: string | null
  ): CategoryDetectionResult {
    // Strategy 1: Match by primaryGenreId (highest confidence)
    if (primaryGenreId && IOS_GENRE_ID_MAPPING[primaryGenreId]) {
      const match = IOS_GENRE_ID_MAPPING[primaryGenreId];
      return {
        categoryId: match.categoryId,
        categoryName: match.categoryName,
        genreId: primaryGenreId,
        confidence: 'high',
        source: 'genre_id',
      };
    }

    // Strategy 2: Match by primaryGenreName (medium confidence)
    if (primaryGenreName) {
      const normalizedName = this.normalizeGenreName(primaryGenreName);
      const match = GENRE_NAME_MAPPING[normalizedName];

      if (match) {
        return {
          categoryId: match.categoryId,
          categoryName: match.categoryName,
          genreId: primaryGenreId || null,
          confidence: 'medium',
          source: 'genre_name',
        };
      }
    }

    // Strategy 3: Fallback to default (low confidence)
    return {
      categoryId: DEFAULT_CATEGORY.categoryId,
      categoryName: DEFAULT_CATEGORY.categoryName,
      genreId: primaryGenreId || DEFAULT_CATEGORY.genreId,
      confidence: 'low',
      source: 'fallback',
    };
  }

  /**
   * Normalize genre name for matching
   *
   * @param genreName - Raw genre name from App Store
   * @returns Normalized genre name
   */
  private static normalizeGenreName(genreName: string): string {
    return genreName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s&]/g, '') // Remove special chars except & and spaces
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Get all supported categories
   *
   * @returns Array of all category mappings
   */
  static getAllCategories(): Array<{ categoryId: string; categoryName: string; genreId: number }> {
    return Object.entries(IOS_GENRE_ID_MAPPING).map(([genreId, category]) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      genreId: parseInt(genreId, 10),
    }));
  }

  /**
   * Get category by ID
   *
   * @param categoryId - Category ID (e.g., 'category_entertainment')
   * @returns Category info or null if not found
   */
  static getCategoryById(categoryId: string): { categoryName: string; genreId: number } | null {
    const entry = Object.entries(IOS_GENRE_ID_MAPPING).find(
      ([_, category]) => category.categoryId === categoryId
    );

    if (!entry) return null;

    return {
      categoryName: entry[1].categoryName,
      genreId: parseInt(entry[0], 10),
    };
  }

  /**
   * Validate category ID
   *
   * @param categoryId - Category ID to validate
   * @returns True if valid category ID
   */
  static isValidCategoryId(categoryId: string): boolean {
    return Object.values(IOS_GENRE_ID_MAPPING).some(
      (category) => category.categoryId === categoryId
    );
  }
}
