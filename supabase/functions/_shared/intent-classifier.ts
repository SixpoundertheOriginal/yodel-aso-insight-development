/**
 * Intent Classification Engine for Edge Functions
 *
 * Classifies keywords/combos into search intent types.
 * Simplified version for Deno environment with embedded patterns.
 *
 * Phase 2: ASO Bible Integration - Intent Engine
 */

export type IntentType = 'informational' | 'commercial' | 'transactional' | 'navigational';

export interface IntentPattern {
  pattern: string;
  intentType: IntentType;
  weight: number; // 0.1-3.0
  priority: number; // Higher = checked first
  isRegex: boolean;
}

export interface TokenIntentResult {
  token: string;
  dominantIntent: IntentType | null;
  intentScores: Record<IntentType, number>;
  matchedPatterns: string[];
}

export interface IntentCoverage {
  titleIntent?: {
    informational: number;
    commercial: number;
    transactional: number;
    navigational: number;
  };
  subtitleIntent?: {
    informational: number;
    commercial: number;
    transactional: number;
    navigational: number;
  };
  coverageScore: number; // 0-100
  diagnostics: {
    fallbackMode: boolean;
    patternCount: number;
    classifiedTokens: number;
  };
}

// ============================================================================
// Base Intent Patterns (Bible-compatible)
// ============================================================================

const BASE_INTENT_PATTERNS: IntentPattern[] = [
  // ========== INFORMATIONAL (Learning/Discovery) ==========
  { pattern: 'learn', intentType: 'informational', weight: 1.3, priority: 110, isRegex: false },
  { pattern: 'practice', intentType: 'informational', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'study', intentType: 'informational', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'how to', intentType: 'informational', weight: 1.4, priority: 115, isRegex: false },
  { pattern: 'guide', intentType: 'informational', weight: 1.1, priority: 100, isRegex: false },
  { pattern: 'tutorial', intentType: 'informational', weight: 1.1, priority: 100, isRegex: false },
  { pattern: 'course', intentType: 'informational', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'lesson', intentType: 'informational', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'training', intentType: 'informational', weight: 1.1, priority: 100, isRegex: false },
  { pattern: 'education', intentType: 'informational', weight: 1.1, priority: 100, isRegex: false },
  { pattern: 'discover', intentType: 'informational', weight: 1.0, priority: 95, isRegex: false },
  { pattern: 'explore', intentType: 'informational', weight: 1.0, priority: 95, isRegex: false },
  { pattern: 'understand', intentType: 'informational', weight: 1.0, priority: 95, isRegex: false },

  // ========== COMMERCIAL (Comparison/Evaluation) ==========
  { pattern: 'best', intentType: 'commercial', weight: 1.5, priority: 120, isRegex: false },
  { pattern: 'top', intentType: 'commercial', weight: 1.4, priority: 115, isRegex: false },
  { pattern: 'compare', intentType: 'commercial', weight: 1.3, priority: 110, isRegex: false },
  { pattern: 'vs', intentType: 'commercial', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'versus', intentType: 'commercial', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'review', intentType: 'commercial', weight: 1.3, priority: 110, isRegex: false },
  { pattern: 'rating', intentType: 'commercial', weight: 1.1, priority: 100, isRegex: false },
  { pattern: 'popular', intentType: 'commercial', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'leading', intentType: 'commercial', weight: 1.1, priority: 100, isRegex: false },
  { pattern: 'trusted', intentType: 'commercial', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'recommend', intentType: 'commercial', weight: 1.2, priority: 105, isRegex: false },
  { pattern: 'award', intentType: 'commercial', weight: 1.1, priority: 100, isRegex: false },

  // ========== TRANSACTIONAL (Download/Action) ==========
  { pattern: 'download', intentType: 'transactional', weight: 2.0, priority: 150, isRegex: false },
  { pattern: 'free', intentType: 'transactional', weight: 1.8, priority: 140, isRegex: false },
  { pattern: 'get', intentType: 'transactional', weight: 1.5, priority: 130, isRegex: false },
  { pattern: 'install', intentType: 'transactional', weight: 1.9, priority: 145, isRegex: false },
  { pattern: 'try', intentType: 'transactional', weight: 1.6, priority: 135, isRegex: false },
  { pattern: 'start', intentType: 'transactional', weight: 1.5, priority: 130, isRegex: false },
  { pattern: 'join', intentType: 'transactional', weight: 1.4, priority: 125, isRegex: false },
  { pattern: 'signup', intentType: 'transactional', weight: 1.7, priority: 138, isRegex: false },
  { pattern: 'sign up', intentType: 'transactional', weight: 1.7, priority: 138, isRegex: false },
  { pattern: 'unlock', intentType: 'transactional', weight: 1.5, priority: 130, isRegex: false },
  { pattern: 'access', intentType: 'transactional', weight: 1.4, priority: 125, isRegex: false },
  { pattern: 'premium', intentType: 'transactional', weight: 1.3, priority: 120, isRegex: false },
  { pattern: 'pro', intentType: 'transactional', weight: 1.2, priority: 115, isRegex: false },

  // ========== NAVIGATIONAL (Brand/App Name) ==========
  { pattern: 'app', intentType: 'navigational', weight: 1.0, priority: 60, isRegex: false },
  { pattern: 'official', intentType: 'navigational', weight: 1.2, priority: 70, isRegex: false },
  { pattern: 'mobile', intentType: 'navigational', weight: 0.8, priority: 50, isRegex: false },
  { pattern: 'version', intentType: 'navigational', weight: 0.9, priority: 55, isRegex: false },
  { pattern: 'platform', intentType: 'navigational', weight: 0.8, priority: 50, isRegex: false },
];

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify a single token/keyword
 */
export function classifyToken(token: string, patterns: IntentPattern[] = BASE_INTENT_PATTERNS): TokenIntentResult {
  const lowerToken = token.toLowerCase();
  const intentScores: Record<IntentType, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };
  const matchedPatterns: string[] = [];

  // Sort patterns by priority (highest first)
  const sortedPatterns = [...patterns].sort((a, b) => b.priority - a.priority);

  for (const pattern of sortedPatterns) {
    const patternLower = pattern.pattern.toLowerCase();
    let matches = false;

    if (pattern.isRegex) {
      try {
        const regex = new RegExp(pattern.pattern, 'i');
        matches = regex.test(token);
      } catch (e) {
        console.warn(`[INTENT] Invalid regex pattern: ${pattern.pattern}`);
        continue;
      }
    } else {
      // Simple substring match
      matches = lowerToken.includes(patternLower) || patternLower.includes(lowerToken);
    }

    if (matches) {
      intentScores[pattern.intentType] += pattern.weight;
      matchedPatterns.push(pattern.pattern);
    }
  }

  // Determine dominant intent
  let dominantIntent: IntentType | null = null;
  let maxScore = 0;
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantIntent = intent as IntentType;
    }
  }

  return {
    token,
    dominantIntent,
    intentScores,
    matchedPatterns,
  };
}

/**
 * Classify multiple tokens and aggregate intent distribution
 */
export function classifyTokens(tokens: string[], patterns: IntentPattern[] = BASE_INTENT_PATTERNS): {
  distribution: Record<IntentType, number>;
  classifiedCount: number;
  tokenResults: TokenIntentResult[];
} {
  const distribution: Record<IntentType, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };

  const tokenResults: TokenIntentResult[] = [];
  let classifiedCount = 0;

  for (const token of tokens) {
    const result = classifyToken(token, patterns);
    tokenResults.push(result);

    if (result.dominantIntent) {
      distribution[result.dominantIntent]++;
      classifiedCount++;
    }
  }

  return {
    distribution,
    classifiedCount,
    tokenResults,
  };
}

/**
 * Calculate coverage score from intent distribution
 */
export function calculateCoverageScore(distribution: Record<IntentType, number>): number {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  // Balanced distribution scores higher
  const informationalRatio = distribution.informational / total;
  const commercialRatio = distribution.commercial / total;
  const transactionalRatio = distribution.transactional / total;
  const navigationalRatio = distribution.navigational / total;

  // Ideal distribution: 40% informational, 30% commercial, 20% transactional, 10% navigational
  const idealScore =
    Math.min(informationalRatio / 0.4, 1) * 40 +
    Math.min(commercialRatio / 0.3, 1) * 30 +
    Math.min(transactionalRatio / 0.2, 1) * 20 +
    Math.min(navigationalRatio / 0.1, 1) * 10;

  return Math.round(idealScore);
}

/**
 * Classify title and subtitle for complete coverage
 */
export function classifyMetadataIntent(
  titleTokens: string[],
  subtitleTokens: string[]
): IntentCoverage {
  const titleClassification = classifyTokens(titleTokens);
  const subtitleClassification = classifyTokens(subtitleTokens);

  // Normalize distributions to percentages
  const titleTotal = Object.values(titleClassification.distribution).reduce((sum, count) => sum + count, 0);
  const subtitleTotal = Object.values(subtitleClassification.distribution).reduce((sum, count) => sum + count, 0);

  const titleIntent = {
    informational: titleTotal > 0 ? Math.round((titleClassification.distribution.informational / titleTotal) * 100) : 0,
    commercial: titleTotal > 0 ? Math.round((titleClassification.distribution.commercial / titleTotal) * 100) : 0,
    transactional: titleTotal > 0 ? Math.round((titleClassification.distribution.transactional / titleTotal) * 100) : 0,
    navigational: titleTotal > 0 ? Math.round((titleClassification.distribution.navigational / titleTotal) * 100) : 0,
  };

  const subtitleIntent = {
    informational: subtitleTotal > 0 ? Math.round((subtitleClassification.distribution.informational / subtitleTotal) * 100) : 0,
    commercial: subtitleTotal > 0 ? Math.round((subtitleClassification.distribution.commercial / subtitleTotal) * 100) : 0,
    transactional: subtitleTotal > 0 ? Math.round((subtitleClassification.distribution.transactional / subtitleTotal) * 100) : 0,
    navigational: subtitleTotal > 0 ? Math.round((subtitleClassification.distribution.navigational / subtitleTotal) * 100) : 0,
  };

  // Combined coverage score
  const combinedDistribution: Record<IntentType, number> = {
    informational: titleClassification.distribution.informational + subtitleClassification.distribution.informational,
    commercial: titleClassification.distribution.commercial + subtitleClassification.distribution.commercial,
    transactional: titleClassification.distribution.transactional + subtitleClassification.distribution.transactional,
    navigational: titleClassification.distribution.navigational + subtitleClassification.distribution.navigational,
  };

  const coverageScore = calculateCoverageScore(combinedDistribution);

  return {
    titleIntent,
    subtitleIntent,
    coverageScore,
    diagnostics: {
      fallbackMode: true, // Always true for embedded patterns
      patternCount: BASE_INTENT_PATTERNS.length,
      classifiedTokens: titleClassification.classifiedCount + subtitleClassification.classifiedCount,
    },
  };
}
