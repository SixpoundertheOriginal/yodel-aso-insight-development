/**
 * Audit Scoring Engine Service
 *
 * Centralized scoring calculations for ASO Audit.
 * All scoring formulas and weights are defined here.
 *
 * Phase 2.6: Initial extraction from useEnhancedAppAudit hook
 * Phase 3: Enhanced with advanced algorithms for keyword, competitor, and creative scoring
 */

import { ScrapedMetadata } from '@/types/aso';
import { AUDIT_KEYWORDS_ENABLED } from '@/config/auditFeatureFlags';

// ============================================
// Type Definitions
// ============================================

export interface ScoringWeights {
  keyword: number;
  metadata: number;
  competitor: number;
}

export interface AuditScores {
  overall: number;
  keyword: number;
  metadata: number;
  competitor: number;
  creative: number;
}

export interface ScoreCalculationContext {
  mode: 'full' | 'metadata-only';
  weights?: ScoringWeights;
}

export interface ScoringWeightsProfile {
  id: string;
  name: string;
  description: string;
  weights: ScoringWeights;
  isDefault?: boolean;
}

// ============================================
// Scoring Weights Configuration
// ============================================

/**
 * Default scoring weights for full audit mode
 */
export const DEFAULT_FULL_MODE_WEIGHTS: ScoringWeights = {
  keyword: 0.4,     // 40%
  metadata: 0.35,   // 35%
  competitor: 0.25, // 25%
};

/**
 * Default scoring weights for metadata-only mode
 */
export const DEFAULT_METADATA_ONLY_WEIGHTS: ScoringWeights = {
  keyword: 0,       // 0%
  metadata: 0.6,    // 60%
  competitor: 0.4,  // 40%
};

/**
 * Pre-defined scoring weight profiles
 * Phase 3: Users can select from these profiles or create custom ones
 */
export const SCORING_WEIGHT_PROFILES: ScoringWeightsProfile[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal emphasis on keywords, metadata, and competition',
    weights: DEFAULT_FULL_MODE_WEIGHTS,
    isDefault: true,
  },
  {
    id: 'keyword-focused',
    name: 'Keyword Focused',
    description: 'Prioritizes keyword rankings and visibility',
    weights: {
      keyword: 0.6,     // 60%
      metadata: 0.25,   // 25%
      competitor: 0.15, // 15%
    },
  },
  {
    id: 'metadata-focused',
    name: 'Metadata Focused',
    description: 'Emphasizes app store listing quality',
    weights: {
      keyword: 0.25,  // 25%
      metadata: 0.55, // 55%
      competitor: 0.2, // 20%
    },
  },
  {
    id: 'competition-focused',
    name: 'Competition Focused',
    description: 'Prioritizes competitive market position',
    weights: {
      keyword: 0.3,   // 30%
      metadata: 0.3,  // 30%
      competitor: 0.4, // 40%
    },
  },
];

// ============================================
// Scoring Engine Class
// ============================================

class AuditScoringEngine {
  private customWeights: ScoringWeights | null = null;

  /**
   * Get available scoring weight profiles
   * @returns Array of pre-defined weight profiles
   */
  getAvailableProfiles(): ScoringWeightsProfile[] {
    return SCORING_WEIGHT_PROFILES;
  }

  /**
   * Get weights by profile ID
   * @param profileId - Profile identifier
   * @returns Scoring weights for the profile, or null if not found
   */
  getWeightsByProfile(profileId: string): ScoringWeights | null {
    const profile = SCORING_WEIGHT_PROFILES.find(p => p.id === profileId);
    return profile ? profile.weights : null;
  }

  /**
   * Set custom scoring weights (overrides default)
   * @param weights - Custom scoring weights
   */
  setCustomWeights(weights: ScoringWeights): void {
    // Validate weights sum to 1.0 (100%)
    const sum = weights.keyword + weights.metadata + weights.competitor;
    if (Math.abs(sum - 1.0) > 0.01) {
      console.warn('[SCORING-ENGINE] Custom weights do not sum to 1.0:', weights, 'Sum:', sum);
    }
    this.customWeights = weights;
  }

  /**
   * Clear custom weights (revert to defaults)
   */
  clearCustomWeights(): void {
    this.customWeights = null;
  }

  /**
   * Get current active weights
   * @param mode - Audit mode
   * @returns Active scoring weights
   */
  getActiveWeights(mode: 'full' | 'metadata-only' = 'full'): ScoringWeights {
    if (this.customWeights) {
      return this.customWeights;
    }
    return mode === 'full' ? DEFAULT_FULL_MODE_WEIGHTS : DEFAULT_METADATA_ONLY_WEIGHTS;
  }

  /**
   * Calculate keyword score from keyword data and analytics
   *
   * Phase 3 Algorithm:
   * - Uses visibility_score from analytics if available (preferred)
   * - Enhanced fallback with opportunity weighting:
   *   - Base rank score (weighted by position)
   *   - Opportunity multiplier (high=1.5x, medium=1.2x, low=1.0x)
   *   - Top 10 keywords get bonus points
   *   - Normalized to 0-100 scale
   *
   * @param keywordData - Array of keyword ranking data
   * @param analyticsData - Enhanced analytics with visibility score
   * @returns Keyword score (0-100)
   */
  calculateKeywordScore(
    keywordData: Array<{ keyword: string; rank: number; opportunity?: string }>,
    analyticsData?: { visibility_score?: number }
  ): number {
    if (!AUDIT_KEYWORDS_ENABLED) {
      return 0;
    }

    // Use analytics visibility score if available (preferred)
    if (analyticsData?.visibility_score) {
      return analyticsData.visibility_score;
    }

    // Enhanced fallback: Calculate from keyword ranks with opportunity weighting
    if (keywordData.length === 0) {
      return 0;
    }

    // Opportunity multipliers
    const opportunityMultiplier = (opportunity: string | undefined): number => {
      const opp = (opportunity || '').toLowerCase();
      if (opp === 'high') return 1.5;
      if (opp === 'medium') return 1.2;
      return 1.0; // low or no opportunity
    };

    // Calculate weighted score for each keyword
    let totalWeightedScore = 0;
    let top10Count = 0;

    keywordData.forEach(k => {
      // Base score by rank tier
      let baseScore = 0;
      if (k.rank <= 3) {
        baseScore = 100; // Top 3: Excellent visibility
      } else if (k.rank <= 10) {
        baseScore = 80; // Top 10: Very good visibility
        top10Count++;
      } else if (k.rank <= 20) {
        baseScore = 60; // Top 20: Good visibility
      } else if (k.rank <= 50) {
        baseScore = 35; // Top 50: Moderate visibility
      } else if (k.rank <= 100) {
        baseScore = 15; // Top 100: Low visibility
      } else {
        baseScore = 5; // Below 100: Minimal visibility
      }

      // Apply opportunity multiplier
      const multiplier = opportunityMultiplier(k.opportunity);
      const weightedScore = baseScore * multiplier;

      totalWeightedScore += weightedScore;
    });

    // Calculate average weighted score
    let avgScore = totalWeightedScore / keywordData.length;

    // Bonus for having multiple top 10 keywords (up to +10 points)
    if (top10Count > 0) {
      const top10Bonus = Math.min(top10Count * 2, 10);
      avgScore += top10Bonus;
    }

    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, Math.round(avgScore)));
  }

  /**
   * Calculate competitor score
   *
   * Phase 3 Algorithm:
   * - Competitive positioning analysis
   * - Market presence score (number of competitors vs benchmark)
   * - Competitive strength assessment
   *
   * Scoring:
   * - 0 competitors: 30 (weak market presence/discovery)
   * - 1-3 competitors: 45-55 (emerging market position)
   * - 4-10 competitors: 60-75 (healthy competition)
   * - 11-20 competitors: 75-85 (strong competitive position)
   * - 21+ competitors: 85-95 (dominant market presence)
   *
   * @param competitorData - Array of competitor data
   * @param metadata - App metadata for comparative analysis
   * @returns Competitor score (0-100)
   */
  calculateCompetitorScore(
    competitorData: any[],
    metadata?: ScrapedMetadata
  ): number {
    const competitorCount = competitorData?.length || 0;

    // Base score by competitive landscape
    let baseScore = 0;
    if (competitorCount === 0) {
      baseScore = 30; // Weak market presence
    } else if (competitorCount <= 3) {
      baseScore = 45 + (competitorCount * 3); // 48-54
    } else if (competitorCount <= 10) {
      baseScore = 55 + (competitorCount * 2); // 57-75
    } else if (competitorCount <= 20) {
      baseScore = 75 + Math.min(competitorCount - 10, 10); // 76-85
    } else {
      baseScore = 85 + Math.min((competitorCount - 20) / 2, 10); // 85-95
    }

    // Competitive strength bonus (if metadata available)
    let strengthBonus = 0;
    if (metadata && competitorData.length > 0) {
      const myRating = metadata.rating || 0;
      const myReviews = metadata.reviews || 0;

      // Count how many competitors we outperform
      let outperformCount = 0;
      competitorData.forEach((comp: any) => {
        const compRating = comp.rating || comp.averageRating || 0;
        const compReviews = comp.reviewCount || comp.reviews || 0;

        // Score advantage
        let advantage = 0;
        if (myRating > compRating) advantage++;
        if (myReviews > compReviews) advantage++;

        if (advantage >= 1) outperformCount++;
      });

      // Bonus for outperforming competitors (up to +10 points)
      const outperformRatio = outperformCount / competitorData.length;
      strengthBonus = Math.round(outperformRatio * 10);
    }

    // Calculate final score
    const finalScore = baseScore + strengthBonus;
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  /**
   * Calculate creative score from metadata
   *
   * Phase 3 Algorithm:
   * - Icon presence and quality (30%)
   * - Screenshot portfolio (40%)
   * - Visual completeness (30%)
   *
   * Scoring Components:
   * - Icon: Present (+30), Missing (0)
   * - Screenshots: 0-2 (low), 3-4 (medium), 5+ (excellent)
   * - Completeness: Icon + Screenshots bonus
   *
   * @param metadata - Scraped app metadata
   * @param metadataScore - Calculated metadata score (used for baseline)
   * @returns Creative score (0-100)
   */
  calculateCreativeScore(metadata: ScrapedMetadata, metadataScore: number): number {
    let score = 0;

    // Component 1: Icon Analysis (30 points max)
    if (metadata.icon) {
      score += 30; // Full points for having an icon
    }

    // Component 2: Screenshot Analysis (40 points max)
    const screenshots = metadata.screenshots || [];
    const screenshotCount = screenshots.length;

    if (screenshotCount === 0) {
      score += 0; // No screenshots: 0 points
    } else if (screenshotCount <= 2) {
      score += 15; // Minimal screenshots: 15/40 points
    } else if (screenshotCount <= 4) {
      score += 28; // Adequate screenshots: 28/40 points
    } else {
      score += 40; // Excellent screenshot portfolio: 40/40 points
    }

    // Component 3: Visual Completeness (30 points max)
    // Bonus for having both icon and good screenshot coverage
    const hasIcon = !!metadata.icon;
    const hasGoodScreenshots = screenshotCount >= 3;

    if (hasIcon && hasGoodScreenshots) {
      score += 30; // Complete visual package
    } else if (hasIcon || hasGoodScreenshots) {
      score += 15; // Partial completeness
    }
    // else: 0 points for incomplete

    // Fallback: If no creative assets at all, use metadata score heuristic
    if (!metadata.icon && screenshotCount === 0) {
      // Use 75% of metadata score as baseline for apps without creative data
      return Math.round(metadataScore * 0.75);
    }

    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate overall audit score
   *
   * Applies weighted formula based on audit mode:
   * - Full mode: keyword(40%) + metadata(35%) + competitor(25%)
   * - Metadata-only: metadata(60%) + competitor(40%)
   *
   * @param scores - Individual component scores
   * @param context - Scoring context (mode and weights)
   * @returns Overall score (0-100)
   */
  calculateOverallScore(
    scores: Omit<AuditScores, 'overall'>,
    context?: ScoreCalculationContext
  ): number {
    const mode = context?.mode || (AUDIT_KEYWORDS_ENABLED ? 'full' : 'metadata-only');
    const weights = context?.weights ||
      (mode === 'full' ? DEFAULT_FULL_MODE_WEIGHTS : DEFAULT_METADATA_ONLY_WEIGHTS);

    const overall = Math.round(
      (scores.keyword * weights.keyword) +
      (scores.metadata * weights.metadata) +
      (scores.competitor * weights.competitor)
    );

    return Math.max(0, Math.min(100, overall)); // Clamp to 0-100
  }

  /**
   * Calculate all audit scores at once
   *
   * Convenience method that calculates all scores and returns complete object.
   *
   * @param params - Input data for scoring
   * @returns Complete audit scores
   */
  calculateAllScores(params: {
    metadata: ScrapedMetadata;
    metadataScore: number;
    keywordData?: Array<{ keyword: string; rank: number; opportunity?: string }>;
    analyticsData?: { visibility_score?: number };
    competitorData?: any[];
    context?: ScoreCalculationContext;
  }): AuditScores {
    const keywordScore = this.calculateKeywordScore(
      params.keywordData || [],
      params.analyticsData
    );

    const competitorScore = this.calculateCompetitorScore(
      params.competitorData || [],
      params.metadata // NEW: Phase 3 - Pass metadata for competitive strength analysis
    );

    const creativeScore = this.calculateCreativeScore(
      params.metadata,
      params.metadataScore
    );

    const overallScore = this.calculateOverallScore(
      {
        keyword: keywordScore,
        metadata: params.metadataScore,
        competitor: competitorScore,
        creative: creativeScore,
      },
      params.context
    );

    return {
      overall: overallScore,
      keyword: keywordScore,
      metadata: params.metadataScore,
      competitor: competitorScore,
      creative: creativeScore,
    };
  }
}

// ============================================
// Export Singleton Instance
// ============================================

export const auditScoringEngine = new AuditScoringEngine();
