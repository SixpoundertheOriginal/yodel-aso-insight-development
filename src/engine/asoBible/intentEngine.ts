/**
 * Intent Engine - Phase 16.7
 *
 * Bible-first intent pattern classification engine with fallback support.
 *
 * Architecture:
 * - Primary Source: aso_intent_patterns table (via adminIntentService)
 * - Fallback Source: Minimal hardcoded defaults (when DB is empty/fails)
 * - Hybrid Model (Option B): Try DB first, use fallback if needed
 *
 * Provides:
 * - Token/combo intent classification
 * - Pattern-based matching with regex/word boundary support
 * - Weighted scoring (0.1-3.0)
 * - Priority-based evaluation (0-200)
 *
 * Integration Points:
 * - comboIntentClassifier.ts: Classify combo search intent
 * - Title/Subtitle Search Intent Coverage: Use Bible patterns
 * - Discovery Footprint chart: Intent-based grouping
 * - Intent Alignment KPIs: Powered by classifications
 *
 * @see docs/PHASE_16_INTENT_ENGINE_COMPLETE.md
 */

import { getEffectiveIntentPatterns } from '@/services/admin/adminIntentService';
import type {
  IntentType,
  IntentScope,
  IntentPatternWithAdminMeta,
} from '@/services/admin/adminIntentService';

// ============================================================================
// Types
// ============================================================================

/**
 * Intent pattern configuration loaded from DB or fallback
 */
export interface IntentPatternConfig {
  pattern: string;
  intentType: IntentType;
  weight: number; // 0.1-3.0
  priority: number; // 0-200
  isRegex: boolean;
  caseSensitive: boolean;
  wordBoundary: boolean;
  example?: string;
  scope?: IntentScope;
}

/**
 * Token intent classification result
 */
export interface TokenIntentClassification {
  token: string;
  intents: Array<{
    intentType: IntentType;
    score: number; // Weighted score
    matchedPattern: string;
  }>;
  dominantIntent: IntentType | null;
}

/**
 * Combo intent classification result
 */
export interface ComboIntentClassification {
  combo: string;
  dominantIntent: IntentType | 'mixed' | 'unknown';
  intentScores: Record<IntentType, number>;
  matchedPatterns: string[];
}

/**
 * Intent coverage metrics
 */
export interface IntentCoverageMetrics {
  informationalCount: number;
  commercialCount: number;
  transactionalCount: number;
  navigationalCount: number;
  totalClassified: number;
  coverageScore: number; // 0-100
  dominantIntent: IntentType | null;
}

// ============================================================================
// Fallback Patterns (Minimal Defaults)
// ============================================================================

/**
 * Minimal fallback patterns used when DB is empty/fails
 * These are purposefully small - the Bible should be the primary source
 */
const FALLBACK_PATTERNS: IntentPatternConfig[] = [
  // Informational (learning/discovery)
  { pattern: 'learn', intentType: 'informational', weight: 1.2, priority: 100, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'how to', intentType: 'informational', weight: 1.3, priority: 110, isRegex: false, caseSensitive: false, wordBoundary: false },
  { pattern: 'guide', intentType: 'informational', weight: 1.1, priority: 90, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'tutorial', intentType: 'informational', weight: 1.1, priority: 90, isRegex: false, caseSensitive: false, wordBoundary: true },

  // Commercial (comparison/evaluation)
  { pattern: 'best', intentType: 'commercial', weight: 1.5, priority: 120, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'top', intentType: 'commercial', weight: 1.4, priority: 115, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'compare', intentType: 'commercial', weight: 1.3, priority: 110, isRegex: false, caseSensitive: false, wordBoundary: true },

  // Transactional (download/action)
  { pattern: 'download', intentType: 'transactional', weight: 2.0, priority: 150, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'free', intentType: 'transactional', weight: 1.8, priority: 140, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'get', intentType: 'transactional', weight: 1.5, priority: 130, isRegex: false, caseSensitive: false, wordBoundary: true },

  // Navigational (brand/app)
  { pattern: 'app', intentType: 'navigational', weight: 1.0, priority: 50, isRegex: false, caseSensitive: false, wordBoundary: true },
  { pattern: 'official', intentType: 'navigational', weight: 1.2, priority: 60, isRegex: false, caseSensitive: false, wordBoundary: true },
];

// ============================================================================
// Pattern Loading (Hybrid Model - Option B)
// ============================================================================

/**
 * Loaded patterns cache
 * Invalidated when patterns are updated via Admin UI
 */
let cachedPatterns: IntentPatternConfig[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear pattern cache
 * Called when Admin UI updates patterns
 */
export function clearIntentPatternCache(): void {
  cachedPatterns = null;
  cacheTimestamp = 0;
  console.log('✅ [IntentEngine] Pattern cache cleared');
}

/**
 * Load effective intent patterns from DB with fallback
 *
 * Hybrid Model (Option B):
 * 1. Try to load from aso_intent_patterns table
 * 2. If DB returns 0 active patterns OR errors → use fallback
 * 3. Cache results for 5 minutes
 *
 * @param vertical - Vertical context (optional)
 * @param market - Market context (optional)
 * @param organizationId - Organization context (optional)
 * @param appId - App context (optional)
 * @returns Array of intent pattern configurations
 */
export async function loadIntentPatterns(
  vertical?: string,
  market?: string,
  organizationId?: string,
  appId?: string
): Promise<IntentPatternConfig[]> {
  // Check cache
  const now = Date.now();
  if (cachedPatterns && now - cacheTimestamp < CACHE_TTL_MS) {
    console.log(`📦 [IntentEngine] Using cached patterns (${cachedPatterns.length} patterns)`);
    return cachedPatterns;
  }

  try {
    console.log('🔍 [IntentEngine] Loading patterns from DB...');

    // Try to load from DB
    const dbPatterns = await getEffectiveIntentPatterns(vertical, market, organizationId, appId);

    // Check if DB returned patterns
    if (dbPatterns && dbPatterns.length > 0) {
      console.log(`✅ [IntentEngine] Loaded ${dbPatterns.length} patterns from Intent Registry`);

      // Convert DB patterns to IntentPatternConfig
      const configs: IntentPatternConfig[] = dbPatterns.map((p) => ({
        pattern: p.pattern,
        intentType: p.intent_type,
        weight: p.effective_weight || p.weight,
        priority: p.effective_priority || p.priority,
        isRegex: p.is_regex,
        caseSensitive: p.case_sensitive,
        wordBoundary: p.word_boundary,
        example: p.example,
        scope: p.scope,
      }));

      // Cache the results
      cachedPatterns = configs;
      cacheTimestamp = now;

      return configs;
    } else {
      // DB returned 0 patterns → use fallback
      console.warn(
        '⚠️ [IntentEngine] DB returned 0 patterns. Using fallback defaults. Seed the Intent Registry for production use.'
      );
      cachedPatterns = FALLBACK_PATTERNS;
      cacheTimestamp = now;
      return FALLBACK_PATTERNS;
    }
  } catch (error) {
    // DB call failed → use fallback
    console.error('❌ [IntentEngine] Failed to load patterns from DB:', error);
    console.warn('⚠️ [IntentEngine] Using fallback patterns due to DB error');
    cachedPatterns = FALLBACK_PATTERNS;
    cacheTimestamp = now;
    return FALLBACK_PATTERNS;
  }
}

// ============================================================================
// Pattern Matching
// ============================================================================

/**
 * Match a text against a pattern with configurable options
 *
 * @param text - Text to match
 * @param pattern - Pattern configuration
 * @returns True if matched, false otherwise
 */
function matchPattern(text: string, pattern: IntentPatternConfig): boolean {
  let normalizedText = text;
  let normalizedPattern = pattern.pattern;

  // Handle case sensitivity
  if (!pattern.caseSensitive) {
    normalizedText = text.toLowerCase();
    normalizedPattern = pattern.pattern.toLowerCase();
  }

  // Handle regex vs literal matching
  if (pattern.isRegex) {
    try {
      const flags = pattern.caseSensitive ? '' : 'i';
      const regex = new RegExp(normalizedPattern, flags);
      return regex.test(normalizedText);
    } catch (error) {
      console.error(`[IntentEngine] Invalid regex pattern "${pattern.pattern}":`, error);
      return false;
    }
  } else {
    // Literal string matching with optional word boundary
    if (pattern.wordBoundary) {
      // Word boundary: pattern must be a complete word
      const regex = new RegExp(`\\b${escapeRegex(normalizedPattern)}\\b`, 'i');
      return regex.test(normalizedText);
    } else {
      // Substring matching
      return normalizedText.includes(normalizedPattern);
    }
  }
}

/**
 * Escape special regex characters for literal matching
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify a single token's search intent
 *
 * @param token - Token to classify
 * @param patterns - Intent patterns (loaded from DB or fallback)
 * @returns Token intent classification
 */
export function classifyTokenIntent(
  token: string,
  patterns: IntentPatternConfig[]
): TokenIntentClassification {
  const intents: Array<{ intentType: IntentType; score: number; matchedPattern: string }> = [];

  // Match against all patterns
  for (const pattern of patterns) {
    if (matchPattern(token, pattern)) {
      // Calculate score: weight * (priority / 100)
      // Higher weight + higher priority = higher score
      const score = pattern.weight * (1 + pattern.priority / 200);

      intents.push({
        intentType: pattern.intentType,
        score,
        matchedPattern: pattern.pattern,
      });
    }
  }

  // Determine dominant intent (highest score)
  let dominantIntent: IntentType | null = null;
  if (intents.length > 0) {
    intents.sort((a, b) => b.score - a.score);
    dominantIntent = intents[0].intentType;
  }

  return {
    token,
    intents,
    dominantIntent,
  };
}

/**
 * Classify a combo's search intent
 *
 * @param combo - Combo text to classify
 * @param patterns - Intent patterns (loaded from DB or fallback)
 * @returns Combo intent classification
 */
export function classifyComboIntent(
  combo: string,
  patterns: IntentPatternConfig[]
): ComboIntentClassification {
  const intentScores: Record<IntentType, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };

  const matchedPatterns: string[] = [];

  // Match against all patterns
  for (const pattern of patterns) {
    if (matchPattern(combo, pattern)) {
      // Add to intent score
      const score = pattern.weight * (1 + pattern.priority / 200);
      intentScores[pattern.intentType] += score;
      matchedPatterns.push(pattern.pattern);
    }
  }

  // Determine dominant intent
  let dominantIntent: IntentType | 'mixed' | 'unknown' = 'unknown';
  const scores = Object.entries(intentScores).filter(([_, score]) => score > 0);

  if (scores.length === 0) {
    dominantIntent = 'unknown';
  } else if (scores.length === 1) {
    dominantIntent = scores[0][0] as IntentType;
  } else {
    // Multiple intents → check if one is clearly dominant (>50% of total)
    const totalScore = scores.reduce((sum, [_, score]) => sum + score, 0);
    const topIntent = scores.sort((a, b) => b[1] - a[1])[0];

    if (topIntent[1] / totalScore > 0.5) {
      dominantIntent = topIntent[0] as IntentType;
    } else {
      dominantIntent = 'mixed';
    }
  }

  return {
    combo,
    dominantIntent,
    intentScores,
    matchedPatterns,
  };
}

/**
 * Classify multiple tokens/combos and compute coverage metrics
 *
 * @param texts - Array of tokens/combos to classify
 * @param patterns - Intent patterns (loaded from DB or fallback)
 * @returns Intent coverage metrics
 */
export function computeIntentCoverage(
  texts: string[],
  patterns: IntentPatternConfig[]
): IntentCoverageMetrics {
  const intentCounts: Record<IntentType, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };

  let totalClassified = 0;

  // Classify each text
  for (const text of texts) {
    const classification = classifyTokenIntent(text, patterns);
    if (classification.dominantIntent) {
      intentCounts[classification.dominantIntent]++;
      totalClassified++;
    }
  }

  // Calculate coverage score (0-100)
  // Higher score when multiple intent types are present
  const intentTypesPresent = Object.values(intentCounts).filter((count) => count > 0).length;
  const coverageScore = (intentTypesPresent / 4) * 100;

  // Determine dominant intent (most common)
  let dominantIntent: IntentType | null = null;
  let maxCount = 0;
  for (const [intent, count] of Object.entries(intentCounts)) {
    if (count > maxCount) {
      dominantIntent = intent as IntentType;
      maxCount = count;
    }
  }

  return {
    informationalCount: intentCounts.informational,
    commercialCount: intentCounts.commercial,
    transactionalCount: intentCounts.transactional,
    navigationalCount: intentCounts.navigational,
    totalClassified,
    coverageScore: Math.round(coverageScore),
    dominantIntent,
  };
}

// ============================================================================
// Mapping Functions (Backward Compatibility)
// ============================================================================

/**
 * Map search intent to legacy combo intent type
 * For backward compatibility with existing UI
 *
 * @param intentType - Search intent type
 * @returns Legacy combo intent type
 */
export function mapSearchIntentToComboIntent(
  intentType: IntentType | 'mixed' | 'unknown'
): 'learning' | 'outcome' | 'brand' | 'noise' {
  switch (intentType) {
    case 'informational':
      return 'learning';
    case 'commercial':
    case 'transactional':
      return 'outcome';
    case 'navigational':
      return 'brand';
    case 'mixed':
    case 'unknown':
    default:
      return 'noise';
  }
}

/**
 * Map legacy combo intent to search intent type
 *
 * @param comboIntent - Legacy combo intent type
 * @returns Search intent type
 */
export function mapComboIntentToSearchIntent(
  comboIntent: 'learning' | 'outcome' | 'brand' | 'noise'
): IntentType {
  switch (comboIntent) {
    case 'learning':
      return 'informational';
    case 'outcome':
      return 'commercial';
    case 'brand':
      return 'navigational';
    case 'noise':
    default:
      return 'informational';
  }
}

// ============================================================================
// Discovery Footprint Helpers
// ============================================================================

/**
 * Group combos by discovery footprint category
 * Maps intent types to legacy Discovery Footprint labels
 *
 * @param combos - Array of combos with intent classifications
 * @returns Categorized counts for Discovery Footprint chart
 */
export interface DiscoveryFootprintCategories {
  learning: number; // informational
  outcome: number; // commercial + transactional
  brand: number; // navigational
  generic: number; // low-priority informational
  noise: number; // unknown/mixed
}

export function groupByDiscoveryFootprint(
  combos: Array<{ text: string; classification: ComboIntentClassification }>
): DiscoveryFootprintCategories {
  const categories: DiscoveryFootprintCategories = {
    learning: 0,
    outcome: 0,
    brand: 0,
    generic: 0,
    noise: 0,
  };

  for (const combo of combos) {
    const { dominantIntent, intentScores } = combo.classification;

    switch (dominantIntent) {
      case 'informational':
        // Check if high-value informational (score > 2.0) vs generic (score <= 2.0)
        if (intentScores.informational > 2.0) {
          categories.learning++;
        } else {
          categories.generic++;
        }
        break;
      case 'commercial':
      case 'transactional':
        categories.outcome++;
        break;
      case 'navigational':
        categories.brand++;
        break;
      case 'mixed':
      case 'unknown':
      default:
        categories.noise++;
        break;
    }
  }

  return categories;
}
