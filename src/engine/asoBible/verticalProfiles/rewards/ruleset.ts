/**
 * Rewards Vertical RuleSet
 *
 * Overrides for rewards and cashback apps (e.g., Mistplay, Fetch Rewards, Rakuten)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import {
  REWARDS_INTENT_PATTERNS,
  type IntentPatternMap,
} from '../../commonPatterns/intentPatterns';
import {
  REWARDS_HOOK_PATTERNS,
  type HookPatternMap,
} from '../../commonPatterns/hookPatterns';
import { REWARDS_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { REWARDS_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Rewards Vertical RuleSet
 */
export const rewardsRuleSet: AsoBibleRuleSet = {
  id: 'vertical_rewards',
  label: 'Rewards & Cashback Vertical',
  description: 'Overrides for rewards and cashback apps',
  source: 'vertical',
  version: '1.0.0',

  // KPI weight adjustments (minimal)
  kpiOverrides: {
    intent_alignment: {
      weight: 1.2, // Boost intent alignment for earning-focused apps
    },
    hook_strength: {
      weight: 1.15, // Outcome/benefit hooks are critical
    },
    brand_balance: {
      weight: 0.8, // Reduce brand balance (PayPal, Amazon are features, not brand spam)
    },
  },

  // Formula overrides (minimal)
  formulaOverrides: {
    combo_quality: 1.1, // Boost combo quality for earning-related combos
  },

  // Intent pattern overrides
  intentOverrides: {
    informational: {
      patterns: REWARDS_INTENT_PATTERNS.informational,
      weight: 1.3, // Strong boost for informational (how to earn)
    },
    commercial: {
      patterns: REWARDS_INTENT_PATTERNS.commercial,
      weight: 1.0,
    },
    transactional: {
      patterns: REWARDS_INTENT_PATTERNS.transactional,
      weight: 1.2, // Boost transactional (cash out, redeem)
    },
    navigational: {
      patterns: REWARDS_INTENT_PATTERNS.navigational,
      weight: 0.8, // Reduce navigational weight
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: REWARDS_HOOK_PATTERNS.learning_educational,
      weight: 0.9, // Lower educational hook weight
    },
    outcome_benefit: {
      patterns: REWARDS_HOOK_PATTERNS.outcome_benefit,
      weight: 1.4, // Strong boost for outcome/benefit hooks (earn cash, etc.)
    },
    status_authority: {
      patterns: REWARDS_HOOK_PATTERNS.status_authority,
      weight: 1.1,
    },
    ease_of_use: {
      patterns: REWARDS_HOOK_PATTERNS.ease_of_use,
      weight: 1.2, // Ease is important for rewards apps
    },
    time_to_result: {
      patterns: REWARDS_HOOK_PATTERNS.time_to_result,
      weight: 1.3, // Time-to-payout is critical
    },
    trust_safety: {
      patterns: REWARDS_HOOK_PATTERNS.trust_safety,
      weight: 1.3, // Trust/legitimacy is critical for rewards
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: REWARDS_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: REWARDS_RECOMMENDATIONS,
};

export default rewardsRuleSet;
