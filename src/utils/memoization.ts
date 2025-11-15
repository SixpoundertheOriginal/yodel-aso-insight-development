/**
 * Memoization Utilities
 *
 * Provides LRU cache-based memoization for expensive calculations.
 * Used to cache ASO Intelligence Layer computations.
 *
 * Key Features:
 * - TTL-based cache invalidation
 * - LRU eviction policy (maxSize limit)
 * - Hash-based cache keys for complex inputs
 * - Deep equality comparison for objects/arrays
 */

// Simple hash function for generating cache keys
export const hashCode = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

// Simple deep equality check
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

// LRU Cache implementation
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, { value: V; timestamp: number }>;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 300000) {
    // 5 min default
    this.maxSize = maxSize;
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to update position)
    this.cache.delete(key);

    // Add to end
    this.cache.set(key, { value, timestamp: Date.now() });

    // Evict least recently used if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Memoization wrapper with TTL and LRU eviction
export interface MemoizeOptions {
  maxSize?: number; // Max cache entries
  ttl?: number; // Time to live in ms
  keyGenerator?: (...args: any[]) => string; // Custom key generator
}

export const memoizeWithTTL = <T extends (...args: any[]) => any>(
  fn: T,
  options: MemoizeOptions = {}
): T => {
  const {
    maxSize = 100,
    ttl = 300000, // 5 minutes default
    keyGenerator = (...args: any[]) => hashCode(JSON.stringify(args)),
  } = options;

  const cache = new LRUCache<string, ReturnType<T>>(maxSize, ttl);

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);

    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      console.log(`✅ [MEMOIZE] Cache HIT for ${fn.name}`);
      return cached;
    }

    // Compute and cache
    console.log(`❌ [MEMOIZE] Cache MISS for ${fn.name}, computing...`);
    const result = fn(...args);
    cache.set(key, result);

    return result;
  }) as T;
};

// Specialized memoization for ASO Intelligence functions
export const memoizeIntelligence = <T extends (...args: any[]) => any>(fn: T): T => {
  return memoizeWithTTL(fn, {
    maxSize: 50, // Enterprise scale: 50 different filter combinations
    ttl: 600000, // 10 minutes (intelligence calculations are expensive)
    keyGenerator: (...args: any[]) => {
      // Custom key generator for intelligence functions
      // Only hash the actual data, not metadata
      const dataOnly = args.map((arg) => {
        if (Array.isArray(arg)) {
          // For timeseries, only hash length + first/last dates
          return arg.length > 0
            ? `${arg.length}-${arg[0]?.date}-${arg[arg.length - 1]?.date}`
            : '0';
        }
        return arg;
      });
      return hashCode(JSON.stringify(dataOnly));
    },
  });
};

// Cache statistics (for debugging)
export class CacheStats {
  private hits: number = 0;
  private misses: number = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }

  report(): void {
    console.log('[CACHE-STATS]', {
      hits: this.hits,
      misses: this.misses,
      hitRate: `${(this.getHitRate() * 100).toFixed(2)}%`,
    });
  }
}

export const globalCacheStats = new CacheStats();
