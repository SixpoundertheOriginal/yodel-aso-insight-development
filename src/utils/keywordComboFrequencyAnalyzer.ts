/**
 * Keyword Combo Frequency Analyzer
 *
 * Analyzes which core keywords appear in the most combinations
 * to identify strategic keywords for search visibility targeting.
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

export interface KeywordComboFrequency {
  keyword: string;
  totalCombos: number;
  twoWordCombos: number;
  threeWordCombos: number;
  fourPlusCombos: number;
  /** Sample combos containing this keyword */
  sampleCombos: string[];
}

/**
 * Analyzes keyword frequency across all combos
 * Returns keywords sorted by total combo count (descending)
 */
export function analyzeKeywordComboFrequency(
  combos: ClassifiedCombo[]
): KeywordComboFrequency[] {
  // Map to track keyword stats
  const keywordStats = new Map<string, {
    total: number;
    twoWord: number;
    threeWord: number;
    fourPlus: number;
    combos: Set<string>;
  }>();

  // Process each combo
  for (const combo of combos) {
    // Skip noise/low-value combos
    if (combo.type === 'low_value') continue;

    // Extract individual keywords from combo text
    const keywords = combo.text
      .toLowerCase()
      .split(/\s+/)
      .filter(k => k.length > 0);

    const comboLength = keywords.length;

    // Track each keyword
    for (const keyword of keywords) {
      if (!keywordStats.has(keyword)) {
        keywordStats.set(keyword, {
          total: 0,
          twoWord: 0,
          threeWord: 0,
          fourPlus: 0,
          combos: new Set(),
        });
      }

      const stats = keywordStats.get(keyword)!;
      stats.total += 1;
      stats.combos.add(combo.text);

      // Increment length-specific counter
      if (comboLength === 2) {
        stats.twoWord += 1;
      } else if (comboLength === 3) {
        stats.threeWord += 1;
      } else if (comboLength >= 4) {
        stats.fourPlus += 1;
      }
    }
  }

  // Convert to array and sort by total count
  const results: KeywordComboFrequency[] = Array.from(keywordStats.entries())
    .map(([keyword, stats]) => ({
      keyword,
      totalCombos: stats.total,
      twoWordCombos: stats.twoWord,
      threeWordCombos: stats.threeWord,
      fourPlusCombos: stats.fourPlus,
      sampleCombos: Array.from(stats.combos).slice(0, 5), // Max 5 samples
    }))
    .sort((a, b) => b.totalCombos - a.totalCombos);

  return results;
}

/**
 * Get keyword frequency for a specific keyword
 */
export function getKeywordFrequency(
  keyword: string,
  combos: ClassifiedCombo[]
): KeywordComboFrequency | null {
  const allFrequencies = analyzeKeywordComboFrequency(combos);
  return allFrequencies.find(f => f.keyword.toLowerCase() === keyword.toLowerCase()) || null;
}

/**
 * Get top N most frequent keywords
 */
export function getTopKeywords(
  combos: ClassifiedCombo[],
  topN: number = 10
): KeywordComboFrequency[] {
  const allFrequencies = analyzeKeywordComboFrequency(combos);
  return allFrequencies.slice(0, topN);
}
