/**
 * Multi-Locale Audit Edge Function
 *
 * Processes 10-locale metadata for US market indexation analysis.
 * Generates locale-bound combinations, coverage analysis, ranking fusion, and recommendations.
 *
 * Input: LocaleMetadata[] (10 locales: EN_US + 9 secondary)
 * Output: MultiLocaleIndexation (JSON)
 *
 * CRITICAL RULE: Keywords from different locales MUST NEVER combine.
 * Each combination is locked to its source locale.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ==================== TYPES ====================

type USMarketLocale =
  | 'EN_US'     // Primary - English (United States)
  | 'ES_MX'     // Spanish (Mexico)
  | 'RU'        // Russian
  | 'ZH_HANS'   // Chinese (Simplified)
  | 'AR'        // Arabic
  | 'FR_FR'     // French (France)
  | 'PT_BR'     // Portuguese (Brazil)
  | 'ZH_HANT'   // Chinese (Traditional)
  | 'VI'        // Vietnamese
  | 'KO';       // Korean

interface LocaleMetadata {
  locale: USMarketLocale;
  title: string;    // Max 30 chars
  subtitle: string; // Max 30 chars
  keywords: string; // Max 100 chars
  fetchStatus: 'idle' | 'fetching' | 'fetched' | 'error' | 'not_available';
  isAvailable: boolean;
}

interface LocaleCombination {
  id: string;
  text: string;
  keywords: string[];
  length: number;
  tier: number;
  strengthScore: number;
  isConsecutive: boolean;
  sourceLocale: USMarketLocale; // LOCKED to one locale
  sourceFields: ('title' | 'subtitle' | 'keywords')[];
  canStrengthen: boolean;
  strengtheningSuggestion?: string;
}

interface LocaleStats {
  uniqueTokens: number;
  totalCombos: number;
  tier1Combos: number;
  tier2Combos: number;
  tier3PlusCombos: number;
  duplicatedTokens: string[];
  wastedChars: number;
}

interface LocaleTokens {
  title: string[];
  subtitle: string[];
  keywords: string[];
  all: string[];
}

interface ProcessedLocaleMetadata extends LocaleMetadata {
  tokens: LocaleTokens;
  combinations: LocaleCombination[];
  stats: LocaleStats;
}

interface FusedRanking {
  keyword: string;
  bestScore: number;
  bestTier: number;
  bestLocale: USMarketLocale;
  appearsIn: USMarketLocale[];
  ranksByLocale: Record<USMarketLocale, { score: number; tier: number }>;
  fusionStrategy: 'primary_strongest' | 'secondary_stronger' | 'equal_rank';
  fusionDetails: string;
}

interface LocaleCoverageAnalysis {
  locales: Array<{
    locale: USMarketLocale;
    uniqueTokens: number;
    totalCombos: number;
    contributionPct: number;
    duplicateTokens: number;
    emptySlots: boolean;
  }>;
  duplicatedKeywords: Array<{
    keyword: string;
    appearsIn: USMarketLocale[];
    isWasted: boolean;
  }>;
  emptyLocales: USMarketLocale[];
  underutilizedLocales: Array<{
    locale: USMarketLocale;
    charsUsed: number;
    charsAvailable: number;
    utilizationPct: number;
  }>;
}

interface MultiLocaleRecommendation {
  id: string;
  type: 'empty_locale' | 'underutilized_locale' | 'duplicated_keyword' | 'tier_upgrade_possible';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action: {
    type: 'add' | 'move' | 'redistribute';
    keyword?: string;
    fromLocale?: USMarketLocale;
    toLocale?: USMarketLocale;
    expectedImpact: string;
  };
  evidence: {
    affectedLocales: USMarketLocale[];
    currentState: string;
    proposedState: string;
  };
}

interface MultiLocaleIndexation {
  appId: string;
  market: string;
  locales: ProcessedLocaleMetadata[];
  totalUniqueKeywords: number;
  totalCombinations: number;
  coverage: LocaleCoverageAnalysis;
  fusedRankings: FusedRanking[];
  recommendations: MultiLocaleRecommendation[];
  lastUpdated: string;
}

interface MultiLocaleAuditRequest {
  appId: string;
  locales: LocaleMetadata[];
}

interface MultiLocaleAuditResponse {
  success: boolean;
  data?: MultiLocaleIndexation;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  _meta?: {
    appId: string;
    localesProcessed: number;
    executionTimeMs: number;
  };
}

// ==================== UTILITIES ====================

const DEFAULT_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', '&'
]);

/**
 * Simple tokenizer
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Generate n-grams
 */
function generateNgrams(tokens: string[], n: number, stopwords: Set<string>): string[] {
  const ngrams: string[] = [];

  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n);
    // Skip if all tokens are stopwords
    if (gram.every(t => stopwords.has(t))) continue;
    ngrams.push(gram.join(' '));
  }

  return ngrams;
}

/**
 * Analyze if combo exists in text (consecutive or not)
 */
function analyzeComboInText(
  combo: string,
  text: string
): { exists: boolean; isConsecutive: boolean } {
  const normalizedText = text.toLowerCase();
  const normalizedCombo = combo.toLowerCase();
  const comboWords = normalizedCombo.split(' ');

  // Check for exact phrase match (consecutive)
  if (normalizedText.includes(normalizedCombo)) {
    return { exists: true, isConsecutive: true };
  }

  // Check for words in order (non-consecutive)
  let lastIndex = -1;
  for (const word of comboWords) {
    const index = normalizedText.indexOf(word, lastIndex + 1);
    if (index === -1) {
      return { exists: false, isConsecutive: false };
    }
    lastIndex = index;
  }

  // Words found in order but not consecutive
  return { exists: true, isConsecutive: false };
}

/**
 * Classify combo strength based on App Store ranking algorithm
 * Adapted for multi-locale context (simpler tier classification)
 */
function classifyComboStrength(
  comboText: string,
  titleText: string,
  subtitleText: string,
  keywordsText: string,
  titleTokens: string[],
  subtitleTokens: string[],
  keywordsTokens: string[]
): {
  tier: number;
  strengthScore: number;
  isConsecutive: boolean;
  sourceFields: ('title' | 'subtitle' | 'keywords')[];
  canStrengthen: boolean;
  strengtheningSuggestion?: string;
} {
  const titleAnalysis = analyzeComboInText(comboText, titleText);
  const subtitleAnalysis = analyzeComboInText(comboText, subtitleText);
  const keywordsAnalysis = analyzeComboInText(comboText, keywordsText);

  const comboWords = comboText.split(' ');
  const sourceFields: ('title' | 'subtitle' | 'keywords')[] = [];

  // Determine which fields contain complete combo
  const inTitle = titleAnalysis.exists;
  const inSubtitle = subtitleAnalysis.exists;
  const inKeywords = keywordsAnalysis.exists;

  // Track source fields
  if (inTitle) sourceFields.push('title');
  if (inSubtitle) sourceFields.push('subtitle');
  if (inKeywords) sourceFields.push('keywords');

  // Determine which fields contribute individual keywords
  const hasWordsFromTitle = comboWords.some(word =>
    titleTokens.some(kw => kw.toLowerCase() === word.toLowerCase())
  );
  const hasWordsFromSubtitle = comboWords.some(word =>
    subtitleTokens.some(kw => kw.toLowerCase() === word.toLowerCase())
  );
  const hasWordsFromKeywords = comboWords.some(word =>
    keywordsTokens.some(kw => kw.toLowerCase() === word.toLowerCase())
  );

  const fieldContributions = [hasWordsFromTitle, hasWordsFromSubtitle, hasWordsFromKeywords]
    .filter(Boolean).length;

  // Classify into tiers (simplified for multi-locale)
  let tier: number;
  let strengthScore: number;
  let isConsecutive = false;
  let canStrengthen = false;
  let strengtheningSuggestion: string | undefined;

  // TIER 1: Title Consecutive (score: 100)
  if (inTitle && titleAnalysis.isConsecutive) {
    tier = 1;
    strengthScore = 100;
    isConsecutive = true;
    canStrengthen = false;

  // TIER 2: Title Non-Consecutive or Title+Keywords Cross (score: 85)
  } else if ((inTitle && !titleAnalysis.isConsecutive) ||
             (hasWordsFromTitle && hasWordsFromKeywords && !hasWordsFromSubtitle)) {
    tier = 2;
    strengthScore = 85;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = 'Make words consecutive in title for maximum ranking power';

  // TIER 3: Title+Subtitle Cross (score: 70)
  } else if (hasWordsFromTitle && hasWordsFromSubtitle && fieldContributions === 2) {
    tier = 3;
    strengthScore = 70;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = 'Move all keywords to title to strengthen';

  // TIER 4: Keywords/Subtitle Consecutive (score: 50)
  } else if ((inKeywords && !inTitle && keywordsAnalysis.isConsecutive) ||
             (inSubtitle && !inTitle && subtitleAnalysis.isConsecutive)) {
    tier = 4;
    strengthScore = 50;
    isConsecutive = true;
    canStrengthen = true;
    strengtheningSuggestion = 'Move to title to strengthen';

  // TIER 5: Keywords+Subtitle Cross (score: 35)
  } else if (hasWordsFromKeywords && hasWordsFromSubtitle && !hasWordsFromTitle) {
    tier = 5;
    strengthScore = 35;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = 'Move all keywords to title';

  // TIER 6: Non-Consecutive in weak fields (score: 25)
  } else if ((inKeywords && !keywordsAnalysis.isConsecutive) ||
             (inSubtitle && !subtitleAnalysis.isConsecutive)) {
    tier = 6;
    strengthScore = 25;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = 'Move to title and make consecutive';

  // TIER 7: Three-way Cross (score: 15)
  } else if (fieldContributions === 3) {
    tier = 7;
    strengthScore = 15;
    isConsecutive = false;
    canStrengthen = true;
    strengtheningSuggestion = 'Consolidate all keywords into title';

  // MISSING (score: 0)
  } else {
    tier = 8;
    strengthScore = 0;
    isConsecutive = false;
    canStrengthen = false;
  }

  return {
    tier,
    strengthScore,
    isConsecutive,
    sourceFields,
    canStrengthen,
    strengtheningSuggestion,
  };
}

/**
 * Generate locale-bound combinations
 * CRITICAL: All keywords in a combination MUST be from the same locale
 */
function generateLocaleCombnations(
  locale: USMarketLocale,
  titleText: string,
  subtitleText: string,
  keywordsText: string,
  stopwords: Set<string>
): LocaleCombination[] {
  console.log(`[MULTI-LOCALE] Generating combinations for ${locale}...`);

  // Tokenize each field
  const titleTokens = tokenize(titleText);
  const subtitleTokens = tokenize(subtitleText);
  const keywordsTokens = tokenize(keywordsText);

  // Filter stopwords (but keep for now for combo generation)
  const allTokens = [...titleTokens, ...subtitleTokens, ...keywordsTokens];

  // Generate all 2-word, 3-word, and 4-word combinations
  const combos: LocaleCombination[] = [];
  const seenCombos = new Set<string>();

  for (let n = 2; n <= 4; n++) {
    const ngrams = generateNgrams(allTokens, n, stopwords);

    for (const combo of ngrams) {
      // Skip duplicates
      if (seenCombos.has(combo)) continue;
      seenCombos.add(combo);

      // Classify strength
      const classification = classifyComboStrength(
        combo,
        titleText,
        subtitleText,
        keywordsText,
        titleTokens,
        subtitleTokens,
        keywordsTokens
      );

      // Only include combos that exist (tier < 8)
      if (classification.tier < 8) {
        combos.push({
          id: `${locale}-${combo.replace(/\s+/g, '-')}`,
          text: combo,
          keywords: combo.split(' '),
          length: combo.split(' ').length,
          tier: classification.tier,
          strengthScore: classification.strengthScore,
          isConsecutive: classification.isConsecutive,
          sourceLocale: locale, // LOCKED to this locale
          sourceFields: classification.sourceFields,
          canStrengthen: classification.canStrengthen,
          strengtheningSuggestion: classification.strengtheningSuggestion,
        });
      }
    }
  }

  console.log(`[MULTI-LOCALE] ${locale}: Generated ${combos.length} combinations`);

  return combos;
}

/**
 * Calculate locale stats
 */
function calculateLocaleStats(
  tokens: LocaleTokens,
  combinations: LocaleCombination[]
): LocaleStats {
  // Find duplicated tokens across fields
  const tokenFreq = new Map<string, number>();
  tokens.all.forEach(token => {
    tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
  });

  const duplicatedTokens = Array.from(tokenFreq.entries())
    .filter(([_, count]) => count > 1)
    .map(([token, _]) => token);

  return {
    uniqueTokens: new Set(tokens.all).size,
    totalCombos: combinations.length,
    tier1Combos: combinations.filter(c => c.tier === 1).length,
    tier2Combos: combinations.filter(c => c.tier === 2).length,
    tier3PlusCombos: combinations.filter(c => c.tier >= 3).length,
    duplicatedTokens,
    wastedChars: 0, // TODO: Calculate based on duplicate removal potential
  };
}

/**
 * Process a single locale
 */
function processLocale(locale: LocaleMetadata, stopwords: Set<string>): ProcessedLocaleMetadata {
  console.log(`[MULTI-LOCALE] Processing locale: ${locale.locale}`);

  // Tokenize
  const titleTokens = tokenize(locale.title);
  const subtitleTokens = tokenize(locale.subtitle);
  const keywordsTokens = tokenize(locale.keywords);

  const tokens: LocaleTokens = {
    title: titleTokens,
    subtitle: subtitleTokens,
    keywords: keywordsTokens,
    all: [...titleTokens, ...subtitleTokens, ...keywordsTokens],
  };

  // Generate combinations (locale-bound only)
  const combinations = generateLocaleCombnations(
    locale.locale,
    locale.title,
    locale.subtitle,
    locale.keywords,
    stopwords
  );

  // Calculate stats
  const stats = calculateLocaleStats(tokens, combinations);

  return {
    ...locale,
    tokens,
    combinations,
    stats,
  };
}

/**
 * Calculate coverage analysis
 */
function calculateCoverage(locales: ProcessedLocaleMetadata[]): LocaleCoverageAnalysis {
  console.log('[MULTI-LOCALE] Calculating coverage analysis...');

  const totalCombos = locales.reduce((sum, locale) => sum + locale.stats.totalCombos, 0);

  // Calculate contribution % for each locale
  const localeStats = locales.map(locale => ({
    locale: locale.locale,
    uniqueTokens: locale.stats.uniqueTokens,
    totalCombos: locale.stats.totalCombos,
    contributionPct: totalCombos > 0 ? (locale.stats.totalCombos / totalCombos) * 100 : 0,
    duplicateTokens: locale.stats.duplicatedTokens.length,
    emptySlots: locale.title.length + locale.subtitle.length + locale.keywords.length < 160,
  }));

  // Find duplicated keywords across locales
  const keywordLocaleMap = new Map<string, USMarketLocale[]>();

  locales.forEach(locale => {
    locale.tokens.all.forEach(keyword => {
      if (!keywordLocaleMap.has(keyword)) {
        keywordLocaleMap.set(keyword, []);
      }
      keywordLocaleMap.get(keyword)!.push(locale.locale);
    });
  });

  const duplicatedKeywords = Array.from(keywordLocaleMap.entries())
    .filter(([_, locs]) => locs.length > 1)
    .map(([keyword, appearsIn]) => ({
      keyword,
      appearsIn,
      isWasted: appearsIn.length >= 3, // Heuristic: 3+ occurrences is wasteful
    }));

  // Find empty locales
  const emptyLocales = locales
    .filter(locale => !locale.title && !locale.subtitle && !locale.keywords)
    .map(locale => locale.locale);

  // Find underutilized locales
  const underutilizedLocales = locales
    .filter(locale => {
      const charsUsed = locale.title.length + locale.subtitle.length + locale.keywords.length;
      const charsAvailable = 160; // 30 + 30 + 100
      const utilizationPct = (charsUsed / charsAvailable) * 100;
      return charsUsed > 0 && utilizationPct < 50; // Less than 50% utilized
    })
    .map(locale => {
      const charsUsed = locale.title.length + locale.subtitle.length + locale.keywords.length;
      const charsAvailable = 160;
      return {
        locale: locale.locale,
        charsUsed,
        charsAvailable,
        utilizationPct: (charsUsed / charsAvailable) * 100,
      };
    });

  return {
    locales: localeStats,
    duplicatedKeywords,
    emptyLocales,
    underutilizedLocales,
  };
}

/**
 * Fuse rankings across all locales using max() strategy
 * Implements: FinalRank_US(keyword) = max(rank_L(keyword) for L in all locales)
 */
function fuseRankings(locales: ProcessedLocaleMetadata[]): FusedRanking[] {
  console.log('[MULTI-LOCALE] Fusing rankings across all locales...');

  // Map: keyword -> { ranks by locale, combos }
  const keywordMap = new Map<
    string,
    {
      ranksByLocale: Partial<Record<USMarketLocale, { score: number; tier: number }>>;
      combos: LocaleCombination[];
    }
  >();

  // Collect all keywords from all locales
  locales.forEach(locale => {
    locale.combinations.forEach(combo => {
      combo.keywords.forEach(keyword => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, {
            ranksByLocale: {},
            combos: [],
          });
        }

        const entry = keywordMap.get(keyword)!;

        // Store rank for this locale (use BEST combo score for this keyword)
        const existingRank = entry.ranksByLocale[locale.locale];
        if (!existingRank || combo.strengthScore > existingRank.score) {
          entry.ranksByLocale[locale.locale] = {
            score: combo.strengthScore,
            tier: combo.tier,
          };
        }

        // Store combo
        entry.combos.push(combo);
      });
    });
  });

  console.log(`[MULTI-LOCALE] Collected ${keywordMap.size} unique keywords`);

  // Fuse: Take max rank across all locales
  const fusedRankings: FusedRanking[] = [];

  for (const [keyword, data] of keywordMap) {
    let bestScore = 0;
    let bestTier = 7;
    let bestLocale: USMarketLocale = 'EN_US';

    // Find best rank across all locales
    for (const [locale, rank] of Object.entries(data.ranksByLocale)) {
      if (rank.score > bestScore) {
        bestScore = rank.score;
        bestTier = rank.tier;
        bestLocale = locale as USMarketLocale;
      }
    }

    // Determine fusion strategy
    let fusionStrategy: FusedRanking['fusionStrategy'];
    if (bestLocale === 'EN_US') {
      fusionStrategy = 'primary_strongest';
    } else {
      // Check if EN_US also has this keyword
      const enUsRank = data.ranksByLocale['EN_US'];
      if (enUsRank && enUsRank.score === bestScore) {
        fusionStrategy = 'equal_rank';
      } else {
        fusionStrategy = 'secondary_stronger';
      }
    }

    // Generate fusion details
    let fusionDetails: string;
    if (bestLocale === 'EN_US') {
      fusionDetails = `Primary locale (EN_US) provides strongest rank (score: ${bestScore})`;
    } else {
      const enUsRank = data.ranksByLocale['EN_US'];
      if (enUsRank) {
        fusionDetails = `${bestLocale} rank (${bestScore}) stronger than EN_US (${enUsRank.score})`;
      } else {
        fusionDetails = `Only appears in ${bestLocale} (score: ${bestScore})`;
      }
    }

    fusedRankings.push({
      keyword,
      bestScore,
      bestTier,
      bestLocale,
      appearsIn: Object.keys(data.ranksByLocale) as USMarketLocale[],
      ranksByLocale: data.ranksByLocale as Record<USMarketLocale, { score: number; tier: number }>,
      fusionStrategy,
      fusionDetails,
    });
  }

  // Sort by best score (descending)
  fusedRankings.sort((a, b) => b.bestScore - a.bestScore);

  console.log(`[MULTI-LOCALE] Fusion complete: ${fusedRankings.length} keywords fused`);

  return fusedRankings;
}

/**
 * Generate multi-locale optimization recommendations
 * Uses rule-based logic (no AI)
 */
function generateRecommendations(
  locales: ProcessedLocaleMetadata[],
  coverage: LocaleCoverageAnalysis
): MultiLocaleRecommendation[] {
  console.log('[MULTI-LOCALE] Generating recommendations...');

  const recommendations: MultiLocaleRecommendation[] = [];

  // Rule 1: Empty locales
  coverage.emptyLocales.forEach(locale => {
    recommendations.push({
      id: `empty-${locale}`,
      type: 'empty_locale',
      severity: 'warning',
      title: `${locale} locale is empty`,
      message: `The ${locale} locale is empty but indexable by the US App Store. Adding metadata here can expand your keyword coverage.`,
      action: {
        type: 'add',
        toLocale: locale,
        expectedImpact: 'Additional combinations from new keywords',
      },
      evidence: {
        affectedLocales: [locale],
        currentState: 'No metadata',
        proposedState: 'Add Title, Subtitle, and Keywords',
      },
    });
  });

  // Rule 2: Underutilized locales
  coverage.underutilizedLocales.forEach(locale => {
    if (locale.utilizationPct < 30) {
      recommendations.push({
        id: `underutilized-${locale.locale}`,
        type: 'underutilized_locale',
        severity: 'info',
        title: `${locale.locale} is underutilized`,
        message: `Only ${locale.utilizationPct.toFixed(0)}% of available character space is used (${locale.charsUsed}/${locale.charsAvailable} chars).`,
        action: {
          type: 'add',
          toLocale: locale.locale,
          expectedImpact: `${locale.charsAvailable - locale.charsUsed} characters available`,
        },
        evidence: {
          affectedLocales: [locale.locale],
          currentState: `${locale.charsUsed} chars used`,
          proposedState: `Use full ${locale.charsAvailable} chars available`,
        },
      });
    }
  });

  // Rule 3: Wasteful duplications
  const wastefulDupes = coverage.duplicatedKeywords.filter(d => d.isWasted);
  wastefulDupes.slice(0, 5).forEach(dup => {
    recommendations.push({
      id: `duplicate-${dup.keyword}`,
      type: 'duplicated_keyword',
      severity: 'warning',
      title: `"${dup.keyword}" is duplicated across ${dup.appearsIn.length} locales`,
      message: `The keyword "${dup.keyword}" appears in ${dup.appearsIn.length} locales. Duplication is wasteful unless it creates unique locale-specific combinations.`,
      action: {
        type: 'redistribute',
        keyword: dup.keyword,
        expectedImpact: 'Free up character space for new keywords',
      },
      evidence: {
        affectedLocales: dup.appearsIn,
        currentState: `Appears in ${dup.appearsIn.join(', ')}`,
        proposedState: 'Keep in 1-2 locales, redistribute space',
      },
    });
  });

  // Rule 4: Primary locale (EN_US) underutilization
  const enUsLocale = locales.find(l => l.locale === 'EN_US');
  if (enUsLocale) {
    const charsUsed = enUsLocale.title.length + enUsLocale.subtitle.length + enUsLocale.keywords.length;
    const charsAvailable = 160;
    const utilizationPct = (charsUsed / charsAvailable) * 100;

    if (utilizationPct < 80) {
      recommendations.push({
        id: 'en-us-underutilized',
        type: 'underutilized_locale',
        severity: 'critical',
        title: 'EN_US (Primary) is not fully utilized',
        message: `Primary locale EN_US is only ${utilizationPct.toFixed(0)}% utilized. This is the strongest ranking locale - maximize usage here first.`,
        action: {
          type: 'add',
          toLocale: 'EN_US',
          expectedImpact: `${charsAvailable - charsUsed} characters available for Tier 1 combos`,
        },
        evidence: {
          affectedLocales: ['EN_US'],
          currentState: `${charsUsed}/${charsAvailable} chars (${utilizationPct.toFixed(0)}%)`,
          proposedState: 'Maximize EN_US usage to 100%',
        },
      });
    }
  }

  // Sort by severity
  recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  console.log(`[MULTI-LOCALE] Generated ${recommendations.length} recommendations`);

  return recommendations;
}

/**
 * Count total unique keywords across all locales
 */
function countTotalUniqueKeywords(locales: ProcessedLocaleMetadata[]): number {
  const allKeywords = new Set<string>();
  locales.forEach(locale => {
    locale.tokens.all.forEach(keyword => allKeywords.add(keyword));
  });
  return allKeywords.size;
}

// ==================== MAIN HANDLER ====================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { appId, locales }: MultiLocaleAuditRequest = await req.json();

    // Validate input
    if (!appId || !locales || locales.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'appId and locales array are required',
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MULTI-LOCALE] Starting audit for app: ${appId}, locales: ${locales.length}`);

    // Process each locale
    const stopwords = DEFAULT_STOPWORDS;
    const processedLocales = locales.map(locale => processLocale(locale, stopwords));

    // Calculate coverage
    const coverage = calculateCoverage(processedLocales);

    // Fuse rankings
    const fusedRankings = fuseRankings(processedLocales);

    // Generate recommendations
    const recommendations = generateRecommendations(processedLocales, coverage);

    // Count total unique keywords
    const totalUniqueKeywords = countTotalUniqueKeywords(processedLocales);
    const totalCombinations = processedLocales.reduce((sum, l) => sum + l.stats.totalCombos, 0);

    // Build result
    const result: MultiLocaleIndexation = {
      appId,
      market: 'us',
      locales: processedLocales,
      totalUniqueKeywords,
      totalCombinations,
      coverage,
      fusedRankings,
      recommendations,
      lastUpdated: new Date().toISOString(),
    };

    const executionTimeMs = Date.now() - startTime;

    console.log(`[MULTI-LOCALE] Audit complete in ${executionTimeMs}ms`);

    // Return result
    const response: MultiLocaleAuditResponse = {
      success: true,
      data: result,
      _meta: {
        appId,
        localesProcessed: locales.length,
        executionTimeMs,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MULTI-LOCALE] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
