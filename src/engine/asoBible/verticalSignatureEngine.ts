/**
 * Vertical Signature Engine
 *
 * Automatically detects the vertical (category) for an app based on:
 * - App Store category
 * - Title/subtitle content analysis
 * - Keyword signatures
 *
 * Phase 8: Placeholder logic (simple category mapping)
 * Future: ML-based classification, confidence scoring
 */

import type { VerticalDetectionResult, VerticalProfile } from './ruleset.types';
import { VERTICAL_PROFILES, getAllVerticals, getVerticalsByCategory } from './verticalProfiles';

// ============================================================================
// Metadata Interface (Simplified)
// ============================================================================

interface AppMetadata {
  category?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

// ============================================================================
// Vertical Detection
// ============================================================================

/**
 * Detect vertical for an app based on metadata
 *
 * @param appMetadata - App metadata (category, title, subtitle)
 * @returns Vertical detection result with confidence score
 */
export function detectVertical(appMetadata: AppMetadata): VerticalDetectionResult {
  const matchedSignals: string[] = [];
  let bestMatch: VerticalProfile = VERTICAL_PROFILES.base;
  let confidence = 0.5; // Default confidence for base vertical

  // Step 1: Category-based detection (highest priority)
  if (appMetadata.category) {
    const categoryMatches = getVerticalsByCategory(appMetadata.category);

    if (categoryMatches.length > 0) {
      // If multiple verticals match the same category, use keyword refinement
      if (categoryMatches.length === 1) {
        bestMatch = categoryMatches[0];
        confidence = 0.9;
        matchedSignals.push(`category:${appMetadata.category}`);
      } else {
        // Refine with keyword analysis
        const refinedMatch = refineWithKeywords(categoryMatches, appMetadata);
        if (refinedMatch) {
          bestMatch = refinedMatch.vertical;
          confidence = refinedMatch.confidence;
          matchedSignals.push(`category:${appMetadata.category}`, ...refinedMatch.signals);
        } else {
          // Default to first match if no keyword refinement
          bestMatch = categoryMatches[0];
          confidence = 0.7;
          matchedSignals.push(`category:${appMetadata.category}`);
        }
      }
    }
  }

  // Step 2: Keyword-based detection (fallback if no category match)
  if (confidence < 0.7) {
    const keywordMatch = detectByKeywords(appMetadata);
    if (keywordMatch && keywordMatch.confidence > confidence) {
      bestMatch = keywordMatch.vertical;
      confidence = keywordMatch.confidence;
      matchedSignals.push(...keywordMatch.signals);
    }
  }

  return {
    verticalId: bestMatch.id,
    confidence,
    matchedSignals,
    vertical: bestMatch,
  };
}

// ============================================================================
// Keyword-Based Detection
// ============================================================================

function detectByKeywords(appMetadata: AppMetadata): {
  vertical: VerticalProfile;
  confidence: number;
  signals: string[];
} | null {
  const text = [
    appMetadata.title || '',
    appMetadata.subtitle || '',
  ].join(' ').toLowerCase();

  const verticals = getAllVerticals().filter((v) => v.id !== 'base');
  const scores: Array<{
    vertical: VerticalProfile;
    score: number;
    matchedKeywords: string[];
  }> = [];

  for (const vertical of verticals) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of vertical.keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      if (regex.test(text)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      scores.push({ vertical, score, matchedKeywords });
    }
  }

  if (scores.length === 0) {
    return null;
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const confidence = Math.min(0.8, 0.4 + (best.score * 0.1)); // Max 0.8 for keyword-only

  return {
    vertical: best.vertical,
    confidence,
    signals: best.matchedKeywords.map((k) => `keyword:${k}`),
  };
}

// ============================================================================
// Keyword Refinement for Ambiguous Categories
// ============================================================================

function refineWithKeywords(
  candidates: VerticalProfile[],
  appMetadata: AppMetadata
): {
  vertical: VerticalProfile;
  confidence: number;
  signals: string[];
} | null {
  const text = [
    appMetadata.title || '',
    appMetadata.subtitle || '',
  ].join(' ').toLowerCase();

  const scores: Array<{
    vertical: VerticalProfile;
    score: number;
    matchedKeywords: string[];
  }> = [];

  for (const vertical of candidates) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of vertical.keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      if (regex.test(text)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    scores.push({ vertical, score, matchedKeywords });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];

  if (best.score === 0) {
    return null;
  }

  const confidence = Math.min(0.85, 0.6 + (best.score * 0.05));

  return {
    vertical: best.vertical,
    confidence,
    signals: best.matchedKeywords.map((k) => `keyword:${k}`),
  };
}

// ============================================================================
// Helper: Map Category to Vertical (Simple Mapping)
// ============================================================================

/**
 * Simple category → vertical mapping (deterministic)
 * Used as fallback if keyword detection fails
 *
 * @param category - App Store category
 * @returns Vertical ID or 'base' if no match
 */
export function mapCategoryToVertical(category: string): string {
  const matches = getVerticalsByCategory(category);

  if (matches.length === 0) {
    return 'base';
  }

  // If multiple matches, return first (requires refinement)
  return matches[0].id;
}

// ============================================================================
// Export for Testing
// ============================================================================

export { detectByKeywords, refineWithKeywords };
