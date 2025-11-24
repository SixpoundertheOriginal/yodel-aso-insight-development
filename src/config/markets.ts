/**
 * Markets Configuration
 *
 * Defines all supported App Store markets for multi-market monitoring.
 * Each market represents an iOS App Store region where apps can be monitored.
 *
 * Model: AppTweak-style (each market = separate entity)
 */

export interface Market {
  code: string;           // ISO 3166-1 alpha-2 country code
  label: string;          // Human-readable name
  flag: string;           // Flag emoji
  language: string;       // Primary language code (ISO 639-1)
  tier: 1 | 2 | 3;       // Market tier (1 = highest priority)
  currency: string;       // ISO 4217 currency code
}

/**
 * Supported App Store Markets (15 key markets)
 *
 * Tier 1: English-speaking markets (4)
 * Tier 2: Major European markets (5)
 * Tier 3: Nordics + others (6)
 */
export const SUPPORTED_MARKETS: readonly Market[] = [
  // ========== TIER 1: ENGLISH-SPEAKING ==========
  {
    code: 'gb',
    label: 'United Kingdom',
    flag: '🇬🇧',
    language: 'en',
    tier: 1,
    currency: 'GBP',
  },
  {
    code: 'us',
    label: 'United States',
    flag: '🇺🇸',
    language: 'en',
    tier: 1,
    currency: 'USD',
  },
  {
    code: 'ca',
    label: 'Canada',
    flag: '🇨🇦',
    language: 'en',
    tier: 1,
    currency: 'CAD',
  },
  {
    code: 'au',
    label: 'Australia',
    flag: '🇦🇺',
    language: 'en',
    tier: 1,
    currency: 'AUD',
  },

  // ========== TIER 2: MAJOR EUROPEAN ==========
  {
    code: 'de',
    label: 'Germany',
    flag: '🇩🇪',
    language: 'de',
    tier: 2,
    currency: 'EUR',
  },
  {
    code: 'fr',
    label: 'France',
    flag: '🇫🇷',
    language: 'fr',
    tier: 2,
    currency: 'EUR',
  },
  {
    code: 'es',
    label: 'Spain',
    flag: '🇪🇸',
    language: 'es',
    tier: 2,
    currency: 'EUR',
  },
  {
    code: 'it',
    label: 'Italy',
    flag: '🇮🇹',
    language: 'it',
    tier: 2,
    currency: 'EUR',
  },
  {
    code: 'nl',
    label: 'Netherlands',
    flag: '🇳🇱',
    language: 'nl',
    tier: 2,
    currency: 'EUR',
  },

  // ========== TIER 3: NORDICS + OTHERS ==========
  {
    code: 'se',
    label: 'Sweden',
    flag: '🇸🇪',
    language: 'sv',
    tier: 3,
    currency: 'SEK',
  },
  {
    code: 'no',
    label: 'Norway',
    flag: '🇳🇴',
    language: 'no',
    tier: 3,
    currency: 'NOK',
  },
  {
    code: 'dk',
    label: 'Denmark',
    flag: '🇩🇰',
    language: 'da',
    tier: 3,
    currency: 'DKK',
  },
  {
    code: 'fi',
    label: 'Finland',
    flag: '🇫🇮',
    language: 'fi',
    tier: 3,
    currency: 'EUR',
  },
  {
    code: 'pl',
    label: 'Poland',
    flag: '🇵🇱',
    language: 'pl',
    tier: 3,
    currency: 'PLN',
  },
  {
    code: 'br',
    label: 'Brazil',
    flag: '🇧🇷',
    language: 'pt',
    tier: 3,
    currency: 'BRL',
  },
] as const;

/**
 * TypeScript type for market codes (union of all supported codes)
 */
export type MarketCode = typeof SUPPORTED_MARKETS[number]['code'];

/**
 * Default market for new searches and apps
 */
export const DEFAULT_MARKET: MarketCode = 'gb';

/**
 * Get market by code
 *
 * @param code - Market code (e.g., 'gb', 'us')
 * @returns Market object or undefined if not found
 */
export function getMarketByCode(code: string): Market | undefined {
  return SUPPORTED_MARKETS.find((m) => m.code === code);
}

/**
 * Get flag emoji for market code
 *
 * @param code - Market code (e.g., 'gb', 'us')
 * @returns Flag emoji or '🌍' if not found
 */
export function getFlagEmoji(code: string): string {
  const market = getMarketByCode(code);
  return market?.flag || '🌍';
}

/**
 * Get markets grouped by tier
 *
 * @returns Object with tier as key, markets as value
 */
export function getMarketsByTier(): Record<1 | 2 | 3, Market[]> {
  return {
    1: SUPPORTED_MARKETS.filter((m) => m.tier === 1),
    2: SUPPORTED_MARKETS.filter((m) => m.tier === 2),
    3: SUPPORTED_MARKETS.filter((m) => m.tier === 3),
  };
}

/**
 * Validate if market code is supported
 *
 * @param code - Market code to validate
 * @returns True if supported, false otherwise
 */
export function isValidMarketCode(code: string): code is MarketCode {
  return SUPPORTED_MARKETS.some((m) => m.code === code);
}

/**
 * Get market label (for display)
 *
 * @param code - Market code
 * @returns Market label or 'Unknown Market'
 */
export function getMarketLabel(code: string): string {
  const market = getMarketByCode(code);
  return market?.label || 'Unknown Market';
}

/**
 * Format market for display (flag + label)
 *
 * @param code - Market code
 * @returns Formatted string like "🇬🇧 United Kingdom"
 */
export function formatMarket(code: string): string {
  const market = getMarketByCode(code);
  if (!market) return '🌍 Unknown';
  return `${market.flag} ${market.label}`;
}

/**
 * Format market compact (flag + code)
 *
 * @param code - Market code
 * @returns Formatted string like "🇬🇧 GB"
 */
export function formatMarketCompact(code: string): string {
  const market = getMarketByCode(code);
  if (!market) return '🌍 ??';
  return `${market.flag} ${code.toUpperCase()}`;
}

/**
 * Get currency symbol for market
 *
 * @param code - Market code
 * @returns Currency symbol or '$'
 */
export function getCurrencySymbol(code: string): string {
  const market = getMarketByCode(code);
  if (!market) return '$';

  const symbolMap: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    CAD: 'C$',
    AUD: 'A$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    BRL: 'R$',
  };

  return symbolMap[market.currency] || market.currency;
}
