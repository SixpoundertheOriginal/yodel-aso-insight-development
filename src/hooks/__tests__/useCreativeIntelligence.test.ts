/**
 * Unit Tests for useCreativeIntelligence Hook
 *
 * Tests React hook integration with Creative Intelligence Registry
 */

import { renderHook } from '@testing-library/react';
import { useCreativeIntelligence } from '../useCreativeIntelligence';

describe('useCreativeIntelligence', () => {
  describe('Hook Initialization', () => {
    it('should initialize with default category', () => {
      const { result } = renderHook(() => useCreativeIntelligence());

      expect(result.current.category).toBe('default');
      expect(result.current.registryVersion).toBe('1.0.0');
      expect(result.current.themes).toBeDefined();
      expect(result.current.metrics).toBeDefined();
      expect(result.current.validators).toBeDefined();
      expect(result.current.rubric).toBeDefined();
    });

    it('should initialize with specified category', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      expect(result.current.category).toBe('games');
      expect(result.current.rubric.category).toBe('games');
    });

    it('should normalize category to lowercase', () => {
      const { result } = renderHook(() => useCreativeIntelligence('GAMES'));

      expect(result.current.category).toBe('games');
    });
  });

  describe('Registry Data Access', () => {
    it('should return themes for category', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      expect(Array.isArray(result.current.themes)).toBe(true);
      expect(result.current.themes.length).toBeGreaterThan(0);

      // Themes should include games in their categories
      const hasGamesTheme = result.current.themes.some(theme =>
        theme.categories.includes('games')
      );
      expect(hasGamesTheme).toBe(true);
    });

    it('should return all themes when category has no specific themes', () => {
      const { result } = renderHook(() => useCreativeIntelligence('unknown-category'));

      expect(Array.isArray(result.current.themes)).toBe(true);
      expect(result.current.themes.length).toBe(4); // All themes
    });

    it('should return all metrics', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      expect(result.current.metrics.length).toBe(4);
      expect(result.current.metrics.map(m => m.id)).toContain('visual_quality');
      expect(result.current.metrics.map(m => m.id)).toContain('text_clarity');
      expect(result.current.metrics.map(m => m.id)).toContain('cta_effectiveness');
      expect(result.current.metrics.map(m => m.id)).toContain('message_consistency');
    });

    it('should return all validators', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      expect(result.current.validators.length).toBe(4);
      expect(result.current.validators.map(v => v.id)).toContain('screenshot_count');
      expect(result.current.validators.map(v => v.id)).toContain('resolution_check');
      expect(result.current.validators.map(v => v.id)).toContain('text_length');
      expect(result.current.validators.map(v => v.id)).toContain('theme_category_fit');
    });

    it('should return category-specific rubric', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      expect(result.current.rubric.category).toBe('games');
      expect(result.current.rubric.weights).toBeDefined();
      expect(result.current.rubric.themePreferences).toBeDefined();
      expect(result.current.rubric.minRequirements).toBeDefined();
      expect(result.current.rubric.competitiveThresholds).toBeDefined();
    });
  });

  describe('Helper Functions', () => {
    it('should provide getTheme function', () => {
      const { result } = renderHook(() => useCreativeIntelligence());

      const theme = result.current.getTheme('minimal');
      expect(theme).not.toBeNull();
      expect(theme?.id).toBe('minimal');
      expect(theme?.name).toBe('Minimal & Clean');
    });

    it('should provide getMetric function', () => {
      const { result } = renderHook(() => useCreativeIntelligence());

      const metric = result.current.getMetric('visual_quality');
      expect(metric).not.toBeNull();
      expect(metric?.id).toBe('visual_quality');
      expect(metric?.name).toBe('Visual Quality');
    });

    it('should provide getValidator function', () => {
      const { result } = renderHook(() => useCreativeIntelligence());

      const validator = result.current.getValidator('screenshot_count');
      expect(validator).not.toBeNull();
      expect(validator?.id).toBe('screenshot_count');
    });

    it('should provide calculateWeightedScore function', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      const score = result.current.calculateWeightedScore({
        visual: 90,
        text: 70,
        messaging: 80,
        engagement: 85
      });

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should provide getPerformanceTier function', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      const excellentTier = result.current.getPerformanceTier(92);
      expect(excellentTier).toBe('excellent');

      const goodTier = result.current.getPerformanceTier(80);
      expect(goodTier).toBe('good');

      const averageTier = result.current.getPerformanceTier(65);
      expect(averageTier).toBe('average');

      const poorTier = result.current.getPerformanceTier(40);
      expect(poorTier).toBe('poor');
    });
  });

  describe('Score Calculations', () => {
    it('should calculate weighted score correctly for games', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      // Games weighs visual heavily (45%)
      const score1 = result.current.calculateWeightedScore({
        visual: 100,
        text: 0,
        messaging: 0,
        engagement: 0
      });
      // Should be roughly 45 (45% of 100)
      expect(score1).toBeGreaterThan(40);
      expect(score1).toBeLessThan(50);
    });

    it('should calculate weighted score correctly for productivity', () => {
      const { result } = renderHook(() => useCreativeIntelligence('productivity'));

      // Productivity weighs text/messaging more than visual
      const score1 = result.current.calculateWeightedScore({
        visual: 0,
        text: 100,
        messaging: 0,
        engagement: 0
      });
      // Should be roughly 35 (35% of 100)
      expect(score1).toBeGreaterThan(30);
      expect(score1).toBeLessThan(40);

      const score2 = result.current.calculateWeightedScore({
        visual: 0,
        text: 0,
        messaging: 100,
        engagement: 0
      });
      // Should be roughly 30 (30% of 100)
      expect(score2).toBeGreaterThan(25);
      expect(score2).toBeLessThan(35);
    });

    it('should handle edge case scores', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      // All zeros
      const zeroScore = result.current.calculateWeightedScore({
        visual: 0,
        text: 0,
        messaging: 0,
        engagement: 0
      });
      expect(zeroScore).toBe(0);

      // All perfect
      const perfectScore = result.current.calculateWeightedScore({
        visual: 100,
        text: 100,
        messaging: 100,
        engagement: 100
      });
      expect(perfectScore).toBe(100);
    });
  });

  describe('Performance Tier Mapping', () => {
    it('should map scores to correct tiers for games', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));
      const rubric = result.current.rubric;

      // At excellent threshold
      expect(result.current.getPerformanceTier(rubric.competitiveThresholds.excellent)).toBe('excellent');

      // Just below excellent
      expect(result.current.getPerformanceTier(rubric.competitiveThresholds.excellent - 1)).toBe('good');

      // At good threshold
      expect(result.current.getPerformanceTier(rubric.competitiveThresholds.good)).toBe('good');

      // Just below good
      expect(result.current.getPerformanceTier(rubric.competitiveThresholds.good - 1)).toBe('average');

      // At average threshold
      expect(result.current.getPerformanceTier(rubric.competitiveThresholds.average)).toBe('average');

      // Below average
      expect(result.current.getPerformanceTier(rubric.competitiveThresholds.average - 1)).toBe('poor');
    });

    it('should use different thresholds for different categories', () => {
      const { result: gamesResult } = renderHook(() => useCreativeIntelligence('games'));
      const { result: productivityResult } = renderHook(() => useCreativeIntelligence('productivity'));

      // Games has higher threshold for excellent (90)
      // Productivity has lower threshold for excellent (85)

      // Score of 87 should be 'good' for games but 'excellent' for productivity
      expect(gamesResult.current.getPerformanceTier(87)).toBe('good');
      expect(productivityResult.current.getPerformanceTier(87)).toBe('excellent');
    });
  });

  describe('Category Switching', () => {
    it('should update when category prop changes', () => {
      const { result, rerender } = renderHook(
        ({ category }) => useCreativeIntelligence(category),
        { initialProps: { category: 'games' } }
      );

      expect(result.current.category).toBe('games');
      expect(result.current.rubric.category).toBe('games');

      // Change category
      rerender({ category: 'productivity' });

      expect(result.current.category).toBe('productivity');
      expect(result.current.rubric.category).toBe('productivity');

      // Verify weights are different
      const { result: gamesResult } = renderHook(() => useCreativeIntelligence('games'));
      expect(result.current.rubric.weights.visual).not.toBe(gamesResult.current.rubric.weights.visual);
    });
  });

  describe('Return Value Structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      // Data properties
      expect(result.current.themes).toBeDefined();
      expect(result.current.metrics).toBeDefined();
      expect(result.current.validators).toBeDefined();
      expect(result.current.rubric).toBeDefined();

      // Helper functions
      expect(typeof result.current.getTheme).toBe('function');
      expect(typeof result.current.getMetric).toBe('function');
      expect(typeof result.current.getValidator).toBe('function');
      expect(typeof result.current.calculateWeightedScore).toBe('function');
      expect(typeof result.current.getPerformanceTier).toBe('function');

      // Metadata
      expect(result.current.category).toBeDefined();
      expect(result.current.registryVersion).toBeDefined();
    });

    it('should match UseCreativeIntelligenceReturn interface', () => {
      const { result } = renderHook(() => useCreativeIntelligence('games'));

      // Verify types by attempting to use all properties/methods
      const themes = result.current.themes;
      const metrics = result.current.metrics;
      const validators = result.current.validators;
      const rubric = result.current.rubric;

      expect(Array.isArray(themes)).toBe(true);
      expect(Array.isArray(metrics)).toBe(true);
      expect(Array.isArray(validators)).toBe(true);
      expect(typeof rubric).toBe('object');

      // Call helper functions
      const theme = result.current.getTheme('minimal');
      const metric = result.current.getMetric('visual_quality');
      const validator = result.current.getValidator('screenshot_count');
      const score = result.current.calculateWeightedScore({
        visual: 80,
        text: 80,
        messaging: 80,
        engagement: 80
      });
      const tier = result.current.getPerformanceTier(score);

      expect(theme).toBeDefined();
      expect(metric).toBeDefined();
      expect(validator).toBeDefined();
      expect(typeof score).toBe('number');
      expect(typeof tier).toBe('string');
    });
  });

  describe('Memoization', () => {
    it('should memoize themes based on category', () => {
      const { result, rerender } = renderHook(
        ({ category }) => useCreativeIntelligence(category),
        { initialProps: { category: 'games' } }
      );

      const themes1 = result.current.themes;

      // Rerender with same category
      rerender({ category: 'games' });

      const themes2 = result.current.themes;

      // Should be same reference (memoized)
      expect(themes1).toBe(themes2);
    });

    it('should recompute when category changes', () => {
      const { result, rerender } = renderHook(
        ({ category }) => useCreativeIntelligence(category),
        { initialProps: { category: 'games' } }
      );

      const rubric1 = result.current.rubric;

      // Change category
      rerender({ category: 'productivity' });

      const rubric2 = result.current.rubric;

      // Should be different (recomputed)
      expect(rubric1).not.toBe(rubric2);
      expect(rubric1.category).not.toBe(rubric2.category);
    });
  });
});
