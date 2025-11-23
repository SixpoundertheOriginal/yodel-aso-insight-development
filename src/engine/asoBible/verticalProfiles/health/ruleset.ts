/**
 * Health Vertical RuleSet
 *
 * Overrides for health and fitness apps (e.g., Fitbit, MyFitnessPal, Calm)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import { HEALTH_INTENT_PATTERNS } from '../../commonPatterns/intentPatterns';
import { HEALTH_HOOK_PATTERNS } from '../../commonPatterns/hookPatterns';
import { HEALTH_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { HEALTH_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Health Vertical RuleSet
 */
export const healthRuleSet: AsoBibleRuleSet = {
  id: 'vertical_health',
  label: 'Health & Fitness Vertical',
  description: 'Overrides for health and fitness apps',
  source: 'vertical',
  version: '1.0.0',

  // KPI weight adjustments (minimal)
  kpiOverrides: {
    intent_alignment: {
      weight: 1.2,
    },
    hook_strength: {
      weight: 1.15,
    },
  },

  // Formula overrides (minimal)
  formulaOverrides: {},

  // Intent pattern overrides
  intentOverrides: {
    informational: {
      patterns: HEALTH_INTENT_PATTERNS.informational,
      weight: 1.2,
    },
    commercial: {
      patterns: HEALTH_INTENT_PATTERNS.commercial,
      weight: 1.1,
    },
    transactional: {
      patterns: HEALTH_INTENT_PATTERNS.transactional,
      weight: 1.2,
    },
    navigational: {
      patterns: HEALTH_INTENT_PATTERNS.navigational,
      weight: 0.9,
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: HEALTH_HOOK_PATTERNS.learning_educational,
      weight: 1.1,
    },
    outcome_benefit: {
      patterns: HEALTH_HOOK_PATTERNS.outcome_benefit,
      weight: 1.4,
    },
    status_authority: {
      patterns: HEALTH_HOOK_PATTERNS.status_authority,
      weight: 1.2,
    },
    ease_of_use: {
      patterns: HEALTH_HOOK_PATTERNS.ease_of_use,
      weight: 1.1,
    },
    time_to_result: {
      patterns: HEALTH_HOOK_PATTERNS.time_to_result,
      weight: 1.2,
    },
    trust_safety: {
      patterns: HEALTH_HOOK_PATTERNS.trust_safety,
      weight: 1.2,
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: HEALTH_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: HEALTH_RECOMMENDATIONS,
};

export default healthRuleSet;
