/**
 * Transactional Safety Detector
 *
 * Phase 1: Intent V2 - Transactional Safety Logic
 * Classifies transactional keywords as "safe" or "risky"
 *
 * Safe: Soft CTAs allowed by Apple ("try", "start", "get")
 * Risky: Hard CTAs that may trigger penalties ("free", "download", "install")
 */

import {
  SAFE_TRANSACTIONAL_KEYWORDS,
  RISKY_TRANSACTIONAL_KEYWORDS,
  getTransactionalSafety as getKeywordSafety,
  getRiskFlags as getKeywordRiskFlags
} from '@/engine/metadata/data/transactional-keywords';
import type { TransactionalSafety } from '@/types/auditV2';

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionalSafetyResult {
  safety: TransactionalSafety;
  riskFlags: string[];
  safeKeywords: string[];
  riskyKeywords: string[];
  confidence: number; // 0-1 (how confident we are in the classification)
}

// ============================================================================
// DETECTION LOGIC
// ============================================================================

/**
 * Detect transactional safety for a text (token or combo)
 *
 * Algorithm:
 * 1. Check for risky keywords first (high priority)
 * 2. If risky found → classify as "risky"
 * 3. If no risky but safe found → classify as "safe"
 * 4. If neither found → return null (not transactional or unclassified)
 *
 * @param text - Text to analyze (token or combo)
 * @returns Safety classification with details
 */
export function detectTransactionalSafety(text: string): TransactionalSafetyResult {
  const normalized = text.toLowerCase().trim();
  const riskFlags: string[] = [];
  const safeKeywords: string[] = [];
  const riskyKeywords: string[] = [];

  // Check for risky keywords
  for (const risky of RISKY_TRANSACTIONAL_KEYWORDS) {
    if (normalized.includes(risky.toLowerCase())) {
      riskyKeywords.push(risky);
      riskFlags.push(risky);
    }
  }

  // Check for safe keywords
  for (const safe of SAFE_TRANSACTIONAL_KEYWORDS) {
    if (normalized.includes(safe.toLowerCase())) {
      safeKeywords.push(safe);
    }
  }

  // Determine safety classification
  let safety: TransactionalSafety = null;
  let confidence = 0;

  if (riskyKeywords.length > 0) {
    // Has risky keywords → classify as risky
    safety = 'risky';
    confidence = Math.min(1.0, 0.7 + (riskyKeywords.length * 0.1));
  } else if (safeKeywords.length > 0) {
    // No risky but has safe → classify as safe
    safety = 'safe';
    confidence = Math.min(1.0, 0.6 + (safeKeywords.length * 0.1));
  } else {
    // No transactional keywords detected
    safety = null;
    confidence = 0;
  }

  return {
    safety,
    riskFlags,
    safeKeywords,
    riskyKeywords,
    confidence
  };
}

/**
 * Check if text contains risky transactional keywords
 * Quick helper for boolean checks
 */
export function hasRiskyKeywords(text: string): boolean {
  return detectTransactionalSafety(text).safety === 'risky';
}

/**
 * Check if text contains safe transactional keywords
 * Quick helper for boolean checks
 */
export function hasSafeKeywords(text: string): boolean {
  return detectTransactionalSafety(text).safety === 'safe';
}

/**
 * Get risk score (0-100) for text
 * Higher score = more risky
 */
export function getRiskScore(text: string): number {
  const result = detectTransactionalSafety(text);

  if (result.safety === 'risky') {
    // Risky score based on number of risky keywords
    return Math.min(100, 60 + (result.riskyKeywords.length * 20));
  } else if (result.safety === 'safe') {
    // Safe transactional = low risk
    return 10;
  } else {
    // No transactional keywords = neutral
    return 0;
  }
}

/**
 * Get safety score (0-100) for text
 * Higher score = safer
 */
export function getSafetyScore(text: string): number {
  const result = detectTransactionalSafety(text);

  if (result.safety === 'safe') {
    // Safe score based on number of safe keywords
    return Math.min(100, 70 + (result.safeKeywords.length * 10));
  } else if (result.safety === 'risky') {
    // Risky transactional = low safety
    return 20;
  } else {
    // No transactional keywords = neutral (neither safe nor risky)
    return 50;
  }
}

// ============================================================================
// BATCH ANALYSIS
// ============================================================================

/**
 * Analyze transactional safety for multiple texts
 * Returns aggregated statistics
 */
export interface TransactionalSafetyStats {
  totalTexts: number;
  safeCount: number;
  riskyCount: number;
  unclassifiedCount: number;
  safePercentage: number;
  riskyPercentage: number;
  totalRiskFlags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export function analyzeTransactionalSafety(texts: string[]): TransactionalSafetyStats {
  let safeCount = 0;
  let riskyCount = 0;
  let unclassifiedCount = 0;
  const allRiskFlags: string[] = [];

  for (const text of texts) {
    const result = detectTransactionalSafety(text);

    if (result.safety === 'safe') {
      safeCount++;
    } else if (result.safety === 'risky') {
      riskyCount++;
      allRiskFlags.push(...result.riskFlags);
    } else {
      unclassifiedCount++;
    }
  }

  const totalTexts = texts.length;
  const transactionalTotal = safeCount + riskyCount;
  const safePercentage = transactionalTotal > 0 ? (safeCount / transactionalTotal) * 100 : 0;
  const riskyPercentage = transactionalTotal > 0 ? (riskyCount / transactionalTotal) * 100 : 0;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (riskyPercentage > 50) {
    riskLevel = 'critical';
  } else if (riskyPercentage > 30) {
    riskLevel = 'high';
  } else if (riskyPercentage > 15) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    totalTexts,
    safeCount,
    riskyCount,
    unclassifiedCount,
    safePercentage,
    riskyPercentage,
    totalRiskFlags: [...new Set(allRiskFlags)], // Deduplicate
    riskLevel
  };
}

// ============================================================================
// INTENT INTEGRATION (FOR COMBO CLASSIFICATION)
// ============================================================================

/**
 * Enhance combo intent classification with transactional safety
 * This is called after basic intent classification
 */
export interface EnhancedComboIntentClassification {
  combo: string;
  dominantIntent: string;
  intentScores: Record<string, number>;
  matchedPatterns: string[];
  // v2.0: Transactional safety fields
  transactionalSafety?: TransactionalSafety;
  riskFlags?: string[];
  safetyConfidence?: number;
}

export function enhanceWithTransactionalSafety(
  baseClassification: {
    combo: string;
    dominantIntent: string;
    intentScores: Record<string, number>;
    matchedPatterns: string[];
  }
): EnhancedComboIntentClassification {
  // Only analyze if dominant intent is transactional
  if (baseClassification.dominantIntent !== 'transactional' &&
      (baseClassification.intentScores['transactional'] || 0) === 0) {
    // Not transactional → no safety analysis needed
    return {
      ...baseClassification,
      transactionalSafety: null,
      riskFlags: [],
      safetyConfidence: 0
    };
  }

  // Detect transactional safety
  const safetyResult = detectTransactionalSafety(baseClassification.combo);

  return {
    ...baseClassification,
    transactionalSafety: safetyResult.safety,
    riskFlags: safetyResult.riskFlags,
    safetyConfidence: safetyResult.confidence
  };
}
