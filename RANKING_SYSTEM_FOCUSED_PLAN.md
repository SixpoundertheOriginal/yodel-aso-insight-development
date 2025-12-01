# Keyword Ranking System - Focused Implementation Plan

**Date:** 2025-01-12
**Focus:** iOS only, Top 10 markets, Production-ready security & performance
**Timeline:** 3 weeks

---

## 🎯 SCOPE (Based on Your Answers)

### ✅ IN SCOPE
- **Platform:** iOS only (iTunes Search API)
- **Markets:** Top 10 countries (US, UK, CA, AU, DE, FR, ES, IT, JP, KR)
- **Rate Limiting:** Hybrid (organization + per-user limits)
- **Monitoring:** Supabase built-in logs
- **Security:** Full authentication & authorization
- **Performance:** Batch queries, rate limiting, retries

### ❌ OUT OF SCOPE (For Later)
- ⏸️ Search volume data (separate feature)
- ⏸️ Android/Google Play support (after iOS perfection)
- ⏸️ Advanced monitoring (Sentry/Datadog)
- ⏸️ Competitor tracking (Phase 4)
- ⏸️ AI features (Phase 5)

---

## 📅 3-WEEK IMPLEMENTATION PLAN

### Week 1: Critical Security & Scalability

#### Day 1-2: Authentication & Authorization
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Add JWT token validation
2. ✅ Verify user authentication
3. ✅ Check organization access via user_roles
4. ✅ Add security logging

**Code:**
```typescript
// Extract and verify JWT
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return error401('Missing Authorization header');
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  return error401('Invalid token');
}

// Verify org access
const { data: orgAccess } = await supabase
  .from('user_roles')
  .select('id, role')
  .eq('user_id', user.id)
  .eq('organization_id', organizationId)
  .single();

if (!orgAccess) {
  return error403('No access to organization');
}
```

#### Day 3: Input Validation
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Validate combos array (max 100 per request)
2. ✅ Validate combo length (max 100 chars)
3. ✅ Validate country codes (whitelist top 10)
4. ✅ Validate appId format (numeric only)

**Code:**
```typescript
const MAX_COMBOS_PER_REQUEST = 100;
const MAX_COMBO_LENGTH = 100;
const SUPPORTED_COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'kr'];

// Validate combos count
if (combos.length > MAX_COMBOS_PER_REQUEST) {
  return error400(`Maximum ${MAX_COMBOS_PER_REQUEST} combos per request`);
}

// Validate each combo
for (const combo of combos) {
  if (!combo || combo.trim().length === 0) {
    return error400('Empty combo not allowed');
  }
  if (combo.length > MAX_COMBO_LENGTH) {
    return error400(`Combo exceeds ${MAX_COMBO_LENGTH} characters`);
  }
}

// Validate country
if (!SUPPORTED_COUNTRIES.includes(country)) {
  return error400(`Unsupported country. Use: ${SUPPORTED_COUNTRIES.join(', ')}`);
}

// Validate appId
if (!/^\d+$/.test(appId)) {
  return error400('appId must be numeric');
}
```

#### Day 4-5: Batch Cache Query (HUGE PERFORMANCE WIN)
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Replace sequential cache checks with single batch query
2. ✅ Use JOIN instead of RPC calls in loop
3. ✅ Add proper indexes for batch queries

**Performance:**
- **Before:** 50 queries × 100ms = 5 seconds
- **After:** 1 query × 150ms = 0.15 seconds
- **33x faster!** 🚀

**Code:**
```typescript
async function getBatchCachedRankings(
  supabase: any,
  appUUID: string,
  combos: string[],
  platform: string,
  country: string
): Promise<Map<string, ComboRankingResult>> {
  // Single query for all combos
  const { data, error } = await supabase
    .from('keywords')
    .select(`
      keyword,
      keyword_rankings!inner(
        position,
        is_ranking,
        snapshot_date,
        position_change,
        trend,
        visibility_score
      )
    `)
    .eq('app_id', appUUID)
    .eq('platform', platform)
    .eq('region', country)
    .in('keyword', combos)
    .order('keyword_rankings.snapshot_date', { ascending: false });

  const resultsMap = new Map();
  const now = new Date();

  for (const row of data || []) {
    const latestRanking = row.keyword_rankings[0];
    const hoursSince = (now - new Date(latestRanking.snapshot_date)) / 3600000;

    if (hoursSince < 24) {
      resultsMap.set(row.keyword, {
        combo: row.keyword,
        position: latestRanking.position,
        isRanking: latestRanking.is_ranking,
        // ... rest
      });
    }
  }

  return resultsMap;
}
```

**Migration:**
```sql
-- Add index for batch lookup
CREATE INDEX IF NOT EXISTS idx_keywords_batch_lookup
  ON keywords(app_id, platform, region)
  INCLUDE (keyword, keyword_type, is_tracked)
  WHERE keyword_type = 'combo' AND is_tracked = true;
```

---

### Week 2: Robustness & Rate Limiting

#### Day 6-7: iTunes API Rate Limiter
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Implement token bucket rate limiter
2. ✅ Respect iTunes API limits (~20 req/10s)
3. ✅ Handle 429 responses
4. ✅ Add exponential backoff

**Code:**
```typescript
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens = 20;
  private readonly refillRate = 2;  // tokens/second

  constructor() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    // Refill tokens
    const elapsed = (Date.now() - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + (elapsed * this.refillRate));
    this.lastRefill = Date.now();

    // Wait if no tokens
    if (this.tokens < 1) {
      const waitMs = (1 - this.tokens) / this.refillRate * 1000;
      console.log(`[RateLimiter] Waiting ${waitMs}ms`);
      await delay(waitMs);
      this.tokens = 1;
    }

    this.tokens -= 1;
  }
}

const itunesRateLimiter = new RateLimiter();

// Use before each iTunes API call:
await itunesRateLimiter.waitForToken();
const response = await fetch(searchUrl);

// Handle rate limit response
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || '60';
  await delay(parseInt(retryAfter) * 1000);
  return fetchAndStoreRanking(...);  // Retry once
}
```

#### Day 8: User/Org Rate Limiting
**Files:**
- `supabase/migrations/XXXXX_add_rate_limiting.sql`
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Create rate_limits table
2. ✅ Track requests per user + org
3. ✅ Implement hybrid limits

**Schema:**
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_id, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_lookup
  ON rate_limits(organization_id, user_id, endpoint, window_start DESC);
```

**Limits:**
```typescript
const RATE_LIMITS = {
  // Per-user limits (prevent single power user abuse)
  user: {
    perHour: 100,    // 100 requests/hour per user
    perDay: 1000,    // 1000 requests/day per user
  },
  // Per-org limits (shared across team)
  org: {
    perHour: 500,    // 500 requests/hour per org
    perDay: 5000,    // 5000 requests/day per org
  },
};

async function checkRateLimit(userId: string, orgId: string): Promise<boolean> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000);

  // Check user limit
  const { count: userCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('endpoint', 'check-combo-rankings')
    .gte('window_start', hourAgo);

  if (userCount >= RATE_LIMITS.user.perHour) {
    return false;  // User limit exceeded
  }

  // Check org limit
  const { count: orgCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .eq('endpoint', 'check-combo-rankings')
    .gte('window_start', hourAgo);

  if (orgCount >= RATE_LIMITS.org.perHour) {
    return false;  // Org limit exceeded
  }

  // Record this request
  await supabase.from('rate_limits').insert({
    user_id: userId,
    organization_id: orgId,
    endpoint: 'check-combo-rankings',
    requests_count: 1,
  });

  return true;
}
```

#### Day 9-10: Retry Logic & Circuit Breaker
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Exponential backoff retry
2. ✅ Circuit breaker for iTunes API
3. ✅ Request timeout (10s)

**Code:**
```typescript
// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries - 1) throw err;

      // Don't retry non-transient errors
      if (err.message?.includes('404') || err.message?.includes('401')) {
        throw err;
      }

      const delayMs = 1000 * Math.pow(2, attempt);  // 1s, 2s, 4s
      console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
      await delay(delayMs);
    }
  }
  throw new Error('Should never reach');
}

// Circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN - iTunes API unavailable');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= 5) this.state = 'OPEN';
      throw err;
    }
  }
}

const itunesCircuitBreaker = new CircuitBreaker();

// Request timeout
async function fetchWithTimeout(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timeout after 10s');
    }
    throw err;
  }
}

// Combined usage:
const response = await retryWithBackoff(() =>
  itunesCircuitBreaker.execute(() =>
    fetchWithTimeout(searchUrl)
  )
);
```

---

### Week 3: Performance & Monitoring

#### Day 11-12: Database Optimizations
**Files:**
- `supabase/migrations/XXXXX_ranking_performance_indexes.sql`

**Tasks:**
1. ✅ Add missing indexes
2. ✅ Optimize Supabase client usage
3. ✅ Add database connection pooling

**Migrations:**
```sql
-- Index for latest ranking queries
CREATE INDEX IF NOT EXISTS idx_rankings_latest_by_keyword
  ON keyword_rankings(keyword_id, snapshot_date DESC)
  INCLUDE (position, is_ranking, trend, position_change);

-- Index for org-wide analytics
CREATE INDEX IF NOT EXISTS idx_keywords_org_analytics
  ON keywords(organization_id, keyword_type, is_tracked, platform, region);

-- Index for stale ranking detection
CREATE INDEX IF NOT EXISTS idx_rankings_stale_detection
  ON keyword_rankings(keyword_id, snapshot_date DESC)
  WHERE snapshot_date < CURRENT_DATE - INTERVAL '1 day';
```

**Client Optimization:**
```typescript
// Create client once at module level (not per request)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  global: {
    headers: { 'X-Client-Info': 'check-combo-rankings-v1' },
  },
});

serve(async (req) => {
  // ✅ Reuse client across requests
  ...
});
```

#### Day 13: Request Deduplication
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ In-flight request cache
2. ✅ Prevent duplicate fetches
3. ✅ Reduce API quota waste

**Code:**
```typescript
const inFlightRequests = new Map<string, Promise<ComboRankingResult>>();

async function fetchAndStoreRanking(...): Promise<ComboRankingResult> {
  const cacheKey = `${appId}:${combo}:${country}:${platform}`;

  // Check if already fetching
  if (inFlightRequests.has(cacheKey)) {
    console.log(`[Dedup] Reusing in-flight request for "${combo}"`);
    return await inFlightRequests.get(cacheKey)!;
  }

  // Start new request
  const promise = (async () => {
    try {
      // ... fetch logic
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return await promise;
}
```

#### Day 14-15: Monitoring & Logging
**Files:**
- `supabase/functions/check-combo-rankings/index.ts`

**Tasks:**
1. ✅ Structured logging
2. ✅ Performance metrics
3. ✅ Error tracking
4. ✅ Success rate monitoring

**Code:**
```typescript
interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  metadata?: any;
}

function logEvent(level: LogEvent['level'], event: string, metadata?: any) {
  const logEntry: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    event,
    metadata,
  };
  console.log(JSON.stringify(logEntry));
}

// Usage throughout:
logEvent('info', 'request_started', {
  appId,
  combosCount: combos.length,
  country,
  userId: user.id,
  orgId: organizationId,
});

logEvent('info', 'cache_status', {
  cached: cachedResults.length,
  fresh: freshResults.length,
  cacheHitRate: (cachedResults.length / combos.length * 100).toFixed(1) + '%',
});

logEvent('info', 'itunes_api_call', {
  combo,
  duration: Date.now() - startTime,
  position: finalPosition,
});

logEvent('error', 'itunes_api_error', {
  combo,
  error: err.message,
  statusCode: err.statusCode,
});

logEvent('info', 'request_completed', {
  duration: Date.now() - requestStart,
  totalCombos: combos.length,
  rankingCount: results.filter(r => r.isRanking).length,
  errorCount: results.filter(r => r.error).length,
});
```

**Supabase Dashboard Queries:**
```sql
-- Success rate (last hour)
SELECT
  COUNT(*) FILTER (WHERE event = 'request_completed') as total,
  COUNT(*) FILTER (WHERE level = 'error') as errors,
  (1 - COUNT(*) FILTER (WHERE level = 'error')::float / COUNT(*))::numeric(5,4) as success_rate
FROM logs
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Average response time
SELECT
  AVG((metadata->>'duration')::int) as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration')::int) as p95_ms
FROM logs
WHERE event = 'request_completed'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Cache hit rate
SELECT
  AVG((metadata->>'cacheHitRate')::float) as avg_cache_hit_rate
FROM logs
WHERE event = 'cache_status'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Rate limit violations
SELECT COUNT(*)
FROM logs
WHERE event = 'rate_limit_exceeded'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

---

## 🎯 SUCCESS METRICS

### Performance Targets
- ✅ Cache hit rate: >80%
- ✅ P95 response time: <3 seconds
- ✅ iTunes API error rate: <1%
- ✅ Edge function timeout rate: <0.1%

### Security Targets
- ✅ 100% authenticated requests
- ✅ 0 unauthorized access attempts succeed
- ✅ Input validation: 100% coverage
- ✅ Rate limits enforced: 100%

### Reliability Targets
- ✅ Uptime: >99.9%
- ✅ Retry success rate: >95%
- ✅ Circuit breaker activations: <5/day
- ✅ Data accuracy: 100%

---

## 📦 DELIVERABLES

### Week 1
- ✅ Edge function with authentication
- ✅ Input validation (top 10 countries)
- ✅ Batch cache query (33x faster)
- ✅ Database migration for indexes

### Week 2
- ✅ iTunes API rate limiter
- ✅ Hybrid user/org rate limiting
- ✅ Retry logic with backoff
- ✅ Circuit breaker implementation
- ✅ Request timeout handling

### Week 3
- ✅ Database performance indexes
- ✅ Request deduplication
- ✅ Structured logging
- ✅ Supabase dashboard queries
- ✅ Performance monitoring

### Documentation
- ✅ API documentation
- ✅ Rate limit documentation
- ✅ Supported countries list
- ✅ Error code reference
- ✅ Monitoring playbook

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Edge function deployed to staging
- [ ] Load testing completed
- [ ] Rate limits configured
- [ ] Monitoring dashboards ready

### Deployment Steps
1. [ ] Deploy database migrations
2. [ ] Deploy edge function
3. [ ] Test with Inspire Wellness app
4. [ ] Monitor logs for 1 hour
5. [ ] Check error rates
6. [ ] Verify cache hit rates
7. [ ] Test rate limiting

### Post-Deployment
- [ ] Monitor for 24 hours
- [ ] Review logs daily for week 1
- [ ] Adjust rate limits if needed
- [ ] Document any issues
- [ ] Collect user feedback

---

## 📊 COST ESTIMATE

### Infrastructure (Monthly)
```
Supabase Edge Functions:
- 100K invocations/month × $0.000018 = $1.80

Supabase Database:
- 10M queries/month × $0.0000004 = $4.00
- Storage (1GB rankings) = $0.025

Total: ~$6/month
```

### Savings vs Current
```
Before optimization: ~$380/month
After optimization: ~$6/month
Savings: $374/month (98% reduction!)
```

---

## 📝 NEXT STEPS

### Immediate (This Week)
1. **Start Phase 1 implementation** - authentication + batch queries
2. **Create database migrations** - indexes for performance
3. **Test with Inspire Wellness** - verify improvements
4. **Deploy to staging** - validate before production

### Future (After 3 Weeks)
1. **Search volume integration** (separate project)
2. **Android support** (after iOS perfection)
3. **Advanced features** (competitor tracking, alerts)
4. **International expansion** (beyond top 10 countries)

---

**Ready to start implementation! Should we begin with Phase 1 (authentication + batch queries)?** 🚀
