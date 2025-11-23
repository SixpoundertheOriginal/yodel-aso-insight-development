/**
 * Entertainment Vertical RuleSet
 *
 * Overrides for entertainment apps (e.g., Netflix, Spotify, Disney+)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import { ENTERTAINMENT_INTENT_PATTERNS } from '../../commonPatterns/intentPatterns';
import { ENTERTAINMENT_HOOK_PATTERNS } from '../../commonPatterns/hookPatterns';
import { ENTERTAINMENT_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { ENTERTAINMENT_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Entertainment Vertical RuleSet
 */
export const entertainmentRuleSet: AsoBibleRuleSet = {
  id: 'vertical_entertainment',
  label: 'Entertainment Vertical',
  description: 'Overrides for entertainment and streaming apps',
  source: 'vertical',
  version: '1.0.0',

  // KPI weight adjustments (minimal)
  kpiOverrides: {
    intent_alignment: {
      weight: 1.1,
    },
    hook_strength: {
      weight: 1.1,
    },
  },

  // Formula overrides (minimal)
  formulaOverrides: {},

  // Intent pattern overrides
  intentOverrides: {
    informational: {
      patterns: ENTERTAINMENT_INTENT_PATTERNS.informational,
      weight: 1.1,
    },
    commercial: {
      patterns: ENTERTAINMENT_INTENT_PATTERNS.commercial,
      weight: 1.1,
    },
    transactional: {
      patterns: ENTERTAINMENT_INTENT_PATTERNS.transactional,
      weight: 1.3,
    },
    navigational: {
      patterns: ENTERTAINMENT_INTENT_PATTERNS.navigational,
      weight: 0.9,
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: ENTERTAINMENT_HOOK_PATTERNS.learning_educational,
      weight: 0.8,
    },
    outcome_benefit: {
      patterns: ENTERTAINMENT_HOOK_PATTERNS.outcome_benefit,
      weight: 1.3,
    },
    status_authority: {
      patterns: ENTERTAINMENT_HOOK_PATTERNS.status_authority,
      weight: 1.2,
    },
    ease_of_use: {
      patterns: ENTERTAINMENT_HOOK_PATTERNS.ease_of_use,
      weight: 1.2,
    },
    time_to_result: {
      patterns: ENTERTAINMENT_HOOK_PATTERNS.time_to_result,
      weight: 1.2,
    },
    trust_safety: {
      patterns: ENTERTAINMENT_HOOK_PATTERNS.trust_safety,
      weight: 1.0,
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: ENTERTAINMENT_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: ENTERTAINMENT_RECOMMENDATIONS,
};

export default entertainmentRuleSet;
