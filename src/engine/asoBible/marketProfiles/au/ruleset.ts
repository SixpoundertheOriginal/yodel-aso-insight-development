/**
 * Australia Market RuleSet
 *
 * Overrides for Australia market (en-AU)
 *
 * Phase 9: Market-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';

/**
 * Australia Market RuleSet
 */
export const auMarketRuleSet: AsoBibleRuleSet = {
  id: 'market_au',
  label: 'Australia Market',
  description: 'Locale-specific overrides for Australia (en-AU)',
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

  // Stopword overrides (Australian English)
  stopwordOverrides: [
    // Common Australian slang/stopwords
    'mate',
    'mates',
    'bloke',
    'bloody',
    'arvo',
    'servo',
  ],

  // Character limits (Australia App Store - same as US)
  characterLimits: {
    title: 30,
    subtitle: 30,
  },
};

export default auMarketRuleSet;
