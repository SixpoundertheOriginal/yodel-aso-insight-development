/**
 * Combo Tokenizer Utility
 *
 * Tokenizes combos to show source breakdown and stopword analysis.
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

export interface TokenizedCombo {
  combo: string;
  tokens: string[];
  meaningfulTokens: string[];
  stopwords: string[];
}

/**
 * Tokenizes a combo into meaningful tokens and stopwords
 */
export function tokenizeCombo(combo: string, stopwords: Set<string>): TokenizedCombo {
  const tokens = combo.split(' ').filter((t) => t.length > 0);
  const meaningful = tokens.filter((t) => !stopwords.has(t.toLowerCase()) && t.length > 2);
  const stopwordTokens = tokens.filter((t) => stopwords.has(t.toLowerCase()));

  return {
    combo,
    tokens,
    meaningfulTokens: meaningful,
    stopwords: stopwordTokens,
  };
}

/**
 * Gets source explanation for a combo
 */
export function getSourceExplanation(combo: ClassifiedCombo): string {
  const source = combo.source || 'unknown';

  switch (source) {
    case 'title':
      return 'Generated from title tokens only. No subtitle keywords involved.';
    case 'subtitle':
      return 'Generated from subtitle tokens only. These are incremental keywords not in the title.';
    case 'title+subtitle':
      return 'Cross-element combination. Created by pairing title and subtitle tokens together for broader coverage.';
    default:
      return 'Source unknown. This combo may be from legacy analysis.';
  }
}

/**
 * Gets combo type explanation
 */
export function getTypeExplanation(combo: ClassifiedCombo): string {
  switch (combo.type) {
    case 'branded':
      return 'Contains app or brand name. Helps returning users find you. Lower discovery value for new users.';
    case 'generic':
      return 'Generic discovery keywords. High value for reaching users who don\'t know your brand yet.';
    case 'low_value':
      return 'Time-bound, numeric, or promotional phrases with limited long-term ranking value.';
  }
}
