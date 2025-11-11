/**
 * Cached Reviews Hook - Date-Range-Aware
 *
 * Purpose: Fetch and cache reviews for monitored apps with smart date range support
 *
 * Safety: This hook is ADDITIVE only - it does not replace existing functionality.
 * If caching fails, it falls back to the existing direct fetch approach.
 *
 * Architecture:
 * 1. Hot Cache: Store last 90 days of reviews in database (instant load)
 * 2. On-Demand Fetch: User selects date range outside cache → fetch from iTunes
 * 3. Smart Merge: Combine cached + fetched reviews, deduplicate
 * 4. No Over-Caching: Historical reviews (>90 days) fetched but not persisted
 * 5. All AI analysis runs client-side as before (no changes to existing logic)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseCompat } from '@/lib/supabase-compat';
import { fetchAppReviews, fetchReviewsForDateRange } from '@/utils/itunesReviews';
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
  isFetchingHistorical?: boolean; // True when fetching reviews outside cache
}

interface FetchReviewsParams {
  monitoredAppId: string;
  appStoreId: string;
  country: string;
  organizationId: string;
  forceRefresh?: boolean;
  dateRange?: DateRangeFilter; // Optional: fetch reviews for specific date range
}

interface DateRangeFilter {
  fromDate?: string; // ISO date string (YYYY-MM-DD)
  toDate?: string;   // ISO date string (YYYY-MM-DD)
}

interface CacheCoverage {
  isComplete: boolean; // Does cache fully cover the requested date range?
  cachedReviews: CachedReviewItem[]; // Reviews found in cache
  missingRange?: { fromDate: string; toDate: string }; // Date range not in cache
  cacheHitPercentage: number; // 0-100
}

// Cache Configuration
const CACHE_TTL_HOURS = 24; // Refresh cache every 24 hours
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;
const HOT_CACHE_DAYS = 90; // Store last 90 days in database (hot cache)
const MAX_REVIEWS_PER_QUERY = 1000; // Safety cap for database queries
const MAX_REVIEWS_TO_FETCH = 500; // Safety cap for iTunes API fetching

/**
 * Check if cached reviews exist and are fresh
 */
async function checkCacheFreshness(monitoredAppId: string): Promise<{ isFresh: boolean; ageSeconds: number | null }> {
  try {
    const { data, error } = await supabaseCompat.fromAny('review_fetch_log')
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
 * Fetch cached reviews from database with optional date range filtering
 */
async function getCachedReviews(
  monitoredAppId: string,
  dateRange?: DateRangeFilter
): Promise<CachedReviewItem[]> {
  try {
    let query = supabaseCompat.fromAny('monitored_app_reviews')
      .select('*')
      .eq('monitored_app_id', monitoredAppId);

    // Apply date range filter if provided
    if (dateRange?.fromDate) {
      query = query.gte('review_date', dateRange.fromDate);
    }
    if (dateRange?.toDate) {
      // Include entire day by adding time component
      const toDateEnd = new Date(dateRange.toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      query = query.lte('review_date', toDateEnd.toISOString());
    }

    // Order and limit
    query = query.order('review_date', { ascending: false }).limit(MAX_REVIEWS_PER_QUERY);

    const { data, error } = await query;

    if (error) {
      console.error('[useCachedReviews] Error fetching cached reviews:', error);
      return [];
    }

    console.log('[useCachedReviews] Fetched', data?.length || 0, 'cached reviews for range:', dateRange);

    // Transform database format to ReviewItem format
    return (data || []).map((row: any) => ({
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
 * Check if cache covers the requested date range
 * Returns coverage analysis and any missing date ranges
 */
async function checkCacheCoverage(
  monitoredAppId: string,
  dateRange?: DateRangeFilter
): Promise<CacheCoverage> {
  if (!dateRange?.fromDate || !dateRange?.toDate) {
    // No date range specified, use default behavior
    const cached = await getCachedReviews(monitoredAppId);
    return {
      isComplete: cached.length > 0,
      cachedReviews: cached,
      cacheHitPercentage: cached.length > 0 ? 100 : 0,
    };
  }

  // Fetch cached reviews in the requested range
  const cachedReviews = await getCachedReviews(monitoredAppId, dateRange);

  // Check if we have reviews covering the entire date range
  // We consider cache complete if we have reviews OR if the date range is within hot cache window
  const fromDate = new Date(dateRange.fromDate);
  const toDate = new Date(dateRange.toDate);
  const today = new Date();
  const hotCacheCutoff = new Date(today);
  hotCacheCutoff.setDate(today.getDate() - HOT_CACHE_DAYS);

  // If requested range is entirely within hot cache window, we trust the cache
  const isWithinHotCache = fromDate >= hotCacheCutoff;

  // Determine if cache is complete
  let isComplete = false;
  let cacheHitPercentage = 0;

  if (cachedReviews.length > 0) {
    // We have some cached reviews
    const oldestCached = new Date(cachedReviews[cachedReviews.length - 1].updated_at || '');
    const newestCached = new Date(cachedReviews[0].updated_at || '');

    // Check if cached reviews span the entire requested range
    if (oldestCached <= fromDate && newestCached >= toDate) {
      isComplete = true;
      cacheHitPercentage = 100;
    } else if (isWithinHotCache) {
      // Within hot cache window, assume cache is complete
      isComplete = true;
      cacheHitPercentage = 100;
    } else {
      // Partial coverage - estimate percentage
      const requestedDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      const cachedDays = (newestCached.getTime() - oldestCached.getTime()) / (1000 * 60 * 60 * 24);
      cacheHitPercentage = Math.min(100, Math.round((cachedDays / requestedDays) * 100));
    }
  }

  // Determine missing range if cache is incomplete
  let missingRange: { fromDate: string; toDate: string } | undefined;
  if (!isComplete && cachedReviews.length > 0) {
    const oldestCached = new Date(cachedReviews[cachedReviews.length - 1].updated_at || '');
    if (fromDate < oldestCached) {
      missingRange = {
        fromDate: dateRange.fromDate,
        toDate: oldestCached.toISOString().split('T')[0],
      };
    }
  } else if (!isComplete && cachedReviews.length === 0) {
    // No cached reviews, entire range is missing
    missingRange = dateRange;
  }

  console.log('[useCachedReviews] Cache coverage:', {
    isComplete,
    cacheHitPercentage,
    cachedCount: cachedReviews.length,
    missingRange,
  });

  return {
    isComplete,
    cachedReviews,
    missingRange,
    cacheHitPercentage,
  };
}

/**
 * Merge cached and fetched reviews, removing duplicates
 */
function mergeReviews(
  cachedReviews: CachedReviewItem[],
  fetchedReviews: CachedReviewItem[]
): CachedReviewItem[] {
  const reviewMap = new Map<string, CachedReviewItem>();

  // Add cached reviews first (they may have AI enhancements)
  cachedReviews.forEach(review => {
    reviewMap.set(review.review_id, review);
  });

  // Add fetched reviews (won't overwrite existing cached ones)
  fetchedReviews.forEach(review => {
    if (!reviewMap.has(review.review_id)) {
      reviewMap.set(review.review_id, review);
    }
  });

  // Convert back to array and sort by date (newest first)
  return Array.from(reviewMap.values()).sort((a, b) => {
    const dateA = new Date(a.updated_at || '').getTime();
    const dateB = new Date(b.updated_at || '').getTime();
    return dateB - dateA;
  });
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
    const { data: existingReviews } = await supabaseCompat.fromAny('monitored_app_reviews')
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

      const { error: insertError } = await supabaseCompat.fromAny('monitored_app_reviews')
        .insert(reviewsToInsert);

      if (insertError) {
        console.error('[useCachedReviews] Error caching reviews:', insertError);
        // Don't throw - we still have the reviews from iTunes, just failed to cache
      } else {
        console.log('[useCachedReviews] Successfully cached', newReviews.length, 'reviews');
      }
    }

    // 5. Log the fetch operation
    await supabaseCompat.fromAny('review_fetch_log').insert({
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
    await supabaseCompat.fromAny('review_fetch_log').insert({
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
 * Main hook: Fetch cached reviews with smart date-range-aware refresh logic
 *
 * SAFETY: This hook does NOT replace existing functionality.
 * It only provides an ADDITIONAL caching layer with date range support.
 *
 * Features:
 * - Hot cache: Last 90 days served instantly from database
 * - On-demand fetch: Historical reviews fetched from iTunes when needed
 * - Smart merge: Combines cached + fetched reviews, deduplicates
 * - No over-caching: Historical reviews (>90 days) not persisted
 */
export const useCachedReviews = (params: FetchReviewsParams | null) => {
  return useQuery({
    queryKey: ['cached-reviews', params?.monitoredAppId, params?.dateRange],
    queryFn: async (): Promise<CachedReviewsResponse> => {
      if (!params) {
        throw new Error('Parameters required');
      }

      const { monitoredAppId, appStoreId, country, organizationId, forceRefresh, dateRange } = params;

      console.log('[useCachedReviews] Starting fetch with params:', {
        monitoredAppId,
        appStoreId,
        country,
        dateRange,
        forceRefresh
      });

      // 1. Check cache coverage for requested date range
      const coverage = await checkCacheCoverage(monitoredAppId, dateRange);

      console.log('[useCachedReviews] Coverage analysis:', {
        isComplete: coverage.isComplete,
        cacheHitPercentage: coverage.cacheHitPercentage,
        cachedCount: coverage.cachedReviews.length,
        hasMissingRange: !!coverage.missingRange
      });

      // 2. If cache coverage is complete and not forcing refresh, return cached reviews
      if (coverage.isComplete && !forceRefresh) {
        console.log('[useCachedReviews] ✅ Serving from cache:', coverage.cachedReviews.length, 'reviews');

        // Log cache hit
        const { isFresh, ageSeconds } = await checkCacheFreshness(monitoredAppId);
        await supabaseCompat.fromAny('review_fetch_log').insert({
          monitored_app_id: monitoredAppId,
          organization_id: organizationId,
          fetched_at: new Date().toISOString(),
          reviews_fetched: 0,
          cache_hit: true,
          cache_age_seconds: ageSeconds,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

        return {
          reviews: coverage.cachedReviews,
          fromCache: true,
          cacheAge: ageSeconds || undefined,
          totalReviews: coverage.cachedReviews.length,
          isFetchingHistorical: false
        };
      }

      // 3. Need to fetch reviews - either cache is stale OR date range extends beyond cache
      let allReviews = coverage.cachedReviews;

      // If we have a missing date range, fetch those reviews
      if (coverage.missingRange || forceRefresh) {
        console.log('[useCachedReviews] 🔄 Fetching missing reviews...', coverage.missingRange);

        try {
          // Determine which date range to fetch
          const fetchRange = coverage.missingRange || dateRange;

          // Fetch reviews for the missing/requested date range
          const fetchedReviews = await fetchReviewsForDateRange({
            appId: appStoreId,
            cc: country,
            fromDate: fetchRange?.fromDate || '',
            toDate: fetchRange?.toDate || new Date().toISOString().split('T')[0],
            maxReviews: MAX_REVIEWS_TO_FETCH
          });

          console.log('[useCachedReviews] Fetched', fetchedReviews.length, 'reviews from iTunes');

          // Transform fetched reviews to CachedReviewItem format
          const transformedReviews: CachedReviewItem[] = fetchedReviews.map(review => ({
            review_id: review.review_id,
            title: review.title || '',
            text: review.text,
            rating: review.rating,
            version: review.version,
            author: review.author,
            updated_at: review.updated_at,
            country: review.country,
            app_id: review.app_id,
          }));

          // Merge with cached reviews
          allReviews = mergeReviews(coverage.cachedReviews, transformedReviews);

          // Cache new reviews if they're within hot cache window (90 days)
          const shouldCache = fetchRange?.fromDate &&
            new Date(fetchRange.fromDate) >= new Date(Date.now() - HOT_CACHE_DAYS * 24 * 60 * 60 * 1000);

          if (shouldCache && transformedReviews.length > 0) {
            console.log('[useCachedReviews] Caching', transformedReviews.length, 'reviews within hot cache window');

            // Get existing review IDs to avoid duplicates
            const { data: existingReviews } = await supabaseCompat.fromAny('monitored_app_reviews')
              .select('review_id')
              .eq('monitored_app_id', monitoredAppId);

            const existingIds = new Set((existingReviews || []).map((r: any) => r.review_id));

            // Filter for new reviews only
            const newReviews = transformedReviews.filter(r => !existingIds.has(r.review_id));

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
                enhanced_sentiment: null,
                extracted_themes: null,
                mentioned_features: null,
                identified_issues: null,
                business_impact: null,
                processed_at: new Date().toISOString(),
                processing_version: '1.0',
              }));

              const { error: insertError } = await supabaseCompat.fromAny('monitored_app_reviews')
                .insert(reviewsToInsert);

              if (insertError) {
                console.error('[useCachedReviews] Error caching reviews:', insertError);
              } else {
                console.log('[useCachedReviews] Successfully cached', newReviews.length, 'new reviews');
              }
            }
          }

          // Log the fetch operation
          await supabaseCompat.fromAny('review_fetch_log').insert({
            monitored_app_id: monitoredAppId,
            organization_id: organizationId,
            fetched_at: new Date().toISOString(),
            reviews_fetched: transformedReviews.length,
            reviews_updated: 0,
            cache_hit: false,
            itunes_api_status: 200,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          });

        } catch (error: any) {
          console.error('[useCachedReviews] Error fetching reviews:', error);

          // Log the failed fetch
          await supabaseCompat.fromAny('review_fetch_log').insert({
            monitored_app_id: monitoredAppId,
            organization_id: organizationId,
            fetched_at: new Date().toISOString(),
            reviews_fetched: 0,
            cache_hit: false,
            error_message: error.message,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          });

          // If fetch fails, return whatever we have in cache
          if (coverage.cachedReviews.length > 0) {
            return {
              reviews: coverage.cachedReviews,
              fromCache: true,
              totalReviews: coverage.cachedReviews.length,
              isFetchingHistorical: false
            };
          }

          throw error;
        }
      }

      return {
        reviews: allReviews,
        fromCache: coverage.cacheHitPercentage > 50, // Mostly from cache
        totalReviews: allReviews.length,
        isFetchingHistorical: !!coverage.missingRange
      };
    },
    enabled: !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
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
