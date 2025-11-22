/**
 * Metadata Cache Service
 *
 * Manages app metadata caching operations for the ASO audit system.
 * Handles cache reads, writes, TTL validation, and version tracking.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AppMetadataCache,
  CacheLookupParams,
  CreateMetadataCacheInput,
  CacheStatus
} from './types';

/**
 * Cache TTL (Time To Live) in milliseconds.
 * Default: 24 hours = 24 * 60 * 60 * 1000 = 86,400,000 ms
 */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Gets metadata cache entry by lookup parameters.
 * Returns null if no cache entry exists.
 *
 * @param supabase - Supabase client
 * @param params - Cache lookup parameters (org, app, platform, locale)
 * @returns Cache entry or null
 */
export async function getMetadataCache(
  supabase: SupabaseClient,
  params: CacheLookupParams
): Promise<AppMetadataCache | null> {
  const { organization_id, app_id, platform, locale } = params;

  const { data, error } = await supabase
    .from('app_metadata_cache')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .eq('platform', platform)
    .eq('locale', locale)
    .maybeSingle();

  if (error) {
    console.error('[metadataCacheService] Error fetching cache:', error);
    throw new Error(`Failed to fetch metadata cache: ${error.message}`);
  }

  return data as AppMetadataCache | null;
}

/**
 * Creates or updates metadata cache entry.
 * Uses upsert with unique constraint on (organization_id, app_id, platform, locale).
 *
 * @param supabase - Supabase client
 * @param input - Metadata cache data
 * @returns Created/updated cache entry
 */
export async function upsertMetadataCache(
  supabase: SupabaseClient,
  input: CreateMetadataCacheInput
): Promise<AppMetadataCache> {
  const {
    organization_id,
    app_id,
    platform,
    locale,
    title,
    subtitle,
    description,
    developer_name,
    app_icon_url,
    screenshots,
    app_json,
    version_hash
  } = input;

  const payload = {
    organization_id,
    app_id,
    platform,
    locale,
    title,
    subtitle,
    description,
    developer_name,
    app_icon_url,
    screenshots: screenshots || [],
    app_json: app_json || null,
    version_hash,
    fetched_at: new Date().toISOString(),
    // Extensible fields (default to empty)
    screenshot_captions: [],
    feature_cards: [],
    preview_analysis: {}
  };

  const { data, error } = await supabase
    .from('app_metadata_cache')
    .upsert(payload, {
      onConflict: 'organization_id,app_id,platform,locale',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('[metadataCacheService] Error upserting cache:', error);
    throw new Error(`Failed to upsert metadata cache: ${error.message}`);
  }

  return data as AppMetadataCache;
}

/**
 * Checks cache status for given lookup parameters.
 * Returns cache existence, staleness, and refresh necessity.
 *
 * @param supabase - Supabase client
 * @param params - Cache lookup parameters
 * @param ttlMs - Cache TTL in milliseconds (default: 24 hours)
 * @returns Cache status object
 */
export async function checkCacheStatus(
  supabase: SupabaseClient,
  params: CacheLookupParams,
  ttlMs: number = CACHE_TTL_MS
): Promise<CacheStatus> {
  const cache = await getMetadataCache(supabase, params);

  if (!cache) {
    return {
      exists: false,
      isStale: false,
      needsRefresh: true
    };
  }

  const now = Date.now();
  const fetchedAt = new Date(cache.fetched_at).getTime();
  const ageMs = now - fetchedAt;
  const isStale = ageMs > ttlMs;

  return {
    exists: true,
    cache,
    isStale,
    needsRefresh: isStale
  };
}

/**
 * Deletes metadata cache entry.
 * Used for manual cache invalidation or cleanup.
 *
 * @param supabase - Supabase client
 * @param params - Cache lookup parameters
 * @returns True if deleted, false if not found
 */
export async function deleteMetadataCache(
  supabase: SupabaseClient,
  params: CacheLookupParams
): Promise<boolean> {
  const { organization_id, app_id, platform, locale } = params;

  const { error, count } = await supabase
    .from('app_metadata_cache')
    .delete({ count: 'exact' })
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .eq('platform', platform)
    .eq('locale', locale);

  if (error) {
    console.error('[metadataCacheService] Error deleting cache:', error);
    throw new Error(`Failed to delete metadata cache: ${error.message}`);
  }

  return (count || 0) > 0;
}

/**
 * Gets all cache entries for an organization.
 * Useful for workspace views and cache management.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param limit - Max results (default: 100)
 * @returns Array of cache entries
 */
export async function listMetadataCache(
  supabase: SupabaseClient,
  organization_id: string,
  limit: number = 100
): Promise<AppMetadataCache[]> {
  const { data, error } = await supabase
    .from('app_metadata_cache')
    .select('*')
    .eq('organization_id', organization_id)
    .order('fetched_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[metadataCacheService] Error listing cache:', error);
    throw new Error(`Failed to list metadata cache: ${error.message}`);
  }

  return (data || []) as AppMetadataCache[];
}
