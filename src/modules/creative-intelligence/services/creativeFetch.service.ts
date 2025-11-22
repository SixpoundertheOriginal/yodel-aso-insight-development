/**
 * Creative Fetch Service
 *
 * Handles fetching screenshots and creative assets from App Store.
 * Will integrate with existing screenshot scraping infrastructure in Phase 1.
 *
 * Phase 0: Stub implementation (21.11.2025)
 */

import type {
  Screenshot,
  CompetitorScreenshot,
  CreativeFetchOptions,
} from '../types';

/**
 * Fetch screenshots for an app
 *
 * @param appId - App Store ID
 * @param options - Fetch options
 * @returns Promise<Screenshot[]>
 *
 * Phase 0: Returns empty array (stub)
 * Phase 1: Will integrate with existing screenshot scraper
 */
export async function fetchAppScreenshots(
  appId: string,
  options?: Partial<CreativeFetchOptions>
): Promise<Screenshot[]> {
  console.log('[Creative Fetch] fetchAppScreenshots called (stub):', { appId, options });

  // Phase 0: Stub implementation
  // Phase 1: Will call existing screenshot scraper or Edge Function
  return [];
}

/**
 * Fetch competitor screenshots
 *
 * @param competitorAppIds - Array of competitor app IDs
 * @param options - Fetch options
 * @returns Promise<CompetitorScreenshot[]>
 *
 * Phase 0: Returns empty array (stub)
 * Phase 1: Will batch fetch competitor screenshots
 */
export async function fetchCompetitorScreenshots(
  competitorAppIds: string[],
  options?: Partial<CreativeFetchOptions>
): Promise<CompetitorScreenshot[]> {
  console.log('[Creative Fetch] fetchCompetitorScreenshots called (stub):', {
    competitorAppIds,
    options,
  });

  // Phase 0: Stub implementation
  // Phase 1: Will batch fetch from multiple apps
  return [];
}

/**
 * Fetch historical screenshots for diff analysis
 *
 * @param appId - App Store ID
 * @param fromDate - Start date for historical data
 * @param toDate - End date for historical data
 * @returns Promise<Screenshot[]>
 *
 * Phase 0: Returns empty array (stub)
 * Phase 2: Will query stored screenshot history
 */
export async function fetchHistoricalScreenshots(
  appId: string,
  fromDate: Date,
  toDate: Date
): Promise<Screenshot[]> {
  console.log('[Creative Fetch] fetchHistoricalScreenshots called (stub):', {
    appId,
    fromDate,
    toDate,
  });

  // Phase 0: Stub implementation
  // Phase 2: Will query database for historical screenshots
  return [];
}

/**
 * Prefetch screenshots for multiple apps
 *
 * @param appIds - Array of app IDs to prefetch
 * @returns Promise<void>
 *
 * Phase 0: No-op (stub)
 * Phase 1: Will implement prefetching for performance
 */
export async function prefetchScreenshots(appIds: string[]): Promise<void> {
  console.log('[Creative Fetch] prefetchScreenshots called (stub):', { appIds });

  // Phase 0: Stub implementation
  // Phase 1: Will implement background prefetching
}
