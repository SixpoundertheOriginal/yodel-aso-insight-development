/**
 * Configuration Loader Service
 *
 * Loads and caches JSON configuration files.
 */

import type {
  MetadataScoringConfig,
  StopwordsConfig,
  SemanticRulesConfig
} from '../types';

// Import JSON files directly (Vite will handle these)
import metadataScoringConfig from '../registry/metadata_scoring.json';
import stopwordsConfig from '../registry/stopwords.json';
import semanticRulesConfig from '../registry/semantic_rules.json';

/**
 * Gets the metadata scoring configuration
 *
 * @returns MetadataScoringConfig
 */
export function getMetadataScoringConfig(): MetadataScoringConfig {
  return metadataScoringConfig as MetadataScoringConfig;
}

/**
 * Gets the stopwords as a Set for efficient lookup
 *
 * @returns Set of stopwords
 */
export function getStopwords(): Set<string> {
  const config = stopwordsConfig as StopwordsConfig;
  return new Set(config.stopwords);
}

/**
 * Gets the semantic rules configuration
 *
 * @returns SemanticRulesConfig
 */
export function getSemanticRules(): SemanticRulesConfig {
  return semanticRulesConfig as SemanticRulesConfig;
}

/**
 * Loads semantic rules for a specific category
 *
 * Currently returns the default language_learning category rules.
 * Future: Could dynamically load category-specific configs for different verticals
 * (fitness, ride-hailing, finance, etc.)
 *
 * @param category - Optional category identifier (e.g., "language_learning", "fitness")
 * @returns SemanticRulesConfig for the specified category
 */
export function loadSemanticRules(category?: string): SemanticRulesConfig {
  // For now, return the single config (language_learning)
  // Future enhancement: load category-specific JSON files dynamically
  return semanticRulesConfig as SemanticRulesConfig;
}
