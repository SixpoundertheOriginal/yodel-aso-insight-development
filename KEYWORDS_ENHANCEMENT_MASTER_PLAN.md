# KEYWORDS SYSTEM ENHANCEMENT - MASTER PLAN
**Enterprise-Grade Keyword Monitoring to Compete with AppTweak, Sensor Tower, App Annie**

**Date:** 2025-11-08
**Scope:** Complete keywords system overhaul with app persistence, auto-refresh, and accuracy guarantees
**Estimated Timeline:** 8-12 weeks
**Team Size:** 2-3 developers
**Risk Level:** MEDIUM (building on proven reviews architecture)

---

## EXECUTIVE SUMMARY

### Current State
- ✅ **Working:** Basic keyword discovery, iTunes scraping, in-memory caching
- ❌ **Broken:** Bulk discovery (missing DB schema), app persistence, auto-refresh, historical tracking
- ❌ **Missing:** Monitored apps, data persistence, background jobs, trend analysis

### Goal State
Transform keywords into an **enterprise-grade monitoring system** that:
1. **Persists app selections** (like reviews monitoring)
2. **Auto-refreshes rankings** daily/weekly based on user settings
3. **Tracks historical trends** (position changes over time)
4. **Guarantees accuracy** (99.5%+ ranking accuracy vs App Store ground truth)
5. **Scales to 1000s of apps** per organization
6. **Provides actionable insights** (keyword opportunities, ranking drops, competitor movements)

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| **App Persistence** | 100% | Apps survive page refresh/logout |
| **Ranking Accuracy** | 99.5%+ | Validated against manual App Store checks |
| **Refresh Reliability** | 99%+ | Daily jobs complete successfully |
| **Historical Data** | 90 days | Trend data available for analysis |
| **Performance** | <3s load | Keyword page loads in under 3 seconds |
| **User Adoption** | 80%+ | Percentage of users who save apps to monitoring |

---

## ARCHITECTURAL APPROACH

### Copy Proven Patterns from Reviews System
The reviews monitoring system is **production-ready with 423+ edge function deployments**. We will:

1. **Mirror Database Schema** - Create keyword equivalents of:
   - `monitored_apps` → `monitored_apps_keywords`
   - `monitored_app_reviews` → `keyword_rankings_snapshots`
   - `review_fetch_log` → `keyword_fetch_log`
   - `review_intelligence_snapshots` → `keyword_intelligence_snapshots`

2. **Replicate UI Patterns** - Copy component structure:
   - App search + "Add to Monitoring" button
   - Monitored apps grid with edit/delete
   - Freshness indicators (`last_checked_at`)
   - Tag-based organization

3. **Reuse Services** - Leverage existing:
   - `app-store-scraper` edge function (proven reliable)
   - RLS policies (organization isolation)
   - React Query hooks (5-min stale time)
   - Cache validation logic

---

## PHASE BREAKDOWN

### 🟢 PHASE 1: Foundation - App Persistence (2-3 weeks)
**Goal:** Users can save apps to keyword monitoring and data persists across sessions

**Deliverables:**
- ✅ Database migration: `monitored_apps_keywords` table
- ✅ RLS policies for multi-tenant security
- ✅ UI: "Add to Monitoring" button
- ✅ Hook: `useMonitoredKeywordApps()`
- ✅ Prevent duplicates (unique constraint)
- ✅ Display monitored apps in grid
- ✅ Edit tags/notes functionality

**Success Criteria:**
- User can search for app → Save → Refresh page → App still there
- Tags and notes persist
- Organization isolation enforced

**Risk:** LOW (copying proven reviews pattern)

---

### 🟡 PHASE 2: Keyword Discovery & Storage (3 weeks)
**Goal:** Discovered keywords are saved to database with initial rankings

**Deliverables:**
- ✅ Fix broken bulk discovery (create missing tables)
- ✅ `keyword_discovery_jobs` table + RPC functions
- ✅ `enhanced_keyword_rankings` table
- ✅ Background job processor for bulk discovery
- ✅ Store discovered keywords in `keywords` table
- ✅ Link keywords to monitored apps
- ✅ Initial ranking snapshot capture

**Success Criteria:**
- "Discover Top 30" button works end-to-end
- Keywords saved to database
- User can see keyword history
- Rankings stored with timestamp

**Risk:** MEDIUM (some tables/functions don't exist yet)

---

### 🟡 PHASE 3: Auto-Refresh & Background Jobs (2-3 weeks)
**Goal:** Automated daily/weekly ranking updates without user intervention

**Deliverables:**
- ✅ Supabase cron job configuration
- ✅ Background job processor for `keyword_refresh_queue`
- ✅ Edge function: `keyword-refresh-worker`
- ✅ Configurable refresh schedules (daily/weekly/monthly)
- ✅ Ranking change detection (up/down/stable/new/lost)
- ✅ `keyword_fetch_log` for audit trail
- ✅ Error handling + retry logic
- ✅ Rate limiting (respect iTunes/App Store limits)

**Success Criteria:**
- Jobs run on schedule (99%+ reliability)
- Rankings auto-update daily
- Users see "Last updated: 2 hours ago"
- Failed jobs retry with exponential backoff

**Risk:** MEDIUM (new infrastructure for keywords)

---

### 🔴 PHASE 4: Accuracy & Validation (2 weeks)
**Goal:** Guarantee 99.5%+ ranking accuracy vs App Store ground truth

**Deliverables:**
- ✅ SERP scraping validation layer
- ✅ Multi-source verification (iTunes API + Web scraping)
- ✅ Confidence scoring (high/medium/low)
- ✅ Ground truth validation suite (manual App Store checks)
- ✅ Ranking discrepancy alerts
- ✅ Data quality metrics dashboard
- ✅ Automated testing (100 keywords × 10 apps daily)

**Success Criteria:**
- 99.5%+ accuracy on validation set
- Confidence scores accurate (95%+ precision)
- Discrepancies flagged within 1 hour
- Validation runs daily

**Risk:** HIGH (App Store behavior can be unpredictable)

---

### 🟢 PHASE 5: Historical Trends & Intelligence (2 weeks)
**Goal:** Track keyword ranking changes over time, provide actionable insights

**Deliverables:**
- ✅ `keyword_ranking_history` table (daily snapshots)
- ✅ Trend calculation (7-day, 30-day, 90-day)
- ✅ Position change tracking (+5, -10, new, lost)
- ✅ Keyword opportunity detection (rising keywords)
- ✅ Competitor movement alerts
- ✅ Historical charts (position over time)
- ✅ Export to CSV with historical data

**Success Criteria:**
- 90 days of historical data available
- Trend charts render in <2 seconds
- Alerts fire within 15 minutes of ranking drop
- Export includes full history

**Risk:** LOW (standard data warehouse pattern)

---

### 🟡 PHASE 6: Enterprise Scale & Performance (1-2 weeks)
**Goal:** Support 1000s of apps and 100k+ keywords per organization

**Deliverables:**
- ✅ Database indexing optimization
- ✅ Query performance tuning (<100ms p95)
- ✅ Partitioning for `keyword_rankings` table (by month)
- ✅ Batch processing for bulk operations
- ✅ Connection pooling configuration
- ✅ Caching layer (Redis or Supabase cache)
- ✅ Load testing (1000 concurrent users)
- ✅ Cost optimization (reduce BigQuery/edge function calls)

**Success Criteria:**
- Page loads <3 seconds with 10k keywords
- Queries <100ms at p95
- Support 1000 apps per org without degradation
- Monthly infrastructure cost <$500/org

**Risk:** MEDIUM (requires performance testing at scale)

---

## PRIORITY MATRIX

### Must-Have (Launch Blockers)
| Feature | Phase | Priority | Complexity |
|---------|-------|----------|------------|
| App persistence | 1 | P0 | LOW |
| "Add to Monitoring" button | 1 | P0 | LOW |
| Keyword storage | 2 | P0 | MEDIUM |
| Basic refresh (manual) | 2 | P0 | LOW |
| Ranking accuracy 95%+ | 4 | P0 | HIGH |

### Should-Have (Core Features)
| Feature | Phase | Priority | Complexity |
|---------|-------|----------|------------|
| Auto-refresh (daily) | 3 | P1 | MEDIUM |
| Historical trends (30 days) | 5 | P1 | LOW |
| Bulk discovery fix | 2 | P1 | MEDIUM |
| Competitor tracking | 5 | P1 | MEDIUM |
| Export CSV | 5 | P1 | LOW |

### Nice-to-Have (Enhancements)
| Feature | Phase | Priority | Complexity |
|---------|-------|----------|------------|
| 90-day historical data | 5 | P2 | LOW |
| AI keyword suggestions | 2 | P2 | HIGH |
| Keyword clustering | 5 | P2 | HIGH |
| Real-time alerts | 5 | P2 | MEDIUM |
| Performance optimization | 6 | P2 | MEDIUM |

---

## TIMELINE & MILESTONES

### Week 1-3: Foundation (Phase 1)
- **Week 1:** Database migration + RLS policies
- **Week 2:** UI components + hooks
- **Week 3:** Testing + bug fixes
- **Milestone:** User can save apps and view monitored keywords apps

### Week 4-6: Discovery (Phase 2)
- **Week 4:** Fix bulk discovery tables/functions
- **Week 5:** Keyword storage + linking
- **Week 6:** Initial ranking snapshots
- **Milestone:** "Discover Top 30" works end-to-end

### Week 7-9: Auto-Refresh (Phase 3)
- **Week 7:** Cron jobs + queue processor
- **Week 8:** Edge function for refresh
- **Week 9:** Error handling + retry logic
- **Milestone:** Rankings auto-update daily

### Week 10-11: Accuracy (Phase 4)
- **Week 10:** Validation layer + ground truth testing
- **Week 11:** Confidence scoring + alerts
- **Milestone:** 99.5%+ ranking accuracy achieved

### Week 12+: Trends & Scale (Phases 5-6)
- **Week 12:** Historical snapshots + trends
- **Week 13+:** Performance optimization + load testing
- **Milestone:** Full enterprise-grade system live

---

## RISK ASSESSMENT

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **App Store API changes** | HIGH | HIGH | Multi-source validation (iTunes + web scraping) |
| **Rate limiting from Apple** | MEDIUM | HIGH | Exponential backoff + proxy rotation |
| **Ranking accuracy drift** | MEDIUM | HIGH | Daily validation suite + confidence scoring |
| **Database performance at scale** | MEDIUM | MEDIUM | Indexing + partitioning + caching |
| **Background job failures** | LOW | MEDIUM | Retry logic + dead letter queue |
| **Cost overruns (edge functions)** | LOW | MEDIUM | Caching + batch processing |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **User adoption low** | MEDIUM | HIGH | Copy proven reviews UX patterns |
| **Competitor features missing** | MEDIUM | MEDIUM | Feature parity analysis vs AppTweak |
| **Data quality concerns** | LOW | HIGH | 99.5%+ accuracy guarantee |
| **Slow development pace** | MEDIUM | MEDIUM | Phase-based delivery (ship Phase 1 first) |

---

## DEPENDENCIES & PREREQUISITES

### External Dependencies
- ✅ `app-store-scraper` edge function (already deployed, 423+ versions)
- ✅ iTunes Search API (official Apple API, stable)
- ✅ iTunes RSS Feed for search results (unofficial but proven)
- ⚠️ Supabase cron jobs (need to verify plan supports cron)
- ⚠️ BigQuery (optional for advanced analytics)

### Internal Dependencies
- ✅ Reviews monitoring system (reference architecture)
- ✅ `keywords` table (already exists)
- ✅ `keyword_refresh_queue` table (exists but unused)
- ✅ RLS policies framework (exists)
- ❌ `monitored_apps_keywords` table (needs creation)
- ❌ Background job processor (needs implementation)

---

## DATA ACCURACY STRATEGY

### Multi-Source Verification
To achieve 99.5%+ accuracy, we will use **3-layer validation**:

#### Layer 1: iTunes Search API (Primary)
- **Source:** `https://itunes.apple.com/search`
- **Pros:** Official, stable, fast
- **Cons:** Only returns top 200 results
- **Accuracy:** ~98% for top 50 keywords
- **Use Case:** Primary data source

#### Layer 2: App Store Web Scraping (Secondary)
- **Source:** `https://apps.apple.com/{country}/search?term={keyword}`
- **Pros:** More complete results
- **Cons:** Brittle (HTML changes), slower
- **Accuracy:** ~97% for top 100 keywords
- **Use Case:** Fill gaps when iTunes API incomplete

#### Layer 3: SERP Screenshot Validation (Ground Truth)
- **Method:** Playwright/Puppeteer screenshot of actual App Store
- **Frequency:** Daily validation of 100 random keywords
- **Accuracy:** 100% (what users see)
- **Use Case:** Validation + confidence calibration

### Confidence Scoring
Every ranking will have a confidence level:
- **HIGH (95%+):** Both iTunes API + Web scraping agree
- **MEDIUM (85-94%):** Single source only, or minor discrepancies
- **LOW (<85%):** Conflicting data or old data (>7 days)

### Validation Schedule
- **Real-time:** Confidence scoring on every fetch
- **Daily:** 100 random keyword ground truth checks
- **Weekly:** Full accuracy report across all monitored keywords
- **Monthly:** Calibration of confidence thresholds

---

## PERFORMANCE TARGETS

### Load Time Targets
| Page/Action | Target | Measurement |
|-------------|--------|-------------|
| Keywords page initial load | <3 seconds | Time to interactive |
| Monitored apps grid render | <500ms | First paint |
| Keyword search (iTunes API) | <2 seconds | API response time |
| Bulk discovery (Top 30) | <10 seconds | Job completion |
| Historical chart render | <1 second | Canvas draw time |

### Database Query Targets
| Query Type | Target | Optimization |
|------------|--------|--------------|
| Load monitored apps | <50ms | Index on (org_id, created_at) |
| Load keyword rankings | <100ms | Partition by month, index on keyword_id |
| Historical trends (90 days) | <200ms | Pre-computed aggregations |
| Competitor overlap | <300ms | Materialized view |

### Scalability Targets
| Metric | Phase 1 Target | Phase 6 Target |
|--------|----------------|----------------|
| Apps per org | 50 | 1,000 |
| Keywords per app | 100 | 500 |
| Total keywords per org | 5,000 | 500,000 |
| Concurrent users | 10 | 1,000 |
| Daily refresh jobs | 500 | 50,000 |

---

## COST ESTIMATES

### Infrastructure Costs (Monthly)

| Component | Phase 1-2 | Phase 3-6 | Notes |
|-----------|-----------|-----------|-------|
| **Supabase Database** | $25 | $99 | Pro plan for cron jobs + storage |
| **Edge Function Invocations** | $10 | $50 | 2M invocations/month |
| **Storage (keyword snapshots)** | $5 | $20 | ~50GB historical data |
| **Background Job Compute** | $0 | $30 | Cron job processing time |
| **Optional: Redis Cache** | $0 | $15 | For high-traffic orgs |
| **Optional: Proxy Rotation** | $0 | $100 | If rate-limited by Apple |
| **TOTAL** | **$40/month** | **$314/month** | Scales with usage |

### Development Costs (One-Time)

| Phase | Developer Weeks | Cost @ $100/hr |
|-------|-----------------|----------------|
| Phase 1 | 2-3 weeks | $8,000 - $12,000 |
| Phase 2 | 3 weeks | $12,000 |
| Phase 3 | 2-3 weeks | $8,000 - $12,000 |
| Phase 4 | 2 weeks | $8,000 |
| Phase 5 | 2 weeks | $8,000 |
| Phase 6 | 1-2 weeks | $4,000 - $8,000 |
| **TOTAL** | **12-15 weeks** | **$48,000 - $60,000** |

---

## COMPETITIVE ANALYSIS

### Feature Parity vs AppTweak/Sensor Tower

| Feature | AppTweak | Sensor Tower | Our System (After Phase 6) |
|---------|----------|--------------|----------------------------|
| **App monitoring** | ✅ | ✅ | ✅ Phase 1 |
| **Keyword rankings** | ✅ | ✅ | ✅ Phase 2 |
| **Historical trends** | ✅ | ✅ | ✅ Phase 5 |
| **Auto-refresh** | ✅ | ✅ | ✅ Phase 3 |
| **Competitor tracking** | ✅ | ✅ | ✅ Phase 5 |
| **Keyword suggestions** | ✅ | ✅ | ⚠️ Basic (existing) |
| **Search volume estimates** | ✅ | ✅ | ⚠️ Heuristic (existing) |
| **Difficulty scores** | ✅ | ✅ | ❌ Future work |
| **Multi-market support** | ✅ (175 countries) | ✅ (150 countries) | ⚠️ Top 15 markets |
| **Real-time tracking** | ✅ | ✅ | ❌ Daily only |
| **API access** | ✅ | ✅ | ❌ Future work |

**Gaps to Address:**
1. **Search volume accuracy** - Competitors use proprietary ML models, we use heuristics
2. **Multi-market scale** - They support 150+ countries, we target top 15 first
3. **Real-time tracking** - They update hourly, we update daily
4. **Keyword difficulty** - Complex metric requiring extensive historical data

**Our Advantages:**
1. **Price** - $0-$314/month vs $300-$3000/month for competitors
2. **Integration** - Unified with reviews/ASC data in one platform
3. **Customization** - We control the stack and can customize for niche use cases
4. **Transparency** - Users see confidence scores and data sources

---

## SUCCESS CRITERIA (GO/NO-GO for Each Phase)

### Phase 1: App Persistence
- ✅ User can save 50+ apps to monitoring
- ✅ Apps persist across logout/login
- ✅ Tags and notes editable
- ✅ No duplicate apps per org
- ✅ Page loads in <3 seconds

### Phase 2: Keyword Discovery
- ✅ "Discover Top 30" completes in <10 seconds
- ✅ Keywords saved to database
- ✅ Initial rankings captured
- ✅ 95%+ accuracy on top 30 keywords
- ✅ Handles 100+ apps without errors

### Phase 3: Auto-Refresh
- ✅ Cron jobs run on schedule (99%+ reliability)
- ✅ Rankings update daily for all monitored keywords
- ✅ Failed jobs retry automatically
- ✅ Users see "Last updated" timestamp
- ✅ <5% job failure rate

### Phase 4: Accuracy
- ✅ 99.5%+ ranking accuracy vs ground truth
- ✅ Confidence scores 95%+ precision
- ✅ Validation suite runs daily
- ✅ Discrepancies flagged within 1 hour
- ✅ <1% false positive rate on alerts

### Phase 5: Historical Trends
- ✅ 90 days of historical data available
- ✅ Trend charts render in <1 second
- ✅ Position changes tracked daily
- ✅ Competitor movements detected
- ✅ Export includes full history

### Phase 6: Scale
- ✅ Supports 1000 apps per org
- ✅ Page loads <3 seconds with 10k keywords
- ✅ Queries <100ms at p95
- ✅ Load test: 1000 concurrent users
- ✅ Monthly cost <$500 per org

---

## MONITORING & OBSERVABILITY

### Key Metrics to Track

#### Business Metrics
- **App Adoption Rate:** % of users who save apps to monitoring
- **Keyword Discovery Usage:** # of bulk discovery jobs per day
- **Retention:** % of users who return weekly
- **Export Usage:** % of users who export data

#### Technical Metrics
- **Ranking Accuracy:** % of rankings matching ground truth
- **Refresh Success Rate:** % of daily jobs completing successfully
- **API Response Time:** p50, p95, p99 for all endpoints
- **Database Query Performance:** Slow query log (>500ms)
- **Error Rate:** % of requests resulting in errors
- **Cache Hit Rate:** % of requests served from cache

#### Cost Metrics
- **Edge Function Invocations:** Track against budget
- **Database Storage Growth:** GB per month
- **Proxy Bandwidth:** GB per month (if using proxies)

### Alerting Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Ranking accuracy | <97% | <95% |
| Refresh success rate | <95% | <90% |
| API error rate | >5% | >10% |
| p95 query time | >500ms | >1s |
| Job queue depth | >1000 | >5000 |
| Daily cost | >$20 | >$50 |

---

## NEXT STEPS

### Immediate Actions (This Week)
1. **Review this master plan** - Approve phases and timeline
2. **Prioritize phases** - Decide if we do all 6 phases or MVP (1-3 only)
3. **Choose starting point** - Which phase to detail first?
4. **Assign resources** - Who will work on this (2-3 developers recommended)

### Decision Points
**OPTION A: MVP Launch (Phases 1-3 only)**
- Timeline: 6-8 weeks
- Cost: ~$28,000 development + $40-100/month infrastructure
- Features: App persistence + keyword discovery + manual refresh
- Go-to-market: "Beta" launch, gather feedback, iterate

**OPTION B: Full Enterprise Launch (All Phases)**
- Timeline: 12-15 weeks
- Cost: ~$48,000-60,000 development + $314/month infrastructure
- Features: Full auto-refresh + historical trends + 99.5% accuracy
- Go-to-market: "Enterprise-ready" competitive with AppTweak/Sensor Tower

**OPTION C: Phased Rollout (Incremental)**
- Timeline: Launch Phase 1 in 3 weeks, then monthly releases
- Cost: Spread development cost over 6 months
- Features: Ship incrementally, get user feedback early
- Go-to-market: "Continuous improvement" model

---

## APPENDIX: DETAILED DELIVERABLES BY PHASE

### Phase 1 Deliverables (App Persistence)
1. **Database Migration:** `20251108000000_create_monitored_apps_keywords.sql`
   - Table: `monitored_apps_keywords` (structure mirrors `monitored_apps`)
   - Indexes: org_id, app_store_id, created_at, last_checked_at
   - RLS policies: SELECT, INSERT, UPDATE, DELETE
   - Unique constraint: (organization_id, app_store_id, primary_country)

2. **React Hooks:**
   - `useMonitoredKeywordApps()` - Fetch monitored apps
   - `useAddMonitoredKeywordApp()` - Add app to monitoring
   - `useUpdateMonitoredKeywordApp()` - Update tags/notes
   - `useRemoveMonitoredKeywordApp()` - Remove app

3. **UI Components:**
   - `MonitoredKeywordAppsGrid.tsx` - Display all monitored apps
   - `AddToMonitoringButton.tsx` - Save app button
   - `KeywordAppCard.tsx` - Individual app card with actions
   - `EditAppDialog.tsx` - Edit tags/notes modal

4. **Services:**
   - `monitored-keyword-apps.service.ts` - CRUD operations
   - Update `keywords.tsx` to integrate hooks

5. **Tests:**
   - Unit tests for hooks
   - Integration tests for save/load flow
   - E2E test: Search → Save → Refresh → Verify

### Phase 2 Deliverables (Keyword Discovery)
1. **Database Migrations:**
   - `keyword_discovery_jobs` table
   - `enhanced_keyword_rankings` table
   - RPC function: `start_keyword_discovery_job()`
   - RPC function: `get_top_keywords_for_app()`
   - RPC function: `get_discovery_job_status()`

2. **Services:**
   - Fix `bulk-keyword-discovery.service.ts` (remove @ts-nocheck)
   - Implement job processing logic
   - Link keywords to `monitored_apps_keywords.id`

3. **UI Updates:**
   - Fix `BulkKeywordDiscovery.tsx` to show real job status
   - Display discovered keywords with save option
   - Link to monitored app

4. **Tests:**
   - E2E test: Click "Discover Top 30" → Job completes → Keywords saved

### Phase 3 Deliverables (Auto-Refresh)
1. **Supabase Cron Job:** `keyword-refresh-cron.sql`
   - Schedule: Daily at 2 AM UTC
   - Calls RPC: `process_keyword_refresh_queue()`

2. **Edge Function:** `keyword-refresh-worker/index.ts`
   - Reads from `keyword_refresh_queue`
   - Fetches fresh rankings via `app-store-scraper`
   - Updates `keyword_rankings` table
   - Logs to `keyword_fetch_log`
   - Handles errors + retries

3. **RPC Functions:**
   - `process_keyword_refresh_queue()` - Main processor
   - `enqueue_keyword_refresh()` - Add job to queue
   - `get_stale_keywords()` - Find keywords needing refresh

4. **UI Updates:**
   - Display "Last updated: X hours ago"
   - Manual refresh button
   - Refresh settings (daily/weekly/monthly)

### Phase 4 Deliverables (Accuracy)
1. **Validation Service:** `keyword-validation.service.ts`
   - Multi-source comparison (iTunes + Web)
   - Confidence scoring algorithm
   - Discrepancy detection

2. **Ground Truth Suite:** `keyword-ground-truth-validator.ts`
   - Playwright screenshots of App Store
   - OCR ranking extraction
   - Comparison vs our data

3. **Monitoring Dashboard:**
   - Accuracy metrics (daily/weekly/monthly)
   - Confidence distribution chart
   - Discrepancy alerts table

### Phase 5 Deliverables (Historical Trends)
1. **Database Tables:**
   - `keyword_ranking_history` (daily snapshots)
   - `keyword_intelligence_snapshots` (weekly summaries)

2. **Analytics Service:** `keyword-analytics.service.ts`
   - Trend calculation (7/30/90 day)
   - Position change detection
   - Competitor movement analysis

3. **UI Components:**
   - Historical chart (position over time)
   - Trend indicators (↑↓→)
   - Competitor overlap table

### Phase 6 Deliverables (Scale)
1. **Database Optimizations:**
   - Partition `keyword_rankings` by month
   - Materialized views for common queries
   - Connection pooling config

2. **Caching Layer:**
   - Redis integration (optional)
   - Query result caching
   - Invalidation strategy

3. **Load Testing:**
   - k6 scripts for 1000 concurrent users
   - Database stress tests
   - Cost projection at scale

---

## CONCLUSION

This is an **ambitious but achievable** plan to build enterprise-grade keyword monitoring that rivals AppTweak and Sensor Tower. By copying proven patterns from the reviews system and phasing delivery, we can ship incrementally while maintaining quality.

**Recommended Next Step:** Approve **OPTION C (Phased Rollout)** - Ship Phase 1 in 3 weeks, gather feedback, then proceed with Phases 2-3.

---

**Questions for Review:**
1. Do you approve the overall phase structure?
2. Which option (A/B/C) fits your timeline and budget?
3. Which phase should I detail first (recommend Phase 1)?
4. Any must-have features missing from this plan?
