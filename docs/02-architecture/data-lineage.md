---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Complete data lineage from App Store Connect to Dashboard V2 (source → transform → destination)
See Also: docs/02-architecture/data-dictionary.md
See Also: docs/05-workflows/data-pipeline-monitoring.md
See Also: docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md
Audience: Data Engineers, Architects, Compliance Officers
---

# ASO Data Lineage Documentation

## Overview

This document provides complete data lineage tracing for ASO (App Store Optimization) analytics data, from source systems through transformations to final consumption in Dashboard V2.

**Purpose:**
- Understand data flow and dependencies
- Support compliance requirements (SOC 2, GDPR)
- Debug data quality issues
- Plan infrastructure changes

**Compliance:** This document supports SOC 2 Type II audit requirements for data lineage documentation.

---

## Table of Contents

1. [End-to-End Data Flow](#end-to-end-data-flow)
2. [Data Sources](#data-sources)
3. [Transformation Layers](#transformation-layers)
4. [Refresh Schedules](#refresh-schedules)
5. [Data Retention](#data-retention)
6. [Lineage Diagrams](#lineage-diagrams)
7. [Change History](#change-history)

---

## End-to-End Data Flow

### High-Level Lineage

```
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 0: SOURCE SYSTEMS                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ System: App Store Connect                                                  │
│ Owner: Apple Inc.                                                          │
│ Data: App Store analytics (impressions, downloads, conversion metrics)    │
│ Refresh: Daily (12-24 hour delay)                                         │
│ API: App Store Connect API                                                │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ App Store Connect API
                              │ Authentication: API Key (JWT)
                              │ Rate Limit: 180 requests/hour
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: DATA INGESTION                                                   │
├────────────────────────────────────────────────────────────────────────────┤
│ Process: Automated ETL Pipeline                                           │
│ Frequency: Daily at 02:00 UTC                                             │
│ Technology: Custom Python scripts (or Google Cloud Composer)              │
│ Output Format: JSON → Parquet                                             │
│ Validation: Schema validation, null checks                                │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ BigQuery Storage API
                              │ Format: Parquet
                              │ Compression: Snappy
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: RAW DATA WAREHOUSE                                               │
├────────────────────────────────────────────────────────────────────────────┤
│ System: Google BigQuery                                                   │
│ Project: yodel-mobile-app                                                 │
│ Dataset: aso_reports                                                      │
│ Table: aso_all_apple                                                      │
│ Partitioning: By date column (daily partitions)                           │
│ Clustering: By app_id, traffic_source                                     │
│ Retention: 2 years (730 days)                                             │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ BigQuery API
                              │ Authentication: Service Account
                              │ Query Engine: BigQuery SQL
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: EDGE FUNCTION (DATA ACCESS & SECURITY)                           │
├────────────────────────────────────────────────────────────────────────────┤
│ Function: bigquery-aso-data                                               │
│ Runtime: Deno (Supabase Edge Functions)                                  │
│ Location: supabase/functions/bigquery-aso-data/index.ts                   │
│ Responsibilities:                                                          │
│   • User authentication (JWT validation)                                  │
│   • Authorization (RLS policy enforcement)                                │
│   • Query execution (parameterized SQL)                                   │
│   • Response caching (30-second TTL)                                      │
│   • Audit logging (SOC 2 compliance)                                      │
│ Output Format: JSON (BigQueryResponse structure)                          │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ HTTP POST (REST API)
                              │ Authentication: Bearer JWT
                              │ Format: JSON
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: CLIENT-SIDE CACHING                                              │
├────────────────────────────────────────────────────────────────────────────┤
│ Library: @tanstack/react-query v5                                         │
│ Hook: useEnterpriseAnalytics                                              │
│ Location: src/hooks/useEnterpriseAnalytics.ts                             │
│ Cache TTL: 30 minutes (stale-while-revalidate)                            │
│ Cache Key: ['enterprise-analytics-v3', orgId, dateRange]                  │
│ Storage: In-memory (React Query cache)                                    │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ React state updates
                              │ Format: AsoData structure
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: CLIENT-SIDE TRANSFORMATION                                       │
├────────────────────────────────────────────────────────────────────────────┤
│ Location: useEnterpriseAnalytics hook (filteredData useMemo)              │
│ Transformations:                                                           │
│   • Client-side app filtering (by selectedAppIds)                         │
│   • Client-side traffic source filtering (by selectedTrafficSources)      │
│   • Summary aggregation (calculateSummary)                                │
│   • Time series generation (filterTimeseries with date filling)           │
│   • Traffic source breakdown (grouping and ranking)                       │
│ Output Format: ProcessedData structure                                    │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ Component props
                              │ Format: AsoData + ProcessedData
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 6: PRESENTATION LAYER                                               │
├────────────────────────────────────────────────────────────────────────────┤
│ Component: ReportingDashboardV2                                           │
│ Location: src/pages/ReportingDashboardV2.tsx                              │
│ Visualizations:                                                            │
│   • KPI Cards (summary metrics + deltas)                                  │
│   • Time Series Charts (daily trends)                                     │
│   • Traffic Source Breakdown (pie/bar charts)                             │
│   • Conversion Funnel (multi-stage funnel)                                │
│   • Two-Path Analysis (Search vs Browse)                                  │
│ Library: Recharts (data visualization)                                    │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │ Browser rendering
                              │ Format: HTML + SVG
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ LAYER 7: END USER                                                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Interface: Dashboard V2 (/dashboard-v2)                                   │
│ Users: Org Admins, ASO Managers, Analysts, Super Admins                   │
│ Actions: View metrics, filter by date/app/traffic source, export data     │
│ Audit: All views logged in audit_logs table (7-year retention)            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### Source 1: App Store Connect API

**System:** App Store Connect (Apple)
**Owner:** Apple Inc. (third-party)
**Contact:** N/A (managed service)

**API Details:**
- **Endpoint:** `https://api.appstoreconnect.apple.com/v1/analyticsReports`
- **Authentication:** JWT (signed with private key)
- **Rate Limit:** 180 requests/hour per organization
- **Data Scope:** App Store organic traffic metrics (iOS apps only)

**Data Fields Extracted:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `date` | DATE | Reporting date | `2025-01-19` |
| `app_id` | STRING | App identifier (bundleId or name) | `com.example.app` |
| `traffic_source` | STRING | Acquisition channel | `App Store Search` |
| `impressions` | INTEGER | Product page impressions | `15000` |
| `product_page_views` | INTEGER | Distinct product page views | `5000` |
| `downloads` | INTEGER | First-time installations | `750` |
| `conversion_rate` | FLOAT | downloads / ppv | `0.15` |

**Data Latency:** 12-24 hours (Apple's processing delay)

**Data Availability:** Daily (no intra-day updates)

**Data Quality:**
- ✅ High accuracy (official Apple data)
- ✅ Complete coverage (all organic traffic)
- ❌ No revenue data
- ❌ No geographic breakdown
- ❌ No device/OS segmentation

**SLA:** Not defined by Apple (best-effort delivery)

**Historical Data:** Available from app launch date (retention varies by app)

**Cost:** Included in Apple Developer Program ($99/year)

---

### Source 2: Organizations & User Data

**System:** Supabase PostgreSQL (Internal)
**Owner:** Platform Engineering Team
**Database:** Production Supabase Database

**Tables Used for Access Control:**
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `organizations` | Organization master data | `id`, `name`, `slug`, `settings` |
| `user_roles` | User role assignments | `user_id`, `organization_id`, `role` |
| `org_app_access` | App access control (RLS) | `organization_id`, `app_id`, `attached_at`, `detached_at` |
| `agency_clients` | Agency relationships | `agency_org_id`, `client_org_id`, `is_active` |

**Data Refresh:** Real-time (transactional updates)

**Data Quality:**
- ✅ High consistency (ACID transactions)
- ✅ Referential integrity (foreign key constraints)
- ✅ RLS policies enforce access control

---

## Transformation Layers

### Transformation 1: ETL Ingestion (Layer 1)

**Process:** `aso-data-ingestion` (Python ETL pipeline)
**Frequency:** Daily at 02:00 UTC
**Runtime:** 30-60 minutes

**Steps:**

1. **Extract:**
   ```python
   # Fetch data from App Store Connect API
   for app in apps:
       response = app_store_connect_api.get_analytics(
           app_id=app.bundle_id,
           date_start=yesterday,
           date_end=yesterday,
           metrics=['impressions', 'downloads', 'product_page_views']
       )
   ```

2. **Transform:**
   ```python
   # Normalize field names
   normalized_data = {
       'date': response['date'],
       'app_id': response['app']['bundleId'] or response['app']['name'],
       'client': response['app']['organizationName'],
       'traffic_source': map_traffic_source(response['sourceType']),
       'impressions': int(response['impressions']),
       'product_page_views': int(response['pageViews']),
       'downloads': int(response['installs']),
       'conversion_rate': response['installs'] / response['pageViews'] if response['pageViews'] > 0 else 0
   }
   ```

3. **Validate:**
   ```python
   # Data quality checks
   assert normalized_data['date'] is not None
   assert normalized_data['impressions'] >= 0
   assert normalized_data['downloads'] >= 0
   assert normalized_data['conversion_rate'] >= 0 and normalized_data['conversion_rate'] <= 1
   ```

4. **Load:**
   ```python
   # Write to BigQuery (append mode)
   bigquery_client.load_table_from_dataframe(
       dataframe=df,
       destination='yodel-mobile-app.aso_reports.aso_all_apple',
       write_disposition='WRITE_APPEND'
   )
   ```

**Output:**
- **Destination:** `yodel-mobile-app.aso_reports.aso_all_apple`
- **Format:** BigQuery table (partitioned by date)
- **Row Count:** ~5,000 rows/day (varies by app count and traffic sources)

**Error Handling:**
- API rate limit exceeded → Exponential backoff retry (max 3 attempts)
- Authentication failure → Alert to #data-engineering Slack
- Data validation failure → Log error, skip row, continue processing
- BigQuery load failure → Retry with exponential backoff

**Monitoring:**
- Success/failure logged to CloudWatch or similar
- Slack notification on failure

---

### Transformation 2: BigQuery Query (Layer 3)

**Process:** Edge Function SQL query execution
**Frequency:** On-demand (user-initiated)
**Runtime:** 200-600ms per query

**SQL Template:**
```sql
-- Main data fetch query
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)  -- ← Parameterized (prevents SQL injection)
  AND date BETWEEN @start_date AND @end_date          -- ← Enables partition pruning
ORDER BY date DESC;
```

**Parameters:**
- `@app_ids`: ARRAY<STRING> (e.g., `['Mixbook', 'ColorJoy']`)
- `@start_date`: DATE (e.g., `2025-01-01`)
- `@end_date`: DATE (e.g., `2025-01-31`)

**Transformations Applied:**
- `COALESCE(app_id, client)` → Consistent app identifier
- `SAFE_DIVIDE(...)` → Prevents division by zero errors
- Partition pruning via `date BETWEEN` → Reduces cost by 10-100x

**Output Format:**
```json
{
  "data": [
    {
      "date": "2025-01-19",
      "app_id": "Mixbook",
      "traffic_source": "App Store Search",
      "impressions": 15000,
      "product_page_views": 5000,
      "downloads": 750,
      "conversion_rate": 0.15
    }
  ],
  "meta": {
    "row_count": 42,
    "query_duration_ms": 456,
    "available_traffic_sources": ["App Store Search", "Web Referrer", "Other"]
  }
}
```

**Access Control:**
- ✅ User authentication (JWT validation)
- ✅ RLS policy enforcement (org_app_access table)
- ✅ Agency expansion (agency_clients table)
- ✅ Audit logging (log_audit_event RPC)

---

### Transformation 3: Client-Side Aggregation (Layer 5)

**Process:** React hook aggregation (`useEnterpriseAnalytics`)
**Frequency:** On-demand (filter changes)
**Runtime:** 1-5ms (client-side)

**Transformations:**

#### 3.1 App Filtering
```typescript
// Filter by selectedAppIds
const filteredByApp = rawData.filter(row =>
  appIds.length === 0 || appIds.includes(row.app_id)
);
```

#### 3.2 Traffic Source Filtering
```typescript
// Filter by selectedTrafficSources
const filteredByTrafficSource = filteredByApp.filter(row =>
  trafficSources.length === 0 || trafficSources.includes(row.traffic_source)
);
```

#### 3.3 Summary Aggregation
```typescript
// Calculate total metrics
const summary = filteredByTrafficSource.reduce((acc, row) => ({
  impressions: acc.impressions + row.impressions,
  downloads: acc.downloads + row.downloads,
  product_page_views: acc.product_page_views + row.product_page_views
}), { impressions: 0, downloads: 0, product_page_views: 0 });

// Calculate CVR
summary.cvr = summary.impressions > 0
  ? (summary.downloads / summary.impressions) * 100
  : 0;
```

#### 3.4 Time Series Generation (with Date Filling)
```typescript
// Generate complete date range (prevents sparse dates)
const allDates: string[] = [];
for (let d = new Date(dateRange.start); d <= new Date(dateRange.end); d.setDate(d.getDate() + 1)) {
  allDates.push(d.toISOString().split('T')[0]);
}

// Initialize all dates with zeros
const grouped: Record<string, any> = {};
allDates.forEach(date => {
  grouped[date] = { date, impressions: 0, downloads: 0, product_page_views: 0 };
});

// Aggregate actual data
filteredByTrafficSource.forEach(row => {
  if (grouped[row.date]) {
    grouped[row.date].impressions += row.impressions;
    grouped[row.date].downloads += row.downloads;
    grouped[row.date].product_page_views += row.product_page_views;
  }
});

// Calculate daily CVR
const timeseries = Object.values(grouped).map(day => ({
  ...day,
  cvr: day.impressions > 0 ? (day.downloads / day.impressions) * 100 : 0
}));
```

**Why Date Filling?**
- BigQuery returns only dates with data (sparse)
- Charts require complete date range (no gaps)
- Zero values for missing dates prevent chart rendering errors

**Output Format:**
```typescript
interface ProcessedData {
  summary: {
    impressions: { value: number; delta: number };
    downloads: { value: number; delta: number };
    cvr: { value: number; delta: number };
  };
  timeseries: TimeSeriesPoint[];
  traffic_sources: TrafficSource[];
}
```

---

## Refresh Schedules

### Schedule Matrix

| Component | Refresh Frequency | Scheduled Time (UTC) | Owner | Technology |
|-----------|-------------------|----------------------|-------|------------|
| **App Store Connect API** | Daily | Varies (Apple-controlled) | Apple | Managed Service |
| **ETL Ingestion Pipeline** | Daily | 02:00 UTC | Data Engineering | Python + Cloud Scheduler |
| **BigQuery Table** | Daily | 03:00 UTC (after ingestion) | Data Engineering | BigQuery |
| **Edge Function Cache** | Real-time (30s TTL) | On-demand (user query) | Backend Engineering | Supabase Edge Functions |
| **React Query Cache** | Real-time (30min TTL) | On-demand (user query) | Frontend Engineering | React Query |
| **Dashboard V2 UI** | Real-time | On-demand (user action) | Frontend Engineering | React |

---

### Detailed Refresh Workflows

#### Workflow 1: Daily Data Ingestion

**Trigger:** Cloud Scheduler (cron: `0 2 * * *` - daily at 02:00 UTC)

**Steps:**
1. **02:00 UTC:** Cloud Scheduler triggers ETL pipeline
2. **02:00-03:00 UTC:** Pipeline fetches data from App Store Connect API
3. **03:00 UTC:** Pipeline writes data to BigQuery
4. **03:00 UTC:** Data available in `aso_all_apple` table
5. **03:01 UTC:** Data freshness check runs (health check)
6. **03:01 UTC:** Slack notification if data freshness SLA breached

**Duration:** 30-60 minutes (varies by app count)

**Error Handling:**
- If ingestion fails, retry after 30 minutes (max 3 retries)
- If all retries fail, alert to PagerDuty + Slack #data-engineering

---

#### Workflow 2: User-Initiated Dashboard Refresh

**Trigger:** User opens Dashboard V2 or changes filters

**Steps:**
1. **User action:** Navigate to `/dashboard-v2` or change date range
2. **Frontend:** `useEnterpriseAnalytics` hook invoked
3. **React Query:** Check cache for matching key
   - **Cache hit:** Return cached data instantly (~5-10ms)
   - **Cache miss:** Proceed to step 4
4. **Frontend → Edge Function:** HTTP POST to `bigquery-aso-data`
5. **Edge Function:** Check 30-second hot cache
   - **Cache hit:** Return cached response (~50ms)
   - **Cache miss:** Proceed to step 6
6. **Edge Function → BigQuery:** Execute SQL query
7. **BigQuery:** Return results (200-600ms)
8. **Edge Function:** Cache response (30s TTL), return to frontend
9. **Frontend:** Cache response (30min TTL), render UI

**Duration:**
- Cold start (no cache): 600-1000ms
- Warm start (Edge cache hit): 50-100ms
- Hot start (React Query cache hit): 5-10ms

---

## Data Retention

### Retention Policies

| System | Data Type | Retention Period | Purge Method | Compliance |
|--------|-----------|------------------|--------------|------------|
| **BigQuery (aso_all_apple)** | ASO metrics | 2 years (730 days) | Automatic partition expiration | GDPR compliant |
| **Edge Function Logs** | Request/response logs | 7 days | Automatic log rotation | SOC 2 compliant |
| **Audit Logs (audit_logs table)** | User actions | 7 years (2,555 days) | Manual archival to cold storage | SOC 2, ISO 27001 |
| **React Query Cache** | Dashboard data | 1 hour (garbage collection) | In-memory (browser close clears) | N/A (client-side) |
| **Edge Function Cache** | Query results | 30 seconds | In-memory TTL expiration | N/A (ephemeral) |

---

### Retention Justification

**BigQuery (2 years):**
- **Business need:** Year-over-year analysis requires 2 years of data
- **Compliance:** GDPR allows proportionate retention for analytics
- **Cost:** ~$0.02/GB/month (affordable for 2-year retention)

**Audit Logs (7 years):**
- **Compliance:** SOC 2 Type II requires 7-year audit trail
- **Legal:** Potential litigation requires long-term records
- **Cost:** Archived to cold storage after 1 year (reduces cost by 90%)

**Edge Function Cache (30 seconds):**
- **Performance:** Reduces BigQuery costs by 60-70%
- **Freshness:** 30-second delay acceptable for analytics data
- **Memory:** In-memory cache, no disk usage

**React Query Cache (30 minutes):**
- **UX:** Instant filter changes (no refetch needed)
- **Freshness:** Data updates daily, 30-min cache acceptable
- **Memory:** Browser memory, cleared on tab close

---

## Lineage Diagrams

### Diagram 1: Data Flow with Latencies

```
App Store Connect API
  │
  │ Latency: 12-24 hours (Apple delay)
  ↓
ETL Ingestion Pipeline (Python)
  │
  │ Latency: 30-60 minutes (processing)
  ↓
BigQuery Table (aso_all_apple)
  │
  │ Latency: 200-600ms (query execution)
  ↓
Edge Function (bigquery-aso-data)
  │
  │ Latency: 50-100ms (network + processing)
  ↓
React Query Cache
  │
  │ Latency: 5-10ms (memory access)
  ↓
Client-Side Transformation
  │
  │ Latency: 1-5ms (JS execution)
  ↓
Dashboard V2 UI
```

**Total End-to-End Latency:** 13-26 hours (source to dashboard)

---

### Diagram 2: Data Security & Access Control

```
User → JWT Token → Edge Function
                        │
                        ↓
                   Auth Check (Supabase Auth)
                        │
                        ↓
                   RLS Policy Check (org_app_access)
                        │
                        ├── User in organization? ✅
                        ├── Agency relationship? ✅
                        └── Super admin? ✅
                        │
                        ↓
                   BigQuery Query Execution
                        │
                        ↓
                   Audit Log (log_audit_event)
                        │
                        ↓
                   Response to User
```

**Security Layers:**
1. JWT authentication (user identity)
2. RLS policy enforcement (data access control)
3. Parameterized queries (SQL injection prevention)
4. Audit logging (compliance tracking)

---

### Diagram 3: Caching Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: React Query Cache (30min TTL)                          │
│ Key: ['enterprise-analytics-v3', orgId, dateRange]              │
│ Hit Rate: 80-90%                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │ Cache miss
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Edge Function Cache (30s TTL)                          │
│ Key: hash(orgId, appIds, dateRange)                             │
│ Hit Rate: 60-70%                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │ Cache miss
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: BigQuery (no cache, always fresh)                      │
│ Query: SELECT ... FROM aso_all_apple WHERE ...                  │
│ Cost: $5/TB scanned                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Cache Strategy:**
- **Layer 1 (React Query):** Reduces server load, instant UX
- **Layer 2 (Edge Function):** Reduces BigQuery costs by 60-70%
- **Layer 3 (BigQuery):** Source of truth, always up-to-date

---

## Change History

### Version 1.0 (January 20, 2025)
- Initial data lineage documentation
- Documented 7-layer pipeline from App Store Connect to Dashboard V2
- Defined refresh schedules and retention policies
- Created lineage diagrams with latencies

### Planned Changes

**Q1 2025:**
- Add materialized views to BigQuery for faster aggregations
- Implement Redis caching layer to replace in-memory Edge Function cache
- Add data quality monitoring with automated alerts

**Q2 2025:**
- Integrate with dbt for data transformation pipeline
- Add data catalog with metadata management
- Implement column-level lineage tracking

**Q3 2025:**
- Add ML-based anomaly detection for data quality
- Implement real-time data streaming (replace batch ETL)
- Add geographic data dimension (requires third-party integration)

---

## Related Documentation

- **Data Dictionary:** [docs/02-architecture/data-dictionary.md](./data-dictionary.md)
- **BigQuery Query Examples:** [docs/04-api-reference/bigquery-query-examples.md](../../04-api-reference/bigquery-query-examples.md)
- **Data Pipeline Monitoring:** [docs/05-workflows/data-pipeline-monitoring.md](../../05-workflows/data-pipeline-monitoring.md)
- **Data Pipeline Audit:** [docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md](../../03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md)
- **BigQuery Schema Reference:** [docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md](../../03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md)

---

**Document Version:** 1.0
**Last Updated:** January 20, 2025
**Maintained By:** Data Engineering Team, Architecture Team
**Compliance:** SOC 2 Type II, GDPR, ISO 27001
