/**
 * Cached Rule Set Hook
 *
 * Performance Optimization Phase 1.2
 *
 * Wraps getActiveRuleSet with React Query caching to prevent
 * database hits on every audit evaluation.
 *
 * Cache Strategy:
 * - staleTime: 10 minutes (ruleset changes are infrequent)
 * - cacheTime: 30 minutes (keep in memory for quick access)
 * - Keyed by: appId, category, locale
 */

import { useQuery } from '@tanstack/react-query';
import { getActiveRuleSet } from '@/engine/asoBible/rulesetLoader';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';

interface UseCachedRuleSetOptions {
  appId?: string;
  category?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  locale?: string;
  enabled?: boolean;
}

/**
 * Hook to get cached active rule set for an app
 *
 * @param options - App context and metadata for ruleset selection
 * @returns React Query result with cached ruleset
 */
export function useCachedRuleSet(options: UseCachedRuleSetOptions) {
  const {
    appId,
    category,
    title,
    subtitle,
    description,
    locale = 'en-US',
    enabled = true
  } = options;

  return useQuery({
    queryKey: [
      'active-ruleset',
      appId || 'default',
      category || 'default',
      locale
    ],
    queryFn: async (): Promise<MergedRuleSet> => {
      const ruleset = await getActiveRuleSet(
        {
          appId,
          category,
          title,
          subtitle,
          description,
        },
        locale
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('[useCachedRuleSet] Loaded ruleset:', {
          verticalId: ruleset.verticalId,
          marketId: ruleset.marketId,
          cached: false,
        });
      }

      return ruleset;
    },
    enabled: enabled && !!category, // Only fetch if we have category info
    staleTime: 10 * 60 * 1000, // 10 minutes - rulesets don't change often
    cacheTime: 30 * 60 * 1000, // 30 minutes in memory
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Use cached data on component remount
  });
}

/**
 * Hook to prefetch ruleset in background (for performance)
 *
 * @param options - App context for prefetching
 */
export function usePrefetchRuleSet(options: UseCachedRuleSetOptions) {
  const {
    appId,
    category,
    locale = 'en-US',
  } = options;

  return useQuery({
    queryKey: [
      'active-ruleset',
      appId || 'default',
      category || 'default',
      locale
    ],
    queryFn: async (): Promise<MergedRuleSet> => {
      return await getActiveRuleSet(
        {
          appId,
          category,
        },
        locale
      );
    },
    enabled: false, // Don't auto-fetch, caller controls via refetch
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}
