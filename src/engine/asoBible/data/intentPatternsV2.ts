/**
 * Intent Patterns V2 - New Intent Types
 *
 * Phase 1: Intent System V2
 * Adds category and feature intent patterns (10-15 generic patterns each)
 *
 * These are generic cross-vertical patterns for v2.0 launch
 * v2.1 will add vertical-specific patterns via database
 */

import type { IntentPatternConfig } from '../intentEngine';

// ============================================================================
// CATEGORY INTENT PATTERNS (Generic)
// ============================================================================

/**
 * Category intent: User searches for app type/category
 * Examples: "language learning app", "finance app", "meditation app"
 *
 * Generic patterns that work across verticals
 */
export const CATEGORY_INTENT_PATTERNS: IntentPatternConfig[] = [
  // App type patterns
  {
    pattern: '\\bapp\\b',
    intentType: 'category',
    weight: 1.5,
    priority: 120,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'language learning app'
  },
  {
    pattern: '\\bapplication\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 110,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'finance application'
  },
  {
    pattern: '\\bplatform\\b',
    intentType: 'category',
    weight: 1.2,
    priority: 100,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'learning platform'
  },
  {
    pattern: '\\btool\\b',
    intentType: 'category',
    weight: 1.2,
    priority: 100,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'productivity tool'
  },
  {
    pattern: '\\bsoftware\\b',
    intentType: 'category',
    weight: 1.1,
    priority: 90,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'finance software'
  },

  // Category-defining action phrases
  {
    pattern: '\\bfor\\s+(learning|studying|practice|training)\\b',
    intentType: 'category',
    weight: 1.4,
    priority: 115,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: false,
    example: 'app for learning languages'
  },
  {
    pattern: '\\bto\\s+(learn|study|practice|manage|track)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 110,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: false,
    example: 'app to learn spanish'
  },

  // Vertical indicators (generic)
  {
    pattern: '\\b(education|educational)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'educational app'
  },
  {
    pattern: '\\b(finance|financial)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'finance app'
  },
  {
    pattern: '\\b(health|fitness|wellness)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'health app'
  },
  {
    pattern: '\\b(productivity|organization)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'productivity app'
  },
  {
    pattern: '\\b(game|gaming|entertainment)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'gaming app'
  },
  {
    pattern: '\\b(dating|social)\\b',
    intentType: 'category',
    weight: 1.3,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'dating app'
  }
];

// ============================================================================
// FEATURE INTENT PATTERNS (Generic)
// ============================================================================

/**
 * Feature intent: User searches for specific app features
 * Examples: "offline mode", "voice recognition", "dark mode"
 *
 * Generic cross-vertical feature patterns
 */
export const FEATURE_INTENT_PATTERNS: IntentPatternConfig[] = [
  // Common features across verticals
  {
    pattern: '\\b(offline|without internet)\\b',
    intentType: 'feature',
    weight: 1.5,
    priority: 120,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'offline mode'
  },
  {
    pattern: '\\b(voice|speech)\\b',
    intentType: 'feature',
    weight: 1.4,
    priority: 115,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'voice recognition'
  },
  {
    pattern: '\\b(dark mode|night mode)\\b',
    intentType: 'feature',
    weight: 1.3,
    priority: 110,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: false,
    example: 'dark mode'
  },
  {
    pattern: '\\b(sync|cloud)\\b',
    intentType: 'feature',
    weight: 1.4,
    priority: 115,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'cloud sync'
  },
  {
    pattern: '\\b(notification|reminder|alert)\\b',
    intentType: 'feature',
    weight: 1.3,
    priority: 110,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'notification'
  },
  {
    pattern: '\\b(tracking|monitor)\\b',
    intentType: 'feature',
    weight: 1.4,
    priority: 115,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'progress tracking'
  },
  {
    pattern: '\\b(custom|personalized)\\b',
    intentType: 'feature',
    weight: 1.3,
    priority: 110,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'personalized lessons'
  },
  {
    pattern: '\\b(real-time|live|instant)\\b',
    intentType: 'feature',
    weight: 1.4,
    priority: 115,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'real-time updates'
  },
  {
    pattern: '\\b(widget|extension)\\b',
    intentType: 'feature',
    weight: 1.2,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'home screen widget'
  },
  {
    pattern: '\\b(AI|smart|intelligent)\\b',
    intentType: 'feature',
    weight: 1.5,
    priority: 120,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'AI-powered'
  },
  {
    pattern: '\\b(share|export|import)\\b',
    intentType: 'feature',
    weight: 1.2,
    priority: 105,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'export data'
  },
  {
    pattern: '\\b(search|find)\\b',
    intentType: 'feature',
    weight: 1.1,
    priority: 100,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'search function'
  },
  {
    pattern: '\\b(video|audio|multimedia)\\b',
    intentType: 'feature',
    weight: 1.3,
    priority: 110,
    isRegex: true,
    caseSensitive: false,
    wordBoundary: true,
    example: 'video lessons'
  }
];

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get all v2.0 intent patterns (category + feature)
 */
export function getIntentPatternsV2(): IntentPatternConfig[] {
  return [...CATEGORY_INTENT_PATTERNS, ...FEATURE_INTENT_PATTERNS];
}

/**
 * Get pattern counts
 */
export function getIntentPatternCounts() {
  return {
    category: CATEGORY_INTENT_PATTERNS.length,
    feature: FEATURE_INTENT_PATTERNS.length,
    total: CATEGORY_INTENT_PATTERNS.length + FEATURE_INTENT_PATTERNS.length
  };
}
