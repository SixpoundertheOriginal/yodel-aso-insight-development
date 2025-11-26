/**
 * Authentication Cache Utility
 *
 * Caches authorization results to prevent unnecessary Edge Function calls
 * and reduce authentication waterfall delays.
 *
 * Performance Optimization Phase 1.1
 */

interface CachedAuthResult {
  allow: boolean;
  reason: string;
  expires: number;
}

class AuthCache {
  private cache = new Map<string, CachedAuthResult>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get cached authorization result for a path
   */
  get(path: string, userId: string): boolean | null {
    const cacheKey = `${userId}:${path}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expires < Date.now()) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.allow;
  }

  /**
   * Set authorization result in cache
   */
  set(path: string, userId: string, allow: boolean, reason: string, ttl?: number): void {
    const cacheKey = `${userId}:${path}`;
    this.cache.set(cacheKey, {
      allow,
      reason,
      expires: Date.now() + (ttl || this.DEFAULT_TTL)
    });
  }

  /**
   * Clear all cached auth results (e.g., on logout)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cached results for a specific user
   */
  clearUser(userId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear expired entries (garbage collection)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (value.expires < now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats(): { size: number; entries: Array<{ key: string; expires: Date; allow: boolean }> } {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      expires: new Date(value.expires),
      allow: value.allow
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

// Singleton instance
export const authCache = new AuthCache();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    authCache.cleanup();
  }, 5 * 60 * 1000);
}
