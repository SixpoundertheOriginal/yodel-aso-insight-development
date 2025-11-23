/**
 * Language Learning Vertical RuleSet
 *
 * Overrides for language learning apps (e.g., Duolingo, Pimsleur, Babbel)
 *
 * Phase 9: Vertical-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';
import {
  LANGUAGE_LEARNING_INTENT_PATTERNS,
  type IntentPatternMap,
} from '../../commonPatterns/intentPatterns';
import {
  LANGUAGE_LEARNING_HOOK_PATTERNS,
  type HookPatternMap,
} from '../../commonPatterns/hookPatterns';
import { LANGUAGE_LEARNING_TOKEN_OVERRIDES } from '../../commonPatterns/tokenOverrides';
import { LANGUAGE_LEARNING_RECOMMENDATIONS } from '../../commonPatterns/recommendationTemplates';

/**
 * Language Learning Vertical RuleSet
 */
export const languageLearningRuleSet: AsoBibleRuleSet = {
  id: 'vertical_language_learning',
  label: 'Language Learning Vertical',
  description: 'Overrides for language learning apps',
  source: 'vertical',
  version: '1.0.0',

  // KPI weight adjustments (minimal)
  kpiOverrides: {
    intent_alignment: {
      weight: 1.2, // Boost intent alignment for educational apps
    },
    hook_strength: {
      weight: 1.1, // Educational hooks are important
    },
  },

  // Formula overrides (minimal)
  formulaOverrides: {},

  // Intent pattern overrides
  intentOverrides: {
    informational: {
      patterns: LANGUAGE_LEARNING_INTENT_PATTERNS.informational,
      weight: 1.2, // Boost informational intent
    },
    commercial: {
      patterns: LANGUAGE_LEARNING_INTENT_PATTERNS.commercial,
      weight: 1.0,
    },
    transactional: {
      patterns: LANGUAGE_LEARNING_INTENT_PATTERNS.transactional,
      weight: 1.0,
    },
    navigational: {
      patterns: LANGUAGE_LEARNING_INTENT_PATTERNS.navigational,
      weight: 0.9, // Reduce navigational (brand) weight
    },
  },

  // Hook pattern overrides
  hookOverrides: {
    learning_educational: {
      patterns: LANGUAGE_LEARNING_HOOK_PATTERNS.learning_educational,
      weight: 1.3, // Strong boost for educational hooks
    },
    outcome_benefit: {
      patterns: LANGUAGE_LEARNING_HOOK_PATTERNS.outcome_benefit,
      weight: 1.2,
    },
    status_authority: {
      patterns: LANGUAGE_LEARNING_HOOK_PATTERNS.status_authority,
      weight: 1.1,
    },
    ease_of_use: {
      patterns: LANGUAGE_LEARNING_HOOK_PATTERNS.ease_of_use,
      weight: 1.1,
    },
    time_to_result: {
      patterns: LANGUAGE_LEARNING_HOOK_PATTERNS.time_to_result,
      weight: 1.0,
    },
    trust_safety: {
      patterns: LANGUAGE_LEARNING_HOOK_PATTERNS.trust_safety,
      weight: 1.0,
    },
  },

  // Token relevance overrides
  tokenRelevanceOverrides: LANGUAGE_LEARNING_TOKEN_OVERRIDES,

  // Recommendation template overrides
  recommendationOverrides: LANGUAGE_LEARNING_RECOMMENDATIONS,
};

export default languageLearningRuleSet;
