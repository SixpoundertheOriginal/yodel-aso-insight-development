# Review Data Persistence Architecture - COMPREHENSIVE AUDIT

**Date:** 2025-01-06
**Status:** 🔍 DESIGN PHASE
**Objective:** Architect enterprise-grade review caching system
**Complexity:** HIGH - Database + Caching + AI Processing

---

## Executive Summary

**Current Problem:**
When users click on a monitored app, they lose all previously analyzed review data and AI insights. Every reload requires:
- Re-fetching reviews from iTunes RSS (~2-5 seconds)
- Re-running AI sentiment analysis on all reviews (~1-3 seconds for 100 reviews)
- Re-computing themes, features, issues, insights (~1-2 seconds)

**Proposed Solution:**
Implement a multi-tier caching system that persists:
1. Raw review data from iTunes
2. AI-enhanced review analysis
3. Aggregated intelligence (themes, features, issues)
4. Snapshot comparisons over time

**Business Impact:**
- ✅ **Instant load times** - Sub-second vs 5-8 seconds
- ✅ **Historical tracking** - Compare reviews over time
- ✅ **Reduced API calls** - iTunes RSS rate limit protection
- ✅ **Better UX** - No re-analysis on every visit
- ✅ **Trend detection** - Track sentiment changes week-over-week

---

## 📊 Current Architecture Analysis

### Data Flow (Current State)

```
User Action: Click Monitored App
    ↓
1. Load app metadata from monitored_apps table (50ms)
    ↓
2. Call iTunes RSS API for reviews (2-5 seconds)
    ↓
3. Parse 50-200 reviews from XML
    ↓
4. Run AI sentiment analysis on each review (1-3 seconds)
    ↓
5. Extract themes, features, issues (1-2 seconds)
    ↓
6. Generate actionable insights
    ↓
7. Render UI with analysis
    ↓
❌ PROBLEM: All data lost when user navigates away
❌ PROBLEM: Full re-process on every return visit
❌ PROBLEM: No historical comparison possible
```

### Current Data Structures

#### 1. Raw Review (from iTunes RSS)
```typescript
interface ReviewItem {
  review_id: string;       // iTunes review ID
  title: string;          // Review title
  text: string;           // Review body (unlimited length)
  rating: number;         // 1-5 stars
  version?: string;       // App version reviewed
  author?: string;        // Reviewer name
  updated_at?: string;    // ISO timestamp
  country: string;        // Country code
  app_id: string;         // iTunes app ID
}
```

**Size Estimate:**
- Average review: 200-500 characters
- 100 reviews = ~40 KB raw data
- 1,000 reviews = ~400 KB

#### 2. Enhanced Review (with AI)
```typescript
interface EnhancedReviewItem extends ReviewItem {
  enhancedSentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number;  // 0-1
    emotions: {
      joy: number;
      frustration: number;
      excitement: number;
      disappointment: number;
      anger: number;
    };
    aspects: {
      ui_ux: 'positive' | 'neutral' | 'negative' | null;
      performance: 'positive' | 'neutral' | 'negative' | null;
      features: 'positive' | 'neutral' | 'negative' | null;
      pricing: 'positive' | 'neutral' | 'negative' | null;
      support: 'positive' | 'neutral' | 'negative' | null;
    };
    intensity: 'mild' | 'moderate' | 'strong' | 'extreme';
  };
  extractedThemes: string[];       // ["app crashes", "ui/ux design"]
  mentionedFeatures: string[];     // ["dark mode", "notifications"]
  identifiedIssues: string[];      // ["login failures", "sync errors"]
  businessImpact: 'high' | 'medium' | 'low';
}
```

**Size Estimate:**
- Enhanced data per review: +300-500 bytes
- 100 reviews = ~40 KB + ~40 KB = 80 KB total
- 1,000 reviews = ~800 KB total

#### 3. Aggregated Intelligence
```typescript
interface ReviewIntelligence {
  themes: Array<{
    theme: string;
    frequency: number;
    sentiment: number;
    examples: string[];
    trending: 'up' | 'down' | 'stable';
  }>;
  featureMentions: Array<{
    feature: string;
    mentions: number;
    sentiment: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  issuePatterns: Array<{
    issue: string;
    frequency: number;
    severity: 'critical' | 'major' | 'minor';
    affectedVersions: string[];
    firstSeen: Date;
  }>;
}
```

**Size Estimate:**
- Aggregated intelligence: ~5-10 KB per app
- Includes top 10 themes, top 10 features, top 10 issues

---

## 🏗️ Proposed Database Schema

### Table 1: `monitored_app_reviews` (Core Review Cache)

**Purpose:** Store raw + enhanced review data for quick retrieval

```sql
CREATE TABLE public.monitored_app_reviews (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- iTunes Identity
  review_id TEXT NOT NULL,           -- iTunes review ID (unique per app+country)
  app_store_id TEXT NOT NULL,        -- iTunes app ID
  country TEXT NOT NULL,             -- Country code

  -- Raw Review Data
  title TEXT,                        -- Review title
  text TEXT NOT NULL,                -- Review body
  rating SMALLINT NOT NULL,          -- 1-5 stars
  version TEXT,                      -- App version reviewed
  author TEXT,                       -- Reviewer name (anonymized)
  review_date TIMESTAMPTZ NOT NULL,  -- When review was posted

  -- AI-Enhanced Sentiment (JSONB for flexibility)
  enhanced_sentiment JSONB,          -- EnhancedSentiment object
  extracted_themes TEXT[],           -- Array of themes
  mentioned_features TEXT[],         -- Array of features
  identified_issues TEXT[],          -- Array of issues
  business_impact TEXT,              -- 'high', 'medium', 'low'

  -- Processing Metadata
  processed_at TIMESTAMPTZ,          -- When AI analysis was run
  processing_version TEXT,           -- AI model version (for re-processing)

  -- Tracking
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates (same review can't be stored twice)
  UNIQUE(monitored_app_id, review_id)
);

-- Indexes for Performance
CREATE INDEX idx_reviews_monitored_app ON monitored_app_reviews(monitored_app_id);
CREATE INDEX idx_reviews_org_app ON monitored_app_reviews(organization_id, app_store_id);
CREATE INDEX idx_reviews_date ON monitored_app_reviews(review_date DESC);
CREATE INDEX idx_reviews_rating ON monitored_app_reviews(rating);
CREATE INDEX idx_reviews_fetched ON monitored_app_reviews(fetched_at DESC);

-- GIN index for full-text search on review text
CREATE INDEX idx_reviews_text_search ON monitored_app_reviews USING GIN(to_tsvector('english', text));

-- GIN index for array searches (themes, features, issues)
CREATE INDEX idx_reviews_themes ON monitored_app_reviews USING GIN(extracted_themes);
CREATE INDEX idx_reviews_features ON monitored_app_reviews USING GIN(mentioned_features);
CREATE INDEX idx_reviews_issues ON monitored_app_reviews USING GIN(identified_issues);

-- Partial index for high-impact reviews
CREATE INDEX idx_reviews_high_impact ON monitored_app_reviews(monitored_app_id, review_date DESC)
  WHERE business_impact = 'high';

COMMENT ON TABLE monitored_app_reviews IS
  'Cached reviews with AI-enhanced sentiment analysis. Updated incrementally when users check monitored apps.';
```

**Size Estimates:**
- 100 reviews per app = ~100 KB
- 1,000 reviews per app = ~1 MB
- 10 monitored apps with 1,000 reviews each = ~10 MB
- **Scalable** to millions of reviews across organizations

---

### Table 2: `review_intelligence_snapshots` (Aggregated Intelligence)

**Purpose:** Store pre-computed intelligence for instant loading + historical comparison

```sql
CREATE TABLE public.review_intelligence_snapshots (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Snapshot Metadata
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviews_analyzed INTEGER NOT NULL,  -- How many reviews in this snapshot
  date_range_start TIMESTAMPTZ,       -- Optional: if filtered by date
  date_range_end TIMESTAMPTZ,

  -- Aggregated Intelligence (JSONB for flexibility)
  intelligence JSONB NOT NULL,        -- ReviewIntelligence object
  /*
    {
      themes: [{theme, frequency, sentiment, examples, trending}],
      featureMentions: [{feature, mentions, sentiment, impact}],
      issuePatterns: [{issue, frequency, severity, affectedVersions, firstSeen}]
    }
  */

  -- Actionable Insights (JSONB)
  actionable_insights JSONB,          -- ActionableInsights object
  /*
    {
      priorityIssues: [{issue, impact, affectedUsers, recommendation, urgency}],
      improvements: [{opportunity, userDemand, businessImpact, effort, roi}],
      alerts: [{type, severity, message, data, actionable}]
    }
  */

  -- Summary Stats
  total_reviews INTEGER,
  average_rating DECIMAL(3,2),
  sentiment_distribution JSONB,      -- {positive: n, neutral: n, negative: n}

  -- Version
  intelligence_version TEXT,          -- AI engine version for re-processing

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One snapshot per app per day (can query historical trends)
  UNIQUE(monitored_app_id, snapshot_date::DATE)
);

-- Indexes
CREATE INDEX idx_snapshots_monitored_app ON review_intelligence_snapshots(monitored_app_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_org ON review_intelligence_snapshots(organization_id);
CREATE INDEX idx_snapshots_date ON review_intelligence_snapshots(snapshot_date DESC);

COMMENT ON TABLE review_intelligence_snapshots IS
  'Pre-computed review intelligence for instant loading. One snapshot per app per day enables historical trend analysis.';
```

**Size Estimates:**
- 1 snapshot per app = ~10-20 KB
- 30 days of snapshots = ~300-600 KB per app
- 10 apps × 30 days = ~3-6 MB
- **Enables week-over-week, month-over-month trend charts**

---

### Table 3: `review_fetch_log` (Cache Invalidation & Rate Limiting)

**Purpose:** Track when reviews were last fetched to avoid unnecessary API calls

```sql
CREATE TABLE public.review_fetch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Fetch Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviews_fetched INTEGER,           -- How many new reviews
  reviews_updated INTEGER,           -- How many existing reviews updated
  cache_hit BOOLEAN DEFAULT false,   -- Was this served from cache?

  -- API Response Info
  itunes_api_status INTEGER,         -- HTTP status code
  fetch_duration_ms INTEGER,         -- Performance tracking
  error_message TEXT,                -- If fetch failed

  -- Rate Limiting
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,                   -- For rate limiting by IP

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fetch_log_app ON review_fetch_log(monitored_app_id, fetched_at DESC);
CREATE INDEX idx_fetch_log_user ON review_fetch_log(user_id, fetched_at DESC);

COMMENT ON TABLE review_fetch_log IS
  'Tracks review fetch operations for cache invalidation, rate limiting, and performance monitoring.';
```

---

## 🔄 Caching Strategy

### Tier 1: Database Cache (Primary)

**Storage:** `monitored_app_reviews` table
**TTL:** 7 days (configurable)
**Update Strategy:** Incremental

**Logic:**
```typescript
async function getReviews(monitoredAppId: string, forceRefresh = false) {
  // 1. Check cache age
  const lastFetch = await getLastFetchTime(monitoredAppId);
  const cacheAge = Date.now() - lastFetch.getTime();
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // 2. Serve from cache if fresh
  if (!forceRefresh && cacheAge < CACHE_TTL) {
    return await db.query(`
      SELECT * FROM monitored_app_reviews
      WHERE monitored_app_id = $1
      ORDER BY review_date DESC
      LIMIT 200
    `, [monitoredAppId]);
  }

  // 3. Fetch new reviews from iTunes
  const newReviews = await fetchFromItunesRSS(appStoreId, country);

  // 4. Identify new vs existing
  const existingReviewIds = await getExistingReviewIds(monitoredAppId);
  const reviewsToInsert = newReviews.filter(r => !existingReviewIds.has(r.review_id));

  // 5. Run AI analysis on new reviews only
  const enhancedReviews = await enhanceReviewsWithAI(reviewsToInsert);

  // 6. Bulk insert new reviews
  await db.insertMany('monitored_app_reviews', enhancedReviews);

  // 7. Update fetch log
  await logFetch(monitoredAppId, reviewsToInsert.length);

  // 8. Return all reviews (cached + new)
  return await getAllReviews(monitoredAppId);
}
```

### Tier 2: Intelligence Snapshot Cache

**Storage:** `review_intelligence_snapshots` table
**TTL:** 24 hours
**Update Strategy:** Daily regeneration

**Logic:**
```typescript
async function getIntelligence(monitoredAppId: string) {
  // 1. Check for today's snapshot
  const today = new Date().toISOString().split('T')[0];
  const snapshot = await db.queryOne(`
    SELECT * FROM review_intelligence_snapshots
    WHERE monitored_app_id = $1 AND snapshot_date::DATE = $2
  `, [monitoredAppId, today]);

  if (snapshot) {
    return snapshot.intelligence; // Instant return!
  }

  // 2. Generate fresh intelligence
  const reviews = await getReviews(monitoredAppId);
  const intelligence = extractReviewIntelligence(reviews);
  const insights = generateActionableInsights(reviews, intelligence);

  // 3. Save snapshot
  await db.insert('review_intelligence_snapshots', {
    monitored_app_id: monitoredAppId,
    snapshot_date: new Date(),
    reviews_analyzed: reviews.length,
    intelligence,
    actionable_insights: insights,
    total_reviews: reviews.length,
    average_rating: calculateAverage(reviews),
    sentiment_distribution: calculateSentiment(reviews)
  });

  return intelligence;
}
```

### Tier 3: Client-Side Cache (React Query)

**Storage:** React Query cache (in-memory)
**TTL:** 5 minutes
**Update Strategy:** Background refetch

```typescript
export const useMonitoredAppReviews = (monitoredAppId: string) => {
  return useQuery({
    queryKey: ['monitored-app-reviews', monitoredAppId],
    queryFn: () => fetchReviewsAPI(monitoredAppId),
    staleTime: 5 * 60 * 1000,           // 5 minutes
    cacheTime: 10 * 60 * 1000,          // 10 minutes
    refetchOnWindowFocus: false,        // Don't refetch on tab switch
    refetchInterval: 60 * 60 * 1000,    // Background refetch every hour
  });
};
```

---

## 🔐 Row Level Security (RLS) Policies

```sql
-- RLS on monitored_app_reviews
ALTER TABLE monitored_app_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org's reviews"
ON monitored_app_reviews FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'SUPER_ADMIN'
  )
);

-- RLS on review_intelligence_snapshots
ALTER TABLE review_intelligence_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org's snapshots"
ON review_intelligence_snapshots FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'SUPER_ADMIN'
  )
);
```

---

## ⚡ Performance Analysis

### Current Performance (No Cache)

| Operation | Time | Notes |
|-----------|------|-------|
| Fetch iTunes RSS | 2-5s | Network latency |
| Parse XML | 200-500ms | 100-200 reviews |
| AI Analysis | 1-3s | Sentiment extraction |
| Theme/Feature Extraction | 1-2s | Pattern matching |
| Render UI | 500ms | React rendering |
| **TOTAL** | **5-11s** | Poor UX |

### Proposed Performance (With Cache)

| Operation | Time | Notes |
|-----------|------|-------|
| Query cached reviews | 50-200ms | Database query |
| Query intelligence snapshot | 20-50ms | Single JSONB row |
| Render UI | 500ms | React rendering |
| **TOTAL** | **0.6-1s** | **10x faster** |

### Cache Hit Rate Projections

**Assumptions:**
- Users check monitored apps 2-3 times per day
- Cache TTL = 24 hours
- New reviews arrive every 12-24 hours

**Expected Hit Rates:**
- First visit of day: **0%** (cold start)
- Subsequent visits: **95%** (cache hit)
- Overall hit rate: **85-90%**

**Performance Impact:**
- 90% of visits = sub-second load
- 10% of visits = 5-8 second fetch + cache

---

## 💰 Cost Analysis

### Storage Costs

**Supabase Pricing (Free Tier):**
- Database: 500 MB included
- Beyond 500 MB: $0.125/GB/month

**Scenario 1: Small Organization (10 apps)**
- 10 apps × 1,000 reviews each = 10,000 reviews
- Storage: ~10 MB
- Snapshots (30 days): ~6 MB
- **Total: ~16 MB** ✅ Well within free tier

**Scenario 2: Medium Organization (50 apps)**
- 50 apps × 1,000 reviews each = 50,000 reviews
- Storage: ~50 MB
- Snapshots (30 days): ~30 MB
- **Total: ~80 MB** ✅ Still within free tier

**Scenario 3: Large Organization (200 apps)**
- 200 apps × 1,000 reviews each = 200,000 reviews
- Storage: ~200 MB
- Snapshots (30 days): ~120 MB
- **Total: ~320 MB** ✅ Within free tier

**Scenario 4: Enterprise (1,000 apps)**
- 1,000 apps × 1,000 reviews each = 1,000,000 reviews
- Storage: ~1 GB
- Snapshots (30 days): ~600 MB
- **Total: ~1.6 GB** = $0.125/month ✅ Negligible cost

### API Cost Savings

**iTunes RSS API:**
- Free, but rate-limited (unknown exact limits)
- Risk of throttling with heavy usage

**With Caching:**
- 90% reduction in iTunes API calls
- Better rate limit compliance
- Protection against service disruptions

---

## 🚀 Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

**Database Setup:**
- [ ] Create `monitored_app_reviews` table
- [ ] Create `review_intelligence_snapshots` table
- [ ] Create `review_fetch_log` table
- [ ] Set up RLS policies
- [ ] Create indexes

**Estimated Time:** 4-6 hours

---

### Phase 2: Backend Services (Week 1-2)

**Review Caching Service:**
- [ ] `fetchAndCacheReviews(monitoredAppId)` function
- [ ] Incremental update logic (only fetch new reviews)
- [ ] Duplicate detection
- [ ] Error handling & retry logic

**Intelligence Snapshot Service:**
- [ ] `generateIntelligenceSnapshot(monitoredAppId)` function
- [ ] Daily snapshot generation
- [ ] Historical comparison logic

**API Endpoints:**
- [ ] `GET /api/monitored-apps/:id/reviews` (with cache)
- [ ] `GET /api/monitored-apps/:id/intelligence` (with snapshot)
- [ ] `POST /api/monitored-apps/:id/refresh` (force refresh)

**Estimated Time:** 12-16 hours

---

### Phase 3: Frontend Integration (Week 2)

**React Hooks:**
- [ ] `useMonitoredAppReviews(appId)` hook
- [ ] `useReviewIntelligence(appId)` hook
- [ ] Optimistic updates
- [ ] Loading states & skeletons

**UI Updates:**
- [ ] Update `MonitoredAppsGrid` callback to use cached reviews
- [ ] Add "Last updated" timestamp display
- [ ] Add "Refresh" button for manual updates
- [ ] Historical trend charts (optional)

**Estimated Time:** 8-12 hours

---

### Phase 4: Background Jobs (Week 2-3)

**Scheduled Tasks:**
- [ ] Nightly snapshot generation for all monitored apps
- [ ] Weekly cache cleanup (delete reviews > 90 days old)
- [ ] Daily intelligence regeneration

**Using Supabase pg_cron:**
```sql
-- Run daily at 2 AM UTC
SELECT cron.schedule(
  'generate-daily-snapshots',
  '0 2 * * *',
  'SELECT generate_all_snapshots()'
);

-- Weekly cleanup at 3 AM Sunday
SELECT cron.schedule(
  'cleanup-old-reviews',
  '0 3 * * 0',
  'DELETE FROM monitored_app_reviews WHERE fetched_at < NOW() - INTERVAL ''90 days'''
);
```

**Estimated Time:** 6-8 hours

---

### Phase 5: Testing & Optimization (Week 3)

**Testing:**
- [ ] Unit tests for caching logic
- [ ] Integration tests for API endpoints
- [ ] Load testing (100+ concurrent users)
- [ ] Cache hit rate monitoring

**Optimization:**
- [ ] Query performance tuning
- [ ] Index optimization
- [ ] JSONB compression
- [ ] Partial indexes for common queries

**Estimated Time:** 8-10 hours

---

## 📊 Success Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Load Time** | 5-11s | < 1s | 10x faster |
| **Cache Hit Rate** | 0% | 85-90% | New capability |
| **iTunes API Calls** | Every visit | 10% of visits | 90% reduction |
| **User Experience** | Poor | Excellent | Major improvement |
| **Historical Tracking** | None | 30+ days | New feature |
| **Trend Analysis** | Manual | Automated | New capability |

---

## 🎯 Decision Matrix

### Option A: Implement Full Caching System

**Pros:**
- ✅ 10x faster load times
- ✅ Historical trend tracking
- ✅ Reduced API calls (rate limit protection)
- ✅ Better user experience
- ✅ Enables advanced features (alerts, notifications)
- ✅ Scalable to thousands of apps
- ✅ Negligible cost (~$0 for most orgs)

**Cons:**
- ⚠️ Initial development time (3-4 weeks)
- ⚠️ Database complexity increases
- ⚠️ Requires cache invalidation logic
- ⚠️ Migration required for existing users

**Estimated Effort:** 40-50 hours (3-4 weeks part-time)

---

### Option B: Quick Fix (Re-fetch on Load)

**Pros:**
- ✅ 4-line code change
- ✅ Works immediately
- ✅ Zero database changes

**Cons:**
- ❌ Still slow (5-8 seconds every time)
- ❌ No historical tracking
- ❌ High iTunes API usage
- ❌ Poor scalability
- ❌ No trend analysis possible

**Estimated Effort:** 10 minutes

---

## 🏆 Recommendation

**Implement Phase 1-3 Now, Phase 4-5 Later**

**Reasoning:**
1. **User Experience is Critical** - 10x performance improvement is significant
2. **Scalability** - System is designed to handle thousands of apps
3. **Cost is Negligible** - Even for 1000 apps, storage cost is < $1/month
4. **Enables Future Features** - Trend tracking, alerts, notifications
5. **Competitive Advantage** - AppTweak-level performance

**Quick Win Path:**
1. Week 1: Implement database tables + basic caching (Phase 1-2)
2. Week 2: Frontend integration (Phase 3)
3. Launch with cache, defer background jobs (Phase 4) to Week 3

**Fallback:**
- Option B (4-line fix) deployed immediately
- Option A implemented in parallel for v2

---

## 📝 Next Steps

1. **Get Approval** - Confirm architectural approach
2. **Create Migration** - Database schema for 3 new tables
3. **Build API Layer** - Caching service + endpoints
4. **Frontend Integration** - Update MonitoredAppsGrid flow
5. **Test & Deploy** - Staging → Production

**Estimated Timeline:** 3-4 weeks for complete implementation

---

**Would you like me to:**
1. ✅ Proceed with full caching system (Option A)
2. ⚠️ Deploy quick fix now, implement cache later (Hybrid)
3. 🔄 Revise architecture based on feedback

Your choice?
