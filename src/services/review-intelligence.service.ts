/**
 * REVIEW INTELLIGENCE SERVICE
 *
 * Service layer for generating and managing review intelligence snapshots.
 * Handles caching, regeneration, and retrieval of AI-powered insights.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  extractReviewIntelligence,
  generateActionableInsights,
  analyzeEnhancedSentiment
} from '@/engines/review-intelligence.engine';
import type {
  EnhancedReviewItem,
  ReviewIntelligence,
  ActionableInsights,
  ReviewAnalytics
} from '@/types/review-intelligence.types';

export interface IntelligenceDashboard {
  intelligence: ReviewIntelligence;
  insights: ActionableInsights;
  analytics: ReviewAnalytics;
  metadata: {
    snapshotDate: string;
    reviewsAnalyzed: number;
    lastUpdated: string;
    isCached: boolean;
  };
}

export interface IntelligenceSnapshot {
  id: string;
  monitored_app_id: string;
  organization_id: string;
  snapshot_date: string;
  reviews_analyzed: number;
  intelligence: ReviewIntelligence;
  actionable_insights: ActionableInsights;
  total_reviews: number;
  average_rating?: number;
  sentiment_distribution?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  intelligence_version: string;
  created_at: string;
}

class ReviewIntelligenceService {
  /**
   * Get intelligence dashboard for a monitored app
   * Uses cached snapshot if available (today's snapshot), otherwise generates fresh
   */
  async getIntelligenceForApp(
    monitoredAppId: string,
    organizationId: string,
    forceRefresh: boolean = false
  ): Promise<IntelligenceDashboard> {
    console.log('[ReviewIntelligence] Fetching intelligence for app:', monitoredAppId);

    // 1. Check for today's snapshot (unless forcing refresh)
    if (!forceRefresh) {
      const cachedSnapshot = await this.getTodaySnapshot(monitoredAppId);

      if (cachedSnapshot) {
        console.log('[ReviewIntelligence] Using cached snapshot from', cachedSnapshot.created_at);

        return {
          intelligence: cachedSnapshot.intelligence,
          insights: cachedSnapshot.actionable_insights,
          analytics: this.extractAnalyticsFromSnapshot(cachedSnapshot),
          metadata: {
            snapshotDate: cachedSnapshot.snapshot_date,
            reviewsAnalyzed: cachedSnapshot.reviews_analyzed,
            lastUpdated: cachedSnapshot.created_at,
            isCached: true
          }
        };
      }
    }

    // 2. No cached snapshot or forced refresh - generate fresh intelligence
    console.log('[ReviewIntelligence] Generating fresh intelligence...');
    return await this.generateFreshIntelligence(monitoredAppId, organizationId);
  }

  /**
   * Get today's cached snapshot if it exists
   */
  private async getTodaySnapshot(monitoredAppId: string): Promise<IntelligenceSnapshot | null> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('review_intelligence_snapshots')
        .select('*')
        .eq('monitored_app_id', monitoredAppId)
        .eq('snapshot_date', today)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No snapshot found - this is fine
          return null;
        }
        console.error('[ReviewIntelligence] Error fetching snapshot:', error);
        return null;
      }

      return data as IntelligenceSnapshot;
    } catch (error) {
      console.error('[ReviewIntelligence] Error in getTodaySnapshot:', error);
      return null;
    }
  }

  /**
   * Generate fresh intelligence from cached reviews
   */
  private async generateFreshIntelligence(
    monitoredAppId: string,
    organizationId: string
  ): Promise<IntelligenceDashboard> {
    // 1. Fetch cached reviews
    const reviews = await this.getCachedReviews(monitoredAppId);

    if (reviews.length === 0) {
      throw new Error('No cached reviews found. Please fetch reviews first.');
    }

    console.log('[ReviewIntelligence] Processing', reviews.length, 'reviews');

    // 2. Convert to EnhancedReviewItem format and ensure sentiment analysis
    const enhancedReviews: EnhancedReviewItem[] = reviews.map(review => ({
      review_id: review.review_id,
      title: review.title || '',
      text: review.text,
      rating: review.rating,
      version: review.version,
      author: review.author,
      updated_at: review.review_date,
      country: review.country,
      app_id: review.app_store_id,
      sentiment: review.enhanced_sentiment?.overall ||
                (review.rating >= 4 ? 'positive' : review.rating <= 2 ? 'negative' : 'neutral') as 'positive' | 'neutral' | 'negative',
      enhancedSentiment: review.enhanced_sentiment ||
                        analyzeEnhancedSentiment(review.text, review.rating),
      extractedThemes: review.extracted_themes || [],
      mentionedFeatures: review.mentioned_features || [],
      identifiedIssues: review.identified_issues || []
    }));

    // 3. Extract intelligence using existing engine
    const intelligence = extractReviewIntelligence(enhancedReviews);
    console.log('[ReviewIntelligence] Extracted themes:', intelligence.themes.length);

    // 4. Generate actionable insights
    const insights = generateActionableInsights(enhancedReviews, intelligence);
    console.log('[ReviewIntelligence] Generated insights:', {
      priorityIssues: insights.priorityIssues.length,
      improvements: insights.improvements.length,
      alerts: insights.alerts.length
    });

    // 5. Calculate analytics
    const analytics = this.calculateAnalytics(enhancedReviews);

    // 6. Save snapshot for future use
    await this.saveSnapshot(
      monitoredAppId,
      organizationId,
      intelligence,
      insights,
      analytics,
      reviews.length
    );

    return {
      intelligence,
      insights,
      analytics,
      metadata: {
        snapshotDate: new Date().toISOString().split('T')[0],
        reviewsAnalyzed: reviews.length,
        lastUpdated: new Date().toISOString(),
        isCached: false
      }
    };
  }

  /**
   * Fetch cached reviews for a monitored app
   */
  private async getCachedReviews(monitoredAppId: string) {
    const { data, error } = await supabase
      .from('monitored_app_reviews')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .order('review_date', { ascending: false })
      .limit(500); // Analyze up to 500 most recent reviews

    if (error) {
      console.error('[ReviewIntelligence] Error fetching cached reviews:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Save intelligence snapshot to database
   */
  private async saveSnapshot(
    monitoredAppId: string,
    organizationId: string,
    intelligence: ReviewIntelligence,
    insights: ActionableInsights,
    analytics: ReviewAnalytics,
    totalReviews: number
  ) {
    const today = new Date().toISOString().split('T')[0];

    // Calculate sentiment distribution
    const sentimentDist = {
      positive: analytics.positiveReviews,
      neutral: analytics.neutralReviews,
      negative: analytics.negativeReviews
    };

    const snapshot = {
      monitored_app_id: monitoredAppId,
      organization_id: organizationId,
      snapshot_date: today,
      reviews_analyzed: totalReviews,
      intelligence: intelligence as any,
      actionable_insights: insights as any,
      total_reviews: totalReviews,
      average_rating: analytics.averageRating,
      sentiment_distribution: sentimentDist,
      intelligence_version: '1.0'
    };

    // Use upsert to handle case where snapshot already exists for today
    const { error } = await supabase
      .from('review_intelligence_snapshots')
      .upsert(snapshot, {
        onConflict: 'monitored_app_id,snapshot_date'
      });

    if (error) {
      console.error('[ReviewIntelligence] Error saving snapshot:', error);
      // Don't throw - we still have the intelligence data to return
    } else {
      console.log('[ReviewIntelligence] Snapshot saved for', today);
    }
  }

  /**
   * Calculate review analytics
   */
  private calculateAnalytics(reviews: EnhancedReviewItem[]): ReviewAnalytics {
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
        positiveReviews: 0,
        neutralReviews: 0,
        negativeReviews: 0,
        positivePercentage: 0,
        trendingThemes: [],
        emotionalProfile: {
          joy: 0,
          frustration: 0,
          excitement: 0,
          disappointment: 0,
          anger: 0
        }
      };
    }

    // Rating distribution
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      ratingDist[r.rating as keyof typeof ratingDist]++;
    });

    // Average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / totalReviews;

    // Sentiment counts
    const positiveCount = reviews.filter(r => r.sentiment === 'positive').length;
    const neutralCount = reviews.filter(r => r.sentiment === 'neutral').length;
    const negativeCount = reviews.filter(r => r.sentiment === 'negative').length;

    // Emotional profile (aggregate)
    const emotionTotals = {
      joy: 0,
      frustration: 0,
      excitement: 0,
      disappointment: 0,
      anger: 0
    };

    reviews.forEach(r => {
      if (r.enhancedSentiment?.emotions) {
        emotionTotals.joy += r.enhancedSentiment.emotions.joy || 0;
        emotionTotals.frustration += r.enhancedSentiment.emotions.frustration || 0;
        emotionTotals.excitement += r.enhancedSentiment.emotions.excitement || 0;
        emotionTotals.disappointment += r.enhancedSentiment.emotions.disappointment || 0;
        emotionTotals.anger += r.enhancedSentiment.emotions.anger || 0;
      }
    });

    // Normalize emotions
    Object.keys(emotionTotals).forEach(key => {
      emotionTotals[key as keyof typeof emotionTotals] /= totalReviews;
    });

    return {
      totalReviews,
      averageRating: Number(avgRating.toFixed(2)),
      ratingDistribution: ratingDist,
      sentimentBreakdown: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount
      },
      positiveReviews: positiveCount,
      neutralReviews: neutralCount,
      negativeReviews: negativeCount,
      positivePercentage: Math.round((positiveCount / totalReviews) * 100),
      trendingThemes: [], // Would require historical data
      emotionalProfile: emotionTotals
    };
  }

  /**
   * Extract analytics from cached snapshot
   */
  private extractAnalyticsFromSnapshot(snapshot: IntelligenceSnapshot): ReviewAnalytics {
    const dist = snapshot.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 };
    const total = dist.positive + dist.neutral + dist.negative;

    return {
      totalReviews: snapshot.total_reviews,
      averageRating: snapshot.average_rating || 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, // Not stored in snapshot
      sentimentBreakdown: dist,
      positiveReviews: dist.positive,
      neutralReviews: dist.neutral,
      negativeReviews: dist.negative,
      positivePercentage: total > 0 ? Math.round((dist.positive / total) * 100) : 0,
      trendingThemes: [],
      emotionalProfile: {
        joy: 0,
        frustration: 0,
        excitement: 0,
        disappointment: 0,
        anger: 0
      }
    };
  }

  /**
   * Force regeneration of intelligence (delete today's snapshot and regenerate)
   */
  async regenerateSnapshot(monitoredAppId: string, organizationId: string): Promise<IntelligenceDashboard> {
    console.log('[ReviewIntelligence] Force regenerating snapshot for', monitoredAppId);

    // Delete today's snapshot if it exists
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('review_intelligence_snapshots')
      .delete()
      .eq('monitored_app_id', monitoredAppId)
      .eq('snapshot_date', today);

    // Generate fresh
    return await this.getIntelligenceForApp(monitoredAppId, organizationId, true);
  }

  /**
   * Get historical snapshots for trend analysis
   */
  async getHistoricalSnapshots(
    monitoredAppId: string,
    days: number = 30
  ): Promise<IntelligenceSnapshot[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('review_intelligence_snapshots')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .gte('snapshot_date', startDateStr)
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('[ReviewIntelligence] Error fetching historical snapshots:', error);
      return [];
    }

    return data as IntelligenceSnapshot[];
  }
}

// Export singleton instance
export const reviewIntelligenceService = new ReviewIntelligenceService();
