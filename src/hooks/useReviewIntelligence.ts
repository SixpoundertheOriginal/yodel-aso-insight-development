/**
 * Review Intelligence Hook
 *
 * Purpose: Fetch pre-computed intelligence snapshots for instant dashboard loading
 *
 * Safety: This is OPTIONAL functionality - the existing client-side AI analysis
 * continues to work. This just provides a faster cached version.
 *
 * Architecture:
 * 1. Check if today's snapshot exists in database
 * 2. If yes, return immediately (instant load)
 * 3. If no, existing client-side analysis runs as before (no change to current behavior)
 * 4. Future: Background job can pre-generate snapshots
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ReviewIntelligence,
  ActionableInsights,
  EnhancedReviewItem
} from '@/types/review-intelligence.types';
import {
  extractReviewIntelligence,
  generateActionableInsights
} from '@/engines/review-intelligence.engine';

interface IntelligenceSnapshot {
  id: string;
  monitored_app_id: string;
  snapshot_date: string;
  reviews_analyzed: number;
  intelligence: ReviewIntelligence;
  actionable_insights: ActionableInsights;
  total_reviews: number;
  average_rating: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  created_at: string;
}

interface GenerateSnapshotParams {
  monitoredAppId: string;
  organizationId: string;
  reviews: EnhancedReviewItem[];
}

/**
 * Fetch today's intelligence snapshot from database
 */
async function getTodaysSnapshot(monitoredAppId: string): Promise<IntelligenceSnapshot | null> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from('review_intelligence_snapshots')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .gte('snapshot_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[useReviewIntelligence] Error fetching snapshot:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[useReviewIntelligence] Error in getTodaysSnapshot:', error);
    return null;
  }
}

/**
 * Generate and save intelligence snapshot
 */
async function generateSnapshot(params: GenerateSnapshotParams): Promise<IntelligenceSnapshot> {
  const { monitoredAppId, organizationId, reviews } = params;

  console.log('[useReviewIntelligence] Generating intelligence snapshot for', reviews.length, 'reviews');

  try {
    // 1. Generate intelligence using existing engine
    const intelligence = extractReviewIntelligence(reviews);
    const actionableInsights = generateActionableInsights(reviews, intelligence);

    // 2. Calculate summary stats
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const sentimentCounts = reviews.reduce(
      (acc, r) => {
        const sentiment = r.enhancedSentiment?.overall || 'neutral';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 } as Record<string, number>
    );

    // 3. Save snapshot to database
    const { data, error } = await supabase
      .from('review_intelligence_snapshots')
      .insert({
        monitored_app_id: monitoredAppId,
        organization_id: organizationId,
        snapshot_date: new Date().toISOString().split('T')[0],
        reviews_analyzed: totalReviews,
        intelligence: intelligence as any, // JSONB
        actionable_insights: actionableInsights as any, // JSONB
        total_reviews: totalReviews,
        average_rating: averageRating,
        sentiment_distribution: sentimentCounts,
        intelligence_version: '1.0',
      })
      .select()
      .single();

    if (error) {
      console.error('[useReviewIntelligence] Error saving snapshot:', error);
      throw error;
    }

    console.log('[useReviewIntelligence] ✅ Snapshot saved successfully');

    return data as IntelligenceSnapshot;
  } catch (error: any) {
    console.error('[useReviewIntelligence] Error in generateSnapshot:', error);
    throw error;
  }
}

/**
 * Hook to fetch intelligence snapshot (cached or generate new)
 *
 * SAFETY: This does NOT replace existing client-side intelligence generation.
 * It's an OPTIONAL optimization that provides pre-computed results when available.
 */
export const useReviewIntelligence = (
  monitoredAppId: string | null,
  reviews: EnhancedReviewItem[] = [],
  organizationId: string | null = null
) => {
  return useQuery({
    queryKey: ['review-intelligence', monitoredAppId],
    queryFn: async (): Promise<IntelligenceSnapshot | null> => {
      if (!monitoredAppId) {
        return null;
      }

      // 1. Try to get today's snapshot from database
      const snapshot = await getTodaysSnapshot(monitoredAppId);

      if (snapshot) {
        console.log('[useReviewIntelligence] ✅ Using cached snapshot from', snapshot.created_at);
        return snapshot;
      }

      // 2. No snapshot exists - this is OK, client-side analysis will run as before
      console.log('[useReviewIntelligence] No snapshot available, client-side analysis will be used');
      return null;

      // Note: We don't auto-generate snapshots here to avoid breaking existing behavior.
      // Snapshots can be generated explicitly using useGenerateIntelligenceSnapshot()
    },
    enabled: !!monitoredAppId,
    staleTime: 60 * 60 * 1000, // 1 hour (snapshots are daily)
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

/**
 * Hook to manually generate intelligence snapshot
 *
 * This can be called after reviews are loaded to save a snapshot for future use
 */
export const useGenerateIntelligenceSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateSnapshotParams) => {
      return await generateSnapshot(params);
    },
    onSuccess: (data, variables) => {
      console.log('[useGenerateIntelligenceSnapshot] Snapshot generated successfully');
      // Invalidate to trigger re-fetch with new snapshot
      queryClient.invalidateQueries({
        queryKey: ['review-intelligence', variables.monitoredAppId]
      });
    },
    onError: (error: any) => {
      console.error('[useGenerateIntelligenceSnapshot] Error:', error);
      // Don't toast error - this is a background optimization, shouldn't bother user
    },
  });
};

/**
 * Hook to get historical snapshots for trend analysis
 *
 * This enables week-over-week, month-over-month comparisons
 */
export const useHistoricalIntelligence = (
  monitoredAppId: string | null,
  days: number = 30
) => {
  return useQuery({
    queryKey: ['historical-intelligence', monitoredAppId, days],
    queryFn: async (): Promise<IntelligenceSnapshot[]> => {
      if (!monitoredAppId) {
        return [];
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('review_intelligence_snapshots')
        .select('*')
        .eq('monitored_app_id', monitoredAppId)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) {
        console.error('[useHistoricalIntelligence] Error:', error);
        return [];
      }

      return data as IntelligenceSnapshot[];
    },
    enabled: !!monitoredAppId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};
