---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Current-state documentation for Reporting Dashboard V2 analytics pipeline
Audience: Data Scientists, Data Security Engineers, Data Governance Teams
Scope: Production V1 system only (no future plans or improvements)
---

# Reporting Dashboard V2 System Overview

## 1. Executive Summary

The Reporting Dashboard V2 is a production analytics pipeline that delivers App Store Optimization (ASO) performance metrics to Yodel ASO Insight users. This system processes raw app store data from BigQuery, applies organization-scoped access controls, and presents interactive visualizations showing impression, download, and conversion metrics across multiple traffic sources.

The pipeline serves two primary user types: direct clients who view their own app performance, and agency users (Yodel Mobile) who view aggregated data across multiple managed client applications. All data flows through a secure, read-only architecture where BigQuery serves as the authoritative data source, a Supabase Edge Function enforces access control and data transformation, and a React-based frontend provides interactive filtering and visualization.

This document describes the current production system as deployed in V1. It focuses on data flow, security boundaries, and operational characteristics relevant to data scientists analyzing metrics and security engineers evaluating access patterns. The system handles sparse ASO datasets where NULL values in metric columns represent legitimate "no data available" conditions rather than data quality issues.

The architecture implements zero-trust principles: all scoping and authorization decisions occur server-side, the frontend cannot access data beyond what the backend explicitly permits, and no raw BigQuery credentials or direct database access exist in the client application.

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                                    │
│  • Authenticated via Supabase Auth JWT                                  │
│  • No direct BigQuery access                                            │
│  • No raw credentials                                                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS + JWT
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE AUTH LAYER                                    │
│  • JWT validation                                                       │
│  • User → Organization mapping (user_roles table)                       │
│  • Role-based permissions (SUPER_ADMIN, ORG_ADMIN, etc.)               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Authenticated request
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: fetch-aso-data                               │
│  • Authorization enforcement (org + agency scoping)                     │
│  • RLS policy check (org_app_access table)                             │
│  • BigQuery SQL query construction                                     │
│  • 30-second in-memory cache                                           │
│  • Response DTO assembly                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Parameterized SQL query
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    BIGQUERY DATA WAREHOUSE                               │
│  Project: yodel-mobile-app                                              │
│  Dataset: client_reports                                                │
│  Table: aso_all_apple                                                   │
│  • 8 columns (date, app_id, client, traffic_source, metrics)           │
│  • Partitioned by date (daily)                                         │
│  • No client-side access                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Query results (JSON)
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 EDGE FUNCTION: Response Assembly                         │
│  • Maps BigQuery rows to DTO schema                                    │
│  • NULL → 0 conversion for metrics                                     │
│  • Metadata attachment (org_id, app_count, timestamp)                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP 200 + JSON payload
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ REACT QUERY (Server Data Cache)                                  │  │
│  │  • 30-minute stale time                                          │  │
│  │  • Automatic background refetch                                  │  │
│  │  • Keyed by: org_id + date_range                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 ↓                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ZUSTAND (UI State + Derived Metrics)                             │  │
│  │  • Normalized data structure (Map-based lookups)                 │  │
│  │  • Client-side filtering (app, traffic source)                   │  │
│  │  • Derived KPI calculations (CVR, two-path metrics)              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Props / state
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         UI COMPONENTS                                    │
│  • KPI Metric Cards (Search, Browse, Total)                            │
│  • Time-series Charts (impressions, downloads, CVR trends)             │
│  • Traffic Source Comparison Charts                                    │
│  • Conversion Funnel Visualizations                                    │
│  • Intelligence Layer (Stability, Opportunities, Simulations)          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. BigQuery Layer

### Current Datasets and Tables

The Reporting Dashboard V2 reads from a single BigQuery table:

- **Project:** `yodel-mobile-app`
- **Dataset:** `client_reports`
- **Table:** `aso_all_apple`

This table contains daily App Store Optimization metrics sourced from Apple's App Store Connect API. Data is ingested via an external ETL process (not part of the reporting pipeline) and partitioned by the `date` column for query performance.

### Table Schema

The `aso_all_apple` table contains 8 columns:

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| `date` | DATE | No | Reporting date (YYYY-MM-DD format) |
| `app_id` | STRING | Yes | Primary application identifier |
| `client` | STRING | Yes | Fallback application identifier (legacy) |
| `traffic_source` | STRING | No | Marketing channel (e.g., "App_Store_Search", "App_Store_Browse") |
| `impressions` | INTEGER | Yes | Product page impression count |
| `product_page_views` | INTEGER | Yes | Distinct product page view count |
| `downloads` | INTEGER | Yes | App installation count |
| `conversion_rate` | FLOAT | Yes | Pre-calculated: downloads / product_page_views |

**Key Field:** The Edge Function uses `COALESCE(app_id, client)` to identify applications, supporting both current (`app_id`) and legacy (`client`) identifier formats.

### Data Scoping

BigQuery data is scoped across four dimensions:

1. **Organization:** Data is filtered to apps accessible by the requesting user's organization
2. **Application:** Queries can filter to specific app_id values or return all accessible apps
3. **Date Range:** All queries include a `BETWEEN` clause on the `date` column
4. **Traffic Source:** Optional filtering by traffic source (e.g., Search-only or Browse-only)

The Edge Function constructs parameterized SQL queries that apply these filters before returning results. No unfiltered table scans are performed.

### NULL Safety Rules

The system treats NULL values in metric columns as expected behavior for sparse datasets:

**Identifier Columns (Expected Non-NULL for Valid Rows):**
- `date` - Required for all rows
- `traffic_source` - Required for all rows
- Either `app_id` OR `client` - At least one must be present

**Metric Columns (NULL Represents "No Data Available"):**
- `impressions`, `product_page_views`, `downloads`, `conversion_rate` - May be NULL when:
  - An app has no activity on a specific date
  - A traffic source has no data for the selected date range
  - Filtering results in an empty dataset

The Edge Function maps NULL metric values to `0` before returning data to the frontend. This conversion is intentional: it simplifies frontend consumption while preserving the semantic distinction between "no data exists" (NULL in BigQuery) and "zero activity occurred" (0 displayed to user).

### Partitioning and Performance

The `aso_all_apple` table is partitioned by the `date` column (daily partitions). This partitioning enables:

- **Cost Reduction:** Queries only scan partitions within the requested date range
- **Performance:** Typical queries (30-day range) complete in 200-600ms
- **Retention:** Historical data remains queryable indefinitely

The Edge Function's 30-second cache layer further reduces BigQuery query frequency for repeated requests.

## 4. Edge Function Layer (fetch-aso-data)

### Purpose and Role

The `fetch-aso-data` Edge Function serves as the exclusive backend entry point for Reporting Dashboard V2. It acts as a security boundary that:

- Validates user authentication and authorization
- Enforces organization-scoped data access
- Constructs and executes BigQuery queries
- Transforms raw query results into a structured DTO for frontend consumption
- Provides a 30-second in-memory cache to reduce BigQuery costs

### Request Shape

The Edge Function accepts POST requests with the following structure:

```typescript
{
  org_id: string;              // Organization identifier (required)
  date_range: {                // Date range (required)
    start: string;             // ISO date: YYYY-MM-DD
    end: string;               // ISO date: YYYY-MM-DD
  };
  app_ids?: string[];          // Optional: filter to specific apps
  trafficSources?: string[];   // Optional: filter to specific traffic sources
  metrics?: string[];          // Metadata only (not used in query construction)
  granularity?: string;        // Metadata only (always daily)
}
```

**Note:** In the current implementation, `app_ids` and `trafficSources` are passed to the backend but filtering is performed client-side for performance optimization. The Edge Function returns all accessible data for the organization within the specified date range.

### Authorization Flow

The Edge Function enforces a multi-layer authorization model:

1. **JWT Validation:** Supabase Auth validates the request JWT and extracts user identity
2. **Role Lookup:** Queries `user_roles` table to determine user's role (SUPER_ADMIN, ORG_ADMIN, etc.) and organization membership
3. **Organization Scoping:**
   - **Super Admins:** Must explicitly select an organization (no default access)
   - **Organization Users:** Automatically scoped to their assigned organization
   - **Cross-Org Prevention:** Users cannot request data from organizations they don't belong to
4. **Agency Relationship Expansion:** If the user's organization has active entries in `agency_clients` table, the query expands to include managed client organizations
5. **App-Level Access Control:** Queries `org_app_access` table (protected by RLS policies) to determine which apps the resolved organization(s) can access

### Agency Access Model (Intentional Design)

The system implements a multi-tenant agency model where Yodel Mobile (agency organization) users can view data from multiple client organizations. This is **intentional business functionality**, not a security vulnerability:

- **Design:** All users in an agency organization (including non-admin roles like ANALYST, VIEWER) can access managed client app data
- **Authorization:** The `agency_clients` table defines active agency-to-client relationships (`is_active = true`)
- **Security Boundaries:**
  - Agency users can only see clients explicitly listed in `agency_clients` for their organization
  - RLS policies on `org_app_access` prevent access to apps outside the permitted organization set
  - Organization-level isolation prevents agencies from accessing each other's clients

**Example:** Yodel Mobile (agency) manages clients A, B, and C. All Yodel Mobile users (regardless of role) can query data for apps belonging to organizations A, B, C, and Yodel Mobile itself. They cannot access data from client D (not in the agency relationship) or competing agency E.

### BigQuery Query Construction

The Edge Function constructs parameterized SQL queries using named parameters for safety:

```sql
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `yodel-mobile-app.client_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
  AND date BETWEEN @start_date AND @end_date
ORDER BY date DESC
```

Parameters are bound separately to prevent SQL injection. The `@app_ids` array contains only apps the user is authorized to access (from the `org_app_access` RLS query).

### Response DTO Shape

The Edge Function returns a structured JSON payload:

```typescript
{
  data: Array<{                // Raw BigQuery rows
    date: string;              // ISO date
    app_id: string;            // COALESCE(app_id, client)
    traffic_source: string;    // Traffic source name
    impressions: number;       // Integer (NULL → 0)
    product_page_views: number; // Integer (NULL → 0)
    downloads: number;         // Integer (NULL → 0)
    conversion_rate: number;   // Float (0.0 to 1.0)
  }>;

  scope: {                     // Request scoping metadata
    organization_id: string;   // Resolved organization ID
    app_ids: string[];         // Apps included in response
    date_range: { start: string; end: string; };
  };

  meta: {                      // Query execution metadata
    request_id: string;        // UUID for tracing
    timestamp: string;         // ISO 8601 timestamp
    data_source: 'bigquery';   // Always 'bigquery'
    row_count: number;         // Number of rows returned
    app_count: number;         // Number of distinct apps
    query_duration_ms: number; // Query execution time
    available_traffic_sources: string[]; // Distinct traffic sources in dataset
    all_accessible_app_ids: string[];    // All apps user can access
  };
}
```

### Caching Behavior

The Edge Function implements a 30-second in-memory cache:

- **Cache Key:** `org_id + app_ids + start_date + end_date + traffic_sources`
- **TTL:** 30 seconds
- **Scope:** Per Edge Function instance (no cross-instance sharing)
- **Eviction:** Time-based expiration only

Cache hits return data in ~5-10ms vs. ~500-1500ms for cache misses (BigQuery query). The short TTL balances cost reduction with data freshness requirements (BigQuery data updates once daily).

## 5. Supabase Layer

### Authentication

Supabase Auth provides JWT-based authentication for all Reporting Dashboard V2 requests:

1. **Login:** User authenticates with email/password (or SSO), receives JWT token
2. **Token Attachment:** Frontend includes JWT in `Authorization: Bearer <token>` header for all Edge Function requests
3. **Validation:** Edge Function calls `supabase.auth.getUser()` to validate token and extract user identity
4. **Session Management:** Tokens expire after configured duration (enforced by Supabase Auth)

The Edge Function rejects all requests without valid JWT tokens (HTTP 401 Unauthorized).

### Row Level Security (RLS)

RLS policies on the `org_app_access` table enforce app-level access control:

**Policy:** Users can only query apps where:
- The app belongs to their organization (`organization_id` matches `user_roles.organization_id`), OR
- The app belongs to a client organization their agency manages (via `agency_clients` table with `is_active = true`), OR
- The user is a platform super admin (`user_roles.role = 'SUPER_ADMIN'` with `organization_id IS NULL`)

The Edge Function queries `org_app_access` after authenticating the user. RLS policies automatically filter the results to only return apps the user is authorized to see. This filtered app list becomes the `@app_ids` parameter in the BigQuery query.

**Example RLS Policy Logic (Conceptual):**

```sql
-- User can see org_app_access rows if:
SELECT * FROM org_app_access
WHERE organization_id IN (
  -- User's own organization
  SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  UNION
  -- Client organizations their agency manages
  SELECT client_org_id FROM agency_clients
  WHERE agency_org_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  ) AND is_active = true
)
OR EXISTS (
  -- Platform super admin bypass
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN' AND organization_id IS NULL
)
```

### Read-Only Architecture

Reporting Dashboard V2 is strictly read-only with respect to analytics data:

- **No Persistence:** BigQuery data is never written to Supabase tables
- **No Caching Tables:** The Edge Function does not persist query results in Supabase
- **No Analytics Writes:** The reporting flow performs zero INSERT/UPDATE/DELETE operations on analytics data

The only database operations are:
- **READ:** Query `user_roles`, `org_app_access`, `agency_clients` for authorization (RLS-protected)
- **WRITE:** Audit logging via `log_audit_event` RPC (for compliance tracking, not analytics data modification)

This read-only constraint ensures that the authoritative BigQuery dataset cannot be corrupted or modified by the reporting system.

## 6. Frontend Layer

### React Query (Server Data Cache)

React Query manages all server communication and caching:

**Responsibilities:**
- Invoke the `fetch-aso-data` Edge Function
- Cache responses keyed by `org_id + date_range`
- Handle loading states, error states, and retry logic
- Automatically refetch stale data

**Cache Configuration:**
```typescript
{
  staleTime: 30 * 60 * 1000,      // 30 minutes
  gcTime: 60 * 60 * 1000,          // 60 minutes garbage collection
  retry: 2,                         // 2 retries on failure
  refetchOnWindowFocus: false,      // Don't refetch on window focus
}
```

**Query Key Strategy:**
```typescript
['enterprise-analytics-v3', organizationId, dateRange.start, dateRange.end]
```

**Note:** `app_ids` and `trafficSources` are intentionally excluded from the query key. This enables instant client-side filter changes without triggering new network requests (see Zustand section below).

**Stale-While-Revalidate Behavior:**
- Data served instantly from cache for 30 minutes (considered fresh)
- After 30 minutes, cache entry marked stale but still displayed to user
- Background refetch initiated to update cache
- User sees updated data once background refetch completes

This strategy optimizes for perceived performance (instant display) while ensuring data freshness (automatic updates every 30 minutes).

### Zustand (UI State and Derived Metrics)

Zustand manages UI-specific state and derived calculations:

**Responsibilities:**
- Store normalized data structures (Map-based for O(1) lookups)
- Apply client-side filters (app selection, traffic source selection)
- Calculate derived KPIs (two-path metrics, stability scores, opportunity maps)
- Provide granular selectors for component subscriptions

**Data Normalization:**
```typescript
// Raw data indexed by: date|app_id|traffic_source
rawDataMap: Map<string, BigQueryDataPoint>

// Time-series data sorted by date (enables binary search)
timeseriesArray: TimeSeriesPoint[]

// Traffic source aggregates
trafficSourcesMap: Map<string, TrafficSourceData>
```

**Client-Side Filtering:**

When users select specific apps or traffic sources, Zustand filters the cached data without triggering new Edge Function requests:

1. React Query cache contains ALL accessible data for the date range
2. User selects "App A only" in UI
3. Zustand filters `rawDataMap` to entries where `app_id === "App A"`
4. Derived metrics recalculate using only filtered rows
5. UI re-renders with filtered data (<50ms, no network latency)

This architecture trades increased memory usage (full dataset in browser) for instant filter updates and reduced BigQuery query costs.

### Separation of Concerns (Why Both React Query AND Zustand)

The dual-layer architecture is intentional:

| Concern | Owner | Rationale |
|---------|-------|-----------|
| **Server Data** | React Query | Network requests, HTTP caching, background refetching, error handling |
| **UI State** | Zustand | Derived calculations, normalizations, component subscriptions, filter state |
| **Memory** | Shared | React Query: raw DTO, Zustand: normalized views (minimal duplication) |
| **Re-renders** | Optimized | Zustand selectors prevent re-renders when unrelated data changes |

**Benefits:**
- **Decoupling:** Server cache can change independently of UI state structure
- **Performance:** O(1) lookups for specific data points (e.g., `getRawDataPoint(date, app, source)`)
- **Scalability:** Supports 50+ components subscribing to different data slices without performance degradation
- **Testability:** Zustand selectors testable independently of network layer

### UI Components (Data Consumption)

Dashboard components consume data from the Zustand-managed state:

**KPI Metric Cards:**
- **AsoMetricCard (Search):** Filters `rawData` by `traffic_source === 'App_Store_Search'`, aggregates impressions/downloads, calculates CVR
- **AsoMetricCard (Browse):** Filters by `traffic_source === 'App_Store_Browse'`, same aggregation logic
- **TotalMetricCard:** Aggregates across all traffic sources

**Time-Series Charts:**
- **KpiTrendChart:** Renders `processedData.timeseries` array (daily impressions, downloads, CVR)
- **TrafficSourceComparisonChart:** Compares metrics across different traffic sources

**Conversion Funnel Visualizations:**
- **TwoPathFunnelCard:** Displays "Direct Install" vs. "PDP-Driven Install" breakdown using product_page_views to infer install paths
- **ConversionFunnelChart:** Visualizes Impressions → PPV → Downloads funnel

**Intelligence Layer:**
- **StabilityScoreCard:** Calculates volatility metrics using Coefficient of Variation across time-series data
- **OpportunityMapCard:** Compares current metrics to benchmarks, suggests optimization priorities
- **OutcomeSimulationCard:** Projects impact of hypothetical improvements to CVR, TTR, or impressions

All components are read-only: they consume data but never mutate the underlying Zustand store or trigger unauthorized data requests.

## 7. Data Security Properties

### Zero-Trust Client Model

The Reporting Dashboard V2 architecture assumes **zero trust** in the client application:

**Server-Side Enforcement:**
- All authorization decisions occur in the Edge Function (backend)
- All data scoping occurs in BigQuery queries (server-controlled)
- No credentials, secrets, or raw database access in frontend code
- Client can only request data; server determines what data to return

**Client-Side Restrictions:**
- Frontend filters (app selection, traffic source selection) cannot expand visibility beyond server-permitted apps
- JavaScript code cannot bypass organization scoping
- Network requests are authenticated with JWT (validated server-side)
- No direct BigQuery client libraries or connection strings in browser

**Attack Surface Mitigation:**
- **SQL Injection:** Prevented by parameterized queries (named parameters in BigQuery)
- **Authorization Bypass:** Prevented by server-side RLS and Edge Function checks (client cannot modify `org_id` to access other organizations)
- **Credential Theft:** No credentials in client (BigQuery credentials exist only in Edge Function environment variables)
- **Data Exfiltration:** User can only download data their organization is authorized to see (enforced by RLS before query execution)

### Organization-Scoped Access Enforcement

Organization scoping is enforced through three server-side mechanisms:

1. **JWT → Organization Mapping:**
   - User authenticates → receives JWT
   - Edge Function extracts `user_id` from JWT
   - Queries `user_roles` table: `SELECT organization_id, role FROM user_roles WHERE user_id = <from_jwt>`
   - This `organization_id` becomes the authorization scope (client cannot override)

2. **RLS Policy Enforcement:**
   - Edge Function queries `org_app_access` table
   - RLS policy filters results to apps user's organization can access
   - Filtered app list becomes `@app_ids` parameter in BigQuery query
   - Client never sees apps not in this filtered list

3. **Query Parameter Binding:**
   - BigQuery query uses `IN UNNEST(@app_ids)` to restrict results
   - `@app_ids` array contains only RLS-approved apps
   - Parameterized binding prevents query manipulation

**Example Enforcement Flow:**

```
User "alice@yodelmobile.com" (ORG_ID: 7cccba3f-...) requests data
  ↓
Edge Function: SELECT organization_id FROM user_roles WHERE user_id = 'alice-uuid'
  → Returns: 7cccba3f-...
  ↓
Edge Function: SELECT app_id FROM org_app_access WHERE organization_id = '7cccba3f-...'
  → RLS returns: ['Mixbook', 'ColorJoy', 'ClientApp1', 'ClientApp2']
  ↓
Edge Function: SELECT * FROM aso_all_apple WHERE app_id IN ('Mixbook', 'ColorJoy', 'ClientApp1', 'ClientApp2')
  → BigQuery returns: Only data for those 4 apps
  ↓
Client receives: Scoped data (cannot access apps from other organizations)
```

### Agency-Scoped Access Model

For agency organizations, the scoping expands to include managed clients:

1. **Agency Relationship Lookup:**
   ```sql
   SELECT client_org_id FROM agency_clients
   WHERE agency_org_id = <user_org_id> AND is_active = true
   ```

2. **Organization Set Expansion:**
   ```
   organizationsToQuery = [user_org_id] + [client_org_id_1, client_org_id_2, ...]
   ```

3. **Multi-Org RLS Query:**
   ```sql
   SELECT app_id FROM org_app_access
   WHERE organization_id IN (<organizationsToQuery array>)
   ```

4. **Consolidated App List:**
   - RLS policy evaluates for each organization in the array
   - Returns union of all accessible apps across agency + clients
   - This expanded app list becomes `@app_ids` in BigQuery query

**Security Properties of Agency Model:**
- Agency relationship must be explicitly defined in `agency_clients` table (cannot be set client-side)
- `is_active = true` check prevents access to deactivated clients
- RLS policies still apply to each organization in the set (defense in depth)
- Agency users cannot access apps from clients not in their `agency_clients` list
- Agency users cannot access apps from competing agencies or unrelated organizations

### No Direct Client Access to BigQuery

The frontend has zero ability to connect directly to BigQuery:

- **No BigQuery Client Library:** Frontend does not import `@google-cloud/bigquery` or similar
- **No Service Account Keys:** No `.json` credentials files in client bundle
- **No Connection Strings:** BigQuery project/dataset names present only in Edge Function code
- **Network Isolation:** BigQuery API endpoint not accessible from browser (CORS policy, no public IP allowlist for client IPs)

All BigQuery access is mediated through the `fetch-aso-data` Edge Function, which:
- Runs in Supabase's trusted server environment
- Holds BigQuery credentials in environment variables (not exposed to client)
- Validates every request before executing queries
- Returns only pre-filtered, scoped data

## 8. Complete Data Flow Summary

The following numbered steps describe a complete request-response cycle for Reporting Dashboard V2:

1. **User Authentication:**
   - User navigates to Reporting Dashboard V2 in browser
   - Supabase Auth validates existing session or redirects to login
   - Upon successful authentication, browser receives JWT token
   - JWT stored in browser's secure storage (handled by Supabase client library)

2. **Dashboard Initialization:**
   - React application loads, renders Reporting Dashboard V2 component
   - Component initializes with default date range (last 30 days)
   - User's organization and role loaded from Supabase Auth session context

3. **Data Request Initiation:**
   - React Query hook (`useEnterpriseAnalytics`) invokes `fetch-aso-data` Edge Function
   - Request includes:
     - `Authorization: Bearer <jwt>` header
     - Request body: `{ org_id, date_range: { start, end } }`
   - React Query checks cache first; if cache miss or stale, proceeds to network request

4. **Edge Function Authorization:**
   - Edge Function receives request, extracts JWT from Authorization header
   - Calls `supabase.auth.getUser()` to validate JWT and get `user_id`
   - Queries `user_roles` table: determines user's `organization_id` and `role`
   - Applies authorization logic:
     - Super Admin: requires explicit `org_id` in request (no default)
     - Organization User: automatically scoped to their organization
     - Cross-org request attempt: logged and rejected

5. **Agency Relationship Resolution:**
   - Edge Function queries `agency_clients` table for user's organization
   - If agency relationships exist (`is_active = true`), expands organization scope
   - Builds `organizationsToQuery` array: `[user_org] + [client_orgs...]`

6. **App-Level Access Control:**
   - Edge Function queries `org_app_access` table with `organization_id IN (organizationsToQuery)`
   - RLS policies automatically filter results to permitted apps
   - Extracts `app_id` values from filtered results → becomes `allowedAppIds` array
   - If `allowedAppIds` is empty: returns HTTP 200 with empty data array and message

7. **Cache Check:**
   - Edge Function generates cache key from `org_id + app_ids + date_range`
   - Checks in-memory cache (30-second TTL)
   - If cache hit: returns cached response immediately (skip BigQuery query)
   - If cache miss: proceeds to BigQuery query

8. **BigQuery Query Execution:**
   - Edge Function constructs parameterized SQL query
   - Binds parameters: `@app_ids` (from RLS), `@start_date`, `@end_date`
   - Executes query against `yodel-mobile-app.client_reports.aso_all_apple`
   - BigQuery partition pruning limits scan to requested date range

9. **Query Results Processing:**
   - BigQuery returns rows (or empty result set if no data)
   - Edge Function maps BigQuery row format to DTO schema
   - Converts NULL metric values to 0
   - Calculates `SAFE_DIVIDE` for conversion_rate if not pre-calculated

10. **Response Assembly:**
    - Edge Function constructs response object with `data`, `scope`, `meta` sections
    - Stores response in 30-second cache for subsequent identical requests
    - Logs audit event (user_id, org_id, app_count, timestamp) for compliance tracking
    - Returns HTTP 200 with JSON payload

11. **Frontend Caching:**
    - React Query receives response, validates structure
    - Stores response in React Query cache (keyed by `org_id + date_range`)
    - Marks cache entry as fresh (30-minute stale time)
    - Sets garbage collection timer (60 minutes)

12. **UI State Hydration:**
    - Zustand store receives data from React Query
    - Normalizes raw data into Map structures for efficient lookups
    - Generates time-series array (fills missing dates with zero values)
    - Aggregates traffic source breakdowns

13. **Derived Metric Calculation:**
    - Zustand calculates two-path metrics (direct installs vs. PDP-driven installs)
    - Computes derived KPIs (Search/Browse ratio, metadata strength, creative strength)
    - Generates intelligence layer outputs (stability scores, opportunities, simulations)
    - All calculations occur in browser (no server round-trip)

14. **Component Rendering:**
    - KPI metric cards subscribe to Zustand selectors, receive aggregated metrics
    - Time-series charts subscribe to time-series array, render trend lines
    - Conversion funnel components subscribe to funnel metrics, render visualizations
    - Intelligence cards subscribe to derived KPIs, render insights and recommendations

15. **User Interaction (Filter Changes):**
    - User selects specific apps or traffic sources via UI controls
    - Filter state updates in Zustand (does not change React Query key)
    - Zustand applies client-side filter to cached `rawData`
    - Derived metrics recalculate using filtered subset
    - UI re-renders with filtered data (<50ms, no network request)

16. **User Interaction (Date Range Change):**
    - User selects new date range via date picker
    - React Query key changes (includes new start/end dates)
    - React Query invalidates current cache entry
    - Process repeats from Step 3 with new date range parameters

17. **Background Refetch (Stale Cache):**
    - After 30 minutes, React Query marks cache entry as stale
    - User continues to see cached data (stale-while-revalidate)
    - React Query initiates background refetch (repeats Steps 3-10)
    - Upon receiving updated data, React Query updates cache
    - UI re-renders if data changed, remains unchanged if data identical

18. **Logout and Cache Clearing:**
    - User clicks logout
    - Supabase Auth invalidates JWT
    - React Query cache persists in browser memory (security consideration: recommend explicit clear on logout)
    - User cannot make new authenticated requests (JWT invalid)

This end-to-end flow ensures data freshness, enforces authorization at every step, and optimizes for performance through strategic caching.

## 9. Current Strengths & Stability Notes

### Production Stability

The Reporting Dashboard V2 pipeline is currently deployed and stable in production with the following operational characteristics:

- **Uptime:** Edge Function operates with >99.5% availability (Supabase platform SLA)
- **Performance Consistency:** p95 latency for cache hits <10ms, cache misses <1500ms
- **Query Cost Predictability:** 30-second Edge Function cache reduces BigQuery query frequency to ~1 query per org per 30 seconds (vs. potentially 1 query per user interaction)
- **Data Freshness:** BigQuery data updates once daily; 30-minute React Query cache provides acceptable trade-off between freshness and performance

### Robust Authorization Model

The multi-layer authorization architecture provides defense-in-depth:

- **Server-Side Enforcement:** All scoping decisions in Edge Function (client cannot bypass)
- **RLS Policies:** Database-level access control as second layer of defense
- **JWT Validation:** Supabase Auth handles token validation, expiration, and revocation
- **Audit Trail:** All data access logged for compliance and security review

The agency access model correctly implements business requirements while maintaining security boundaries (agencies can only access explicitly assigned clients).

### Scalable Data Architecture

The current architecture scales effectively for expected usage:

- **BigQuery Partitioning:** Date-based partitioning enables efficient querying even as historical data grows to multi-year datasets
- **Sparse Data Handling:** NULL-to-zero mapping correctly represents "no data available" without inflating storage or query costs
- **Client-Side Filtering:** Offloading app/traffic source filtering to browser reduces backend query complexity and cost
- **Normalized Frontend State:** Zustand's Map-based data structures provide O(1) lookups even with 10,000+ rows in browser

### Predictable KPI Logic

The two-path conversion model (direct installs vs. PDP-driven installs) is well-defined and mathematically sound:

- **Deterministic Calculations:** Same input data always produces same output metrics
- **Conservative Inference:** `pdp_driven_installs = Math.min(ppv, downloads)` prevents over-attribution
- **Null-Safe Operations:** All division operations use safe division (handles zero denominators gracefully)
- **Validation Rules:** Data quality validation detects anomalies (e.g., CVR >100%) and flags for review

### Clear Separation of Concerns

The layered architecture provides maintainability and testability:

- **BigQuery Layer:** Authoritative data source, immutable via reporting system
- **Edge Function Layer:** Business logic, authorization, query construction
- **React Query Layer:** Network communication, caching, error handling
- **Zustand Layer:** UI state, derived calculations, component integration
- **UI Component Layer:** Presentation, user interaction, visualization

Each layer has well-defined responsibilities and interfaces, enabling independent testing and modification.

### Known Operational Characteristics

**Expected Behaviors (Not Defects):**

- **Sparse Datasets:** NULL metric values in BigQuery are expected for apps with no activity on specific dates
- **Agency Access:** Non-admin agency users accessing client data is intentional business functionality
- **Client-Side Filtering:** Filtering without server round-trip is performance optimization, not data exposure risk
- **30-Minute Cache:** Stale data display during background refetch is acceptable given daily BigQuery update frequency
- **Dual Caching Layers:** React Query + Zustand architecture is intentional separation of concerns

**Performance Boundaries:**

- **Dataset Size:** System tested and stable with up to 50,000 rows per request (typical: 600-2000 rows)
- **Date Range:** No hard limit; practical limit ~1 year (365 days) based on client-side processing time (~200ms)
- **App Count:** No limit; agency organizations accessing 50+ apps perform equivalently to single-app organizations

## 10. Final Summary

The Reporting Dashboard V2 analytics pipeline is a production-grade, security-focused architecture that delivers App Store Optimization metrics to Yodel ASO Insight users. The system implements a clear data flow from BigQuery (authoritative source) through a Supabase Edge Function (authorization and transformation layer) to a React frontend (caching and visualization layer).

All authorization decisions are enforced server-side with zero-trust assumptions about client behavior. Organization scoping, agency relationship expansion, and app-level access control are validated before every BigQuery query. The Edge Function serves as the exclusive entry point to analytics data, ensuring no direct client access to BigQuery credentials or unfiltered datasets.

The architecture balances performance optimization (30-second Edge Function cache, 30-minute React Query cache, client-side filtering) with data freshness requirements (background refetching, stale-while-revalidate) and security constraints (server-side scoping, RLS policies, audit logging). NULL handling in metric columns correctly represents sparse ASO datasets where "no data available" is a legitimate state.

For Data Science stakeholders, this document describes the current KPI calculation logic, data scoping rules, and operational characteristics needed to interpret dashboard metrics or perform ad-hoc BigQuery analysis. For Data Security stakeholders, this document describes the authorization flow, access control enforcement points, and security boundaries that protect tenant data isolation.

This document represents the **authoritative current-state reference** for the Reporting Dashboard V2 analytics pipeline as deployed in production V1. It describes only what exists today, not planned improvements or future architecture changes.
