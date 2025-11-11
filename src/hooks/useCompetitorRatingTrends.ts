/**
 * COMPETITOR RATING TRENDS HOOK
 *
 * Fetches historical rating data for multiple apps to power trend charts
 * Uses review_intelligence_snapshots and competitor_metrics_snapshots
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

      // 1. Fetch PRIMARY APP data from review_intelligence_snapshots
      if (primaryAppId) {
        const { data: primarySnapshots, error: primaryError } = await supabase
          .from('review_intelligence_snapshots')
          .select('snapshot_date, average_rating, reviews_analyzed')
          .eq('monitored_app_id', primaryAppId)
          .gte('snapshot_date', format(startDate, 'yyyy-MM-dd'))
          .lte('snapshot_date', format(endDate, 'yyyy-MM-dd'))
          .order('snapshot_date', { ascending: true });

        if (primaryError) {
          console.error('[useCompetitorRatingTrends] Primary app error:', primaryError);
        } else if (primarySnapshots && primarySnapshots.length > 0) {
          // Get app metadata from monitored_apps
          const { data: primaryApp } = await supabase
            .from('monitored_apps')
            .select('app_name, app_icon, app_store_id')
            .eq('id', primaryAppId)
            .single();

          if (primaryApp) {
            trends.push({
              appId: primaryApp.app_store_id,
              appName: primaryApp.app_name,
              appIcon: primaryApp.app_icon,
              isPrimary: true,
              data: primarySnapshots.map((snapshot) => ({
                date: snapshot.snapshot_date,
                rating: Number(snapshot.average_rating) || 0,
                reviewCount: snapshot.reviews_analyzed,
              })),
            });

            console.log(`✅ [Primary] ${primaryApp.app_name}: ${primarySnapshots.length} data points`);
          }
        } else {
          console.warn('[useCompetitorRatingTrends] No snapshots found for primary app');
        }
      }

      // 2. Fetch COMPETITOR data
      // First, try review_intelligence_snapshots if they're monitored apps
      // Then fall back to competitor_metrics_snapshots

      for (const competitor of competitorAppIds) {
        let foundData = false;

        // Try as monitored app first (more detailed data)
        if (competitor.monitoredAppId) {
          const { data: compSnapshots, error: compError } = await supabase
            .from('review_intelligence_snapshots')
            .select('snapshot_date, average_rating, reviews_analyzed')
            .eq('monitored_app_id', competitor.monitoredAppId)
            .gte('snapshot_date', format(startDate, 'yyyy-MM-dd'))
            .lte('snapshot_date', format(endDate, 'yyyy-MM-dd'))
            .order('snapshot_date', { ascending: true });

          if (!compError && compSnapshots && compSnapshots.length > 0) {
            trends.push({
              appId: competitor.appId,
              appName: competitor.appName,
              appIcon: competitor.appIcon,
              isPrimary: false,
              data: compSnapshots.map((snapshot) => ({
                date: snapshot.snapshot_date,
                rating: Number(snapshot.average_rating) || 0,
                reviewCount: snapshot.reviews_analyzed,
              })),
            });

            console.log(`✅ [Competitor] ${competitor.appName}: ${compSnapshots.length} data points (monitored)`);
            foundData = true;
          }
        }

        // Fallback to competitor_metrics_snapshots
        if (!foundData) {
          const { data: metricsSnapshots, error: metricsError } = await supabase
            .from('competitor_metrics_snapshots')
            .select('snapshot_date, rating, review_count')
            .eq('organization_id', organizationId)
            .eq('competitor_app_store_id', competitor.appId)
            .gte('snapshot_date', format(startDate, 'yyyy-MM-dd'))
            .lte('snapshot_date', format(endDate, 'yyyy-MM-dd'))
            .order('snapshot_date', { ascending: true });

          if (!metricsError && metricsSnapshots && metricsSnapshots.length > 0) {
            trends.push({
              appId: competitor.appId,
              appName: competitor.appName,
              appIcon: competitor.appIcon,
              isPrimary: false,
              data: metricsSnapshots.map((snapshot) => ({
                date: snapshot.snapshot_date,
                rating: Number(snapshot.rating) || 0,
                reviewCount: snapshot.review_count,
              })),
            });

            console.log(`✅ [Competitor] ${competitor.appName}: ${metricsSnapshots.length} data points (metrics)`);
            foundData = true;
          }
        }

        if (!foundData) {
          console.warn(`⚠️ [Competitor] No data found for ${competitor.appName}`);
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
