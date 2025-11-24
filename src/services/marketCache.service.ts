/**
 * Market-Aware Caching Service
 *
 * Provides explicit cache management for multi-market app monitoring.
 * Handles cache lifecycle, invalidation, and warming for market-specific metadata.
 *
 * Cache Key Format: `app_metadata:${appId}:${market}:${platform}`
 *
 * Features:
 * - Market-specific cache keys
 * - TTL management (24 hours default)
 * - Cache invalidation on market removal
 * - Cache warming for newly added markets
 * - Version hash-based change detection
 */

import { supabase } from '@/integrations/supabase/client';
import type { MarketCode } from '@/config/markets';
import { createHash } from 'crypto';

// Cache TTL: 24 hours (metadata doesn't change frequently)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  fetched_at: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  developer_name: string | null;
  app_icon_url: string | null;
  screenshots: any;
  version_hash: string;
  created_at: string;
  updated_at: string;
}

interface CacheStats {
  totalEntries: number;
  entriesByMarket: Record<string, number>;
  oldestEntry: string | null;
  newestEntry: string | null;
  staleEntries: number;
}

export class MarketCacheService {
  /**
   * Get cache entry for specific app + market
   */
  static async getCacheEntry(
    appId: string,
    market: MarketCode,
    platform: 'ios' | 'android',
    organizationId: string
  ): Promise<CacheEntry | null> {
    console.log(`[MarketCache] Getting cache for: ${appId} (${market})`);

    const { data, error } = await supabase
      .from('app_metadata_cache')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('app_id', appId)
      .eq('locale', market)
      .eq('platform', platform)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[MarketCache] Failed to get cache:', error);
      return null;
    }

    if (!data) {
      console.log('[MarketCache] Cache miss');
      return null;
    }

    // Check if cache is stale (older than TTL)
    const fetchedAt = new Date(data.fetched_at).getTime();
    const now = Date.now();
    const age = now - fetchedAt;
    const isStale = age > CACHE_TTL_MS;

    console.log(`[MarketCache] Cache ${isStale ? 'STALE' : 'HIT'} (age: ${Math.round(age / 1000 / 60)} minutes)`);

    return data as CacheEntry;
  }

  /**
   * Check if cache is stale (older than TTL)
   */
  static isCacheStale(cacheEntry: CacheEntry): boolean {
    const fetchedAt = new Date(cacheEntry.fetched_at).getTime();
    const age = Date.now() - fetchedAt;
    return age > CACHE_TTL_MS;
  }

  /**
   * Invalidate cache for specific app + market
   * Deletes the cache entry to force fresh fetch on next access
   */
  static async invalidateCache(
    appId: string,
    market: MarketCode,
    platform: 'ios' | 'android',
    organizationId: string
  ): Promise<boolean> {
    console.log(`[MarketCache] Invalidating cache: ${appId} (${market})`);

    const { error } = await supabase
      .from('app_metadata_cache')
      .delete()
      .eq('organization_id', organizationId)
      .eq('app_id', appId)
      .eq('locale', market)
      .eq('platform', platform);

    if (error) {
      console.error('[MarketCache] Failed to invalidate cache:', error);
      return false;
    }

    console.log('[MarketCache] Cache invalidated successfully');
    return true;
  }

  /**
   * Invalidate all caches for an app (all markets)
   * Useful when app is deleted or needs full refresh
   */
  static async invalidateAllMarketsForApp(
    appId: string,
    platform: 'ios' | 'android',
    organizationId: string
  ): Promise<number> {
    console.log(`[MarketCache] Invalidating all markets for app: ${appId}`);

    const { data, error } = await supabase
      .from('app_metadata_cache')
      .delete()
      .eq('organization_id', organizationId)
      .eq('app_id', appId)
      .eq('platform', platform)
      .select('id');

    if (error) {
      console.error('[MarketCache] Failed to invalidate all markets:', error);
      return 0;
    }

    const count = data?.length || 0;
    console.log(`[MarketCache] Invalidated ${count} market caches`);
    return count;
  }

  /**
   * Get cache statistics for an app across all markets
   */
  static async getCacheStats(
    appId: string,
    platform: 'ios' | 'android',
    organizationId: string
  ): Promise<CacheStats> {
    const { data, error } = await supabase
      .from('app_metadata_cache')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('app_id', appId)
      .eq('platform', platform)
      .order('fetched_at', { ascending: false });

    if (error || !data) {
      return {
        totalEntries: 0,
        entriesByMarket: {},
        oldestEntry: null,
        newestEntry: null,
        staleEntries: 0,
      };
    }

    const entriesByMarket: Record<string, number> = {};
    let staleCount = 0;

    data.forEach((entry) => {
      // Count by market
      entriesByMarket[entry.locale] = (entriesByMarket[entry.locale] || 0) + 1;

      // Check if stale
      if (this.isCacheStale(entry as CacheEntry)) {
        staleCount++;
      }
    });

    return {
      totalEntries: data.length,
      entriesByMarket,
      oldestEntry: data.length > 0 ? data[data.length - 1].fetched_at : null,
      newestEntry: data.length > 0 ? data[0].fetched_at : null,
      staleEntries: staleCount,
    };
  }

  /**
   * Cleanup stale caches older than TTL
   * Should be run periodically (e.g., daily cron job)
   */
  static async cleanupStaleCaches(organizationId: string): Promise<number> {
    const cutoffDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    console.log(`[MarketCache] Cleaning up caches older than: ${cutoffDate}`);

    const { data, error } = await supabase
      .from('app_metadata_cache')
      .delete()
      .eq('organization_id', organizationId)
      .lt('fetched_at', cutoffDate)
      .select('id');

    if (error) {
      console.error('[MarketCache] Failed to cleanup stale caches:', error);
      return 0;
    }

    const count = data?.length || 0;
    console.log(`[MarketCache] Cleaned up ${count} stale caches`);
    return count;
  }

  /**
   * Warm cache for a newly added market
   * Fetches metadata from App Store and stores in cache
   *
   * Note: Actual metadata fetching is handled by AppStoreIntegrationService
   * This method just ensures the cache is populated after market addition
   */
  static async warmCacheForMarket(
    appId: string,
    market: MarketCode,
    platform: 'ios' | 'android',
    organizationId: string,
    metadata: {
      title: string;
      subtitle?: string;
      description?: string;
      developer_name?: string;
      app_icon_url?: string;
      screenshots?: any[];
    }
  ): Promise<boolean> {
    console.log(`[MarketCache] Warming cache for: ${appId} (${market})`);

    // Generate version hash
    const versionHash = this.generateVersionHash({
      title: metadata.title,
      subtitle: metadata.subtitle || '',
      description: metadata.description || '',
      developer_name: metadata.developer_name || '',
      screenshots: metadata.screenshots || [],
    });

    const { error } = await supabase
      .from('app_metadata_cache')
      .insert({
        organization_id: organizationId,
        app_id: appId,
        platform,
        locale: market,
        title: metadata.title,
        subtitle: metadata.subtitle || null,
        description: metadata.description || null,
        developer_name: metadata.developer_name || null,
        app_icon_url: metadata.app_icon_url || null,
        screenshots: metadata.screenshots || [],
        version_hash: versionHash,
        fetched_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[MarketCache] Failed to warm cache:', error);
      return false;
    }

    console.log('[MarketCache] Cache warmed successfully');
    return true;
  }

  /**
   * Generate version hash for change detection
   * Uses same algorithm as backend to ensure consistency
   */
  private static generateVersionHash(data: {
    title: string;
    subtitle: string;
    description: string;
    developer_name: string;
    screenshots: any[];
  }): string {
    const hashInput = JSON.stringify({
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      developer_name: data.developer_name,
      screenshots: data.screenshots,
    });

    // Simple hash for browser environment
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache key (for React Query or other caching layers)
   */
  static getCacheKey(appId: string, market: MarketCode, platform: 'ios' | 'android'): string {
    return `app_metadata:${appId}:${market}:${platform}`;
  }

  /**
   * Get all cached markets for an app
   */
  static async getCachedMarkets(
    appId: string,
    platform: 'ios' | 'android',
    organizationId: string
  ): Promise<MarketCode[]> {
    const { data, error } = await supabase
      .from('app_metadata_cache')
      .select('locale')
      .eq('organization_id', organizationId)
      .eq('app_id', appId)
      .eq('platform', platform)
      .order('locale', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((entry) => entry.locale as MarketCode);
  }
}
