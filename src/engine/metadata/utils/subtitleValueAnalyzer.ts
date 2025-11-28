/**
 * Subtitle Value Analyzer
 *
 * Analyzes the incremental value that the subtitle provides beyond the title.
 *
 * **Key Questions:**
 * 1. How many NEW keywords does the subtitle add?
 * 2. How many NEW combos become possible with the subtitle?
 * 3. Does the subtitle complement or duplicate the title?
 * 4. What's the overall synergy score?
 *
 * **Performance Budget:** +50ms
 */

import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type {
  SubtitleValueMetrics,
  TitleAlignmentMetrics,
} from '@/components/AppAudit/UnifiedMetadataAuditModule/types.v2.1';
import { extractRankingTokens } from './rankingTokenExtractor';

// ==================== KEYWORD ANALYSIS ====================

/**
 * Extract meaningful keywords (non-stopwords) from text
 */
function extractMeaningfulKeywords(text: string): Set<string> {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', '&',
  ]);

  const normalized = text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  return new Set(
    words.filter((word) => !stopwords.has(word) && word.length >= 2)
  );
}

/**
 * Identify new keywords added by subtitle (not in title)
 */
function identifyNewKeywords(title: string, subtitle: string): string[] {
  const titleKeywords = extractMeaningfulKeywords(title);
  const subtitleKeywords = extractMeaningfulKeywords(subtitle);

  const newKeywords: string[] = [];
  subtitleKeywords.forEach((keyword) => {
    if (!titleKeywords.has(keyword)) {
      newKeywords.push(keyword);
    }
  });

  return newKeywords;
}

// ==================== COMBO ANALYSIS ====================

/**
 * Generate simple combos from keywords (2-word and 3-word combinations)
 */
function generateSimpleCombos(keywords: string[]): Set<string> {
  const combos = new Set<string>();

  // 2-word combos
  for (let i = 0; i < keywords.length - 1; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      combos.add(`${keywords[i]} ${keywords[j]}`);
      combos.add(`${keywords[j]} ${keywords[i]}`); // Both orders
    }
  }

  // 3-word combos (limited to avoid explosion)
  for (let i = 0; i < keywords.length - 2; i++) {
    for (let j = i + 1; j < keywords.length - 1; j++) {
      for (let k = j + 1; k < keywords.length; k++) {
        combos.add(`${keywords[i]} ${keywords[j]} ${keywords[k]}`);
      }
    }
  }

  return combos;
}

/**
 * Identify new combos enabled by subtitle
 *
 * New combos are those that require keywords from BOTH title and subtitle,
 * or are unique to the subtitle.
 */
function identifyNewCombos(title: string, subtitle: string): string[] {
  const titleKeywords = Array.from(extractMeaningfulKeywords(title));
  const subtitleKeywords = Array.from(extractMeaningfulKeywords(subtitle));
  const allKeywords = [...titleKeywords, ...subtitleKeywords];

  // Generate combos from title only
  const titleOnlyCombos = generateSimpleCombos(titleKeywords);

  // Generate combos from all keywords (title + subtitle)
  const allCombos = generateSimpleCombos(allKeywords);

  // New combos = all combos - title-only combos
  const newCombos: string[] = [];
  allCombos.forEach((combo) => {
    if (!titleOnlyCombos.has(combo)) {
      newCombos.push(combo);
    }
  });

  return newCombos;
}

// ==================== TITLE ALIGNMENT ====================

/**
 * Calculate title alignment metrics
 *
 * Measures how well the subtitle complements the title:
 * - Low overlap = good complementarity (subtitle adds new info)
 * - High overlap = redundancy (subtitle repeats title)
 */
function calculateTitleAlignment(
  title: string,
  subtitle: string
): TitleAlignmentMetrics {
  const titleKeywords = extractMeaningfulKeywords(title);
  const subtitleKeywords = extractMeaningfulKeywords(subtitle);

  // Calculate overlap
  let overlapCount = 0;
  subtitleKeywords.forEach((keyword) => {
    if (titleKeywords.has(keyword)) {
      overlapCount++;
    }
  });

  const overlapRatio =
    subtitleKeywords.size > 0 ? overlapCount / subtitleKeywords.size : 0;

  // Complementarity score (0-100)
  // Higher is better (more unique keywords in subtitle)
  const complementarity = Math.round((1 - overlapRatio) * 100);

  // Redundancy penalty (0-100)
  // Higher overlap = higher penalty
  const redundancyPenalty = Math.round(overlapRatio * 100);

  return {
    overlapCount,
    overlapRatio,
    complementarity,
    redundancyPenalty,
  };
}

// ==================== SYNERGY SCORE ====================

/**
 * Calculate overall subtitle synergy score (0-100)
 *
 * Formula:
 * - New keywords: 40% weight
 * - New combos: 40% weight
 * - Complementarity: 20% weight
 *
 * Higher score = subtitle adds more value
 */
function calculateSynergyScore(
  newKeywordCount: number,
  newComboCount: number,
  titleAlignment: TitleAlignmentMetrics
): number {
  // Normalize new keywords (0-100)
  // 5+ new keywords = 100 points
  const keywordScore = Math.min(100, (newKeywordCount / 5) * 100);

  // Normalize new combos (0-100)
  // 10+ new combos = 100 points
  const comboScore = Math.min(100, (newComboCount / 10) * 100);

  // Complementarity score (already 0-100)
  const complementarityScore = titleAlignment.complementarity;

  // Weighted average
  const synergyScore = Math.round(
    keywordScore * 0.4 + comboScore * 0.4 + complementarityScore * 0.2
  );

  return Math.max(0, Math.min(100, synergyScore));
}

// ==================== RECOMMENDATIONS ====================

/**
 * Generate subtitle optimization recommendations
 */
function generateSubtitleRecommendations(
  newKeywordCount: number,
  newComboCount: number,
  titleAlignment: TitleAlignmentMetrics,
  synergyScore: number
): string[] {
  const recommendations: string[] = [];

  // Low synergy
  if (synergyScore < 50) {
    recommendations.push(
      'Subtitle has low synergy with title. Consider adding more unique, meaningful keywords.'
    );
  }

  // High overlap
  if (titleAlignment.overlapRatio > 0.5) {
    recommendations.push(
      `Subtitle duplicates ${titleAlignment.overlapCount} keyword${
        titleAlignment.overlapCount > 1 ? 's' : ''
      } from title. Use subtitle to add NEW keywords instead.`
    );
  }

  // Few new keywords
  if (newKeywordCount < 3) {
    recommendations.push(
      'Subtitle adds only ' +
        newKeywordCount +
        ' new keyword' +
        (newKeywordCount === 1 ? '' : 's') +
        '. Aim for 4-6 unique keywords.'
    );
  }

  // Few new combos
  if (newComboCount < 5) {
    recommendations.push(
      'Subtitle enables only ' +
        newComboCount +
        ' new combo' +
        (newComboCount === 1 ? '' : 's') +
        '. Strategic keywords can create 10+ valuable combos.'
    );
  }

  // Good performance
  if (synergyScore >= 80) {
    recommendations.push(
      '✨ Excellent subtitle! Strong synergy with title, adding significant ranking power.'
    );
  } else if (synergyScore >= 60) {
    recommendations.push(
      'Good subtitle synergy. Minor optimizations could further improve ranking coverage.'
    );
  }

  return recommendations;
}

// ==================== MAIN ANALYZER ====================

/**
 * Analyze subtitle value relative to title
 *
 * @param title - App title
 * @param subtitle - App subtitle
 * @param allCombos - Optional: pre-classified combos for more accurate analysis
 * @returns Complete subtitle value metrics
 */
export function analyzeSubtitleValue(
  title: string,
  subtitle: string,
  allCombos?: ClassifiedCombo[]
): SubtitleValueMetrics {
  // Identify new keywords
  const newKeywords = identifyNewKeywords(title, subtitle);
  const newKeywordCount = newKeywords.length;

  // Identify new combos (all combos using subtitle keywords)
  const newComboTexts = identifyNewCombos(title, subtitle);

  // Convert to ClassifiedCombo format if allCombos not provided
  let newCombos: ClassifiedCombo[] = [];
  const titleKeywords = extractMeaningfulKeywords(title);
  const subtitleKeywords = extractMeaningfulKeywords(subtitle);

  if (allCombos) {
    // Filter existing combos to find TRUE cross-element ones (must have keywords from BOTH title and subtitle)
    newCombos = allCombos.filter((combo) => {
      const comboKeywords = extractMeaningfulKeywords(combo.text);
      let hasTitleKeyword = false;
      let hasSubtitleKeyword = false;

      comboKeywords.forEach((keyword) => {
        if (titleKeywords.has(keyword)) {
          hasTitleKeyword = true;
        }
        if (subtitleKeywords.has(keyword)) {
          hasSubtitleKeyword = true;
        }
      });

      // TRUE cross-element: must have at least one keyword from BOTH title AND subtitle
      return hasTitleKeyword && hasSubtitleKeyword;
    });
  } else {
    // Create simple ClassifiedCombo objects - only for true cross-element combos
    // Filter to only include combos with keywords from BOTH title and subtitle
    const trueCrossElementTexts = newComboTexts.filter((text) => {
      const comboKeywords = extractMeaningfulKeywords(text);
      let hasTitleKeyword = false;
      let hasSubtitleKeyword = false;

      comboKeywords.forEach((keyword) => {
        if (titleKeywords.has(keyword)) {
          hasTitleKeyword = true;
        }
        if (subtitleKeywords.has(keyword)) {
          hasSubtitleKeyword = true;
        }
      });

      return hasTitleKeyword && hasSubtitleKeyword;
    });

    newCombos = trueCrossElementTexts.map((text) => ({
      text,
      type: 'generic' as const,
      relevanceScore: 2,
      source: 'title+subtitle' as const,
    }));
  }

  // Calculate title alignment
  const titleAlignment = calculateTitleAlignment(title, subtitle);

  // Calculate title alignment score (0-100)
  const titleAlignmentScore = titleAlignment.complementarity;

  // Update newComboCount to reflect actual cross-element combos (not all new combos)
  const newComboCount = newCombos.length;

  // Calculate synergy score
  const synergyScore = calculateSynergyScore(
    newKeywordCount,
    newComboCount,
    titleAlignment
  );

  // Generate recommendations
  const recommendations = generateSubtitleRecommendations(
    newKeywordCount,
    newComboCount,
    titleAlignment,
    synergyScore
  );

  return {
    newKeywords,
    newKeywordCount,
    newCombos,
    newComboCount,
    titleAlignmentScore,
    synergyScore,
    recommendations,
  };
}

/**
 * Quick check: Is the subtitle adding meaningful value?
 *
 * @param title - App title
 * @param subtitle - App subtitle
 * @returns true if subtitle adds value, false if it's mostly redundant
 */
export function isSubtitleValuable(title: string, subtitle: string): boolean {
  const metrics = analyzeSubtitleValue(title, subtitle);
  return metrics.synergyScore >= 50;
}

/**
 * Get subtitle quality tier
 *
 * @param synergyScore - Synergy score (0-100)
 * @returns Quality tier: excellent, good, fair, poor
 */
export function getSubtitleQualityTier(
  synergyScore: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (synergyScore >= 80) return 'excellent';
  if (synergyScore >= 60) return 'good';
  if (synergyScore >= 40) return 'fair';
  return 'poor';
}
