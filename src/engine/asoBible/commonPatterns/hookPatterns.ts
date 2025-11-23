/**
 * Hook Patterns by Vertical
 *
 * Maps vertical IDs to hook category patterns.
 * Used to classify hooks into categories: Learning/Educational, Outcome/Benefit,
 * Status/Authority, Ease-of-use, Time-to-result, Trust/Safety
 *
 * Phase 9: Intelligence layer for vertical-aware hook detection
 */

export interface HookPatternMap {
  learning_educational: string[];
  outcome_benefit: string[];
  status_authority: string[];
  ease_of_use: string[];
  time_to_result: string[];
  trust_safety: string[];
}

/**
 * Hook patterns for language learning vertical
 */
export const LANGUAGE_LEARNING_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'learn',
    'master',
    'study',
    'practice',
    'improve',
    'develop',
    'build skills',
    'understand',
    'discover',
    'explore',
    'lessons',
    'course',
    'tutorial',
    'education',
  ],
  outcome_benefit: [
    'speak fluently',
    'become fluent',
    'talk like native',
    'travel confidently',
    'ace exams',
    'get certified',
    'career boost',
    'expand vocabulary',
    'perfect pronunciation',
    'sound natural',
  ],
  status_authority: [
    '#1 language app',
    'expert approved',
    'certified course',
    'award winning',
    'trusted by schools',
    'used by millions',
    'recommended by teachers',
    'proven method',
  ],
  ease_of_use: [
    'easy to learn',
    'simple',
    'beginner friendly',
    'no experience needed',
    'step by step',
    'guided',
    'intuitive',
    'just 5 minutes',
    'bite-sized lessons',
  ],
  time_to_result: [
    'in 30 days',
    'fast results',
    'quick progress',
    'rapid learning',
    'immediate improvement',
    'within weeks',
    'daily practice',
    'see results fast',
  ],
  trust_safety: [
    'trusted',
    'safe learning',
    'privacy protected',
    'secure',
    'verified',
    'authentic content',
    'quality guaranteed',
  ],
};

/**
 * Hook patterns for rewards vertical
 */
export const REWARDS_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'how to earn',
    'maximize rewards',
    'learn earning strategies',
    'discover offers',
    'find deals',
  ],
  outcome_benefit: [
    'earn cash',
    'get paid',
    'free money',
    'extra income',
    'passive income',
    'rewards',
    'cashback',
    'gift cards',
    'save money',
    'get discounts',
  ],
  status_authority: [
    '#1 rewards app',
    'top earning app',
    'most trusted',
    'highest rated',
    'millions earned',
    'verified payouts',
    'proven legitimate',
  ],
  ease_of_use: [
    'easy to earn',
    'simple rewards',
    'no hassle',
    'automatic',
    'instant',
    'tap to earn',
    'play and earn',
    'effortless',
  ],
  time_to_result: [
    'instant payout',
    'fast cash out',
    'same day',
    'quick rewards',
    'earn today',
    'immediate',
    'within 24 hours',
    'start earning now',
  ],
  trust_safety: [
    'legitimate',
    'real money',
    'guaranteed payout',
    'secure',
    'trusted',
    'verified',
    'safe',
    'no scam',
    'proven',
  ],
};

/**
 * Hook patterns for finance vertical
 */
export const FINANCE_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'learn investing',
    'financial education',
    'understand markets',
    'budget better',
    'track spending',
    'analyze finances',
  ],
  outcome_benefit: [
    'save money',
    'grow wealth',
    'build portfolio',
    'earn interest',
    'maximize returns',
    'reduce fees',
    'increase savings',
    'achieve goals',
    'financial freedom',
  ],
  status_authority: [
    'bank grade',
    'fdic insured',
    'regulated',
    'licensed',
    'trusted by millions',
    'award winning',
    'industry leader',
    'certified',
  ],
  ease_of_use: [
    'easy banking',
    'simple investing',
    'intuitive',
    'user friendly',
    'seamless',
    'hassle free',
    'quick setup',
    'automated',
  ],
  time_to_result: [
    'instant transfer',
    'same day',
    'immediate access',
    'quick deposit',
    'fast approval',
    'real time',
    'within minutes',
  ],
  trust_safety: [
    'secure',
    'encrypted',
    'protected',
    'safe',
    'trusted',
    'insured',
    'verified',
    'compliant',
    'bank level security',
    'fraud protection',
  ],
};

/**
 * Hook patterns for dating vertical
 */
export const DATING_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'discover matches',
    'explore profiles',
    'find compatible',
    'learn about',
  ],
  outcome_benefit: [
    'find love',
    'meet singles',
    'make connections',
    'real relationships',
    'meaningful matches',
    'find your match',
    'soulmate',
    'perfect partner',
    'lasting relationship',
  ],
  status_authority: [
    '#1 dating app',
    'most popular',
    'trusted',
    'millions of users',
    'success stories',
    'proven results',
    'award winning',
  ],
  ease_of_use: [
    'easy matching',
    'simple swipe',
    'quick setup',
    'effortless',
    'intuitive',
    'user friendly',
    'straightforward',
  ],
  time_to_result: [
    'match today',
    'instant matches',
    'quick connections',
    'start chatting now',
    'meet tonight',
    'fast matching',
  ],
  trust_safety: [
    'verified profiles',
    'safe dating',
    'secure',
    'authentic',
    'real people',
    'screened',
    'protected',
    'privacy first',
    'moderated',
  ],
};

/**
 * Hook patterns for productivity vertical
 */
export const PRODUCTIVITY_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'learn to organize',
    'master productivity',
    'understand workflow',
    'discover techniques',
  ],
  outcome_benefit: [
    'get organized',
    'boost productivity',
    'save time',
    'stay focused',
    'achieve goals',
    'complete tasks',
    'manage better',
    'work smarter',
    'increase efficiency',
  ],
  status_authority: [
    '#1 productivity app',
    'trusted by professionals',
    'used by fortune 500',
    'award winning',
    'industry standard',
    'recommended',
  ],
  ease_of_use: [
    'easy to use',
    'simple',
    'intuitive',
    'streamlined',
    'effortless',
    'quick setup',
    'user friendly',
    'no learning curve',
  ],
  time_to_result: [
    'instant organization',
    'immediate results',
    'get started now',
    'quick sync',
    'fast setup',
    'right away',
  ],
  trust_safety: [
    'secure',
    'encrypted',
    'private',
    'trusted',
    'reliable',
    'backed up',
    'protected',
    'safe',
  ],
};

/**
 * Hook patterns for health vertical
 */
export const HEALTH_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'learn fitness',
    'understand nutrition',
    'track progress',
    'monitor health',
    'analyze data',
  ],
  outcome_benefit: [
    'lose weight',
    'get fit',
    'build muscle',
    'improve health',
    'feel better',
    'live healthier',
    'reach goals',
    'transform body',
    'boost energy',
    'sleep better',
  ],
  status_authority: [
    'doctor recommended',
    'scientifically proven',
    'certified trainers',
    'expert designed',
    'award winning',
    'trusted by athletes',
    'medical grade',
  ],
  ease_of_use: [
    'easy tracking',
    'simple workouts',
    'user friendly',
    'intuitive',
    'guided',
    'step by step',
    'beginner friendly',
  ],
  time_to_result: [
    'see results fast',
    'quick progress',
    'in 30 days',
    'immediate feedback',
    'rapid improvement',
    'within weeks',
    'start today',
  ],
  trust_safety: [
    'secure',
    'private',
    'confidential',
    'hipaa compliant',
    'trusted',
    'verified',
    'safe',
    'protected data',
  ],
};

/**
 * Hook patterns for entertainment vertical
 */
export const ENTERTAINMENT_HOOK_PATTERNS: HookPatternMap = {
  learning_educational: [
    'discover content',
    'explore shows',
    'find favorites',
    'browse library',
  ],
  outcome_benefit: [
    'unlimited entertainment',
    'endless content',
    'binge watch',
    'enjoy shows',
    'relax',
    'have fun',
    'ad-free',
    'premium quality',
    'exclusive content',
  ],
  status_authority: [
    '#1 streaming app',
    'award winning shows',
    'original content',
    'exclusive',
    'most popular',
    'trusted',
    'industry leader',
  ],
  ease_of_use: [
    'easy streaming',
    'simple interface',
    'user friendly',
    'intuitive',
    'seamless',
    'one click',
    'quick access',
  ],
  time_to_result: [
    'watch now',
    'instant streaming',
    'immediate access',
    'start watching',
    'play instantly',
    'no wait',
  ],
  trust_safety: [
    'secure',
    'safe',
    'family friendly',
    'parental controls',
    'trusted',
    'verified',
    'protected',
  ],
};

/**
 * Map of all vertical hook patterns
 */
export const VERTICAL_HOOK_PATTERNS: Record<string, HookPatternMap> = {
  language_learning: LANGUAGE_LEARNING_HOOK_PATTERNS,
  rewards: REWARDS_HOOK_PATTERNS,
  finance: FINANCE_HOOK_PATTERNS,
  dating: DATING_HOOK_PATTERNS,
  productivity: PRODUCTIVITY_HOOK_PATTERNS,
  health: HEALTH_HOOK_PATTERNS,
  entertainment: ENTERTAINMENT_HOOK_PATTERNS,
};

/**
 * Get hook patterns for a specific vertical
 *
 * @param verticalId - Vertical ID (e.g., "rewards", "language_learning")
 * @returns Hook pattern map or undefined if vertical not found
 */
export function getHookPatternsForVertical(
  verticalId: string
): HookPatternMap | undefined {
  return VERTICAL_HOOK_PATTERNS[verticalId];
}

/**
 * Check if a keyword matches any hook pattern for a vertical
 *
 * @param keyword - Keyword to check
 * @param verticalId - Vertical ID
 * @param hookCategory - Optional hook category to check (if not provided, checks all)
 * @returns Hook category if matched, undefined otherwise
 */
export function matchHookPattern(
  keyword: string,
  verticalId: string,
  hookCategory?: keyof HookPatternMap
): keyof HookPatternMap | undefined {
  const patterns = getHookPatternsForVertical(verticalId);
  if (!patterns) {
    return undefined;
  }

  const normalizedKeyword = keyword.toLowerCase().trim();

  // Check specific hook category if provided
  if (hookCategory) {
    const matchesCategory = patterns[hookCategory].some((pattern) =>
      normalizedKeyword.includes(pattern.toLowerCase())
    );
    return matchesCategory ? hookCategory : undefined;
  }

  // Check all hook categories
  for (const [category, patternList] of Object.entries(patterns)) {
    const matches = patternList.some((pattern) =>
      normalizedKeyword.includes(pattern.toLowerCase())
    );
    if (matches) {
      return category as keyof HookPatternMap;
    }
  }

  return undefined;
}
