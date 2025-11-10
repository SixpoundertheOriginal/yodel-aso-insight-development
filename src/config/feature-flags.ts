/**
 * FEATURE FLAGS
 *
 * Central configuration for feature toggles across the application.
 * Enables gradual rollout and safe rollback of new features.
 */

export const FEATURE_FLAGS = {
  /**
   * Use semantic insights system for competitor analysis
   * - true: Use new semantic NLP engines (Phase 2-3)
   * - false: Use legacy literal keyword extraction
   */
  USE_SEMANTIC_INSIGHTS: import.meta.env.VITE_USE_SEMANTIC_INSIGHTS === 'true' || true, // Default: enabled

  /**
   * Fallback to legacy system if semantic fails
   */
  USE_LEGACY_INSIGHTS_FALLBACK: true,

  /**
   * Show both semantic and legacy insights in UI (for comparison)
   */
  SHOW_LEGACY_COMPARISON: false,
};

/**
 * Feature flag helpers
 */
export const isSemanticInsightsEnabled = (): boolean => {
  return FEATURE_FLAGS.USE_SEMANTIC_INSIGHTS;
};

export const shouldFallbackToLegacy = (): boolean => {
  return FEATURE_FLAGS.USE_LEGACY_INSIGHTS_FALLBACK;
};
