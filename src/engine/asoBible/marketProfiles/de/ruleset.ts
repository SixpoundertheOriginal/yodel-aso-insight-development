/**
 * Germany Market RuleSet
 *
 * Overrides for Germany market (de-DE)
 *
 * Phase 9: Market-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';

/**
 * Germany Market RuleSet
 */
export const deMarketRuleSet: AsoBibleRuleSet = {
  id: 'market_de',
  label: 'Germany Market',
  description: 'Locale-specific overrides for Germany (de-DE)',
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

  // Stopword overrides (German)
  stopwordOverrides: [
    // Common German stopwords
    'der',
    'die',
    'das',
    'den',
    'dem',
    'des',
    'ein',
    'eine',
    'einer',
    'eines',
    'und',
    'oder',
    'aber',
    'mit',
    'von',
    'zu',
    'für',
    'auf',
    'in',
    'an',
    'bei',
    'nach',
  ],

  // Character limits (Germany App Store - same as US)
  characterLimits: {
    title: 30,
    subtitle: 30,
  },
};

export default deMarketRuleSet;
