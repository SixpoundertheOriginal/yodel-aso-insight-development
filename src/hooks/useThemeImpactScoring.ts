/**
 * THEME IMPACT SCORING HOOK
 *
 * React hook for fetching and managing theme impact scoring data
 * Integrates with themeImpactScoringService
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { themeImpactScoringService, ThemeImpactScore, ThemeAnalysisResult } from '@/services/theme-impact-scoring.service';
import { logger } from '@/utils/logger';

export interface UseThemeImpactScoringOptions {
  monitoredAppId?: string;
  organizationId?: string;
  periodDays?: number;
  autoFetch?: boolean;
}

export function useThemeImpactScoring(options: UseThemeImpactScoringOptions = {}) {
  const {
    monitoredAppId,
    organizationId,
    periodDays = 30,
    autoFetch = true
  } = options;

  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState(periodDays);

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Fetch latest theme scores for an app
   */
  const {
    data: scores,
    isLoading: scoresLoading,
    error: scoresError,
    refetch: refetchScores
  } = useQuery({
    queryKey: ['theme-impact-scores', monitoredAppId, selectedPeriod],
    queryFn: async () => {
      if (!monitoredAppId) return [];

      logger.info('[useThemeImpactScoring] Fetching latest scores', {
        monitoredAppId,
        periodDays: selectedPeriod
      });

      const data = await themeImpactScoringService.getLatestScores(monitoredAppId);

      logger.info('[useThemeImpactScoring] Scores fetched', {
        count: data.length
      });

      return data;
    },
    enabled: autoFetch && !!monitoredAppId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });

  /**
   * Fetch critical themes for organization
   */
  const {
    data: criticalThemes,
    isLoading: criticalLoading,
    error: criticalError,
    refetch: refetchCritical
  } = useQuery({
    queryKey: ['critical-themes', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      logger.info('[useThemeImpactScoring] Fetching critical themes', {
        organizationId
      });

      const data = await themeImpactScoringService.getCriticalThemes(organizationId);

      logger.info('[useThemeImpactScoring] Critical themes fetched', {
        count: data.length
      });

      return data;
    },
    enabled: autoFetch && !!organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutes (more urgent data)
    retry: 2
  });

  /**
   * Fetch theme history for trend chart
   */
  const fetchThemeHistory = async (theme: string, days: number = 90) => {
    if (!monitoredAppId) return [];

    logger.info('[useThemeImpactScoring] Fetching theme history', {
      monitoredAppId,
      theme,
      days
    });

    return await themeImpactScoringService.getThemeHistory(monitoredAppId, theme, days);
  };

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Run analysis for an app (triggers backend calculation)
   */
  const analyzeThemes = useMutation({
    mutationFn: async (params: { monitoredAppId: string; periodDays?: number }) => {
      logger.info('[useThemeImpactScoring] Starting theme analysis', params);

      const result = await themeImpactScoringService.analyzeThemes({
        monitoredAppId: params.monitoredAppId,
        periodDays: params.periodDays || selectedPeriod
      });

      logger.info('[useThemeImpactScoring] Analysis complete', {
        totalThemes: result.summary.totalThemes,
        criticalThemes: result.summary.criticalThemes
      });

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch with new data
      queryClient.invalidateQueries({
        queryKey: ['theme-impact-scores', variables.monitoredAppId]
      });
      queryClient.invalidateQueries({
        queryKey: ['critical-themes']
      });

      logger.info('[useThemeImpactScoring] Cache invalidated after analysis');
    },
    onError: (error) => {
      logger.error('[useThemeImpactScoring] Analysis failed', { error });
    }
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const summary = {
    totalThemes: scores?.length || 0,
    criticalThemes: scores?.filter(s => s.impactLevel === 'critical').length || 0,
    highImpactThemes: scores?.filter(s =>
      s.impactLevel === 'critical' || s.impactLevel === 'high'
    ).length || 0,
    risingThemes: scores?.filter(s => s.trendDirection === 'rising').length || 0,
    averageImpactScore: scores && scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.impactScore, 0) / scores.length)
      : 0
  };

  const topPriorities = scores
    ?.filter(s => s.urgency === 'immediate' || s.urgency === 'high')
    .slice(0, 5) || [];

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // Data
    scores: scores || [],
    criticalThemes: criticalThemes || [],
    summary,
    topPriorities,

    // Loading states
    isLoading: scoresLoading || criticalLoading,
    scoresLoading,
    criticalLoading,

    // Errors
    error: scoresError || criticalError,
    scoresError,
    criticalError,

    // Mutations
    analyzeThemes: analyzeThemes.mutate,
    isAnalyzing: analyzeThemes.isPending,
    analysisError: analyzeThemes.error,

    // Refetch
    refetch: () => {
      refetchScores();
      refetchCritical();
    },
    refetchScores,
    refetchCritical,

    // Utilities
    fetchThemeHistory,
    selectedPeriod,
    setSelectedPeriod,

    // Query client for advanced usage
    queryClient
  };
}

export type UseThemeImpactScoringReturn = ReturnType<typeof useThemeImpactScoring>;
