/**
 * US Market RuleSet
 *
 * Overrides for United States market (en-US)
 *
 * Phase 9: Market-specific intelligence
 */

import type { AsoBibleRuleSet } from '../../ruleset.types';

/**
 * US Market RuleSet
 */
export const usMarketRuleSet: AsoBibleRuleSet = {
  id: 'market_us',
  label: 'US Market',
  description: 'Locale-specific overrides for United States (en-US)',
  source: 'market',
  version: '1.0.0',

  // No KPI overrides (markets don't change KPIs)
  kpiOverrides: {},

  // No formula overrides
  formulaOverrides: {},

  // No intent overrides (intents are vertical-specific)
  intentOverrides: {},

  // No hook overrides (hooks are vertical-specific)
  hookOverrides: {},

  // No recommendation overrides (recommendations are vertical-specific)
  recommendationOverrides: {},

  // Stopword overrides (US English)
  stopwordOverrides: [
    // Common US English stopwords (minimal additions to global list)
    'gonna',
    'wanna',
    'gotta',
    'kinda',
    'sorta',
  ],

  // Character limits (US App Store)
  characterLimits: {
    title: 30, // US App Store title limit
    subtitle: 30, // US App Store subtitle limit
  },
};

export default usMarketRuleSet;
