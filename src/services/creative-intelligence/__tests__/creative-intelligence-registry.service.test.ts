/**
 * Unit Tests for Creative Intelligence Registry Service
 *
 * Tests for themes, metrics, validators, scoring rubrics,
 * and all public API methods.
 */

import { CreativeIntelligenceRegistryService } from '../creative-intelligence-registry.service';
import type { CreativeTheme, CreativeMetric, CreativeValidator, CategoryScoringRubric } from '@/types/creative-intelligence.types';

describe('CreativeIntelligenceRegistryService', () => {
  describe('Initialization', () => {
    it('should initialize registries on first access', () => {
      const version = CreativeIntelligenceRegistryService.getVersion();
      expect(version).toBe('1.0.0');
    });

    it('should return available categories', () => {
      const categories = CreativeIntelligenceRegistryService.getAvailableCategories();
      expect(categories).toContain('games');
      expect(categories).toContain('productivity');
      expect(categories).toContain('social networking');
      expect(categories).toContain('entertainment');
      expect(categories).toContain('finance');
      // 'default' is intentionally excluded as it's a fallback rubric, not a real category
      expect(categories).not.toContain('default');
      expect(categories.length).toBe(5);
    });
  });

  describe('Themes Registry', () => {
    it('should retrieve theme by ID', () => {
      const theme = CreativeIntelligenceRegistryService.getTheme('minimal');
      expect(theme).not.toBeNull();
      expect(theme?.id).toBe('minimal');
      expect(theme?.name).toBe('Minimal & Clean');
    });

    it('should return null for non-existent theme', () => {
      const theme = CreativeIntelligenceRegistryService.getTheme('non-existent');
      expect(theme).toBeNull();
    });

    it('should retrieve all themes', () => {
      const themes = CreativeIntelligenceRegistryService.getAllThemes();
      expect(themes.length).toBe(4);
      expect(themes.map(t => t.id)).toContain('minimal');
      expect(themes.map(t => t.id)).toContain('bold');
      expect(themes.map(t => t.id)).toContain('professional');
      expect(themes.map(t => t.id)).toContain('gaming');
    });

    it('should retrieve themes for specific category', () => {
      const gamesThemes = CreativeIntelligenceRegistryService.getThemesForCategory('games');
      expect(gamesThemes.length).toBeGreaterThan(0);
      expect(gamesThemes[0].categories).toContain('games');
    });

    it('should sort themes by category fit score', () => {
      const productivityThemes = CreativeIntelligenceRegistryService.getThemesForCategory('productivity');

      // Should be sorted by categoryFit descending
      if (productivityThemes.length > 1) {
        const firstFit = productivityThemes[0].benchmarks.categoryFit['productivity'] || 0;
        const secondFit = productivityThemes[1].benchmarks.categoryFit['productivity'] || 0;
        expect(firstFit).toBeGreaterThanOrEqual(secondFit);
      }
    });

    it('should have valid theme structure', () => {
      const theme = CreativeIntelligenceRegistryService.getTheme('minimal') as CreativeTheme;

      expect(theme.id).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.description).toBeDefined();
      expect(Array.isArray(theme.categories)).toBe(true);

      // Characteristics
      expect(theme.characteristics.visualDensity).toMatch(/low|medium|high/);
      expect(theme.characteristics.colorPalette).toMatch(/muted|vibrant|gradient|monochrome/);
      expect(theme.characteristics.typography).toMatch(/minimal|bold|decorative/);
      expect(theme.characteristics.composition).toMatch(/centered|asymmetric|grid|dynamic/);
      expect(typeof theme.characteristics.textRatio).toBe('number');
      expect(typeof theme.characteristics.ctaPresence).toBe('boolean');

      // Benchmarks
      expect(Array.isArray(theme.benchmarks.topPerformingApps)).toBe(true);
      expect(typeof theme.benchmarks.avgScore).toBe('number');
      expect(typeof theme.benchmarks.categoryFit).toBe('object');

      // AI Prompt Hints
      expect(Array.isArray(theme.aiPromptHints)).toBe(true);
    });
  });

  describe('Metrics Registry', () => {
    it('should retrieve metric by ID', () => {
      const metric = CreativeIntelligenceRegistryService.getMetric('visual_quality');
      expect(metric).not.toBeNull();
      expect(metric?.id).toBe('visual_quality');
      expect(metric?.name).toBe('Visual Quality');
    });

    it('should return null for non-existent metric', () => {
      const metric = CreativeIntelligenceRegistryService.getMetric('non-existent');
      expect(metric).toBeNull();
    });

    it('should retrieve all metrics', () => {
      const metrics = CreativeIntelligenceRegistryService.getAllMetrics();
      expect(metrics.length).toBe(4);
      expect(metrics.map(m => m.id)).toContain('visual_quality');
      expect(metrics.map(m => m.id)).toContain('text_clarity');
      expect(metrics.map(m => m.id)).toContain('cta_effectiveness');
      expect(metrics.map(m => m.id)).toContain('message_consistency');
    });

    it('should retrieve metrics by category', () => {
      const visualMetrics = CreativeIntelligenceRegistryService.getMetricsByCategory('visual');
      expect(visualMetrics.length).toBeGreaterThan(0);
      expect(visualMetrics.every(m => m.category === 'visual')).toBe(true);
    });

    it('should have valid metric structure', () => {
      const metric = CreativeIntelligenceRegistryService.getMetric('text_clarity') as CreativeMetric;

      expect(metric.id).toBeDefined();
      expect(metric.name).toBeDefined();
      expect(metric.description).toBeDefined();
      expect(metric.category).toMatch(/visual|text|messaging|engagement/);
      expect(typeof metric.weight).toBe('number');
      expect(metric.weight).toBeGreaterThan(0);
      expect(metric.weight).toBeLessThanOrEqual(1);
      expect(Array.isArray(metric.elementTypes)).toBe(true);

      // Scoring criteria
      expect(metric.scoringCriteria.excellent).toBeDefined();
      expect(metric.scoringCriteria.good).toBeDefined();
      expect(metric.scoringCriteria.average).toBeDefined();
      expect(metric.scoringCriteria.poor).toBeDefined();

      // Calculation method
      expect(metric.calculationMethod).toMatch(/ai|rule-based|hybrid/);

      // Focus areas (required field)
      expect(Array.isArray(metric.focusAreas)).toBe(true);
      expect(metric.focusAreas.length).toBeGreaterThan(0);
      expect(metric.focusAreas[0].id).toBeDefined();
      expect(metric.focusAreas[0].description).toBeDefined();
    });

    it('should have focusAreas on all metrics', () => {
      const metrics = CreativeIntelligenceRegistryService.getAllMetrics();

      // Verify all 4 metrics have focusAreas
      expect(metrics.length).toBe(4);

      metrics.forEach(metric => {
        expect(Array.isArray(metric.focusAreas)).toBe(true);
        expect(metric.focusAreas.length).toBeGreaterThan(0);

        // Verify each focus area has required fields
        metric.focusAreas.forEach(focusArea => {
          expect(focusArea.id).toBeDefined();
          expect(typeof focusArea.id).toBe('string');
          expect(focusArea.description).toBeDefined();
          expect(typeof focusArea.description).toBe('string');
        });
      });
    });
  });

  describe('Validators Registry', () => {
    it('should retrieve validator by ID', () => {
      const validator = CreativeIntelligenceRegistryService.getValidator('screenshot_count');
      expect(validator).not.toBeNull();
      expect(validator?.id).toBe('screenshot_count');
    });

    it('should return null for non-existent validator', () => {
      const validator = CreativeIntelligenceRegistryService.getValidator('non-existent');
      expect(validator).toBeNull();
    });

    it('should retrieve all validators', () => {
      const validators = CreativeIntelligenceRegistryService.getAllValidators();
      expect(validators.length).toBe(4);
      expect(validators.map(v => v.id)).toContain('screenshot_count');
      expect(validators.map(v => v.id)).toContain('resolution_check');
      expect(validators.map(v => v.id)).toContain('text_length');
      expect(validators.map(v => v.id)).toContain('theme_category_fit');
    });

    it('should retrieve validators for element type', () => {
      const screenshotValidators = CreativeIntelligenceRegistryService.getValidatorsForElement('screenshots');
      expect(screenshotValidators.length).toBeGreaterThan(0);
      expect(screenshotValidators.every(v => v.elementTypes.includes('screenshots'))).toBe(true);
    });

    it('should validate screenshot count correctly', () => {
      const validator = CreativeIntelligenceRegistryService.getValidator('screenshot_count') as CreativeValidator;

      // Optimal range: 8-10 screenshots
      const optimalResult = validator.validate({
        type: 'screenshot',
        screenshots: new Array(9).fill('url')
      });
      expect(optimalResult.passed).toBe(true);
      expect(optimalResult.score).toBe(100);

      // Too few screenshots
      const tooFewResult = validator.validate({
        type: 'screenshot',
        screenshots: new Array(3).fill('url')
      });
      expect(tooFewResult.passed).toBe(false);
      expect(tooFewResult.score).toBeLessThan(100);
      expect(tooFewResult.suggestion).toBeDefined();
    });

    it('should validate text length correctly', () => {
      const validator = CreativeIntelligenceRegistryService.getValidator('text_length') as CreativeValidator;

      // Optimal length: 1000-4000 characters
      const optimalDescription = 'a'.repeat(2000);
      const optimalResult = validator.validate({
        type: 'description',
        description: optimalDescription
      });
      expect(optimalResult.passed).toBe(true);

      // Too short
      const shortDescription = 'a'.repeat(500);
      const shortResult = validator.validate({
        type: 'description',
        description: shortDescription
      });
      expect(shortResult.passed).toBe(false);
      expect(shortResult.suggestion).toBeDefined();
    });

    it('should validate theme-category fit', () => {
      const validator = CreativeIntelligenceRegistryService.getValidator('theme_category_fit') as CreativeValidator;

      // Good fit: gaming theme for games category
      const goodFitResult = validator.validate({
        type: 'screenshot',
        detectedTheme: {
          id: 'gaming',
          name: 'Gaming & Immersive'
        },
        appCategory: 'games'
      });
      expect(goodFitResult.passed).toBe(true);
      expect(goodFitResult.score).toBeGreaterThan(80);

      // Poor fit: gaming theme for productivity category
      const poorFitResult = validator.validate({
        type: 'screenshot',
        detectedTheme: {
          id: 'gaming',
          name: 'Gaming & Immersive'
        },
        appCategory: 'productivity'
      });
      expect(poorFitResult.passed).toBe(false);
      expect(poorFitResult.score).toBeLessThan(60);
    });
  });

  describe('Scoring Rubrics Registry', () => {
    it('should retrieve rubric by category', () => {
      const rubric = CreativeIntelligenceRegistryService.getScoringRubric('games');
      expect(rubric).toBeDefined();
      expect(rubric.category).toBe('games');
    });

    it('should return default rubric for unknown category', () => {
      const rubric = CreativeIntelligenceRegistryService.getScoringRubric('unknown-category');
      expect(rubric).toBeDefined();
      expect(rubric.category).toBe('default');
    });

    it('should retrieve all rubrics', () => {
      const rubrics = CreativeIntelligenceRegistryService.getAllScoringRubrics();
      expect(rubrics.length).toBe(6);
      expect(rubrics.map(r => r.category)).toContain('games');
      expect(rubrics.map(r => r.category)).toContain('productivity');
      expect(rubrics.map(r => r.category)).toContain('social networking');
      expect(rubrics.map(r => r.category)).toContain('entertainment');
      expect(rubrics.map(r => r.category)).toContain('finance');
      expect(rubrics.map(r => r.category)).toContain('default');
    });

    it('should have valid rubric structure', () => {
      const rubric = CreativeIntelligenceRegistryService.getScoringRubric('games');

      // Weights should sum to 1.0
      const weightSum = rubric.weights.visual +
                       rubric.weights.text +
                       rubric.weights.messaging +
                       rubric.weights.engagement;
      expect(weightSum).toBeCloseTo(1.0, 5);

      // Theme preferences
      expect(Array.isArray(rubric.themePreferences)).toBe(true);

      // Min requirements
      expect(rubric.minRequirements.screenshotCount).toBeGreaterThan(0);
      expect(rubric.minRequirements.descriptionLength).toBeGreaterThan(0);
      expect(Array.isArray(rubric.minRequirements.iconResolution)).toBe(true);
      expect(rubric.minRequirements.iconResolution.length).toBe(2);

      // Competitive thresholds
      expect(rubric.competitiveThresholds.excellent).toBeGreaterThan(rubric.competitiveThresholds.good);
      expect(rubric.competitiveThresholds.good).toBeGreaterThan(rubric.competitiveThresholds.average);
    });

    it('should have different weights for different categories', () => {
      const gamesRubric = CreativeIntelligenceRegistryService.getScoringRubric('games');
      const productivityRubric = CreativeIntelligenceRegistryService.getScoringRubric('productivity');

      // Games should prioritize visual over text
      expect(gamesRubric.weights.visual).toBeGreaterThan(productivityRubric.weights.visual);

      // Productivity should prioritize text/messaging
      expect(productivityRubric.weights.text).toBeGreaterThan(gamesRubric.weights.text);
    });
  });

  describe('Weighted Score Calculation', () => {
    it('should calculate weighted score for games category', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('games', {
        visual: 90,
        text: 70,
        messaging: 80,
        engagement: 85
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);

      // Games weighs visual heavily (45%), so score should be close to visual score
      expect(score).toBeGreaterThan(80);
    });

    it('should calculate weighted score for productivity category', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('productivity', {
        visual: 70,
        text: 90,
        messaging: 85,
        engagement: 60
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);

      // Productivity weighs text/messaging heavily, so score should reflect that
      expect(score).toBeGreaterThan(75);
    });

    it('should return 0 for all zero scores', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('games', {
        visual: 0,
        text: 0,
        messaging: 0,
        engagement: 0
      });

      expect(score).toBe(0);
    });

    it('should return 100 for all perfect scores', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('games', {
        visual: 100,
        text: 100,
        messaging: 100,
        engagement: 100
      });

      expect(score).toBe(100);
    });

    it('should use default rubric for unknown category', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('unknown', {
        visual: 80,
        text: 80,
        messaging: 80,
        engagement: 80
      });

      expect(score).toBe(80);
    });
  });

  describe('Performance Tier Mapping', () => {
    it('should return "excellent" for high scores', () => {
      const tier = CreativeIntelligenceRegistryService.getPerformanceTier('games', 92);
      expect(tier).toBe('excellent');
    });

    it('should return "good" for above-average scores', () => {
      const tier = CreativeIntelligenceRegistryService.getPerformanceTier('games', 80);
      expect(tier).toBe('good');
    });

    it('should return "average" for mid-range scores', () => {
      const tier = CreativeIntelligenceRegistryService.getPerformanceTier('games', 65);
      expect(tier).toBe('average');
    });

    it('should return "poor" for low scores', () => {
      const tier = CreativeIntelligenceRegistryService.getPerformanceTier('games', 40);
      expect(tier).toBe('poor');
    });

    it('should use category-specific thresholds', () => {
      // Games has higher thresholds than productivity
      const gamesExcellent = CreativeIntelligenceRegistryService.getPerformanceTier('games', 90);
      const productivityExcellent = CreativeIntelligenceRegistryService.getPerformanceTier('productivity', 85);

      expect(gamesExcellent).toBe('excellent');
      expect(productivityExcellent).toBe('excellent');
    });

    it('should handle boundary cases correctly', () => {
      const rubric = CreativeIntelligenceRegistryService.getScoringRubric('games');

      // Score exactly at excellent threshold
      const exactlyExcellent = CreativeIntelligenceRegistryService.getPerformanceTier(
        'games',
        rubric.competitiveThresholds.excellent
      );
      expect(exactlyExcellent).toBe('excellent');

      // Score just below excellent threshold
      const justBelowExcellent = CreativeIntelligenceRegistryService.getPerformanceTier(
        'games',
        rubric.competitiveThresholds.excellent - 1
      );
      expect(justBelowExcellent).toBe('good');
    });
  });

  describe('Registry Consistency', () => {
    it('should have consistent theme references', () => {
      const themes = CreativeIntelligenceRegistryService.getAllThemes();
      const rubrics = CreativeIntelligenceRegistryService.getAllScoringRubrics();

      rubrics.forEach(rubric => {
        rubric.themePreferences.forEach(themeId => {
          const theme = themes.find(t => t.id === themeId);
          expect(theme).toBeDefined();
        });
      });
    });

    it('should have all metrics referenced in rubric weights', () => {
      const rubric = CreativeIntelligenceRegistryService.getScoringRubric('games');

      expect(rubric.weights.visual).toBeDefined();
      expect(rubric.weights.text).toBeDefined();
      expect(rubric.weights.messaging).toBeDefined();
      expect(rubric.weights.engagement).toBeDefined();
    });

    it('should have validators for all element types', () => {
      const validators = CreativeIntelligenceRegistryService.getAllValidators();
      const elementTypes = ['screenshots', 'icon', 'description'];

      elementTypes.forEach(elementType => {
        const validatorsForType = validators.filter(v => v.elementTypes.includes(elementType));
        expect(validatorsForType.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty category string', () => {
      const rubric = CreativeIntelligenceRegistryService.getScoringRubric('');
      expect(rubric.category).toBe('default');
    });

    it('should handle case-insensitive category lookup', () => {
      // Note: Service should normalize to lowercase
      const rubric1 = CreativeIntelligenceRegistryService.getScoringRubric('Games');
      const rubric2 = CreativeIntelligenceRegistryService.getScoringRubric('games');
      const rubric3 = CreativeIntelligenceRegistryService.getScoringRubric('GAMES');

      // All should return same rubric (or at least same category)
      expect(rubric1.category.toLowerCase()).toBe('games');
      expect(rubric2.category.toLowerCase()).toBe('games');
      expect(rubric3.category.toLowerCase()).toBe('games');
    });

    it('should handle negative scores gracefully', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('games', {
        visual: -10,
        text: -10,
        messaging: -10,
        engagement: -10
      });

      // Should clamp to 0
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle scores above 100 gracefully', () => {
      const score = CreativeIntelligenceRegistryService.calculateWeightedScore('games', {
        visual: 150,
        text: 150,
        messaging: 150,
        engagement: 150
      });

      // Should clamp to 100
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
