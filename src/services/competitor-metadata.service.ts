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
  input: CompetitorMetadataInput
): Promise<CompetitorMetadataResult | CompetitorMetadataError> {
  const { appStoreId, country = 'US' } = input;

  // Fetch from App Store
  const result = await fetchFromAppStore(appStoreId, country);

  return result;
}

/**
 * Fetch multiple competitors in parallel
 *
 * @param inputs - Array of App Store IDs and countries
 * @returns Array of results (success or error per competitor)
 *
 * @example
 * const results = await fetchMultipleCompetitorMetadata([
 *   { appStoreId: '1234567890', country: 'US' },
 *   { appStoreId: '9876543210', country: 'US' },
 * ]);
 */
export async function fetchMultipleCompetitorMetadata(
  inputs: CompetitorMetadataInput[]
): Promise<(CompetitorMetadataResult | CompetitorMetadataError)[]> {
  console.log(`[CompetitorMetadata] Fetching ${inputs.length} competitors in parallel`);

  // Fetch all in parallel
  const results = await Promise.all(inputs.map((input) => fetchCompetitorMetadata(input)));

  const successCount = results.filter((r) => !('error' in r)).length;
  console.log(
    `[CompetitorMetadata] ✅ ${successCount}/${inputs.length} competitors fetched successfully`
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
