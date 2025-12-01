/**
 * useKeywordPopularity Hook
 *
 * Fetches popularity scores for keywords from the keyword-popularity API.
 * Caches results in memory to avoid unnecessary API calls.
 *
 * Usage:
 * const { scores, isLoading, error, refresh } = useKeywordPopularity(['meditation', 'wellness'], 'us');
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KeywordPopularityData {
  popularity_score: number; // 0-100
  autocomplete_score: number; // 0-1
  intent_score: number; // 0-1
  length_prior: number; // 0-1
  last_updated: string;
  source: 'cache' | 'computed';
  data_quality: string; // 'complete', 'partial', 'stale', 'estimated'
}

interface UseKeywordPopularityResult {
  scores: Map<string, KeywordPopularityData>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useKeywordPopularity = (
  keywords: string[],
  locale: string = 'us'
): UseKeywordPopularityResult => {
  const [scores, setScores] = useState<Map<string, KeywordPopularityData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable reference for keywords (order-independent)
  const keywordsKey = useMemo(() => {
    return JSON.stringify([...keywords].sort());
  }, [keywords]);

  const fetchScores = useCallback(async () => {
    if (keywords.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`[useKeywordPopularity] Fetching scores for ${keywords.length} keywords`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keyword-popularity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            keywords,
            locale,
            platform: 'ios',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.results) {
        const newScores = new Map<string, KeywordPopularityData>();

        for (const score of result.results) {
          newScores.set(score.keyword.toLowerCase(), {
            popularity_score: score.popularity_score,
            autocomplete_score: score.autocomplete_score,
            intent_score: score.intent_score,
            length_prior: score.length_prior,
            last_updated: score.last_updated,
            source: score.source,
            data_quality: score.data_quality,
          });
        }

        console.log(`[useKeywordPopularity] Loaded ${newScores.size} scores (${result.cached_count} from cache)`);
        setScores(newScores);
      } else {
        throw new Error(result.error || 'Failed to fetch popularity scores');
      }
    } catch (err: any) {
      console.error('[useKeywordPopularity] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [keywords, keywordsKey, locale]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const refresh = useCallback(async () => {
    await fetchScores();
  }, [fetchScores]);

  return { scores, isLoading, error, refresh };
};

/**
 * Helper: Get emoji for popularity score
 */
export function getPopularityEmoji(score: number): string {
  if (score >= 80) return '🔥'; // High demand
  if (score >= 60) return '⚡'; // Medium-high
  if (score >= 40) return '💡'; // Medium
  if (score >= 20) return '📉'; // Low
  return '⛔'; // Very low
}

/**
 * Helper: Get color class for popularity score
 */
export function getPopularityColor(score: number): string {
  if (score >= 80) return 'text-orange-400'; // High
  if (score >= 60) return 'text-yellow-400'; // Medium-high
  if (score >= 40) return 'text-emerald-400'; // Medium
  if (score >= 20) return 'text-zinc-400'; // Low
  return 'text-zinc-600'; // Very low
}
