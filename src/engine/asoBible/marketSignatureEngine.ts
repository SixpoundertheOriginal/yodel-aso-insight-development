/**
 * Market Signature Engine
 *
 * Maps locale codes to market profiles for locale-aware rule sets.
 *
 * Phase 8: Simple locale detection
 * Future: Geo-specific overrides, multi-locale support
 */

import type { MarketDetectionResult, MarketProfile } from './ruleset.types';
import { MARKET_PROFILES, getMarketByLocale } from './marketProfiles';

// ============================================================================
// Market Detection
// ============================================================================

/**
 * Detect market based on locale code
 *
 * @param locale - Locale code (e.g., "en-US", "de-DE", "US")
 * @returns Market detection result
 */
export function detectMarket(locale: string): MarketDetectionResult {
  // Normalize locale (handle variations)
  const normalizedLocale = normalizeLocale(locale);

  // Lookup market by locale
  const market = getMarketByLocale(normalizedLocale);

  if (market) {
    return {
      marketId: market.id,
      locale: normalizedLocale,
      market,
    };
  }

  // Default to US market if no match
  return {
    marketId: 'us',
    locale: normalizedLocale,
    market: MARKET_PROFILES.us,
  };
}

// ============================================================================
// Locale Normalization
// ============================================================================

/**
 * Normalize locale code to standard format
 *
 * Examples:
 * - "en-US" → "en-US"
 * - "en_US" → "en-US"
 * - "US" → "en-US"
 * - "de" → "de-DE"
 *
 * @param locale - Raw locale code
 * @returns Normalized locale code
 */
function normalizeLocale(locale: string): string {
  if (!locale) {
    return 'en-US'; // Default
  }

  // Handle underscore separator
  locale = locale.replace('_', '-');

  // Handle country-only codes
  const countryOnlyMap: Record<string, string> = {
    US: 'en-US',
    UK: 'en-GB',
    GB: 'en-GB',
    CA: 'en-CA',
    AU: 'en-AU',
    DE: 'de-DE',
  };

  const upper = locale.toUpperCase();
  if (countryOnlyMap[upper]) {
    return countryOnlyMap[upper];
  }

  // Handle language-only codes (default to most common country)
  const languageOnlyMap: Record<string, string> = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
    pt: 'pt-BR',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
  };

  const lower = locale.toLowerCase();
  if (languageOnlyMap[lower]) {
    return languageOnlyMap[lower];
  }

  // Return as-is if already in standard format
  return locale;
}

// ============================================================================
// Helper: Extract Language from Locale
// ============================================================================

/**
 * Extract language code from locale
 *
 * @param locale - Locale code (e.g., "en-US")
 * @returns Language code (e.g., "en")
 */
export function extractLanguage(locale: string): string {
  const normalized = normalizeLocale(locale);
  return normalized.split('-')[0].toLowerCase();
}

// ============================================================================
// Helper: Extract Country from Locale
// ============================================================================

/**
 * Extract country code from locale
 *
 * @param locale - Locale code (e.g., "en-US")
 * @returns Country code (e.g., "US")
 */
export function extractCountry(locale: string): string {
  const normalized = normalizeLocale(locale);
  const parts = normalized.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : '';
}

// ============================================================================
// Export for Testing
// ============================================================================

export { normalizeLocale };
