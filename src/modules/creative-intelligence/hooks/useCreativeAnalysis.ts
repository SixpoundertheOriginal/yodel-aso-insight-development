/**
 * useCreativeAnalysis Hook
 *
 * React hook for managing creative analysis state and operations.
 *
 * Phase 0: Stub implementation (21.11.2025)
 */

import { useState, useCallback } from 'react';
import type {
  Screenshot,
  CreativeAnalysis,
  CreativeInsight,
  CompetitorScreenshot,
} from '../types';

interface UseCreativeAnalysisResult {
  // State
  screenshots: Screenshot[];
  analyses: CreativeAnalysis[];
  insights: CreativeInsight[];
  competitors: CompetitorScreenshot[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  fetchScreenshots: (appId: string) => Promise<void>;
  analyzeScreenshots: (screenshots: Screenshot[]) => Promise<void>;
  fetchCompetitors: (appIds: string[]) => Promise<void>;
  clearData: () => void;
}

/**
 * Hook for managing creative analysis
 *
 * @param appId - App Store ID
 * @returns UseCreativeAnalysisResult
 *
 * Phase 0: Returns stub data
 * Phase 1+: Will implement real logic
 */
export function useCreativeAnalysis(appId?: string): UseCreativeAnalysisResult {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [analyses, setAnalyses] = useState<CreativeAnalysis[]>([]);
  const [insights, setInsights] = useState<CreativeInsight[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorScreenshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchScreenshots = useCallback(async (fetchAppId: string) => {
    console.log('[useCreativeAnalysis] fetchScreenshots called (stub):', fetchAppId);
    setIsLoading(true);
    setError(null);

    try {
      // Phase 0: Stub implementation
      // Phase 1: Will call fetchAppScreenshots service
      await new Promise((resolve) => setTimeout(resolve, 500));
      setScreenshots([]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeScreenshots = useCallback(async (screenshotsToAnalyze: Screenshot[]) => {
    console.log('[useCreativeAnalysis] analyzeScreenshots called (stub):', screenshotsToAnalyze);
    setIsLoading(true);
    setError(null);

    try {
      // Phase 0: Stub implementation
      // Phase 2: Will call analyzeScreenshots service
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAnalyses([]);
      setInsights([]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCompetitors = useCallback(async (appIds: string[]) => {
    console.log('[useCreativeAnalysis] fetchCompetitors called (stub):', appIds);
    setIsLoading(true);
    setError(null);

    try {
      // Phase 0: Stub implementation
      // Phase 2: Will call fetchCompetitorScreenshots service
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCompetitors([]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    console.log('[useCreativeAnalysis] clearData called');
    setScreenshots([]);
    setAnalyses([]);
    setInsights([]);
    setCompetitors([]);
    setError(null);
  }, []);

  return {
    screenshots,
    analyses,
    insights,
    competitors,
    isLoading,
    error,
    fetchScreenshots,
    analyzeScreenshots,
    fetchCompetitors,
    clearData,
  };
}
