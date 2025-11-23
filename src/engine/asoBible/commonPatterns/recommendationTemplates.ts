/**
 * Recommendation Templates by Vertical
 *
 * Maps vertical IDs to recommendation templates for common issues.
 * Used to provide vertical-specific guidance and suggestions.
 *
 * Phase 9: Intelligence layer for vertical-aware recommendations
 */

export interface RecommendationTemplate {
  id: string;
  trigger: string; // What triggers this recommendation
  message: string; // Recommendation message
  severity: 'info' | 'warning' | 'critical';
  category: 'hook' | 'intent' | 'token' | 'structure' | 'generic';
}

export type RecommendationTemplateMap = Record<string, RecommendationTemplate>;

/**
 * Recommendation templates for language learning vertical
 */
export const LANGUAGE_LEARNING_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_learning_hook: {
    id: 'missing_learning_hook',
    trigger: 'No educational hooks detected in title/subtitle',
    message:
      "Your title lacks educational hooks such as 'learn', 'practice', or 'speak fluently'. Adding 1–2 learning-focused terms improves educational intent visibility and category relevance.",
    severity: 'warning',
    category: 'hook',
  },
  missing_language_term: {
    id: 'missing_language_term',
    trigger: 'No language-specific terms in metadata',
    message:
      "Consider adding language names (e.g., 'Spanish', 'French', 'English') to improve search relevance for users looking for specific language courses.",
    severity: 'info',
    category: 'token',
  },
  generic_value_prop: {
    id: 'generic_value_prop',
    trigger: 'Value proposition too generic',
    message:
      "Language learning apps benefit from specific outcomes like 'speak fluently in 30 days' or 'master grammar' rather than generic terms like 'best app'.",
    severity: 'info',
    category: 'intent',
  },
  missing_skill_focus: {
    id: 'missing_skill_focus',
    trigger: 'No skill-specific focus (speaking, reading, writing)',
    message:
      "Specify which language skills your app focuses on (e.g., 'conversation', 'vocabulary', 'pronunciation') to attract users with specific learning goals.",
    severity: 'info',
    category: 'token',
  },
};

/**
 * Recommendation templates for rewards vertical
 */
export const REWARDS_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_earning_term: {
    id: 'missing_earning_term',
    trigger: 'No earning-related terms detected',
    message:
      "Add at least one earning-related term (e.g., 'earn', 'cash out', 'rewards', 'get paid'). This is core to rewards vertical visibility and user intent matching.",
    severity: 'critical',
    category: 'token',
  },
  missing_reward_type: {
    id: 'missing_reward_type',
    trigger: 'No specific reward types mentioned',
    message:
      "Specify reward types (e.g., 'gift cards', 'PayPal cash', 'Amazon rewards') to improve conversion. Users want to know what they can earn.",
    severity: 'warning',
    category: 'intent',
  },
  missing_trust_signal: {
    id: 'missing_trust_signal',
    trigger: 'No trust/legitimacy signals',
    message:
      "Rewards apps benefit from trust signals like 'real money', 'guaranteed payout', or 'millions paid out'. Add 1–2 trust terms to overcome skepticism.",
    severity: 'warning',
    category: 'hook',
  },
  missing_ease_hook: {
    id: 'missing_ease_hook',
    trigger: 'No ease-of-earning hooks',
    message:
      "Add ease-of-use hooks like 'easy to earn', 'instant rewards', or 'no hassle' to reduce perceived effort and increase conversion.",
    severity: 'info',
    category: 'hook',
  },
};

/**
 * Recommendation templates for finance vertical
 */
export const FINANCE_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_trust_term: {
    id: 'missing_trust_term',
    trigger: 'No trust/security terms detected',
    message:
      "Finance apps require trust signals ('secure', 'safe', 'FDIC insured', 'bank-grade security'). Add at least one to improve user confidence and conversion.",
    severity: 'critical',
    category: 'token',
  },
  missing_action_verb: {
    id: 'missing_action_verb',
    trigger: 'No financial action verbs',
    message:
      "Include action verbs like 'invest', 'save', 'budget', or 'track' to clarify your app's primary function and improve intent matching.",
    severity: 'warning',
    category: 'intent',
  },
  missing_outcome: {
    id: 'missing_outcome',
    trigger: 'No outcome-focused messaging',
    message:
      "Finance apps benefit from outcome-focused hooks like 'grow wealth', 'save money', or 'build portfolio'. Add 1–2 benefit statements.",
    severity: 'info',
    category: 'hook',
  },
  missing_compliance: {
    id: 'missing_compliance',
    trigger: 'No compliance/regulatory mentions',
    message:
      "Consider mentioning regulatory compliance ('FDIC insured', 'licensed', 'regulated') if applicable. This builds trust in the finance vertical.",
    severity: 'info',
    category: 'token',
  },
};

/**
 * Recommendation templates for dating vertical
 */
export const DATING_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_social_term: {
    id: 'missing_social_term',
    trigger: 'No social connection terms',
    message:
      "Dating apps score better with connection terms ('meet', 'match', 'chat', 'connect'). Add at least one to improve category relevance.",
    severity: 'warning',
    category: 'token',
  },
  missing_relationship_type: {
    id: 'missing_relationship_type',
    trigger: 'No relationship type specified',
    message:
      "Clarify what type of relationships users can find (e.g., 'serious relationships', 'casual dating', 'friendships') to attract the right audience.",
    severity: 'info',
    category: 'intent',
  },
  missing_safety_signal: {
    id: 'missing_safety_signal',
    trigger: 'No safety/verification terms',
    message:
      "Dating apps benefit from safety signals like 'verified profiles', 'safe', or 'authentic users'. Add 1–2 trust terms to reduce safety concerns.",
    severity: 'warning',
    category: 'hook',
  },
  missing_outcome_hook: {
    id: 'missing_outcome_hook',
    trigger: 'No outcome-focused hooks',
    message:
      "Add outcome hooks like 'find love', 'meaningful connections', or 'meet your match' to clarify the value proposition.",
    severity: 'info',
    category: 'hook',
  },
};

/**
 * Recommendation templates for productivity vertical
 */
export const PRODUCTIVITY_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_action_verb: {
    id: 'missing_action_verb',
    trigger: 'No productivity action verbs',
    message:
      "'Organize' / 'Plan' / 'Track' / 'Manage' terms help clarify your category signal and improve intent matching. Add at least one action verb.",
    severity: 'warning',
    category: 'token',
  },
  missing_use_case: {
    id: 'missing_use_case',
    trigger: 'No specific use case mentioned',
    message:
      "Specify what users can organize/manage (e.g., 'tasks', 'projects', 'notes', 'calendar') to improve search relevance.",
    severity: 'info',
    category: 'intent',
  },
  missing_outcome: {
    id: 'missing_outcome',
    trigger: 'No outcome-focused messaging',
    message:
      "Productivity apps benefit from outcome hooks like 'boost productivity', 'save time', or 'get organized'. Add 1–2 benefit statements.",
    severity: 'info',
    category: 'hook',
  },
  missing_ease_hook: {
    id: 'missing_ease_hook',
    trigger: 'No ease-of-use hooks',
    message:
      "Add ease-of-use hooks like 'simple', 'intuitive', or 'easy to use' to reduce perceived complexity and increase adoption.",
    severity: 'info',
    category: 'hook',
  },
};

/**
 * Recommendation templates for health vertical
 */
export const HEALTH_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_fitness_keyword: {
    id: 'missing_fitness_keyword',
    trigger: 'No fitness/health keywords',
    message:
      "Add one health anchor keyword ('fitness', 'workout', 'health', 'wellness', 'tracking') for category relevance and search visibility.",
    severity: 'warning',
    category: 'token',
  },
  missing_metric_type: {
    id: 'missing_metric_type',
    trigger: 'No specific health metrics mentioned',
    message:
      "Specify what health metrics you track (e.g., 'steps', 'calories', 'heart rate', 'sleep') to attract users with specific goals.",
    severity: 'info',
    category: 'intent',
  },
  missing_outcome: {
    id: 'missing_outcome',
    trigger: 'No outcome-focused messaging',
    message:
      "Health apps benefit from outcome hooks like 'lose weight', 'get fit', or 'feel better'. Add 1–2 health outcome statements.",
    severity: 'info',
    category: 'hook',
  },
  missing_authority: {
    id: 'missing_authority',
    trigger: 'No authority/credibility signals',
    message:
      "Consider adding authority signals like 'doctor recommended', 'scientifically proven', or 'certified' if applicable to build trust.",
    severity: 'info',
    category: 'hook',
  },
};

/**
 * Recommendation templates for entertainment vertical
 */
export const ENTERTAINMENT_RECOMMENDATIONS: RecommendationTemplateMap = {
  missing_consumption_intent: {
    id: 'missing_consumption_intent',
    trigger: 'No consumption intent verbs',
    message:
      "Include a consumption verb like 'watch', 'play', 'stream', or 'listen' to clarify the primary user action and improve intent matching.",
    severity: 'warning',
    category: 'token',
  },
  missing_content_type: {
    id: 'missing_content_type',
    trigger: 'No specific content types mentioned',
    message:
      "Specify content types (e.g., 'movies', 'shows', 'music', 'videos') to improve search relevance and user expectations.",
    severity: 'info',
    category: 'intent',
  },
  missing_value_prop: {
    id: 'missing_value_prop',
    trigger: 'No value proposition hooks',
    message:
      "Entertainment apps benefit from value hooks like 'unlimited', 'ad-free', 'exclusive content', or 'premium quality'. Add 1–2 value statements.",
    severity: 'info',
    category: 'hook',
  },
  missing_access_hook: {
    id: 'missing_access_hook',
    trigger: 'No access/availability hooks',
    message:
      "Add access hooks like 'instant streaming', 'watch now', or 'unlimited access' to reduce friction and improve conversion.",
    severity: 'info',
    category: 'hook',
  },
};

/**
 * Map of all vertical recommendation templates
 */
export const VERTICAL_RECOMMENDATION_TEMPLATES: Record<
  string,
  RecommendationTemplateMap
> = {
  language_learning: LANGUAGE_LEARNING_RECOMMENDATIONS,
  rewards: REWARDS_RECOMMENDATIONS,
  finance: FINANCE_RECOMMENDATIONS,
  dating: DATING_RECOMMENDATIONS,
  productivity: PRODUCTIVITY_RECOMMENDATIONS,
  health: HEALTH_RECOMMENDATIONS,
  entertainment: ENTERTAINMENT_RECOMMENDATIONS,
};

/**
 * Get recommendation templates for a specific vertical
 *
 * @param verticalId - Vertical ID (e.g., "rewards", "language_learning")
 * @returns Recommendation template map or undefined if vertical not found
 */
export function getRecommendationTemplatesForVertical(
  verticalId: string
): RecommendationTemplateMap | undefined {
  return VERTICAL_RECOMMENDATION_TEMPLATES[verticalId];
}

/**
 * Get a specific recommendation template
 *
 * @param verticalId - Vertical ID
 * @param templateId - Template ID (e.g., "missing_earning_term")
 * @returns Recommendation template or undefined if not found
 */
export function getRecommendationTemplate(
  verticalId: string,
  templateId: string
): RecommendationTemplate | undefined {
  const templates = getRecommendationTemplatesForVertical(verticalId);
  if (!templates) {
    return undefined;
  }

  return templates[templateId];
}

/**
 * Get all critical recommendations for a vertical
 *
 * @param verticalId - Vertical ID
 * @returns Array of critical recommendation templates
 */
export function getCriticalRecommendations(
  verticalId: string
): RecommendationTemplate[] {
  const templates = getRecommendationTemplatesForVertical(verticalId);
  if (!templates) {
    return [];
  }

  return Object.values(templates).filter(
    (template) => template.severity === 'critical'
  );
}

/**
 * Get recommendations by category
 *
 * @param verticalId - Vertical ID
 * @param category - Recommendation category
 * @returns Array of recommendation templates in that category
 */
export function getRecommendationsByCategory(
  verticalId: string,
  category: RecommendationTemplate['category']
): RecommendationTemplate[] {
  const templates = getRecommendationTemplatesForVertical(verticalId);
  if (!templates) {
    return [];
  }

  return Object.values(templates).filter(
    (template) => template.category === category
  );
}
