/**
 * Token Bucket Rate Limiter
 *
 * Ensures API rate limits are respected across all requests.
 * Uses token bucket algorithm for smooth rate limiting.
 *
 * Phase A: Critical for preventing IP blocks and service disruption
 */

export class RateLimiter {
  private tokens: number;
  private lastRefill: number; // timestamp in ms
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire tokens before making a request
   * Waits if insufficient tokens available
   *
   * @param cost - Number of tokens to acquire (default: 1)
   */
  async acquire(cost: number = 1): Promise<void> {
    this.refill();

    // If we have enough tokens, consume immediately
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return;
    }

    // Calculate wait time needed
    const tokensNeeded = cost - this.tokens;
    const waitTimeMs = (tokensNeeded / this.refillRate) * 1000;

    console.log(`[RATE-LIMITER] Waiting ${waitTimeMs.toFixed(0)}ms for ${tokensNeeded} tokens`);

    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, waitTimeMs));

    // Refill and consume
    this.refill();
    this.tokens -= cost;
  }

  /**
   * Try to acquire tokens without waiting
   * Returns false if insufficient tokens
   *
   * @param cost - Number of tokens to acquire
   * @returns true if acquired, false otherwise
   */
  tryAcquire(cost: number = 1): boolean {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedSec = elapsedMs / 1000;

    // Calculate new tokens to add
    const newTokens = elapsedSec * this.refillRate;

    // Add tokens up to max capacity
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Get number of tokens currently available
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get rate limiter status for monitoring
   */
  getStatus(): RateLimiterStatus {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      utilization: 1 - (this.tokens / this.maxTokens), // 0-1
    };
  }

  /**
   * Reset rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

export interface RateLimiterStatus {
  availableTokens: number;
  maxTokens: number;
  refillRate: number;
  utilization: number; // 0-1, percentage of capacity used
}

/**
 * Rate Limiter Factory
 * Pre-configured limiters for different sources
 */
export class RateLimiterFactory {
  /**
   * iTunes API Rate Limiter
   * Conservative limit: 100 requests per minute
   */
  static createItunesLimiter(): RateLimiter {
    return new RateLimiter(
      100, // Max 100 requests
      100 / 60 // Refill at 100 per minute (~1.67/sec)
    );
  }

  /**
   * HTML Scraping Rate Limiter
   * Very conservative: 10 requests per minute with delays
   */
  static createHtmlScrapingLimiter(): RateLimiter {
    return new RateLimiter(
      10, // Max 10 requests
      10 / 60 // Refill at 10 per minute (~0.17/sec)
    );
  }

  /**
   * Lookup API Rate Limiter
   * Same as Search API (they share rate limits)
   */
  static createLookupLimiter(): RateLimiter {
    return new RateLimiter(
      100, // Max 100 requests
      100 / 60 // Refill at 100 per minute (~1.67/sec)
    );
  }

  /**
   * Development/Testing Rate Limiter
   * Very permissive for testing
   */
  static createTestLimiter(): RateLimiter {
    return new RateLimiter(
      1000, // Max 1000 requests
      1000 / 60 // Refill at 1000 per minute (~16.67/sec)
    );
  }
}
