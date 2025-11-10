/**
 * COMPETITOR REVIEW INTELLIGENCE SERVICE
 *
 * Core service for competitive analysis of app reviews
 * Provides "spying powers" to identify feature gaps, opportunities, strengths, and threats
 */

import { EnhancedReviewItem, ReviewIntelligence } from '@/types/review-intelligence.types';
import { semanticInsightService, type StoredInsight } from './semantic-insight.service';
import { FEATURE_FLAGS } from '@/config/feature-flags';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CompetitorApp {
  appId: string;
  appName: string;
  appIcon: string;
  rating: number;
  reviewCount: number;
  reviews: EnhancedReviewItem[];
  intelligence: ReviewIntelligence;
}

export interface FeatureGap {
  feature: string;
  mentionedInCompetitors: string[]; // Array of competitor names
  competitorSentiment: number; // Average sentiment in competitors (-1 to 1)
  frequency: number; // How often mentioned
  userDemand: 'high' | 'medium' | 'low';
  examples: string[]; // Sample review excerpts
}

export interface CompetitiveOpportunity {
  type: 'pain_point' | 'missing_feature' | 'poor_sentiment';
  description: string; // "Instagram users complain about ads"
  competitor: string; // Which competitor has this issue
  frequency: number;
  sentiment: number; // How negative (-1 to 0)
  exploitability: 'high' | 'medium' | 'low'; // How easy to exploit
  recommendation: string; // What to do
  affectedReviews: number;
}

export interface CompetitiveStrength {
  aspect: string; // "customer support", "performance", "ui/ux"
  yourSentiment: number;
  competitorAvgSentiment: number;
  difference: number; // Positive = you're better
  confidence: 'high' | 'medium' | 'low';
  evidence: string[]; // Supporting review excerpts
}

export interface CompetitiveThreat {
  feature: string; // "Stories feature"
  competitor: string; // "Instagram"
  sentiment: number; // How much users love it (0-1)
  momentum: 'rising' | 'stable' | 'declining';
  userDemand: number; // 0-1 score
  recommendation: string; // "Consider adding similar feature"
}

export interface BenchmarkMetrics {
  avgRating: {
    yours: number;
    competitors: number[];
    average: number;
    yourPosition: 'leading' | 'competitive' | 'lagging';
  };

  positiveSentiment: {
    yours: number; // % positive
    competitors: number[];
    average: number;
    yourPosition: 'leading' | 'competitive' | 'lagging';
  };

  issueFrequency: {
    yours: number; // Issues per 100 reviews
    competitors: number[];
    average: number;
    yourPosition: 'leading' | 'competitive' | 'lagging'; // Lower is better
  };

  responseQuality: {
    yours: number | null;
    competitors: (number | null)[];
    average: number;
    yourPosition: 'leading' | 'competitive' | 'lagging';
  };
}

export interface CompetitiveIntelligence {
  primaryApp: CompetitorApp;
  competitors: CompetitorApp[];

  // Spying Powers
  featureGaps: FeatureGap[];
  opportunities: CompetitiveOpportunity[];
  strengths: CompetitiveStrength[];
  threats: CompetitiveThreat[];

  // Semantic Insights (NEW - Phase 3)
  semanticInsights?: {
    asoOpportunities: StoredInsight[];      // ASO keyword opportunities
    productFeatures: StoredInsight[];       // Product feature requests
    trending: StoredInsight[];              // Trending insights (rising topics)
    semanticGaps: FeatureGap[];             // Semantic-powered feature gaps
  };

  // Benchmarking
  metrics: BenchmarkMetrics;

  // Summary
  summary: {
    overallPosition: 'leading' | 'competitive' | 'lagging';
    keyInsight: string; // AI-generated one-liner
    topPriority: string; // Most actionable item
    confidenceScore: number; // 0-1
  };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class CompetitorReviewIntelligenceService {

  /**
   * Main analysis function - generates full competitive intelligence
   */
  async analyzeCompetitors(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[],
    organizationId?: string,
    country?: string
  ): Promise<CompetitiveIntelligence> {

    console.log('🎯 [Intelligence] Starting competitive analysis...', {
      primaryApp: primaryApp.appName,
      competitors: competitors.map(c => c.appName),
      totalReviews: primaryApp.reviews.length + competitors.reduce((sum, c) => sum + c.reviews.length, 0),
      semanticEnabled: FEATURE_FLAGS.USE_SEMANTIC_INSIGHTS
    });

    // NEW: Generate semantic insights in parallel with legacy analysis
    let semanticInsights: CompetitiveIntelligence['semanticInsights'] | undefined;

    if (FEATURE_FLAGS.USE_SEMANTIC_INSIGHTS && organizationId && country) {
      console.log('🧠 [Intelligence] Generating semantic insights...');

      try {
        // Generate insights for all apps in parallel
        await Promise.all([
          // Primary app
          semanticInsightService.generateInsights(
            organizationId,
            primaryApp.appId,
            primaryApp.appName,
            country,
            primaryApp.reviews
          ),
          // All competitors
          ...competitors.map(comp =>
            semanticInsightService.generateInsights(
              organizationId,
              comp.appId,
              comp.appName,
              country,
              comp.reviews
            )
          )
        ]);

        console.log('✅ [Intelligence] Semantic insights generated');

        // Query semantic insights
        const [asoOpportunities, productFeatures, trending, semanticGaps] = await Promise.all([
          this.getSemanticASOOpportunities(organizationId, primaryApp, competitors, country),
          this.getSemanticProductFeatures(organizationId, primaryApp, competitors, country),
          this.getSemanticTrending(organizationId, primaryApp, competitors, country),
          this.findSemanticFeatureGaps(organizationId, primaryApp, competitors, country)
        ]);

        semanticInsights = {
          asoOpportunities,
          productFeatures,
          trending,
          semanticGaps
        };

        console.log(`✅ [Intelligence] Semantic analysis complete`, {
          asoCount: asoOpportunities.length,
          productCount: productFeatures.length,
          trendingCount: trending.length,
          semanticGaps: semanticGaps.length
        });
      } catch (error) {
        console.error('❌ [Intelligence] Semantic insights failed:', error);
        // Continue with legacy analysis
      }
    }

    // 1. Feature Gap Analysis (Legacy)
    const featureGaps = this.findFeatureGaps(primaryApp, competitors);
    console.log(`✅ [Intelligence] Found ${featureGaps.length} legacy feature gaps`);

    // 2. Opportunity Mining
    const opportunities = this.identifyOpportunities(competitors);
    console.log(`✅ [Intelligence] Found ${opportunities.length} opportunities`);

    // 3. Strength Identification
    const strengths = this.identifyStrengths(primaryApp, competitors);
    console.log(`✅ [Intelligence] Found ${strengths.length} strengths`);

    // 4. Threat Detection
    const threats = this.identifyThreats(primaryApp, competitors);
    console.log(`✅ [Intelligence] Found ${threats.length} threats`);

    // 5. Benchmark Metrics
    const metrics = this.calculateBenchmarks(primaryApp, competitors);
    console.log(`✅ [Intelligence] Calculated benchmarks`);

    // 6. Executive Summary
    const summary = this.generateSummary(primaryApp, competitors, {
      featureGaps,
      opportunities,
      strengths,
      threats,
      metrics
    });
    console.log(`✅ [Intelligence] Generated summary: ${summary.keyInsight}`);

    return {
      primaryApp,
      competitors,
      featureGaps,
      opportunities,
      strengths,
      threats,
      semanticInsights, // NEW: Include semantic insights
      metrics,
      summary
    };
  }

  /**
   * Find features in competitors but not in primary app
   */
  private findFeatureGaps(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): FeatureGap[] {
    const gaps: FeatureGap[] = [];

    // Get all features mentioned in competitors
    const competitorFeatures = new Map<string, {
      competitors: string[];
      sentiments: number[];
      count: number;
      examples: string[];
    }>();

    competitors.forEach(comp => {
      comp.intelligence.featureMentions.forEach(feature => {
        if (!competitorFeatures.has(feature.feature)) {
          competitorFeatures.set(feature.feature, {
            competitors: [],
            sentiments: [],
            count: 0,
            examples: []
          });
        }

        const data = competitorFeatures.get(feature.feature)!;
        data.competitors.push(comp.appName);
        data.sentiments.push(feature.sentiment);
        data.count += feature.mentions;

        // Find example review
        const exampleReview = comp.reviews.find(r =>
          r.mentionedFeatures?.includes(feature.feature)
        );
        if (exampleReview && data.examples.length < 2) {
          data.examples.push(exampleReview.text.substring(0, 100) + '...');
        }
      });
    });

    // Check which features are NOT in primary app
    const primaryFeatures = new Set(
      primaryApp.intelligence.featureMentions.map(f => f.feature)
    );

    competitorFeatures.forEach((data, feature) => {
      if (!primaryFeatures.has(feature)) {
        const avgSentiment = data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length;

        gaps.push({
          feature,
          mentionedInCompetitors: data.competitors,
          competitorSentiment: avgSentiment,
          frequency: data.count,
          userDemand: this.calculateUserDemand(data.count, data.competitors.length),
          examples: data.examples
        });
      }
    });

    // Sort by user demand and frequency
    return gaps.sort((a, b) => {
      const demandScore = { high: 3, medium: 2, low: 1 };
      return (demandScore[b.userDemand] * b.frequency) - (demandScore[a.userDemand] * a.frequency);
    }).slice(0, 10); // Top 10 gaps
  }

  /**
   * Identify opportunities to exploit competitor weaknesses
   */
  private identifyOpportunities(
    competitors: CompetitorApp[]
  ): CompetitiveOpportunity[] {
    const opportunities: CompetitiveOpportunity[] = [];

    competitors.forEach(comp => {
      // Find negative themes (pain points)
      comp.intelligence.themes
        .filter(theme => theme.sentiment < 0 && theme.frequency > 5)
        .forEach(theme => {
          opportunities.push({
            type: 'pain_point',
            description: `${comp.appName} users complain about ${theme.theme}`,
            competitor: comp.appName,
            frequency: theme.frequency,
            sentiment: theme.sentiment,
            exploitability: this.calculateExploitability(theme.frequency, theme.sentiment),
            recommendation: `Highlight your strength in ${theme.theme} in marketing`,
            affectedReviews: theme.frequency
          });
        });

      // Find critical issues
      comp.intelligence.issuePatterns
        .filter(issue => issue.severity === 'critical' || issue.frequency > 10)
        .forEach(issue => {
          opportunities.push({
            type: 'pain_point',
            description: `${comp.appName} has ${issue.frequency} complaints about ${issue.issue}`,
            competitor: comp.appName,
            frequency: issue.frequency,
            sentiment: -0.8, // Critical issues are very negative
            exploitability: 'high',
            recommendation: `Emphasize reliability and stability in messaging`,
            affectedReviews: issue.frequency
          });
        });
    });

    // Sort by exploitability and frequency
    return opportunities
      .sort((a, b) => {
        const exploitScore = { high: 3, medium: 2, low: 1 };
        return (exploitScore[b.exploitability] * b.frequency) - (exploitScore[a.exploitability] * a.frequency);
      })
      .slice(0, 8); // Top 8 opportunities
  }

  /**
   * Identify your competitive strengths
   */
  private identifyStrengths(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): CompetitiveStrength[] {
    const strengths: CompetitiveStrength[] = [];
    const aspects = ['ui_ux', 'performance', 'features', 'pricing', 'support'];

    aspects.forEach(aspect => {
      // Calculate your sentiment for this aspect
      const yourReviews = primaryApp.reviews.filter(r =>
        r.enhancedSentiment?.aspects[aspect as keyof typeof r.enhancedSentiment.aspects]
      );

      if (yourReviews.length === 0) return;

      const yourSentiment = this.calculateAspectSentiment(yourReviews, aspect);

      // Calculate competitor average
      const competitorSentiments: number[] = [];
      competitors.forEach(comp => {
        const compReviews = comp.reviews.filter(r =>
          r.enhancedSentiment?.aspects[aspect as keyof typeof r.enhancedSentiment.aspects]
        );
        if (compReviews.length > 0) {
          competitorSentiments.push(this.calculateAspectSentiment(compReviews, aspect));
        }
      });

      if (competitorSentiments.length === 0) return;

      const avgCompetitorSentiment = competitorSentiments.reduce((a, b) => a + b, 0) / competitorSentiments.length;
      const difference = yourSentiment - avgCompetitorSentiment;

      // Only add if you're significantly better (>0.15 difference)
      if (difference > 0.15) {
        strengths.push({
          aspect: aspect.replace('_', '/'),
          yourSentiment,
          competitorAvgSentiment: avgCompetitorSentiment,
          difference,
          confidence: this.calculateConfidence(yourReviews.length, competitorSentiments.length),
          evidence: this.extractEvidenceReviews(yourReviews, aspect)
        });
      }
    });

    return strengths.sort((a, b) => b.difference - a.difference);
  }

  /**
   * Identify threats from competitors
   */
  private identifyThreats(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): CompetitiveThreat[] {
    const threats: CompetitiveThreat[] = [];
    const primaryFeatures = new Set(primaryApp.intelligence.featureMentions.map(f => f.feature));

    competitors.forEach(comp => {
      comp.intelligence.featureMentions
        .filter(feature =>
          feature.sentiment > 0.5 && // Users love it
          feature.mentions > 10 && // Frequently mentioned
          !primaryFeatures.has(feature.feature) // You don't have it
        )
        .forEach(feature => {
          threats.push({
            feature: feature.feature,
            competitor: comp.appName,
            sentiment: feature.sentiment,
            momentum: 'rising', // TODO: Calculate from trends
            userDemand: Math.min(feature.mentions / 50, 1),
            recommendation: `Consider adding ${feature.feature} - ${comp.appName} users love it`
          });
        });
    });

    return threats
      .sort((a, b) => (b.sentiment * b.userDemand) - (a.sentiment * a.userDemand))
      .slice(0, 5);
  }

  /**
   * Calculate benchmark metrics
   */
  private calculateBenchmarks(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): BenchmarkMetrics {
    const competitorRatings = competitors.map(c => c.rating);
    const avgCompetitorRating = competitorRatings.reduce((a, b) => a + b, 0) / competitorRatings.length;

    // Positive sentiment %
    const yourPositive = this.calculatePositivePercent(primaryApp.reviews);
    const competitorPositives = competitors.map(c => this.calculatePositivePercent(c.reviews));
    const avgPositive = competitorPositives.reduce((a, b) => a + b, 0) / competitorPositives.length;

    // Issue frequency (per 100 reviews)
    const yourIssues = (primaryApp.intelligence.issuePatterns.reduce((sum, i) => sum + i.frequency, 0) / primaryApp.reviews.length) * 100;
    const competitorIssues = competitors.map(c =>
      (c.intelligence.issuePatterns.reduce((sum, i) => sum + i.frequency, 0) / c.reviews.length) * 100
    );
    const avgIssues = competitorIssues.reduce((a, b) => a + b, 0) / competitorIssues.length;

    return {
      avgRating: {
        yours: primaryApp.rating,
        competitors: competitorRatings,
        average: avgCompetitorRating,
        yourPosition: this.calculatePosition(primaryApp.rating, avgCompetitorRating, 'higher')
      },
      positiveSentiment: {
        yours: yourPositive,
        competitors: competitorPositives,
        average: avgPositive,
        yourPosition: this.calculatePosition(yourPositive, avgPositive, 'higher')
      },
      issueFrequency: {
        yours: yourIssues,
        competitors: competitorIssues,
        average: avgIssues,
        yourPosition: this.calculatePosition(yourIssues, avgIssues, 'lower') // Lower is better for issues
      },
      responseQuality: {
        yours: null, // TODO: Implement if developer responses available
        competitors: competitors.map(() => null),
        average: 0,
        yourPosition: 'competitive'
      }
    };
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[],
    intelligence: {
      featureGaps: FeatureGap[];
      opportunities: CompetitiveOpportunity[];
      strengths: CompetitiveStrength[];
      threats: CompetitiveThreat[];
      metrics: BenchmarkMetrics;
    }
  ): CompetitiveIntelligence['summary'] {

    // Calculate overall position
    const positions = [
      intelligence.metrics.avgRating.yourPosition,
      intelligence.metrics.positiveSentiment.yourPosition,
      intelligence.metrics.issueFrequency.yourPosition
    ];

    const leadingCount = positions.filter(p => p === 'leading').length;
    const laggingCount = positions.filter(p => p === 'lagging').length;

    const overallPosition: 'leading' | 'competitive' | 'lagging' =
      leadingCount >= 2 ? 'leading' :
      laggingCount >= 2 ? 'lagging' : 'competitive';

    // Generate key insight
    const keyInsight = this.generateKeyInsight(intelligence, overallPosition);

    // Identify top priority
    const topPriority = this.identifyTopPriority(intelligence);

    // Calculate confidence
    const totalReviews = primaryApp.reviews.length + competitors.reduce((sum, c) => sum + c.reviews.length, 0);
    const confidenceScore = Math.min(totalReviews / 1000, 1);

    return {
      overallPosition,
      keyInsight,
      topPriority,
      confidenceScore
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateUserDemand(frequency: number, competitorCount: number): 'high' | 'medium' | 'low' {
    const avgPerCompetitor = frequency / competitorCount;
    if (avgPerCompetitor > 20 && competitorCount >= 2) return 'high';
    if (avgPerCompetitor > 10 || competitorCount >= 2) return 'medium';
    return 'low';
  }

  private calculateExploitability(frequency: number, sentiment: number): 'high' | 'medium' | 'low' {
    const score = frequency * Math.abs(sentiment);
    if (score > 10) return 'high';
    if (score > 5) return 'medium';
    return 'low';
  }

  private calculateAspectSentiment(reviews: EnhancedReviewItem[], aspect: string): number {
    const sentiments = reviews
      .map(r => {
        const aspectValue = r.enhancedSentiment?.aspects[aspect as keyof typeof r.enhancedSentiment.aspects];
        if (aspectValue === 'positive') return 1;
        if (aspectValue === 'negative') return -1;
        if (aspectValue === 'neutral') return 0;
        return null;
      })
      .filter((s): s is number => s !== null);

    return sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;
  }

  private calculateConfidence(yourSampleSize: number, competitorSampleSize: number): 'high' | 'medium' | 'low' {
    const totalSample = yourSampleSize + competitorSampleSize;
    if (totalSample > 200) return 'high';
    if (totalSample > 100) return 'medium';
    return 'low';
  }

  private extractEvidenceReviews(reviews: EnhancedReviewItem[], aspect: string): string[] {
    return reviews
      .filter(r => r.enhancedSentiment?.aspects[aspect as keyof typeof r.enhancedSentiment.aspects] === 'positive')
      .slice(0, 2)
      .map(r => r.text.substring(0, 100) + '...');
  }

  private calculatePositivePercent(reviews: EnhancedReviewItem[]): number {
    if (reviews.length === 0) return 0;
    const positive = reviews.filter(r => r.sentiment === 'positive').length;
    return (positive / reviews.length) * 100;
  }

  private calculatePosition(yours: number, average: number, direction: 'higher' | 'lower'): 'leading' | 'competitive' | 'lagging' {
    const threshold = average * 0.1; // 10% threshold

    if (direction === 'higher') {
      if (yours > average + threshold) return 'leading';
      if (yours < average - threshold) return 'lagging';
    } else {
      if (yours < average - threshold) return 'leading';
      if (yours > average + threshold) return 'lagging';
    }

    return 'competitive';
  }

  private generateKeyInsight(
    intelligence: any,
    position: 'leading' | 'competitive' | 'lagging'
  ): string {
    if (position === 'leading' && intelligence.featureGaps.length > 0) {
      return `You're leading but ${intelligence.featureGaps[0].feature} is a gap mentioned in ${intelligence.featureGaps[0].mentionedInCompetitors.length} competitor${intelligence.featureGaps[0].mentionedInCompetitors.length > 1 ? 's' : ''}`;
    }

    if (position === 'lagging' && intelligence.opportunities.length > 0) {
      return `Focus on addressing ${intelligence.opportunities[0].description.toLowerCase()} to catch up`;
    }

    if (intelligence.strengths.length > 0) {
      return `Your ${intelligence.strengths[0].aspect} is ${(intelligence.strengths[0].difference * 100).toFixed(0)}% better than competitors - leverage this`;
    }

    return `Competitive position is ${position} with ${intelligence.featureGaps.length} feature gap${intelligence.featureGaps.length !== 1 ? 's' : ''} identified`;
  }

  private identifyTopPriority(intelligence: any): string {
    // Priority 1: High-demand feature gaps
    const criticalGap = intelligence.featureGaps.find((g: FeatureGap) => g.userDemand === 'high');
    if (criticalGap) {
      return `Add ${criticalGap.feature} - mentioned in ${criticalGap.mentionedInCompetitors.length} competitor${criticalGap.mentionedInCompetitors.length > 1 ? 's' : ''}`;
    }

    // Priority 2: Highly exploitable opportunities
    const criticalOpportunity = intelligence.opportunities.find((o: CompetitiveOpportunity) => o.exploitability === 'high');
    if (criticalOpportunity) {
      return criticalOpportunity.recommendation;
    }

    // Priority 3: Serious threats
    if (intelligence.threats.length > 0) {
      return intelligence.threats[0].recommendation;
    }

    return 'Continue monitoring competitive landscape';
  }

  // ============================================================================
  // PHASE 2 METHODS - Snapshot and Matrix Generation
  // ============================================================================

  /**
   * Calculate review velocity (reviews per time period)
   */
  calculateReviewVelocity(
    reviews: EnhancedReviewItem[],
    days: 7 | 30
  ): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentReviews = reviews.filter(r => {
      if (!r.updated_at) return false;
      const reviewDate = new Date(r.updated_at);
      return reviewDate >= cutoffDate;
    });

    return recentReviews.length;
  }

  /**
   * Calculate sentiment percentages from reviews
   */
  calculateSentimentPercentages(reviews: EnhancedReviewItem[]): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    if (reviews.length === 0) return { positive: 0, neutral: 0, negative: 0 };

    const counts = reviews.reduce((acc, r) => {
      acc[r.sentiment]++;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 } as Record<string, number>);

    return {
      positive: (counts.positive / reviews.length) * 100,
      neutral: (counts.neutral / reviews.length) * 100,
      negative: (counts.negative / reviews.length) * 100,
    };
  }

  /**
   * Generate feature sentiment matrix for heatmap
   */
  generateFeatureSentimentMatrix(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): {
    features: string[];
    apps: Array<{ appId: string; appName: string; isPrimary: boolean }>;
    matrix: Array<{
      featureName: string;
      appId: string;
      sentiment: number | null;
      mentions: number;
      isMissing: boolean;
    }>;
  } {
    // Get all unique features across all apps
    const allFeatures = new Set<string>();
    const allApps = [primaryApp, ...competitors];

    allApps.forEach(app => {
      app.intelligence.featureMentions.forEach(f => allFeatures.add(f.feature));
    });

    const features = Array.from(allFeatures).sort();
    const apps = allApps.map((app, idx) => ({
      appId: app.appId,
      appName: app.appName,
      isPrimary: idx === 0
    }));

    // Build matrix
    const matrix: Array<{
      featureName: string;
      appId: string;
      sentiment: number | null;
      mentions: number;
      isMissing: boolean;
    }> = [];

    features.forEach(featureName => {
      allApps.forEach(app => {
        const featureData = app.intelligence.featureMentions.find(f => f.feature === featureName);

        matrix.push({
          featureName,
          appId: app.appId,
          sentiment: featureData ? featureData.sentiment : null,
          mentions: featureData ? featureData.mentions : 0,
          isMissing: !featureData
        });
      });
    });

    return { features, apps, matrix };
  }

  /**
   * Calculate demand score for a feature (0-100)
   */
  calculateDemandScore(
    mentionCount: number,
    competitorCount: number,
    avgSentiment: number
  ): number {
    // Normalize components
    const mentionScore = Math.min(mentionCount / 50, 1); // Cap at 50 mentions = max score
    const adoptionScore = Math.min(competitorCount / 5, 1); // Cap at 5 competitors
    const sentimentScore = (avgSentiment + 1) / 2; // Convert -1:1 to 0:1

    // Weighted average
    return (
      mentionScore * 0.4 +
      adoptionScore * 0.3 +
      sentimentScore * 0.3
    ) * 100;
  }

  // ============================================================================
  // SEMANTIC INSIGHTS METHODS (Phase 3)
  // ============================================================================

  /**
   * Get ASO keyword opportunities from all apps
   */
  private async getSemanticASOOpportunities(
    organizationId: string,
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[],
    country: string
  ): Promise<StoredInsight[]> {
    const allApps = [primaryApp, ...competitors];
    const allInsights: StoredInsight[] = [];

    // Get ASO opportunities from all apps
    for (const app of allApps) {
      const insights = await semanticInsightService.getASOOpportunities(
        organizationId,
        app.appId,
        country,
        50 // minImpactScore
      );
      allInsights.push(...insights);
    }

    // Deduplicate by topic_id and sort by impact
    const uniqueInsights = new Map<string, StoredInsight>();
    allInsights.forEach(insight => {
      const existing = uniqueInsights.get(insight.topic_id);
      if (!existing || insight.impact_score > existing.impact_score) {
        uniqueInsights.set(insight.topic_id, insight);
      }
    });

    return Array.from(uniqueInsights.values())
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 10); // Top 10
  }

  /**
   * Get product feature requests from all apps
   */
  private async getSemanticProductFeatures(
    organizationId: string,
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[],
    country: string
  ): Promise<StoredInsight[]> {
    const allApps = [primaryApp, ...competitors];
    const allInsights: StoredInsight[] = [];

    // Get product features from all apps
    for (const app of allApps) {
      const insights = await semanticInsightService.getProductFeatureRequests(
        organizationId,
        app.appId,
        country,
        40 // minImpactScore
      );
      allInsights.push(...insights);
    }

    // Deduplicate by topic_id and sort by impact
    const uniqueInsights = new Map<string, StoredInsight>();
    allInsights.forEach(insight => {
      const existing = uniqueInsights.get(insight.topic_id);
      if (!existing || insight.impact_score > existing.impact_score) {
        uniqueInsights.set(insight.topic_id, insight);
      }
    });

    return Array.from(uniqueInsights.values())
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 10); // Top 10
  }

  /**
   * Get trending insights from all apps
   */
  private async getSemanticTrending(
    organizationId: string,
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[],
    country: string
  ): Promise<StoredInsight[]> {
    const allApps = [primaryApp, ...competitors];
    const allInsights: StoredInsight[] = [];

    // Get trending insights from all apps
    for (const app of allApps) {
      const insights = await semanticInsightService.getTrendingInsights(
        organizationId,
        app.appId,
        country
      );
      allInsights.push(...insights);
    }

    // Deduplicate by topic_id and sort by MoM % change
    const uniqueInsights = new Map<string, StoredInsight>();
    allInsights.forEach(insight => {
      const existing = uniqueInsights.get(insight.topic_id);
      if (!existing || (insight.trend_mom_pct || 0) > (existing.trend_mom_pct || 0)) {
        uniqueInsights.set(insight.topic_id, insight);
      }
    });

    return Array.from(uniqueInsights.values())
      .filter(i => i.trend_direction === 'rising')
      .sort((a, b) => (b.trend_mom_pct || 0) - (a.trend_mom_pct || 0))
      .slice(0, 10); // Top 10
  }

  /**
   * Find semantic feature gaps (topics in competitors but not in primary app)
   */
  private async findSemanticFeatureGaps(
    organizationId: string,
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[],
    country: string
  ): Promise<FeatureGap[]> {
    // Get insights from primary app
    const primaryInsights = await semanticInsightService.queryInsights(
      organizationId,
      primaryApp.appId,
      country,
      { minImpactScore: 30, limit: 100 }
    );

    // Get insights from competitors
    const competitorInsightsPromises = competitors.map(comp =>
      semanticInsightService.queryInsights(
        organizationId,
        comp.appId,
        country,
        { minImpactScore: 30, limit: 100 }
      )
    );

    const competitorInsights = await Promise.all(competitorInsightsPromises);

    // Find topics in competitors but NOT in primary app
    const primaryTopics = new Set(primaryInsights.map(i => i.topic_id));
    const gaps: FeatureGap[] = [];

    competitorInsights.forEach((compInsights, idx) => {
      const competitor = competitors[idx];

      compInsights.forEach(insight => {
        if (!primaryTopics.has(insight.topic_id)) {
          // Check if gap already exists
          const existingGap = gaps.find(g => g.feature === insight.context_phrase);

          if (existingGap) {
            // Add competitor to existing gap
            existingGap.mentionedInCompetitors.push(competitor.appName);
            existingGap.frequency += insight.mention_count;
          } else {
            // Create new gap
            gaps.push({
              feature: insight.context_phrase, // Rich context instead of "dark mode"
              mentionedInCompetitors: [competitor.appName],
              competitorSentiment: insight.sentiment_score,
              frequency: insight.mention_count,
              userDemand: insight.demand_level === 'critical' || insight.demand_level === 'high'
                ? 'high'
                : insight.demand_level === 'medium'
                ? 'medium'
                : 'low',
              examples: [] // Could fetch from insight_examples if needed
            });
          }
        }
      });
    });

    // Sort by demand level and frequency
    const demandScore = { high: 3, medium: 2, low: 1 };
    return gaps
      .sort((a, b) => {
        const scoreA = demandScore[a.userDemand] * a.frequency;
        const scoreB = demandScore[b.userDemand] * b.frequency;
        return scoreB - scoreA;
      })
      .slice(0, 10); // Top 10 gaps
  }
}

export const competitorReviewIntelligenceService = new CompetitorReviewIntelligenceService();
