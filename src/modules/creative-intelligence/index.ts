/**
 * Creative Intelligence Module
 *
 * Main entry point for the Creative Intelligence system.
 * Handles screenshot analysis, creative insights, competitor comparison,
 * and creative strategy generation.
 *
 * Phase 0: Infrastructure scaffolding (21.11.2025)
 */

// Types
export * from './types';

// Services
export * from './services/creativeFetch.service';
export * from './services/creativeAnalysis.service';
export * from './services/creativeStorage.service';

// Components (will be exported after creation)
// export * from './components';

// Hooks (will be exported after creation)
// export * from './hooks';

/**
 * Module metadata
 */
export const CREATIVE_INTELLIGENCE_MODULE = {
  name: 'Creative Intelligence',
  version: '0.1.0',
  phase: 0,
  description: 'Screenshot analysis, creative insights, and creative strategy generation',
  features: {
    screenshotScraping: { enabled: false, phase: 1 },
    ocrExtraction: { enabled: false, phase: 2 },
    themeClassification: { enabled: false, phase: 3 },
    elementDetection: { enabled: false, phase: 3 },
    competitorComparison: { enabled: false, phase: 2 },
    historicalDiffing: { enabled: false, phase: 3 },
    aiInsights: { enabled: false, phase: 4 },
    strategyBuilder: { enabled: false, phase: 5 },
  },
} as const;
