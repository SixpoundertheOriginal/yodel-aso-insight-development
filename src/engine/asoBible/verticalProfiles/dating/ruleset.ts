/**
 * Dating Vertical RuleSet
 *
 * Overrides for dating apps (e.g., Tinder, Bumble, Hinge)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import { DATING_INTENT_PATTERNS } from '../../commonPatterns/intentPatterns';
import { DATING_HOOK_PATTERNS } from '../../commonPatterns/hookPatterns';
import { DATING_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { DATING_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Dating Vertical RuleSet
 */
export const datingRuleSet: AsoBibleRuleSet = {
  id: 'vertical_dating',
  label: 'Dating Vertical',
  description: 'Overrides for dating apps',
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
      patterns: DATING_INTENT_PATTERNS.informational,
      weight: 1.2,
    },
    commercial: {
      patterns: DATING_INTENT_PATTERNS.commercial,
      weight: 1.0,
    },
    transactional: {
      patterns: DATING_INTENT_PATTERNS.transactional,
      weight: 1.3,
    },
    navigational: {
      patterns: DATING_INTENT_PATTERNS.navigational,
      weight: 0.8,
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: DATING_HOOK_PATTERNS.learning_educational,
      weight: 0.8,
    },
    outcome_benefit: {
      patterns: DATING_HOOK_PATTERNS.outcome_benefit,
      weight: 1.4,
    },
    status_authority: {
      patterns: DATING_HOOK_PATTERNS.status_authority,
      weight: 1.1,
    },
    ease_of_use: {
      patterns: DATING_HOOK_PATTERNS.ease_of_use,
      weight: 1.2,
    },
    time_to_result: {
      patterns: DATING_HOOK_PATTERNS.time_to_result,
      weight: 1.2,
    },
    trust_safety: {
      patterns: DATING_HOOK_PATTERNS.trust_safety,
      weight: 1.3,
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: DATING_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: DATING_RECOMMENDATIONS,
};

export default datingRuleSet;
