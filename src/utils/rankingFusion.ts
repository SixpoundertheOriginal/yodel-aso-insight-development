/**
 * Ranking Fusion Algorithm
 * Implements: FinalRank_US(keyword) = max(rank_L(keyword) for L in all US locales)
 */

import type {
  LocaleMetadata,
  LocaleCombination,
  FusedRanking,
  USMarketLocale,
} from '@/types/multiLocaleMetadata';

/**
 * Fuse rankings across all locales using max() strategy
 */
export function fuseRankingsAcrossLocales(
  locales: LocaleMetadata[]
): FusedRanking[] {
  console.log('[RANKING-FUSION] Starting fusion for', locales.length, 'locales...');

  // Map: keyword -> { ranks by locale, combos }
  const keywordMap = new Map<
    string,
    {
      ranksByLocale: Record<USMarketLocale, { score: number; tier: number }>;
      combos: LocaleCombination[];
    }
  >();

  // Collect all keywords from all locales
  locales.forEach(locale => {
    locale.combinations.forEach(combo => {
      combo.keywords.forEach(keyword => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, {
            ranksByLocale: {} as Record<USMarketLocale, { score: number; tier: number }>,
            combos: [],
          });
        }

        const entry = keywordMap.get(keyword)!;

        // Store rank for this locale
        // Use the BEST combo score for this keyword in this locale
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

  console.log('[RANKING-FUSION] Collected', keywordMap.size, 'unique keywords');

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

    fusedRankings.push({
      keyword,
      bestScore,
      bestTier,
      bestLocale,
      appearsIn: Object.keys(data.ranksByLocale) as USMarketLocale[],
      ranksByLocale: data.ranksByLocale,
      combos: data.combos,
      fusionStrategy,
      fusionDetails: generateFusionDetails(keyword, bestLocale, bestScore, data.ranksByLocale),
    });
  }

  // Sort by best score (descending)
  fusedRankings.sort((a, b) => b.bestScore - a.bestScore);

  console.log('[RANKING-FUSION] Fusion complete:', fusedRankings.length, 'keywords fused');

  return fusedRankings;
}

/**
 * Generate human-readable fusion explanation
 */
function generateFusionDetails(
  keyword: string,
  bestLocale: USMarketLocale,
  bestScore: number,
  ranksByLocale: Record<USMarketLocale, { score: number; tier: number }>
): string {
  const localeCount = Object.keys(ranksByLocale).length;

  if (bestLocale === 'EN_US') {
    return `Primary locale (EN_US) provides strongest rank (score: ${bestScore})`;
  } else {
    const enUsRank = ranksByLocale['EN_US'];
    if (enUsRank) {
      return `${bestLocale} rank (${bestScore}) stronger than EN_US (${enUsRank.score})`;
    } else {
      return `Only appears in ${bestLocale} (score: ${bestScore})`;
    }
  }
}

/**
 * Calculate tier distribution across fused rankings
 */
export function calculateFusedTierDistribution(
  fusedRankings: FusedRanking[]
): {
  tier1: number;
  tier2: number;
  tier3Plus: number;
  fromPrimary: number;
  fromSecondary: number;
} {
  return {
    tier1: fusedRankings.filter(r => r.bestTier === 1).length,
    tier2: fusedRankings.filter(r => r.bestTier === 2).length,
    tier3Plus: fusedRankings.filter(r => r.bestTier >= 3).length,
    fromPrimary: fusedRankings.filter(r => r.bestLocale === 'EN_US').length,
    fromSecondary: fusedRankings.filter(r => r.bestLocale !== 'EN_US').length,
  };
}
