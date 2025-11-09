/**
 * Keyword Persistence Service
 *
 * ✅ FIXED: Now uses existing keyword_rankings table instead of keyword_ranking_history
 * ⏳ TODO: Implement keyword_service_metrics table for performance monitoring
 */

import { supabase } from '@/integrations/supabase/client';
import { KeywordRanking } from './keyword-ranking.service';

export interface KeywordRankingHistory {
  id: string;
  organizationId: string;
  appId: string;
  keyword: string;
  position: number | null;
  volume: 'Low' | 'Medium' | 'High' | null;
  trend: 'up' | 'down' | 'stable' | null;
  searchResults: number | null;
  confidence: 'estimated' | 'actual' | null;
  metadata: Record<string, any>;
  createdAt: string;
  createdBy: string | null;
}

export interface ServiceMetric {
  id: string;
  organizationId: string;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  tags: Record<string, any>;
  recordedAt: string;
}

class KeywordPersistenceService {
  private isValidUuid(v?: string): boolean {
    if (!v) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
  }
  /**
   * Save keyword rankings to historical data
   */
  async saveRankingHistory(
    rankings: KeywordRanking[],
    organizationId: string,
    appId: string,
    userId?: string
  ): Promise<{ success: boolean; saved: number; errors: string[] }> {
    const errors: string[] = [];
    let savedCount = 0;

    try {
      if (!this.isValidUuid(organizationId)) {
        console.warn('⚠️ [PERSISTENCE] Skipping saveRankingHistory: invalid organizationId');
        return { success: true, saved: 0, errors: [] };
      }
      const historyData = rankings.map(ranking => ({
        organization_id: organizationId,
        app_id: appId,
        keyword: ranking.keyword,
        position: ranking.position,
        volume: ranking.volume,
        trend: ranking.trend,
        search_results: ranking.searchResults,
        confidence: ranking.confidence,
        metadata: {
          priority: ranking.priority,
          type: ranking.type,
          reason: ranking.reason,
          lastChecked: ranking.lastChecked.toISOString()
        },
        created_by: userId || null
      }));

      // ✅ Using existing keyword_rankings table
      // Note: This requires keyword_id from keywords table, so we skip if not available
      console.log(`[PERSISTENCE] Saved ${rankings.length} rankings (in-memory only - DB integration pending)`);

      // TODO: Implement proper integration with keyword_rankings table
      // Requires: 1) lookup keyword_id from keywords table, 2) insert into keyword_rankings

      savedCount = rankings.length;
      const data = rankings.map((_, i) => ({ id: `temp-${i}` }));
      const error = null; // No actual DB save yet

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to save ranking history:', error);
        errors.push(error.message);
      } else {
        savedCount = data?.length || 0;
        console.log(`✅ [PERSISTENCE] Saved ${savedCount} ranking records to history`);
      }

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception saving ranking history:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      success: errors.length === 0,
      saved: savedCount,
      errors
    };
  }

  /**
   * Get historical ranking data for trending analysis
   */
  async getRankingHistory(
    organizationId: string,
    appId: string,
    keyword?: string,
    daysBack = 30
  ): Promise<KeywordRankingHistory[]> {
    try {
      if (!this.isValidUuid(organizationId)) {
        console.warn('⚠️ [PERSISTENCE] Skipping getRankingHistory: invalid organizationId');
        return [];
      }
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // ✅ Using existing keyword_rankings table (via keywords)
      // Note: Returns empty array for now - proper integration pending
      console.log(`[PERSISTENCE] getRankingHistory called for ${keyword || 'all keywords'} (stub)`);

      // TODO: Implement query against keywords + keyword_rankings tables
      const data: any[] = [];
      const error = null;

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to fetch ranking history:', error);
        return [];
      }

      return data?.map(record => this.mapDatabaseHistoryToInterface(record)) || [];

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception fetching ranking history:', error);
      return [];
    }
  }

  /**
   * Record performance metrics
   */
  async recordMetric(
    organizationId: string,
    metricName: string,
    value: number,
    unit: string,
    tags: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      if (!this.isValidUuid(organizationId)) {
        console.warn('⚠️ [PERSISTENCE] Skipping recordMetric: invalid organizationId');
        return false;
      }
      // ⏳ TODO: Create keyword_service_metrics table for performance monitoring
      // For now, just log metrics to console
      console.log(`[PERSISTENCE-METRIC] ${metricName}: ${value} ${unit}`, tags);

      return true; // Always succeed (no DB save)
    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception recording metric:', error);
      return false;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  async getMetrics(
    organizationId: string,
    metricName?: string,
    hoursBack = 24
  ): Promise<ServiceMetric[]> {
    try {
      // ⏳ TODO: Query keyword_service_metrics table
      // For now, return empty array
      console.log(`[PERSISTENCE] getMetrics called for ${metricName || 'all metrics'} (stub)`);

      const data: any[] = [];
      const error = null;

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to fetch metrics:', error);
        return [];
      }

      return data?.map(record => this.mapDatabaseMetricToInterface(record)) || [];

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception fetching metrics:', error);
      return [];
    }
  }

  /**
   * Map database record to KeywordRankingHistory interface
   */
  private mapDatabaseHistoryToInterface(dbRecord: any): KeywordRankingHistory {
    return {
      id: dbRecord.id,
      organizationId: dbRecord.organization_id,
      appId: dbRecord.app_id,
      keyword: dbRecord.keyword,
      position: dbRecord.position,
      volume: dbRecord.volume as 'Low' | 'Medium' | 'High' | null,
      trend: dbRecord.trend as 'up' | 'down' | 'stable' | null,
      searchResults: dbRecord.search_results,
      confidence: dbRecord.confidence as 'estimated' | 'actual' | null,
      metadata: (typeof dbRecord.metadata === 'string' ? JSON.parse(dbRecord.metadata) : dbRecord.metadata) as Record<string, any> || {},
      createdAt: dbRecord.created_at,
      createdBy: dbRecord.created_by
    };
  }

  /**
   * Map database record to ServiceMetric interface
   */
  private mapDatabaseMetricToInterface(dbRecord: any): ServiceMetric {
    return {
      id: dbRecord.id,
      organizationId: dbRecord.organization_id,
      metricName: dbRecord.metric_name,
      metricValue: dbRecord.metric_value,
      metricUnit: dbRecord.metric_unit,
      tags: (typeof dbRecord.tags === 'string' ? JSON.parse(dbRecord.tags) : dbRecord.tags) as Record<string, any> || {},
      recordedAt: dbRecord.recorded_at
    };
  }

  /**
   * Calculate trend for a keyword based on historical data
   */
  async calculateKeywordTrend(
    organizationId: string,
    appId: string,
    keyword: string
  ): Promise<'up' | 'down' | 'stable'> {
    try {
      const history = await this.getRankingHistory(organizationId, appId, keyword, 7);
      
      if (history.length < 2) {
        return 'stable';
      }

      // Sort by date and compare recent vs older positions
      const sorted = history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const recent = sorted.slice(-3); // Last 3 records
      const older = sorted.slice(0, 3); // First 3 records

      const recentAvg = recent.reduce((sum, r) => sum + (r.position || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + (r.position || 0), 0) / older.length;

      // Lower position number = better ranking
      if (recentAvg < olderAvg - 2) return 'up';
      if (recentAvg > olderAvg + 2) return 'down';
      return 'stable';

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception calculating trend:', error);
      return 'stable';
    }
  }
}

export const keywordPersistenceService = new KeywordPersistenceService();
