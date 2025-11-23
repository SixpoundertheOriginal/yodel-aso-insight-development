/**
 * Productivity Vertical RuleSet
 *
 * Overrides for productivity apps (e.g., Todoist, Notion, Evernote)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import { PRODUCTIVITY_INTENT_PATTERNS } from '../../commonPatterns/intentPatterns';
import { PRODUCTIVITY_HOOK_PATTERNS } from '../../commonPatterns/hookPatterns';
import { PRODUCTIVITY_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { PRODUCTIVITY_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Productivity Vertical RuleSet
 */
export const productivityRuleSet: AsoBibleRuleSet = {
  id: 'vertical_productivity',
  label: 'Productivity Vertical',
  description: 'Overrides for productivity and task management apps',
  source: 'vertical',
  version: '1.0.0',

  // KPI weight adjustments (minimal)
  kpiOverrides: {
    intent_alignment: {
      weight: 1.2,
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
      patterns: PRODUCTIVITY_INTENT_PATTERNS.informational,
      weight: 1.2,
    },
    commercial: {
      patterns: PRODUCTIVITY_INTENT_PATTERNS.commercial,
      weight: 1.0,
    },
    transactional: {
      patterns: PRODUCTIVITY_INTENT_PATTERNS.transactional,
      weight: 1.2,
    },
    navigational: {
      patterns: PRODUCTIVITY_INTENT_PATTERNS.navigational,
      weight: 0.9,
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: PRODUCTIVITY_HOOK_PATTERNS.learning_educational,
      weight: 1.0,
    },
    outcome_benefit: {
      patterns: PRODUCTIVITY_HOOK_PATTERNS.outcome_benefit,
      weight: 1.3,
    },
    status_authority: {
      patterns: PRODUCTIVITY_HOOK_PATTERNS.status_authority,
      weight: 1.1,
    },
    ease_of_use: {
      patterns: PRODUCTIVITY_HOOK_PATTERNS.ease_of_use,
      weight: 1.3,
    },
    time_to_result: {
      patterns: PRODUCTIVITY_HOOK_PATTERNS.time_to_result,
      weight: 1.1,
    },
    trust_safety: {
      patterns: PRODUCTIVITY_HOOK_PATTERNS.trust_safety,
      weight: 1.1,
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: PRODUCTIVITY_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: PRODUCTIVITY_RECOMMENDATIONS,
};

export default productivityRuleSet;
