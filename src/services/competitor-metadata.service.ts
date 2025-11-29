/**
 * Competitor Metadata Service
 *
 * Fetches competitor app metadata from App Store API.
 * Used to run ASO Brain analysis on competitor apps.
 *
 * Flow:
 * 1. Fetch competitor metadata from App Store
 * 2. Parse and validate response
 * 3. Return standardized metadata format
 *
 * @module services/competitor-metadata
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// TYPE DEFINITIONS
// =====================================================================

export interface CompetitorMetadataInput {
  appStoreId: string;
  country?: string; // Default: 'US'
}

export interface CompetitorMetadataResult {
  appStoreId: string;
  bundleId: string | null;
  name: string;
  subtitle: string | null;
  description: string;
  keywords: string | null;
  iconUrl: string | null;
  screenshotUrls: string[];
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  price: string | null;
  country: string;
  lastUpdated: string | null;
  version: string | null;
  developerName: string | null;
  rawResponse: any; // Store full API response for debugging
  
  // UI compatibility field (alias for name)
  title?: string;
}

export interface CompetitorMetadataError {
  error: string;
  code: 'NOT_FOUND' | 'INVALID_ID' | 'API_ERROR' | 'NETWORK_ERROR' | 'PARSE_ERROR';
  details?: any;
}

// =====================================================================
// RATE LIMITING & RETRY CONFIGURATION
// =====================================================================

interface RetryOptions {
  maxRetries?: number; // Default: 3
  retryDelay?: number; // Base delay in ms (default: 1000)
  retryableErrorCodes?: Array<'API_ERROR' | 'NETWORK_ERROR'>; // Default: ['NETWORK_ERROR']
}

interface RateLimitOptions {
  batchSize?: number; // Concurrent requests per batch (default: 2)
  delayBetweenBatches?: number; // Delay in ms between batches (default: 1000)
  onProgress?: (completed: number, total: number) => void; // Progress callback
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrorCodes: ['NETWORK_ERROR'],
};

const DEFAULT_RATE_LIMIT_OPTIONS: Required<Omit<RateLimitOptions, 'onProgress'>> = {
  batchSize: 2,
  delayBetweenBatches: 1000,
};

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================================
// APP STORE API CLIENT
// =====================================================================

/**
 * Fetch app metadata from Apple App Store API
 * Uses the public iTunes Search API
 */
async function fetchFromAppStore(
  appStoreId: string,
  country: string = 'US'
): Promise<CompetitorMetadataResult | CompetitorMetadataError> {
  try {
    // Validate App Store ID
    if (!appStoreId || !/^\d+$/.test(appStoreId)) {
      return {
        error: `Invalid App Store ID: ${appStoreId}`,
        code: 'INVALID_ID',
      };
    }

    // Use iTunes Search API
    const url = `https://itunes.apple.com/lookup?id=${appStoreId}&country=${country}&entity=software`;

    console.log(`[CompetitorMetadata] Fetching from App Store: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      return {
        error: `App Store API returned ${response.status}: ${response.statusText}`,
        code: 'API_ERROR',
        details: { status: response.status, statusText: response.statusText },
      };
    }

    const data = await response.json();

    // Check if app found
    if (!data.results || data.results.length === 0) {
      return {
        error: `App not found in ${country} App Store with ID: ${appStoreId}`,
        code: 'NOT_FOUND',
        details: { appStoreId, country },
      };
    }

    const app = data.results[0];

    // Parse metadata
    const metadata: CompetitorMetadataResult = {
      appStoreId: app.trackId.toString(),
      bundleId: app.bundleId || null,
      name: app.trackName || app.trackCensoredName || 'Unknown',
      subtitle: app.subtitle || null,
      description: app.description || '',
      keywords: null, // Keywords are not publicly available in iTunes API
      iconUrl: app.artworkUrl512 || app.artworkUrl100 || null,
      screenshotUrls: app.screenshotUrls || [],
      rating: app.averageUserRating || null,
      reviewCount: app.userRatingCount || null,
      category: app.primaryGenreName || null,
      price: app.formattedPrice || (app.price === 0 ? 'Free' : `$${app.price}`),
      country: app.country || country,
      lastUpdated: app.currentVersionReleaseDate || null,
      version: app.version || null,
      developerName: app.artistName || app.sellerName || null,
      rawResponse: app,
    };

    console.log(`[CompetitorMetadata] ✅ Successfully fetched: ${metadata.name}`);

    return metadata;
  } catch (error: any) {
    console.error('[CompetitorMetadata] ❌ Fetch error:', error);

    return {
      error: error.message || 'Unknown network error',
      code: 'NETWORK_ERROR',
      details: error,
    };
  }
}

// =====================================================================
// RETRY LOGIC
// =====================================================================

/**
 * Fetch competitor metadata with retry logic
 *
 * Retries on transient failures (network errors, 429 rate limits)
 * Uses exponential backoff: 1s, 2s, 4s
 */
async function fetchWithRetry(
  input: CompetitorMetadataInput,
  options: RetryOptions = {}
): Promise<CompetitorMetadataResult | CompetitorMetadataError> {
  const { maxRetries, retryDelay, retryableErrorCodes } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  const { appStoreId, country = 'US' } = input;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await fetchFromAppStore(appStoreId, country);

    // Success - return immediately
    if (!('error' in result)) {
      if (attempt > 1) {
        console.log(
          `[CompetitorMetadata] ✅ Succeeded on attempt ${attempt}/${maxRetries} for ${appStoreId}`
        );
      }
      return result;
    }

    // Non-retryable error - return immediately
    if (!retryableErrorCodes.includes(result.code as any)) {
      console.log(
        `[CompetitorMetadata] ❌ Non-retryable error (${result.code}): ${result.error}`
      );
      return result;
    }

    // Retryable error - retry with exponential backoff
    if (attempt < maxRetries) {
      const delay = retryDelay * attempt; // Exponential backoff: 1s, 2s, 3s
      console.log(
        `[CompetitorMetadata] ⚠️  Attempt ${attempt}/${maxRetries} failed (${result.code}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    } else {
      // Max retries exhausted
      console.error(
        `[CompetitorMetadata] ❌ Max retries (${maxRetries}) exhausted for ${appStoreId}: ${result.error}`
      );
      return result;
    }
  }

  // Should never reach here, but TypeScript needs a return
  return {
    error: 'Max retries exhausted',
    code: 'NETWORK_ERROR',
  };
}

// =====================================================================
// PUBLIC API
// =====================================================================

/**
 * Fetch competitor metadata from App Store
 *
 * @param input - App Store ID and optional country
 * @returns CompetitorMetadataResult or CompetitorMetadataError
 *
 * @example
 * const result = await fetchCompetitorMetadata({
 *   appStoreId: '1234567890',
 *   country: 'US'
 * });
 *
 * if ('error' in result) {
 *   console.error(result.error);
 * } else {
 *   console.log(result.name);
 * }
 */
export async function fetchCompetitorMetadata(
  input: CompetitorMetadataInput,
  retryOptions?: RetryOptions
): Promise<CompetitorMetadataResult | CompetitorMetadataError> {
  // Use retry logic by default
  return fetchWithRetry(input, retryOptions);
}

/**
 * Fetch multiple competitors in parallel (DEPRECATED - use fetchMultipleCompetitorMetadataWithRateLimit)
 *
 * @deprecated Use fetchMultipleCompetitorMetadataWithRateLimit for safe rate-limited fetching
 * @param inputs - Array of App Store IDs and countries
 * @returns Array of results (success or error per competitor)
 */
export async function fetchMultipleCompetitorMetadata(
  inputs: CompetitorMetadataInput[]
): Promise<(CompetitorMetadataResult | CompetitorMetadataError)[]> {
  console.warn(
    '[CompetitorMetadata] ⚠️  DEPRECATED: Use fetchMultipleCompetitorMetadataWithRateLimit for safe rate-limited fetching'
  );
  console.log(`[CompetitorMetadata] Fetching ${inputs.length} competitors in parallel`);

  // Fetch all in parallel (unsafe - may trigger rate limits)
  const results = await Promise.all(inputs.map((input) => fetchCompetitorMetadata(input)));

  const successCount = results.filter((r) => !('error' in r)).length;
  console.log(
    `[CompetitorMetadata] ✅ ${successCount}/${inputs.length} competitors fetched successfully`
  );

  return results;
}

/**
 * Fetch multiple competitors with rate limiting and retry logic
 *
 * Fetches competitors in batches with delays to prevent API rate limiting.
 * Default: 2 concurrent requests per batch, 1s delay between batches.
 *
 * @param inputs - Array of App Store IDs and countries
 * @param options - Rate limiting configuration
 * @returns Array of results (success or error per competitor)
 *
 * @example
 * // Fetch 10 competitors with rate limiting
 * const results = await fetchMultipleCompetitorMetadataWithRateLimit(
 *   competitorInputs,
 *   {
 *     batchSize: 2,
 *     delayBetweenBatches: 1000,
 *     onProgress: (completed, total) => {
 *       console.log(`Progress: ${completed}/${total}`);
 *     }
 *   }
 * );
 */
export async function fetchMultipleCompetitorMetadataWithRateLimit(
  inputs: CompetitorMetadataInput[],
  options?: RateLimitOptions & { retryOptions?: RetryOptions }
): Promise<(CompetitorMetadataResult | CompetitorMetadataError)[]> {
  const { batchSize, delayBetweenBatches, onProgress } = {
    ...DEFAULT_RATE_LIMIT_OPTIONS,
    ...options,
  };

  const retryOptions = options?.retryOptions || {};

  console.log(
    `[CompetitorMetadata] Fetching ${inputs.length} competitors with rate limiting (batchSize: ${batchSize}, delay: ${delayBetweenBatches}ms)`
  );

  const results: (CompetitorMetadataResult | CompetitorMetadataError)[] = [];
  let completed = 0;

  // Process in batches
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(inputs.length / batchSize);

    console.log(
      `[CompetitorMetadata] Processing batch ${batchNumber}/${totalBatches} (${batch.length} competitors)`
    );

    // Fetch batch in parallel
    const batchResults = await Promise.all(
      batch.map((input) => fetchCompetitorMetadata(input, retryOptions))
    );

    results.push(...batchResults);
    completed += batch.length;

    // Report progress
    if (onProgress) {
      onProgress(completed, inputs.length);
    }

    // Delay before next batch (unless this is the last batch)
    if (i + batchSize < inputs.length) {
      console.log(
        `[CompetitorMetadata] Waiting ${delayBetweenBatches}ms before next batch...`
      );
      await sleep(delayBetweenBatches);
    }
  }

  const successCount = results.filter((r) => !('error' in r)).length;
  console.log(
    `[CompetitorMetadata] ✅ Completed: ${successCount}/${inputs.length} competitors fetched successfully`
  );

  return results;
}

/**
 * Store fetched competitor metadata in database (app_competitors table)
 *
 * @param targetAppId - UUID of the target app
 * @param metadata - Fetched competitor metadata
 * @param organizationId - Organization ID
 * @returns Competitor ID (UUID)
 */
export async function storeCompetitorMetadata(
  targetAppId: string,
  metadata: CompetitorMetadataResult,
  organizationId: string
): Promise<{ competitorId: string } | { error: string }> {
  try {
    // Check if competitor already exists
    const { data: existingCompetitor, error: selectError } = await supabase
      .from('app_competitors')
      .select('id')
      .eq('target_app_id', targetAppId)
      .eq('competitor_app_store_id', metadata.appStoreId)
      .maybeSingle();

    if (selectError) {
      console.error('[CompetitorMetadata] ❌ Error checking existing competitor:', selectError);
      return { error: selectError.message };
    }

    if (existingCompetitor) {
      // Update existing competitor
      const { error: updateError } = await supabase
        .from('app_competitors')
        .update({
          competitor_app_name: metadata.name,
          competitor_app_icon: metadata.iconUrl,
          competitor_bundle_id: metadata.bundleId,
          competitor_developer: metadata.developerName,
          competitor_rating: metadata.rating,
          competitor_review_count: metadata.reviewCount,
          competitor_category: metadata.category,
          comparison_summary: {
            lastFetched: new Date().toISOString(),
            metadata: metadata,
          },
        })
        .eq('id', existingCompetitor.id);

      if (updateError) {
        console.error('[CompetitorMetadata] ❌ Error updating competitor:', updateError);
        return { error: updateError.message };
      }

      console.log(`[CompetitorMetadata] ✅ Updated existing competitor: ${metadata.name}`);
      return { competitorId: existingCompetitor.id };
    }

    // Insert new competitor
    const { data: newCompetitor, error: insertError } = await supabase
      .from('app_competitors')
      .insert({
        organization_id: organizationId,
        target_app_id: targetAppId,
        competitor_app_store_id: metadata.appStoreId,
        competitor_app_name: metadata.name,
        competitor_app_icon: metadata.iconUrl,
        competitor_bundle_id: metadata.bundleId,
        competitor_developer: metadata.developerName,
        competitor_category: metadata.category,
        competitor_rating: metadata.rating,
        competitor_review_count: metadata.reviewCount,
        country: metadata.country || 'us',
        comparison_summary: {
          lastFetched: new Date().toISOString(),
          metadata: metadata,
        },
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[CompetitorMetadata] ❌ Error inserting competitor:', insertError);
      return { error: insertError.message };
    }

    console.log(`[CompetitorMetadata] ✅ Inserted new competitor: ${metadata.name}`);
    return { competitorId: newCompetitor.id };
  } catch (error: any) {
    console.error('[CompetitorMetadata] ❌ Unexpected error:', error);
    return { error: error.message || 'Unknown error' };
  }
}

/**
 * Search for apps by name (for competitor discovery)
 *
 * @param query - App name search query
 * @param country - Country code (default: 'US')
 * @param limit - Max results (default: 10)
 * @returns Array of search results
 */
export async function searchApps(
  query: string,
  country: string = 'US',
  limit: number = 10
): Promise<
  Array<{
    appStoreId: string;
    name: string;
    iconUrl: string | null;
    developer: string | null;
    category: string | null;
    rating: number | null;
  }>
> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&country=${country}&entity=software&limit=${limit}`;

    console.log(`[CompetitorMetadata] Searching App Store: ${query}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[CompetitorMetadata] ❌ Search failed: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();

    const results = (data.results || []).map((app: any) => ({
      appStoreId: app.trackId.toString(),
      name: app.trackName || app.trackCensoredName || 'Unknown',
      iconUrl: app.artworkUrl100 || null,
      developer: app.artistName || app.sellerName || null,
      category: app.primaryGenreName || null,
      rating: app.averageUserRating || null,
    }));

    console.log(`[CompetitorMetadata] ✅ Found ${results.length} apps`);

    return results;
  } catch (error: any) {
    console.error('[CompetitorMetadata] ❌ Search error:', error);
    return [];
  }
}
