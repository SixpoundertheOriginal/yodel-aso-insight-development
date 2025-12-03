/**
 * Multi-Locale Metadata Types
 * For US Market 10-locale indexation system
 */

import { ComboStrength } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

// US Market Locales (Apple App Store)
export type USMarketLocale =
  | 'EN_US'     // Primary - English (United States)
  | 'ES_MX'     // Spanish (Mexico)
  | 'RU'        // Russian
  | 'ZH_HANS'   // Simplified Chinese
  | 'AR'        // Arabic
  | 'FR_FR'     // French (France)
  | 'PT_BR'     // Portuguese (Brazil)
  | 'ZH_HANT'   // Traditional Chinese
  | 'VI'        // Vietnamese
  | 'KO';       // Korean

export const LOCALE_NAMES: Record<USMarketLocale, string> = {
  EN_US: '🇺🇸 English (US)',
  ES_MX: '🇲🇽 Spanish (Mexico)',
  RU: '🇷🇺 Russian',
  ZH_HANS: '🇨🇳 Simplified Chinese',
  AR: '🇸🇦 Arabic',
  FR_FR: '🇫🇷 French (France)',
  PT_BR: '🇧🇷 Portuguese (Brazil)',
  ZH_HANT: '🇹🇼 Traditional Chinese',
  VI: '🇻🇳 Vietnamese',
  KO: '🇰🇷 Korean',
};

// Locale metadata structure
export interface LocaleMetadata {
  locale: USMarketLocale;

  // Metadata fields
  title: string;    // Max 30 chars
  subtitle: string; // Max 30 chars
  keywords: string; // Max 100 chars (ALWAYS manual)

  // Fetch status
  fetchStatus: 'idle' | 'fetching' | 'fetched' | 'error' | 'not_available';
  fetchError?: string;
  isAvailable: boolean; // App exists in this locale

  // Extracted tokens (computed after fetch/edit)
  tokens: {
    title: string[];
    subtitle: string[];
    keywords: string[];
    all: string[]; // Combined (for combo generation)
  };

  // Combinations (locale-bound only - NO cross-locale mixing)
  combinations: LocaleCombination[];

  // Stats
  stats: {
    uniqueTokens: number;
    totalCombos: number;
    tier1Combos: number;
    tier2Combos: number;
    tier3PlusCombos: number;
    duplicatedTokens: string[]; // Tokens that appear in other locales
    wastedChars: number; // Characters wasted on duplicates
  };
}

// Locale-specific combination (MUST NOT cross locales)
export interface LocaleCombination {
  id: string;
  text: string;
  keywords: string[]; // ALL must be from same locale
  length: number; // 2, 3, or 4

  // Strength classification (reuse existing ComboStrength enum)
  strength: ComboStrength;
  strengthScore: number; // 0-100
  tier: number; // 1-7 based on strength
  isConsecutive: boolean;

  // Source tracking (CRITICAL for preventing cross-locale mixing)
  sourceLocale: USMarketLocale; // LOCKED to one locale
  sourceFields: ('title' | 'subtitle' | 'keywords')[]; // Which fields contribute

  // Strengthening suggestions (reuse existing logic)
  canStrengthen: boolean;
  strengtheningSuggestion?: string;
}

// Multi-locale indexation result
export interface MultiLocaleIndexation {
  appId: string;
  market: 'us'; // Extensible to 'gb', 'de', etc. in future

  // All 10 locales
  locales: LocaleMetadata[];

  // Aggregated analysis
  totalUniqueKeywords: number; // Across all locales
  totalCombinations: number; // Sum of all locale combos

  // Locale coverage analysis
  coverage: LocaleCoverageAnalysis;

  // Ranking fusion (max rank across locales)
  fusedRankings: FusedRanking[];

  // Optimization opportunities
  recommendations: MultiLocaleRecommendation[];

  // Metadata timestamp
  lastUpdated: string;
}

// Locale coverage analysis
export interface LocaleCoverageAnalysis {
  locales: Array<{
    locale: USMarketLocale;
    uniqueTokens: number;
    totalCombos: number;
    contributionPct: number; // % of total combos
    duplicateTokens: number;
    emptySlots: boolean; // Has unused character space
  }>;

  // Duplication matrix
  duplicatedKeywords: Array<{
    keyword: string;
    appearsIn: USMarketLocale[]; // Which locales have this keyword
    isWasted: boolean; // True if duplication doesn't create new combos
  }>;

  // Empty/underutilized locales
  emptyLocales: USMarketLocale[]; // No metadata filled
  underutilizedLocales: Array<{
    locale: USMarketLocale;
    charsUsed: number;
    charsAvailable: number; // Total: 160 (30+30+100)
    utilizationPct: number;
  }>;
}

// Fused ranking result
export interface FusedRanking {
  keyword: string;

  // Best ranking across all locales (fusion logic: max)
  bestScore: number;
  bestTier: number;
  bestLocale: USMarketLocale; // Which locale provides strongest rank

  // All locales where keyword appears
  appearsIn: USMarketLocale[];
  ranksByLocale: Record<USMarketLocale, { score: number; tier: number }>; // Locale -> rank score

  // Combos containing this keyword
  combos: LocaleCombination[];

  // Fusion strategy explanation
  fusionStrategy: 'primary_strongest' | 'secondary_stronger' | 'equal_rank';
  fusionDetails: string; // Human-readable explanation
}

// Multi-locale recommendation
export interface MultiLocaleRecommendation {
  id: string;
  type:
    | 'empty_locale'          // Locale is empty but indexable
    | 'duplicated_keyword'    // Keyword appears in multiple locales (may be wasteful)
    | 'move_keyword'          // Move keyword to different locale for better combos
    | 'underutilized_locale'  // Locale has space available
    | 'cross_locale_opportunity' // Could enable new combos by distributing keywords
    | 'tier_upgrade_possible'; // Can strengthen combo by moving to better locale

  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;

  // Actionable suggestion
  action?: {
    type: 'move' | 'add' | 'remove' | 'redistribute';
    keyword?: string;
    fromLocale?: USMarketLocale;
    toLocale?: USMarketLocale;
    expectedImpact: string; // e.g., "+5 Tier 1 combos"
  };

  // Supporting data
  evidence: {
    affectedLocales: USMarketLocale[];
    currentState: string;
    proposedState: string;
  };
}
