/**
 * Mock Audit Result for UI Development
 *
 * Real data from Pimsleur app tested with metadata-audit-v2 backend.
 * Use this for UI development before wiring real API.
 */

import type { UnifiedMetadataAuditResult } from './types';

export const MOCK_PIMSLEUR_AUDIT: UnifiedMetadataAuditResult = {
  overallScore: 87,
  elements: {
    title: {
      element: 'title',
      score: 93,
      ruleResults: [
        {
          ruleId: 'title_character_usage',
          passed: true,
          score: 100,
          message: 'Using 28/30 characters (93%)',
          evidence: []
        },
        {
          ruleId: 'title_unique_keywords',
          passed: true,
          score: 100,
          message: '3 unique keywords',
          evidence: ['pimsleur', 'language', 'learning']
        },
        {
          ruleId: 'title_combo_coverage',
          passed: true,
          score: 75,
          message: '3 meaningful keyword combinations',
          evidence: ['pimsleur language', 'language learning', 'pimsleur language learning']
        },
        {
          ruleId: 'title_filler_penalty',
          passed: true,
          score: 100,
          penalty: 0,
          message: '0 filler tokens (0%)',
          evidence: []
        }
      ],
      recommendations: [],
      insights: [
        '3 unique keywords',
        '3 meaningful keyword combinations'
      ],
      metadata: {
        characterUsage: 28,
        maxCharacters: 30,
        keywords: ['pimsleur', 'language', 'learning'],
        combos: ['pimsleur language', 'language learning', 'pimsleur language learning'],
        benchmarkComparison: {
          score: 93,
          categoryAverage: 72,
          percentile: 97,
          vsAverage: 21,
          tier: 'Exceptional',
          message: 'Your title is exceptional - in the top 5% of Education apps with a score of 93.',
          insight: 'Exceptional - 97th percentile, 21 points above average'
        }
      }
    },
    subtitle: {
      element: 'subtitle',
      score: 99,
      ruleResults: [
        {
          ruleId: 'subtitle_character_usage',
          passed: true,
          score: 100,
          message: 'Using 28/30 characters (93%)',
          evidence: []
        },
        {
          ruleId: 'subtitle_incremental_value',
          passed: true,
          score: 100,
          message: '4 new keywords (100% unique)',
          evidence: ['learn', 'spanish', 'french', 'more']
        },
        {
          ruleId: 'subtitle_combo_coverage',
          passed: true,
          score: 95,
          message: '12 new keyword combinations',
          evidence: ['learning learn', 'learn spanish', 'spanish french', 'french more', 'language learning learn']
        },
        {
          ruleId: 'subtitle_complementarity',
          passed: true,
          score: 100,
          message: 'Excellent complementarity with title',
          evidence: []
        }
      ],
      recommendations: [],
      insights: [
        '4 new keywords (100% unique)',
        '12 new keyword combinations'
      ],
      metadata: {
        characterUsage: 28,
        maxCharacters: 30,
        keywords: ['learn', 'spanish', 'french', 'more'],
        combos: ['learn spanish', 'spanish french', 'french more'],
        benchmarkComparison: null
      }
    },
    description: {
      element: 'description',
      score: 50,
      ruleResults: [
        {
          ruleId: 'description_hook_strength',
          passed: true,
          score: 90,
          message: 'Strong opening hook detected',
          evidence: ['discover', 'master']
        },
        {
          ruleId: 'description_feature_mentions',
          passed: false,
          score: 0,
          message: '0 feature mentions',
          evidence: []
        },
        {
          ruleId: 'description_cta_strength',
          passed: true,
          score: 75,
          message: '3 CTAs detected',
          evidence: ['learn', 'try', 'speak']
        },
        {
          ruleId: 'description_readability',
          passed: false,
          score: 31,
          message: 'Flesch-Kincaid: 31/100 (Difficult)',
          evidence: []
        }
      ],
      recommendations: [
        '0 feature mentions',
        'Flesch-Kincaid: 31/100 (Difficult)'
      ],
      insights: [
        'Strong opening hook detected',
        '3 CTAs detected'
      ],
      metadata: {
        characterUsage: 407,
        maxCharacters: 4000,
        keywords: ['discover', 'power', 'pimsleur', 'language', 'learning'],
        combos: ['discover the', 'the power', 'power of', 'of pimsleur'],
        benchmarkComparison: {
          score: 50,
          categoryAverage: 70,
          percentile: 29,
          vsAverage: -20,
          tier: 'Below Average',
          message: 'Your description is below the Education category average (70) with a score of 50.',
          insight: 'Below Average - 20 points below average, priority for optimization'
        }
      }
    }
  },
  topRecommendations: [
    '[DESCRIPTION] 0 feature mentions',
    '[DESCRIPTION] Flesch-Kincaid: 31/100 (Difficult)'
  ],
  keywordCoverage: {
    totalUniqueKeywords: 46,
    titleKeywords: ['pimsleur', 'language', 'learning'],
    subtitleNewKeywords: ['learn', 'spanish', 'french', 'more'],
    descriptionNewKeywords: ['discover', 'power', 'master', 'audio', 'method']
  },
  comboCoverage: {
    totalCombos: 15,
    titleCombos: ['pimsleur language', 'language learning', 'pimsleur language learning'],
    subtitleNewCombos: ['learn spanish', 'spanish french', 'french more'],
    allCombinedCombos: ['pimsleur language', 'language learning', 'learn spanish', 'spanish french']
  },
  conversionRecommendations: [
    '[DESCRIPTION] Consider adding more feature bullet points for clarity',
    '[DESCRIPTION] Include social proof or testimonials in the description'
  ],
  conversionInsights: {
    description: {
      score: 78,
      readability: 85,
      hookStrength: 90,
      featureMentions: 60,
      ctaStrength: 75,
      noiseRatio: 0.42,
      recommendations: [
        'Consider adding more feature bullet points for clarity',
        'Include social proof or testimonials in the description'
      ]
    }
  }
};
