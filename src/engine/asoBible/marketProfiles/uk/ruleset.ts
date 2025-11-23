/**
 * UK Market RuleSet
 *
 * Overrides for United Kingdom market (en-GB)
 *
 * Phase 9: Market-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';

/**
 * UK Market RuleSet
 */
export const ukMarketRuleSet: AsoBibleRuleSet = {
  id: 'market_uk',
  label: 'UK Market',
  description: 'Locale-specific overrides for United Kingdom (en-GB)',
  source: 'market',
  version: '1.0.0',

  // No KPI overrides
  kpiOverrides: {},

  // No formula overrides
  formulaOverrides: {},

  // No intent overrides
  intentOverrides: {},

  // No hook overrides
  hookOverrides: {},

  // No recommendation overrides
  recommendationOverrides: {},

  // Stopword overrides (UK English)
  stopwordOverrides: [
    // Common UK English stopwords
    'whilst',
    'amongst',
    'cheers',
    'mate',
    'brilliant',
  ],

  // Character limits (UK App Store - same as US)
  characterLimits: {
    title: 30,
    subtitle: 30,
  },
};

export default ukMarketRuleSet;
