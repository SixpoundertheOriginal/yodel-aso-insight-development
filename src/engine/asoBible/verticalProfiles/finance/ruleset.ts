/**
 * Finance Vertical RuleSet
 *
 * Overrides for finance and investing apps (e.g., Revolut, Robinhood, Mint)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import { FINANCE_INTENT_PATTERNS } from '../../commonPatterns/intentPatterns';
import { FINANCE_HOOK_PATTERNS } from '../../commonPatterns/hookPatterns';
import { FINANCE_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { FINANCE_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Finance Vertical RuleSet
 */
export const financeRuleSet: AsoBibleRuleSet = {
  id: 'vertical_finance',
  label: 'Finance & Investing Vertical',
  description: 'Overrides for finance and investing apps',
  source: 'vertical',
  version: '1.0.0',

  // KPI weight adjustments (minimal)
  kpiOverrides: {
    intent_alignment: {
      weight: 1.15,
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
      patterns: FINANCE_INTENT_PATTERNS.informational,
      weight: 1.2,
    },
    commercial: {
      patterns: FINANCE_INTENT_PATTERNS.commercial,
      weight: 1.1,
    },
    transactional: {
      patterns: FINANCE_INTENT_PATTERNS.transactional,
      weight: 1.2,
    },
    navigational: {
      patterns: FINANCE_INTENT_PATTERNS.navigational,
      weight: 0.9,
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: FINANCE_HOOK_PATTERNS.learning_educational,
      weight: 1.1,
    },
    outcome_benefit: {
      patterns: FINANCE_HOOK_PATTERNS.outcome_benefit,
      weight: 1.3,
    },
    status_authority: {
      patterns: FINANCE_HOOK_PATTERNS.status_authority,
      weight: 1.2,
    },
    ease_of_use: {
      patterns: FINANCE_HOOK_PATTERNS.ease_of_use,
      weight: 1.1,
    },
    time_to_result: {
      patterns: FINANCE_HOOK_PATTERNS.time_to_result,
      weight: 1.1,
    },
    trust_safety: {
      patterns: FINANCE_HOOK_PATTERNS.trust_safety,
      weight: 1.4, // Critical for finance apps
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: FINANCE_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: FINANCE_RECOMMENDATIONS,
};

export default financeRuleSet;
