# BigQuery Data Pipeline - Quick Reference

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ Layer 1: BIGQUERY (Raw Data Source)                                  │
├──────────────────────────────────────────────────────────────────────┤
│ Project: aso-reporting-1                                             │
│ Dataset: client_reports                                              │
│ Table:   aso_all_apple (7 columns)                                   │
│                                                                       │
│ Columns: date | app_id | traffic_source | impressions | ppv |        │
│          downloads | conversion_rate                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │ OAuth2 + Service Account
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Layer 2: EDGE FUNCTION (Fetch & Validate)                            │
├──────────────────────────────────────────────────────────────────────┤
│ File: /supabase/functions/bigquery-aso-data/index.ts                 │
│                                                                       │
│ Steps:                                                               │
│ 1. Authenticate user (JWT)                                          │
│ 2. Check org_app_access RLS                                         │
│ 3. Resolve org context (SUPER_ADMIN/ORG_ADMIN/user)                │
│ 4. Expand orgs (agency_clients)                                     │
│ 5. Execute Query 1: Main data fetch                                │
│ 6. Execute Query 2: Traffic source discovery                       │
│ 7. Map rows & serialize response                                   │
│ 8. Log audit event (SOC 2 compliance)                              │
│                                                                       │
│ Output: BigQueryResponse {                                          │
│   data: BigQueryRow[],                                             │
│   scope: {...},                                                     │
│   meta: {row_count, available_traffic_sources, ...}                │
│ }                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP POST
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Layer 3: REACT HOOK (Transform & Aggregate)                          │
├──────────────────────────────────────────────────────────────────────┤
│ File: /src/hooks/useBigQueryData.ts                                  │
│                                                                       │
│ Steps:                                                               │
│ 1. Call edge function with request body                            │
│ 2. mapBigQueryRows() → BigQueryDataPoint[]                         │
│ 3. filterByTrafficSources() → filtered array                       │
│ 4. transformBigQueryToAsoData() → AsoData                          │
│    a. createTrafficSourceTimeSeries()                             │
│    b. createCVRTimeSeries()                                       │
│    c. aggregate daily totals                                      │
│    d. calculate summary metrics                                   │
│ 5. setState(data, meta, availableTrafficSources)                  │
│                                                                       │
│ Output: BigQueryDataResult {                                        │
│   data: AsoData,                                                   │
│   loading: boolean,                                                │
│   error: Error | null,                                            │
│   meta: BigQueryMeta,                                             │
│   availableTrafficSources: string[]                               │
│ }                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Custom Hook State
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│ Layer 4: REACT COMPONENT (Presentation)                              │
├──────────────────────────────────────────────────────────────────────┤
│ Files: /src/pages/dashboard.tsx, ReportingDashboardV2.tsx            │
│                                                                       │
│ Renders:                                                             │
│ ├─ KPI Cards (impressions, downloads, cvr + deltas)               │
│ ├─ Time Series Charts (daily trends)                              │
│ ├─ Traffic Source Breakdown (pie/bar chart)                       │
│ └─ CVR Metrics (by source)                                        │
│                                                                       │
│ Data Sources:                                                        │
│ ├─ summary.impressions.value, delta                               │
│ ├─ timeseriesData[] (date, impressions, downloads, cvr)          │
│ ├─ trafficSources[] (source, metrics, delta)                      │
│ └─ cvrTimeSeries[] (date, cvr by source)                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Available Metrics

### Core (7 Total) ✅

| Metric | Definition | Grain | Source |
|--------|-----------|-------|--------|
| **Impressions** | Product page impressions | Date, App, Source | BigQuery raw |
| **Downloads** | App installations | Date, App, Source | BigQuery raw |
| **Product Page Views** | Distinct PPV | Date, App, Source | BigQuery raw |
| **Impressions CVR** | downloads / impressions * 100 | Date, App, Source | Calculated |
| **PPV CVR** | downloads / ppv * 100 | Date, App, Source | Calculated |
| **Traffic Sources** | Breakdown by channel | Date, App | Discovered |
| **Deltas** | Period-over-period % change | Summary, Source | Calculated |

### Unavailable (11 Total) ❌

| Metric | Reason | Impact |
|--------|--------|--------|
| Keywords | Not in BigQuery table | Can't track keyword performance |
| Competitors | No comparative data | No competitive benchmarking |
| Geographic | `country` field unpopulated | No country-level analysis |
| Device/OS | Not in aso_all_apple | Can't segment by device |
| Versions | Not in data | Can't track version-specific metrics |
| Revenue | Not available from API | No revenue attribution |
| Sessions | Not in data | No session-based analysis |
| Anomalies | Not computed | Must spot manually |
| Forecasts | No ML pipeline | Can't predict trends |
| Change Logs | No versioning | No audit trail for metadata |
| Cohorts | No user cohort data | No retention analysis |

---

## Key Files & Their Roles

```
BigQuery Integration Files
├── supabase/functions/bigquery-aso-data/index.ts
│   └─ Core edge function: query BigQuery + validate access
│
├── supabase/functions/sync-bigquery-apps/index.ts
│   └─ Discover apps from BigQuery table
│
├── src/hooks/useBigQueryData.ts
│   └─ Main hook: fetch + transform data
│
├── src/hooks/useBigQueryApps.ts
│   └─ Fetch list of available apps for org
│
├── src/context/BigQueryAppContext.tsx
│   └─ State management for selected apps
│
├── src/utils/filterByTrafficSources.ts
│   └─ Client-side traffic source filtering
│
└── docs/bigquery-integration.md
    └─ Integration guide (existing)

Type Definitions
├── src/hooks/useMockAsoData.ts
│   └─ AsoData, TimeSeriesPoint, TrafficSource interfaces
│
└── src/integrations/supabase/types.ts
    └─ Database-level types
```

---

## Request/Response Contracts

### Request to Edge Function

```typescript
// File: /supabase/functions/bigquery-aso-data/index.ts
const body = {
  // Organization context (required)
  organization_id: "7cccba3f-0a8f-446f-9dba-86e9cb68c92b",
  org_id: "...",  // alternate field (deprecated)
  
  // App selection (optional, defaults to all)
  app_ids: ["Mixbook", "com.example.app"],
  
  // Date range (required)
  date_range: {
    start: "2024-11-01",  // YYYY-MM-DD
    end: "2024-11-14"
  },
  
  // Optional filters (sent but mostly unused)
  metrics: ["impressions", "downloads"],
  trafficSources: ["App Store Search"]
}
```

### Response from Edge Function

```typescript
// File: /supabase/functions/bigquery-aso-data/index.ts
{
  data: [
    {
      date: "2024-11-14",
      app_id: "Mixbook",
      traffic_source: "App Store Search",
      impressions: 15000,
      product_page_views: 5000,
      downloads: 750,
      conversion_rate: 0.15
    }
    // ... more rows
  ],
  
  scope: {
    organization_id: "...",
    org_id: "...",
    app_ids: ["Mixbook"],
    date_range: { start: "2024-11-01", end: "2024-11-14" },
    scope_source: "user_membership",
    metrics: null,
    traffic_sources: null
  },
  
  meta: {
    request_id: "uuid",
    timestamp: "2024-11-14T10:30:45Z",
    data_source: "bigquery",
    row_count: 42,
    app_ids: ["Mixbook"],
    app_count: 1,
    query_duration_ms: 456,
    org_id: "...",
    discovery_method: "user_membership",
    discovered_apps: 1,
    available_traffic_sources: ["App Store Search", "Web Referrer", "Other"],
    all_accessible_app_ids: ["Mixbook", "OtherApp"],
    total_accessible_apps: 2
  }
}
```

---

## Transformation Examples

### Raw BigQuery Row

```
date=2024-11-14 | app_id=Mixbook | traffic_source=App Store Search | 
impressions=15000 | ppv=5000 | downloads=750 | cvr=0.15
```

### After mapBigQueryRows()

```typescript
{
  date: "2024-11-14",
  app_id: "Mixbook",
  traffic_source: "App Store Search",
  impressions: 15000,
  downloads: 750,
  product_page_views: 5000,
  conversion_rate: 0.15,
  revenue: 0,           // Not in BigQuery
  sessions: 0,          // Not in BigQuery
  country: null,        // Not populated
  data_source: "bigquery"
}
```

### After transformBigQueryToAsoData()

```typescript
{
  summary: {
    impressions: { value: 420000, delta: 5.2 },
    downloads: { value: 21000, delta: 7.8 },
    product_page_views: { value: 140000, delta: 4.1 },
    cvr: { value: 5.0, delta: 2.1 },
    product_page_cvr: { value: 15.0, delta: 1.8 },
    impressions_cvr: { value: 5.0, delta: 2.1 }
  },
  
  timeseriesData: [
    { date: "2024-11-01", impressions: 12000, downloads: 600, 
      product_page_views: 4000, conversion_rate: 5.0 },
    // ... one per day
  ],
  
  trafficSources: [
    {
      traffic_source: "app_store_search",
      traffic_source_display: "App Store Search",
      impressions: 140000,
      downloads: 7000,
      product_page_views: 50000,
      conversion_rate: 5.0,
      metrics: {
        impressions: { value: 140000, delta: 3.2 },
        downloads: { value: 7000, delta: 5.1 },
        // ... other metrics
      }
    }
    // ... other sources
  ],
  
  trafficSourceTimeseriesData: [
    {
      date: "2024-11-01",
      appStoreSearch_impressions: 5000,
      appStoreSearch_downloads: 300,
      appStoreSearch_product_page_views: 2000,
      webReferrer_impressions: 4000,
      webReferrer_downloads: 200,
      // ... all sources
      totalDownloads: 600,
      totalImpressions: 12000,
      totalProductPageViews: 4000
    }
    // ... one per day
  ],
  
  cvrTimeSeries: [
    {
      date: "2024-11-01",
      appStoreSearch_impression_cvr: 6.0,
      appStoreSearch_product_page_cvr: 15.0,
      webReferrer_impression_cvr: 5.0,
      webReferrer_product_page_cvr: 10.0,
      // ... all sources
    }
    // ... one per day
  ]
}
```

---

## Security & Access Control

### Organization Scoping
```
Request arrives with: organization_id = user's org

Edge Function:
1. Check: Is user SUPER_ADMIN?
   ✅ Yes → Must have selected org in request
   ❌ No → Use user's org from user_roles table

2. Check: Is user's org an agency?
   ✅ Yes → Expand org list with agency_clients
   ❌ No → Use just user's org

3. Query org_app_access:
   → Get all apps user can access
   → Filter requested apps against allowed list
   → Return only accessible apps
```

### Role-Based Access
```
SUPER_ADMIN:
├─ Must select organization context
├─ Can access all apps in selected org
└─ Query: all accessible apps in org

ORG_ADMIN:
├─ Auto-selected to own org
├─ Can access own org + managed clients
├─ Agency model supported
└─ Query: own org + all managed client apps

Standard User:
├─ Auto-selected to own org
├─ Can access only own org
└─ Query: only own org apps
```

---

## Caching

### Query Results
- **Duration**: 5 minutes (React Query staleTime)
- **Scope**: Per organization + app + date range
- **Key**: `bigquery-apps-${organizationId}`
- **Invalidation**: Manual or time-based

### Traffic Source List
- **Duration**: Same request (discovered from query)
- **Scope**: Per query execution
- **Update**: Every fetch to ensure UI has latest sources

### App Metadata
- **Duration**: 5 minutes (React Query)
- **Scope**: Per organization
- **Source**: org_app_access table

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No data" in dashboard | Wrong org selected (SUPER_ADMIN) | Select correct organization |
| Traffic sources missing | Outside query date range | Expand date range or check raw data |
| Slow query times | Large date range or many apps | Reduce date range or filter apps |
| Auth error 401 | Invalid/expired JWT | Re-login |
| Auth error 403 | No app access (RLS policy) | Check org_app_access table |
| "BigQuery not configured" | Missing credentials | Set BIGQUERY_CREDENTIALS env |
| CVR = 0 or NaN | Zero PPV for source | Expected; safe division handles it |

---

## Testing & Debugging

### Enable Debug Logging
```typescript
// In component
const { data, meta } = useBigQueryData(...);
console.log('Query duration:', meta?.executionTimeMs, 'ms');
console.log('Available sources:', meta?.availableTrafficSources);
console.log('All accessible apps:', meta?.all_accessible_app_ids);
```

### Check Edge Function Logs
```bash
supabase functions logs bigquery-aso-data
```

### Test BigQuery Query Directly
```sql
-- From Google Cloud Console
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-14'
ORDER BY date DESC
LIMIT 100
```

---

## Related Documentation

- Full schema details: `docs/BIGQUERY_SCHEMA_AND_METRICS_MAP.md`
- Integration guide: `docs/bigquery-integration.md`
- Organization model: `ACCESS_LEVEL_ARCHITECTURE_DEEP_DIVE.md`
- Super admin features: `SUPER_ADMIN_QUICK_REFERENCE.md`

