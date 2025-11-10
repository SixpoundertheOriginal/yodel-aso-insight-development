/**
 * THEME IMPACT SCORING SERVICE
 *
 * Analyzes review themes and calculates business impact scores
 * Quick Win #1 from Data Availability Audit 2025
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ThemeImpactScore {
  id: string;
  organizationId: string;
  monitoredAppId: string;

  // Theme identification
  theme: string;
  themeCategory: 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other';

  // Time window
  analysisDate: string;
  periodDays: number;

  // Frequency metrics
  mentionCount: number;
  uniqueReviews: number;
  trendDirection: 'rising' | 'stable' | 'declining';
  weekOverWeekChange: number | null;

  // Sentiment metrics
  avgSentiment: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  sentimentIntensity: 'mild' | 'moderate' | 'strong' | 'extreme';

  // Business impact
  impactScore: number;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'high' | 'medium' | 'low';

  // User impact
  affectedUserEstimate: number | null;
  userImpactLevel: 'widespread' | 'common' | 'occasional' | 'rare';

  // Version analysis
  affectedVersions: string[];
  firstSeenDate: string | null;
  lastSeenDate: string | null;

  // Supporting data
  exampleReviews: Array<{
    reviewId: string;
    text: string;
    rating: number;
    date: string;
  }>;
  relatedFeatures: string[];
  relatedIssues: string[];

  // Recommendations
  recommendedAction: string | null;
  estimatedEffort: 'small' | 'medium' | 'large' | 'unknown';
  potentialRatingImpact: number | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ThemeAnalysisInput {
  monitoredAppId: string;
  periodDays?: number; // Default: 30
  includeHistorical?: boolean; // Default: false
}

export interface ThemeAnalysisResult {
  scores: ThemeImpactScore[];
  summary: {
    totalThemes: number;
    criticalThemes: number;
    highImpactThemes: number;
    risingThemes: number;
    averageImpactScore: number;
  };
  topPriorities: ThemeImpactScore[];
  trends: {
    theme: string;
    scoreChange: number;
    direction: 'up' | 'down' | 'stable';
  }[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ThemeImpactScoringService {

  /**
   * Main analysis function - calculate impact scores for all themes
   */
  async analyzeThemes(input: ThemeAnalysisInput): Promise<ThemeAnalysisResult> {
    console.log('🎯 [Theme Scoring] Starting theme impact analysis...', input);

    const { monitoredAppId, periodDays = 30 } = input;

    // 1. Fetch reviews for the period
    const reviews = await this.fetchReviewsForPeriod(monitoredAppId, periodDays);
    console.log(`✅ [Theme Scoring] Fetched ${reviews.length} reviews`);

    if (reviews.length === 0) {
      console.warn('⚠️ [Theme Scoring] No reviews found for analysis');
      return this.emptyResult();
    }

    // 2. Extract and aggregate themes
    const themeData = await this.extractAndAggregateThemes(reviews, periodDays);
    console.log(`✅ [Theme Scoring] Extracted ${themeData.length} unique themes`);

    // 3. Calculate impact scores
    const scores = await this.calculateImpactScores(
      monitoredAppId,
      themeData,
      periodDays
    );
    console.log(`✅ [Theme Scoring] Calculated ${scores.length} impact scores`);

    // 4. Persist to database
    await this.persistScores(scores);
    console.log(`✅ [Theme Scoring] Persisted scores to database`);

    // 5. Generate summary and trends
    const summary = this.generateSummary(scores);
    const trends = await this.calculateTrends(monitoredAppId, scores);
    const topPriorities = this.identifyTopPriorities(scores);

    return {
      scores,
      summary,
      topPriorities,
      trends
    };
  }

  /**
   * Get latest theme scores for an app
   */
  async getLatestScores(
    monitoredAppId: string,
    limit?: number
  ): Promise<ThemeImpactScore[]> {
    const query = supabase
      .from('theme_impact_scores')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .order('analysis_date', { ascending: false })
      .order('impact_score', { ascending: false });

    if (limit) {
      query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [Theme Scoring] Failed to fetch scores:', error);
      throw error;
    }

    return this.mapToScoreObjects(data || []);
  }

  /**
   * Get critical themes requiring immediate attention
   */
  async getCriticalThemes(organizationId: string): Promise<ThemeImpactScore[]> {
    const { data, error } = await supabase
      .from('vw_critical_themes')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('❌ [Theme Scoring] Failed to fetch critical themes:', error);
      throw error;
    }

    return this.mapToScoreObjects(data || []);
  }

  /**
   * Get theme score history for trend visualization
   */
  async getThemeHistory(
    monitoredAppId: string,
    theme: string,
    days: number = 90
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('theme_score_history')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .eq('theme', theme)
      .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('❌ [Theme Scoring] Failed to fetch history:', error);
      throw error;
    }

    return data || [];
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetch reviews for analysis period
   */
  private async fetchReviewsForPeriod(
    monitoredAppId: string,
    periodDays: number
  ): Promise<any[]> {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('monitored_app_reviews')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .gte('review_date', startDate.toISOString())
      .order('review_date', { ascending: false });

    if (error) {
      console.error('❌ [Theme Scoring] Failed to fetch reviews:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Extract and aggregate themes from reviews
   */
  private async extractAndAggregateThemes(
    reviews: any[],
    periodDays: number
  ): Promise<any[]> {
    const themeMap = new Map<string, {
      theme: string;
      mentions: any[];
      sentiments: number[];
      firstSeen: Date;
      lastSeen: Date;
      versions: Set<string>;
      relatedFeatures: Set<string>;
      relatedIssues: Set<string>;
    }>();

    reviews.forEach(review => {
      const themes = review.extracted_themes || [];
      const reviewDate = new Date(review.review_date);
      const sentiment = this.mapSentimentToNumber(review.enhanced_sentiment?.overall);

      themes.forEach((theme: string) => {
        if (!themeMap.has(theme)) {
          themeMap.set(theme, {
            theme,
            mentions: [],
            sentiments: [],
            firstSeen: reviewDate,
            lastSeen: reviewDate,
            versions: new Set(),
            relatedFeatures: new Set(),
            relatedIssues: new Set()
          });
        }

        const data = themeMap.get(theme)!;
        data.mentions.push(review);
        data.sentiments.push(sentiment);
        data.firstSeen = new Date(Math.min(data.firstSeen.getTime(), reviewDate.getTime()));
        data.lastSeen = new Date(Math.max(data.lastSeen.getTime(), reviewDate.getTime()));

        if (review.version) {
          data.versions.add(review.version);
        }

        (review.mentioned_features || []).forEach((f: string) => data.relatedFeatures.add(f));
        (review.identified_issues || []).forEach((i: string) => data.relatedIssues.add(i));
      });
    });

    return Array.from(themeMap.values());
  }

  /**
   * Calculate impact scores for all themes
   */
  private async calculateImpactScores(
    monitoredAppId: string,
    themeData: any[],
    periodDays: number
  ): Promise<ThemeImpactScore[]> {
    const { data: orgData } = await supabase
      .from('monitored_apps')
      .select('organization_id')
      .eq('id', monitoredAppId)
      .single();

    if (!orgData) {
      throw new Error('Monitored app not found');
    }

    const scores: ThemeImpactScore[] = [];

    for (const theme of themeData) {
      const mentionCount = theme.mentions.length;
      const uniqueReviews = new Set(theme.mentions.map((m: any) => m.id)).size;
      const avgSentiment = theme.sentiments.reduce((a: number, b: number) => a + b, 0) / theme.sentiments.length;

      // Calculate sentiment breakdown
      const positiveMentions = theme.sentiments.filter((s: number) => s > 0.2).length;
      const negativeMentions = theme.sentiments.filter((s: number) => s < -0.2).length;
      const neutralMentions = mentionCount - positiveMentions - negativeMentions;

      // Calculate days since first seen
      const daysSinceFirstSeen = Math.floor(
        (Date.now() - theme.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine trend direction
      const trendDirection = this.calculateTrendDirection(theme.mentions, periodDays);

      // Calculate composite impact score using SQL function logic
      const impactScore = this.calculateCompositeScore(
        mentionCount,
        avgSentiment,
        daysSinceFirstSeen,
        trendDirection
      );

      // Determine impact level and urgency
      const impactLevel = this.getImpactLevel(impactScore);
      const urgency = this.getUrgency(impactScore, trendDirection, avgSentiment);

      // Categorize theme
      const themeCategory = this.categorizeTheme(theme.theme, theme.relatedFeatures, theme.relatedIssues);

      // Generate recommendation
      const recommendedAction = this.generateRecommendation(
        theme.theme,
        themeCategory,
        impactLevel,
        avgSentiment
      );

      // Estimate effort
      const estimatedEffort = this.estimateEffort(themeCategory, mentionCount);

      // Estimate rating impact
      const potentialRatingImpact = this.estimateRatingImpact(
        avgSentiment,
        mentionCount,
        uniqueReviews
      );

      scores.push({
        id: '', // Will be generated by DB
        organizationId: orgData.organization_id,
        monitoredAppId,
        theme: theme.theme,
        themeCategory,
        analysisDate: new Date().toISOString().split('T')[0],
        periodDays,
        mentionCount,
        uniqueReviews,
        trendDirection,
        weekOverWeekChange: null, // Calculated in trends
        avgSentiment,
        positiveMentions,
        neutralMentions,
        negativeMentions,
        sentimentIntensity: this.getSentimentIntensity(avgSentiment),
        impactScore,
        impactLevel,
        urgency,
        affectedUserEstimate: this.estimateAffectedUsers(mentionCount, uniqueReviews),
        userImpactLevel: this.getUserImpactLevel(mentionCount),
        affectedVersions: Array.from(theme.versions),
        firstSeenDate: theme.firstSeen.toISOString().split('T')[0],
        lastSeenDate: theme.lastSeen.toISOString().split('T')[0],
        exampleReviews: this.selectExampleReviews(theme.mentions),
        relatedFeatures: Array.from(theme.relatedFeatures),
        relatedIssues: Array.from(theme.relatedIssues),
        recommendedAction,
        estimatedEffort,
        potentialRatingImpact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return scores.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Persist scores to database
   */
  private async persistScores(scores: ThemeImpactScore[]): Promise<void> {
    // Map to database format
    const dbScores = scores.map(score => ({
      organization_id: score.organizationId,
      monitored_app_id: score.monitoredAppId,
      theme: score.theme,
      theme_category: score.themeCategory,
      analysis_date: score.analysisDate,
      period_days: score.periodDays,
      mention_count: score.mentionCount,
      unique_reviews: score.uniqueReviews,
      trend_direction: score.trendDirection,
      week_over_week_change: score.weekOverWeekChange,
      avg_sentiment: score.avgSentiment,
      positive_mentions: score.positiveMentions,
      neutral_mentions: score.neutralMentions,
      negative_mentions: score.negativeMentions,
      sentiment_intensity: score.sentimentIntensity,
      impact_score: score.impactScore,
      impact_level: score.impactLevel,
      urgency: score.urgency,
      affected_user_estimate: score.affectedUserEstimate,
      user_impact_level: score.userImpactLevel,
      affected_versions: score.affectedVersions,
      first_seen_date: score.firstSeenDate,
      last_seen_date: score.lastSeenDate,
      example_reviews: score.exampleReviews,
      related_features: score.relatedFeatures,
      related_issues: score.relatedIssues,
      recommended_action: score.recommendedAction,
      estimated_effort: score.estimatedEffort,
      potential_rating_impact: score.potentialRatingImpact
    }));

    const { error } = await supabase
      .from('theme_impact_scores')
      .upsert(dbScores, {
        onConflict: 'monitored_app_id,theme,analysis_date,period_days',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('❌ [Theme Scoring] Failed to persist scores:', error);
      throw error;
    }
  }

  // ============================================================================
  // SCORING CALCULATIONS
  // ============================================================================

  private calculateCompositeScore(
    mentionCount: number,
    avgSentiment: number,
    daysSinceFirstSeen: number,
    trendDirection: 'rising' | 'stable' | 'declining'
  ): number {
    // Frequency weight (0-100, capped at 50 mentions = 100)
    const frequencyWeight = Math.min((mentionCount / 50) * 100, 100);

    // Sentiment weight (negative sentiment = higher impact)
    let sentimentWeight: number;
    if (avgSentiment < 0) {
      sentimentWeight = Math.abs(avgSentiment) * 100; // Negative = high impact
    } else if (avgSentiment > 0) {
      sentimentWeight = (1 - avgSentiment) * 30; // Positive = low impact
    } else {
      sentimentWeight = 50; // Neutral = medium impact
    }

    // Recency weight
    let recencyWeight: number;
    if (daysSinceFirstSeen <= 7) {
      recencyWeight = 100;
    } else if (daysSinceFirstSeen <= 30) {
      recencyWeight = 70;
    } else if (daysSinceFirstSeen <= 90) {
      recencyWeight = 40;
    } else {
      recencyWeight = 20;
    }

    // Trend weight
    const trendWeight = trendDirection === 'rising' ? 100 : trendDirection === 'stable' ? 50 : 20;

    // Composite score (weighted average)
    const impactScore = (
      frequencyWeight * 0.4 +
      sentimentWeight * 0.3 +
      recencyWeight * 0.2 +
      trendWeight * 0.1
    );

    return Math.round(impactScore * 100) / 100;
  }

  private getImpactLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 85) return 'critical';
    if (score >= 65) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private getUrgency(
    score: number,
    trend: string,
    sentiment: number
  ): 'immediate' | 'high' | 'medium' | 'low' {
    if (score >= 85 && sentiment < -0.5) return 'immediate';
    if (score >= 75 || (trend === 'rising' && score >= 60)) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private getSentimentIntensity(sentiment: number): 'mild' | 'moderate' | 'strong' | 'extreme' {
    const abs = Math.abs(sentiment);
    if (abs >= 0.8) return 'extreme';
    if (abs >= 0.5) return 'strong';
    if (abs >= 0.2) return 'moderate';
    return 'mild';
  }

  private getUserImpactLevel(mentionCount: number): 'widespread' | 'common' | 'occasional' | 'rare' {
    if (mentionCount >= 50) return 'widespread';
    if (mentionCount >= 20) return 'common';
    if (mentionCount >= 5) return 'occasional';
    return 'rare';
  }

  private calculateTrendDirection(
    mentions: any[],
    periodDays: number
  ): 'rising' | 'stable' | 'declining' {
    if (mentions.length < 5) return 'stable';

    const halfwayPoint = Date.now() - (periodDays / 2) * 24 * 60 * 60 * 1000;
    const recentCount = mentions.filter(m => new Date(m.review_date).getTime() > halfwayPoint).length;
    const olderCount = mentions.length - recentCount;

    if (recentCount > olderCount * 1.3) return 'rising';
    if (recentCount < olderCount * 0.7) return 'declining';
    return 'stable';
  }

  private estimateAffectedUsers(mentionCount: number, uniqueReviews: number): number {
    // Assume 1-5% of affected users leave reviews
    const reviewRate = 0.03; // 3% average
    return Math.round(uniqueReviews / reviewRate);
  }

  private estimateRatingImpact(
    sentiment: number,
    mentionCount: number,
    uniqueReviews: number
  ): number | null {
    if (sentiment >= 0) return null; // Positive themes don't impact rating negatively

    // Estimate rating impact based on negative sentiment and frequency
    const severityMultiplier = Math.abs(sentiment);
    const frequencyMultiplier = Math.min(mentionCount / 50, 1);
    const impact = severityMultiplier * frequencyMultiplier * 0.8;

    return Math.round(impact * 10) / 10;
  }

  private estimateEffort(
    category: string,
    mentionCount: number
  ): 'small' | 'medium' | 'large' | 'unknown' {
    if (category === 'bug') return mentionCount > 20 ? 'medium' : 'small';
    if (category === 'feature_request') return 'large';
    if (category === 'ux_issue') return 'medium';
    if (category === 'performance') return 'medium';
    return 'unknown';
  }

  private categorizeTheme(
    theme: string,
    relatedFeatures: Set<string>,
    relatedIssues: Set<string>
  ): 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other' {
    const lower = theme.toLowerCase();

    if (lower.includes('crash') || lower.includes('bug') || lower.includes('error') || lower.includes('broken')) {
      return 'bug';
    }
    if (lower.includes('request') || lower.includes('wish') || lower.includes('add') || lower.includes('missing')) {
      return 'feature_request';
    }
    if (lower.includes('slow') || lower.includes('lag') || lower.includes('performance') || lower.includes('freeze')) {
      return 'performance';
    }
    if (lower.includes('confusing') || lower.includes('design') || lower.includes('ui') || lower.includes('ux')) {
      return 'ux_issue';
    }

    return 'other';
  }

  private generateRecommendation(
    theme: string,
    category: string,
    impactLevel: string,
    sentiment: number
  ): string {
    if (category === 'bug') {
      return `Fix: ${theme} (${impactLevel} priority)`;
    }
    if (category === 'feature_request') {
      return `Consider implementing: ${theme}`;
    }
    if (category === 'performance') {
      return `Optimize: ${theme}`;
    }
    if (category === 'ux_issue') {
      return `Improve UX: ${theme}`;
    }

    return `Investigate: ${theme}`;
  }

  private selectExampleReviews(mentions: any[]): any[] {
    // Select up to 3 representative reviews
    const sorted = mentions.sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime());

    return sorted.slice(0, 3).map(review => ({
      reviewId: review.review_id,
      text: review.text.substring(0, 200) + (review.text.length > 200 ? '...' : ''),
      rating: review.rating,
      date: review.review_date.split('T')[0]
    }));
  }

  private mapSentimentToNumber(sentiment: string | null): number {
    if (sentiment === 'positive') return 1;
    if (sentiment === 'negative') return -1;
    return 0; // neutral or null
  }

  // ============================================================================
  // SUMMARY & TRENDS
  // ============================================================================

  private generateSummary(scores: ThemeImpactScore[]): ThemeAnalysisResult['summary'] {
    return {
      totalThemes: scores.length,
      criticalThemes: scores.filter(s => s.impactLevel === 'critical').length,
      highImpactThemes: scores.filter(s => s.impactLevel === 'high' || s.impactLevel === 'critical').length,
      risingThemes: scores.filter(s => s.trendDirection === 'rising').length,
      averageImpactScore: scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.impactScore, 0) / scores.length)
        : 0
    };
  }

  private async calculateTrends(
    monitoredAppId: string,
    currentScores: ThemeImpactScore[]
  ): Promise<ThemeAnalysisResult['trends']> {
    // Fetch previous analysis (7 days ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: previousScores } = await supabase
      .from('theme_impact_scores')
      .select('theme, impact_score')
      .eq('monitored_app_id', monitoredAppId)
      .eq('analysis_date', sevenDaysAgo);

    if (!previousScores || previousScores.length === 0) {
      return [];
    }

    const trends: ThemeAnalysisResult['trends'] = [];
    const previousMap = new Map(previousScores.map(s => [s.theme, s.impact_score]));

    currentScores.forEach(current => {
      const previous = previousMap.get(current.theme);
      if (previous !== undefined) {
        const change = current.impactScore - previous;
        trends.push({
          theme: current.theme,
          scoreChange: Math.round(change * 100) / 100,
          direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
        });
      }
    });

    return trends.sort((a, b) => Math.abs(b.scoreChange) - Math.abs(a.scoreChange));
  }

  private identifyTopPriorities(scores: ThemeImpactScore[]): ThemeImpactScore[] {
    return scores
      .filter(s => s.urgency === 'immediate' || s.urgency === 'high')
      .slice(0, 5);
  }

  private emptyResult(): ThemeAnalysisResult {
    return {
      scores: [],
      summary: {
        totalThemes: 0,
        criticalThemes: 0,
        highImpactThemes: 0,
        risingThemes: 0,
        averageImpactScore: 0
      },
      topPriorities: [],
      trends: []
    };
  }

  private mapToScoreObjects(data: any[]): ThemeImpactScore[] {
    return data.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      monitoredAppId: row.monitored_app_id,
      theme: row.theme,
      themeCategory: row.theme_category,
      analysisDate: row.analysis_date,
      periodDays: row.period_days,
      mentionCount: row.mention_count,
      uniqueReviews: row.unique_reviews,
      trendDirection: row.trend_direction,
      weekOverWeekChange: row.week_over_week_change,
      avgSentiment: parseFloat(row.avg_sentiment),
      positiveMentions: row.positive_mentions,
      neutralMentions: row.neutral_mentions,
      negativeMentions: row.negative_mentions,
      sentimentIntensity: row.sentiment_intensity,
      impactScore: parseFloat(row.impact_score),
      impactLevel: row.impact_level,
      urgency: row.urgency,
      affectedUserEstimate: row.affected_user_estimate,
      userImpactLevel: row.user_impact_level,
      affectedVersions: row.affected_versions || [],
      firstSeenDate: row.first_seen_date,
      lastSeenDate: row.last_seen_date,
      exampleReviews: row.example_reviews || [],
      relatedFeatures: row.related_features || [],
      relatedIssues: row.related_issues || [],
      recommendedAction: row.recommended_action,
      estimatedEffort: row.estimated_effort,
      potentialRatingImpact: row.potential_rating_impact ? parseFloat(row.potential_rating_impact) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}

export const themeImpactScoringService = new ThemeImpactScoringService();
