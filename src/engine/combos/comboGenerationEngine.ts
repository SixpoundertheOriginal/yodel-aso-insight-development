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

/**
 * Combo Strength Classification (Phase 1: App Store Algorithm + Keywords Field)
 *
 * Based on confirmed App Store ranking behavior:
 * - Title-only combos have highest ranking power
 * - Title + Keywords cross-element combos are 2nd tier (same weight as title non-consecutive)
 * - Keywords field has same weight as subtitle field (backend indexing only)
 * - Cross-element combos have medium power
 * - Missing combos don't rank (unless user behavior signals relevance)
 *
 * Strength hierarchy:
 * 🔥🔥🔥 TITLE_CONSECUTIVE > 🔥🔥 TITLE_NON_CONSECUTIVE > 🔥⚡ TITLE_KEYWORDS_CROSS >
 * ⚡ CROSS_ELEMENT > 💤 KEYWORDS_CONSECUTIVE = SUBTITLE_CONSECUTIVE >
 * 💤⚡ KEYWORDS_SUBTITLE_CROSS > 💤💤 KEYWORDS_NON_CONSECUTIVE = SUBTITLE_NON_CONSECUTIVE >
 * 💤💤💤 THREE_WAY_CROSS > ❌ MISSING
 */
export enum ComboStrength {
  // Tier 1: Title-only (Strongest)
  TITLE_CONSECUTIVE = 'title_consecutive',                 // 🔥🔥🔥 Consecutive words in title

  // Tier 2: Title-based (Very Strong)
  TITLE_NON_CONSECUTIVE = 'title_non_consecutive',         // 🔥🔥 Words in title but not consecutive
  TITLE_KEYWORDS_CROSS = 'title_keywords_cross',           // 🔥⚡ Title + Keywords field (2nd tier)

  // Tier 3: Cross-element title-subtitle (Medium)
  CROSS_ELEMENT = 'cross_element',                         // ⚡ Title + Subtitle

  // Tier 4: Keywords/Subtitle same-field (Weak)
  KEYWORDS_CONSECUTIVE = 'keywords_consecutive',           // 💤 Consecutive in keywords field
  SUBTITLE_CONSECUTIVE = 'subtitle_consecutive',           // 💤 Consecutive in subtitle

  // Tier 5: Keywords/Subtitle cross (Very Weak)
  KEYWORDS_SUBTITLE_CROSS = 'keywords_subtitle_cross',     // 💤⚡ Keywords + Subtitle cross

  // Tier 6: Non-consecutive in weak fields (Very Very Weak)
  KEYWORDS_NON_CONSECUTIVE = 'keywords_non_consecutive',   // 💤💤 Non-consecutive in keywords
  SUBTITLE_NON_CONSECUTIVE = 'subtitle_non_consecutive',   // 💤💤 Non-consecutive in subtitle

  // Tier 7: Three-way cross (Weakest existing)
  THREE_WAY_CROSS = 'three_way_cross',                     // 💤💤💤 Title + Subtitle + Keywords (3 elements)

  // Missing
  MISSING = 'missing',                                     // ❌ Not in metadata
}

export interface GeneratedCombo {
  text: string;
  keywords: string[];
  length: number; // Number of keywords (2, 3, 4, etc.)
  exists: boolean; // Does this combo exist in current metadata?
  source?: 'title' | 'subtitle' | 'keywords' | 'both' | 'missing'; // Extended to include keywords field

  // Phase 1: Strength-based classification
  strength: ComboStrength; // Ranking power based on position
  isConsecutive?: boolean; // Are words consecutive in text?
  canStrengthen: boolean; // Can we move to title for stronger ranking?
  strengtheningSuggestion?: string; // How to strengthen this combo

  // Multi-element combo expansion (Phase 2)
  priority?: number; // 0-100 score based on real analytics (strength + popularity + opportunity + trend + intent)

  strategicValue?: number; // 0-100 score (legacy - superseded by priority)
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

    // Phase 1 & 2: Strength-based breakdown (all 10 tiers)
    titleConsecutive: number;           // 🔥🔥🔥 Tier 1
    titleNonConsecutive: number;        // 🔥🔥 Tier 2
    titleKeywordsCross: number;         // 🔥⚡ Tier 2 (new)
    crossElement: number;               // ⚡ Tier 3 (title+subtitle)
    keywordsConsecutive: number;        // 💤 Tier 4 (new)
    subtitleConsecutive: number;        // 💤 Tier 4
    keywordsSubtitleCross: number;      // 💤⚡ Tier 5 (new)
    keywordsNonConsecutive: number;     // 💤💤 Tier 6 (new)
    subtitleNonConsecutive: number;     // 💤💤 Tier 6
    threeWayCross: number;              // 💤💤💤 Tier 7 (new)
    canStrengthen: number;              // How many combos can be strengthened

    // Multi-element expansion (Phase 2)
    limitReached?: boolean;             // True if top 500 limit was applied
    totalGenerated?: number;            // Total before limit (if applicable)
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
 * Generate all possible keyword combinations from title, subtitle, and keywords field
 * Performance Optimization Phase 2.2 + Multi-element expansion Phase 2:
 * - Added filtering and limits
 * - Support for 4 elements: title, subtitle, keywords, promotional text (future)
 */
export function generateAllPossibleCombos(
  titleKeywords: string[],
  subtitleKeywords: string[],
  keywordsFieldKeywords?: string[], // NEW: Keywords field (100 chars, comma-separated)
  options: {
    minLength?: number;
    maxLength?: number;
    includeTitle?: boolean;
    includeSubtitle?: boolean;
    includeKeywords?: boolean; // NEW: Include keywords field
    includeCross?: boolean; // Cross-element combos (title + subtitle keywords)
  } = {}
): string[] {
  const {
    minLength = 2,
    maxLength = 4,
    includeTitle = true,
    includeSubtitle = true,
    includeKeywords = true, // NEW: Default to true
    includeCross = true,
  } = options;

  // Phase 2.2: Filter low-value keywords first
  const filteredTitle = filterLowValueKeywords(titleKeywords);
  const filteredSubtitle = filterLowValueKeywords(subtitleKeywords);
  const filteredKeywords = keywordsFieldKeywords ? filterLowValueKeywords(keywordsFieldKeywords) : [];

  const allCombos = new Set<string>();

  // Phase 2.2: Track total combos to enforce limit
  let totalGenerated = 0;
  // Multi-element expansion: Increase max limit for 4 sources (title, subtitle, keywords, cross)
  const maxTotal = MAX_COMBOS_PER_SOURCE * 5; // 2,500 total max before limits

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

  // Generate cross-element combos (all combinations)
  if (includeCross && totalGenerated < maxTotal) {
    // 1. Title + Subtitle cross
    if (filteredTitle.length > 0 && filteredSubtitle.length > 0) {
      const combinedKeywords = [...filteredTitle, ...filteredSubtitle];
      const remainingQuota = maxTotal - totalGenerated;

      for (let length = minLength; length <= Math.min(maxLength, combinedKeywords.length); length++) {
        if (totalGenerated >= maxTotal) break;

        const combinations = generateCombinations(combinedKeywords, length, remainingQuota);

        // Only keep combos that mix keywords from both title and subtitle
        combinations.forEach(combo => {
          const hasTitleKeyword = combo.some(kw => filteredTitle.includes(kw));
          const hasSubtitleKeyword = combo.some(kw => filteredSubtitle.includes(kw));
          const hasKeywordsField = combo.some(kw => filteredKeywords.includes(kw));

          // Title + Subtitle only (no keywords field)
          if (hasTitleKeyword && hasSubtitleKeyword && !hasKeywordsField) {
            allCombos.add(combo.join(' '));
            totalGenerated++;
          }
        });
      }
    }

    // 2. NEW: Title + Keywords field cross
    if (filteredTitle.length > 0 && filteredKeywords.length > 0) {
      const combinedKeywords = [...filteredTitle, ...filteredKeywords];
      const remainingQuota = maxTotal - totalGenerated;

      for (let length = minLength; length <= Math.min(maxLength, combinedKeywords.length); length++) {
        if (totalGenerated >= maxTotal) break;

        const combinations = generateCombinations(combinedKeywords, length, remainingQuota);

        combinations.forEach(combo => {
          const hasTitleKeyword = combo.some(kw => filteredTitle.includes(kw));
          const hasKeywordsField = combo.some(kw => filteredKeywords.includes(kw));
          const hasSubtitle = combo.some(kw => filteredSubtitle.includes(kw));

          // Title + Keywords only (no subtitle)
          if (hasTitleKeyword && hasKeywordsField && !hasSubtitle) {
            allCombos.add(combo.join(' '));
            totalGenerated++;
          }
        });
      }
    }

    // 3. NEW: Subtitle + Keywords field cross
    if (filteredSubtitle.length > 0 && filteredKeywords.length > 0) {
      const combinedKeywords = [...filteredSubtitle, ...filteredKeywords];
      const remainingQuota = maxTotal - totalGenerated;

      for (let length = minLength; length <= Math.min(maxLength, combinedKeywords.length); length++) {
        if (totalGenerated >= maxTotal) break;

        const combinations = generateCombinations(combinedKeywords, length, remainingQuota);

        combinations.forEach(combo => {
          const hasSubtitle = combo.some(kw => filteredSubtitle.includes(kw));
          const hasKeywordsField = combo.some(kw => filteredKeywords.includes(kw));
          const hasTitle = combo.some(kw => filteredTitle.includes(kw));

          // Subtitle + Keywords only (no title)
          if (hasSubtitle && hasKeywordsField && !hasTitle) {
            allCombos.add(combo.join(' '));
            totalGenerated++;
          }
        });
      }
    }

    // 4. NEW: Title + Subtitle + Keywords (three-way cross)
    if (filteredTitle.length > 0 && filteredSubtitle.length > 0 && filteredKeywords.length > 0) {
      const combinedKeywords = [...filteredTitle, ...filteredSubtitle, ...filteredKeywords];
      const remainingQuota = maxTotal - totalGenerated;

      for (let length = minLength; length <= Math.min(maxLength, combinedKeywords.length); length++) {
        if (totalGenerated >= maxTotal) break;

        const combinations = generateCombinations(combinedKeywords, length, remainingQuota);

        combinations.forEach(combo => {
          const hasTitleKeyword = combo.some(kw => filteredTitle.includes(kw));
          const hasSubtitleKeyword = combo.some(kw => filteredSubtitle.includes(kw));
          const hasKeywordsField = combo.some(kw => filteredKeywords.includes(kw));

          // All three fields represented
          if (hasTitleKeyword && hasSubtitleKeyword && hasKeywordsField) {
            allCombos.add(combo.join(' '));
            totalGenerated++;
          }
        });
      }
    }
  }

  if (process.env.NODE_ENV === 'development' && totalGenerated > 1000) {
    console.log(`[Combo Generation] Generated ${totalGenerated} combinations (filtered from potential thousands)`);
  }

  return Array.from(allCombos);
}

/**
 * Analyze combo presence in text with consecutive detection
 * Phase 1: Enhanced to detect consecutive vs non-consecutive matches
 */
interface ComboTextAnalysis {
  exists: boolean;
  isConsecutive: boolean;
  positions: number[];
}

function analyzeComboInText(combo: string, text: string): ComboTextAnalysis {
  const normalizedText = text.toLowerCase();
  const normalizedCombo = combo.toLowerCase();
  const comboWords = normalizedCombo.split(' ');

  // Check for exact phrase match (consecutive)
  if (normalizedText.includes(normalizedCombo)) {
    return {
      exists: true,
      isConsecutive: true,
      positions: [normalizedText.indexOf(normalizedCombo)]
    };
  }

  // Check for words in order (non-consecutive)
  const positions: number[] = [];
  let lastIndex = -1;
  for (const word of comboWords) {
    const index = normalizedText.indexOf(word, lastIndex + 1);
    if (index === -1) {
      return { exists: false, isConsecutive: false, positions: [] };
    }
    positions.push(index);
    lastIndex = index;
  }

  // Words found in order but not consecutive
  return {
    exists: true,
    isConsecutive: false,
    positions
  };
}

/**
 * Check if a combo exists in the metadata text (legacy function for backward compatibility)
 * @deprecated Use analyzeComboInText for more detailed analysis
 */
function comboExistsInText(combo: string, text: string): boolean {
  return analyzeComboInText(combo, text).exists;
}

/**
 * Determine the source of a combo (updated for 4-element support)
 */
function determineComboSource(
  combo: string,
  titleText: string,
  subtitleText: string,
  keywordsText?: string
): 'title' | 'subtitle' | 'keywords' | 'both' | 'missing' {
  const inTitle = comboExistsInText(combo, titleText);
  const inSubtitle = comboExistsInText(combo, subtitleText);
  const inKeywords = keywordsText ? comboExistsInText(combo, keywordsText) : false;

  // Count how many fields contain this combo
  const fieldCount = [inTitle, inSubtitle, inKeywords].filter(Boolean).length;

  // If in multiple fields, return 'both'
  if (fieldCount > 1) return 'both';

  // If in single field, return that field
  if (inTitle) return 'title';
  if (inSubtitle) return 'subtitle';
  if (inKeywords) return 'keywords';

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
 * Classify combo strength based on App Store ranking algorithm
 * Phase 1: Strength-based classification
 */
interface ComboStrengthAnalysis {
  strength: ComboStrength;
  isConsecutive: boolean;
  canStrengthen: boolean;
  strengtheningSuggestion?: string;
}

function classifyComboStrength(
  comboText: string,
  titleText: string,
  subtitleText: string,
  titleKeywords: string[],
  subtitleKeywords: string[],
  keywordsText?: string,
  keywordsFieldKeywords?: string[]
): ComboStrengthAnalysis {
  const titleAnalysis = analyzeComboInText(comboText, titleText);
  const subtitleAnalysis = analyzeComboInText(comboText, subtitleText);
  const keywordsAnalysis = keywordsText ? analyzeComboInText(comboText, keywordsText) : { exists: false, isConsecutive: false, positions: [] };
  const comboWords = comboText.split(' ');

  // Determine which fields contain the complete combo phrase
  const inTitle = titleAnalysis.exists;
  const inSubtitle = subtitleAnalysis.exists;
  const inKeywords = keywordsAnalysis.exists;
  const fieldCount = [inTitle, inSubtitle, inKeywords].filter(Boolean).length;

  // NEW: Determine which fields contribute individual keywords (for cross-element detection)
  const hasWordsFromTitle = comboWords.some(word =>
    titleKeywords.some(kw => kw.toLowerCase() === word.toLowerCase())
  );
  const hasWordsFromSubtitle = comboWords.some(word =>
    subtitleKeywords.some(kw => kw.toLowerCase() === word.toLowerCase())
  );
  const hasWordsFromKeywords = keywordsFieldKeywords && comboWords.some(word =>
    keywordsFieldKeywords.some(kw => kw.toLowerCase() === word.toLowerCase())
  );

  // Count how many fields contribute keywords to this combo
  const fieldContributions = [hasWordsFromTitle, hasWordsFromSubtitle, hasWordsFromKeywords].filter(Boolean).length;

  // Determine strength based on App Store algorithm hierarchy
  let strength: ComboStrength;
  let isConsecutive = false;
  let canStrengthen = false;
  let strengtheningSuggestion: string | undefined;

  // TIER 1: Title Consecutive 🔥🔥🔥
  if (inTitle && titleAnalysis.isConsecutive) {
    strength = ComboStrength.TITLE_CONSECUTIVE;
    isConsecutive = true;
    canStrengthen = false; // Already strongest

  // TIER 2: Title Non-Consecutive 🔥🔥
  } else if (inTitle && !inSubtitle && !inKeywords && !titleAnalysis.isConsecutive) {
    strength = ComboStrength.TITLE_NON_CONSECUTIVE;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Make words consecutive in title for maximum ranking power`;

  // TIER 2: Title + Keywords Cross 🔥⚡ (keywords from both fields, not complete phrase)
  } else if (hasWordsFromTitle && hasWordsFromKeywords && !hasWordsFromSubtitle && fieldContributions === 2) {
    strength = ComboStrength.TITLE_KEYWORDS_CROSS;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Move keywords from keywords field to title for stronger ranking`;

  // TIER 3: Title + Subtitle Cross ⚡ (keywords from both fields, not complete phrase)
  } else if (hasWordsFromTitle && hasWordsFromSubtitle && !hasWordsFromKeywords && fieldContributions === 2) {
    strength = ComboStrength.CROSS_ELEMENT;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Move all keywords to title to strengthen from MEDIUM to STRONG`;

  // TIER 4: Keywords Consecutive 💤
  } else if (inKeywords && !inTitle && !inSubtitle && keywordsAnalysis.isConsecutive) {
    strength = ComboStrength.KEYWORDS_CONSECUTIVE;
    isConsecutive = true;
    canStrengthen = true;
    strengtheningSuggestion = `Move to title to strengthen from WEAK to STRONG`;

  // TIER 4: Subtitle Consecutive 💤
  } else if (inSubtitle && !inTitle && !inKeywords && subtitleAnalysis.isConsecutive) {
    strength = ComboStrength.SUBTITLE_CONSECUTIVE;
    isConsecutive = true;
    canStrengthen = true;
    strengtheningSuggestion = `Move to title to strengthen from WEAK to STRONG`;

  // TIER 5: Keywords + Subtitle Cross 💤⚡ (keywords from both fields, not complete phrase)
  } else if (hasWordsFromKeywords && hasWordsFromSubtitle && !hasWordsFromTitle && fieldContributions === 2) {
    strength = ComboStrength.KEYWORDS_SUBTITLE_CROSS;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Move all keywords to title to strengthen to STRONG`;

  // TIER 6: Keywords Non-Consecutive 💤💤
  } else if (inKeywords && !inTitle && !inSubtitle && !keywordsAnalysis.isConsecutive) {
    strength = ComboStrength.KEYWORDS_NON_CONSECUTIVE;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Move to title and make consecutive for maximum ranking`;

  // TIER 6: Subtitle Non-Consecutive 💤💤
  } else if (inSubtitle && !inTitle && !inKeywords && !subtitleAnalysis.isConsecutive) {
    strength = ComboStrength.SUBTITLE_NON_CONSECUTIVE;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Move to title and make consecutive for maximum ranking`;

  // TIER 7: Three-way Cross 💤💤💤 (keywords from all three fields)
  } else if (fieldContributions === 3) {
    strength = ComboStrength.THREE_WAY_CROSS;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = `Consolidate all keywords into title for much stronger ranking`;

  // MISSING: Not in any field ❌
  } else {
    strength = ComboStrength.MISSING;
    isConsecutive = false;

    // Check if we can strengthen by moving existing keywords
    const allWordsInSubtitle = comboWords.every(word =>
      subtitleKeywords.some(kw => kw.toLowerCase() === word.toLowerCase())
    );
    const allWordsInKeywords = keywordsFieldKeywords && comboWords.every(word =>
      keywordsFieldKeywords.some(kw => kw.toLowerCase() === word.toLowerCase())
    );
    const someWordsInTitle = comboWords.some(word =>
      titleKeywords.some(kw => kw.toLowerCase() === word.toLowerCase())
    );

    if (allWordsInSubtitle || allWordsInKeywords || someWordsInTitle) {
      canStrengthen = true;
      strengtheningSuggestion = `Add to title to enable ranking for this combination`;
    } else {
      canStrengthen = false; // Would need to add brand new keywords
    }
  }

  return {
    strength,
    isConsecutive,
    canStrengthen,
    strengtheningSuggestion
  };
}

/**
 * Generate comprehensive combo analysis (updated for 4-element support)
 *
 * @param titleKeywords - Keywords extracted from title field
 * @param subtitleKeywords - Keywords extracted from subtitle field
 * @param titleText - Full title text
 * @param subtitleText - Full subtitle text
 * @param keywordsFieldKeywords - NEW: Keywords from App Store Connect keywords field (optional)
 * @param keywordsText - NEW: Full keywords field text (comma-separated)
 * @param existingClassifiedCombos - Pre-existing classified combos (optional)
 * @param brandName - Optional brand name to filter out branded combos
 */
export function analyzeAllCombos(
  titleKeywords: string[],
  subtitleKeywords: string[],
  titleText: string,
  subtitleText: string,
  keywordsFieldKeywords?: string[], // NEW: Keywords field keywords array
  keywordsText?: string, // NEW: Keywords field full text
  existingClassifiedCombos?: ClassifiedCombo[],
  brandName?: string | null
): ComboAnalysis {
  // Generate all possible combos (now including keywords field)
  const allPossibleComboStrings = generateAllPossibleCombos(
    titleKeywords,
    subtitleKeywords,
    keywordsFieldKeywords,
    {
      minLength: 2,
      maxLength: 4,
      includeTitle: true,
      includeSubtitle: true,
      includeKeywords: keywordsFieldKeywords && keywordsFieldKeywords.length > 0, // Only if keywords provided
      includeCross: true,
    }
  );

  // Analyze each combo
  const allPossibleCombos: GeneratedCombo[] = allPossibleComboStrings.map(comboText => {
    const keywords = comboText.split(' ');
    const source = determineComboSource(comboText, titleText, subtitleText, keywordsText);
    const exists = source !== 'missing';
    const strategicValue = calculateStrategicValue(comboText, keywords);

    // Phase 1 & 2: Classify combo strength based on App Store ranking algorithm
    const strengthAnalysis = classifyComboStrength(
      comboText,
      titleText,
      subtitleText,
      titleKeywords,
      subtitleKeywords,
      keywordsText,
      keywordsFieldKeywords
    );

    return {
      text: comboText,
      keywords,
      length: keywords.length,
      exists,
      source,

      // Phase 1: New strength-based fields
      strength: strengthAnalysis.strength,
      isConsecutive: strengthAnalysis.isConsecutive,
      canStrengthen: strengthAnalysis.canStrengthen,
      strengtheningSuggestion: strengthAnalysis.strengtheningSuggestion,

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

  // Calculate stats with strength breakdown (Phase 1 & 2 - all 10 tiers)
  const strengthCounts = {
    titleConsecutive: 0,           // 🔥🔥🔥 Tier 1
    titleNonConsecutive: 0,        // 🔥🔥 Tier 2
    titleKeywordsCross: 0,         // 🔥⚡ Tier 2 (NEW)
    crossElement: 0,               // ⚡ Tier 3
    keywordsConsecutive: 0,        // 💤 Tier 4 (NEW)
    subtitleConsecutive: 0,        // 💤 Tier 4
    keywordsSubtitleCross: 0,      // 💤⚡ Tier 5 (NEW)
    keywordsNonConsecutive: 0,     // 💤💤 Tier 6 (NEW)
    subtitleNonConsecutive: 0,     // 💤💤 Tier 6
    threeWayCross: 0,              // 💤💤💤 Tier 7 (NEW)
    canStrengthen: 0,
  };

  genericPossibleCombos.forEach(combo => {
    // Count by strength type (all 10 tiers)
    switch (combo.strength) {
      case ComboStrength.TITLE_CONSECUTIVE:
        strengthCounts.titleConsecutive++;
        break;
      case ComboStrength.TITLE_NON_CONSECUTIVE:
        strengthCounts.titleNonConsecutive++;
        break;
      case ComboStrength.TITLE_KEYWORDS_CROSS: // NEW
        strengthCounts.titleKeywordsCross++;
        break;
      case ComboStrength.CROSS_ELEMENT:
        strengthCounts.crossElement++;
        break;
      case ComboStrength.KEYWORDS_CONSECUTIVE: // NEW
        strengthCounts.keywordsConsecutive++;
        break;
      case ComboStrength.SUBTITLE_CONSECUTIVE:
        strengthCounts.subtitleConsecutive++;
        break;
      case ComboStrength.KEYWORDS_SUBTITLE_CROSS: // NEW
        strengthCounts.keywordsSubtitleCross++;
        break;
      case ComboStrength.KEYWORDS_NON_CONSECUTIVE: // NEW
        strengthCounts.keywordsNonConsecutive++;
        break;
      case ComboStrength.SUBTITLE_NON_CONSECUTIVE:
        strengthCounts.subtitleNonConsecutive++;
        break;
      case ComboStrength.THREE_WAY_CROSS: // NEW
        strengthCounts.threeWayCross++;
        break;
    }

    // Count strengthening opportunities
    if (combo.canStrengthen) {
      strengthCounts.canStrengthen++;
    }
  });

  const stats = {
    totalPossible: genericPossibleCombos.length,
    existing: existingCombos.length,
    missing: missingCombos.length,
    coverage: genericPossibleCombos.length > 0
      ? Math.round((existingCombos.length / genericPossibleCombos.length) * 100)
      : 0,
    ...strengthCounts,
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
