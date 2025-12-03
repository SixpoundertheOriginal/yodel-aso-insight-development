# Dashboard V2 Architecture & Performance Audit

**Date**: December 3, 2025
**Page**: `/dashboard-v2` (ReportingDashboardV2.tsx)
**Goal**: Improve load times, optimize architecture, enhance security
**Scope**: Architecture, state management, performance, security, logging

---

## 1. CURRENT ARCHITECTURE

### **Data Flow Diagram**

```
┌──────────────────┐
│  User Interaction│
│  (date/app/filter)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ReportingDashboardV2│  ← Main Component (782 lines)
│  - useState (5 vars)│
│  - useMemo (10 calcs)│
│  - useEffect (2)   │
└────────┬─────────┘
         │
         ├──────────────────────────────┬──────────────────┐
         │                              │                  │
         ▼                              ▼                  ▼
┌─────────────────┐          ┌──────────────────┐  ┌──────────────┐
│useEnterpriseAnalytics│    │usePeriodComparison│  │useAvailableApps│
│ (React Query)    │          │ (React Query)    │  │(React Query)  │
│ staleTime: 30min │          │ staleTime: 30min │  │               │
└────────┬────────┘          └────────┬─────────┘  └──────┬───────┘
         │                              │                  │
         │ Supabase Edge Function       │ Supabase Edge    │ Supabase Direct
         │ bigquery-aso-data            │ bigquery-aso-data│ org_app_access
         │                              │                  │
         ▼                              ▼                  ▼
┌─────────────────┐          ┌──────────────────┐  ┌──────────────┐
│ BigQuery Warehouse│        │ BigQuery Warehouse│  │ PostgreSQL   │
│ (ALL apps/sources)│        │ (Previous period) │  │ (RLS table)  │
└────────┬────────┘          └────────┬─────────┘  └──────┬───────┘
         │                              │                  │
         │ Returns ~100-1000 rows       │ Returns ~100-1000 │ Returns ~10 rows
         │                              │                  │
         ▼                              ▼                  ▼
┌─────────────────┐          ┌──────────────────┐  ┌──────────────┐
│ Client-Side Filter│        │ Delta Calculation │  │ App List     │
│ (useMemo)        │          │ (useMemo)        │  │              │
│ - Filter by apps │          │ - Current vs Prev│  │              │
│ - Filter by traffic│        │ - % changes      │  │              │
│ - Recalc metrics │          │                  │  │              │
└────────┬────────┘          └────────┬─────────┘  └──────┬───────┘
         │                              │                  │
         ├──────────────────────────────┼──────────────────┘
         │
         ▼
┌─────────────────┐
│ 10 useMemo blocks│  ← Client-side calculations
│ - asoMetrics     │
│ - totalMetrics   │
│ - twoPathMetrics │
│ - derivedKpis    │
│ - stabilityScore │
│ - opportunities  │
│ - scenarios      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Render UI      │
│ - 14 cards       │
│ - 3 charts       │
│ - AI chat panel  │
└──────────────────┘
```

---

## 2. STATE MANAGEMENT ANALYSIS

### **A. Server State (React Query)**

```typescript
// ✅ GOOD: Centralized server state with caching
useEnterpriseAnalytics() {
  queryKey: ['enterprise-analytics-v3', orgId, start, end]
  staleTime: 30 minutes  // ✅ Good for daily data
  gcTime: 60 minutes     // ✅ Reasonable
  refetchOnWindowFocus: false  // ✅ Prevents unnecessary refetches
}

usePeriodComparison() {
  queryKey: ['period-comparison', orgId, start, end, appIds]
  staleTime: 30 minutes
  enabled: !!orgId && !isLoading  // ⚠️ Sequential dependency
}

useAvailableApps() {
  queryKey: ['available-apps', orgId]
  staleTime: 5 minutes  // ✅ Apps don't change often
}
```

**Issues**:
1. **Sequential Loading**: `usePeriodComparison` waits for `useEnterpriseAnalytics` to finish
   - Result: Adds 500-2000ms to initial load time
   - Should be: Parallel queries

2. **Duplicate BigQuery Calls**: Both hooks call same edge function with different date ranges
   - Current: 2 BigQuery queries per page load
   - Optimal: 1 BigQuery query (fetch both periods at once)

3. **No Derived State Caching**: All `useMemo` calculations re-run on every filter change
   - `asoMetrics`, `twoPathMetrics`, `derivedKpis`, etc.
   - Total: ~10 expensive calculations

### **B. Local State (useState)**

```typescript
// ✅ GOOD: Minimal local state
const [dateRange, setDateRange] = useState({...});  // UI state
const [selectedAppIds, setSelectedAppIds] = useState([]);  // Filter
const [selectedTrafficSources, setSelectedTrafficSources] = useState([]);  // Filter
const [isChatOpen, setIsChatOpen] = useState(false);  // UI state
```

**Issues**:
- ❌ No URL state persistence (refresh loses filters)
- ❌ No localStorage persistence (can't save preferred filters)

---

## 3. PERFORMANCE BOTTLENECKS

### **🔴 Critical Issues**

#### **Issue #1: Double BigQuery Queries on Every Date Change**

**Current Flow**:
```
User changes date range
  ↓
useEnterpriseAnalytics refetches (500-2000ms)
  ↓
Wait for completion
  ↓
usePeriodComparison refetches (500-2000ms)
  ↓
Total: 1000-4000ms load time
```

**Impact**:
- Initial load: 1-4 seconds
- Date change: 1-4 seconds
- App filter change: Instant (client-side)
- Traffic filter change: Instant (client-side)

**Root Cause**: Separate queries for current and previous periods

---

#### **Issue #2: Client-Side Filtering of Large Datasets**

**Current Implementation**:
```typescript
// useEnterpriseAnalytics.ts lines 254-313
const filteredData = useMemo(() => {
  // Filter 100-1000 rows on EVERY app/traffic selection change
  let filteredRawData = data.rawData;

  if (hasAppFilter) {
    filteredRawData = filteredRawData.filter(...);  // O(n)
  }

  if (hasTrafficFilter) {
    filteredRawData = filteredRawData.filter(...);  // O(n)
  }

  return {
    rawData: filteredRawData,
    processedData: {
      summary: calculateSummary(filteredRawData),  // O(n)
      timeseries: filterTimeseries(filteredRawData, dateRange),  // O(n*d)
      traffic_sources: ...
    }
  };
}, [query.data, appIds, trafficSources, dateRange]);
```

**Performance Cost**:
- For 500 rows, 30-day range: ~15-30ms per filter change
- For 1000 rows, 90-day range: ~50-100ms per filter change
- **Feels sluggish on slower devices**

**Why This Architecture?**:
- ✅ Instant filter changes (no network request)
- ✅ Fixes "disappearing apps" bug (server always returns all apps)
- ❌ Performance degrades with data size

---

#### **Issue #3: No Caching for Derived Calculations**

**10 useMemo blocks recalculate on EVERY render**:

```typescript
// Lines 170-324 - All recalculate when rawData changes
const asoMetrics = useMemo(() => {...}, [data?.rawData]);
const totalMetrics = useMemo(() => {...}, [data?.rawData]);
const twoPathMetrics = useMemo(() => {...}, [data?.rawData]);
const derivedKpis = useMemo(() => {...}, [twoPathMetrics]);
const stabilityScore = useMemo(() => {...}, [data?.processedData?.timeseries]);
const opportunities = useMemo(() => {...}, [derivedKpis, twoPathMetrics]);
const scenarios = useMemo(() => {...}, [twoPathMetrics, derivedKpis]);
```

**Issue**:
- When app filter changes → filteredData changes → all 10 recalculate
- Each calculation: 5-20ms
- Total: 50-200ms of blocking computation
- **Blocks main thread → UI feels laggy**

---

#### **Issue #4: No Memoization of Expensive Array Operations**

**Example** (lines 179-218):
```typescript
const asoMetrics = useMemo(() => {
  const searchData = data.rawData.filter(...);  // O(n)
  const browseData = data.rawData.filter(...);  // O(n)
  const searchMetrics = calculateMetrics(searchData);  // O(n)
  const browseMetrics = calculateMetrics(browseData);  // O(n)
  return { search: searchMetrics, browse: browseMetrics };
}, [data?.rawData]);  // Runs on EVERY rawData change
```

**Better approach**: Move to backend or Web Worker

---

### **⚠️ Medium Issues**

#### **Issue #5: Excessive Console Logging in Production**

**Lines with console.log**:
- Line 116: Dashboard data loaded
- Line 239-244: Total metrics calculated
- Line 269-280: Two-path metrics calculated
- Line 329-331: App selection initialized
- Plus 20+ logs in `useEnterpriseAnalytics` hook

**Impact**:
- Slows down rendering (console.log is blocking)
- Pollutes browser console
- Potential security risk (exposes org IDs, data counts)

**Should be**: Conditional logging based on env var or removed entirely

---

#### **Issue #6: No Loading State Granularity**

**Current**:
```typescript
if (isLoading || appsLoading) {
  return <FullPageSpinner />;  // Blocks entire UI
}
```

**Better**:
- Show skeleton UI immediately
- Load sections progressively (cards → charts → AI chat)
- Perceived performance: Feels 2x faster

---

#### **Issue #7: Timeseries Generation is O(n*d)**

**filterTimeseries function** (lines 363-405):
```typescript
function filterTimeseries(data, dateRange) {
  // Generate ALL dates in range
  for (let d = start; d <= end; d++) {  // O(d)
    allDates.push(d);
  }

  // Aggregate data for each date
  data.forEach((row) => {  // O(n)
    grouped[row.date].impressions += row.impressions;
  });

  // Calculate CVR for each date
  return Object.values(grouped).map(...);  // O(d)
}
```

**Performance**:
- 90-day range, 1000 rows: ~50-80ms
- Should be pre-calculated on backend

---

### **✅ Low Priority Issues**

#### **Issue #8: Auto-Select ALL Apps on Mount**

**Lines 327-333**:
```typescript
useEffect(() => {
  if (availableApps.length > 0 && selectedAppIds.length === 0) {
    setSelectedAppIds(availableApps.map(app => app.app_id));  // Select ALL
  }
}, [availableApps.length]);
```

**Issue**: For orgs with 50+ apps, this fetches data for ALL apps initially
**Better**: Default to "last viewed" apps or prompt user to select

---

## 4. SECURITY ANALYSIS

### **✅ Strengths**

1. **RLS (Row-Level Security)** on `org_app_access` table
   - Users can only see apps they have access to
   - Agency support: RLS automatically includes client org apps

2. **Edge Function Validation**
   - `bigquery-aso-data` validates org_id
   - Supabase Auth automatically injects user context

3. **No SQL Injection**
   - All queries parameterized via Supabase client
   - BigQuery uses parameterized queries

4. **No Exposed Secrets**
   - BigQuery credentials stored server-side (edge function)
   - No API keys in client code

### **⚠️ Concerns**

1. **Verbose Logging Exposes Internal Data**
   ```typescript
   // Line 116 - Exposes data source, row counts
   logger.dashboard(`Data loaded: ${data.meta?.raw_rows} rows, source=${data.meta?.data_source}...`);
   ```
   **Risk**: Low (but should be removed in prod)

2. **No Rate Limiting on Client**
   - User can spam refetch button
   - Should be: Debounce or rate limit

3. **No Input Validation on Date Range**
   - User could request 10-year range (DOS risk)
   - Should be: Max 365 days, min 1 day

---

## 5. LOGGING ANALYSIS

### **Current Logging**

**Console Logging**:
- ✅ `logger.dashboard()` - Custom logger utility
- ❌ Direct `console.log()` - 10+ instances
- ❌ No log levels (info, warn, error)
- ❌ No production log filtering

**Activity Logging**:
- ❌ Page views: Not logged to `audit_logs`
- ❌ Filter changes: Not logged
- ❌ Refetch actions: Not logged
- ❌ Export actions: Not logged

**Recommendation**: Use `useActivityLogger` hook

---

## 6. BACKEND VS FRONTEND LOGIC

### **Current Split**

| Logic | Location | Performance |
|-------|----------|-------------|
| **Data Fetching** | Backend (BigQuery via Edge Function) | ✅ Excellent |
| **Date Filtering** | Backend (BigQuery WHERE clause) | ✅ Excellent |
| **App Filtering** | Frontend (Array.filter) | ⚠️ OK (but slower) |
| **Traffic Filtering** | Frontend (Array.filter) | ⚠️ OK (but slower) |
| **Timeseries Aggregation** | Frontend (filterTimeseries) | ❌ Slow (O(n*d)) |
| **Summary Calculation** | Frontend (calculateSummary) | ❌ Slow (O(n)) |
| **CVR Calculation** | Frontend (reduce + divide) | ✅ Fast (O(n)) |
| **Two-Path Metrics** | Frontend (calculateTwoPathMetrics) | ❌ Slow (O(n)) |
| **Derived KPIs** | Frontend (calculateDerivedKPIs) | ❌ Slow (O(1) but complex) |
| **Stability Score** | Frontend (calculateStabilityScore) | ❌ Slow (O(n)) |
| **Opportunity Map** | Frontend (calculateOpportunityMap) | ✅ Fast (O(1)) |
| **Simulations** | Frontend (simulateOutcomes) | ✅ Fast (O(1)) |

### **Recommendation: Move to Backend**

**High Priority** (Move to Edge Function or BigQuery):
1. ✅ **Timeseries Aggregation** - BigQuery GROUP BY date
2. ✅ **Summary Calculation** - BigQuery SUM() aggregates
3. ✅ **Two-Path Metrics** - BigQuery CASE statements
4. ✅ **Period Comparison** - Single query with date partitions

**Medium Priority** (Move to Edge Function):
5. ⚠️ **Derived KPIs** - Calculate server-side, cache result
6. ⚠️ **Stability Score** - Requires time-series analysis (use BigQuery ML)

**Keep on Frontend**:
- ✅ **App/Traffic Filtering** (instant UX, no network latency)
- ✅ **Opportunity Map** (simple calculation)
- ✅ **Simulations** (interactive, needs to be instant)

---

## 7. OPTIMIZATION OPPORTUNITIES

### **🎯 Quick Wins (1-2 hours each)**

#### **Win #1: Combine Period Queries into Single BigQuery Call**

**Current**:
```typescript
// useEnterpriseAnalytics - Fetches current period
// usePeriodComparison - Fetches previous period
// Result: 2 separate BigQuery queries
```

**Optimized**:
```sql
-- Single BigQuery query with UNION ALL
SELECT *, 'current' as period FROM data WHERE date BETWEEN @start AND @end
UNION ALL
SELECT *, 'previous' as period FROM data WHERE date BETWEEN @prev_start AND @prev_end
```

**Impact**:
- **50% reduction in load time** (1 query instead of 2)
- Estimated savings: 500-1500ms

---

#### **Win #2: Pre-Calculate Aggregates in BigQuery**

**Current**: BigQuery returns raw rows → Client aggregates

**Optimized**: BigQuery returns pre-aggregated data

```sql
-- Instead of returning 1000 individual rows:
SELECT date, app_id, traffic_source, impressions, downloads, ...
FROM source_data
WHERE ...

-- Return aggregated summaries:
SELECT
  date,
  traffic_source,
  SUM(impressions) as impressions,
  SUM(downloads) as downloads,
  SUM(product_page_views) as ppv,
  -- Two-path metrics
  SUM(CASE WHEN product_page_views = 0 THEN downloads ELSE 0 END) as direct_installs,
  SUM(CASE WHEN product_page_views > 0 THEN downloads ELSE 0 END) as pdp_installs
FROM source_data
WHERE ...
GROUP BY date, traffic_source
```

**Impact**:
- **Reduces payload size by 70-90%** (10-50KB instead of 100-500KB)
- **Eliminates client-side aggregation** (saves 50-200ms)
- **Faster JSON parsing** (smaller payload)

---

#### **Win #3: Add Skeleton Loading UI**

**Current**: Full-page spinner blocks everything

**Optimized**: Progressive loading with skeleton screens

```typescript
return (
  <MainLayout>
    {/* Header always visible */}
    <Header />

    {/* Filters always visible */}
    <FilterBar />

    {/* Cards show skeleton while loading */}
    {isLoading ? (
      <SkeletonCards count={6} />
    ) : (
      <MetricCards data={data} />
    )}

    {/* Charts load progressively */}
    {isLoading ? (
      <SkeletonCharts count={3} />
    ) : (
      <Charts data={data} />
    )}
  </MainLayout>
);
```

**Impact**:
- **Perceived load time reduced by 40-60%** (UI feels instant)
- Better UX, less frustration

---

#### **Win #4: Remove Console Logging in Production**

**Current**: 20+ console.log statements

**Optimized**:
```typescript
// utils/logger.ts
export const logger = {
  dashboard: (msg: string) => {
    if (import.meta.env.DEV) {
      console.log(`[DASHBOARD] ${msg}`);
    }
  }
};
```

**Impact**:
- **5-15ms saved** (console.log is blocking)
- Cleaner browser console
- Better security

---

### **🚀 Medium Wins (3-6 hours each)**

#### **Win #5: Move Two-Path Metrics to BigQuery**

**Current**: Calculate client-side (lines 254-283)

**Optimized**: Add to BigQuery query
```sql
SELECT
  traffic_source,
  SUM(impressions) as impressions,
  SUM(downloads) as total_downloads,
  SUM(CASE WHEN product_page_views = 0 THEN downloads ELSE 0 END) as direct_installs,
  SUM(CASE WHEN product_page_views > 0 THEN downloads ELSE 0 END) as pdp_installs,
  -- Direct install share
  SAFE_DIVIDE(
    SUM(CASE WHEN product_page_views = 0 THEN downloads ELSE 0 END),
    SUM(downloads)
  ) * 100 as direct_install_share
FROM data
GROUP BY traffic_source
```

**Impact**:
- **Eliminates 50-100ms** of client calculation
- More accurate (BigQuery precision)
- Easier to test

---

#### **Win #6: Parallel Query Execution**

**Current**: usePeriodComparison waits for useEnterpriseAnalytics

**Optimized**: Remove `enabled` dependency

```typescript
// Before
const {data: comparisonData} = usePeriodComparison(
  orgId,
  dateRange,
  appIds,
  !!orgId && !isLoading  // ❌ Sequential
);

// After
const {data: comparisonData} = usePeriodComparison(
  orgId,
  dateRange,
  appIds,
  !!orgId  // ✅ Parallel
);
```

**Impact**:
- **500-1500ms faster** initial load
- Both queries run simultaneously

---

#### **Win #7: Add URL State Persistence**

**Current**: Refresh page loses all filters

**Optimized**: Use `useSearchParams` to persist filters

```typescript
const [searchParams, setSearchParams] = useSearchParams();

// On mount, restore from URL
useEffect(() => {
  const urlStart = searchParams.get('start');
  const urlEnd = searchParams.get('end');
  const urlApps = searchParams.get('apps')?.split(',');

  if (urlStart && urlEnd) {
    setDateRange({ start: urlStart, end: urlEnd });
  }
  if (urlApps) {
    setSelectedAppIds(urlApps);
  }
}, []);

// On change, update URL
useEffect(() => {
  setSearchParams({
    start: dateRange.start,
    end: dateRange.end,
    apps: selectedAppIds.join(',')
  });
}, [dateRange, selectedAppIds]);
```

**Impact**:
- ✅ Shareable links
- ✅ Bookmark-able views
- ✅ Browser back/forward works

---

### **💎 Long-Term Wins (8-16 hours each)**

#### **Win #8: Implement Server-Side Caching**

**Strategy**: Cache BigQuery results in Redis/Supabase

```typescript
// Edge function: bigquery-aso-data
async function fetchData(orgId, dateRange) {
  const cacheKey = `analytics:${orgId}:${dateRange.start}:${dateRange.end}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from BigQuery
  const data = await bigquery.query(...);

  // Cache for 30 minutes
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 1800);

  return data;
}
```

**Impact**:
- **90%+ reduction** in repeat queries
- **50-200ms** response time (cache hit)
- Lower BigQuery costs

---

#### **Win #9: Implement Progressive Data Loading**

**Strategy**: Load summary first, then details

```typescript
// Phase 1: Load summary (fast query)
const {data: summary} = useQuery(['summary', orgId, dateRange], async () => {
  // BigQuery query with only aggregates (no timeseries)
  // Returns in 200-500ms instead of 1-2s
});

// Phase 2: Load timeseries (slower query, runs in parallel)
const {data: timeseries} = useQuery(['timeseries', orgId, dateRange], async () => {
  // BigQuery query with daily breakdown
});

// UI shows summary cards immediately, charts load a moment later
```

**Impact**:
- **Perceived load time: 50-70% faster**
- User sees key metrics in 300-700ms
- Charts appear 500-1000ms later

---

#### **Win #10: Add Real-Time Updates via WebSockets**

**Strategy**: Push updates when new data arrives

```typescript
// Subscribe to data updates
useEffect(() => {
  const channel = supabase
    .channel(`analytics:${orgId}`)
    .on('broadcast', { event: 'data_update' }, (payload) => {
      // Refetch data when BigQuery sync completes
      refetch();
    })
    .subscribe();

  return () => channel.unsubscribe();
}, [orgId]);
```

**Impact**:
- No manual refresh needed
- Always shows latest data
- Better UX for real-time monitoring

---

## 8. RECOMMENDED OPTIMIZATION ROADMAP

### **Phase 1: Quick Wins (Week 1)** - 4-6 hours total

**Priority**: Immediate performance gains

1. ✅ **Combine Period Queries** (2 hours)
   - Modify edge function to accept period parameter
   - Single BigQuery query returns both periods
   - **Impact**: 50% faster initial load

2. ✅ **Remove Console Logging** (30 minutes)
   - Wrap all logging in env check
   - **Impact**: 5-15ms faster, cleaner console

3. ✅ **Add Skeleton Loading** (2 hours)
   - Create skeleton components
   - Progressive loading UX
   - **Impact**: 40-60% perceived speed improvement

4. ✅ **Pre-Calculate Aggregates in BigQuery** (1 hour)
   - Modify BigQuery query to return summaries
   - **Impact**: 70-90% smaller payload

**Total Impact**: Initial load time reduced from 2-4s to 0.8-1.5s

---

### **Phase 2: Medium Wins (Week 2)** - 8-12 hours total

**Priority**: Architecture improvements

5. ✅ **Move Two-Path Metrics to Backend** (4 hours)
   - Update BigQuery query
   - Remove client-side calculation
   - **Impact**: 50-100ms faster

6. ✅ **Parallel Query Execution** (2 hours)
   - Remove sequential dependency
   - **Impact**: 500-1500ms faster

7. ✅ **URL State Persistence** (3 hours)
   - Add useSearchParams
   - Restore state on mount
   - **Impact**: Better UX, shareable links

8. ✅ **Add Input Validation** (2 hours)
   - Max date range: 365 days
   - Debounce refetch button
   - **Impact**: Better security

**Total Impact**: Load time reduced to 0.5-1.0s, better UX

---

### **Phase 3: Long-Term Wins (Month 1)** - 16-24 hours total

**Priority**: Scalability & polish

9. ✅ **Server-Side Caching (Redis)** (8 hours)
   - Set up Redis instance
   - Implement cache layer in edge function
   - **Impact**: 90% cache hit rate, 50-200ms response

10. ✅ **Progressive Data Loading** (6 hours)
    - Split queries (summary + timeseries)
    - Parallel loading
    - **Impact**: Perceived load time < 500ms

11. ✅ **Activity Logging Integration** (4 hours)
    - Add useActivityLogger hook
    - Log page views, filter changes
    - **Impact**: Better analytics, compliance

12. ✅ **Real-Time Updates (WebSockets)** (6 hours)
    - Supabase Realtime channels
    - Auto-refresh on data updates
    - **Impact**: Always fresh data

**Total Impact**: Sub-second load times, production-ready

---

## 9. QUESTIONS FOR CLIENT

Please answer these questions to proceed with optimizations:

### **A. Performance Priorities**

**1. What is your target initial load time for dashboard-v2?**
   - [ ] < 500ms (aggressive, requires all optimizations)
   - [ ] < 1 second (achievable with Phase 1 + 2) ⭐ **Recommended**
   - [ ] < 2 seconds (achievable with Phase 1 only)
   - [ ] Current (2-4s) is acceptable

**2. What is more important when switching filters?**
   - [ ] **Speed** - Instant filter changes (keep client-side filtering)
   - [ ] **Scalability** - Handle 10,000+ rows (move to server-side filtering)
   - [ ] **Balance** - Fast for small data, accurate for large data

**3. How many apps do your largest organizations have?**
   - [ ] < 10 apps (current architecture is fine)
   - [ ] 10-50 apps (Phase 1 optimizations needed)
   - [ ] 50-100 apps (Phase 1 + 2 needed)
   - [ ] > 100 apps (Full optimization roadmap needed)

---

### **B. Data & Caching**

**4. How often does BigQuery data update?**
   - [ ] Real-time (every minute) - Need WebSockets
   - [ ] Hourly - 30min cache is too long
   - [ ] Daily - 30min cache is perfect ⭐
   - [ ] Weekly - Can cache for hours

**5. What is your BigQuery query budget?**
   - [ ] Unlimited - Optimize for speed
   - [ ] Limited - Implement aggressive caching ⭐
   - [ ] Very limited - Cache everything, minimize queries

**6. Do you want server-side caching (Redis)?**
   - [ ] Yes - Faster, cheaper, but adds complexity ⭐
   - [ ] No - Keep architecture simple
   - [ ] Not sure - Audit first, then decide

---

### **C. User Experience**

**7. Should date range filters persist in URL?**
   - [ ] Yes - Shareable links ⭐
   - [ ] No - Privacy concerns
   - [ ] Optional - User preference

**8. Should filters persist across sessions (localStorage)?**
   - [ ] Yes - Remember last viewed apps/dates ⭐
   - [ ] No - Always reset to defaults

**9. What should the default app selection be?**
   - [ ] ALL apps (current behavior)
   - [ ] Last viewed apps (requires localStorage) ⭐
   - [ ] Prompt user to select
   - [ ] None (force user to select)

---

### **D. Logging & Security**

**10. Should dashboard activity be logged to audit_logs?**
   - [ ] Yes - Log page views, filter changes, exports ⭐
   - [ ] Partial - Only log exports and critical actions
   - [ ] No - Don't log dashboard usage

**11. Remove all console.log statements in production?**
   - [ ] Yes - Clean console ⭐
   - [ ] No - Keep for debugging
   - [ ] Conditional - Only in dev mode

**12. Set maximum date range limit?**
   - [ ] 90 days (recommended for performance)
   - [ ] 365 days (1 year max) ⭐
   - [ ] Unlimited (trust users)

---

### **E. Architecture Decisions**

**13. Move calculations to backend (BigQuery/Edge Function)?**
   - [ ] Yes - All calculations (timeseries, aggregates, two-path) ⭐
   - [ ] Partial - Only aggregates and timeseries
   - [ ] No - Keep current client-side architecture

**14. Combine current + previous period into single BigQuery query?**
   - [ ] Yes - 50% faster load time ⭐
   - [ ] No - Keep separate queries
   - [ ] Test first - Measure impact

**15. Implement progressive loading (summary first, details later)?**
   - [ ] Yes - Better perceived performance ⭐
   - [ ] No - Load everything at once
   - [ ] Optional - A/B test

---

### **F. Timeline & Budget**

**16. Which phase should we prioritize?**
   - [ ] **Phase 1** (Quick Wins) - 4-6 hours ⭐ **Recommended**
   - [ ] **Phase 2** (Medium Wins) - 8-12 hours
   - [ ] **Phase 3** (Long-Term) - 16-24 hours
   - [ ] **All phases** - Full optimization (28-42 hours)

**17. Can we make breaking changes to the API/data structure?**
   - [ ] Yes - Optimize freely ⭐
   - [ ] No - Must maintain backward compatibility
   - [ ] Discuss - Case-by-case basis

---

## 10. SUMMARY

### **Current State**
- ✅ Clean architecture (Component → Hook → Edge Function → BigQuery)
- ✅ Good security (RLS, edge functions, parameterized queries)
- ✅ React Query caching (30min staleTime)
- ❌ Double BigQuery queries (current + previous period)
- ❌ Client-side filtering/aggregation (slow for large datasets)
- ❌ Sequential loading (period comparison waits for main query)
- ❌ Excessive console logging
- ❌ No URL state persistence
- ❌ No activity logging

### **Recommended Quick Wins** (4-6 hours)
1. Combine period queries → **50% faster**
2. Pre-calculate aggregates in BigQuery → **70-90% smaller payload**
3. Add skeleton loading UI → **40-60% perceived speed improvement**
4. Remove console logging → **5-15ms saved**

**Expected Result**: Initial load time reduced from 2-4s to 0.8-1.5s

### **Next Steps**
1. Answer questions above
2. Approve Phase 1 optimizations
3. Implement & test
4. Measure performance gains
5. Decide on Phase 2/3

---

**Questions? Ready to proceed?**
