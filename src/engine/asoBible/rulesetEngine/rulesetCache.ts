/**
 * Ruleset Cache
 *
 * Phase 12: In-memory cache for merged rulesets
 *
 * Responsibilities:
 * - Cache merged rulesets by vertical/market/client key
 * - TTL-based eviction (default 5 minutes)
 * - LRU eviction (max 100 entries)
 * - Dev logging for cache hits/misses
 */

import type { MergedRuleSet } from './rulesetMerger';

// ============================================================================
// Types
// ============================================================================

export type RulesetCacheKey = string;

interface CachedRulesetEntry {
  ruleset: MergedRuleSet;
  createdAt: number;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 100;

// ============================================================================
// In-Memory Cache
// ============================================================================

const cache = new Map<RulesetCacheKey, CachedRulesetEntry>();

// ============================================================================
// Cache API
// ============================================================================

/**
 * Build cache key from identifiers
 *
 * Format: {vertical}:{market}:{orgId}:{appId}
 *
 * @param vertical - Vertical ID
 * @param market - Market ID
 * @param organizationId - Organization ID (optional)
 * @param appId - App ID (optional)
 * @returns Cache key string
 */
export function buildCacheKey(
  vertical?: string,
  market?: string,
  organizationId?: string,
  appId?: string
): RulesetCacheKey {
  return `${vertical || 'base'}:${market || 'global'}:${organizationId || 'none'}:${appId || 'none'}`;
}

/**
 * Get cached ruleset
 *
 * @param key - Cache key
 * @param ttlMs - TTL in milliseconds (default 5 minutes)
 * @returns Cached ruleset or null if not found/expired
 */
export function getCachedRuleset(
  key: RulesetCacheKey,
  ttlMs: number = DEFAULT_TTL_MS
): MergedRuleSet | null {
  const entry = cache.get(key);

  if (!entry) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RuleSet Cache] MISS key=${key}`);
    }
    return null;
  }

  // Check TTL
  const age = Date.now() - entry.createdAt;
  if (age > ttlMs) {
    cache.delete(key);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RuleSet Cache] EXPIRED key=${key}, age=${Math.round(age / 1000)}s`);
    }
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[RuleSet Cache] HIT key=${key}, age=${Math.round(age / 1000)}s`);
  }

  return entry.ruleset;
}

/**
 * Set cached ruleset
 *
 * @param key - Cache key
 * @param ruleset - Merged ruleset to cache
 */
export function setCachedRuleset(key: RulesetCacheKey, ruleset: MergedRuleSet): void {
  // LRU eviction: If cache is full, remove oldest entry
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[RuleSet Cache] EVICT key=${oldestKey} (LRU, max=${MAX_CACHE_ENTRIES})`);
    }
  }

  cache.set(key, {
    ruleset,
    createdAt: Date.now(),
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[RuleSet Cache] SET key=${key}, size=${cache.size}`);
  }
}

/**
 * Invalidate specific cached ruleset
 *
 * @param key - Cache key to invalidate
 */
export function invalidateRuleset(key: RulesetCacheKey): void {
  const existed = cache.delete(key);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[RuleSet Cache] INVALIDATE key=${key}, existed=${existed}`);
  }
}

/**
 * Clear entire cache
 */
export function clearRulesetCache(): void {
  const size = cache.size;
  cache.clear();

  if (process.env.NODE_ENV === 'development') {
    console.log(`[RuleSet Cache] CLEAR, cleared ${size} entries`);
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_ENTRIES,
    ttlMs: DEFAULT_TTL_MS,
  };
}
