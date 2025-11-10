/**
 * INSIGHT ENRICHMENT ENGINE
 *
 * Enriches classified insights with:
 * - Impact scores (weighted formula: mentions 40% + sentiment 30% + recency 20% + trend 10%)
 * - Trend detection (rising/stable/declining based on MoM change)
 * - Demand levels (critical/high/medium/low)
 * - Exploitability assessment
 * - ASO keyword mapping with relevance scores
 * - Competitive context
 */

import { SemanticTopic } from './semantic-extraction.engine';
import { InsightClassification } from './insight-classification.engine';

/**
 * Enriched insight ready for storage
 */
export interface EnrichedInsight {
  // Core identity (from extraction + classification)
  topicId: string;
  topicDisplay: string;
  contextPhrase: string;
  verb: string | null;
  noun: string | null;
  insightType: 'aso' | 'product' | 'both';
  category: string;
  subcategory: string | null;

  // Metrics (from topic)
  mentionCount: number;
  sentimentScore: number;              // -1 to 1
  sentimentPositivePct: number;        // 0-100
  sentimentNegativePct: number;        // 0-100

  // Impact & Demand (NEW - calculated here)
  impactScore: number;                 // 0-100 weighted score
  demandLevel: 'critical' | 'high' | 'medium' | 'low';
  exploitability: 'high' | 'medium' | 'low';

  // Trend Data (NEW - calculated here)
  trendMoMPct: number | null;          // Month-over-month % change
  trendDirection: 'rising' | 'stable' | 'declining' | 'new';
  firstSeen: Date;
  lastSeen: Date;

  // ASO Mapping (NEW - calculated here)
  asoKeywords: string[];
  asoRelevanceScore: number;           // 0-1 score

  // Examples (from topic)
  examples: {
    reviewId: string;
    reviewText: string;
    reviewRating: number;
    matchedPhrase: string;
    relevanceScore: number;            // 0-1 based on context quality
  }[];

  // Metadata
  analyzedAt: Date;
  expiresAt: Date;                     // 7 days from now
}

/**
 * Historical snapshot for trend calculation
 */
export interface HistoricalSnapshot {
  topicId: string;
  snapshotDate: Date;
  mentionCount: number;
  sentimentScore: number;
  impactScore: number;
}

/**
 * Enrichment configuration
 */
export interface EnrichmentConfig {
  // Impact score weights
  mentionWeight?: number;              // Default: 0.4
  sentimentWeight?: number;            // Default: 0.3
  recencyWeight?: number;              // Default: 0.2
  trendWeight?: number;                // Default: 0.1

  // Trend detection
  enableTrendDetection?: boolean;      // Default: true
  trendWindowDays?: number;            // Default: 30 days

  // ASO mapping
  maxKeywordsPerInsight?: number;      // Default: 5
  minKeywordRelevance?: number;        // Default: 0.5

  // Examples
  maxExamplesPerInsight?: number;      // Default: 5
  minExampleRelevance?: number;        // Default: 0.6

  // TTL
  insightTTLDays?: number;             // Default: 7 days
}

/**
 * Main Enrichment Engine
 */
export class InsightEnrichmentEngine {
  private readonly DEFAULT_CONFIG: Required<EnrichmentConfig> = {
    mentionWeight: 0.4,
    sentimentWeight: 0.3,
    recencyWeight: 0.2,
    trendWeight: 0.1,
    enableTrendDetection: true,
    trendWindowDays: 30,
    maxKeywordsPerInsight: 5,
    minKeywordRelevance: 0.5,
    maxExamplesPerInsight: 5,
    minExampleRelevance: 0.6,
    insightTTLDays: 7
  };

  /**
   * Enrich a single insight with impact scores, trends, and metadata
   */
  async enrich(
    topic: SemanticTopic,
    classification: InsightClassification,
    historicalData?: HistoricalSnapshot[],
    config?: EnrichmentConfig
  ): Promise<EnrichedInsight> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Calculate impact score
    const impactScore = this.calculateImpactScore(topic, historicalData, finalConfig);

    // Determine demand level
    const demandLevel = this.calculateDemandLevel(impactScore, topic.mentions);

    // Assess exploitability
    const exploitability = this.assessExploitability(
      classification,
      topic.mentions,
      topic.sentiment.average
    );

    // Calculate trend
    const trend = finalConfig.enableTrendDetection
      ? this.calculateTrend(topic, historicalData, finalConfig)
      : { trendMoMPct: null, trendDirection: 'new' as const };

    // Map ASO keywords
    const asoMapping = this.mapASOKeywords(topic, classification, finalConfig);

    // Select and score examples
    const examples = this.selectBestExamples(topic, finalConfig);

    // Calculate sentiment percentages
    const totalSentiments = topic.sentiment.positive + topic.sentiment.neutral + topic.sentiment.negative;
    const sentimentPositivePct = (topic.sentiment.positive / totalSentiments) * 100;
    const sentimentNegativePct = (topic.sentiment.negative / totalSentiments) * 100;

    // Set expiration
    const analyzedAt = new Date();
    const expiresAt = new Date(analyzedAt.getTime() + finalConfig.insightTTLDays * 24 * 60 * 60 * 1000);

    return {
      topicId: topic.topicId,
      topicDisplay: topic.topicDisplay,
      contextPhrase: topic.contextPhrase,
      verb: topic.verb,
      noun: topic.noun,
      insightType: classification.insightType,
      category: classification.category,
      subcategory: classification.subcategory,
      mentionCount: topic.mentions,
      sentimentScore: topic.sentiment.average,
      sentimentPositivePct,
      sentimentNegativePct,
      impactScore,
      demandLevel,
      exploitability,
      trendMoMPct: trend.trendMoMPct,
      trendDirection: trend.trendDirection,
      firstSeen: topic.firstSeen,
      lastSeen: topic.lastSeen,
      asoKeywords: asoMapping.keywords,
      asoRelevanceScore: asoMapping.relevanceScore,
      examples,
      analyzedAt,
      expiresAt
    };
  }

  /**
   * Batch enrich multiple insights
   */
  async enrichBatch(
    topics: SemanticTopic[],
    classifications: InsightClassification[],
    historicalData?: Map<string, HistoricalSnapshot[]>,
    config?: EnrichmentConfig
  ): Promise<EnrichedInsight[]> {
    if (topics.length !== classifications.length) {
      throw new Error('Topics and classifications arrays must have same length');
    }

    return Promise.all(
      topics.map((topic, i) =>
        this.enrich(
          topic,
          classifications[i],
          historicalData?.get(topic.topicId),
          config
        )
      )
    );
  }

  /**
   * Calculate impact score using weighted formula
   * Formula: (mentions*0.4 + sentiment*0.3 + recency*0.2 + trend*0.1) * 100
   */
  private calculateImpactScore(
    topic: SemanticTopic,
    historicalData: HistoricalSnapshot[] | undefined,
    config: Required<EnrichmentConfig>
  ): number {
    // 1. Mention score (0-1): Normalize mentions (cap at 50 mentions = 1.0)
    const mentionScore = Math.min(topic.mentions / 50, 1);

    // 2. Sentiment score (0-1): Convert from -1/+1 range to 0/1 range
    // Negative sentiment also indicates impact (issues need attention)
    const sentimentScore = Math.abs(topic.sentiment.average);

    // 3. Recency score (0-1): More recent mentions = higher score
    const daysSinceLastSeen = this.daysBetween(topic.lastSeen, new Date());
    const recencyScore = Math.max(0, 1 - daysSinceLastSeen / 30); // Decay over 30 days

    // 4. Trend score (0-1): Rising trends get boost
    const trendScore = this.calculateTrendScore(topic, historicalData);

    // Apply weights
    const impactScore =
      mentionScore * config.mentionWeight +
      sentimentScore * config.sentimentWeight +
      recencyScore * config.recencyWeight +
      trendScore * config.trendWeight;

    // Convert to 0-100 scale
    return Math.round(impactScore * 100);
  }

  /**
   * Calculate trend score for impact calculation
   */
  private calculateTrendScore(
    topic: SemanticTopic,
    historicalData: HistoricalSnapshot[] | undefined
  ): number {
    if (!historicalData || historicalData.length < 2) {
      return 0.5; // Neutral for new topics
    }

    // Calculate MoM change
    const sorted = historicalData.sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());
    const recent = sorted[0];
    const previous = sorted[Math.min(30, sorted.length - 1)]; // ~30 days ago

    if (!previous || previous.mentionCount === 0) return 0.5;

    const momChange = (recent.mentionCount - previous.mentionCount) / previous.mentionCount;

    // Convert to 0-1 score (rising = higher)
    if (momChange > 0.5) return 1.0;      // Strong growth
    if (momChange > 0.2) return 0.8;      // Moderate growth
    if (momChange > -0.2) return 0.5;     // Stable
    if (momChange > -0.5) return 0.3;     // Declining
    return 0.1;                            // Strong decline
  }

  /**
   * Calculate demand level based on impact score and mentions
   */
  private calculateDemandLevel(
    impactScore: number,
    mentions: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (impactScore >= 80 && mentions >= 15) return 'critical';
    if (impactScore >= 60 && mentions >= 8) return 'high';
    if (impactScore >= 40 || mentions >= 4) return 'medium';
    return 'low';
  }

  /**
   * Assess how exploitable this insight is (opportunity vs. complexity)
   */
  private assessExploitability(
    classification: InsightClassification,
    mentions: number,
    sentiment: number
  ): 'high' | 'medium' | 'low' {
    // High exploitability: ASO opportunities or simple product features with high demand
    if (classification.asoRelevance.keywordPotential === 'high' && mentions >= 10) {
      return 'high';
    }

    if (
      classification.productRelevance.implementationComplexity === 'low' &&
      classification.productRelevance.userImpact === 'high'
    ) {
      return 'high';
    }

    // Low exploitability: Complex features with low demand
    if (
      classification.productRelevance.implementationComplexity === 'high' &&
      mentions < 5
    ) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Calculate trend direction and MoM percentage change
   */
  private calculateTrend(
    topic: SemanticTopic,
    historicalData: HistoricalSnapshot[] | undefined,
    config: Required<EnrichmentConfig>
  ): { trendMoMPct: number | null; trendDirection: 'rising' | 'stable' | 'declining' | 'new' } {
    if (!historicalData || historicalData.length < 2) {
      return { trendMoMPct: null, trendDirection: 'new' };
    }

    // Get snapshots from ~30 days ago vs. recent
    const sorted = historicalData.sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());
    const recent = sorted[0];
    const targetDate = new Date(recent.snapshotDate.getTime() - config.trendWindowDays * 24 * 60 * 60 * 1000);

    // Find closest snapshot to target date
    const previous = sorted.reduce((closest, snapshot) => {
      const currentDiff = Math.abs(snapshot.snapshotDate.getTime() - targetDate.getTime());
      const closestDiff = Math.abs(closest.snapshotDate.getTime() - targetDate.getTime());
      return currentDiff < closestDiff ? snapshot : closest;
    });

    if (previous.mentionCount === 0) {
      return { trendMoMPct: null, trendDirection: 'new' };
    }

    // Calculate percentage change
    const trendMoMPct = ((recent.mentionCount - previous.mentionCount) / previous.mentionCount) * 100;

    // Determine direction
    let trendDirection: 'rising' | 'stable' | 'declining';
    if (trendMoMPct > 20) trendDirection = 'rising';
    else if (trendMoMPct < -20) trendDirection = 'declining';
    else trendDirection = 'stable';

    return { trendMoMPct: Math.round(trendMoMPct * 10) / 10, trendDirection };
  }

  /**
   * Map topic to ASO keywords with relevance scores
   */
  private mapASOKeywords(
    topic: SemanticTopic,
    classification: InsightClassification,
    config: Required<EnrichmentConfig>
  ): { keywords: string[]; relevanceScore: number } {
    // If not ASO-relevant, return empty
    if (classification.insightType === 'product') {
      return { keywords: [], relevanceScore: 0 };
    }

    // Get suggested keywords from classification
    const suggestedKeywords = classification.asoRelevance.suggestedKeywords;

    // Score each keyword by relevance
    const scoredKeywords = suggestedKeywords.map(keyword => ({
      keyword,
      score: this.scoreKeywordRelevance(keyword, topic, classification)
    }));

    // Filter by minimum relevance and take top N
    const filteredKeywords = scoredKeywords
      .filter(k => k.score >= config.minKeywordRelevance)
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxKeywordsPerInsight);

    // Calculate average relevance score
    const avgRelevanceScore =
      filteredKeywords.length > 0
        ? filteredKeywords.reduce((sum, k) => sum + k.score, 0) / filteredKeywords.length
        : 0;

    return {
      keywords: filteredKeywords.map(k => k.keyword),
      relevanceScore: Math.round(avgRelevanceScore * 100) / 100
    };
  }

  /**
   * Score keyword relevance (0-1)
   */
  private scoreKeywordRelevance(
    keyword: string,
    topic: SemanticTopic,
    classification: InsightClassification
  ): number {
    let score = 0.5; // Base score

    // Boost if keyword appears in multiple variations
    const variationMatches = topic.variations.filter(v =>
      v.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += Math.min(variationMatches * 0.1, 0.3);

    // Boost based on mention count
    if (topic.mentions >= 10) score += 0.2;
    else if (topic.mentions >= 5) score += 0.1;

    // Boost for high keyword potential
    if (classification.asoRelevance.keywordPotential === 'high') score += 0.2;
    else if (classification.asoRelevance.keywordPotential === 'medium') score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Select best example reviews with relevance scores
   */
  private selectBestExamples(
    topic: SemanticTopic,
    config: Required<EnrichmentConfig>
  ): EnrichedInsight['examples'] {
    return topic.examples
      .map(example => {
        // Calculate relevance score based on:
        // 1. Rating (high ratings = better examples)
        // 2. Context length (more context = better)
        // 3. Matched phrase clarity
        const ratingScore = example.rating / 5; // 0-1
        const contextScore = Math.min(example.context.length / 100, 1); // 0-1
        const clarityScore = example.matchedPhrase.length >= 3 ? 1 : 0.5; // Binary

        const relevanceScore = (ratingScore * 0.4 + contextScore * 0.4 + clarityScore * 0.2);

        return {
          reviewId: `review-${Date.now()}-${Math.random()}`, // Placeholder
          reviewText: example.text,
          reviewRating: example.rating,
          matchedPhrase: example.matchedPhrase,
          relevanceScore: Math.round(relevanceScore * 100) / 100
        };
      })
      .filter(ex => ex.relevanceScore >= config.minExampleRelevance)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, config.maxExamplesPerInsight);
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Create historical snapshot from enriched insight (for next analysis cycle)
   */
  createSnapshot(insight: EnrichedInsight): HistoricalSnapshot {
    return {
      topicId: insight.topicId,
      snapshotDate: new Date(),
      mentionCount: insight.mentionCount,
      sentimentScore: insight.sentimentScore,
      impactScore: insight.impactScore
    };
  }

  /**
   * Calculate impact score breakdown for transparency
   */
  getImpactBreakdown(
    topic: SemanticTopic,
    historicalData: HistoricalSnapshot[] | undefined,
    config?: EnrichmentConfig
  ): {
    mentionScore: number;
    sentimentScore: number;
    recencyScore: number;
    trendScore: number;
    total: number;
  } {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    const mentionScore = Math.min(topic.mentions / 50, 1);
    const sentimentScore = Math.abs(topic.sentiment.average);
    const daysSinceLastSeen = this.daysBetween(topic.lastSeen, new Date());
    const recencyScore = Math.max(0, 1 - daysSinceLastSeen / 30);
    const trendScore = this.calculateTrendScore(topic, historicalData);

    const total =
      mentionScore * finalConfig.mentionWeight +
      sentimentScore * finalConfig.sentimentWeight +
      recencyScore * finalConfig.recencyWeight +
      trendScore * finalConfig.trendWeight;

    return {
      mentionScore: Math.round(mentionScore * 100),
      sentimentScore: Math.round(sentimentScore * 100),
      recencyScore: Math.round(recencyScore * 100),
      trendScore: Math.round(trendScore * 100),
      total: Math.round(total * 100)
    };
  }
}
