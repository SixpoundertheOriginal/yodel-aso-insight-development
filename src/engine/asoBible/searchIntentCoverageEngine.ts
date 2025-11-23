/**
 * Search Intent Coverage Engine - Phase 17
 *
 * Bible-first token-level intent classification engine for Search Intent Coverage.
 * Replaces legacy autocomplete intelligence system for coverage scoring.
 *
 * Architecture:
 * - Primary Source: Intent Engine patterns (aso_intent_patterns table)
 * - Fallback Source: Minimal hardcoded defaults (when DB is empty/fails)
 * - Token-level classification (not combo-level)
 * - Coverage score: % of tokens with intent classification
 *
 * Key Differences from Phase 16 Intent Engine:
 * - Phase 16: Classifies COMBOS (keyword combinations)
 * - Phase 17: Classifies TOKENS (individual keywords)
 * - Phase 16: Used for Discovery Footprint, Combo Workbench
 * - Phase 17: Used for Search Intent Coverage score
 *
 * Integration:
 * - Uses same pattern loading as intentEngine.ts
 * - Consumed by SearchIntentCoverageCard UI component
 * - Added to metadataAuditEngine.ts audit results
 *
 * @see docs/PHASE_17_SEARCH_INTENT_COVERAGE_COMPLETE.md
 * @see src/engine/asoBible/intentEngine.ts (combo-level classification)
 */

import type { IntentPatternConfig, IntentType } from './intentEngine';

// ============================================================================
// Types
// ============================================================================

/**
 * Token intent classification result
 */
export interface TokenIntentResult {
  token: string;
  intentType: IntentType | null;
  matchedPattern: string | null;
  score: number;
}

/**
 * Intent distribution breakdown
 */
export interface IntentDistribution {
  informational: number;
  commercial: number;
  transactional: number;
  navigational: number;
  unclassified: number;
}

/**
 * Search Intent Coverage result for a single element (title or subtitle)
 */
export interface SearchIntentCoverageResult {
  /** Coverage score 0-100 (percentage of tokens with intent classification) */
  score: number;

  /** Total number of tokens analyzed */
  totalTokens: number;

  /** Number of tokens successfully classified */
  classifiedTokens: number;

  /** Number of tokens without intent classification */
  unclassifiedTokens: number;

  /** Intent distribution breakdown (counts) */
  distribution: IntentDistribution;

  /** Intent distribution percentages (0-100) */
  distributionPercentage: IntentDistribution;

  /** Tokens that were classified */
  classifiedTokensList: TokenIntentResult[];

  /** Tokens that could not be classified */
  unclassifiedTokensList: string[];

  /** Number of patterns used for classification */
  patternsUsed: number;

  /** Whether fallback patterns are being used */
  fallbackMode: boolean;
}

/**
 * Combined Search Intent Coverage for title + subtitle
 */
export interface CombinedSearchIntentCoverage {
  title: SearchIntentCoverageResult;
  subtitle: SearchIntentCoverageResult;

  /** Overall coverage score (weighted average of title + subtitle) */
  overallScore: number;

  /** Combined distribution across title + subtitle */
  combinedDistribution: IntentDistribution;

  /** Combined distribution percentages */
  combinedDistributionPercentage: IntentDistribution;
}

// ============================================================================
// Pattern Matching (Token-Level)
// ============================================================================

/**
 * Match a single token against intent patterns
 *
 * Simpler than combo matching - just checks if pattern matches the token
 * Uses same pattern configuration as Intent Engine
 *
 * @param token - Token to classify
 * @param patterns - Intent patterns from Intent Engine
 * @returns Best matching pattern and intent type, or null if no match
 */
function classifyToken(
  token: string,
  patterns: IntentPatternConfig[]
): { intentType: IntentType; matchedPattern: string; score: number } | null {
  const tokenLower = token.toLowerCase();
  let bestMatch: { intentType: IntentType; matchedPattern: string; score: number } | null = null;
  let bestScore = 0;

  for (const pattern of patterns) {
    let normalizedPattern = pattern.pattern;
    if (!pattern.caseSensitive) {
      normalizedPattern = pattern.pattern.toLowerCase();
    }

    let matches = false;

    // Handle regex vs literal matching
    if (pattern.isRegex) {
      try {
        const flags = pattern.caseSensitive ? '' : 'i';
        const regex = new RegExp(normalizedPattern, flags);
        matches = regex.test(tokenLower);
      } catch (error) {
        console.error(`[SearchIntentCoverage] Invalid regex pattern "${pattern.pattern}":`, error);
        continue;
      }
    } else {
      // Literal string matching with optional word boundary
      if (pattern.wordBoundary) {
        // Word boundary: pattern must be a complete word
        // For single tokens, this means exact match
        matches = tokenLower === normalizedPattern;
      } else {
        // Substring matching
        matches = tokenLower.includes(normalizedPattern);
      }
    }

    if (matches) {
      // Calculate score: weight * (1 + priority / 200)
      const score = pattern.weight * (1 + pattern.priority / 200);

      // Keep best match (highest score)
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          intentType: pattern.intentType,
          matchedPattern: pattern.pattern,
          score,
        };
      }
    }
  }

  return bestMatch;
}

// ============================================================================
// Coverage Computation
// ============================================================================

/**
 * Compute Search Intent Coverage for a list of tokens
 *
 * @param tokens - Array of tokens to classify (from title or subtitle)
 * @param patterns - Intent patterns from Intent Engine
 * @param fallbackMode - Whether fallback patterns are being used
 * @returns Search Intent Coverage result
 */
export function computeSearchIntentCoverage(
  tokens: string[],
  patterns: IntentPatternConfig[],
  fallbackMode: boolean = false
): SearchIntentCoverageResult {
  const totalTokens = tokens.length;

  // Initialize counters
  const distribution: IntentDistribution = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
    unclassified: 0,
  };

  const classifiedTokensList: TokenIntentResult[] = [];
  const unclassifiedTokensList: string[] = [];

  // Classify each token
  for (const token of tokens) {
    const match = classifyToken(token, patterns);

    if (match) {
      // Token was classified
      distribution[match.intentType]++;
      classifiedTokensList.push({
        token,
        intentType: match.intentType,
        matchedPattern: match.matchedPattern,
        score: match.score,
      });
    } else {
      // Token could not be classified
      distribution.unclassified++;
      unclassifiedTokensList.push(token);
    }
  }

  // Calculate coverage score (0-100)
  const classifiedTokens =
    distribution.informational +
    distribution.commercial +
    distribution.transactional +
    distribution.navigational;

  const unclassifiedTokens = distribution.unclassified;

  const score = totalTokens > 0 ? Math.round((classifiedTokens / totalTokens) * 100) : 0;

  // Calculate distribution percentages
  const distributionPercentage: IntentDistribution = {
    informational: totalTokens > 0 ? Math.round((distribution.informational / totalTokens) * 100) : 0,
    commercial: totalTokens > 0 ? Math.round((distribution.commercial / totalTokens) * 100) : 0,
    transactional: totalTokens > 0 ? Math.round((distribution.transactional / totalTokens) * 100) : 0,
    navigational: totalTokens > 0 ? Math.round((distribution.navigational / totalTokens) * 100) : 0,
    unclassified: totalTokens > 0 ? Math.round((distribution.unclassified / totalTokens) * 100) : 0,
  };

  return {
    score,
    totalTokens,
    classifiedTokens,
    unclassifiedTokens,
    distribution,
    distributionPercentage,
    classifiedTokensList,
    unclassifiedTokensList,
    patternsUsed: patterns.length,
    fallbackMode,
  };
}

/**
 * Compute combined Search Intent Coverage for title + subtitle
 *
 * Computes coverage for each element separately, then combines them
 * with weighted average (title weight: 60%, subtitle weight: 40%)
 *
 * @param titleTokens - Array of title tokens
 * @param subtitleTokens - Array of subtitle tokens
 * @param patterns - Intent patterns from Intent Engine
 * @param fallbackMode - Whether fallback patterns are being used
 * @returns Combined Search Intent Coverage result
 */
export function computeCombinedSearchIntentCoverage(
  titleTokens: string[],
  subtitleTokens: string[],
  patterns: IntentPatternConfig[],
  fallbackMode: boolean = false
): CombinedSearchIntentCoverage {
  // Compute coverage for each element
  const titleCoverage = computeSearchIntentCoverage(titleTokens, patterns, fallbackMode);
  const subtitleCoverage = computeSearchIntentCoverage(subtitleTokens, patterns, fallbackMode);

  // Compute weighted overall score (title: 60%, subtitle: 40%)
  const TITLE_WEIGHT = 0.6;
  const SUBTITLE_WEIGHT = 0.4;
  const overallScore = Math.round(
    titleCoverage.score * TITLE_WEIGHT + subtitleCoverage.score * SUBTITLE_WEIGHT
  );

  // Compute combined distribution (sum of both)
  const combinedDistribution: IntentDistribution = {
    informational: titleCoverage.distribution.informational + subtitleCoverage.distribution.informational,
    commercial: titleCoverage.distribution.commercial + subtitleCoverage.distribution.commercial,
    transactional: titleCoverage.distribution.transactional + subtitleCoverage.distribution.transactional,
    navigational: titleCoverage.distribution.navigational + subtitleCoverage.distribution.navigational,
    unclassified: titleCoverage.distribution.unclassified + subtitleCoverage.distribution.unclassified,
  };

  // Calculate combined distribution percentages
  const totalCombinedTokens = titleTokens.length + subtitleTokens.length;
  const combinedDistributionPercentage: IntentDistribution = {
    informational:
      totalCombinedTokens > 0
        ? Math.round((combinedDistribution.informational / totalCombinedTokens) * 100)
        : 0,
    commercial:
      totalCombinedTokens > 0
        ? Math.round((combinedDistribution.commercial / totalCombinedTokens) * 100)
        : 0,
    transactional:
      totalCombinedTokens > 0
        ? Math.round((combinedDistribution.transactional / totalCombinedTokens) * 100)
        : 0,
    navigational:
      totalCombinedTokens > 0
        ? Math.round((combinedDistribution.navigational / totalCombinedTokens) * 100)
        : 0,
    unclassified:
      totalCombinedTokens > 0
        ? Math.round((combinedDistribution.unclassified / totalCombinedTokens) * 100)
        : 0,
  };

  return {
    title: titleCoverage,
    subtitle: subtitleCoverage,
    overallScore,
    combinedDistribution,
    combinedDistributionPercentage,
  };
}

// ============================================================================
// Dominant Intent Detection
// ============================================================================

/**
 * Get dominant intent type from distribution
 *
 * @param distribution - Intent distribution
 * @returns Dominant intent type, or null if no intents classified
 */
export function getDominantIntent(distribution: IntentDistribution): IntentType | null {
  const intents: Array<{ type: IntentType; count: number }> = [
    { type: 'informational', count: distribution.informational },
    { type: 'commercial', count: distribution.commercial },
    { type: 'transactional', count: distribution.transactional },
    { type: 'navigational', count: distribution.navigational },
  ];

  // Sort by count (descending)
  intents.sort((a, b) => b.count - a.count);

  // Return dominant intent (highest count)
  return intents[0].count > 0 ? intents[0].type : null;
}

// ============================================================================
// Coverage Assessment
// ============================================================================

/**
 * Get coverage assessment label and message
 *
 * @param score - Coverage score (0-100)
 * @returns Assessment with label and message
 */
export function getCoverageAssessment(score: number): {
  label: string;
  message: string;
  color: string;
} {
  if (score >= 80) {
    return {
      label: 'EXCELLENT',
      message: 'Strong search intent coverage across all metadata elements.',
      color: 'emerald',
    };
  }

  if (score >= 60) {
    return {
      label: 'GOOD',
      message: 'Solid search intent coverage with room for improvement.',
      color: 'blue',
    };
  }

  if (score >= 40) {
    return {
      label: 'MODERATE',
      message: 'Limited search intent coverage. Consider adding more intent-driven keywords.',
      color: 'yellow',
    };
  }

  if (score >= 20) {
    return {
      label: 'LOW',
      message: 'Weak search intent coverage. Metadata lacks clear intent signals.',
      color: 'orange',
    };
  }

  return {
    label: 'VERY LOW',
    message: 'Minimal search intent coverage. Metadata needs significant intent optimization.',
    color: 'red',
  };
}
