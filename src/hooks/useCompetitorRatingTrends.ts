/**
 * COMPETITOR RATING TRENDS HOOK
 *
 * Fetches historical rating data for multiple apps to power trend charts
 *
 * Data sources (in priority order):
 * 1. review_intelligence_snapshots (pre-computed, fastest)
 * 2. competitor_metrics_snapshots (for tracked competitors)
 * 3. monitored_app_reviews (calculate on-the-fly from cached reviews)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, subYears, startOfDay } from 'date-fns';

export interface RatingDataPoint {
  date: string; // ISO date string
  rating: number;
  reviewCount?: number;
}

export interface AppRatingTrend {
  appId: string;
  appName: string;
  appIcon: string;
  isPrimary: boolean;
  data: RatingDataPoint[];
}

interface UseCompetitorRatingTrendsParams {
  organizationId: string;
  primaryAppId: string | null; // monitored_app_id for primary app
  competitorAppIds: Array<{
    appId: string; // app_store_id
    appName: string;
    appIcon: string;
    monitoredAppId?: string; // If this competitor is also a monitored app
  }>;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Calculate rating trends from raw cached reviews
 * (Fallback when snapshots aren't available)
 * Uses same grouping logic as Reviews page
 */
async function calculateTrendsFromReviews(
  monitoredAppId: string,
  startDate: Date,
  endDate: Date
): Promise<RatingDataPoint[]> {
  console.log(`📊 [Fallback] Calculating trends from cached reviews for monitored_app_id: ${monitoredAppId}`);

  // Fetch all reviews for this app in the date range
  const { data: reviews, error } = await supabase
    .from('monitored_app_reviews')
    .select('review_date, rating')
    .eq('monitored_app_id', monitoredAppId)
    .gte('review_date', format(startDate, 'yyyy-MM-dd'))
    .lte('review_date', format(endDate, 'yyyy-MM-dd'))
    .order('review_date', { ascending: true });

  if (error) {
    console.error('[calculateTrendsFromReviews] Query error:', error);
    return [];
  }

  if (!reviews || reviews.length === 0) {
    console.warn('[calculateTrendsFromReviews] No cached reviews found');
    return [];
  }

  console.log(`📊 [Fallback] Found ${reviews.length} cached reviews, grouping by date...`);

  // Group reviews by date and calculate daily average rating
  // Same logic as Reviews page (reviews.tsx line 1219-1242)
  const buckets: Record<string, { date: string; count: number; sumRating: number }> = {};

  for (const review of reviews) {
    if (!review.review_date || !review.rating) continue;

    const date = review.review_date; // Already in YYYY-MM-DD format

    if (!buckets[date]) {
      buckets[date] = { date, count: 0, sumRating: 0 };
    }

    buckets[date].count += 1;
    buckets[date].sumRating += review.rating;
  }

  // Convert to array and calculate averages
  const dataPoints = Object.values(buckets)
    .map(bucket => ({
      date: bucket.date,
      rating: bucket.count > 0 ? Number((bucket.sumRating / bucket.count).toFixed(2)) : 0,
      reviewCount: bucket.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`✅ [Fallback] Calculated ${dataPoints.length} daily data points`);
  return dataPoints;
}

/**
 * Fetch historical rating trends for primary app and competitors
 */
export function useCompetitorRatingTrends(params: UseCompetitorRatingTrendsParams) {
  const {
    organizationId,
    primaryAppId,
    competitorAppIds,
    startDate,
    endDate,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: [
      'competitor-rating-trends',
      organizationId,
      primaryAppId,
      competitorAppIds.map(c => c.appId).join(','),
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: async (): Promise<AppRatingTrend[]> => {
      console.log('[useCompetitorRatingTrends] Fetching trends...', {
        primaryAppId,
        competitors: competitorAppIds.length,
        dateRange: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
      });

      const trends: AppRatingTrend[] = [];

      // 1. Fetch PRIMARY APP data
      if (primaryAppId) {
        // Get app metadata first (needed for both snapshot and fallback paths)
        const { data: primaryApp } = await supabase
          .from('monitored_apps')
          .select('app_name, app_icon, app_store_id')
          .eq('id', primaryAppId)
          .single();

        if (!primaryApp) {
          console.error('[useCompetitorRatingTrends] Primary app metadata not found');
        } else {
          let primaryData: RatingDataPoint[] = [];

          // Try snapshots first (FAST PATH)
          const { data: primarySnapshots, error: primaryError } = await supabase
            .from('review_intelligence_snapshots')
            .select('snapshot_date, average_rating, reviews_analyzed')
            .eq('monitored_app_id', primaryAppId)
            .gte('snapshot_date', format(startDate, 'yyyy-MM-dd'))
            .lte('snapshot_date', format(endDate, 'yyyy-MM-dd'))
            .order('snapshot_date', { ascending: true });

          if (primaryError) {
            console.error('[useCompetitorRatingTrends] Primary app snapshot error:', primaryError);
          } else if (primarySnapshots && primarySnapshots.length > 0) {
            primaryData = primarySnapshots.map((snapshot) => ({
              date: snapshot.snapshot_date,
              rating: Number(snapshot.average_rating) || 0,
              reviewCount: snapshot.reviews_analyzed,
            }));
            console.log(`✅ [Primary] ${primaryApp.app_name}: ${primarySnapshots.length} snapshot data points`);
          }

          // FALLBACK: Calculate from cached reviews if no snapshots
          if (primaryData.length === 0) {
            console.log(`⚠️ [Primary] No snapshots for ${primaryApp.app_name}, trying cached reviews...`);
            primaryData = await calculateTrendsFromReviews(primaryAppId, startDate, endDate);
          }

          // Add to trends if we got any data
          if (primaryData.length > 0) {
            trends.push({
              appId: primaryApp.app_store_id,
              appName: primaryApp.app_name,
              appIcon: primaryApp.app_icon,
              isPrimary: true,
              data: primaryData,
            });
          } else {
            console.warn(`⚠️ [Primary] No data available for ${primaryApp.app_name}`);
          }
        }
      }

      // 2. Fetch COMPETITOR data
      // Priority: snapshots → competitor_metrics → cached reviews
      for (const competitor of competitorAppIds) {
        let competitorData: RatingDataPoint[] = [];

        // PATH 1: Try as monitored app (snapshots)
        if (competitor.monitoredAppId) {
          const { data: compSnapshots, error: compError } = await supabase
            .from('review_intelligence_snapshots')
            .select('snapshot_date, average_rating, reviews_analyzed')
            .eq('monitored_app_id', competitor.monitoredAppId)
            .gte('snapshot_date', format(startDate, 'yyyy-MM-dd'))
            .lte('snapshot_date', format(endDate, 'yyyy-MM-dd'))
            .order('snapshot_date', { ascending: true });

          if (!compError && compSnapshots && compSnapshots.length > 0) {
            competitorData = compSnapshots.map((snapshot) => ({
              date: snapshot.snapshot_date,
              rating: Number(snapshot.average_rating) || 0,
              reviewCount: snapshot.reviews_analyzed,
            }));
            console.log(`✅ [Competitor] ${competitor.appName}: ${compSnapshots.length} snapshot data points`);
          }
        }

        // PATH 2: Try competitor_metrics_snapshots
        if (competitorData.length === 0) {
          const { data: metricsSnapshots, error: metricsError } = await supabase
            .from('competitor_metrics_snapshots')
            .select('snapshot_date, rating, review_count')
            .eq('organization_id', organizationId)
            .eq('competitor_app_store_id', competitor.appId)
            .gte('snapshot_date', format(startDate, 'yyyy-MM-dd'))
            .lte('snapshot_date', format(endDate, 'yyyy-MM-dd'))
            .order('snapshot_date', { ascending: true });

          if (!metricsError && metricsSnapshots && metricsSnapshots.length > 0) {
            competitorData = metricsSnapshots.map((snapshot) => ({
              date: snapshot.snapshot_date,
              rating: Number(snapshot.rating) || 0,
              reviewCount: snapshot.review_count,
            }));
            console.log(`✅ [Competitor] ${competitor.appName}: ${metricsSnapshots.length} metrics data points`);
          }
        }

        // PATH 3: FALLBACK - Calculate from cached reviews
        // This is KEY: competitors may have cached reviews even if they're not "monitored"
        if (competitorData.length === 0) {
          console.log(`⚠️ [Competitor] No snapshots for ${competitor.appName}, checking for cached reviews...`);

          // Try to find if this competitor has any cached reviews
          // (They might have been fetched during a comparison and stored)
          const { data: monitoredApp } = await supabase
            .from('monitored_apps')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('app_store_id', competitor.appId)
            .maybeSingle();

          if (monitoredApp) {
            console.log(`📊 [Competitor] Found monitored_app entry for ${competitor.appName}, calculating from reviews...`);
            competitorData = await calculateTrendsFromReviews(monitoredApp.id, startDate, endDate);
          }
        }

        // Add to trends if we got any data
        if (competitorData.length > 0) {
          trends.push({
            appId: competitor.appId,
            appName: competitor.appName,
            appIcon: competitor.appIcon,
            isPrimary: false,
            data: competitorData,
          });
        } else {
          console.warn(`⚠️ [Competitor] No data available for ${competitor.appName}`);
        }
      }

      console.log(`[useCompetitorRatingTrends] Fetched ${trends.length} app trends`);
      return trends;
    },
    enabled:
      enabled &&
      !!organizationId &&
      (!!primaryAppId || competitorAppIds.length > 0),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
