/**
 * useBatchComboRankings Hook
 *
 * Fetches rankings for multiple combos at once (batch fetching).
 * Much faster than individual fetches: 50 combos = 1 API call instead of 50.
 *
 * Features:
 * - Checks database cache first (24h TTL)
 * - Batches fresh API calls
 * - Manual refresh support
 * - Returns Map<combo, ranking> for O(1) lookup
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ComboRankingData {
  position: number | null;
  isRanking: boolean;
  snapshotDate: string;
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;
  visibilityScore: number | null;
  totalResults: number | null; // Total apps indexed by Apple for this keyword (0-100, where 100 = 100+)
}

interface UseBatchComboRankingsResult {
  rankings: Map<string, ComboRankingData>;
  isLoading: boolean;
  error: string | null;
  refresh: (combos?: string[]) => Promise<void>;
}

export const useBatchComboRankings = (
  appId: string | undefined,
  combos: string[],
  country: string
): UseBatchComboRankingsResult => {
  const [rankings, setRankings] = useState<Map<string, ComboRankingData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create stable reference for combos to prevent infinite loops
  // Sort combos alphabetically so key is order-independent (prevents refetch on sort)
  const combosKey = useMemo(() => {
    const sortedCombos = [...combos].sort();
    return JSON.stringify(sortedCombos);
  }, [combos]);

  const fetchRankings = useCallback(async (forceFetch = false, targetCombos?: string[]) => {
    console.log(`[useBatchComboRankings] Called with appId=${appId}, combos.length=${combos.length}`);

    if (!appId || combos.length === 0) {
      console.warn(`[useBatchComboRankings] Early return: appId=${appId}, combos.length=${combos.length}`);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const combosToFetch = targetCombos || combos;

      console.log(`[useBatchComboRankings] Fetching ${combosToFetch.length} combos for app ${appId}`);

      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Step 1: Get organization_id
      // Try monitored_apps first (for tracked apps), fallback to user's org (for ephemeral)
      let organizationId: string;

      const { data: appData } = await supabase
        .from('monitored_apps')
        .select('organization_id')
        .eq('app_id', appId)
        .eq('platform', 'ios')
        .single();

      if (appData) {
        // App is monitored - use its organization
        organizationId = appData.organization_id;
        console.log(`[useBatchComboRankings] Using monitored app's organization: ${organizationId.slice(0, 8)}...`);
      } else {
        // App is NOT monitored - use current user's organization (ephemeral mode)
        const { data: userRoles, error: roleError } = await supabase
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .single();

        if (roleError || !userRoles) {
          console.error(`[useBatchComboRankings] Could not get user's organization:`, roleError);
          setIsLoading(false);
          return;
        }

        organizationId = userRoles.organization_id;
        console.log(`[useBatchComboRankings] Ephemeral mode - using user's organization: ${organizationId.slice(0, 8)}...`);
      }

      // Step 2: Batch combos into chunks to avoid worker timeouts
      const BATCH_SIZE = 25;
      const batches: string[][] = [];
      for (let i = 0; i < combosToFetch.length; i += BATCH_SIZE) {
        batches.push(combosToFetch.slice(i, i + BATCH_SIZE));
      }

      console.log(`[useBatchComboRankings] Processing ${batches.length} batches of ~${BATCH_SIZE} combos each`);

      // Step 3: Fetch each batch sequentially
      const allResults: any[] = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[useBatchComboRankings] Fetching batch ${i + 1}/${batches.length} (${batch.length} combos)`);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-combo-rankings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              appId,
              combos: batch,
              country,
              platform: 'ios',
              organizationId,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        if (result.success && result.results) {
          // Debug: Log first result from first batch
          if (i === 0 && result.results.length > 0) {
            console.log(`[useBatchComboRankings] First result from edge function:`, result.results[0]);
          }

          // Debug: Check if any results have null totalResults (indicates API errors)
          const nullResults = result.results.filter(r => r.totalResults === null);
          if (nullResults.length > 0) {
            console.warn(`[useBatchComboRankings] ⚠️ ${nullResults.length}/${result.results.length} combos returned null totalResults (API errors)`);
          }

          allResults.push(...result.results);
        } else {
          console.error(`[useBatchComboRankings] Edge function returned error:`, result);
        }
      }

      console.log(`[useBatchComboRankings] Received ${allResults.length} total results from all batches`);

      // Step 4: Build rankings map from all results
      const newRankings = new Map<string, ComboRankingData>();

      for (const rankingResult of allResults) {
        newRankings.set(rankingResult.combo, {
          position: rankingResult.position,
          isRanking: rankingResult.isRanking,
          snapshotDate: rankingResult.checkedAt,
          trend: rankingResult.trend,
          positionChange: rankingResult.positionChange,
          visibilityScore: null,
          totalResults: rankingResult.totalResults ?? null,
        });
      }

      console.log(`[useBatchComboRankings] Built rankings map with ${newRankings.size} entries`);
      console.log(`[useBatchComboRankings] Sample entry:`, Array.from(newRankings.entries())[0]);

      setRankings(newRankings);
    } catch (err: any) {
      console.error('[useBatchComboRankings] Error:', err);
      setError(err.message || 'Failed to fetch rankings');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, country, combosKey]); // combos content tracked via combosKey to prevent loops

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchRankings(false);
  }, [fetchRankings]);

  // Expose manual refresh function
  const refresh = useCallback(async (targetCombos?: string[]) => {
    await fetchRankings(true, targetCombos);
  }, [fetchRankings]);

  return { rankings, isLoading, error, refresh };
};

/**
 * Helper: Format cache age for display
 */
export function formatCacheAge(snapshotDate: string): string {
  const snapshot = new Date(snapshotDate);
  const now = new Date();
  const hoursSince = (now.getTime() - snapshot.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) {
    const minutes = Math.round(hoursSince * 60);
    return `${minutes}m ago`;
  } else if (hoursSince < 24) {
    const hours = Math.floor(hoursSince);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(hoursSince / 24);
    return `${days}d ago`;
  }
}

/**
 * Helper: Check if cache is getting stale (> 20h)
 */
export function isCacheStale(snapshotDate: string): boolean {
  const snapshot = new Date(snapshotDate);
  const now = new Date();
  const hoursSince = (now.getTime() - snapshot.getTime()) / (1000 * 60 * 60);
  return hoursSince > 20;
}
