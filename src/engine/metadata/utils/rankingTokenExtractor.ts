/**
 * Ranking Token Extractor
 *
 * Extracts and analyzes keywords eligible for App Store ranking.
 *
 * **Key Principles:**
 * - Only title + subtitle rank in App Store (description does NOT rank)
 * - Stopwords (a, the, and, etc.) are ignored by App Store indexing
 * - Duplicate keywords waste precious character slots
 * - Optimal strategy: Maximize unique, meaningful keywords in 60 total characters
 *
 * **Performance Budget:** +50ms
 */

import type {
  RankingToken,
  RankingTokenSet,
  RankingEfficiencyMetrics,
  DuplicateAnalysis,
  RankingDistributionMap,
} from '@/components/AppAudit/UnifiedMetadataAuditModule/types.v2.1';

// ==================== CONSTANTS ====================

/**
 * App Store stopwords (ignored for ranking)
 *
 * Source: Apple App Store Search Algorithm Analysis
 * These words do NOT contribute to ranking.
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  '&', // Ampersand is treated as stopword
]);

/**
 * Minimum keyword length (shorter words often ignored)
 */
const MIN_KEYWORD_LENGTH = 2;

/**
 * Maximum character limits
 */
const MAX_TITLE_LENGTH = 30;
const MAX_SUBTITLE_LENGTH = 30;

// ==================== TOKENIZATION ====================

/**
 * Normalize text for ranking analysis
 *
 * - Lowercase for case-insensitive matching
 * - Remove special characters except hyphens (e.g., "co-pilot" stays intact)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Keep alphanumeric, spaces, hyphens
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Tokenize text into individual keywords
 */
function tokenize(text: string, source: 'title' | 'subtitle'): RankingToken[] {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(Boolean);

  return words.map((word, index) => ({
    text: word,
    source,
    position: index,
    isStopword: STOPWORDS.has(word) || word.length < MIN_KEYWORD_LENGTH,
    isDuplicate: false, // Will be computed later
  }));
}

// ==================== DUPLICATE DETECTION ====================

/**
 * Mark duplicate tokens (appearing in both title and subtitle)
 */
function markDuplicates(
  titleTokens: RankingToken[],
  subtitleTokens: RankingToken[]
): void {
  const titleWords = new Set(
    titleTokens.filter((t) => !t.isStopword).map((t) => t.text)
  );

  subtitleTokens.forEach((token) => {
    if (!token.isStopword && titleWords.has(token.text)) {
      token.isDuplicate = true;
    }
  });
}

// ==================== MAIN EXTRACTION ====================

/**
 * Extract ranking tokens from title and subtitle
 *
 * @param title - App title (max 30 chars)
 * @param subtitle - App subtitle (max 30 chars)
 * @returns Complete ranking token set with analysis
 */
export function extractRankingTokens(
  title: string,
  subtitle: string
): RankingTokenSet {
  // Tokenize
  const titleTokens = tokenize(title, 'title');
  const subtitleTokens = tokenize(subtitle, 'subtitle');

  // Mark duplicates
  markDuplicates(titleTokens, subtitleTokens);

  // Combine
  const allTokens = [...titleTokens, ...subtitleTokens];

  // Get unique tokens (de-duplicated)
  const uniqueWords = new Set<string>();
  const uniqueTokens = allTokens.filter((token) => {
    if (token.isStopword) return false; // Exclude stopwords
    if (uniqueWords.has(token.text)) return false; // Exclude duplicates
    uniqueWords.add(token.text);
    return true;
  });

  // Get ignored tokens
  const ignoredTokens = allTokens.filter(
    (token) => token.isStopword || token.isDuplicate
  );

  return {
    titleTokens,
    subtitleTokens,
    allTokens,
    uniqueTokens,
    ignoredTokens,
  };
}

/**
 * Identify ignored tokens (stopwords + duplicates)
 *
 * These tokens waste character slots without contributing to ranking.
 */
export function identifyIgnoredTokens(
  title: string,
  subtitle: string
): string[] {
  const tokenSet = extractRankingTokens(title, subtitle);
  return tokenSet.ignoredTokens.map((t) => t.text);
}

// ==================== EFFICIENCY METRICS ====================

/**
 * Calculate ranking slot efficiency
 *
 * Efficiency = (used - wasted) / total * 100
 *
 * Where:
 * - used = actual characters in title + subtitle
 * - wasted = characters spent on stopwords + duplicates
 * - total = 60 (30 title + 30 subtitle)
 */
export function calculateRankingSlotEfficiency(
  title: string,
  subtitle: string
): RankingEfficiencyMetrics {
  const tokenSet = extractRankingTokens(title, subtitle);

  const totalSlots = MAX_TITLE_LENGTH + MAX_SUBTITLE_LENGTH; // 60
  const usedSlots = title.length + subtitle.length;

  // Calculate wasted characters (stopwords + duplicates)
  const wastedSlots = tokenSet.ignoredTokens.reduce(
    (sum, token) => sum + token.text.length + 1, // +1 for space separator
    0
  );

  const duplicateCount = tokenSet.ignoredTokens.filter(
    (t) => t.isDuplicate
  ).length;
  const stopwordCount = tokenSet.ignoredTokens.filter(
    (t) => t.isStopword && !t.isDuplicate
  ).length;

  // Efficiency formula
  const efficiency = Math.max(
    0,
    Math.min(100, ((usedSlots - wastedSlots) / totalSlots) * 100)
  );

  return {
    totalSlots,
    usedSlots,
    wastedSlots,
    efficiency: Math.round(efficiency),
    duplicateCount,
    stopwordCount,
  };
}

// ==================== DUPLICATE ANALYSIS ====================

/**
 * Analyze duplicate keywords between title, subtitle, and keywords field
 */
export function analyzeDuplicates(
  title: string,
  subtitle: string,
  keywords?: string
): DuplicateAnalysis {
  const tokenSet = extractRankingTokens(title, subtitle);

  // Get duplicates between title and subtitle (existing logic)
  const subtitleDuplicates = Array.from(
    new Set(
      tokenSet.ignoredTokens
        .filter((t) => t.isDuplicate)
        .map((t) => t.text)
    )
  );

  // Extract keywords tokens (if provided)
  const keywordsDuplicates: string[] = [];
  if (keywords && keywords.trim()) {
    const keywordsTokens = keywords
      .split(',')
      .map(kw => normalizeText(kw.trim()))
      .filter(kw => kw.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(kw));

    // Get meaningful words from title and subtitle
    const titleWords = new Set(
      tokenSet.titleTokens.filter(t => !t.isStopword).map(t => t.text)
    );
    const subtitleWords = new Set(
      tokenSet.subtitleTokens.filter(t => !t.isStopword).map(t => t.text)
    );

    // Check each keyword against title and subtitle
    keywordsTokens.forEach(keyword => {
      if (titleWords.has(keyword) || subtitleWords.has(keyword)) {
        keywordsDuplicates.push(keyword);
      }
    });
  }

  // Combine all duplicates
  const duplicateKeywords = Array.from(
    new Set([...subtitleDuplicates, ...keywordsDuplicates])
  );

  const duplicateCount = duplicateKeywords.length;

  // Calculate wasted characters
  const wastedCharacters = duplicateKeywords.reduce(
    (sum, keyword) => sum + keyword.length + 1, // +1 for space/comma
    0
  );

  // Generate recommendation
  let recommendation: string | undefined;
  if (duplicateCount > 0) {
    const sources: string[] = [];
    if (subtitleDuplicates.length > 0) sources.push('subtitle');
    if (keywordsDuplicates.length > 0) sources.push('keywords field');

    recommendation = `Remove ${duplicateCount} duplicate keyword${
      duplicateCount > 1 ? 's' : ''
    } from ${sources.join(' and ')} to free up ${wastedCharacters} characters for new keywords.`;
  }

  // Get meaningful words from title and subtitle for breakdown
  const titleWords = new Set(
    tokenSet.titleTokens.filter(t => !t.isStopword).map(t => t.text)
  );
  const subtitleWords = new Set(
    tokenSet.subtitleTokens.filter(t => !t.isStopword).map(t => t.text)
  );

  // Build breakdown: which duplicates appear in which fields
  const inTitle = duplicateKeywords.filter(word => titleWords.has(word));
  const inSubtitle = duplicateKeywords.filter(word => subtitleWords.has(word));
  const inKeywords = keywordsDuplicates;

  return {
    duplicateKeywords,
    duplicateCount,
    wastedCharacters,
    recommendation,
    breakdown: {
      inTitle,
      inSubtitle,
      inKeywords,
    },
  };
}

// ==================== RANKING DISTRIBUTION ====================

/**
 * Create ranking distribution map (title vs subtitle keyword split)
 */
export function createRankingDistributionMap(
  title: string,
  subtitle: string
): RankingDistributionMap {
  const tokenSet = extractRankingTokens(title, subtitle);

  // Get meaningful (non-stopword) words
  const titleWords = new Set(
    tokenSet.titleTokens.filter((t) => !t.isStopword).map((t) => t.text)
  );
  const subtitleWords = new Set(
    tokenSet.subtitleTokens.filter((t) => !t.isStopword).map((t) => t.text)
  );

  // Calculate intersections
  const titleOnly: string[] = [];
  const both: string[] = [];

  titleWords.forEach((word) => {
    if (subtitleWords.has(word)) {
      both.push(word);
    } else {
      titleOnly.push(word);
    }
  });

  const subtitleOnly = Array.from(subtitleWords).filter(
    (word) => !titleWords.has(word)
  );

  // Calculate slot utilization
  const titleSlotUtilization = Math.round(
    (title.length / MAX_TITLE_LENGTH) * 100
  );
  const subtitleSlotUtilization = Math.round(
    (subtitle.length / MAX_SUBTITLE_LENGTH) * 100
  );

  return {
    titleOnly,
    subtitleOnly,
    both,
    titleSlotUtilization,
    subtitleSlotUtilization,
  };
}
