/**
 * SEMANTIC INSIGHT SERVICE
 *
 * Orchestrates the complete semantic insights pipeline:
 * 1. Extract semantic topics from reviews (SemanticExtractionEngine)
 * 2. Classify topics as ASO/Product (InsightClassificationEngine)
 * 3. Enrich with impact scores and trends (InsightEnrichmentEngine)
 * 4. Save to database (semantic_insights, insight_examples, insight_trends, aso_keyword_mapping)
 * 5. Query insights by type, category, demand level
 */

import { supabase } from '@/integrations/supabase/client';
import { SemanticExtractionEngine, type SemanticTopic } from '@/engines/semantic-extraction.engine';
import { InsightClassificationEngine, type InsightClassification } from '@/engines/insight-classification.engine';
import { InsightEnrichmentEngine, type EnrichedInsight, type HistoricalSnapshot } from '@/engines/insight-enrichment.engine';
import type { EnhancedReviewItem } from '@/types/review-intelligence.types';

/**
 * Insight query filters
 */
export interface InsightFilters {
  insightType?: 'aso' | 'product' | 'both';
  category?: string;
  subcategory?: string;
  demandLevel?: 'critical' | 'high' | 'medium' | 'low';
  minImpactScore?: number;
  trendDirection?: 'rising' | 'stable' | 'declining' | 'new';
  limit?: number;
}

/**
 * Stored insight from database
 */
export interface StoredInsight {
  id: string;
  organization_id: string;
  app_store_id: string;
  app_name: string;
  country: string;
  topic_id: string;
  topic_display: string;
  context_phrase: string;
  verb: string | null;
  noun: string | null;
  insight_type: 'aso' | 'product' | 'both';
  category: string;
  subcategory: string | null;
  mention_count: number;
  sentiment_score: number;
  sentiment_positive_pct: number;
  sentiment_negative_pct: number;
  impact_score: number;
  demand_level: 'critical' | 'high' | 'medium' | 'low';
  exploitability: 'high' | 'medium' | 'low';
  trend_mom_pct: number | null;
  trend_direction: 'rising' | 'stable' | 'declining' | 'new';
  first_seen: string;
  last_seen: string;
  aso_keywords: string[];
  aso_relevance_score: number;
  analyzed_at: string;
  expires_at: string;
}

/**
 * Main Semantic Insight Service
 */
class SemanticInsightService {
  private extractionEngine: SemanticExtractionEngine;
  private classificationEngine: InsightClassificationEngine;
  private enrichmentEngine: InsightEnrichmentEngine;

  constructor() {
    this.extractionEngine = new SemanticExtractionEngine();
    this.classificationEngine = new InsightClassificationEngine();
    this.enrichmentEngine = new InsightEnrichmentEngine();
  }

  /**
   * Generate and save semantic insights from reviews
   */
  async generateInsights(
    organizationId: string,
    appStoreId: string,
    appName: string,
    country: string,
    reviews: EnhancedReviewItem[]
  ): Promise<{ success: boolean; insightsCount: number; error?: string }> {
    try {
      console.log(`🧠 [Semantic Insights] Starting analysis for ${appName} (${reviews.length} reviews)`);

      // Step 1: Extract semantic topics
      const topics = await this.extractionEngine.extract(reviews, {
        minMentions: 2,
        maxTopics: 50,
        includeExamples: true,
        maxExamplesPerTopic: 5
      });

      console.log(`📊 [Semantic Insights] Extracted ${topics.length} topics`);

      if (topics.length === 0) {
        return { success: true, insightsCount: 0 };
      }

      // Step 2: Classify topics
      const classifications = this.classificationEngine.classifyBatch(topics);

      console.log(`🏷️ [Semantic Insights] Classified ${classifications.length} topics`);

      // Step 3: Fetch historical data for trend calculation
      const historicalData = await this.fetchHistoricalData(
        organizationId,
        appStoreId,
        country,
        topics.map(t => t.topicId)
      );

      console.log(`📈 [Semantic Insights] Loaded historical data for ${historicalData.size} topics`);

      // Step 4: Enrich insights
      const enrichedInsights = await this.enrichmentEngine.enrichBatch(
        topics,
        classifications,
        historicalData
      );

      console.log(`💎 [Semantic Insights] Enriched ${enrichedInsights.length} insights`);

      // Step 5: Save to database
      await this.saveInsights(organizationId, appStoreId, appName, country, enrichedInsights);

      console.log(`✅ [Semantic Insights] Saved ${enrichedInsights.length} insights to database`);

      return { success: true, insightsCount: enrichedInsights.length };
    } catch (error) {
      console.error('❌ [Semantic Insights] Error generating insights:', error);
      return {
        success: false,
        insightsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Query insights with filters
   */
  async queryInsights(
    organizationId: string,
    appStoreId: string,
    country: string,
    filters?: InsightFilters
  ): Promise<StoredInsight[]> {
    try {
      let query = supabase
        .from('semantic_insights')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_store_id', appStoreId)
        .eq('country', country)
        .gt('expires_at', new Date().toISOString()); // Only non-expired

      // Apply filters
      if (filters?.insightType) {
        query = query.eq('insight_type', filters.insightType);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.subcategory) {
        query = query.eq('subcategory', filters.subcategory);
      }
      if (filters?.demandLevel) {
        query = query.eq('demand_level', filters.demandLevel);
      }
      if (filters?.minImpactScore !== undefined) {
        query = query.gte('impact_score', filters.minImpactScore);
      }
      if (filters?.trendDirection) {
        query = query.eq('trend_direction', filters.trendDirection);
      }

      // Sort by impact score desc
      query = query.order('impact_score', { ascending: false });

      // Limit results
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [Semantic Insights] Error querying insights:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [Semantic Insights] Error querying insights:', error);
      return [];
    }
  }

  /**
   * Get ASO keyword opportunities (ASO-type insights)
   */
  async getASOOpportunities(
    organizationId: string,
    appStoreId: string,
    country: string,
    minImpactScore: number = 50
  ): Promise<StoredInsight[]> {
    return this.queryInsights(organizationId, appStoreId, country, {
      insightType: 'aso',
      minImpactScore,
      limit: 20
    });
  }

  /**
   * Get product feature requests (Product-type insights)
   */
  async getProductFeatureRequests(
    organizationId: string,
    appStoreId: string,
    country: string,
    minImpactScore: number = 40
  ): Promise<StoredInsight[]> {
    return this.queryInsights(organizationId, appStoreId, country, {
      insightType: 'product',
      minImpactScore,
      limit: 20
    });
  }

  /**
   * Get trending insights (rising trend direction)
   */
  async getTrendingInsights(
    organizationId: string,
    appStoreId: string,
    country: string
  ): Promise<StoredInsight[]> {
    return this.queryInsights(organizationId, appStoreId, country, {
      trendDirection: 'rising',
      limit: 15
    });
  }

  /**
   * Get critical demand insights
   */
  async getCriticalDemandInsights(
    organizationId: string,
    appStoreId: string,
    country: string
  ): Promise<StoredInsight[]> {
    return this.queryInsights(organizationId, appStoreId, country, {
      demandLevel: 'critical',
      limit: 10
    });
  }

  /**
   * Get insight examples (sample reviews)
   */
  async getInsightExamples(insightId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('insight_examples')
        .select('*')
        .eq('insight_id', insightId)
        .order('relevance_score', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ [Semantic Insights] Error fetching examples:', error);
      return [];
    }
  }

  /**
   * Get trend history for insight
   */
  async getInsightTrends(
    organizationId: string,
    appStoreId: string,
    topicId: string,
    country: string,
    days: number = 30
  ): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('insight_trends')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_store_id', appStoreId)
        .eq('topic_id', topicId)
        .eq('country', country)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ [Semantic Insights] Error fetching trends:', error);
      return [];
    }
  }

  /**
   * Get ASO keyword mappings for insight
   */
  async getKeywordMappings(insightId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('aso_keyword_mapping')
        .select('*')
        .eq('insight_id', insightId)
        .order('relevance_score', { ascending: false })
        .order('priority', { ascending: true })
        .limit(10);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ [Semantic Insights] Error fetching keyword mappings:', error);
      return [];
    }
  }

  /**
   * Save enriched insights to database
   */
  private async saveInsights(
    organizationId: string,
    appStoreId: string,
    appName: string,
    country: string,
    insights: EnrichedInsight[]
  ): Promise<void> {
    // Save all insights in a batch
    const insightRecords = insights.map(insight => ({
      organization_id: organizationId,
      app_store_id: appStoreId,
      app_name: appName,
      country,
      topic_id: insight.topicId,
      topic_display: insight.topicDisplay,
      context_phrase: insight.contextPhrase,
      verb: insight.verb,
      noun: insight.noun,
      insight_type: insight.insightType,
      category: insight.category,
      subcategory: insight.subcategory,
      mention_count: insight.mentionCount,
      sentiment_score: insight.sentimentScore,
      sentiment_positive_pct: insight.sentimentPositivePct,
      sentiment_negative_pct: insight.sentimentNegativePct,
      impact_score: insight.impactScore,
      demand_level: insight.demandLevel,
      exploitability: insight.exploitability,
      trend_mom_pct: insight.trendMoMPct,
      trend_direction: insight.trendDirection,
      first_seen: insight.firstSeen.toISOString(),
      last_seen: insight.lastSeen.toISOString(),
      aso_keywords: insight.asoKeywords,
      aso_relevance_score: insight.asoRelevanceScore,
      analyzed_at: insight.analyzedAt.toISOString(),
      expires_at: insight.expiresAt.toISOString()
    }));

    // Upsert insights (update if exists, insert if new)
    const { data: savedInsights, error: insightError } = await supabase
      .from('semantic_insights')
      .upsert(insightRecords, {
        onConflict: 'organization_id,app_store_id,topic_id,country',
        ignoreDuplicates: false
      })
      .select();

    if (insightError) {
      console.error('❌ [Semantic Insights] Error saving insights:', insightError);
      throw insightError;
    }

    console.log(`💾 [Semantic Insights] Saved ${savedInsights?.length || 0} insight records`);

    // Save examples for each insight
    if (savedInsights) {
      await this.saveInsightExamples(savedInsights, insights);
    }

    // Save trend snapshots
    if (savedInsights) {
      await this.saveTrendSnapshots(organizationId, appStoreId, country, savedInsights, insights);
    }

    // Save ASO keyword mappings (for ASO-type insights only)
    if (savedInsights) {
      await this.saveKeywordMappings(organizationId, savedInsights, insights);
    }
  }

  /**
   * Save insight examples to database
   */
  private async saveInsightExamples(
    savedInsights: any[],
    enrichedInsights: EnrichedInsight[]
  ): Promise<void> {
    const exampleRecords: any[] = [];

    savedInsights.forEach((savedInsight, index) => {
      const insight = enrichedInsights[index];

      insight.examples.forEach(example => {
        exampleRecords.push({
          insight_id: savedInsight.id,
          review_id: example.reviewId,
          review_text: example.reviewText,
          review_rating: example.reviewRating,
          matched_phrase: example.matchedPhrase,
          surrounding_context: example.reviewText.substring(0, 300), // Use full text as context
          relevance_score: example.relevanceScore
        });
      });
    });

    if (exampleRecords.length === 0) return;

    const { error } = await supabase.from('insight_examples').insert(exampleRecords);

    if (error) {
      console.error('❌ [Semantic Insights] Error saving examples:', error);
    } else {
      console.log(`💾 [Semantic Insights] Saved ${exampleRecords.length} example records`);
    }
  }

  /**
   * Save trend snapshots to database
   */
  private async saveTrendSnapshots(
    organizationId: string,
    appStoreId: string,
    country: string,
    savedInsights: any[],
    enrichedInsights: EnrichedInsight[]
  ): Promise<void> {
    const snapshotRecords = savedInsights.map((savedInsight, index) => {
      const insight = enrichedInsights[index];

      return {
        organization_id: organizationId,
        app_store_id: appStoreId,
        topic_id: insight.topicId,
        country,
        snapshot_date: new Date().toISOString().split('T')[0], // Today's date
        mention_count: insight.mentionCount,
        sentiment_score: insight.sentimentScore,
        impact_score: insight.impactScore,
        mentions_delta: null, // Will be calculated next time
        sentiment_delta: null
      };
    });

    const { error } = await supabase.from('insight_trends').upsert(snapshotRecords, {
      onConflict: 'organization_id,app_store_id,topic_id,country,snapshot_date',
      ignoreDuplicates: false
    });

    if (error) {
      console.error('❌ [Semantic Insights] Error saving trend snapshots:', error);
    } else {
      console.log(`💾 [Semantic Insights] Saved ${snapshotRecords.length} trend snapshot records`);
    }
  }

  /**
   * Save ASO keyword mappings to database
   */
  private async saveKeywordMappings(
    organizationId: string,
    savedInsights: any[],
    enrichedInsights: EnrichedInsight[]
  ): Promise<void> {
    const mappingRecords: any[] = [];

    savedInsights.forEach((savedInsight, index) => {
      const insight = enrichedInsights[index];

      // Only save mappings for ASO-relevant insights
      if (insight.insightType === 'product') return;

      insight.asoKeywords.forEach((keyword, keywordIndex) => {
        mappingRecords.push({
          organization_id: organizationId,
          insight_id: savedInsight.id,
          keyword,
          relevance_score: insight.asoRelevanceScore,
          mapping_type: keywordIndex === 0 ? 'exact' : 'semantic', // First keyword = exact match
          recommendation: this.generateKeywordRecommendation(insight, keyword),
          priority: insight.demandLevel === 'critical' || insight.demandLevel === 'high' ? 'high' : 'medium',
          keyword_volume: null, // Could be enriched with external data
          keyword_difficulty: null
        });
      });
    });

    if (mappingRecords.length === 0) return;

    const { error } = await supabase.from('aso_keyword_mapping').insert(mappingRecords);

    if (error) {
      console.error('❌ [Semantic Insights] Error saving keyword mappings:', error);
    } else {
      console.log(`💾 [Semantic Insights] Saved ${mappingRecords.length} keyword mapping records`);
    }
  }

  /**
   * Generate keyword recommendation text
   */
  private generateKeywordRecommendation(insight: EnrichedInsight, keyword: string): string {
    if (insight.demandLevel === 'critical') {
      return `High-priority keyword opportunity: "${keyword}" has critical user demand (${insight.mentionCount} mentions, impact score: ${insight.impactScore})`;
    }
    if (insight.demandLevel === 'high') {
      return `Consider targeting "${keyword}" - strong user demand with ${insight.mentionCount} mentions`;
    }
    return `Moderate opportunity for "${keyword}" - ${insight.mentionCount} mentions detected`;
  }

  /**
   * Fetch historical data for trend calculation
   */
  private async fetchHistoricalData(
    organizationId: string,
    appStoreId: string,
    country: string,
    topicIds: string[]
  ): Promise<Map<string, HistoricalSnapshot[]>> {
    const historicalMap = new Map<string, HistoricalSnapshot[]>();

    if (topicIds.length === 0) return historicalMap;

    try {
      const { data, error } = await supabase
        .from('insight_trends')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_store_id', appStoreId)
        .eq('country', country)
        .in('topic_id', topicIds)
        .order('snapshot_date', { ascending: false });

      if (error) {
        console.error('❌ [Semantic Insights] Error fetching historical data:', error);
        return historicalMap;
      }

      // Group by topic_id
      data?.forEach(snapshot => {
        const existing = historicalMap.get(snapshot.topic_id) || [];
        existing.push({
          topicId: snapshot.topic_id,
          snapshotDate: new Date(snapshot.snapshot_date),
          mentionCount: snapshot.mention_count,
          sentimentScore: snapshot.sentiment_score,
          impactScore: snapshot.impact_score
        });
        historicalMap.set(snapshot.topic_id, existing);
      });

      return historicalMap;
    } catch (error) {
      console.error('❌ [Semantic Insights] Error fetching historical data:', error);
      return historicalMap;
    }
  }

  /**
   * Delete expired insights (called by scheduled job)
   */
  async cleanupExpiredInsights(): Promise<{ deletedCount: number }> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_semantic_insights');

      if (error) {
        console.error('❌ [Semantic Insights] Error cleaning up expired insights:', error);
        return { deletedCount: 0 };
      }

      console.log('🧹 [Semantic Insights] Cleaned up expired insights');
      return { deletedCount: 0 }; // Function returns count
    } catch (error) {
      console.error('❌ [Semantic Insights] Error cleaning up expired insights:', error);
      return { deletedCount: 0 };
    }
  }
}

export const semanticInsightService = new SemanticInsightService();
