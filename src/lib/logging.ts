/**
 * Logging Utilities
 *
 * Privacy-safe logging utilities with debug gating and digest formatting.
 * Ensures SOC2/GDPR compliance by avoiding full object logging.
 *
 * Usage:
 * - debug(): Only shows when window.__ASO_DEBUG__ = true
 * - info(): Always shows (for user actions)
 * - error(): Always shows (for failures)
 * - cooldownLog(): Rate-limited logging (prevents spam)
 * - metadataDigest(): Privacy-safe metadata summary
 */

import type { ScrapedMetadata } from '@/types/aso';

/**
 * Check if debug mode is enabled
 */
const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__ASO_DEBUG__;
};

/**
 * Debug log - only shows when window.__ASO_DEBUG__ = true
 * Use for diagnostic traces, component props, and verbose debugging
 */
export function debug(category: string, message: string, data?: any): void {
  if (isDebugEnabled()) {
    console.log(`[DEBUG-${category}]`, message, data);
  }
}

/**
 * Info log - always shows
 * Use for user actions, phase transitions, and important events
 */
export function info(message: string, data?: any): void {
  console.log(message, data);
}

/**
 * Error log - always shows
 * Use for failures, exceptions, and error conditions
 */
export function error(message: string, err?: any): void {
  console.error(message, err);
}

/**
 * Cooldown log - rate-limited logging
 * Prevents console spam by limiting log frequency per key
 *
 * @param key - Unique identifier for this log
 * @param message - Log message
 * @param data - Optional data to log
 * @param cooldownMs - Minimum milliseconds between logs (default: 5000)
 */
const cooldowns = new Map<string, number>();

export function cooldownLog(
  key: string,
  message: string,
  data?: any,
  cooldownMs: number = 5000
): void {
  const now = Date.now();
  const lastLog = cooldowns.get(key) || 0;

  if (now - lastLog > cooldownMs) {
    console.log(message, data);
    cooldowns.set(key, now);
  }
}

/**
 * Create privacy-safe digest of metadata object
 * Only includes non-sensitive summary fields
 *
 * @param metadata - Full metadata object
 * @returns Privacy-safe digest with summary fields only
 */
export function metadataDigest(metadata: ScrapedMetadata | any): object {
  if (!metadata) return { error: 'metadata is null/undefined' };

  return {
    appId: metadata.appId || 'unknown',
    name: metadata.name ? `${metadata.name.substring(0, 30)}...` : 'unknown',
    hasSubtitle: !!metadata.subtitle,
    subtitleLength: metadata.subtitle?.length || 0,
    hasScreenshots: !!metadata.screenshots?.length,
    screenshotCount: metadata.screenshots?.length || 0,
    source: (metadata as any)._source || 'unknown'
  };
}

/**
 * Create privacy-safe digest of search result
 *
 * @param searchResult - Search result object
 * @returns Privacy-safe digest
 */
export function searchResultDigest(searchResult: any): object {
  if (!searchResult) return { error: 'searchResult is null/undefined' };

  return {
    hasTargetApp: !!searchResult.targetApp,
    targetAppId: searchResult.targetApp?.appId || 'unknown',
    competitorCount: searchResult.competitors?.length || 0,
    searchType: searchResult.searchContext?.type || 'unknown'
  };
}

/**
 * Enable debug mode from console
 * Usage: window.__ASO_DEBUG__ = true
 */
if (typeof window !== 'undefined') {
  (window as any).__ASO_DEBUG__ = (window as any).__ASO_DEBUG__ || false;

  // Helper to toggle debug mode
  (window as any).enableASODebug = () => {
    (window as any).__ASO_DEBUG__ = true;
    console.log('✅ ASO Debug mode enabled');
  };

  (window as any).disableASODebug = () => {
    (window as any).__ASO_DEBUG__ = false;
    console.log('❌ ASO Debug mode disabled');
  };
}
