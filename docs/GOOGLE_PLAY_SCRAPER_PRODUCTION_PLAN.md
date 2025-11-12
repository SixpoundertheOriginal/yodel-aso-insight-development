# Google Play Scraper - Production Implementation Plan

## Current Status ✅

**Working:**
- Frontend iOS/Android platform toggle
- Android app search UI
- Edge function deployment
- Basic package ID extraction
- Zero external dependencies (pure Deno)

**Needs Improvement:**
- ❌ App names showing package IDs instead of real names
- ❌ Developer names showing "Unknown"
- ❌ Icons are placeholder URLs
- ❌ Ratings, installs, prices are default values
- ❌ No rate limiting or caching
- ❌ No ethical safeguards

---

## Phase 2: Production-Ready Implementation

### 1. Enhanced Metadata Extraction 🎯

**Current Problem:**
```json
{
  "app_name": "com.spotify.music",  // Should be "Spotify: Music and Podcasts"
  "developer_name": "Unknown",       // Should be "Spotify AB"
  "app_rating": 0,                   // Should be 4.5
  "app_icon_url": "placeholder"      // Should be real CDN URL
}
```

**Solution: Use Google Play's Internal Data Structures**

Google Play embeds JSON data in `<script>` tags:
```javascript
// Pattern 1: AF_initDataCallback
AF_initDataCallback({key: 'ds:3', data: [[[app data here]]]});

// Pattern 2: window.APP_STATE
window.APP_STATE = {...};
```

**Implementation Strategy:**
1. Fetch HTML with proper User-Agent
2. Extract `<script>` tags containing structured data
3. Parse JSON from script tags
4. Extract metadata:
   - App name from title/structured data
   - Developer from structured data
   - Rating from structured data
   - Icon URL from img src or structured data
   - Install count from structured data
   - Price from structured data

**Code Structure:**
```typescript
class EnhancedGooglePlayScraper {
  // Extract structured data from script tags
  private extractStructuredData(html: string): any;

  // Parse app info from structured data
  private parseAppFromStructuredData(data: any): GooglePlayApp;

  // Fallback to HTML parsing if structured data fails
  private parseAppFromHtml(html: string): GooglePlayApp;
}
```

---

### 2. Ethical & Legal Considerations ⚖️

**A. Robots.txt Compliance**

Check Google Play's robots.txt:
```
https://play.google.com/robots.txt
```

Key considerations:
- Respect `User-agent: *` directives
- Respect `Crawl-delay` if specified
- Don't access disallowed paths
- Identify our scraper with proper User-Agent

**B. Terms of Service**

Google's TOS considerations:
- ✅ Public data only (no authentication required)
- ✅ Reasonable request rate
- ✅ Caching to minimize requests
- ❌ Don't overwhelm servers
- ❌ Don't circumvent rate limiting

**C. User-Agent Identification**

```typescript
const USER_AGENT = 'YodelASO-ReviewBot/1.0 (+https://your-domain.com/bot-info)';
```

Benefits:
- Transparent about who we are
- Google can contact us if issues
- Shows we're legitimate business tool
- Ethical best practice

**D. Rate Limiting**

Implement respectful rate limits:
- Max 1 request per second per IP
- Max 100 requests per hour per organization
- Exponential backoff on errors
- Circuit breaker if repeated failures

---

### 3. Security 🔒

**A. Input Validation**

```typescript
function validatePackageId(packageId: string): boolean {
  // Package IDs must match: com.company.app
  const pattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
  return pattern.test(packageId);
}

function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could be injection attempts
  return query.replace(/[^\w\s-]/g, '').trim().slice(0, 100);
}
```

**B. Error Handling**

```typescript
try {
  const response = await fetch(url);

  if (response.status === 429) {
    throw new RateLimitError('Too many requests');
  }

  if (response.status === 404) {
    throw new NotFoundError('App not found');
  }

  if (!response.ok) {
    throw new ScraperError(`HTTP ${response.status}`);
  }
} catch (error) {
  // Log error, return graceful failure
  console.error('[SCRAPER] Error:', error);
  return { success: false, error: error.message };
}
```

**C. No Sensitive Data**

- ✅ Only scrape public app store data
- ✅ No user personal information
- ✅ No authentication tokens
- ✅ No private app data

**D. Secure Headers**

```typescript
headers: {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  // No credentials, no sensitive data
}
```

---

### 4. Scalability 📈

**A. Caching Strategy**

```typescript
interface CacheEntry {
  data: GooglePlayApp;
  timestamp: number;
  ttl: number; // Time to live in seconds
}

class ScraperCache {
  private cache = new Map<string, CacheEntry>();

  set(key: string, data: GooglePlayApp, ttl: number = 3600) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000
    });
  }

  get(key: string): GooglePlayApp | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }
}
```

**Cache TTLs:**
- Search results: 1 hour
- App details: 6 hours
- App reviews: 30 minutes

**B. Rate Limiting**

```typescript
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number = 60; // per minute

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);

      console.log(`[RATE-LIMITER] Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}
```

**C. Circuit Breaker**

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try again
      if (Date.now() - this.lastFailure > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      // Success - reset failures
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      // Open circuit after 5 failures
      if (this.failures >= 5) {
        this.state = 'open';
      }

      throw error;
    }
  }
}
```

**D. Request Batching**

For bulk operations:
```typescript
async searchMultipleApps(queries: string[]): Promise<GooglePlayApp[][]> {
  // Batch with delays between requests
  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];

    // Rate limit check
    await this.rateLimiter.checkLimit();

    // Execute search
    const apps = await this.searchApps(query);
    results.push(apps);

    // Small delay between requests (1 second)
    if (i < queries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
```

---

### 5. Monitoring & Observability 📊

**A. Structured Logging**

```typescript
interface ScraperLog {
  timestamp: string;
  operation: 'search' | 'app_details' | 'reviews';
  packageId?: string;
  query?: string;
  success: boolean;
  duration_ms: number;
  error?: string;
  cached?: boolean;
}

function logOperation(log: ScraperLog) {
  console.log(JSON.stringify(log));
}
```

**B. Metrics to Track**

- Total requests per hour
- Cache hit rate
- Average response time
- Error rate by type (404, 429, 500, timeout)
- Rate limiter delays
- Circuit breaker state changes

**C. Health Checks**

```typescript
async healthCheck(): Promise<HealthStatus> {
  return {
    status: 'healthy',
    cache_size: this.cache.size,
    circuit_breaker: this.circuitBreaker.state,
    rate_limit_remaining: this.rateLimiter.remaining(),
    last_request: this.lastRequestTime,
    uptime_seconds: process.uptime()
  };
}
```

---

## Implementation Priority

### Phase 2.1: Enhanced Metadata (Week 1) ⭐⭐⭐
- [ ] Extract structured data from script tags
- [ ] Parse proper app names
- [ ] Parse developer names
- [ ] Parse ratings and install counts
- [ ] Extract real icon URLs
- [ ] Fallback to HTML parsing

### Phase 2.2: Ethical & Security (Week 1) ⭐⭐⭐
- [ ] Add proper User-Agent identification
- [ ] Implement input validation
- [ ] Add robots.txt check
- [ ] Implement error handling
- [ ] Add request timeout (10 seconds)

### Phase 2.3: Caching (Week 2) ⭐⭐
- [ ] Implement in-memory cache
- [ ] Add TTL expiration
- [ ] Cache search results (1 hour)
- [ ] Cache app details (6 hours)

### Phase 2.4: Rate Limiting (Week 2) ⭐⭐
- [ ] Implement rate limiter (60 req/min)
- [ ] Add exponential backoff
- [ ] Implement circuit breaker
- [ ] Add request delays (1 second between requests)

### Phase 2.5: Monitoring (Week 3) ⭐
- [ ] Structured logging
- [ ] Health check endpoint
- [ ] Error metrics
- [ ] Performance metrics

---

## Success Criteria

**Metadata Quality:**
- ✅ 95%+ apps have correct names
- ✅ 90%+ apps have developer names
- ✅ 90%+ apps have correct ratings
- ✅ 95%+ apps have icon URLs

**Performance:**
- ✅ Cache hit rate > 70%
- ✅ Average response time < 2 seconds
- ✅ Error rate < 5%

**Ethics & Compliance:**
- ✅ Respects robots.txt
- ✅ Rate limited to 60 req/min
- ✅ Identifies with proper User-Agent
- ✅ No TOS violations

**Scalability:**
- ✅ Handles 1000+ requests/hour
- ✅ Graceful degradation under load
- ✅ Circuit breaker prevents cascading failures

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google changes HTML structure | High | Fallback parsers, structured data first |
| Rate limiting by Google | Medium | Caching, request delays, circuit breaker |
| TOS violation concerns | High | Legal review, proper User-Agent, respectful scraping |
| Inaccurate metadata | Medium | Multiple parsing strategies, validation |
| Performance degradation | Medium | Caching, async operations, timeouts |

---

## Alternative: Official Google Play API

**Consideration:** Google Play Developer API exists but:
- ❌ Requires app ownership (can't search competitor apps)
- ❌ Limited to apps you publish
- ❌ Doesn't provide public search results
- ❌ Not suitable for competitive intelligence

**Conclusion:** Web scraping is the appropriate solution for this use case.

---

## Next Steps

1. **Review & Approval** - Get stakeholder approval on approach
2. **Legal Review** - Confirm TOS compliance
3. **Implementation** - Start with Phase 2.1 (metadata extraction)
4. **Testing** - Test with 10+ popular apps
5. **Deployment** - Gradual rollout with monitoring
6. **Documentation** - Update API docs and user guides

---

**Created:** 2025-11-12
**Status:** Planning
**Owner:** Engineering Team
**Estimated Effort:** 3 weeks
