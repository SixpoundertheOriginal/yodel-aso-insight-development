/**
 * Metadata Audit Engine Tests
 *
 * Minimal unit tests to verify core scoring logic.
 */

import { MetadataAuditEngine } from '../metadataAuditEngine';
import type { ScrapedMetadata } from '@/types/aso';

describe('MetadataAuditEngine', async () => {
  describe('evaluate', async () => {
    it('should evaluate basic metadata and return valid result', async () => {
      const metadata: ScrapedMetadata = {
        name: 'Pimsleur',
        title: 'Pimsleur | Language Learning',
        subtitle: 'Learn Spanish, French & More',
        description: 'Discover the power of Pimsleur language learning. Master Spanish, French, German, and 50+ languages with our proven audio-based method. Try our free lesson today!',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Verify structure
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      // Verify all elements evaluated
      expect(result.elements.title).toBeDefined();
      expect(result.elements.subtitle).toBeDefined();
      expect(result.elements.description).toBeDefined();

      // Verify each element has score
      expect(result.elements.title.score).toBeGreaterThanOrEqual(0);
      expect(result.elements.subtitle.score).toBeGreaterThanOrEqual(0);
      expect(result.elements.description.score).toBeGreaterThanOrEqual(0);

      // Verify keyword coverage
      expect(result.keywordCoverage.totalUniqueKeywords).toBeGreaterThan(0);
      expect(result.keywordCoverage.titleKeywords.length).toBeGreaterThan(0);

      // Verify combo coverage
      expect(result.comboCoverage.totalCombos).toBeGreaterThanOrEqual(0);
    });

    it('should score high-quality title appropriately', async () => {
      const metadata: ScrapedMetadata = {
        name: 'TestApp',
        title: 'Language Learning App Master',
        subtitle: 'Practice Speaking Daily',
        description: 'Great app',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Title uses good characters and keywords
      expect(result.elements.title.score).toBeGreaterThan(60);
    });

    it('should penalize short title with low character usage', async () => {
      const metadata: ScrapedMetadata = {
        name: 'App',
        title: 'App',
        subtitle: '',
        description: '',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Short title should get penalized
      expect(result.elements.title.score).toBeLessThan(80);
    });

    it('should score subtitle incremental value correctly', async () => {
      const metadata: ScrapedMetadata = {
        name: 'TestApp',
        title: 'Language Learning Master',
        subtitle: 'Spanish French German Tutor', // All new keywords
        description: 'Description',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Subtitle has high incremental value (all new keywords)
      expect(result.elements.subtitle.score).toBeGreaterThan(50);
      expect(result.keywordCoverage.subtitleNewKeywords.length).toBeGreaterThan(0);
    });

    it('should detect low complementarity when subtitle duplicates title', async () => {
      const metadata: ScrapedMetadata = {
        name: 'TestApp',
        title: 'Language Learning Master',
        subtitle: 'Language Learning Best', // Duplicates "Language Learning"
        description: 'Description',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Should have some overlap penalty
      const complementarityRule = result.elements.subtitle.ruleResults.find(
        r => r.ruleId === 'subtitle_complementarity'
      );

      expect(complementarityRule).toBeDefined();
      expect(complementarityRule!.score).toBeLessThan(100);
    });

    it('should score description hook strength', async () => {
      const metadata: ScrapedMetadata = {
        name: 'TestApp',
        title: 'Test App',
        subtitle: 'Great App',
        description: 'Discover the power of our amazing app. Transform your life today!',
        applicationCategory: 'Productivity'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Description has "Discover" and "Transform" hook keywords
      const hookRule = result.elements.description.ruleResults.find(
        r => r.ruleId === 'description_hook_strength'
      );

      expect(hookRule).toBeDefined();
      expect(hookRule!.score).toBeGreaterThan(70);
    });

    it('should handle missing elements gracefully', async () => {
      const metadata: ScrapedMetadata = {
        name: 'TestApp',
        title: '',
        subtitle: '',
        description: '',
        applicationCategory: 'Unknown'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Should not crash, but scores should be low
      expect(result.overallScore).toBeLessThan(50);
      expect(result.topRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate actionable recommendations', async () => {
      const metadata: ScrapedMetadata = {
        name: 'A',
        title: 'App',
        subtitle: '',
        description: 'Short.',
        applicationCategory: 'Games'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Should have recommendations for improvement
      expect(result.topRecommendations.length).toBeGreaterThan(0);

      // Recommendations should be prioritized (low scoring elements first)
      expect(result.topRecommendations[0]).toContain('[');
    });

    it('should calculate keyword coverage across all elements', async () => {
      const metadata: ScrapedMetadata = {
        name: 'Learning App',
        title: 'Language Learning Master',
        subtitle: 'Spanish French Tutor',
        description: 'Practice daily with interactive exercises and games.',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Should have progressive keyword additions
      expect(result.keywordCoverage.titleKeywords.length).toBeGreaterThan(0);
      expect(result.keywordCoverage.subtitleNewKeywords.length).toBeGreaterThan(0);
      expect(result.keywordCoverage.totalUniqueKeywords).toBeGreaterThanOrEqual(
        result.keywordCoverage.titleKeywords.length + result.keywordCoverage.subtitleNewKeywords.length
      );
    });

    it('should calculate combo coverage correctly', async () => {
      const metadata: ScrapedMetadata = {
        name: 'App',
        title: 'Language Learning Spanish',
        subtitle: 'French German Practice',
        description: 'Description',
        applicationCategory: 'Education'
      };

      const result = await MetadataAuditEngine.evaluate(metadata);

      // Should have title combos
      expect(result.comboCoverage.titleCombos.length).toBeGreaterThan(0);

      // Should have new combos from subtitle
      expect(result.comboCoverage.subtitleNewCombos.length).toBeGreaterThan(0);

      // Total should include all
      expect(result.comboCoverage.allCombinedCombos.length).toBeGreaterThanOrEqual(
        result.comboCoverage.titleCombos.length
      );
    });
  });
});
