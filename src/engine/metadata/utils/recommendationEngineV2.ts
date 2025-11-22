/**
 * Recommendation Engine V2
 *
 * Generates strategic, ASO consultant-style recommendations with:
 * - Severity levels (critical, strong, moderate, optional)
 * - Category grouping (ranking_keyword, ranking_structure, conversion, brand_alignment)
 * - Deduplication logic
 * - Impact scoring for prioritization
 * - Integration with V2 engine signals
 */

import type { ElementScoringResult, MetadataElement, UnifiedMetadataAuditResult, ClassifiedCombo } from '../metadataScoringRegistry';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';

/**
 * Severity levels for recommendations
 */
export type RecommendationSeverity = 'critical' | 'strong' | 'moderate' | 'optional';

/**
 * Recommendation categories
 */
export type RecommendationCategory = 'ranking_keyword' | 'ranking_structure' | 'conversion' | 'brand_alignment';

/**
 * Internal recommendation structure
 */
export interface EnhancedRecommendation {
  id: string;  // Unique ID for deduplication
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  impactScore: number;  // For sorting (critical=90, strong=70, moderate=40, optional=20)
  message: string;  // Final user-facing message
  element?: MetadataElement;  // Optional element reference
}

/**
 * Input signals for recommendation generation
 */
export interface RecommendationSignals {
  // Element results
  titleResult: ElementScoringResult;
  subtitleResult: ElementScoringResult;
  descriptionResult: ElementScoringResult;

  // Keyword coverage
  titleKeywordCount: number;
  subtitleKeywordCount: number;
  titleHighValueKeywordCount: number;
  subtitleHighValueKeywordCount: number;

  // Noise ratios
  titleNoiseRatio?: number;
  subtitleNoiseRatio?: number;

  // Combo coverage
  brandedCombos: ClassifiedCombo[];
  genericCombos: ClassifiedCombo[];
  lowValueCombos: ClassifiedCombo[];

  // Conversion signals
  descriptionHookStrength: number;
  descriptionFeatureMentions: number;
  descriptionReadability: number;
  descriptionCtaStrength: number;
}

/**
 * Maps severity to impact score
 */
const SEVERITY_TO_IMPACT: Record<RecommendationSeverity, number> = {
  critical: 90,
  strong: 70,
  moderate: 40,
  optional: 20
};

/**
 * Generates ranking keyword recommendations
 */
function generateRankingKeywordRecs(signals: RecommendationSignals): EnhancedRecommendation[] {
  const recs: EnhancedRecommendation[] = [];

  // Title: Very few high-value keywords
  if (signals.titleHighValueKeywordCount <= 1) {
    recs.push({
      id: 'title_low_high_value_keywords',
      category: 'ranking_keyword',
      severity: 'critical',
      impactScore: SEVERITY_TO_IMPACT.critical,
      message: '[RANKING][critical] Title includes very few high-value discovery keywords. Adding 1–2 intent terms (e.g. \'learn spanish\', \'language lessons\') typically increases ranking breadth.',
      element: 'title'
    });
  } else if (signals.titleHighValueKeywordCount === 2) {
    recs.push({
      id: 'title_moderate_high_value_keywords',
      category: 'ranking_keyword',
      severity: 'moderate',
      impactScore: SEVERITY_TO_IMPACT.moderate,
      message: '[RANKING][moderate] Title has decent high-value keywords, but adding 1 more can help capture additional search queries.',
      element: 'title'
    });
  }

  // Subtitle: Very few new high-value keywords
  if (signals.subtitleHighValueKeywordCount === 0) {
    recs.push({
      id: 'subtitle_no_incremental_keywords',
      category: 'ranking_keyword',
      severity: 'critical',
      impactScore: SEVERITY_TO_IMPACT.critical,
      message: '[RANKING][critical] Subtitle adds no new high-value keywords. This is a missed opportunity—consider adding unique intent phrases (e.g. \'speak fluently\', \'grammar lessons\').',
      element: 'subtitle'
    });
  } else if (signals.subtitleHighValueKeywordCount === 1) {
    recs.push({
      id: 'subtitle_low_incremental_keywords',
      category: 'ranking_keyword',
      severity: 'strong',
      impactScore: SEVERITY_TO_IMPACT.strong,
      message: '[RANKING][strong] Subtitle adds only 1 new high-value keyword. Adding 1–2 more can significantly expand search coverage.',
      element: 'subtitle'
    });
  }

  return recs;
}

/**
 * Generates ranking structure recommendations
 */
function generateRankingStructureRecs(signals: RecommendationSignals): EnhancedRecommendation[] {
  const recs: EnhancedRecommendation[] = [];

  // Title: High noise ratio
  if (signals.titleNoiseRatio !== undefined && signals.titleNoiseRatio > 0.4) {
    recs.push({
      id: 'title_high_noise_ratio',
      category: 'ranking_structure',
      severity: 'strong',
      impactScore: SEVERITY_TO_IMPACT.strong,
      message: `[RANKING][strong] Title contains ${Math.round(signals.titleNoiseRatio * 100)}% stopwords/filler. Reducing noise words (e.g. 'the', 'best', 'new') can improve ranking clarity.`,
      element: 'title'
    });
  }

  // Subtitle: High noise ratio
  if (signals.subtitleNoiseRatio !== undefined && signals.subtitleNoiseRatio > 0.4) {
    recs.push({
      id: 'subtitle_high_noise_ratio',
      category: 'ranking_structure',
      severity: 'moderate',
      impactScore: SEVERITY_TO_IMPACT.moderate,
      message: `[RANKING][moderate] Subtitle contains ${Math.round(signals.subtitleNoiseRatio * 100)}% stopwords/filler. Prioritizing meaningful keywords can help ranking.`,
      element: 'subtitle'
    });
  }

  // Title: Character usage (from rule results)
  const titleCharRule = signals.titleResult.ruleResults.find(r => r.ruleId === 'title_character_usage');
  if (titleCharRule && !titleCharRule.passed && titleCharRule.score < 70) {
    const charCount = signals.titleResult.metadata.characterUsage;
    const maxChars = signals.titleResult.metadata.maxCharacters;
    const usagePercent = Math.round((charCount / maxChars) * 100);

    if (usagePercent < 70) {
      recs.push({
        id: 'title_underutilized_characters',
        category: 'ranking_structure',
        severity: 'strong',
        impactScore: SEVERITY_TO_IMPACT.strong,
        message: `[RANKING][strong] Title uses only ${charCount}/${maxChars} characters (${usagePercent}%). Adding more keywords can unlock additional search opportunities.`,
        element: 'title'
      });
    }
  }

  // Subtitle: Character usage
  const subtitleCharRule = signals.subtitleResult.ruleResults.find(r => r.ruleId === 'subtitle_character_usage');
  if (subtitleCharRule && !subtitleCharRule.passed && subtitleCharRule.score < 70) {
    const charCount = signals.subtitleResult.metadata.characterUsage;
    const maxChars = signals.subtitleResult.metadata.maxCharacters;
    const usagePercent = charCount > 0 ? Math.round((charCount / maxChars) * 100) : 0;

    if (charCount === 0) {
      recs.push({
        id: 'subtitle_empty',
        category: 'ranking_structure',
        severity: 'critical',
        impactScore: SEVERITY_TO_IMPACT.critical,
        message: '[RANKING][critical] No subtitle set. Subtitle is a major ranking factor—adding one can double your keyword coverage.',
        element: 'subtitle'
      });
    } else if (usagePercent < 70) {
      recs.push({
        id: 'subtitle_underutilized_characters',
        category: 'ranking_structure',
        severity: 'moderate',
        impactScore: SEVERITY_TO_IMPACT.moderate,
        message: `[RANKING][moderate] Subtitle uses only ${charCount}/${maxChars} characters (${usagePercent}%). Consider adding more discovery keywords.`,
        element: 'subtitle'
      });
    }
  }

  return recs;
}

/**
 * Generates brand alignment recommendations (combo-based)
 */
function generateBrandAlignmentRecs(signals: RecommendationSignals): EnhancedRecommendation[] {
  const recs: EnhancedRecommendation[] = [];

  const brandedCount = signals.brandedCombos.length;
  const genericCount = signals.genericCombos.length;
  const lowValueCount = signals.lowValueCombos.length;

  // PHASE 5: Brand Intelligence Enhancement
  // Use brandClassification field if available (AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED)
  let brandClassifiedCount = 0;
  let genericClassifiedCount = 0;

  if (AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED) {
    // Count combos with brand classification
    const allCombos = [...signals.brandedCombos, ...signals.genericCombos];
    brandClassifiedCount = allCombos.filter(c => c.brandClassification === 'brand').length;
    genericClassifiedCount = allCombos.filter(c => c.brandClassification === 'generic').length;

    // Phase 5: Brand-aware recommendations (use brandClassification when available)
    if (brandClassifiedCount > 0 && genericClassifiedCount > 0) {
      // Brand >> Generic (too brand-focused) - using Phase 5 classification
      if (brandClassifiedCount >= 4 && genericClassifiedCount <= 2) {
        recs.push({
          id: 'brand_intelligence_too_brand_focused',
          category: 'brand_alignment',
          severity: 'strong',
          impactScore: SEVERITY_TO_IMPACT.strong,
          message: `[BRAND][strong] ${brandClassifiedCount} brand combos detected vs. ${genericClassifiedCount} generic discovery combos. Consider balancing with more non-branded phrases (e.g. 'learn spanish', 'language lessons') to reach non-brand-aware users.`
        });
      }

      // Missing brand presence entirely
      if (brandClassifiedCount === 0 && genericClassifiedCount > 3) {
        recs.push({
          id: 'brand_intelligence_missing_brand',
          category: 'brand_alignment',
          severity: 'moderate',
          impactScore: SEVERITY_TO_IMPACT.moderate,
          message: '[BRAND][moderate] No brand-related combos detected. Consider including your app/brand name in strategic positions to improve branded search visibility.'
        });
      }

      // Good balance
      if (brandClassifiedCount >= 2 && brandClassifiedCount <= 3 && genericClassifiedCount >= 3) {
        recs.push({
          id: 'brand_intelligence_good_balance',
          category: 'brand_alignment',
          severity: 'optional',
          impactScore: SEVERITY_TO_IMPACT.optional - 5, // Lower priority than other recommendations
          message: `[BRAND][success] Good brand-generic balance: ${brandClassifiedCount} brand combos, ${genericClassifiedCount} generic combos. This supports both brand-aware and discovery searches.`
        });
      }
    }
  } else {
    // Fallback: Legacy brand alignment recommendations (using TYPE classification)
    // Branded >> Generic (too brand-focused)
    if (brandedCount >= 4 && genericCount <= 2) {
      recs.push({
        id: 'combo_too_brand_focused',
        category: 'brand_alignment',
        severity: 'strong',
        impactScore: SEVERITY_TO_IMPACT.strong,
        message: '[RANKING][strong] Strong branded coverage but limited generic discovery combos. Consider adding more generic phrases (e.g. \'learn spanish\', \'language lessons\') to reach non-brand-aware users.'
      });
    }

    // Very few generic combos overall
    if (genericCount > 0 && genericCount <= 3) {
      recs.push({
        id: 'combo_low_generic_coverage',
        category: 'brand_alignment',
        severity: 'moderate',
        impactScore: SEVERITY_TO_IMPACT.moderate,
        message: '[RANKING][moderate] Only a few generic discovery combos detected. Adding more non-branded phrases in title/subtitle can unlock additional search volume.'
      });
    }
  }

  // Low-value combos dominate (applies regardless of brand intelligence flag)
  if (lowValueCount > 0 && lowValueCount >= genericCount) {
    recs.push({
      id: 'combo_low_value_dominance',
      category: 'brand_alignment',
      severity: 'moderate',
      impactScore: SEVERITY_TO_IMPACT.moderate,
      message: '[RANKING][moderate] A significant share of your combinations are numeric or time-based (e.g. \'in 30 days\'). These have limited impact on search. Consider refocusing on intent-driven phrases such as \'learn spanish\', \'language lessons\'.'
    });
  }

  return recs;
}

/**
 * Generates conversion recommendations
 */
function generateConversionRecs(signals: RecommendationSignals): EnhancedRecommendation[] {
  const recs: EnhancedRecommendation[] = [];

  // Hook strength
  if (signals.descriptionHookStrength < 70) {
    recs.push({
      id: 'description_weak_hook',
      category: 'conversion',
      severity: signals.descriptionHookStrength < 50 ? 'strong' : 'moderate',
      impactScore: signals.descriptionHookStrength < 50 ? SEVERITY_TO_IMPACT.strong : SEVERITY_TO_IMPACT.moderate,
      message: `[CONVERSION][${signals.descriptionHookStrength < 50 ? 'strong' : 'moderate'}] Description opening lacks compelling hook words. Adding attention-grabbing terms (e.g. 'discover', 'transform', 'unlock') in the first sentence can boost engagement.`,
      element: 'description'
    });
  }

  // Feature mentions
  if (signals.descriptionFeatureMentions < 60) {
    const featureRule = signals.descriptionResult.ruleResults.find(r => r.ruleId === 'description_feature_mentions');
    const featureCount = featureRule?.evidence?.length || 0;

    if (featureCount === 0) {
      recs.push({
        id: 'description_no_features',
        category: 'conversion',
        severity: 'strong',
        impactScore: SEVERITY_TO_IMPACT.strong,
        message: '[CONVERSION][strong] Description contains no visible feature cues. Adding 2–3 specific benefits can significantly improve conversion.',
        element: 'description'
      });
    } else {
      recs.push({
        id: 'description_few_features',
        category: 'conversion',
        severity: 'moderate',
        impactScore: SEVERITY_TO_IMPACT.moderate,
        message: `[CONVERSION][moderate] Description mentions only ${featureCount} feature${featureCount !== 1 ? 's' : ''}. Adding 1–2 more can help users understand your value proposition.`,
        element: 'description'
      });
    }
  }

  // Readability
  if (signals.descriptionReadability < 60) {
    recs.push({
      id: 'description_low_readability',
      category: 'conversion',
      severity: 'moderate',
      impactScore: SEVERITY_TO_IMPACT.moderate,
      message: `[CONVERSION][moderate] Description readability score is ${signals.descriptionReadability}/100. Shorter sentences and simpler language can improve user comprehension.`,
      element: 'description'
    });
  }

  // CTA strength
  if (signals.descriptionCtaStrength < 50) {
    recs.push({
      id: 'description_weak_cta',
      category: 'conversion',
      severity: 'optional',
      impactScore: SEVERITY_TO_IMPACT.optional,
      message: '[CONVERSION][optional] Description lacks clear call-to-action phrases. Adding conversion-focused CTAs (e.g. \'download\', \'start today\', \'try free\') can help drive installs.',
      element: 'description'
    });
  }

  return recs;
}

/**
 * Deduplicates recommendations by category
 * If multiple recs target the same conceptual issue, keep only the highest severity
 */
function deduplicateRecommendations(recs: EnhancedRecommendation[]): EnhancedRecommendation[] {
  const recMap = new Map<string, EnhancedRecommendation>();

  for (const rec of recs) {
    const existing = recMap.get(rec.id);
    if (!existing || rec.impactScore > existing.impactScore) {
      recMap.set(rec.id, rec);
    }
  }

  return Array.from(recMap.values());
}

/**
 * Main recommendation generation function
 */
export function generateEnhancedRecommendations(
  signals: RecommendationSignals
): {
  rankingRecommendations: string[];
  conversionRecommendations: string[];
} {
  // Generate all recommendations
  const allRecs: EnhancedRecommendation[] = [
    ...generateRankingKeywordRecs(signals),
    ...generateRankingStructureRecs(signals),
    ...generateBrandAlignmentRecs(signals),
    ...generateConversionRecs(signals)
  ];

  // Deduplicate
  const dedupedRecs = deduplicateRecommendations(allRecs);

  // Sort by impact score (highest first)
  const sortedRecs = dedupedRecs.sort((a, b) => b.impactScore - a.impactScore);

  // Separate ranking vs conversion
  const rankingRecs = sortedRecs.filter(r => r.category !== 'conversion');
  const conversionRecs = sortedRecs.filter(r => r.category === 'conversion');

  // Take top 5 ranking, top 3 conversion
  const topRankingRecs = rankingRecs.slice(0, 5).map(r => r.message);
  const topConversionRecs = conversionRecs.slice(0, 3).map(r => r.message);

  return {
    rankingRecommendations: topRankingRecs,
    conversionRecommendations: topConversionRecs
  };
}
