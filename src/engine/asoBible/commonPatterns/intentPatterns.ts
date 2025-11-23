/**
 * Intent Patterns by Vertical
 *
 * Maps vertical IDs to intent-specific keyword patterns.
 * Used by combo classifier to detect informational, commercial, transactional, and navigational intents.
 *
 * Phase 9: Intelligence layer for vertical-aware intent detection
 */

export interface IntentPatternMap {
  informational: string[];
  commercial: string[];
  transactional: string[];
  navigational: string[];
}

/**
 * Intent patterns for language learning vertical
 */
export const LANGUAGE_LEARNING_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'learn',
    'grammar',
    'vocabulary',
    'lessons',
    'practice',
    'speak',
    'fluent',
    'pronunciation',
    'conversation',
    'study',
    'master',
    'improve',
    'language skills',
    'words',
    'phrases',
    'reading',
    'writing',
    'listening',
    'course',
    'tutorial',
  ],
  commercial: [
    'best language app',
    'top rated app',
    'most popular',
    'award winning',
    '#1 language',
    'highest rated',
    'recommended',
    'certified',
    'expert approved',
    'trusted by millions',
  ],
  transactional: [
    'download',
    'start learning',
    'begin course',
    'sign up',
    'get started',
    'join now',
    'try free',
    'subscribe',
    'enroll',
    'unlock',
  ],
  navigational: [
    'duolingo',
    'pimsleur',
    'babbel',
    'rosetta stone',
    'memrise',
    'busuu',
    'mondly',
  ],
};

/**
 * Intent patterns for rewards vertical
 */
export const REWARDS_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'earn',
    'gift cards',
    'cash out',
    'rewards',
    'redeem',
    'points',
    'cashback',
    'money',
    'prizes',
    'free rewards',
    'bonus',
    'paypal',
    'amazon',
    'visa',
    'giftcard',
    'payout',
    'balance',
    'wallet',
    'credit',
  ],
  commercial: [
    'best rewards app',
    'top earning app',
    'highest paying',
    'fastest payout',
    'most rewards',
    'legitimate',
    'real money',
    'guaranteed',
  ],
  transactional: [
    'withdraw',
    'cash out now',
    'redeem now',
    'claim rewards',
    'get paid',
    'earn now',
    'start earning',
    'play now',
    'download',
    'sign up',
  ],
  navigational: [
    'mistplay',
    'swagbucks',
    'fetch rewards',
    'ibotta',
    'rakuten',
    'honey',
    'dosh',
  ],
};

/**
 * Intent patterns for finance vertical
 */
export const FINANCE_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'track',
    'budget',
    'interest rate',
    'saving',
    'invest',
    'portfolio',
    'stocks',
    'crypto',
    'trading',
    'banking',
    'account',
    'balance',
    'transaction',
    'expense',
    'income',
    'financial',
    'wealth',
    'retirement',
    'tax',
  ],
  commercial: [
    'best finance app',
    'top rated bank',
    'trusted',
    'secure',
    'fdic insured',
    'regulated',
    'licensed',
    'certified',
    'award winning',
  ],
  transactional: [
    'deposit',
    'send money',
    'invest now',
    'transfer',
    'buy',
    'sell',
    'trade',
    'open account',
    'apply',
    'get started',
  ],
  navigational: [
    'paypal',
    'revolut',
    'chime',
    'robinhood',
    'coinbase',
    'venmo',
    'cash app',
    'mint',
  ],
};

/**
 * Intent patterns for dating vertical
 */
export const DATING_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'match',
    'meet',
    'connect',
    'dating',
    'relationship',
    'singles',
    'profile',
    'chat',
    'message',
    'flirt',
    'date',
    'like',
    'swipe',
    'compatible',
    'soulmate',
    'partner',
  ],
  commercial: [
    'best dating app',
    'top rated',
    'most matches',
    'successful',
    'verified',
    'real people',
    'authentic',
  ],
  transactional: [
    'sign up',
    'start chatting',
    'create profile',
    'join now',
    'match now',
    'swipe',
    'like',
    'message',
    'subscribe',
  ],
  navigational: [
    'tinder',
    'bumble',
    'hinge',
    'okcupid',
    'match.com',
    'pof',
    'eharmony',
  ],
};

/**
 * Intent patterns for productivity vertical
 */
export const PRODUCTIVITY_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'tasks',
    'calendar',
    'notes',
    'reminders',
    'organize',
    'plan',
    'schedule',
    'to-do',
    'productivity',
    'workflow',
    'project',
    'collaboration',
    'sync',
    'manage',
    'track',
    'goals',
    'habits',
  ],
  commercial: [
    'best productivity app',
    'top rated',
    'most popular',
    'award winning',
    'recommended',
    'trusted by',
    'professional',
  ],
  transactional: [
    'start now',
    'sync',
    'upgrade',
    'create',
    'add task',
    'set reminder',
    'schedule',
    'organize',
    'download',
    'sign up',
  ],
  navigational: [
    'todoist',
    'notion',
    'evernote',
    'trello',
    'asana',
    'monday',
    'clickup',
  ],
};

/**
 * Intent patterns for health vertical
 */
export const HEALTH_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'steps',
    'calories',
    'fitness tracking',
    'workout',
    'exercise',
    'nutrition',
    'diet',
    'health',
    'wellness',
    'weight',
    'heart rate',
    'sleep',
    'activity',
    'training',
    'running',
    'walking',
    'cycling',
  ],
  commercial: [
    'best fitness app',
    'top rated',
    'doctor recommended',
    'certified',
    'trusted',
    'scientifically proven',
    'award winning',
  ],
  transactional: [
    'start workout',
    'book appointment',
    'track now',
    'log meal',
    'record',
    'measure',
    'sync',
    'connect device',
    'join challenge',
  ],
  navigational: [
    'fitbit',
    'myfitnesspal',
    'strava',
    'nike run club',
    'peloton',
    'headspace',
    'calm',
  ],
};

/**
 * Intent patterns for entertainment vertical
 */
export const ENTERTAINMENT_INTENT_PATTERNS: IntentPatternMap = {
  informational: [
    'watch',
    'stream',
    'episodes',
    'music',
    'movies',
    'shows',
    'video',
    'play',
    'listen',
    'browse',
    'discover',
    'entertainment',
    'content',
    'series',
    'playlist',
  ],
  commercial: [
    'best streaming app',
    'top rated',
    'most popular',
    'award winning',
    'exclusive',
    'original content',
    'premium',
  ],
  transactional: [
    'subscribe',
    'play now',
    'watch now',
    'stream now',
    'download',
    'join',
    'start trial',
    'upgrade',
    'unlock',
  ],
  navigational: [
    'netflix',
    'prime video',
    'disney+',
    'hulu',
    'spotify',
    'youtube',
    'hbo max',
  ],
};

/**
 * Map of all vertical intent patterns
 */
export const VERTICAL_INTENT_PATTERNS: Record<string, IntentPatternMap> = {
  language_learning: LANGUAGE_LEARNING_INTENT_PATTERNS,
  rewards: REWARDS_INTENT_PATTERNS,
  finance: FINANCE_INTENT_PATTERNS,
  dating: DATING_INTENT_PATTERNS,
  productivity: PRODUCTIVITY_INTENT_PATTERNS,
  health: HEALTH_INTENT_PATTERNS,
  entertainment: ENTERTAINMENT_INTENT_PATTERNS,
};

/**
 * Get intent patterns for a specific vertical
 *
 * @param verticalId - Vertical ID (e.g., "rewards", "language_learning")
 * @returns Intent pattern map or undefined if vertical not found
 */
export function getIntentPatternsForVertical(
  verticalId: string
): IntentPatternMap | undefined {
  return VERTICAL_INTENT_PATTERNS[verticalId];
}

/**
 * Check if a keyword matches any intent pattern for a vertical
 *
 * @param keyword - Keyword to check
 * @param verticalId - Vertical ID
 * @param intentType - Optional intent type to check (if not provided, checks all)
 * @returns Intent type if matched, undefined otherwise
 */
export function matchIntentPattern(
  keyword: string,
  verticalId: string,
  intentType?: keyof IntentPatternMap
): keyof IntentPatternMap | undefined {
  const patterns = getIntentPatternsForVertical(verticalId);
  if (!patterns) {
    return undefined;
  }

  const normalizedKeyword = keyword.toLowerCase().trim();

  // Check specific intent type if provided
  if (intentType) {
    const matchesIntent = patterns[intentType].some((pattern) =>
      normalizedKeyword.includes(pattern.toLowerCase())
    );
    return matchesIntent ? intentType : undefined;
  }

  // Check all intent types
  for (const [intent, patternList] of Object.entries(patterns)) {
    const matches = patternList.some((pattern) =>
      normalizedKeyword.includes(pattern.toLowerCase())
    );
    if (matches) {
      return intent as keyof IntentPatternMap;
    }
  }

  return undefined;
}
