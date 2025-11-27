/**
 * RuleSet Loader for Edge Functions
 *
 * Loads vertical-specific recommendation templates and overrides.
 * Simplified for Deno edge function environment.
 *
 * Phase 1: ASO Bible Integration - Recommendation Templates
 */

export interface RecommendationTemplate {
  id: string;
  trigger: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'hook' | 'intent' | 'token' | 'structure' | 'generic';
}

export type RecommendationTemplateMap = Record<string, RecommendationTemplate>;

export interface VerticalRuleSet {
  verticalId: string;
  label: string;
  recommendations: RecommendationTemplateMap;
  genericPhraseExamples: string[];
  hookPatterns: string[]; // Vertical-specific hook keywords for description evaluation
}

// ============================================================================
// Recommendation Templates by Vertical
// ============================================================================

const LANGUAGE_LEARNING_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_learning_hook: {
    id: 'missing_learning_hook',
    trigger: 'No educational hooks detected in title/subtitle',
    message:
      "[RANKING] Your title lacks educational hooks such as 'learn', 'practice', or 'speak fluently'. Adding 1–2 learning-focused terms improves educational intent visibility and category relevance.",
    severity: 'warning',
    category: 'hook',
  },
  missing_language_term: {
    id: 'missing_language_term',
    trigger: 'No language-specific terms in metadata',
    message:
      "[RANKING] Consider adding language names (e.g., 'Spanish', 'French', 'English') to improve search relevance for users looking for specific language courses.",
    severity: 'info',
    category: 'token',
  },
  generic_value_prop: {
    id: 'generic_value_prop',
    trigger: 'Value proposition too generic',
    message:
      "[RANKING] Language learning apps benefit from specific outcomes like 'speak fluently in 30 days' or 'master grammar' rather than generic terms like 'best app'.",
    severity: 'info',
    category: 'intent',
  },
};

const REWARDS_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_earning_term: {
    id: 'missing_earning_term',
    trigger: 'No earning-related terms detected',
    message:
      "[RANKING] Add at least one earning-related term (e.g., 'earn', 'cash out', 'rewards', 'get paid'). This is core to rewards vertical visibility and user intent matching.",
    severity: 'critical',
    category: 'token',
  },
  missing_reward_type: {
    id: 'missing_reward_type',
    trigger: 'No specific reward types mentioned',
    message:
      "[RANKING] Specify reward types (e.g., 'gift cards', 'PayPal cash', 'Amazon rewards') to improve conversion. Users want to know what they can earn.",
    severity: 'warning',
    category: 'intent',
  },
  missing_trust_signal: {
    id: 'missing_trust_signal',
    trigger: 'No trust/legitimacy signals',
    message:
      "[RANKING] Rewards apps benefit from trust signals like 'real money', 'guaranteed payout', or 'millions paid out'. Add 1–2 trust terms to overcome skepticism.",
    severity: 'warning',
    category: 'hook',
  },
};

const FINANCE_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_trust_term: {
    id: 'missing_trust_term',
    trigger: 'No trust/security terms detected',
    message:
      "[RANKING] Finance apps require trust signals ('secure', 'safe', 'FDIC insured', 'bank-grade security'). Add at least one to improve user confidence and conversion.",
    severity: 'critical',
    category: 'token',
  },
  missing_action_verb: {
    id: 'missing_action_verb',
    trigger: 'No financial action verbs',
    message:
      "[RANKING] Include action verbs like 'invest', 'save', 'budget', or 'track' to clarify your app's primary function and improve intent matching.",
    severity: 'warning',
    category: 'intent',
  },
};

const DATING_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_social_term: {
    id: 'missing_social_term',
    trigger: 'No social connection terms',
    message:
      "[RANKING] Dating apps score better with connection terms ('meet', 'match', 'chat', 'connect'). Add at least one to improve category relevance.",
    severity: 'warning',
    category: 'token',
  },
  missing_safety_signal: {
    id: 'missing_safety_signal',
    trigger: 'No safety/verification terms',
    message:
      "[RANKING] Dating apps benefit from safety signals like 'verified profiles', 'safe', or 'authentic users'. Add 1–2 trust terms to reduce safety concerns.",
    severity: 'warning',
    category: 'hook',
  },
};

const PRODUCTIVITY_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_action_verb: {
    id: 'missing_action_verb',
    trigger: 'No productivity action verbs',
    message:
      "[RANKING] 'Organize' / 'Plan' / 'Track' / 'Manage' terms help clarify your category signal and improve intent matching. Add at least one action verb.",
    severity: 'warning',
    category: 'token',
  },
  missing_use_case: {
    id: 'missing_use_case',
    trigger: 'No specific use case mentioned',
    message:
      "[RANKING] Specify what users can organize/manage (e.g., 'tasks', 'projects', 'notes', 'calendar') to improve search relevance.",
    severity: 'info',
    category: 'intent',
  },
};

const HEALTH_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_fitness_keyword: {
    id: 'missing_fitness_keyword',
    trigger: 'No fitness/health keywords',
    message:
      "[RANKING] Add one health anchor keyword ('fitness', 'workout', 'health', 'wellness', 'tracking') for category relevance and search visibility.",
    severity: 'warning',
    category: 'token',
  },
  missing_outcome: {
    id: 'missing_outcome',
    trigger: 'No outcome-focused messaging',
    message:
      "[RANKING] Health apps benefit from outcome hooks like 'lose weight', 'get fit', or 'feel better'. Add 1–2 health outcome statements.",
    severity: 'info',
    category: 'hook',
  },
};

const ENTERTAINMENT_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_consumption_intent: {
    id: 'missing_consumption_intent',
    trigger: 'No consumption intent verbs',
    message:
      "[RANKING] Include a consumption verb like 'watch', 'play', 'stream', or 'listen' to clarify the primary user action and improve intent matching.",
    severity: 'warning',
    category: 'token',
  },
  missing_value_prop: {
    id: 'missing_value_prop',
    trigger: 'No value proposition hooks',
    message:
      "[RANKING] Entertainment apps benefit from value hooks like 'unlimited', 'ad-free', 'exclusive content', or 'premium quality'. Add 1–2 value statements.",
    severity: 'info',
    category: 'hook',
  },
};

// ============================================================================
// Generic Phrase Examples by Vertical
// ============================================================================

const VERTICAL_GENERIC_PHRASES: Record<string, string[]> = {
  language_learning: ['learn spanish', 'speak fluently', 'language lessons'],
  rewards: ['earn rewards', 'win prizes', 'play games'],
  finance: ['save money', 'invest smart', 'build wealth'],
  dating: ['meet singles', 'find love', 'true connections'],
  productivity: ['organize tasks', 'manage projects', 'boost efficiency'],
  health: ['track fitness', 'workout daily', 'get healthy'],
  entertainment: ['watch movies', 'stream shows', 'unlimited entertainment'],
  base: ['discover features', 'explore options', 'find solutions'],
};

// ============================================================================
// Hook Patterns by Vertical (for description hook strength evaluation)
// ============================================================================

const VERTICAL_HOOK_PATTERNS: Record<string, string[]> = {
  language_learning: [
    'learn', 'master', 'speak', 'practice', 'study',
    'discover', 'improve', 'achieve fluency', 'become fluent', 'unlock'
  ],
  rewards: [
    'earn', 'win', 'get paid', 'cash out', 'redeem',
    'unlock rewards', 'collect', 'gain', 'achieve', 'claim'
  ],
  finance: [
    'save', 'invest', 'grow', 'build wealth', 'secure',
    'protect', 'achieve goals', 'track', 'manage', 'plan'
  ],
  dating: [
    'meet', 'match', 'connect', 'find love', 'discover',
    'chat', 'date', 'build relationships', 'experience', 'explore'
  ],
  productivity: [
    'organize', 'manage', 'plan', 'track', 'achieve',
    'boost productivity', 'streamline', 'optimize', 'transform', 'simplify'
  ],
  health: [
    'transform', 'achieve goals', 'get fit', 'lose weight', 'build muscle',
    'improve health', 'track progress', 'workout', 'train', 'reach goals'
  ],
  entertainment: [
    'watch', 'enjoy', 'stream', 'discover', 'explore',
    'experience', 'unlock', 'access', 'binge', 'immerse'
  ],
  base: [
    'discover', 'experience', 'transform', 'achieve', 'unlock',
    'explore', 'create', 'build', 'improve', 'enhance'
  ],
};

// ============================================================================
// RuleSet Registry
// ============================================================================

const VERTICAL_RULESETS: Record<string, VerticalRuleSet> = {
  language_learning: {
    verticalId: 'language_learning',
    label: 'Language Learning',
    recommendations: LANGUAGE_LEARNING_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.language_learning,
    hookPatterns: VERTICAL_HOOK_PATTERNS.language_learning,
  },
  rewards: {
    verticalId: 'rewards',
    label: 'Rewards & Cashback',
    recommendations: REWARDS_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.rewards,
    hookPatterns: VERTICAL_HOOK_PATTERNS.rewards,
  },
  finance: {
    verticalId: 'finance',
    label: 'Finance & Investing',
    recommendations: FINANCE_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.finance,
    hookPatterns: VERTICAL_HOOK_PATTERNS.finance,
  },
  dating: {
    verticalId: 'dating',
    label: 'Dating & Relationships',
    recommendations: DATING_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.dating,
    hookPatterns: VERTICAL_HOOK_PATTERNS.dating,
  },
  productivity: {
    verticalId: 'productivity',
    label: 'Productivity & Task Management',
    recommendations: PRODUCTIVITY_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.productivity,
    hookPatterns: VERTICAL_HOOK_PATTERNS.productivity,
  },
  health: {
    verticalId: 'health',
    label: 'Health & Fitness',
    recommendations: HEALTH_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.health,
    hookPatterns: VERTICAL_HOOK_PATTERNS.health,
  },
  entertainment: {
    verticalId: 'entertainment',
    label: 'Entertainment',
    recommendations: ENTERTAINMENT_RECOMMENDATIONS,
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.entertainment,
    hookPatterns: VERTICAL_HOOK_PATTERNS.entertainment,
  },
  base: {
    verticalId: 'base',
    label: 'Base (Generic)',
    recommendations: {},
    genericPhraseExamples: VERTICAL_GENERIC_PHRASES.base,
    hookPatterns: VERTICAL_HOOK_PATTERNS.base,
  },
};

// ============================================================================
// Loader Functions
// ============================================================================

/**
 * Load ruleset for a specific vertical
 */
export function loadVerticalRuleSet(verticalId: string): VerticalRuleSet | null {
  const ruleset = VERTICAL_RULESETS[verticalId];
  if (!ruleset) {
    console.warn(`[RULESET-LOADER] No ruleset found for vertical: ${verticalId}, using base`);
    return VERTICAL_RULESETS.base;
  }

  console.log(`[RULESET-LOADER] Loaded ruleset for vertical: ${verticalId}`);
  return ruleset;
}

/**
 * Get all recommendation templates for a vertical
 */
export function getVerticalRecommendations(verticalId: string): RecommendationTemplateMap {
  const ruleset = loadVerticalRuleSet(verticalId);
  return ruleset?.recommendations || {};
}

/**
 * Get generic phrase examples for a vertical
 */
export function getGenericPhraseExamples(verticalId: string, count: number = 3): string[] {
  const ruleset = loadVerticalRuleSet(verticalId);
  return ruleset?.genericPhraseExamples.slice(0, count) || [];
}

/**
 * Format generic phrase examples for recommendations
 */
export function formatGenericPhraseExamples(verticalId: string, count: number = 2): string {
  const examples = getGenericPhraseExamples(verticalId, count);
  if (examples.length === 0) {
    return '';
  }
  const formattedExamples = examples.map(e => `'${e}'`).join(', ');
  return ` (e.g. ${formattedExamples})`;
}
