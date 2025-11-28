/**
 * Combo Generation Engine
 *
 * Generates ALL possible keyword combinations from title + subtitle
 * and compares them against what's actually present in the metadata.
 *
 * Features:
 * - Generate all 2-word, 3-word, 4-word combinations
 * - Identify existing vs missing combos
 * - Score combos using ASO Bible principles
 * - Recommend strategic combos to add
 *
 * Performance Optimization Phase 2.2:
 * - Max combo limit to prevent excessive generation
 * - Filter low-value stopwords
 * - Early termination when limit reached
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { filterGenericCombos } from '@/utils/brandFilter';

// Performance Optimization Phase 2.2: Limits and filters
const MAX_COMBOS_PER_SOURCE = 500; // Prevent excessive combo generation
const LOW_VALUE_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'may', 'might', 'can', 'must', 'shall'
]);

export interface GeneratedCombo {
  text: string;
  keywords: string[];
  length: number; // Number of keywords (2, 3, 4, etc.)
  exists: boolean; // Does this combo exist in current metadata?
  source?: 'title' | 'subtitle' | 'both' | 'missing';
  strategicValue?: number; // 0-100 score
  searchVolume?: 'high' | 'medium' | 'low' | 'unknown';
  competition?: 'high' | 'medium' | 'low' | 'unknown';
  recommendation?: string;
}

export interface ComboAnalysis {
  allPossibleCombos: GeneratedCombo[];
  existingCombos: GeneratedCombo[];
  missingCombos: GeneratedCombo[];
  recommendedToAdd: GeneratedCombo[];
  stats: {
    totalPossible: number;
    existing: number;
    missing: number;
    coverage: number; // % of possible combos that exist
  };
}

/**
 * Performance Optimization Phase 2.2: Filter low-value keywords
 */
function filterLowValueKeywords(keywords: string[]): string[] {
  return keywords.filter(kw => {
    const normalized = kw.toLowerCase().trim();
    return normalized.length > 1 && !LOW_VALUE_STOPWORDS.has(normalized);
  });
}

/**
 * Generate all possible combinations of n keywords
 * Performance Optimization Phase 2.2: Added max limit for early termination
 */
function generateCombinations(keywords: string[], size: number, maxResults: number = Infinity): string[][] {
  const results: string[][] = [];

  function backtrack(start: number, current: string[]) {
    // Phase 2.2: Early termination when max reached
    if (results.length >= maxResults) {
      return;
    }

    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let i = start; i < keywords.length; i++) {
      // Phase 2.2: Early termination check
      if (results.length >= maxResults) {
        break;
      }

      current.push(keywords[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return results;
}

/**
 * Generate all possible keyword combinations from title and subtitle
 * Performance Optimization Phase 2.2: Added filtering and limits
 */
export function generateAllPossibleCombos(
  titleKeywords: string[],
  subtitleKeywords: string[],
  options: {
    minLength?: number;
    maxLength?: number;
    includeTitle?: boolean;
    includeSubtitle?: boolean;
    includeCross?: boolean; // Cross-element combos (title + subtitle keywords)
  } = {}
): string[] {
  const {
    minLength = 2,
    maxLength = 4,
    includeTitle = true,
    includeSubtitle = true,
    includeCross = true,
  } = options;

  // Phase 2.2: Filter low-value keywords first
  const filteredTitle = filterLowValueKeywords(titleKeywords);
  const filteredSubtitle = filterLowValueKeywords(subtitleKeywords);

  const allCombos = new Set<string>();

  // Phase 2.2: Track total combos to enforce limit
  let totalGenerated = 0;
  const maxTotal = MAX_COMBOS_PER_SOURCE * 3; // Allow for 3 sources (title, subtitle, cross)

  // Generate combos from title keywords only
  if (includeTitle && totalGenerated < maxTotal) {
    const remainingQuota = maxTotal - totalGenerated;
    for (let length = minLength; length <= Math.min(maxLength, filteredTitle.length); length++) {
      if (totalGenerated >= maxTotal) break; // Phase 2.2: Early termination

      const combinations = generateCombinations(filteredTitle, length, remainingQuota);
      combinations.forEach(combo => {
        allCombos.add(combo.join(' '));
        totalGenerated++;
      });
    }
  }

  // Generate combos from subtitle keywords only
  if (includeSubtitle && totalGenerated < maxTotal) {
    const remainingQuota = maxTotal - totalGenerated;
    for (let length = minLength; length <= Math.min(maxLength, filteredSubtitle.length); length++) {
      if (totalGenerated >= maxTotal) break; // Phase 2.2: Early termination

      const combinations = generateCombinations(filteredSubtitle, length, remainingQuota);
      combinations.forEach(combo => {
        allCombos.add(combo.join(' '));
        totalGenerated++;
      });
    }
  }

  // Generate cross-element combos (title + subtitle)
  if (includeCross && filteredTitle.length > 0 && filteredSubtitle.length > 0 && totalGenerated < maxTotal) {
    const combinedKeywords = [...filteredTitle, ...filteredSubtitle];
    const remainingQuota = maxTotal - totalGenerated;

    for (let length = minLength; length <= Math.min(maxLength, combinedKeywords.length); length++) {
      if (totalGenerated >= maxTotal) break; // Phase 2.2: Early termination

      const combinations = generateCombinations(combinedKeywords, length, remainingQuota);

      // Only keep combos that mix keywords from both title and subtitle
      combinations.forEach(combo => {
        const hasTitleKeyword = combo.some(kw => filteredTitle.includes(kw));
        const hasSubtitleKeyword = combo.some(kw => filteredSubtitle.includes(kw));

        if (hasTitleKeyword && hasSubtitleKeyword) {
          allCombos.add(combo.join(' '));
          totalGenerated++;
        }
      });
    }
  }

  if (process.env.NODE_ENV === 'development' && totalGenerated > 1000) {
    console.log(`[Combo Generation] Generated ${totalGenerated} combinations (filtered from potential thousands)`);
  }

  return Array.from(allCombos);
}

/**
 * Check if a combo exists in the metadata text
 */
function comboExistsInText(combo: string, text: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedCombo = combo.toLowerCase();

  // Check for exact phrase match or words appearing in order
  const comboWords = normalizedCombo.split(' ');

  // Exact phrase match
  if (normalizedText.includes(normalizedCombo)) {
    return true;
  }

  // Words appear in order (not necessarily consecutive)
  let lastIndex = -1;
  for (const word of comboWords) {
    const index = normalizedText.indexOf(word, lastIndex + 1);
    if (index === -1) {
      return false;
    }
    lastIndex = index;
  }

  return true;
}

/**
 * Determine the source of a combo
 */
function determineComboSource(
  combo: string,
  titleText: string,
  subtitleText: string
): 'title' | 'subtitle' | 'both' | 'missing' {
  const inTitle = comboExistsInText(combo, titleText);
  const inSubtitle = comboExistsInText(combo, subtitleText);

  if (inTitle && inSubtitle) return 'both';
  if (inTitle) return 'title';
  if (inSubtitle) return 'subtitle';
  return 'missing';
}

/**
 * Calculate strategic value of a combo
 * This is a simplified scoring - in real implementation, this would call ASO Bible
 */
function calculateStrategicValue(combo: string, keywords: string[]): number {
  let score = 50; // Base score

  // Longer combos are more specific and valuable
  const length = keywords.length;
  if (length === 2) score += 10;
  if (length === 3) score += 20;
  if (length === 4) score += 15;

  // TODO: Integrate with ASO Bible to get real strategic scores based on:
  // - Search volume estimates
  // - Competition analysis
  // - Category relevance
  // - Intent matching

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate comprehensive combo analysis
 *
 * @param brandName - Optional brand name to filter out branded combos (Phase 1: Brand Filter)
 */
export function analyzeAllCombos(
  titleKeywords: string[],
  subtitleKeywords: string[],
  titleText: string,
  subtitleText: string,
  existingClassifiedCombos?: ClassifiedCombo[],
  brandName?: string | null
): ComboAnalysis {
  // Generate all possible combos
  const allPossibleComboStrings = generateAllPossibleCombos(
    titleKeywords,
    subtitleKeywords,
    {
      minLength: 2,
      maxLength: 4,
      includeTitle: true,
      includeSubtitle: true,
      includeCross: true,
    }
  );

  // Analyze each combo
  const allPossibleCombos: GeneratedCombo[] = allPossibleComboStrings.map(comboText => {
    const keywords = comboText.split(' ');
    const source = determineComboSource(comboText, titleText, subtitleText);
    const exists = source !== 'missing';
    const strategicValue = calculateStrategicValue(comboText, keywords);

    return {
      text: comboText,
      keywords,
      length: keywords.length,
      exists,
      source,
      strategicValue,
      searchVolume: 'unknown', // TODO: Integrate with search volume data
      competition: 'unknown',   // TODO: Integrate with competition data
    };
  });

  // Phase 1: Brand Filter - Remove branded combos from suggestions
  // Keep existing combos as-is (already in metadata), but filter new suggestions
  const genericPossibleCombos = brandName
    ? filterGenericCombos(allPossibleCombos, brandName)
    : allPossibleCombos;

  // Split into existing and missing (using filtered generic combos)
  const existingCombos = genericPossibleCombos.filter(c => c.exists);
  const missingCombos = genericPossibleCombos.filter(c => !c.exists);

  // Recommend top missing combos (all generic now)
  const recommendedToAdd = missingCombos
    .sort((a, b) => (b.strategicValue || 0) - (a.strategicValue || 0))
    .slice(0, 10)
    .map(combo => ({
      ...combo,
      recommendation: `Consider adding "${combo.text}" - Strategic value: ${combo.strategicValue}/100`,
    }));

  // Calculate stats
  const stats = {
    totalPossible: genericPossibleCombos.length,
    existing: existingCombos.length,
    missing: missingCombos.length,
    coverage: genericPossibleCombos.length > 0
      ? Math.round((existingCombos.length / genericPossibleCombos.length) * 100)
      : 0,
  };

  return {
    allPossibleCombos: genericPossibleCombos,
    existingCombos,
    missingCombos,
    recommendedToAdd,
    stats,
  };
}

/**
 * Filter combos by keyword
 */
export function filterCombosByKeyword(
  combos: GeneratedCombo[],
  keyword: string
): GeneratedCombo[] {
  const normalizedKeyword = keyword.toLowerCase();
  return combos.filter(combo =>
    combo.keywords.some(kw => kw.toLowerCase().includes(normalizedKeyword))
  );
}

/**
 * Group combos by length
 */
export function groupCombosByLength(combos: GeneratedCombo[]): Map<number, GeneratedCombo[]> {
  const groups = new Map<number, GeneratedCombo[]>();

  combos.forEach(combo => {
    const existing = groups.get(combo.length) || [];
    existing.push(combo);
    groups.set(combo.length, existing);
  });

  return groups;
}

/**
 * Count combos containing a specific keyword
 */
export function countCombosWithKeyword(
  combos: GeneratedCombo[],
  keyword: string
): number {
  return filterCombosByKeyword(combos, keyword).length;
}
