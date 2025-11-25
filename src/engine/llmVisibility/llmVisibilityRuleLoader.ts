/**
 * LLM Visibility Rule Loader
 *
 * Loads and merges LLM visibility rules following the ASO Bible pattern:
 * Base → Vertical → Market → Client
 *
 * Follows same patterns as:
 * - src/engine/asoBible/rulesetLoader.ts
 * - src/engine/metadata/kpi/kpiEngine.ts
 */

import type { LLMVisibilityRules, LLMVisibilityRuleOverride } from './llmVisibility.types';
import baseRules from './registry/llmVisibility.rules.json';

// ============================================================================
// Rule Loading & Merging
// ============================================================================

/**
 * Load effective LLM visibility rules for an app
 *
 * Inheritance chain: Base → Vertical → Market → Client
 *
 * @param options - Context for rule loading
 * @returns Merged rules (synchronous for backward compatibility)
 */
export function loadLLMVisibilityRules(options: {
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
}): LLMVisibilityRules {
  // Start with base rules
  let effectiveRules: LLMVisibilityRules = { ...baseRules } as LLMVisibilityRules;

  // Apply vertical-specific clusters if available (Phase 1 code-based)
  if (options.vertical) {
    effectiveRules = applyVerticalClusters(effectiveRules, options.vertical);
  }

  // Note: DB overrides are loaded asynchronously via loadLLMVisibilityRulesAsync()
  // This function remains synchronous for backward compatibility with existing code

  return effectiveRules;
}

/**
 * Load effective LLM visibility rules for an app (async version with DB support)
 *
 * Inheritance chain: Base → Vertical → Market → Client
 *
 * @param options - Context for rule loading
 * @returns Merged rules with DB overrides
 */
export async function loadLLMVisibilityRulesAsync(options: {
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
}): Promise<LLMVisibilityRules> {
  // Start with base rules (and code-based vertical clusters)
  let effectiveRules = loadLLMVisibilityRules(options);

  // Load DB overrides
  try {
    const [verticalOverrides, marketOverrides, clientOverrides] = await Promise.all([
      options.vertical ? loadVerticalRuleOverrides(options.vertical) : Promise.resolve(null),
      options.market ? loadMarketRuleOverrides(options.market) : Promise.resolve(null),
      options.organizationId ? loadClientRuleOverrides(options.organizationId, options.appId) : Promise.resolve(null),
    ]);

    // Merge all overrides (last wins)
    effectiveRules = mergeRules(
      effectiveRules,
      verticalOverrides,
      marketOverrides,
      clientOverrides
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('[LLM Rules] Loaded rules with DB overrides:', {
        vertical: options.vertical,
        market: options.market,
        organizationId: options.organizationId,
        hasVerticalOverrides: !!verticalOverrides,
        hasMarketOverrides: !!marketOverrides,
        hasClientOverrides: !!clientOverrides,
      });
    }
  } catch (error) {
    console.error('[LLM Rules] Error loading DB overrides, using base rules:', error);
  }

  return effectiveRules;
}

/**
 * Load vertical-specific rule overrides from DB
 */
export async function loadVerticalRuleOverrides(
  vertical: string
): Promise<Partial<LLMVisibilityRules> | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase
      .from('llm_visibility_rule_overrides')
      .select('rules_override')
      .eq('scope', 'vertical')
      .eq('vertical', vertical)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[LLM Rules] Error loading vertical override:', error);
      return null;
    }

    return data ? (data.rules_override as Partial<LLMVisibilityRules>) : null;
  } catch (error) {
    console.error('[LLM Rules] Failed to load vertical override:', error);
    return null;
  }
}

/**
 * Load market-specific rule overrides from DB
 */
export async function loadMarketRuleOverrides(
  market: string
): Promise<Partial<LLMVisibilityRules> | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase
      .from('llm_visibility_rule_overrides')
      .select('rules_override')
      .eq('scope', 'market')
      .eq('market', market)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[LLM Rules] Error loading market override:', error);
      return null;
    }

    return data ? (data.rules_override as Partial<LLMVisibilityRules>) : null;
  } catch (error) {
    console.error('[LLM Rules] Failed to load market override:', error);
    return null;
  }
}

/**
 * Load client-specific rule overrides from DB
 */
export async function loadClientRuleOverrides(
  organizationId: string,
  appId?: string
): Promise<Partial<LLMVisibilityRules> | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    let query = supabase
      .from('llm_visibility_rule_overrides')
      .select('rules_override')
      .eq('scope', 'client')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('version', { ascending: false });

    // If appId provided, prefer app-specific override, otherwise org-level
    if (appId) {
      query = query.eq('monitored_app_id', appId);
    } else {
      query = query.is('monitored_app_id', null);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.warn('[LLM Rules] Error loading client override:', error);
      return null;
    }

    return data ? (data.rules_override as Partial<LLMVisibilityRules>) : null;
  } catch (error) {
    console.error('[LLM Rules] Failed to load client override:', error);
    return null;
  }
}

/**
 * Merge rule overrides following precedence:
 * Base < Vertical < Market < Client (last wins)
 *
 * Deep merge strategy for nested objects
 */
export function mergeRules(
  base: LLMVisibilityRules,
  ...overrides: Array<Partial<LLMVisibilityRules> | null>
): LLMVisibilityRules {
  let merged = { ...base };

  for (const override of overrides) {
    if (!override) continue;

    // Merge weights
    if (override.weights) {
      merged.weights = { ...merged.weights, ...override.weights };
    }

    // Merge structure rules
    if (override.structure_rules) {
      merged.structure_rules = {
        ...merged.structure_rules,
        ...override.structure_rules,
      };
    }

    // Merge clusters (deep merge)
    if (override.clusters) {
      merged.clusters = {
        ...merged.clusters,
        ...override.clusters,
      };
    }

    // Merge factual rules
    if (override.factual_rules) {
      merged.factual_rules = {
        required_facts: override.factual_rules.required_facts || merged.factual_rules.required_facts,
        fact_patterns: {
          ...merged.factual_rules.fact_patterns,
          ...override.factual_rules.fact_patterns,
        },
        avoid_patterns: override.factual_rules.avoid_patterns || merged.factual_rules.avoid_patterns,
      };
    }

    // Merge intent rules
    if (override.intent_rules) {
      merged.intent_rules = {
        ...merged.intent_rules,
        ...override.intent_rules,
      };
    }

    // Merge snippet rules
    if (override.snippet_rules) {
      merged.snippet_rules = {
        ...merged.snippet_rules,
        ...override.snippet_rules,
      };
    }

    // Merge safety rules
    if (override.safety_rules) {
      merged.safety_rules = {
        forbidden_phrases: override.safety_rules.forbidden_phrases || merged.safety_rules.forbidden_phrases,
        risky_patterns: override.safety_rules.risky_patterns || merged.safety_rules.risky_patterns,
      };
    }
  }

  return merged;
}

// ============================================================================
// Vertical-Specific Rule Presets (Phase 1)
// ============================================================================

/**
 * Get vertical-specific cluster definitions
 *
 * These will eventually move to DB, but for Phase 1 we define them here
 */
export function getVerticalClusters(vertical: string): LLMVisibilityRules['clusters'] | null {
  const verticalClusters: Record<string, LLMVisibilityRules['clusters']> = {
    // Language Learning Apps
    language_learning: {
      core_functionality: {
        keywords: ['learn', 'study', 'practice', 'lesson', 'course', 'fluency', 'pronunciation'],
        weight: 1.0,
      },
      educational_method: {
        keywords: ['phonics', 'immersion', 'spaced repetition', 'games', 'quizzes', 'interactive'],
        weight: 0.95,
      },
      languages: {
        keywords: ['spanish', 'french', 'german', 'italian', 'chinese', 'japanese', 'english'],
        weight: 0.9,
      },
      target_audience: {
        keywords: ['kids', 'children', 'toddler', 'preschool', 'ages', 'adults', 'beginners'],
        weight: 0.85,
      },
      offline_mode: {
        keywords: ['offline', 'no wifi', 'download', 'airplane mode', 'travel'],
        weight: 0.75,
      },
      trust_safety: {
        keywords: ['safe', 'ad-free', 'privacy', 'family-friendly', 'kid-safe'],
        weight: 0.8,
      },
    },

    // Rewards & Cashback Apps
    rewards: {
      earning_mechanism: {
        keywords: ['earn', 'reward', 'cashback', 'points', 'money', 'cash'],
        weight: 1.0,
      },
      redemption: {
        keywords: ['redeem', 'gift card', 'paypal', 'withdraw', 'payout', 'prizes'],
        weight: 0.95,
      },
      activities: {
        keywords: ['play games', 'shop', 'surveys', 'watch videos', 'tasks', 'offers'],
        weight: 0.9,
      },
      legitimacy: {
        keywords: ['legitimate', 'real', 'verified', 'trusted', 'established', 'users'],
        weight: 0.85,
      },
      ease_of_use: {
        keywords: ['easy', 'simple', 'quick', 'fast', 'instant', 'no minimum'],
        weight: 0.75,
      },
      trust_safety: {
        keywords: ['safe', 'secure', 'privacy', 'no scam', 'trustworthy'],
        weight: 0.8,
      },
    },

    // Fitness & Health Apps
    health: {
      fitness_goals: {
        keywords: ['lose weight', 'build muscle', 'get fit', 'healthy', 'wellness', 'strength'],
        weight: 1.0,
      },
      workout_types: {
        keywords: ['cardio', 'yoga', 'hiit', 'strength training', 'running', 'cycling'],
        weight: 0.95,
      },
      tracking: {
        keywords: ['track', 'log', 'monitor', 'progress', 'calories', 'steps', 'heart rate'],
        weight: 0.9,
      },
      personalization: {
        keywords: ['custom', 'personalized', 'tailored', 'beginner', 'advanced', 'your level'],
        weight: 0.85,
      },
      convenience: {
        keywords: ['home', 'no equipment', 'short', 'quick', 'anytime', 'anywhere'],
        weight: 0.8,
      },
      trust_safety: {
        keywords: ['certified', 'expert', 'professional', 'safe', 'injury prevention'],
        weight: 0.75,
      },
    },
  };

  return verticalClusters[vertical] || null;
}

/**
 * Apply vertical-specific clusters to base rules
 */
export function applyVerticalClusters(
  baseRules: LLMVisibilityRules,
  vertical: string
): LLMVisibilityRules {
  const verticalClusters = getVerticalClusters(vertical);

  if (!verticalClusters) {
    return baseRules;
  }

  return {
    ...baseRules,
    clusters: {
      ...baseRules.clusters,
      ...verticalClusters,
    },
  };
}
