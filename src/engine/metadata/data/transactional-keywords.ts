/**
 * Transactional Keyword Safety Classification
 *
 * Phase 1: Intent V2 - Transactional Safety Detection
 * Distinguishes "safe" vs "risky" transactional keywords
 *
 * v2.0: Start with 15 safe + 15 risky keywords (obvious ones)
 * v2.1+: Expand based on ASO team input + Apple policy updates
 *
 * SAFE keywords: Soft CTAs that Apple allows
 * RISKY keywords: Hard CTAs / misleading claims that may trigger penalties
 */

import type { TransactionalKeywordSet } from '@/types/auditV2';

// ============================================================================
// SAFE TRANSACTIONAL KEYWORDS
// ============================================================================

/**
 * Safe transactional keywords (soft CTAs, informational)
 * These are allowed by Apple and don't trigger ranking penalties
 */
export const SAFE_TRANSACTIONAL_KEYWORDS: string[] = [
  // Soft CTAs
  'try',
  'start',
  'get',
  'use',
  'begin',
  'access',
  'explore',
  'discover',

  // Informational transactional
  'learn',
  'see',
  'check',
  'view',
  'find',

  // Account actions
  'sign up',
  'create',

  // TODO: ASO Team to expand with 5-10 more safe keywords
];

// ============================================================================
// RISKY TRANSACTIONAL KEYWORDS
// ============================================================================

/**
 * Risky transactional keywords (hard CTAs, urgency manipulation)
 * These may trigger Apple ranking penalties or violate guidelines
 *
 * NOTE: ASO Team should provide comprehensive list for v2.1
 * This is a starter set of obvious risky keywords
 */
export const RISKY_TRANSACTIONAL_KEYWORDS: string[] = [
  // Direct download prompts (Apple policy violation)
  'free',
  'download',
  'install',

  // Urgency manipulation
  'now',
  'today',
  'limited time',
  'exclusive',
  'hurry',

  // Misleading claims (context-dependent, flagged as risky)
  'best',
  'top',
  '#1',
  'number one',

  // Hard CTAs
  'click here',
  'tap now',

  // TODO: ASO Team to provide 15-25 more risky keywords based on:
  // - Apple-specific policy violations
  // - Misleading claim patterns
  // - Urgency manipulation tactics
  // - Direct download prompts
];

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get all transactional keywords
 */
export function getTransactionalKeywords(): TransactionalKeywordSet {
  return {
    safe: SAFE_TRANSACTIONAL_KEYWORDS,
    risky: RISKY_TRANSACTIONAL_KEYWORDS
  };
}

/**
 * Check if keyword is risky
 */
export function isRiskyKeyword(keyword: string): boolean {
  const normalized = keyword.toLowerCase().trim();
  return RISKY_TRANSACTIONAL_KEYWORDS.some(risky =>
    normalized.includes(risky.toLowerCase())
  );
}

/**
 * Check if keyword is safe transactional
 */
export function isSafeKeyword(keyword: string): boolean {
  const normalized = keyword.toLowerCase().trim();
  return SAFE_TRANSACTIONAL_KEYWORDS.some(safe =>
    normalized.includes(safe.toLowerCase())
  );
}

/**
 * Get transactional safety classification
 */
export function getTransactionalSafety(keyword: string): 'safe' | 'risky' | null {
  if (isRiskyKeyword(keyword)) return 'risky';
  if (isSafeKeyword(keyword)) return 'safe';
  return null;
}

/**
 * Get risk flags for a text (list of detected risky keywords)
 */
export function getRiskFlags(text: string): string[] {
  const normalized = text.toLowerCase();
  const flags: string[] = [];

  for (const risky of RISKY_TRANSACTIONAL_KEYWORDS) {
    if (normalized.includes(risky.toLowerCase())) {
      flags.push(risky);
    }
  }

  return flags;
}

/**
 * Validate keyword set completeness
 */
export function validateKeywordSet(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (SAFE_TRANSACTIONAL_KEYWORDS.length < 10) {
    warnings.push(`Safe keywords count low: ${SAFE_TRANSACTIONAL_KEYWORDS.length} (recommended ≥15)`);
  }

  if (RISKY_TRANSACTIONAL_KEYWORDS.length < 10) {
    warnings.push(`Risky keywords count low: ${RISKY_TRANSACTIONAL_KEYWORDS.length} (recommended ≥20)`);
  }

  // Check for overlaps (same keyword in both safe and risky)
  const safeLower = SAFE_TRANSACTIONAL_KEYWORDS.map(k => k.toLowerCase());
  const riskyLower = RISKY_TRANSACTIONAL_KEYWORDS.map(k => k.toLowerCase());
  const overlaps = safeLower.filter(k => riskyLower.includes(k));

  if (overlaps.length > 0) {
    errors.push(`Keyword overlap detected (in both safe and risky): ${overlaps.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get keyword statistics
 */
export function getKeywordStats() {
  return {
    safe: SAFE_TRANSACTIONAL_KEYWORDS.length,
    risky: RISKY_TRANSACTIONAL_KEYWORDS.length,
    total: SAFE_TRANSACTIONAL_KEYWORDS.length + RISKY_TRANSACTIONAL_KEYWORDS.length
  };
}

// ============================================================================
// PHASE 0 VALIDATION
// ============================================================================

/**
 * Run Phase 0 validation on keyword set
 * Ensures minimum viable data for v2.0 launch
 */
export function validatePhase0(): {
  ready: boolean;
  errors: string[];
  warnings: string[];
  stats: ReturnType<typeof getKeywordStats>;
} {
  const validation = validateKeywordSet();
  const stats = getKeywordStats();

  const ready = validation.valid && stats.safe >= 10 && stats.risky >= 10;

  return {
    ready,
    errors: validation.errors,
    warnings: validation.warnings,
    stats
  };
}
