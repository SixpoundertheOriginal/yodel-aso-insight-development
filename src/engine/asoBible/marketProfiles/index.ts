/**
 * Market Profiles Registry
 *
 * Defines locale-specific configurations for market-aware rule sets.
 * Each market has:
 * - Locale codes for detection
 * - Optional rule set reference for market-specific overrides
 *
 * Phase 8: Base profiles only (no rule sets yet)
 */

import type { MarketProfile } from '../ruleset.types';

// ============================================================================
// United States Market
// ============================================================================

const US_MARKET: MarketProfile = {
  id: 'us',
  label: 'United States',
  locales: ['en-US', 'en_US', 'US'],
  description: 'United States market (English)',
};

// ============================================================================
// United Kingdom Market
// ============================================================================

const UK_MARKET: MarketProfile = {
  id: 'uk',
  label: 'United Kingdom',
  locales: ['en-GB', 'en_GB', 'GB', 'UK'],
  description: 'United Kingdom market (English)',
};

// ============================================================================
// Canada Market
// ============================================================================

const CA_MARKET: MarketProfile = {
  id: 'ca',
  label: 'Canada',
  locales: ['en-CA', 'en_CA', 'fr-CA', 'fr_CA', 'CA'],
  description: 'Canada market (English, French)',
};

// ============================================================================
// Australia Market
// ============================================================================

const AU_MARKET: MarketProfile = {
  id: 'au',
  label: 'Australia',
  locales: ['en-AU', 'en_AU', 'AU'],
  description: 'Australia market (English)',
};

// ============================================================================
// Germany Market
// ============================================================================

const DE_MARKET: MarketProfile = {
  id: 'de',
  label: 'Germany',
  locales: ['de-DE', 'de_DE', 'de', 'DE'],
  description: 'Germany market (German)',
};

// ============================================================================
// Market Registry
// ============================================================================

export const MARKET_PROFILES: Record<string, MarketProfile> = {
  us: US_MARKET,
  uk: UK_MARKET,
  ca: CA_MARKET,
  au: AU_MARKET,
  de: DE_MARKET,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getAllMarkets(): MarketProfile[] {
  return Object.values(MARKET_PROFILES);
}

export function getMarketById(id: string): MarketProfile | undefined {
  return MARKET_PROFILES[id];
}

export function getMarketByLocale(locale: string): MarketProfile | undefined {
  const normalizedLocale = locale.toUpperCase().replace('-', '_');

  for (const market of getAllMarkets()) {
    const normalizedMarketLocales = market.locales.map((l) =>
      l.toUpperCase().replace('-', '_')
    );

    if (normalizedMarketLocales.includes(normalizedLocale)) {
      return market;
    }

    // Check partial match (e.g., "en" matches "en-US")
    const localePrefix = normalizedLocale.split('_')[0];
    if (normalizedMarketLocales.some((l) => l.startsWith(localePrefix))) {
      return market;
    }
  }

  return undefined;
}
