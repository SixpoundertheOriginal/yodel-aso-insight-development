/**
 * useComboRanking Hook
 *
 * Fetches and caches ranking data for a specific keyword combo.
 * - Checks database cache first (fast)
 * - Falls back to edge function if stale
 * - Returns loading/error states
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ComboRankingData {
  position: number | null;
  isRanking: boolean;
  snapshotDate: string;
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;
  visibilityScore: number | null;
}

interface UseComboRankingResult {
  ranking: ComboRankingData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useComboRanking = (
  appId: string,
  combo: string,
  country: string
): UseComboRankingResult => {
  const [ranking, setRanking] = useState<ComboRankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Get app UUID from appId
      const { data: appData, error: appError } = await supabase
        .from('monitored_apps')
        .select('id, organization_id')
        .eq('app_id', appId)
        .eq('platform', 'ios')
        .single();

      if (appError || !appData) {
        // App not in monitored_apps - show as not trackable
        console.warn(`[useComboRanking] App ${appId} not found in monitored_apps. Add app to track rankings.`);
        setRanking(null);
        setIsLoading(false);
        return;
      }

      const appUUID = appData.id;
      const organizationId = appData.organization_id;

      // Step 2: Check cache using helper function
      const { data: cachedData, error: cacheError } = await supabase
        .rpc('get_latest_combo_ranking', {
          p_app_id: appUUID,
          p_combo: combo,
          p_platform: 'ios',
          p_region: country,
        });

      // If we have cached data within 24h, use it
      if (!cacheError && cachedData && cachedData.length > 0) {
        const cached = cachedData[0];
        const snapshotDate = new Date(cached.snapshot_date);
        const now = new Date();
        const hoursSince = (now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          setRanking({
            position: cached.position,
            isRanking: cached.is_ranking,
            snapshotDate: cached.snapshot_date,
            trend: cached.trend,
            positionChange: cached.position_change,
            visibilityScore: cached.visibility_score,
          });
          setIsLoading(false);
          return;
        }
      }

      // Step 3: If no cache or stale, fetch from edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

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
            combos: [combo],
            country,
            platform: 'ios',
            organizationId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check ranking: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.results && result.results.length > 0) {
        const rankingResult = result.results[0];
        setRanking({
          position: rankingResult.position,
          isRanking: rankingResult.isRanking,
          snapshotDate: rankingResult.checkedAt,
          trend: rankingResult.trend,
          positionChange: rankingResult.positionChange,
          visibilityScore: null,
        });
      } else {
        setRanking({
          position: null,
          isRanking: false,
          snapshotDate: new Date().toISOString(),
          trend: null,
          positionChange: null,
          visibilityScore: null,
        });
      }
    } catch (err: any) {
      console.error('[useComboRanking] Error:', err);
      setError(err.message || 'Failed to fetch ranking');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appId && combo && country) {
      fetchRanking();
    }
  }, [appId, combo, country]);

  return { ranking, isLoading, error, refetch: fetchRanking };
};

/**
 * Helper: Check if a snapshot date is within 24 hours
 */
function isWithin24Hours(snapshotDate: string): boolean {
  const snapshot = new Date(snapshotDate);
  const now = new Date();
  const hoursSince = (now.getTime() - snapshot.getTime()) / (1000 * 60 * 60);
  return hoursSince < 24;
}
