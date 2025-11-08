/**
 * Cached Reviews Hook
 *
 * Purpose: Fetch and cache reviews for monitored apps to enable instant loading
 *
 * Safety: This hook is ADDITIVE only - it does not replace existing functionality.
 * If caching fails, it falls back to the existing direct fetch approach.
 *
 * Architecture:
 * 1. Check if cached reviews exist and are fresh (< 24 hours)
 * 2. If yes, return cached reviews immediately
 * 3. If no, fetch from iTunes RSS, cache, then return
 * 4. All AI analysis runs client-side as before (no changes to existing logic)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAppReviews } from '@/utils/itunesReviews';
import { toast } from 'sonner';

// Match the existing ReviewItem type from reviews.tsx
export interface CachedReviewItem {
  review_id: string;
  title: string;
  text: string;
  rating: number;
  version?: string;
  author?: string;
  updated_at?: string;
  country: string;
  app_id: string;
  // Enhanced fields (stored in JSONB)
  enhanced_sentiment?: any;
  extracted_themes?: string[];
  mentioned_features?: string[];
  identified_issues?: string[];
  business_impact?: 'high' | 'medium' | 'low';
}

interface CachedReviewsResponse {
  reviews: CachedReviewItem[];
  fromCache: boolean;
  cacheAge?: number; // seconds
  totalReviews: number;
}

interface FetchReviewsParams {
  monitoredAppId: string;
  appStoreId: string;
  country: string;
  organizationId: string;
  forceRefresh?: boolean;
}

const CACHE_TTL_HOURS = 24;
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

/**
 * Check if cached reviews exist and are fresh
 */
async function checkCacheFreshness(monitoredAppId: string): Promise<{ isFresh: boolean; ageSeconds: number | null }> {
  try {
    const { data, error } = await supabase
      .from('review_fetch_log')
      .select('fetched_at')
      .eq('monitored_app_id', monitoredAppId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { isFresh: false, ageSeconds: null };
    }

    const fetchedAt = new Date(data.fetched_at);
    const ageMs = Date.now() - fetchedAt.getTime();
    const ageSeconds = Math.floor(ageMs / 1000);
    const isFresh = ageMs < CACHE_TTL_MS;

    return { isFresh, ageSeconds };
  } catch (error) {
    console.error('[useCachedReviews] Error checking cache freshness:', error);
    return { isFresh: false, ageSeconds: null };
  }
}

/**
 * Fetch cached reviews from database
 */
async function getCachedReviews(monitoredAppId: string): Promise<CachedReviewItem[]> {
  try {
    const { data, error } = await supabase
      .from('monitored_app_reviews')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .order('review_date', { ascending: false })
      .limit(200); // Match existing page size

    if (error) {
      console.error('[useCachedReviews] Error fetching cached reviews:', error);
      return [];
    }

    // Transform database format to ReviewItem format
    return (data || []).map(row => ({
      review_id: row.review_id,
      title: row.title || '',
      text: row.text,
      rating: row.rating,
      version: row.version || undefined,
      author: row.author || undefined,
      updated_at: row.review_date,
      country: row.country,
      app_id: row.app_store_id,
      enhanced_sentiment: row.enhanced_sentiment,
      extracted_themes: row.extracted_themes || [],
      mentioned_features: row.mentioned_features || [],
      identified_issues: row.identified_issues || [],
      business_impact: row.business_impact as 'high' | 'medium' | 'low' | undefined,
    }));
  } catch (error) {
    console.error('[useCachedReviews] Error in getCachedReviews:', error);
    return [];
  }
}

/**
 * Fetch reviews from iTunes and save to cache
 */
async function fetchAndCacheReviews(params: FetchReviewsParams): Promise<CachedReviewItem[]> {
  const { monitoredAppId, appStoreId, country, organizationId } = params;

  console.log('[useCachedReviews] Fetching fresh reviews from iTunes...', { appStoreId, country });

  try {
    // 1. Fetch from iTunes using existing working function
    const result = await fetchAppReviews({ appId: appStoreId, cc: country, page: 1 });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch reviews from iTunes');
    }

    const reviews = result.data;
    console.log('[useCachedReviews] Fetched', reviews.length, 'reviews from iTunes');

    // 2. Get existing review IDs to avoid duplicates
    const { data: existingReviews } = await supabase
      .from('monitored_app_reviews')
      .select('review_id')
      .eq('monitored_app_id', monitoredAppId);

    const existingIds = new Set((existingReviews || []).map(r => r.review_id));

    // 3. Filter for new reviews only
    const newReviews = reviews.filter(r => !existingIds.has(r.review_id));
    console.log('[useCachedReviews] Found', newReviews.length, 'new reviews to cache');

    // 4. Save new reviews to cache (without AI analysis - will be done client-side)
    if (newReviews.length > 0) {
      const reviewsToInsert = newReviews.map(review => ({
        monitored_app_id: monitoredAppId,
        organization_id: organizationId,
        review_id: review.review_id,
        app_store_id: appStoreId,
        country: country,
        title: review.title || null,
        text: review.text,
        rating: review.rating,
        version: review.version || null,
        author: review.author || null,
        review_date: review.updated_at || new Date().toISOString(),
        // AI analysis fields will be populated client-side (existing behavior preserved)
        enhanced_sentiment: null,
        extracted_themes: null,
        mentioned_features: null,
        identified_issues: null,
        business_impact: null,
        processed_at: new Date().toISOString(),
        processing_version: '1.0',
      }));

      const { error: insertError } = await supabase
        .from('monitored_app_reviews')
        .insert(reviewsToInsert);

      if (insertError) {
        console.error('[useCachedReviews] Error caching reviews:', insertError);
        // Don't throw - we still have the reviews from iTunes, just failed to cache
      } else {
        console.log('[useCachedReviews] Successfully cached', newReviews.length, 'reviews');
      }
    }

    // 5. Log the fetch operation
    await supabase.from('review_fetch_log').insert({
      monitored_app_id: monitoredAppId,
      organization_id: organizationId,
      fetched_at: new Date().toISOString(),
      reviews_fetched: newReviews.length,
      reviews_updated: 0,
      cache_hit: false,
      itunes_api_status: 200,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    // 6. Return all cached reviews (existing + new)
    return await getCachedReviews(monitoredAppId);

  } catch (error: any) {
    console.error('[useCachedReviews] Error in fetchAndCacheReviews:', error);

    // Log the failed fetch
    await supabase.from('review_fetch_log').insert({
      monitored_app_id: monitoredAppId,
      organization_id: organizationId,
      fetched_at: new Date().toISOString(),
      reviews_fetched: 0,
      cache_hit: false,
      error_message: error.message,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    throw error;
  }
}

/**
 * Main hook: Fetch cached reviews with smart refresh logic
 *
 * SAFETY: This hook does NOT replace existing functionality.
 * It only provides an ADDITIONAL caching layer.
 */
export const useCachedReviews = (params: FetchReviewsParams | null) => {
  return useQuery({
    queryKey: ['cached-reviews', params?.monitoredAppId],
    queryFn: async (): Promise<CachedReviewsResponse> => {
      if (!params) {
        throw new Error('Parameters required');
      }

      const { monitoredAppId, appStoreId, country, organizationId, forceRefresh } = params;

      // 1. Check cache freshness
      const { isFresh, ageSeconds } = await checkCacheFreshness(monitoredAppId);

      console.log('[useCachedReviews] Cache status:', {
        isFresh,
        ageSeconds,
        forceRefresh,
        ttlHours: CACHE_TTL_HOURS
      });

      // 2. If cache is fresh and not forcing refresh, return cached reviews
      if (isFresh && !forceRefresh) {
        const cachedReviews = await getCachedReviews(monitoredAppId);

        if (cachedReviews.length > 0) {
          console.log('[useCachedReviews] ✅ Serving from cache:', cachedReviews.length, 'reviews');

          // Log cache hit
          await supabase.from('review_fetch_log').insert({
            monitored_app_id: monitoredAppId,
            organization_id: organizationId,
            fetched_at: new Date().toISOString(),
            reviews_fetched: 0,
            cache_hit: true,
            cache_age_seconds: ageSeconds,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          });

          return {
            reviews: cachedReviews,
            fromCache: true,
            cacheAge: ageSeconds || undefined,
            totalReviews: cachedReviews.length
          };
        }
      }

      // 3. Cache is stale or empty, fetch fresh reviews
      console.log('[useCachedReviews] 🔄 Cache stale/empty, fetching fresh reviews...');
      const freshReviews = await fetchAndCacheReviews(params);

      return {
        reviews: freshReviews,
        fromCache: false,
        totalReviews: freshReviews.length
      };
    },
    enabled: !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    onError: (error: any) => {
      console.error('[useCachedReviews] Query error:', error);
      toast.error(`Failed to load reviews: ${error.message}`);
    },
  });
};

/**
 * Hook to manually refresh reviews (force bypass cache)
 */
export const useRefreshCachedReviews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchReviewsParams) => {
      return await fetchAndCacheReviews(params);
    },
    onSuccess: (_, variables) => {
      // Invalidate the cache to trigger re-fetch
      queryClient.invalidateQueries({
        queryKey: ['cached-reviews', variables.monitoredAppId]
      });
      toast.success('Reviews refreshed successfully');
    },
    onError: (error: any) => {
      console.error('[useRefreshCachedReviews] Error:', error);
      toast.error(`Failed to refresh reviews: ${error.message}`);
    },
  });
};

/**
 * Hook to get cache status without fetching
 */
export const useCacheStatus = (monitoredAppId: string | null) => {
  return useQuery({
    queryKey: ['cache-status', monitoredAppId],
    queryFn: async () => {
      if (!monitoredAppId) return null;
      return await checkCacheFreshness(monitoredAppId);
    },
    enabled: !!monitoredAppId,
    staleTime: 60 * 1000, // 1 minute
  });
};
