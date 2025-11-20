---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Comprehensive BigQuery schema and metrics reference (767 lines)
⚠️ Note: Contains critical BigQuery path errors throughout - HIGH priority fix required
See Also: docs/02-architecture/ARCHITECTURE_V1.md, DATA_PIPELINE_AUDIT.md
Audience: Developers, Data Engineers, Product Managers
---

# BigQuery Data Schema & Metrics Map

## 1. BigQuery TABLE STRUCTURE

### Source Database
- **Project**: `yodel-mobile-app`
- **Dataset**: `aso_reports`
- **Table**: `aso_all_apple`

### Table Schema (7 Columns)
```
Column                Type      Description
───────────────────────────────────────────────────────────
date                  DATE      Metric reporting date
app_id/client         STRING    Application identifier (coalesced)
traffic_source        STRING    Marketing channel breakdown
impressions           INTEGER   App store product page impressions
product_page_views    INTEGER   Distinct product page views
downloads             INTEGER   App installation count
conversion_rate       FLOAT     Calculated: downloads / product_page_views
```

### Data Examples
```
date       | app_id    | traffic_source      | impressions | ppv  | downloads | cvr
-----------|-----------|---------------------|-------------|------|-----------|-------
2024-11-14 | Mixbook   | App Store Search    | 15000       | 5000 | 750       | 0.15
2024-11-14 | Mixbook   | Web Referrer        | 8000        | 2000 | 300       | 0.15
2024-11-14 | Mixbook   | App Store Browse    | 12000       | 3500 | 420       | 0.12
```

---

## 2. DATA PIPELINE ARCHITECTURE

### Layer 1: BigQuery (Raw Data)
```
aso_all_apple table
    ↓
    ↓ [OAuth2 Authentication]
    ↓ [Service Account: BigQueryCredentials]
    ↓
```

### Layer 2: Edge Function (Data Fetch & Transform)
**File**: `/supabase/functions/bigquery-aso-data/index.ts`

**Key Responsibilities**:
1. Authentication (OAuth2 + Service Account)
2. Organization/App Access Control (RLS enforcement)
3. BigQuery Query Execution
4. Response Serialization

**Input Contract**:
```typescript
interface BigQueryRequest {
  organization_id: string;      // UUID of tenant organization
  org_id: string;               // Alternative field (deprecated)
  app_ids: string[];            // Selected apps to query
  date_range: {
    start: string;              // YYYY-MM-DD
    end: string;                // YYYY-MM-DD
  };
  metrics?: string[];           // Optional metric selection
  trafficSources?: string[];    // Optional traffic source filter
}
```

**Output Contract**:
```typescript
interface BigQueryResponse {
  data: BigQueryRow[];           // Raw query rows
  scope: {
    organization_id: string;
    org_id: string;
    app_ids: string[];
    date_range: { start: string; end: string };
    scope_source: 'platform_admin_selection' | 'user_membership';
    metrics: string[] | null;
    traffic_sources: string[] | null;
  };
  meta: {
    request_id: string;
    timestamp: string;
    data_source: 'bigquery';
    row_count: number;
    app_ids: string[];
    app_count: number;
    query_duration_ms: number;
    org_id: string;
    discovery_method: string;
    discovered_apps: number;
    available_traffic_sources: string[];  // ← Discovered from data
    all_accessible_app_ids: string[];     // ← RLS-filtered app list
    total_accessible_apps: number;
  };
}
```

**BigQuery Queries Executed**:

Query 1: Main Data Fetch
```sql
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `{projectId}.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
  AND date BETWEEN @start_date AND @end_date
ORDER BY date DESC
```

Query 2: Available Traffic Sources Discovery
```sql
SELECT DISTINCT traffic_source
FROM `{projectId}.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@all_app_ids)
  AND date BETWEEN @start_date AND @end_date
  AND traffic_source IS NOT NULL
```

**Security Controls**:
- RLS Policy: `org_app_access` table controls which apps user can access
- Super Admin: Must select organization before data access
- Org Admin: Limited to own organization + managed clients (agency model)
- Audit Logging: All data access logged via `log_audit_event()` RPC

### Layer 3: React Hook (Data Transformation)
**File**: `/src/hooks/useBigQueryData.ts`

**Exported Interfaces**:
```typescript
interface BigQueryDataPoint {
  date: string;
  organization_id: string;
  traffic_source: string;
  traffic_source_raw?: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  revenue: number;               // ← Always 0 (not in BigQuery)
  sessions: number;              // ← Always 0 (not in BigQuery)
  country: string;               // ← Not populated
  data_source: string;
}

interface BigQueryMeta {
  rowCount: number;
  totalRows: number;
  executionTimeMs: number;
  queryParams: {
    organizationId: string;
    dateRange: { from: string; to: string };
    selectedApps?: string[];
    trafficSources?: string[];
  };
  availableTrafficSources?: string[];
  filteredByTrafficSource?: boolean;
  projectId: string;
  timestamp: string;
  isDemo?: boolean;              // ← Demo mode flag
  periodComparison?: PeriodComparison;
}

interface BigQueryDataResult {
  data: AsoData | null;          // ← Transformed for UI
  loading: boolean;
  error: Error | null;
  meta?: BigQueryMeta;
  isDemo?: boolean;
  availableTrafficSources: string[] | undefined;
}
```

**Transformation Process**:

Step 1: Fetch from Edge Function
```typescript
const { data: response } = await supabase.functions.invoke('bigquery-aso-data', {
  body: requestBody
});
```

Step 2: Map Raw BigQuery Rows
```
BigQueryRow[] 
  ↓
  ↓ [mapBigQueryRows]
  ↓
BigQueryDataPoint[]
```

Step 3: Apply Traffic Source Filter
```typescript
const filtered = filterByTrafficSources(data, trafficSources);
const transformed = transformBigQueryToAsoData(filtered, meta);
```

Step 4: Create Aggregations
```typescript
interface AsoData {
  summary: AsoMetrics;                    // ← Total KPIs
  timeseriesData: TimeSeriesPoint[];      // ← Daily aggregates
  trafficSourceTimeseriesData: TrafficSourceTimeSeriesPoint[];  // ← Per-source by day
  trafficSources: TrafficSource[];        // ← Source breakdown
  cvrTimeSeries: TrafficSourceCVRTimeSeriesPoint[];  // ← CVR by source
}
```

**Aggregation Functions**:
- `createTrafficSourceTimeSeries()` - Pivots by date + traffic_source
- `createCVRTimeSeries()` - Calculates CVR (downloads/impressions and downloads/ppv)
- `transformBigQueryToAsoData()` - Produces final AsoData structure

### Layer 4: React Component (Presentation)
**Typical File**: `/src/pages/dashboard.tsx` or `/src/pages/ReportingDashboardV2.tsx`

**Component Hook Usage**:
```typescript
const { data, loading, error, meta, availableTrafficSources } = useBigQueryData(
  organizationId,      // UUID
  dateRange,           // { from: Date, to: Date }
  trafficSources,      // ['App Store Search', 'Web Referrer']
  ready,               // boolean (auth check)
  registerHookInstance // optional callback
);
```

**Data Access Pattern**:
```
Component State
  ↓
  ↓ [useBigQueryData hook]
  ↓
  ↓ [supabase.functions.invoke('bigquery-aso-data')]
  ↓
  ↓ [Edge Function: BigQuery Query]
  ↓
  ↓ [Transform: mapBigQueryRows → createTimeSeries]
  ↓
Component Renders
  ├─ Summary KPIs (impressions, downloads, CVR)
  ├─ Time Series Charts (daily trends)
  ├─ Traffic Source Breakdown (by channel)
  └─ CVR Metrics (by source)
```

---

## 3. AVAILABLE METRICS

### Core Metrics (Directly from BigQuery)
```
✅ Impressions
   - Definition: Product page impressions in App Store
   - Aggregation: SUM(impressions)
   - Available by: Date, Traffic Source, App

✅ Downloads
   - Definition: App installations
   - Aggregation: SUM(downloads)
   - Available by: Date, Traffic Source, App

✅ Product Page Views (PPV)
   - Definition: Distinct product page views
   - Aggregation: SUM(product_page_views)
   - Available by: Date, Traffic Source, App

✅ Conversion Rates
   - Impressions CVR: downloads / impressions * 100
   - PPV CVR: downloads / product_page_views * 100
   - Calculated at: Edge function & hook layer
   - Safe division: Uses SAFE_DIVIDE in BigQuery

✅ Traffic Source Breakdown
   - Dimensions: App Store Search, Web Referrer, App Referrer, Apple Search Ads, App Store Browse, Other
   - Granularity: All traffic sources available in data
   - Dynamic: Discovered from actual data (not hardcoded)
```

### Derived Metrics (Calculated in Hook)
```
✅ Period-over-Period Deltas
   - Type: Percentage change from previous period
   - Calculation: ((current - previous) / previous) * 100
   - Special: Handles zero previous values gracefully

✅ Traffic Source Metrics
   - Per-source impressions, downloads, PPV
   - Per-source CVR values
   - Source ranking by download volume

✅ Daily Time Series
   - Aggregated daily totals
   - Sorted chronologically
   - Includes conversion rates
```

### Demo Mode Metrics (Special Handling)
```
⚠️  Demo Mode Normalization
   - When isDemo === true, deltas are normalized to realistic ranges
   - Uses seeded RNG for consistency
   - Prevents suspicious-looking 999% increases
   - Ranges: 0.1% to 8% for realistic uplift
```

---

## 4. DATA TRANSFORMATIONS BY LAYER

### Edge Function Layer (bigquery-aso-data/index.ts)

**Input**: BigQueryRequest
**Output**: BigQueryResponse with:

1. **Row Mapping**:
   - Raw BigQuery rows (7-field format) → Structured objects
   - Null handling: defaults to 0 for numeric fields
   - Type conversion: string → number

2. **Organization Scoping**:
   - Agency relationships: Expands org list via `agency_clients` table
   - App filtering: RLS policy on `org_app_access`
   - User role enforcement: SUPER_ADMIN vs ORG_ADMIN vs standard user

3. **Data Discovery**:
   - Secondary query: Fetches all available traffic sources
   - Dynamic dimension discovery (not hardcoded)
   - Used for UI "traffic source picker"

4. **Response Assembly**:
   - Wraps raw data with metadata
   - Includes execution timing
   - Provides accessibility info (all_accessible_apps, available_traffic_sources)

### Hook Layer (useBigQueryData.ts)

**Input**: BigQueryResponse
**Output**: AsoData with aggregations

1. **Traffic Source Filtering**:
   - Client-side filter on `traffic_source` field
   - Minimal perf impact (JS array filter)
   - Triggers re-aggregation without refetch

2. **Time Series Creation**:
   - Group by date
   - Sum metrics by date
   - Calculate conversion rates

3. **Traffic Source Breakdown**:
   - Group by traffic_source
   - Create pivot table (source × metrics)
   - Calculate per-source CVR

4. **Comparison Data** (If available in meta):
   - Previous period totals
   - Delta calculations
   - Source-level comparisons

### Component Layer

**Input**: AsoData
**Output**: Rendered charts/tables

1. **KPI Cards**:
   - Display `summary.impressions.value` + `delta`
   - Display `summary.downloads.value` + `delta`
   - Display CVR metrics

2. **Time Series Charts**:
   - x-axis: date from `timeseriesData.date`
   - y-axis: impressions, downloads, or CVR
   - Optional: overlay multiple sources

3. **Source Breakdown**:
   - Pie/bar chart from `trafficSources` array
   - Show impressions, downloads, conversion rates
   - Ranked by download volume

---

## 5. UNAVAILABLE METRICS (NOT IN BIGQUERY)

```
❌ Keyword Ranking Data
   - Not stored in aso_all_apple table
   - Related: keyword_rankings table (empty)
   - Status: Keyword discovery service exists but incomplete
   - Impact: Keyword insights unavailable

❌ Competitor Metrics
   - Not in BigQuery data
   - Related: competitor_intelligence tables (exist but sparse)
   - Status: Competitor comparison UI disabled
   - Impact: Benchmarking against competitors not possible

❌ Metadata Change Logs
   - No changelog for app metadata updates
   - No version history tracking
   - Impact: Can't track "when app name changed" etc.

❌ Anomaly Detection
   - Not computed in pipeline
   - No statistical outlier flagging
   - Impact: Users must manually spot spikes

❌ Predictive Analytics
   - No forecasting/trend projection
   - No ML-based insights
   - Impact: Can't predict future performance

❌ Geographic Breakdown
   - `country` field in data models but not populated
   - BigQuery query doesn't include country dimension
   - Impact: Country-level analytics not available

❌ Session Metrics
   - `sessions` field always 0
   - Not available from App Store Connect API
   - Impact: Session-based analysis not possible

❌ Revenue Metrics
   - `revenue` field always 0
   - Not included in BigQuery table
   - Impact: Revenue attribution not available

❌ Cohort Analysis
   - No user cohort data
   - No retention metrics
   - Impact: Cohort-based analysis not possible

❌ Device/OS Breakdown
   - Not in aso_all_apple table
   - Impact: Can't analyze by device type

❌ App Version Analytics
   - No version-specific metrics
   - Impact: Can't track version-specific performance
```

---

## 6. QUERY PARAMETERS & FILTERING

### Supported Query Parameters
```typescript
// Date range (required)
date_range: {
  start: "2024-11-01",  // YYYY-MM-DD
  end: "2024-11-14"
}

// App selection (optional, defaults to all)
app_ids: [
  "Mixbook",
  "com.example.app"
]

// Traffic source filtering (optional, post-query)
traffic_sources: [
  "App Store Search",
  "Web Referrer",
  "Apple Search Ads"
]

// Metric selection (optional, sent but not used)
metrics: ["impressions", "downloads"]
```

### Unsupported Parameters
```
❌ Geographic filters (country not populated)
❌ Device/OS filters (not in data)
❌ Version filters (not in data)
❌ Keyword filters (not in data)
❌ Time-of-day breakdown (daily granularity only)
❌ Cohort selection (no cohort data)
```

---

## 7. TRAFFIC SOURCES (Available Values)

**From useMockAsoData.ts** - these are the expected sources:
```
App Store Search
Web Referrer
App Referrer
Apple Search Ads
App Store Browse
Other
```

**Discovery Method**: Dynamically queried from data
- Edge function discovers actual traffic sources in date range
- Returned in `meta.available_traffic_sources`
- May differ from hardcoded list if data varies

---

## 8. COMPLETE DATA FLOW EXAMPLE

### Request Flow
```
Dashboard Component
  └─ user clicks date range selector → updates state
  └─ fires useBigQueryData hook

useBigQueryData Hook
  └─ memoizes filters (deduplication)
  └─ calls fetchData()
  └─ invokes supabase.functions.invoke('bigquery-aso-data')
  └─ sends HTTP POST to Edge Function

Edge Function (bigquery-aso-data/index.ts)
  ├─ validates authorization (JWT)
  ├─ checks org_app_access RLS
  ├─ resolves org context (Super Admin, Org Admin, or regular user)
  ├─ builds organization list (including managed clients for agencies)
  ├─ validates app selection against RLS
  │
  ├─ Query 1: Main Data Fetch
  │  └─ SELECT impressions, downloads, ppv, conversion_rate
  │     FROM aso_all_apple
  │     WHERE app_id IN (selected) AND date BETWEEN start AND end
  │
  ├─ Query 2: Traffic Source Discovery
  │  └─ SELECT DISTINCT traffic_source
  │     FROM aso_all_apple
  │     WHERE app_id IN (all_accessible) AND date BETWEEN start AND end
  │
  └─ Response: 7-column rows + metadata

HTTP Response to Hook
  └─ BigQueryResponse { data, scope, meta }

Hook Processing
  ├─ mapBigQueryRows() → BigQueryDataPoint[]
  ├─ filterByTrafficSources() → filtered array
  ├─ transformBigQueryToAsoData() → AsoData
  │
  ├─ Sub-transformations:
  │  ├─ createTrafficSourceTimeSeries()
  │  ├─ createCVRTimeSeries()
  │  ├─ aggregate daily totals
  │  └─ calculate summary metrics
  │
  └─ setState(data, meta, availableTrafficSources)

Component Rendering
  ├─ KPI Cards
  │  └─ summary.impressions, downloads, cvr + deltas
  ├─ Time Series Chart
  │  └─ timeseriesData[] plotted
  ├─ Traffic Source Breakdown
  │  └─ trafficSources[] with metrics
  └─ Source-specific CVR Trends
     └─ cvrTimeSeries[] charted by source
```

### Data Shape Example (Real)
```json
{
  "data": [
    {
      "date": "2024-11-14",
      "organization_id": "7cccba3f-...",
      "traffic_source": "App Store Search",
      "impressions": 15000,
      "downloads": 750,
      "product_page_views": 5000,
      "conversion_rate": 0.15,
      "revenue": 0,
      "sessions": 0,
      "country": null,
      "data_source": "bigquery"
    }
  ],
  "meta": {
    "rowCount": 42,
    "timestamp": "2024-11-14T10:30:45Z",
    "availableTrafficSources": ["App Store Search", "Web Referrer", "Other"],
    "isDemo": false
  }
}
```

### Transformed Shape (Hook Output)
```json
{
  "summary": {
    "impressions": { "value": 420000, "delta": 5.2 },
    "downloads": { "value": 21000, "delta": 7.8 },
    "product_page_views": { "value": 140000, "delta": 4.1 },
    "cvr": { "value": 5.0, "delta": 2.1 }
  },
  "timeseriesData": [
    {
      "date": "2024-11-01",
      "impressions": 12000,
      "downloads": 600,
      "product_page_views": 4000,
      "conversion_rate": 5.0
    }
  ],
  "trafficSourceTimeseriesData": [
    {
      "date": "2024-11-01",
      "appStoreSearch_impressions": 5000,
      "appStoreSearch_downloads": 300,
      "appStoreSearch_product_page_views": 2000,
      "webReferrer_impressions": 4000,
      "webReferrer_downloads": 200,
      "totalDownloads": 600,
      "totalImpressions": 12000
    }
  ],
  "trafficSources": [
    {
      "traffic_source": "app_store_search",
      "traffic_source_display": "App Store Search",
      "impressions": 140000,
      "downloads": 7000,
      "product_page_views": 50000,
      "conversion_rate": 5.0,
      "metrics": {
        "impressions": { "value": 140000, "delta": 3.2 },
        "downloads": { "value": 7000, "delta": 5.1 }
      }
    }
  ]
}
```

---

## 9. ORGANIZATION ACCESS CONTROL

### User Roles & Data Access
```
Role            | Org Selection | Data Scope           | Managed Clients
────────────────┼───────────────┼──────────────────────┼─────────────────
SUPER_ADMIN     | Must select   | Selected org only    | N/A
ORG_ADMIN       | Auto (own)    | Own org + clients    | Via agency_clients
Standard User   | Auto (own)    | Own org only         | N/A
```

### Agency Model
```
Agency Organization (Yodel Mobile)
  ├─ Manages Client A (access via agency_clients)
  ├─ Manages Client B
  └─ Manages Client C
       ↓
When ORG_ADMIN from Agency queries:
  ├─ Can see Agency's apps
  ├─ Can see Client A's apps
  ├─ Can see Client B's apps
  └─ Can see Client C's apps
       ↓
All filtered through org_app_access RLS policy
```

---

## 10. CACHING STRATEGY

### Query Result Caching
- **Duration**: 5 minutes (typical)
- **Implementation**: React Query + Browser cache
- **TTL**: Managed by staleTime config

### App Metadata Caching
- **Duration**: Until next app discovery run
- **Scope**: org_app_access table
- **Invalidation**: Manual or scheduled

### Hook Instance Tracking
- **Purpose**: Prevent duplicate hook executions
- **Method**: Stable request key deduplication
- **Cleanup**: Auto-abort on unmount

---

## 11. ERROR HANDLING & EDGE CASES

### Handled Cases
```
✅ No organization context (Super Admin)
   → Prompt user to select organization

✅ No apps accessible to user
   → Return empty array with "no apps" message

✅ Missing date range
   → Return 400 error

✅ BigQuery authentication failure
   → Return 500 with "BigQuery credentials not configured"

✅ Zero PPV for a source
   → SAFE_DIVIDE prevents division by zero
   → Returns 0 for CVR instead of error

✅ No data in date range
   → Returns empty array gracefully
```

### Unhandled Cases
```
❌ Cross-organization access attempts
   → Logged as security incident but allowed (soft-blocking)
   → TODO: Hard-block after Phase 3 testing

❌ Invalid traffic source format
   → Passed through as-is (no validation)

❌ Timestamp timezone issues
   → Assumes UTC throughout
```

---

## 12. AUDIT LOGGING

All data access logged via:
```typescript
await supabaseClient.rpc('log_audit_event', {
  p_user_id: user.id,
  p_organization_id: resolvedOrgId,
  p_action: 'view_dashboard_v2',
  p_resource_type: 'bigquery_data',
  p_details: {
    app_count: appIdsForQuery.length,
    date_range: { start, end },
    row_count: rows.length
  }
});
```

**Logged For**: SOC 2 Type II, ISO 27001, GDPR compliance
**Not Logged**: Client IP, User Agent (not available in Edge Functions)

---

## SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Data Source** | BigQuery: `yodel-mobile-app.aso_reports.aso_all_apple` |
| **Schema** | 7 columns: date, app_id, traffic_source, impressions, ppv, downloads, cvr |
| **Core Metrics** | Impressions, Downloads, Product Page Views, Conversion Rates |
| **Available Dimensions** | Date, App, Traffic Source |
| **Unavailable** | Keywords, Competitors, Geo, Device, Version, Revenue, Cohorts |
| **Transformation** | BigQuery rows → BigQueryDataPoints → AsoData with aggregations |
| **Caching** | 5 minutes for query results |
| **Access Control** | RLS via org_app_access + role-based filtering |
| **Audit** | Logged for all data access events |

