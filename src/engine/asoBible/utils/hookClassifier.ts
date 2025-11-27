/**
 * Hook Classifier - Bible-Powered
 *
 * Classifies combos/text into psychological hook categories using vertical-specific patterns
 * from the ASO Bible Hook Engine.
 *
 * Phase 20: Replaces hardcoded hook patterns with Bible-driven classification
 *
 * Hook Categories:
 * - learning_educational: Educational, skill-building hooks
 * - outcome_benefit: Results, benefits, achievements
 * - status_authority: Authority, prestige, recognition
 * - ease_of_use: Simple, quick, effortless
 * - time_to_result: Speed, efficiency, time-saving
 * - trust_safety: Safety, reliability, proven
 */

import type { HookPatternMap } from '../commonPatterns/hookPatterns';
import type { MergedRuleSet } from '../ruleset.types';

export type HookCategory =
  | 'learning_educational'
  | 'outcome_benefit'
  | 'status_authority'
  | 'ease_of_use'
  | 'time_to_result'
  | 'trust_safety';

/**
 * Hook category metadata for UI display
 */
export const HOOK_CATEGORY_META: Record<
  HookCategory,
  { label: string; color: string; description: string }
> = {
  learning_educational: {
    label: 'Learning',
    color: '#22d3ee', // cyan-400
    description: 'Educational, skill-building',
  },
  outcome_benefit: {
    label: 'Outcome',
    color: '#10b981', // emerald-500
    description: 'Results, benefits, achievements',
  },
  status_authority: {
    label: 'Status',
    color: '#a855f7', // purple-500
    description: 'Authority, prestige, recognition',
  },
  ease_of_use: {
    label: 'Ease',
    color: '#f59e0b', // amber-500
    description: 'Simple, quick, effortless',
  },
  time_to_result: {
    label: 'Time',
    color: '#3b82f6', // blue-500
    description: 'Speed, efficiency, time-saving',
  },
  trust_safety: {
    label: 'Trust',
    color: '#ec4899', // pink-500
    description: 'Safety, reliability, proven',
  },
};

/**
 * Fallback hook patterns (used when no activeRuleSet provided)
 * Generic enough to work across verticals
 */
const FALLBACK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'learn',
    'study',
    'master',
    'practice',
    'improve',
    'develop',
    'skill',
    'course',
    'lesson',
    'training',
    'tutorial',
    'education',
    'teach',
    'discover',
    'explore',
  ],
  outcome_benefit: [
    'achieve',
    'results',
    'success',
    'become',
    'transform',
    'unlock',
    'reach',
    'attain',
    'gain',
    'benefit',
    'reward',
    'win',
    'earn',
    'get',
  ],
  status_authority: [
    'best',
    'top',
    '#1',
    'leading',
    'premium',
    'professional',
    'expert',
    'advanced',
    'pro',
    'elite',
    'certified',
    'official',
    'verified',
    'trusted',
  ],
  ease_of_use: [
    'easy',
    'simple',
    'quick',
    'effortless',
    'intuitive',
    'user-friendly',
    'convenient',
    'hassle-free',
    'straightforward',
    'accessible',
  ],
  time_to_result: [
    'fast',
    'rapid',
    'instant',
    'immediate',
    'speed',
    'accelerate',
    'boost',
    'quick',
    'within',
    'in minutes',
    'in days',
    'in hours',
  ],
  trust_safety: [
    'trusted',
    'proven',
    'safe',
    'reliable',
    'secure',
    'certified',
    'guaranteed',
    'verified',
    'official',
    'authentic',
  ],
};

/**
 * Check if text matches any pattern in the array
 *
 * @param text - Text to check (lowercased)
 * @param patterns - Array of patterns to match against
 * @returns True if any pattern matches
 */
function matchesAnyPattern(text: string, patterns: string[] | undefined): boolean {
  // Safety check: ensure patterns is an array
  if (!patterns || !Array.isArray(patterns)) {
    return false;
  }

  return patterns.some(pattern => {
    // Exact word boundary match
    const regex = new RegExp(`\\b${pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  });
}

/**
 * Classify text into a hook category using Bible patterns
 *
 * @param text - Text to classify (combo or phrase)
 * @param activeRuleSet - Optional active rule set for vertical-specific patterns
 * @returns Hook category or null if no match
 */
export function classifyHook(
  text: string,
  activeRuleSet?: MergedRuleSet
): HookCategory | null {
  const lowerText = text.toLowerCase();

  // Get patterns: use vertical-specific if available, otherwise fallback
  // Safety check: ensure hookOverrides is properly structured
  let patterns: HookPatternMap = FALLBACK_PATTERNS;
  if (activeRuleSet?.hookOverrides) {
    // Validate that hookOverrides has the correct structure
    const overrides = activeRuleSet.hookOverrides;
    if (
      overrides &&
      typeof overrides === 'object' &&
      Array.isArray(overrides.time_to_result) &&
      Array.isArray(overrides.trust_safety) &&
      Array.isArray(overrides.status_authority)
    ) {
      patterns = overrides as HookPatternMap;
    }
  }

  // Check each category in priority order
  // Order matters: more specific categories first to avoid false positives

  // 1. Time to result (check first due to specificity)
  if (matchesAnyPattern(lowerText, patterns.time_to_result)) {
    return 'time_to_result';
  }

  // 2. Trust/Safety
  if (matchesAnyPattern(lowerText, patterns.trust_safety)) {
    return 'trust_safety';
  }

  // 3. Status/Authority
  if (matchesAnyPattern(lowerText, patterns.status_authority)) {
    return 'status_authority';
  }

  // 4. Outcome/Benefit
  if (matchesAnyPattern(lowerText, patterns.outcome_benefit)) {
    return 'outcome_benefit';
  }

  // 5. Ease of use
  if (matchesAnyPattern(lowerText, patterns.ease_of_use)) {
    return 'ease_of_use';
  }

  // 6. Learning/Educational (check last as it's broader)
  if (matchesAnyPattern(lowerText, patterns.learning_educational)) {
    return 'learning_educational';
  }

  return null;
}

/**
 * Classify multiple texts and return hook distribution
 *
 * @param texts - Array of texts to classify
 * @param activeRuleSet - Optional active rule set for vertical-specific patterns
 * @returns Object with count per hook category
 */
export function classifyHookDistribution(
  texts: string[],
  activeRuleSet?: MergedRuleSet
): Record<HookCategory, number> {
  const distribution: Record<HookCategory, number> = {
    learning_educational: 0,
    outcome_benefit: 0,
    status_authority: 0,
    ease_of_use: 0,
    time_to_result: 0,
    trust_safety: 0,
  };

  texts.forEach(text => {
    const category = classifyHook(text, activeRuleSet);
    if (category) {
      distribution[category]++;
    }
  });

  return distribution;
}

/**
 * Calculate hook diversity score (0-100)
 *
 * @param distribution - Hook distribution from classifyHookDistribution
 * @returns Diversity score where 100 = all 6 categories present
 */
export function calculateHookDiversityScore(
  distribution: Record<HookCategory, number>
): number {
  const categoriesPresent = Object.values(distribution).filter(count => count > 0).length;
  return Math.round((categoriesPresent / 6) * 100);
}

/**
 * Get hook classification summary for UI display
 *
 * @param texts - Array of texts to classify
 * @param activeRuleSet - Optional active rule set
 * @returns Summary with distribution, diversity score, and dominant category
 */
export function getHookClassificationSummary(
  texts: string[],
  activeRuleSet?: MergedRuleSet
): {
  distribution: Record<HookCategory, number>;
  diversityScore: number;
  totalClassified: number;
  dominantCategory: HookCategory | null;
} {
  const distribution = classifyHookDistribution(texts, activeRuleSet);
  const diversityScore = calculateHookDiversityScore(distribution);
  const totalClassified = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  // Find dominant category (highest count)
  let dominantCategory: HookCategory | null = null;
  let maxCount = 0;
  (Object.entries(distribution) as [HookCategory, number][]).forEach(([category, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantCategory = category;
    }
  });

  return {
    distribution,
    diversityScore,
    totalClassified,
    dominantCategory,
  };
}
