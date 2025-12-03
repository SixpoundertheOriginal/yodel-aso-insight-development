/**
 * Multi-Locale Metadata Fetcher
 *
 * Fetches Title + Subtitle for secondary locales using existing HTML scraper.
 * Keywords field ALWAYS manual (not available via API).
 */

import { metadataOrchestrator } from './metadata-adapters';
import type { USMarketLocale, LocaleMetadata } from '@/types/multiLocaleMetadata';

/**
 * Tokenize text (simple version - matches backend logic)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export class MultiLocaleMetadataFetcher {
  /**
   * Fetch metadata for a single locale
   * Uses existing metadata orchestrator with locale parameter
   */
  static async fetchSingleLocale(
    appId: string,
    locale: USMarketLocale
  ): Promise<LocaleMetadata> {
    console.log(`[MULTI-LOCALE] Fetching ${locale} for app ${appId}...`);

    try {
      // Convert locale to country code for API
      // e.g., ES_MX -> mx, FR_FR -> fr, EN_US -> us
      const countryCode = this.localeToCountryCode(locale);

      // Use existing metadata orchestrator
      const metadata = await metadataOrchestrator.fetchMetadata(appId, {
        country: countryCode,
        timeout: 30000,
        retries: 2,
      });

      const title = metadata.title || '';
      const subtitle = metadata.subtitle || '';

      console.log(`[MULTI-LOCALE] ✓ Fetched ${locale}: title="${title.substring(0, 20)}...", subtitle="${subtitle.substring(0, 20)}..."`);

      return {
        locale,
        title,
        subtitle,
        keywords: '', // ALWAYS empty - user must enter manually
        fetchStatus: 'fetched',
        fetchError: undefined,
        isAvailable: true,
        tokens: this.extractTokens(title, subtitle, ''),
        combinations: [], // Computed later by audit engine
        stats: this.calculateStats(title, subtitle, ''),
      };

    } catch (error: any) {
      console.warn(`[MULTI-LOCALE] ⚠️ Failed to fetch ${locale}: ${error.message}`);

      // Check if error is "app not available in locale"
      const isNotAvailable = error.message?.includes('not available') ||
                             error.message?.includes('404') ||
                             error.status === 404;

      return {
        locale,
        title: '',
        subtitle: '',
        keywords: '',
        fetchStatus: isNotAvailable ? 'not_available' : 'error',
        fetchError: error.message,
        isAvailable: false,
        tokens: { title: [], subtitle: [], keywords: [], all: [] },
        combinations: [],
        stats: {
          uniqueTokens: 0,
          totalCombos: 0,
          tier1Combos: 0,
          tier2Combos: 0,
          tier3PlusCombos: 0,
          duplicatedTokens: [],
          wastedChars: 0,
        },
      };
    }
  }

  /**
   * Fetch all 10 locales in parallel (bulk fetch)
   */
  static async fetchAllLocales(appId: string): Promise<LocaleMetadata[]> {
    console.log(`[MULTI-LOCALE] Bulk fetching all 10 locales for app ${appId}...`);

    const allLocales: USMarketLocale[] = [
      'EN_US', 'ES_MX', 'RU', 'ZH_HANS', 'AR',
      'FR_FR', 'PT_BR', 'ZH_HANT', 'VI', 'KO'
    ];

    // Fetch all in parallel for performance
    const results = await Promise.allSettled(
      allLocales.map(locale => this.fetchSingleLocale(appId, locale))
    );

    const localeMetadata: LocaleMetadata[] = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Failed fetch - return empty locale
        const locale = allLocales[idx];
        console.error(`[MULTI-LOCALE] ✗ Failed to fetch ${locale}:`, result.reason);
        return this.createEmptyLocale(locale, result.reason?.message);
      }
    });

    const successCount = localeMetadata.filter(l => l.fetchStatus === 'fetched').length;
    const notAvailableCount = localeMetadata.filter(l => l.fetchStatus === 'not_available').length;

    console.log(`[MULTI-LOCALE] Bulk fetch complete: ${successCount} succeeded, ${notAvailableCount} not available`);

    return localeMetadata;
  }

  /**
   * Extract tokens from text (reuse existing tokenization logic)
   */
  private static extractTokens(
    title: string,
    subtitle: string,
    keywords: string
  ): LocaleMetadata['tokens'] {
    const titleTokens = tokenize(title);
    const subtitleTokens = tokenize(subtitle);
    const keywordTokens = keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    return {
      title: titleTokens,
      subtitle: subtitleTokens,
      keywords: keywordTokens,
      all: [...titleTokens, ...subtitleTokens, ...keywordTokens],
    };
  }

  /**
   * Calculate basic stats for locale
   */
  private static calculateStats(
    title: string,
    subtitle: string,
    keywords: string
  ): LocaleMetadata['stats'] {
    const tokens = this.extractTokens(title, subtitle, keywords);
    const uniqueTokens = new Set(tokens.all).size;

    return {
      uniqueTokens,
      totalCombos: 0, // Computed by audit engine
      tier1Combos: 0,
      tier2Combos: 0,
      tier3PlusCombos: 0,
      duplicatedTokens: [],
      wastedChars: 0,
    };
  }

  /**
   * Convert locale code to country code for API
   */
  private static localeToCountryCode(locale: USMarketLocale): string {
    const mapping: Record<USMarketLocale, string> = {
      EN_US: 'us',
      ES_MX: 'mx',
      RU: 'ru',
      ZH_HANS: 'cn',
      AR: 'sa', // Saudi Arabia (representative for Arabic)
      FR_FR: 'fr',
      PT_BR: 'br',
      ZH_HANT: 'tw',
      VI: 'vn',
      KO: 'kr',
    };
    return mapping[locale];
  }

  /**
   * Create empty locale (for failed fetches)
   */
  private static createEmptyLocale(
    locale: USMarketLocale,
    errorMessage?: string
  ): LocaleMetadata {
    return {
      locale,
      title: '',
      subtitle: '',
      keywords: '',
      fetchStatus: 'error',
      fetchError: errorMessage,
      isAvailable: false,
      tokens: { title: [], subtitle: [], keywords: [], all: [] },
      combinations: [],
      stats: {
        uniqueTokens: 0,
        totalCombos: 0,
        tier1Combos: 0,
        tier2Combos: 0,
        tier3PlusCombos: 0,
        duplicatedTokens: [],
        wastedChars: 0,
      },
    };
  }
}
