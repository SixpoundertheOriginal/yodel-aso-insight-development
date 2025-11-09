# Competitor Analysis Implementation Plan - Deep Competitive Intelligence

**Date:** 2025-01-06
**Status:** 📋 DESIGN PHASE - Comprehensive Plan
**Approach:** Option 1 - Full Side-by-Side Comparison + Spying Powers
**Timeline:** 4-5 days

---

## Executive Summary

This plan implements a **professional competitive intelligence system** for reviews, giving users "spying powers" to:

✅ **Compare 2-4 apps side-by-side** (visual comparison grid)
✅ **Identify feature gaps** ("Dark mode mentioned in 3/3 competitors, not in yours")
✅ **Spot opportunities** ("Instagram users complain about ads - you can exploit this")
✅ **Track competitor pain points** ("TikTok has 127 'crash' complaints")
✅ **Highlight your strengths** ("Your customer support rated +0.4 vs competitors")
✅ **Export intelligence reports** (PDF/CSV for stakeholders)
✅ **Monitor competitive trends** (rating changes, issue spikes, feature requests)

---

## System Architecture

### High-Level Flow

```
┌────────────────────────────────────────────────────────────────┐
│                   USER ENTERS COMPARISON MODE                   │
│         (Button: "Compare Competitors" from Reviews page)       │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│              COMPETITOR SELECTION INTERFACE                     │
├────────────────────────────────────────────────────────────────┤
│  1. Primary App: Your app or main focus app                    │
│  2. Select 1-3 Competitors from:                               │
│     • Monitored apps with "competitor" tag                     │
│     • Search for new competitor (quick add)                    │
│  3. Country filter (must match for fair comparison)            │
│  4. Date range selector (Last 30/90/180 days)                  │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│              PARALLEL DATA FETCHING (Fast Loading)              │
├────────────────────────────────────────────────────────────────┤
│  Fetch reviews for all selected apps simultaneously:           │
│  • Primary app reviews (up to 500)                             │
│  • Competitor 1 reviews (up to 500)                            │
│  • Competitor 2 reviews (up to 500)                            │
│  • Competitor 3 reviews (up to 500)                            │
│                                                                  │
│  Progress indicator: "Loading Instagram (78%)..."              │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│           AI ANALYSIS ENGINE (Review Intelligence)              │
├────────────────────────────────────────────────────────────────┤
│  For each app, extract:                                         │
│  • Enhanced sentiment (emotions, aspects, intensity)           │
│  • Themes (e.g., "checkout problems", "crashes")               │
│  • Feature mentions (e.g., "dark mode", "notifications")       │
│  • Issue patterns (e.g., "login failures", "sync errors")      │
│  • Business impact scores                                       │
│  • Trend direction (up/down/stable)                            │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│         COMPETITIVE INTELLIGENCE SERVICE (NEW)                  │
├────────────────────────────────────────────────────────────────┤
│  Cross-app analysis:                                            │
│  1. Feature Gap Analysis                                        │
│     • Find features in competitors but not in primary          │
│     • Rank by frequency and sentiment                          │
│                                                                  │
│  2. Opportunity Mining                                          │
│     • Find competitor pain points (negative themes)            │
│     • Highlight where you're doing better                      │
│                                                                  │
│  3. Threat Detection                                            │
│     • Features competitors have that users love               │
│     • Rating trends (who's improving faster)                   │
│                                                                  │
│  4. Strength Validation                                         │
│     • Your features with better sentiment                      │
│     • Themes you handle better                                 │
│                                                                  │
│  5. Benchmarking Metrics                                        │
│     • Average ratings comparison                               │
│     • Sentiment scores (positive %)                            │
│     • Issue frequency (bugs, crashes)                          │
│     • Response quality (if applicable)                         │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│            COMPARISON DASHBOARD (Premium UI)                    │
├────────────────────────────────────────────────────────────────┤
│  1. Competitive Intelligence Panel (Top - Most Important)      │
│  2. Side-by-Side App Cards (2-4 columns)                       │
│  3. Detailed Comparison Sections (Tabs/Accordion)              │
│  4. Export & Actions Bar                                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (No Changes Needed!)

We reuse existing `monitored_apps` table:

```sql
-- Already exists, no migration needed
SELECT * FROM monitored_apps
WHERE organization_id = 'xxx'
  AND 'competitor' = ANY(tags)
  AND primary_country = 'us';
```

**Optional Enhancement:** Add comparison cache table (Phase 2)

```sql
CREATE TABLE IF NOT EXISTS competitor_comparison_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  primary_app_id TEXT NOT NULL,
  competitor_app_ids TEXT[] NOT NULL,
  country TEXT NOT NULL,
  date_range TEXT NOT NULL, -- '30d', '90d', '180d'

  -- Cached intelligence
  feature_gaps JSONB,
  opportunities JSONB,
  strengths JSONB,
  threats JSONB,
  benchmark_metrics JSONB,

  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',

  UNIQUE(organization_id, primary_app_id, competitor_app_ids, country, date_range)
);

CREATE INDEX idx_comparison_cache_org ON competitor_comparison_cache(organization_id);
CREATE INDEX idx_comparison_cache_expiry ON competitor_comparison_cache(expires_at);
```

---

## Implementation Phases

### Phase 1: Core Services & Data Layer (Day 1)

#### File 1: `src/services/competitor-review-intelligence.service.ts` (NEW)

**Purpose:** Core comparison logic and competitive intelligence extraction

```typescript
import { EnhancedReviewItem, ReviewIntelligence } from '@/types/review-intelligence.types';

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
  competitorSentiment: number; // Average sentiment in competitors
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
  sentiment: number; // How much users love it
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

class CompetitorReviewIntelligenceService {

  /**
   * Main analysis function - generates full competitive intelligence
   */
  async analyzeCompetitors(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): Promise<CompetitiveIntelligence> {

    // 1. Feature Gap Analysis
    const featureGaps = this.findFeatureGaps(primaryApp, competitors);

    // 2. Opportunity Mining
    const opportunities = this.identifyOpportunities(competitors);

    // 3. Strength Identification
    const strengths = this.identifyStrengths(primaryApp, competitors);

    // 4. Threat Detection
    const threats = this.identifyThreats(primaryApp, competitors);

    // 5. Benchmark Metrics
    const metrics = this.calculateBenchmarks(primaryApp, competitors);

    // 6. Executive Summary
    const summary = this.generateSummary(primaryApp, competitors, {
      featureGaps,
      opportunities,
      strengths,
      threats,
      metrics
    });

    return {
      primaryApp,
      competitors,
      featureGaps,
      opportunities,
      strengths,
      threats,
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
        competitors: [null],
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

  // Helper methods

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
      return `You're leading but ${intelligence.featureGaps[0].feature} is a gap mentioned in ${intelligence.featureGaps[0].mentionedInCompetitors.length} competitors`;
    }

    if (position === 'lagging' && intelligence.opportunities.length > 0) {
      return `Focus on addressing ${intelligence.opportunities[0].description.toLowerCase()} to catch up`;
    }

    if (intelligence.strengths.length > 0) {
      return `Your ${intelligence.strengths[0].aspect} is ${(intelligence.strengths[0].difference * 100).toFixed(0)}% better than competitors - leverage this`;
    }

    return `Competitive position is ${position} with ${intelligence.featureGaps.length} feature gaps identified`;
  }

  private identifyTopPriority(intelligence: any): string {
    // Priority 1: High-demand feature gaps
    const criticalGap = intelligence.featureGaps.find((g: FeatureGap) => g.userDemand === 'high');
    if (criticalGap) {
      return `Add ${criticalGap.feature} - mentioned in ${criticalGap.mentionedInCompetitors.length} competitors`;
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
}

export const competitorReviewIntelligenceService = new CompetitorReviewIntelligenceService();
```

---

### Phase 2: React Hooks Layer (Day 2)

#### File 2: `src/hooks/useCompetitorComparison.ts` (NEW)

**Purpose:** React hook for fetching and managing comparison data

```typescript
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchAppReviews } from '@/utils/itunesReviews';
import { extractReviewIntelligence, analyzeEnhancedSentiment } from '@/engines/review-intelligence.engine';
import { competitorReviewIntelligenceService, type CompetitorApp, type CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';
import { EnhancedReviewItem } from '@/types/review-intelligence.types';
import { toast } from 'sonner';

interface ComparisonConfig {
  primaryAppId: string;
  primaryAppName: string;
  primaryAppIcon: string;
  primaryAppRating: number;
  primaryAppReviewCount: number;

  competitorAppIds: string[];
  competitorAppNames: string[];
  competitorAppIcons: string[];
  competitorAppRatings: number[];
  competitorAppReviewCounts: number[];

  country: string;
  maxReviewsPerApp?: number; // Default: 500
}

export const useCompetitorComparison = (config: ComparisonConfig | null) => {
  const [progress, setProgress] = useState<Record<string, number>>({});

  return useQuery({
    queryKey: ['competitor-comparison', config],
    queryFn: async (): Promise<CompetitiveIntelligence> => {
      if (!config) {
        throw new Error('Configuration required');
      }

      const maxReviews = config.maxReviewsPerApp || 500;

      // Step 1: Fetch reviews for all apps in parallel
      console.log('🔍 [Comparison] Fetching reviews for all apps...');

      const allApps = [
        { id: config.primaryAppId, name: config.primaryAppName },
        ...config.competitorAppIds.map((id, idx) => ({
          id,
          name: config.competitorAppNames[idx]
        }))
      ];

      const fetchPromises = allApps.map(async (app, index) => {
        try {
          setProgress(prev => ({ ...prev, [app.id]: 0 }));

          const result = await fetchAppReviews({
            appId: app.id,
            cc: config.country,
            page: 1,
            // Fetch multiple pages if needed
          });

          let reviews = result.data || [];
          let currentPage = result.currentPage;
          let hasMore = result.hasMore;

          // Fetch more pages if needed
          while (hasMore && reviews.length < maxReviews) {
            setProgress(prev => ({
              ...prev,
              [app.id]: Math.round((reviews.length / maxReviews) * 100)
            }));

            const nextResult = await fetchAppReviews({
              appId: app.id,
              cc: config.country,
              page: currentPage + 1
            });

            reviews = [...reviews, ...(nextResult.data || [])];
            currentPage = nextResult.currentPage;
            hasMore = nextResult.hasMore;
          }

          setProgress(prev => ({ ...prev, [app.id]: 100 }));
          console.log(`✅ [Comparison] Fetched ${reviews.length} reviews for ${app.name}`);

          return reviews.slice(0, maxReviews);
        } catch (error) {
          console.error(`❌ [Comparison] Failed to fetch ${app.name}:`, error);
          toast.error(`Failed to fetch reviews for ${app.name}`);
          return [];
        }
      });

      const allReviews = await Promise.all(fetchPromises);

      // Step 2: Run AI analysis on each app's reviews
      console.log('🤖 [Comparison] Running AI analysis...');

      const analyzeReviews = (reviews: any[]): EnhancedReviewItem[] => {
        return reviews.map(review => {
          const sentiment = analyzeEnhancedSentiment(review.text || '', review.rating);
          return {
            ...review,
            sentiment: sentiment.overall,
            enhancedSentiment: sentiment,
            extractedThemes: [], // Will be filled by intelligence extraction
            mentionedFeatures: [],
            identifiedIssues: [],
            businessImpact: 'low'
          } as EnhancedReviewItem;
        });
      };

      const primaryAppReviews = analyzeReviews(allReviews[0]);
      const competitorReviews = allReviews.slice(1).map(reviews => analyzeReviews(reviews));

      // Extract intelligence for each app
      const primaryIntelligence = extractReviewIntelligence(primaryAppReviews);
      const competitorIntelligences = competitorReviews.map(reviews =>
        extractReviewIntelligence(reviews)
      );

      // Step 3: Build CompetitorApp objects
      const primaryApp: CompetitorApp = {
        appId: config.primaryAppId,
        appName: config.primaryAppName,
        appIcon: config.primaryAppIcon,
        rating: config.primaryAppRating,
        reviewCount: config.primaryAppReviewCount,
        reviews: primaryAppReviews,
        intelligence: primaryIntelligence
      };

      const competitors: CompetitorApp[] = config.competitorAppIds.map((id, idx) => ({
        appId: id,
        appName: config.competitorAppNames[idx],
        appIcon: config.competitorAppIcons[idx],
        rating: config.competitorAppRatings[idx],
        reviewCount: config.competitorAppReviewCounts[idx],
        reviews: competitorReviews[idx],
        intelligence: competitorIntelligences[idx]
      }));

      // Step 4: Generate competitive intelligence
      console.log('🎯 [Comparison] Generating competitive intelligence...');
      const intelligence = await competitorReviewIntelligenceService.analyzeCompetitors(
        primaryApp,
        competitors
      );

      console.log('✅ [Comparison] Analysis complete!', {
        featureGaps: intelligence.featureGaps.length,
        opportunities: intelligence.opportunities.length,
        strengths: intelligence.strengths.length,
        threats: intelligence.threats.length
      });

      return intelligence;
    },
    enabled: !!config,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });
};

// Helper hook for quick competitor selection from monitored apps
export const useCompetitorSelection = (organizationId: string, country: string) => {
  const { data: monitoredApps } = useMonitoredApps(organizationId);

  const competitors = useMemo(() => {
    return monitoredApps?.filter(app =>
      app.tags?.includes('competitor') &&
      app.primary_country === country
    ) || [];
  }, [monitoredApps, country]);

  return { competitors };
};
```

---

### Phase 3: UI Components (Days 3-4)

---

### Phase 3: UI Components (Days 3-4)

#### Component Architecture

```
CompetitorComparisonView (Main Container)
├── CompetitorSelectionDialog (Select apps to compare)
├── ComparisonLoadingState (Progress indicators)
├── CompetitiveIntelligencePanel (Top insights - Most important!)
│   ├── FeatureGapsSection
│   ├── OpportunitiesSection
│   ├── StrengthsSection
│   └── ThreatsSection
├── ComparisonGrid (Side-by-side cards)
│   ├── AppComparisonCard (repeated 2-4x)
│   │   ├── AppHeader (icon, name, rating)
│   │   ├── TopThemesSection
│   │   ├── FeatureMentionsSection
│   │   └── PainPointsSection
│   └── BenchmarkMetricsBar
└── ExportActionsBar (Bottom sticky bar)
```

#### File 3: `src/components/reviews/CompetitorComparisonView.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Download, TrendingUp, TrendingDown,
  Minus, Target, Shield, AlertTriangle, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompetitorComparison } from '@/hooks/useCompetitorComparison';
import { CompetitorSelectionDialog } from './CompetitorSelectionDialog';
import { CompetitiveIntelligencePanel } from './CompetitiveIntelligencePanel';
import type { CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';

interface CompetitorComparisonViewProps {
  organizationId: string;
  onExit: () => void;
}

export const CompetitorComparisonView: React.FC<CompetitorComparisonViewProps> = ({
  organizationId,
  onExit
}) => {
  const [comparisonConfig, setComparisonConfig] = useState<any>(null);
  const [showSelection, setShowSelection] = useState(true);

  const { data: intelligence, isLoading, error } = useCompetitorComparison(comparisonConfig);

  if (showSelection) {
    return (
      <CompetitorSelectionDialog
        organizationId={organizationId}
        onCancel={onExit}
        onConfirm={(config) => {
          setComparisonConfig(config);
          setShowSelection(false);
        }}
      />
    );
  }

  if (isLoading) {
    return <ComparisonLoadingState config={comparisonConfig} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load comparison: {error.message}
        </AlertDescription>
        <Button onClick={onExit} className="mt-4">Back to Reviews</Button>
      </Alert>
    );
  }

  if (!intelligence) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reviews
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Competitive Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Comparing {intelligence.primaryApp.appName} with {intelligence.competitors.length} competitor{intelligence.competitors.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={
            intelligence.summary.overallPosition === 'leading' ? 'default' :
            intelligence.summary.overallPosition === 'lagging' ? 'destructive' : 'secondary'
          }>
            {intelligence.summary.overallPosition.toUpperCase()}
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-primary/20">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Key Insight
          </h3>
          <p className="text-base">{intelligence.summary.keyInsight}</p>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Top Priority:</span>
              <span className="text-muted-foreground">{intelligence.summary.topPriority}</span>
            </div>
            <div className="flex items-center gap-2 text-sm ml-auto">
              <span className="text-muted-foreground">Confidence:</span>
              <Progress value={intelligence.summary.confidenceScore * 100} className="w-24" />
              <span className="font-medium">{Math.round(intelligence.summary.confidenceScore * 100)}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Competitive Intelligence Panel - THE SPYING POWERS */}
      <CompetitiveIntelligencePanel intelligence={intelligence} />

      {/* Benchmark Metrics Bar */}
      <BenchmarkMetricsBar metrics={intelligence.metrics} />

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Primary App */}
        <AppComparisonCard
          app={intelligence.primaryApp}
          isPrimary={true}
        />

        {/* Competitors */}
        {intelligence.competitors.map(competitor => (
          <AppComparisonCard
            key={competitor.appId}
            app={competitor}
            isPrimary={false}
          />
        ))}
      </div>
    </div>
  );
};

// Sub-components below...
```

#### File 4: `src/components/reviews/CompetitiveIntelligencePanel.tsx` (NEW)

**This is the CROWN JEWEL - the "spying powers" UI**

```typescript
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target, AlertTriangle, Shield, TrendingUp,
  ChevronDown, ChevronRight, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';

interface CompetitiveIntelligencePanelProps {
  intelligence: CompetitiveIntelligence;
}

export const CompetitiveIntelligencePanel: React.FC<CompetitiveIntelligencePanelProps> = ({
  intelligence
}) => {
  const [activeTab, setActiveTab] = useState('gaps');

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-10 blur-3xl bg-gradient-to-br from-orange-500 to-red-600" />

      <div className="relative p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold uppercase tracking-wide">
              Competitive Intelligence
            </h3>
            <p className="text-xs text-muted-foreground/80">
              Actionable insights from competitor review analysis
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Gaps ({intelligence.featureGaps.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Opportunities ({intelligence.opportunities.length})
            </TabsTrigger>
            <TabsTrigger value="strengths" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Strengths ({intelligence.strengths.length})
            </TabsTrigger>
            <TabsTrigger value="threats" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Threats ({intelligence.threats.length})
            </TabsTrigger>
          </TabsList>

          {/* Feature Gaps Tab */}
          <TabsContent value="gaps" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Features your competitors have that you don't - ranked by user demand
            </div>

            {intelligence.featureGaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                🎉 No feature gaps found - you're feature-complete!
              </div>
            ) : (
              intelligence.featureGaps.map((gap, idx) => (
                <FeatureGapCard key={idx} gap={gap} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Competitor weaknesses you can exploit in marketing and positioning
            </div>

            {intelligence.opportunities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No major opportunities identified
              </div>
            ) : (
              intelligence.opportunities.map((opp, idx) => (
                <OpportunityCard key={idx} opportunity={opp} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          {/* Strengths Tab */}
          <TabsContent value="strengths" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Areas where you outperform competitors - leverage these in messaging
            </div>

            {intelligence.strengths.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clear strengths identified yet - need more data
              </div>
            ) : (
              intelligence.strengths.map((strength, idx) => (
                <StrengthCard key={idx} strength={strength} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Popular competitor features you're missing - consider adding
            </div>

            {intelligence.threats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ✅ No immediate threats detected
              </div>
            ) : (
              intelligence.threats.map((threat, idx) => (
                <ThreatCard key={idx} threat={threat} rank={idx + 1} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

// Individual card components for each insight type

const FeatureGapCard: React.FC<{ gap: any; rank: number }> = ({ gap, rank }) => {
  const [expanded, setExpanded] = useState(false);

  const demandColor = {
    high: 'text-red-500 bg-red-500/10 border-red-500/50',
    medium: 'text-orange-500 bg-orange-500/10 border-orange-500/50',
    low: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50'
  };

  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{gap.feature}</h4>
            <Badge className={cn("text-xs", demandColor[gap.userDemand])}>
              {gap.userDemand.toUpperCase()} DEMAND
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mentioned in {gap.mentionedInCompetitors.length} competitor{gap.mentionedInCompetitors.length > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{gap.frequency} total mentions</span>
            <span>•</span>
            <span>Sentiment: {(gap.competitorSentiment * 100).toFixed(0)}%</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {gap.mentionedInCompetitors.map((comp: string) => (
              <Badge key={comp} variant="secondary" className="text-xs">
                {comp}
              </Badge>
            ))}
          </div>

          {expanded && gap.examples.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Example Reviews:
              </div>
              {gap.examples.map((example: string, idx: number) => (
                <div key={idx} className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                  "{example}"
                </div>
              ))}
            </div>
          )}
        </div>

        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </Card>
  );
};

const OpportunityCard: React.FC<{ opportunity: any; rank: number }> = ({ opportunity, rank }) => {
  const exploitColor = {
    high: 'text-green-600 bg-green-500/10 border-green-500/50',
    medium: 'text-blue-600 bg-blue-500/10 border-blue-500/50',
    low: 'text-gray-600 bg-gray-500/10 border-gray-500/50'
  };

  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{opportunity.description}</h4>
            <Badge className={cn("text-xs", exploitColor[opportunity.exploitability])}>
              {opportunity.exploitability.toUpperCase()}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{opportunity.competitor}</span> has {opportunity.frequency} complaints
            {opportunity.sentiment < -0.5 && ' (very negative)'}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
            <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
              💡 Recommendation:
            </div>
            <div className="text-sm">{opportunity.recommendation}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const StrengthCard: React.FC<{ strength: any; rank: number }> = ({ strength, rank }) => {
  return (
    <Card className="p-4 bg-green-500/5 border-green-500/20 hover:bg-green-500/10 transition-colors">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold bg-green-500/10">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base capitalize">{strength.aspect}</h4>
            <Badge className="text-xs bg-green-600 text-white">
              +{(strength.difference * 100).toFixed(0)}% BETTER
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Your Score:</span>
              <span className="font-medium ml-2">{(strength.yourSentiment * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Competitors Avg:</span>
              <span className="font-medium ml-2">{(strength.competitorAvgSentiment * 100).toFixed(0)}%</span>
            </div>
            <Badge variant="outline" className="text-xs ml-auto">
              {strength.confidence.toUpperCase()} CONFIDENCE
            </Badge>
          </div>

          {strength.evidence.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Evidence from your reviews:
              </div>
              {strength.evidence.map((evidence: string, idx: number) => (
                <div key={idx} className="text-sm italic text-muted-foreground border-l-2 border-green-500/50 pl-3">
                  "{evidence}"
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const ThreatCard: React.FC<{ threat: any; rank: number }> = ({ threat, rank }) => {
  return (
    <Card className="p-4 bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 transition-colors">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold bg-orange-500/10">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{threat.feature}</h4>
            <Badge className="text-xs bg-orange-600 text-white">
              {(threat.userDemand * 100).toFixed(0)}% DEMAND
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{threat.competitor}</span> users love this feature
            <span className="mx-2">•</span>
            <span>Sentiment: {(threat.sentiment * 100).toFixed(0)}%</span>
            <span className="mx-2">•</span>
            <span className="capitalize">{threat.momentum}</span>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-2">
            <div className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
              ⚠️ Recommendation:
            </div>
            <div className="text-sm">{threat.recommendation}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
```

---

### Phase 4: Integration & Entry Points (Day 4)

#### Changes to `src/pages/growth-accelerators/reviews.tsx`

```typescript
// Add import
import { CompetitorComparisonView } from '@/components/reviews/CompetitorComparisonView';

// Add state
const [comparisonMode, setComparisonMode] = useState(false);

// Add button in header (after Monitor App button area)
{!selectedApp && monitoredApps && monitoredApps.some(app => app.tags?.includes('competitor')) && (
  <Button
    variant="outline"
    onClick={() => setComparisonMode(true)}
    className="gap-2"
  >
    <Target className="h-4 w-4" />
    Compare Competitors
    <Badge variant="secondary" className="ml-1">
      {monitoredApps.filter(app => app.tags?.includes('competitor')).length}
    </Badge>
  </Button>
)}

// Conditional rendering
{comparisonMode ? (
  <CompetitorComparisonView
    organizationId={organizationId!}
    onExit={() => setComparisonMode(false)}
  />
) : (
  // ... existing reviews page content
)}
```

---

### Phase 5: Export & Reporting (Day 5)

#### File 5: `src/services/competitor-comparison-export.service.ts` (NEW)

```typescript
import { jsPDF } from 'jspdf';
import type { CompetitiveIntelligence } from './competitor-review-intelligence.service';

class CompetitorComparisonExportService {
  /**
   * Export as PDF report (Executive summary + detailed findings)
   */
  exportAsPDF(intelligence: CompetitiveIntelligence): void {
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Competitive Intelligence Report', 20, yPos);
    yPos += 10;

    // Subtitle
    doc.setFontSize(12);
    doc.text(\`\${intelligence.primaryApp.appName} vs \${intelligence.competitors.length} Competitors\`, 20, yPos);
    yPos += 15;

    // Executive Summary
    doc.setFontSize(14);
    doc.text('Executive Summary', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text(\`Overall Position: \${intelligence.summary.overallPosition.toUpperCase()}\`, 20, yPos);
    yPos += 6;

    // Wrap text for key insight
    const keyInsightLines = doc.splitTextToSize(intelligence.summary.keyInsight, 170);
    doc.text(keyInsightLines, 20, yPos);
    yPos += keyInsightLines.length * 6 + 10;

    // Feature Gaps
    if (intelligence.featureGaps.length > 0) {
      doc.setFontSize(14);
      doc.text(\`Feature Gaps (\${intelligence.featureGaps.length})\`, 20, yPos);
      yPos += 8;

      doc.setFontSize(9);
      intelligence.featureGaps.slice(0, 5).forEach((gap, idx) => {
        doc.text(\`\${idx + 1}. \${gap.feature} - \${gap.userDemand} demand\`, 25, yPos);
        yPos += 5;
        doc.text(\`   Mentioned in: \${gap.mentionedInCompetitors.join(', ')}\`, 25, yPos);
        yPos += 7;

        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    // Save
    doc.save(\`competitor-analysis-\${Date.now()}.pdf\`);
  }

  /**
   * Export as CSV (for spreadsheet analysis)
   */
  exportAsCSV(intelligence: CompetitiveIntelligence): void {
    const rows = [
      ['Type', 'Item', 'Details', 'Priority/Score', 'Recommendation']
    ];

    // Feature Gaps
    intelligence.featureGaps.forEach(gap => {
      rows.push([
        'Feature Gap',
        gap.feature,
        \`Mentioned in \${gap.mentionedInCompetitors.join(', ')}\`,
        gap.userDemand,
        \`Add \${gap.feature}\`
      ]);
    });

    // Opportunities
    intelligence.opportunities.forEach(opp => {
      rows.push([
        'Opportunity',
        opp.description,
        \`\${opp.competitor} - \${opp.frequency} complaints\`,
        opp.exploitability,
        opp.recommendation
      ]);
    });

    const csvContent = rows.map(row => row.map(cell => \`"\${cell}"\`).join(',')).join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`competitor-analysis-\${Date.now()}.csv\`;
    link.click();
  }
}

export const competitorComparisonExportService = new CompetitorComparisonExportService();
```

---

### Phase 6: Testing Plan

#### Unit Tests
- `competitor-review-intelligence.service.test.ts`
- Test feature gap detection
- Test opportunity mining
- Test strength identification
- Test benchmark calculations

#### Integration Tests
- End-to-end comparison flow
- Multi-app review fetching
- AI analysis pipeline
- Export functionality

#### User Acceptance Tests
- Select 2-4 competitors
- View intelligence panel
- Verify insights are actionable
- Export report
- Validate data accuracy

---

## Summary: What Gets Built

### New Files (7 files)
1. ✅ `src/services/competitor-review-intelligence.service.ts` (Core logic - 600 lines)
2. ✅ `src/hooks/useCompetitorComparison.ts` (React hook - 150 lines)
3. ✅ `src/components/reviews/CompetitorComparisonView.tsx` (Main UI - 300 lines)
4. ✅ `src/components/reviews/CompetitiveIntelligencePanel.tsx` (Spying powers UI - 400 lines)
5. ✅ `src/components/reviews/CompetitorSelectionDialog.tsx` (Selection UI - 200 lines)
6. ✅ `src/services/competitor-comparison-export.service.ts` (Export - 100 lines)
7. ✅ `src/components/reviews/AppComparisonCard.tsx` (Side-by-side cards - 150 lines)

### Modified Files (1 file)
1. ✅ `src/pages/growth-accelerators/reviews.tsx` (Add comparison mode - ~50 lines added)

### Total Code: ~2,000 lines

---

## Timeline Breakdown

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| 1 | Core Service | competitor-review-intelligence.service.ts | 6-8h |
| 2 | Hooks | useCompetitorComparison.ts + testing | 4-6h |
| 3 | Main UI | CompetitorComparisonView + IntelligencePanel | 6-8h |
| 4 | Cards & Integration | AppComparisonCard + Reviews page integration | 4-6h |
| 5 | Export & Polish | Export service + bug fixes + testing | 4-6h |

**Total:** 24-34 hours (3-5 days)

---

## Key Features Delivered

### 🎯 Spying Powers

1. **Feature Gap Analysis**
   - "Dark mode mentioned in 3/3 competitors, not in yours"
   - Ranked by user demand (high/medium/low)
   - Sample reviews as evidence

2. **Opportunity Mining**
   - "Instagram users complain about ads (127 reviews, sentiment: -0.7)"
   - Exploitability scoring (high/medium/low)
   - Actionable recommendations

3. **Strength Validation**
   - "Your customer support is +32% better than competitors"
   - Confidence levels (high/medium/low)
   - Evidence from your reviews

4. **Threat Detection**
   - "TikTok's 'For You Page' has 85% user demand - you're missing this"
   - Momentum tracking (rising/stable/declining)
   - Priority recommendations

### 📊 Benchmarking

1. **Rating Comparison**
   - Your rating vs competitor average
   - Position: leading/competitive/lagging

2. **Sentiment Analysis**
   - Positive review percentage comparison
   - Position relative to competitors

3. **Issue Frequency**
   - Bugs/crashes per 100 reviews
   - Quality indicator

### 📈 Executive Summary

1. **Overall Position**: Leading/Competitive/Lagging
2. **Key Insight**: AI-generated one-liner
3. **Top Priority**: Most actionable item
4. **Confidence Score**: Data quality indicator

### 📤 Export

1. **PDF Report**: Executive summary + detailed findings
2. **CSV Export**: For spreadsheet analysis
3. **Shareable**: For stakeholders

---

## Success Metrics

### User Adoption
- **Target:** 40%+ of users who monitor competitors use comparison
- **Measure:** Comparison sessions per week

### Time Saved
- **Before:** 2-3 hours manual competitor analysis
- **After:** 10 minutes automated analysis
- **Savings:** ~2.5 hours per comparison

### Actionability
- **Target:** 80%+ of comparisons lead to action (add feature, adjust messaging, etc.)
- **Measure:** User surveys + feature request tracking

### Data Quality
- **Target:** 90%+ confidence scores
- **Measure:** Average confidence across comparisons

---

## Next Steps After Approval

1. ✅ **Get sign-off** on this plan
2. ✅ **Clarify priorities** (which spying powers are most important?)
3. ✅ **Confirm UI mockups** (match your brand/style?)
4. ✅ **Start Day 1** - Build core service
5. ✅ **Daily check-ins** to validate direction

---

**Ready to execute when you give the green light!** 🚀
