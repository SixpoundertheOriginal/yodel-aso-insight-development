/**
 * Multi-Locale Analysis Utilities
 * Helper functions for analyzing multi-locale metadata
 */

import type {
  LocaleMetadata,
  LocaleCoverageAnalysis,
  MultiLocaleRecommendation,
  USMarketLocale,
} from '@/types/multiLocaleMetadata';

/**
 * Calculate locale coverage analysis
 */
export function calculateLocaleCoverage(
  locales: LocaleMetadata[]
): LocaleCoverageAnalysis {
  const totalCombos = locales.reduce((sum, locale) => sum + locale.stats.totalCombos, 0);

  // Calculate contribution % for each locale
  const localeStats = locales.map(locale => ({
    locale: locale.locale,
    uniqueTokens: locale.stats.uniqueTokens,
    totalCombos: locale.stats.totalCombos,
    contributionPct: totalCombos > 0 ? (locale.stats.totalCombos / totalCombos) * 100 : 0,
    duplicateTokens: locale.stats.duplicatedTokens.length,
    emptySlots: hasEmptySlots(locale),
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
    .filter(([_, locales]) => locales.length > 1)
    .map(([keyword, appearsIn]) => ({
      keyword,
      appearsIn,
      isWasted: checkIfDuplicationIsWasteful(keyword, locales, appearsIn),
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
 * Check if locale has empty character slots
 */
function hasEmptySlots(locale: LocaleMetadata): boolean {
  const charsUsed = locale.title.length + locale.subtitle.length + locale.keywords.length;
  const charsAvailable = 160; // 30 + 30 + 100
  return charsUsed < charsAvailable;
}

/**
 * Check if keyword duplication is wasteful
 * Duplication is wasteful if it doesn't create new combinations
 */
function checkIfDuplicationIsWasteful(
  keyword: string,
  locales: LocaleMetadata[],
  appearsIn: USMarketLocale[]
): boolean {
  // If keyword appears in only 1 locale, it's not duplicated
  if (appearsIn.length <= 1) return false;

  // Check if duplication creates new combos
  // For now, mark as wasteful if appears in 3+ locales
  // (Rule-based heuristic: excessive duplication is usually wasteful)
  return appearsIn.length >= 3;
}

/**
 * Generate multi-locale optimization recommendations
 * Uses rule-based logic (no AI)
 */
export function generateMultiLocaleRecommendations(
  locales: LocaleMetadata[],
  coverage: LocaleCoverageAnalysis
): MultiLocaleRecommendation[] {
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

  if (wastefulDupes.length > 0) {
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
          proposedState: `Keep in 1-2 locales, redistribute space`,
        },
      });
    });
  }

  // Rule 4: Cross-locale opportunities (find keywords that could benefit from better placement)
  locales.forEach(locale => {
    // If locale has weak combos (Tier 3+), suggest moving to stronger locale
    const weakCombos = locale.combinations.filter(c => c.tier >= 3);

    if (weakCombos.length > 3 && locale.locale !== 'EN_US') {
      // Extract most common keywords from weak combos
      const keywordFreq = new Map<string, number>();
      weakCombos.forEach(combo => {
        combo.keywords.forEach(kw => {
          keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1);
        });
      });

      const topKeyword = Array.from(keywordFreq.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (topKeyword) {
        recommendations.push({
          id: `tier-upgrade-${locale.locale}-${topKeyword[0]}`,
          type: 'tier_upgrade_possible',
          severity: 'info',
          title: `Move "${topKeyword[0]}" to EN_US for stronger ranking`,
          message: `"${topKeyword[0]}" appears in ${topKeyword[1]} Tier 3+ combos in ${locale.locale}. Moving to EN_US could upgrade to Tier 1.`,
          action: {
            type: 'move',
            keyword: topKeyword[0],
            fromLocale: locale.locale,
            toLocale: 'EN_US',
            expectedImpact: `Upgrade ${topKeyword[1]} combos from Tier 3+ to Tier 1`,
          },
          evidence: {
            affectedLocales: [locale.locale, 'EN_US'],
            currentState: `${topKeyword[1]} Tier 3+ combos in ${locale.locale}`,
            proposedState: `Upgrade to Tier 1 in EN_US`,
          },
        });
      }
    }
  });

  // Rule 5: Primary locale (EN_US) underutilization
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
  return recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Count total unique keywords across all locales
 */
export function countTotalUniqueKeywords(locales: LocaleMetadata[]): number {
  const allKeywords = new Set<string>();

  locales.forEach(locale => {
    locale.tokens.all.forEach(keyword => allKeywords.add(keyword));
  });

  return allKeywords.size;
}
