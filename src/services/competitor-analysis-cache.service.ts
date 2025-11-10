/**
 * Competitor Analysis Cache Service
 *
 * Manages 24-hour caching of competitor analysis results in database.
 * Matches the pattern used for primary app review caching.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CompetitiveIntelligence } from './competitor-review-intelligence.service';

export interface CachedAnalysis {
  id: string;
  organization_id: string;
  primary_app_id: string;
  competitor_app_ids: string[];
  country: string;
  intelligence: CompetitiveIntelligence;
  total_reviews_analyzed: number;
  analysis_duration_ms: number | null;
  created_at: string;
  expires_at: string;
}

export interface CacheMetadata {
  exists: boolean;
  ageSeconds: number | null;
  isFresh: boolean;
  cachedAt: string | null;
}

const CACHE_TTL_HOURS = 24;
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

class CompetitorAnalysisCacheService {
  /**
   * Check if cached analysis exists and is fresh (< 24 hours)
   */
  async checkCache(
    organizationId: string,
    primaryAppId: string,
    competitorAppIds: string[],
    country: string
  ): Promise<CacheMetadata> {
    try {
      // Sort competitor IDs for consistent cache key
      const sortedCompetitors = [...competitorAppIds].sort();

      const { data, error } = await supabase
        .from('competitor_analysis_cache')
        .select('created_at, expires_at')
        .eq('organization_id', organizationId)
        .eq('primary_app_id', primaryAppId)
        .eq('competitor_app_ids', sortedCompetitors)
        .eq('country', country)
        .single();

      if (error || !data) {
        console.log('💾 [Competitor Cache] No cache found');
        return {
          exists: false,
          ageSeconds: null,
          isFresh: false,
          cachedAt: null
        };
      }

      const createdAt = new Date(data.created_at);
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const ageMs = now.getTime() - createdAt.getTime();
      const ageSeconds = Math.floor(ageMs / 1000);
      const isFresh = now < expiresAt;

      console.log(`💾 [Competitor Cache] Found cache (age: ${ageSeconds}s, fresh: ${isFresh})`);

      return {
        exists: true,
        ageSeconds,
        isFresh,
        cachedAt: data.created_at
      };
    } catch (error) {
      console.error('❌ [Competitor Cache] Error checking cache:', error);
      return {
        exists: false,
        ageSeconds: null,
        isFresh: false,
        cachedAt: null
      };
    }
  }

  /**
   * Retrieve cached analysis if it exists and is fresh
   */
  async getCache(
    organizationId: string,
    primaryAppId: string,
    competitorAppIds: string[],
    country: string
  ): Promise<CompetitiveIntelligence | null> {
    try {
      // Sort competitor IDs for consistent cache key
      const sortedCompetitors = [...competitorAppIds].sort();

      const { data, error } = await supabase
        .from('competitor_analysis_cache')
        .select('intelligence, created_at, expires_at')
        .eq('organization_id', organizationId)
        .eq('primary_app_id', primaryAppId)
        .eq('competitor_app_ids', sortedCompetitors)
        .eq('country', country)
        .single();

      if (error || !data) {
        console.log('💾 [Competitor Cache] Cache miss');
        return null;
      }

      // Check if expired
      const expiresAt = new Date(data.expires_at);
      const now = new Date();

      if (now >= expiresAt) {
        console.log('⏰ [Competitor Cache] Cache expired, will refresh');
        // Delete expired cache
        await this.deleteCache(organizationId, primaryAppId, competitorAppIds, country);
        return null;
      }

      const ageSeconds = Math.floor((now.getTime() - new Date(data.created_at).getTime()) / 1000);
      console.log(`✅ [Competitor Cache] Cache hit (age: ${ageSeconds}s)`);

      return data.intelligence as CompetitiveIntelligence;
    } catch (error) {
      console.error('❌ [Competitor Cache] Error retrieving cache:', error);
      return null;
    }
  }

  /**
   * Save analysis results to cache
   */
  async saveCache(
    organizationId: string,
    primaryAppId: string,
    competitorAppIds: string[],
    country: string,
    intelligence: CompetitiveIntelligence,
    analysisDurationMs?: number
  ): Promise<boolean> {
    try {
      // Sort competitor IDs for consistent cache key
      const sortedCompetitors = [...competitorAppIds].sort();

      // Calculate total reviews analyzed
      const totalReviews = intelligence.primaryApp.reviews.length +
        intelligence.competitors.reduce((sum, c) => sum + c.reviews.length, 0);

      const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

      const { error } = await supabase
        .from('competitor_analysis_cache')
        .upsert({
          organization_id: organizationId,
          primary_app_id: primaryAppId,
          competitor_app_ids: sortedCompetitors,
          country,
          intelligence,
          total_reviews_analyzed: totalReviews,
          analysis_duration_ms: analysisDurationMs || null,
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'organization_id,primary_app_id,competitor_app_ids,country'
        });

      if (error) {
        console.error('❌ [Competitor Cache] Error saving cache:', error);
        return false;
      }

      console.log(`💾 [Competitor Cache] Saved analysis (${totalReviews} reviews, expires in ${CACHE_TTL_HOURS}h)`);
      return true;
    } catch (error) {
      console.error('❌ [Competitor Cache] Error saving cache:', error);
      return false;
    }
  }

  /**
   * Delete cached analysis (for manual refresh)
   */
  async deleteCache(
    organizationId: string,
    primaryAppId: string,
    competitorAppIds: string[],
    country: string
  ): Promise<boolean> {
    try {
      // Sort competitor IDs for consistent cache key
      const sortedCompetitors = [...competitorAppIds].sort();

      const { error } = await supabase
        .from('competitor_analysis_cache')
        .delete()
        .eq('organization_id', organizationId)
        .eq('primary_app_id', primaryAppId)
        .eq('competitor_app_ids', sortedCompetitors)
        .eq('country', country);

      if (error) {
        console.error('❌ [Competitor Cache] Error deleting cache:', error);
        return false;
      }

      console.log('🗑️ [Competitor Cache] Cache deleted (manual refresh)');
      return true;
    } catch (error) {
      console.error('❌ [Competitor Cache] Error deleting cache:', error);
      return false;
    }
  }

  /**
   * Format cache age for display (e.g., "2 hours ago", "30 minutes ago")
   */
  formatCacheAge(ageSeconds: number): string {
    if (ageSeconds < 60) {
      return 'Just now';
    }

    const minutes = Math.floor(ageSeconds / 60);
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  /**
   * Get time until cache expires (for display)
   */
  getTimeUntilExpiry(ageSeconds: number): string {
    const remainingSeconds = (CACHE_TTL_HOURS * 3600) - ageSeconds;

    if (remainingSeconds <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const competitorAnalysisCacheService = new CompetitorAnalysisCacheService();
