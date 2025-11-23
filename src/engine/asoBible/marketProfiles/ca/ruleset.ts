/**
 * Canada Market RuleSet
 *
 * Overrides for Canada market (en-CA, fr-CA)
 *
 * Phase 9: Market-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';

/**
 * Canada Market RuleSet
 */
export const caMarketRuleSet: AsoBibleRuleSet = {
  id: 'market_ca',
  label: 'Canada Market',
  description: 'Locale-specific overrides for Canada (en-CA, fr-CA)',
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

  // Stopword overrides (Canadian English + French)
  stopwordOverrides: [
    // Canadian English
    'eh',
    'aboot',
    // Common French stopwords
    'et',
    'ou',
    'mais',
    'donc',
    'le',
    'la',
    'les',
    'un',
    'une',
    'des',
  ],

  // Character limits (Canada App Store - same as US)
  characterLimits: {
    title: 30,
    subtitle: 30,
  },
};

export default caMarketRuleSet;
