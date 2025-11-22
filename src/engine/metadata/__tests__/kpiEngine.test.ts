/**
 * KPI Engine Tests
 *
 * Comprehensive test suite for KPI Engine Phase 1
 */

import { describe, it, expect } from 'vitest';
import { KpiEngine, KPI_ENGINE_VERSION } from '../kpi/kpiEngine';
import type { KpiEngineInput } from '../kpi/kpi.types';
import kpiRegistryData from '../kpi/kpi.registry.json';

describe('KpiEngine', () => {
  // ============================================================================
  // Test 1: Basic Run (Pimsleur Example)
  // ============================================================================
  describe('Basic Run - Pimsleur Example', () => {
    const input: KpiEngineInput = {
      title: 'Pimsleur Language Learning',
      subtitle: 'Speak Spanish Fluently Fast',
      locale: 'us',
      platform: 'ios',
    };

    it('should return correct version', () => {
      const result = KpiEngine.evaluate(input);
      expect(result.version).toBe('v1');
      expect(result.version).toBe(KPI_ENGINE_VERSION);
    });

    it('should return vector with correct length', () => {
      const result = KpiEngine.evaluate(input);
      const expectedLength = kpiRegistryData.kpis.length;
      expect(result.vector).toHaveLength(expectedLength);
      expect(result.vector).toHaveLength(34); // We defined 34 KPIs
    });

    it('should have all finite numeric values in vector', () => {
      const result = KpiEngine.evaluate(input);
      result.vector.forEach((value, index) => {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('should compute kpis map with all KPI IDs', () => {
      const result = KpiEngine.evaluate(input);
      const expectedKpiIds = kpiRegistryData.kpis.map(k => k.id);

      expectedKpiIds.forEach(kpiId => {
        expect(result.kpis[kpiId]).toBeDefined();
        expect(result.kpis[kpiId].id).toBe(kpiId);
        expect(Number.isFinite(result.kpis[kpiId].value)).toBe(true);
        expect(Number.isFinite(result.kpis[kpiId].normalized)).toBe(true);
      });
    });

    it('should compute families with scores', () => {
      const result = KpiEngine.evaluate(input);

      expect(result.families.clarity_structure).toBeDefined();
      expect(result.families.keyword_architecture).toBeDefined();
      expect(result.families.hook_strength).toBeDefined();
      expect(result.families.brand_vs_generic).toBeDefined();
      expect(result.families.psychology_alignment).toBeDefined();
      expect(result.families.intent_alignment).toBeDefined();

      Object.values(result.families).forEach(family => {
        expect(Number.isFinite(family.score)).toBe(true);
        expect(family.score).toBeGreaterThanOrEqual(0);
        expect(family.score).toBeLessThanOrEqual(100);
        expect(family.kpiIds.length).toBeGreaterThan(0);
      });
    });

    it('should compute overall score', () => {
      const result = KpiEngine.evaluate(input);

      expect(Number.isFinite(result.overallScore)).toBe(true);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should have sane values for key KPIs', () => {
      const result = KpiEngine.evaluate(input);

      // Title char usage should be high (28/30 for "Pimsleur Language Learning")
      expect(result.kpis.title_char_usage.normalized).toBeGreaterThan(80);

      // Should have some high-value keywords
      expect(result.kpis.title_high_value_keyword_count.value).toBeGreaterThan(0);

      // Should have low noise ratio (minimal stopwords)
      expect(result.kpis.title_noise_ratio.normalized).toBeGreaterThan(50);
    });

    it('should include debug information', () => {
      const result = KpiEngine.evaluate(input);

      expect(result.debug).toBeDefined();
      expect(result.debug?.title).toBe('Pimsleur Language Learning');
      expect(result.debug?.subtitle).toBe('Speak Spanish Fluently Fast');
      expect(result.debug?.tokensTitle).toBeDefined();
      expect(result.debug?.tokensSubtitle).toBeDefined();
    });
  });

  // ============================================================================
  // Test 2: Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty subtitle', () => {
      const input: KpiEngineInput = {
        title: 'Language Learning App',
        subtitle: '',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      expect(result.version).toBe('v1');
      expect(result.vector).toHaveLength(34);
      expect(result.kpis.subtitle_char_usage.value).toBe(0);
      expect(result.kpis.subtitle_word_count.value).toBe(0);

      // No crashes, all values finite
      result.vector.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    it('should handle short title', () => {
      const input: KpiEngineInput = {
        title: 'Learn',
        subtitle: 'Spanish Fast',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      expect(result.version).toBe('v1');
      expect(result.vector).toHaveLength(34);

      // Title char usage should be low
      expect(result.kpis.title_char_usage.normalized).toBeLessThan(30);

      // Title word count should be 1
      expect(result.kpis.title_word_count.value).toBe(1);
    });

    it('should handle empty title and subtitle', () => {
      const input: KpiEngineInput = {
        title: '',
        subtitle: '',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      expect(result.version).toBe('v1');
      expect(result.vector).toHaveLength(34);

      // All values should be 0 or very low
      expect(result.kpis.title_char_usage.value).toBe(0);
      expect(result.kpis.subtitle_char_usage.value).toBe(0);
      expect(result.kpis.title_word_count.value).toBe(0);
      expect(result.kpis.subtitle_word_count.value).toBe(0);

      // No NaNs
      result.vector.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    it('should handle Android platform (different char limits)', () => {
      const input: KpiEngineInput = {
        title: 'Pimsleur Language Learning - Learn Spanish, French & More',
        subtitle: 'Master Languages with Audio Lessons - Speak Fluently in 30 Days with Proven Method',
        locale: 'us',
        platform: 'android',
      };

      const result = KpiEngine.evaluate(input);

      expect(result.version).toBe('v1');

      // Android has higher char limits (50 for title, 80 for subtitle)
      // So char usage should be calculated differently
      expect(result.kpis.title_char_usage).toBeDefined();
      expect(result.kpis.subtitle_char_usage).toBeDefined();
    });
  });

  // ============================================================================
  // Test 3: Brand vs Generic
  // ============================================================================
  describe('Brand vs Generic Detection', () => {
    it('should detect strong brand presence in title', () => {
      const input: KpiEngineInput = {
        title: 'Pimsleur Language App',
        subtitle: 'Learn Languages Fast',
        locale: 'us',
        platform: 'ios',
        brandSignals: {
          canonicalBrand: 'pimsleur',
          brandAliases: ['pimsleur', 'pimsleur language'],
          brandComboCount: 2,
          genericComboCount: 1,
          brandPresenceTitle: 1.0,
          brandPresenceSubtitle: 0.0,
        },
      };

      const result = KpiEngine.evaluate(input);

      // Should detect high brand presence
      expect(result.kpis.brand_presence_title.value).toBe(1.0);
      expect(result.kpis.brand_presence_subtitle.value).toBe(0.0);
    });

    it('should detect overbranding indicator', () => {
      const input: KpiEngineInput = {
        title: 'Pimsleur Pimsleur Pimsleur',
        subtitle: 'Pimsleur Language Learning',
        locale: 'us',
        platform: 'ios',
        comboCoverage: {
          totalCombos: 10,
          titleCombos: [],
          subtitleNewCombos: [],
          allCombinedCombos: [],
          titleCombosClassified: Array(8).fill({ type: 'branded', brandClassification: 'brand' }),
          subtitleNewCombosClassified: Array(2).fill({ type: 'generic', brandClassification: 'generic' }),
        },
      };

      const result = KpiEngine.evaluate(input);

      // Should flag overbranding (>70% brand combos)
      expect(result.kpis.overbranding_indicator.value).toBe(1);
      expect(result.kpis.brand_combo_ratio.value).toBeGreaterThan(0.7);
    });

    it('should detect good brand-generic balance', () => {
      const input: KpiEngineInput = {
        title: 'Pimsleur Language Learning',
        subtitle: 'Learn Spanish Fast',
        locale: 'us',
        platform: 'ios',
        comboCoverage: {
          totalCombos: 10,
          titleCombos: [],
          subtitleNewCombos: [],
          allCombinedCombos: [],
          titleCombosClassified: [
            ...Array(3).fill({ type: 'branded', brandClassification: 'brand' }),
            ...Array(7).fill({ type: 'generic', brandClassification: 'generic' }),
          ],
        },
      };

      const result = KpiEngine.evaluate(input);

      // Should not flag overbranding
      expect(result.kpis.overbranding_indicator.value).toBe(0);
      expect(result.kpis.brand_combo_ratio.value).toBeLessThan(0.5);
      expect(result.kpis.generic_discovery_combo_ratio.value).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // Test 4: Noise vs Signal
  // ============================================================================
  describe('Noise vs Signal Analysis', () => {
    it('should detect high noise ratio (many stopwords)', () => {
      const input: KpiEngineInput = {
        title: 'The Best New Top Language App',
        subtitle: 'Get the Ultimate Learning Experience',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Title has many stopwords ("The", "Best", "New", "Top")
      // Noise ratio should be relatively high
      expect(result.kpis.title_noise_ratio.value).toBeGreaterThan(0);

      // Normalized score should be lower (since lower_is_better)
      expect(result.kpis.title_noise_ratio.normalized).toBeLessThan(100);
    });

    it('should detect low noise ratio (meaningful keywords)', () => {
      const input: KpiEngineInput = {
        title: 'Pimsleur Language Learning',
        subtitle: 'Spanish French German',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Should have very few stopwords
      // High normalized score (since lower noise is better)
      expect(result.kpis.title_noise_ratio.normalized).toBeGreaterThan(70);
      expect(result.kpis.subtitle_noise_ratio.normalized).toBeGreaterThan(80);
    });

    it('should detect high token density', () => {
      const input: KpiEngineInput = {
        title: 'Learn Spanish French German',
        subtitle: 'Practice Languages Daily',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Most tokens are meaningful
      expect(result.kpis.title_token_density.normalized).toBeGreaterThan(80);
      expect(result.kpis.subtitle_token_density.normalized).toBeGreaterThan(80);
    });
  });

  // ============================================================================
  // Test 5: Deterministic / Reproducibility
  // ============================================================================
  describe('Determinism and Reproducibility', () => {
    it('should produce identical results for same input', () => {
      const input: KpiEngineInput = {
        title: 'Language Learning App',
        subtitle: 'Learn Spanish Fast',
        locale: 'us',
        platform: 'ios',
      };

      const result1 = KpiEngine.evaluate(input);
      const result2 = KpiEngine.evaluate(input);

      // Vectors should be identical
      expect(result1.vector).toEqual(result2.vector);

      // Overall scores should be identical
      expect(result1.overallScore).toBe(result2.overallScore);

      // Family scores should be identical
      expect(result1.families).toEqual(result2.families);
    });
  });

  // ============================================================================
  // Test 6: Hook Strength Detection
  // ============================================================================
  describe('Hook Strength Detection', () => {
    it('should detect strong hook with action verbs and benefits', () => {
      const input: KpiEngineInput = {
        title: 'Learn Spanish Fast',
        subtitle: 'Master French Quickly',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Should have decent hook strength (action verbs: learn, master)
      expect(result.kpis.hook_strength_title.value).toBeGreaterThan(30);
      expect(result.kpis.hook_strength_subtitle.value).toBeGreaterThan(30);
    });

    it('should detect weak hook without action verbs', () => {
      const input: KpiEngineInput = {
        title: 'Language Application',
        subtitle: 'Spanish French German',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // No action verbs, should have low hook strength
      expect(result.kpis.hook_strength_title.value).toBeLessThan(30);
      expect(result.kpis.hook_strength_subtitle.value).toBeLessThan(30);
    });
  });

  // ============================================================================
  // Test 7: Language-Verb Pairs
  // ============================================================================
  describe('Semantic Language-Verb Pairs', () => {
    it('should detect language-verb pairs', () => {
      const input: KpiEngineInput = {
        title: 'Learn Spanish Speak French',
        subtitle: 'Master German Practice Italian',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Should detect "learn spanish" and "speak french" as pairs
      expect(result.kpis.title_language_verb_pairs.value).toBeGreaterThan(0);
    });

    it('should not detect pairs when separated', () => {
      const input: KpiEngineInput = {
        title: 'Spanish Grammar Learning',
        subtitle: 'French Vocabulary Course',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Pairs are not adjacent, should be 0 or very low
      expect(result.kpis.title_language_verb_pairs.value).toBe(0);
    });
  });

  // ============================================================================
  // Test 8: Snapshot Test (Guard Regressions)
  // ============================================================================
  describe('Snapshot Test', () => {
    it('should match snapshot for Pimsleur example', () => {
      const input: KpiEngineInput = {
        title: 'Pimsleur Language Learning',
        subtitle: 'Speak Spanish Fluently Fast',
        locale: 'us',
        platform: 'ios',
      };

      const result = KpiEngine.evaluate(input);

      // Snapshot key properties (not entire result, as it's large)
      const snapshot = {
        version: result.version,
        vectorLength: result.vector.length,
        overallScore: Math.round(result.overallScore * 100) / 100,
        familyScores: Object.fromEntries(
          Object.entries(result.families).map(([id, family]) => [
            id,
            Math.round(family.score * 100) / 100,
          ])
        ),
        keyKpis: {
          title_char_usage: Math.round(result.kpis.title_char_usage.normalized * 100) / 100,
          title_high_value_keyword_count: result.kpis.title_high_value_keyword_count.value,
          title_noise_ratio: Math.round(result.kpis.title_noise_ratio.value * 100) / 100,
        },
      };

      expect(snapshot).toMatchSnapshot();
    });
  });
});
