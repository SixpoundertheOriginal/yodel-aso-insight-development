/**
 * useCreativeIntelligence Hook
 *
 * React hook for accessing the Creative Intelligence Registry.
 * Provides themes, metrics, validators, rubrics, and scoring utilities
 * for a specific app category.
 *
 * @module useCreativeIntelligence
 */

import { useMemo } from 'react';
import { CreativeIntelligenceRegistryService } from '@/services/creative-intelligence';
import type {
  CreativeTheme,
  CreativeMetric,
  CreativeValidator,
  CategoryScoringRubric,
  PerformanceTier,
} from '@/types/creative-intelligence.types';

export interface UseCreativeIntelligenceReturn {
  // Registry data
  themes: CreativeTheme[];
  metrics: CreativeMetric[];
  validators: CreativeValidator[];
  rubric: CategoryScoringRubric;

  // Helper functions
  getTheme: (themeId: string) => CreativeTheme | null;
  getMetric: (metricId: string) => CreativeMetric | null;
  getValidator: (validatorId: string) => CreativeValidator | null;
  calculateWeightedScore: (scores: {
    visual: number;
    text: number;
    messaging: number;
    engagement: number;
  }) => number;
  getPerformanceTier: (score: number) => PerformanceTier;

  // Metadata
  category: string;
  registryVersion: string;
}

/**
 * Hook for accessing Creative Intelligence Registry
 *
 * @param category - App category (e.g., 'games', 'productivity', 'social networking')
 * @returns Registry data and utility functions for the specified category
 *
 * @example
 * ```tsx
 * const {
 *   themes,
 *   metrics,
 *   validators,
 *   rubric,
 *   calculateWeightedScore,
 *   getPerformanceTier
 * } = useCreativeIntelligence('games');
 *
 * // Calculate overall score
 * const score = calculateWeightedScore({
 *   visual: 85,
 *   text: 70,
 *   messaging: 80,
 *   engagement: 90
 * });
 *
 * // Get performance tier
 * const tier = getPerformanceTier(score); // 'excellent', 'good', 'average', or 'poor'
 * ```
 */
export function useCreativeIntelligence(category: string = 'default'): UseCreativeIntelligenceReturn {
  // Normalize category to lowercase
  const normalizedCategory = useMemo(() => category.toLowerCase(), [category]);

  // Get themes for category (memoized)
  const themes = useMemo(() => {
    const categoryThemes = CreativeIntelligenceRegistryService.getThemesForCategory(normalizedCategory);
    // If no specific themes for category, return all themes
    return categoryThemes.length > 0
      ? categoryThemes
      : CreativeIntelligenceRegistryService.getAllThemes();
  }, [normalizedCategory]);

  // Get all metrics (memoized)
  const metrics = useMemo(() => {
    return CreativeIntelligenceRegistryService.getAllMetrics();
  }, []);

  // Get all validators (memoized)
  const validators = useMemo(() => {
    return CreativeIntelligenceRegistryService.getAllValidators();
  }, []);

  // Get rubric for category (memoized)
  const rubric = useMemo(() => {
    return CreativeIntelligenceRegistryService.getScoringRubric(normalizedCategory);
  }, [normalizedCategory]);

  // Helper function: get theme by ID
  const getTheme = useMemo(
    () => (themeId: string) => CreativeIntelligenceRegistryService.getTheme(themeId),
    []
  );

  // Helper function: get metric by ID
  const getMetric = useMemo(
    () => (metricId: string) => CreativeIntelligenceRegistryService.getMetric(metricId),
    []
  );

  // Helper function: get validator by ID
  const getValidator = useMemo(
    () => (validatorId: string) => CreativeIntelligenceRegistryService.getValidator(validatorId),
    []
  );

  // Helper function: calculate weighted score
  const calculateWeightedScore = useMemo(
    () =>
      (scores: { visual: number; text: number; messaging: number; engagement: number }) =>
        CreativeIntelligenceRegistryService.calculateWeightedScore(normalizedCategory, scores),
    [normalizedCategory]
  );

  // Helper function: get performance tier
  const getPerformanceTier = useMemo(
    () => (score: number) =>
      CreativeIntelligenceRegistryService.getPerformanceTier(normalizedCategory, score),
    [normalizedCategory]
  );

  // Registry version
  const registryVersion = CreativeIntelligenceRegistryService.getVersion();

  return {
    themes,
    metrics,
    validators,
    rubric,
    getTheme,
    getMetric,
    getValidator,
    calculateWeightedScore,
    getPerformanceTier,
    category: normalizedCategory,
    registryVersion,
  };
}
