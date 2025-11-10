/**
 * REVIEW INTELLIGENCE HOOK
 *
 * React Query hook for fetching and managing review intelligence data.
 * Handles caching, loading states, and manual refresh.
 *
 * Architecture:
 * 1. Fetch intelligence using reviewIntelligenceService
 * 2. Service checks for today's snapshot (fast path)
 * 3. If no snapshot, generates fresh from cached reviews
 * 4. Saves snapshot for future use
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewIntelligenceService } from '@/services/review-intelligence.service';
import type { IntelligenceDashboard } from '@/services/review-intelligence.service';
import { toast } from 'sonner';

interface UseReviewIntelligenceParams {
  monitoredAppId: string | null;
  organizationId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch review intelligence for a monitored app
 * Uses cached snapshot if available (today's), otherwise generates fresh
 */
export function useReviewIntelligence(params: UseReviewIntelligenceParams) {
  const { monitoredAppId, organizationId, enabled = true } = params;

  return useQuery({
    queryKey: ['review-intelligence', monitoredAppId],
    queryFn: async (): Promise<IntelligenceDashboard> => {
      if (!monitoredAppId) {
        throw new Error('Monitored app ID is required');
      }

      console.log('[useReviewIntelligence] Fetching intelligence for app:', monitoredAppId);

      const result = await reviewIntelligenceService.getIntelligenceForApp(
        monitoredAppId,
        organizationId
      );

      return result;
    },
    enabled: enabled && !!monitoredAppId && !!organizationId,
    staleTime: 1000 * 60 * 30, // 30 minutes (snapshots are daily, so this is safe)
    cacheTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
    onSuccess: (data) => {
      const source = data.metadata.isCached ? 'cached snapshot' : 'fresh analysis';
      console.log(`[useReviewIntelligence] Intelligence loaded from ${source}:`, {
        reviewsAnalyzed: data.metadata.reviewsAnalyzed,
        themes: data.intelligence.themes.length,
        issues: data.intelligence.issuePatterns.length,
        priorityIssues: data.insights.priorityIssues.length
      });

      if (!data.metadata.isCached) {
        toast.success(`Analyzed ${data.metadata.reviewsAnalyzed} reviews`);
      }
    },
    onError: (error: any) => {
      console.error('[useReviewIntelligence] Error:', error);

      if (error.message.includes('No cached reviews found')) {
        toast.error('No reviews cached yet. Please fetch reviews first.');
      } else {
        toast.error(`Failed to load intelligence: ${error.message}`);
      }
    }
  });
}

/**
 * Hook to manually regenerate intelligence (force refresh)
 */
export function useRegenerateIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      monitoredAppId,
      organizationId
    }: {
      monitoredAppId: string;
      organizationId: string;
    }) => {
      console.log('[useRegenerateIntelligence] Force regenerating intelligence...');
      return await reviewIntelligenceService.regenerateSnapshot(monitoredAppId, organizationId);
    },
    onMutate: () => {
      toast.info('Regenerating intelligence...');
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the intelligence query
      queryClient.invalidateQueries({
        queryKey: ['review-intelligence', variables.monitoredAppId]
      });

      toast.success(`Intelligence regenerated (${data.metadata.reviewsAnalyzed} reviews analyzed)`);

      console.log('[useRegenerateIntelligence] Success:', {
        reviewsAnalyzed: data.metadata.reviewsAnalyzed,
        themes: data.intelligence.themes.length,
        priorityIssues: data.insights.priorityIssues.length
      });
    },
    onError: (error: any) => {
      console.error('[useRegenerateIntelligence] Error:', error);
      toast.error(`Failed to regenerate: ${error.message}`);
    }
  });
}

/**
 * Hook to get historical snapshots for trend analysis
 */
export function useHistoricalIntelligence(monitoredAppId: string | null, days: number = 30) {
  return useQuery({
    queryKey: ['historical-intelligence', monitoredAppId, days],
    queryFn: async () => {
      if (!monitoredAppId) {
        throw new Error('Monitored app ID is required');
      }

      return await reviewIntelligenceService.getHistoricalSnapshots(monitoredAppId, days);
    },
    enabled: !!monitoredAppId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
