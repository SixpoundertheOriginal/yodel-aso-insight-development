/**
 * Metadata Scoring Module
 *
 * Pure TypeScript module for scoring app title and subtitle metadata.
 * Registry-driven, deterministic, reusable across features.
 */

// Main scoring service (primary export)
export { scoreMetadata } from './services/combinedMetadataScore';

// Individual scoring services (for granular use)
export { scoreTitle } from './services/titleScoringService';
export { scoreSubtitle } from './services/subtitleScoringService';

// Types
export type {
  TitleScoreResult,
  SubtitleScoreResult,
  CombinedMetadataScoreResult,
  TokenAnalysis,
  NgramAnalysis,
  MetadataScoringConfig,
  StopwordsConfig,
  SemanticRulesConfig,
  SemanticPattern
} from './types';

// Configuration access (for advanced use cases)
export {
  getMetadataScoringConfig,
  getStopwords,
  getSemanticRules,
  loadSemanticRules
} from './services/configLoader';

// Phase 2: Enhanced Combination Analysis
export { analyzeEnhancedCombinations } from './services/analyzeEnhancedCombinations';

// Phase 2: Additional Types
export type {
  ClassifiedCombo,
  ComboAnalysisEnhanced,
  OpportunityInsights,
  ComboImpactScore,
  RedundantGroup,
  RedundancyAnalysis,
  IntentType,
  TailLength
} from './types';
