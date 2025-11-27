# BigQuery Pipeline - Complete Documentation

**Last Updated:** November 27, 2025
**Status:** Production
**Owner:** Yodel Mobile

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Critical Configuration](#critical-configuration)
4. [Data Flow](#data-flow)
5. [Edge Function Details](#edge-function-details)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Deployment Checklist](#deployment-checklist)
8. [Testing Procedures](#testing-procedures)
9. [Common Issues & Fixes](#common-issues--fixes)
10. [Emergency Recovery](#emergency-recovery)

---

## Overview

### What Is This Pipeline?

The BigQuery pipeline powers **Dashboard V2** by fetching ASO (App Store Optimization) data from Google BigQuery and displaying it in real-time dashboards.

### Key Components

```
Frontend (React)
    ↓
useEnterpriseAnalytics Hook
    ↓
Edge Function: bigquery-aso-data
    ↓
Google BigQuery API (EU Region)
    ↓
Dataset: client_reports
    ↓
Table: aso_all_apple
```

### What Data Does It Fetch?

- **Impressions:** How many times apps appeared in search/browse
- **Downloads:** Number of app installs
- **Product Page Views:** Users who viewed the app details
- **Conversion Rate:** Downloads ÷ Product Page Views
- **Traffic Sources:** App_Store_Search, App_Store_Browse, etc.

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
│                                                             │
│  Dashboard V2 Component (ReportingDashboardV2.tsx)         │
│         ↓                                                   │
│  useEnterpriseAnalytics Hook                               │
│         ↓                                                   │
│  Supabase Client (supabase.functions.invoke)              │
└─────────────────────────────────────────────────────────────┘
                         ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION LAYER                      │
│                                                             │
│  bigquery-aso-data (Deno Runtime)                          │
│    1. Authenticate User (JWT)                              │
│    2. Check Permissions (RLS)                              │
│    3. Get Organization Apps (agency support)               │
│    4. Build BigQuery SQL                                   │
│    5. Execute Query                                        │
│    6. Transform & Return Data                              │
└─────────────────────────────────────────────────────────────┘
                         ↓ OAuth 2.0
┌─────────────────────────────────────────────────────────────┐
│                    BIGQUERY LAYER (EU)                      │
│                                                             │
│  Project: aso-reporting-1                                  │
│  Dataset: client_reports (EU region)                       │
│  Tables:                                                    │
│    - aso_all_apple (main data)                            │
│    - aso_organic_apple (organic only)                     │
└─────────────────────────────────────────────────────────────┘
```

### Security Layers

1. **Frontend Auth:** User must be logged in
2. **Edge Function Auth:** JWT validation via Supabase
3. **RLS Policies:** Database-level access control
4. **BigQuery Service Account:** Google Cloud IAM
5. **Agency Permissions:** Multi-tenant isolation

---

## Critical Configuration

### ⚠️ IMPORTANT: These Must Be Correct

| Setting | Value | Location | Critical? |
|---------|-------|----------|-----------|
| **BigQuery Project ID** | `aso-reporting-1` | Edge Function Env | 🔴 YES |
| **BigQuery Dataset** | `client_reports` | Edge Function Code (Line 591, 679) | 🔴 YES |
| **BigQuery Region** | `EU` | Edge Function Code (Line 607, 690) | 🔴 YES |
| **BigQuery Table** | `aso_all_apple` | Edge Function Code | 🔴 YES |
| **Service Account** | See BIGQUERY_CREDENTIALS | Supabase Secret | 🔴 YES |

### Environment Variables / Secrets

#### Supabase Secrets (Production)

```bash
# View secrets
npx supabase secrets list

# Required secrets:
BIGQUERY_CREDENTIALS    # Service account JSON
BIGQUERY_PROJECT_ID     # aso-reporting-1
```

#### How to Update Secrets

```bash
# Update project ID
npx supabase secrets set BIGQUERY_PROJECT_ID="aso-reporting-1"

# Update credentials (from file)
npx supabase secrets set BIGQUERY_CREDENTIALS="$(cat path/to/credentials.json)"
```

### Code Constants (DO NOT CHANGE)

**File:** `supabase/functions/bigquery-aso-data/index.ts`

```typescript
// Line 591 - Main data query
FROM \`${projectId}.client_reports.aso_all_apple\`
//                   ^^^^^^^^^^^^^^ MUST BE client_reports

// Line 607 - Query request config
location: "EU", // Dataset is in EU region
//        ^^^^ MUST BE EU

// Line 679 - Traffic sources query
FROM \`${projectId}.client_reports.aso_all_apple\`
//                   ^^^^^^^^^^^^^^ MUST BE client_reports

// Line 690 - Dimensions query config
location: "EU", // Dataset is in EU region
//        ^^^^ MUST BE EU
```

---

## Data Flow

### Request Flow (Happy Path)

```
1. User opens Dashboard V2
   ↓
2. useEnterpriseAnalytics hook triggers
   Parameters: { organizationId, dateRange, appIds, trafficSources }
   ↓
3. Frontend calls edge function
   POST /functions/v1/bigquery-aso-data
   Headers: { Authorization: "Bearer <JWT>" }
   ↓
4. Edge function authenticates user
   - Extract JWT from Authorization header
   - Validate with Supabase Auth
   - Get user ID and email
   ↓
5. Check user permissions
   - Call is_super_admin() RPC
   - If not admin: get user's organization from user_roles
   - If admin: use organizationId from request
   ↓
6. Find accessible apps (with agency support)
   - Query agency_clients for managed client orgs
   - Query org_app_access for all org apps (agency + clients)
   - Build list of allowed app IDs
   ↓
7. Build BigQuery SQL
   - Filter by app IDs
   - Filter by date range
   - Select: date, app_id, traffic_source, impressions, downloads, etc.
   ↓
8. Execute BigQuery query
   - Get OAuth token from service account
   - POST to BigQuery API (EU region)
   - Wait for results
   ↓
9. Transform response
   - Map BigQuery rows to frontend format
   - Calculate aggregates
   - Extract available traffic sources
   ↓
10. Return to frontend
    Response: { success: true, data: [...], meta: {...}, scope: {...} }
   ↓
11. Frontend renders data
    - KPI cards update
    - Charts render
    - Filters populate
```

### Cache Layer (30-second TTL)

```typescript
// In-memory hot cache (edge function)
const HOT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// Cache key format:
"orgId:appIds:startDate:endDate:trafficSources"

// Example:
"7cccba3f...:1000928831,1011928031:2024-11-01:2024-11-30:all"
```

**Cache invalidation:** Automatic after 30 seconds

---

## Edge Function Details

### File Location

```
supabase/functions/bigquery-aso-data/index.ts
```

### Key Functions

#### 1. Authentication (Lines 213-224)

```typescript
const {
  data: { user },
  error: userError,
} = await supabaseClient.auth.getUser();

if (userError || !user) {
  return new Response(
    JSON.stringify({ success: false, error: "Authentication required" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
```

**What it does:** Validates JWT and gets user info
**Fails if:** No Authorization header, expired token, invalid user

#### 2. Super Admin Check (Lines 227-235)

```typescript
const { data: isSuperAdmin, error: superAdminError } = await supabaseClient
  .rpc('is_super_admin');
```

**What it does:** Checks if user has SUPER_ADMIN role
**Uses:** `is_super_admin()` RPC function (SECURITY DEFINER)
**Important:** Function must use SECURITY DEFINER to avoid circular RLS

#### 3. Agency Support (Lines 344-426)

```typescript
const { data: managedClients, error: agencyError } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)
  .eq("is_active", true);
```

**What it does:** Finds client orgs managed by this agency
**Expands access:** Query apps from multiple orgs (agency + clients)
**Example:** Yodel Mobile (agency) can access its own apps + client apps

#### 4. App Access (Lines 429-443)

```typescript
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)
  .is("detached_at", null);
```

**What it does:** Gets all active app IDs for organization(s)
**RLS protection:** Only returns apps user has access to
**Filters:** Only apps where `detached_at IS NULL`

#### 5. BigQuery Query Execution (Lines 626-643)

```typescript
const bqResponse = await fetch(
  `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(queryRequest),
  }
);
```

**What it does:** Executes SQL query on BigQuery
**Auth:** OAuth 2.0 token from service account
**Region:** Must specify `location: "EU"` in queryRequest

### SQL Query Structure

```sql
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
  AND date BETWEEN @start_date AND @end_date
ORDER BY date DESC
```

**Key points:**
- `COALESCE(app_id, client)`: Handles both column names
- `UNNEST(@app_ids)`: Array parameter for app IDs
- `SAFE_DIVIDE`: Prevents division by zero
- `ORDER BY date DESC`: Most recent data first

---

## Troubleshooting Guide

### Issue: "Dataset not found"

**Error Message:**
```
Not found: Dataset aso-reporting-1:aso_reports was not found in location US
```

**Root Cause:**
- Wrong dataset name in code
- Wrong region specified
- Dataset moved or deleted

**Fix:**
1. Verify dataset exists in BigQuery console
2. Check dataset name in code (Lines 591, 679)
3. Verify region is "EU" (Lines 607, 690)
4. Redeploy edge function

**Prevention:**
- Never hardcode dataset name
- Use environment variable for dataset name (future improvement)

---

### Issue: "Authentication failed"

**Error Message:**
```
[bigquery-aso-data][xxx] Authentication failed
```

**Root Cause:**
- Missing Authorization header
- Expired JWT token
- User deleted or suspended

**Fix:**
1. Check user is logged in
2. Check browser localStorage for token
3. Try logging out and back in
4. Verify user exists in database

**Debug:**
```sql
-- Check user in database
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Check user role
SELECT * FROM user_roles WHERE user_id = 'xxx';
```

---

### Issue: "Permission denied" (RLS)

**Error Message:**
```
permission denied for table agency_clients
```

**Root Cause:**
- RLS policies blocking query
- User not in organization
- is_super_admin() function broken

**Fix:**
1. Check user has role in user_roles table
2. Verify RLS policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'agency_clients';
   ```
3. Check is_super_admin() uses SECURITY DEFINER:
   ```sql
   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_super_admin';
   ```

**Quick Test:**
```sql
-- Test RLS as user
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid';
SELECT * FROM agency_clients;
```

---

### Issue: Empty data returned

**Symptoms:**
- Edge function succeeds
- Returns `{ success: true, data: [] }`
- No errors in logs

**Root Cause:**
- App IDs in database don't match BigQuery
- Date range has no data
- Wrong table name

**Fix:**
1. Check app IDs in database:
   ```sql
   SELECT app_id FROM org_app_access
   WHERE organization_id = 'xxx' AND detached_at IS NULL;
   ```

2. Check app IDs in BigQuery:
   ```sql
   SELECT DISTINCT COALESCE(app_id, client) as app_id
   FROM `aso-reporting-1.client_reports.aso_all_apple`
   WHERE date >= '2024-11-01'
   LIMIT 10;
   ```

3. Compare and update if needed

---

### Issue: Slow response times

**Symptoms:**
- Edge function takes >10 seconds
- Browser shows loading spinner
- No errors, just slow

**Root Cause:**
- BigQuery query scanning too much data
- No query optimization
- Network latency (EU region)

**Fix:**
1. Check query execution time in logs:
   ```
   [BIGQUERY] Query completed { query_duration_ms: 8500 }
   ```

2. Optimize date range (smaller = faster)
3. Add partitioning to BigQuery table (by date)
4. Increase cache TTL for less frequent queries

**Performance Targets:**
- < 2 seconds: Excellent
- 2-5 seconds: Good
- 5-10 seconds: Acceptable
- > 10 seconds: Needs optimization

---

## Deployment Checklist

### Pre-Deployment Checks

- [ ] Code changes tested locally
- [ ] Edge function tests pass
- [ ] No hardcoded credentials in code
- [ ] Dataset name is `client_reports`
- [ ] Region is `EU`
- [ ] Git commit created with clear message
- [ ] Reviewed changes with `git diff`

### Deployment Steps

```bash
# 1. Verify current state
npx supabase functions list | grep bigquery-aso-data

# 2. Deploy edge function
npx supabase functions deploy bigquery-aso-data

# 3. Verify deployment
npx supabase functions list | grep bigquery-aso-data
# Should show new version number

# 4. Test immediately
# Open Dashboard V2 in browser
# Check for errors in console
```

### Post-Deployment Verification

- [ ] Dashboard V2 loads without errors
- [ ] Data displays correctly
- [ ] No errors in browser console
- [ ] Edge function logs show success
- [ ] Response time < 5 seconds
- [ ] Agency relationships working
- [ ] All traffic sources available

### Rollback Procedure

If deployment breaks production:

```bash
# 1. Find previous working version
npx supabase functions list | grep bigquery-aso-data

# 2. Revert code changes
git revert HEAD

# 3. Redeploy
npx supabase functions deploy bigquery-aso-data

# 4. Verify rollback worked
# Test Dashboard V2
```

---

## Testing Procedures

### Manual Testing

#### Test 1: Dashboard V2 Loads
```
1. Open http://localhost:5173/dashboard-v2
2. Wait for data to load (< 5 seconds)
3. Verify:
   ✅ KPI cards show numbers
   ✅ Charts render
   ✅ No error messages
   ✅ App picker shows apps
   ✅ Traffic sources available
```

#### Test 2: Edge Function Direct
```bash
# Run test script
SUPABASE_SERVICE_ROLE_KEY="..." \
VITE_SUPABASE_ANON_KEY="..." \
node test-edge-service-role.mjs

# Expected output:
✅ SUCCESS!
📊 META: { app_count: 8, ... }
📈 DATA: { Total rows: 500+ }
```

#### Test 3: Browser Network Tab
```
1. Open DevTools → Network tab
2. Refresh Dashboard V2
3. Find "bigquery-aso-data" request
4. Verify:
   Status: 200 OK
   Response: { "success": true, "data": [...] }
   Time: < 5000ms
```

### Automated Testing

**Test Script:** `test-edge-service-role.mjs`

```bash
# Run full test suite
npm run test:bigquery

# Or manually:
node test-edge-service-role.mjs
```

**What it tests:**
- ✅ Edge function responds
- ✅ Authentication works
- ✅ BigQuery connection works
- ✅ Data structure is correct
- ✅ Agency relationships work

---

## Common Issues & Fixes

### Quick Reference Table

| Symptom | Root Cause | Fix | Time |
|---------|-----------|-----|------|
| "Dataset not found" | Wrong dataset name | Change to `client_reports` | 5 min |
| "Location US" error | Wrong region | Add `location: "EU"` | 5 min |
| "Authentication failed" | No user session | Check Authorization header | 2 min |
| "Permission denied" | RLS blocking | Check is_super_admin() | 10 min |
| Empty data `[]` | App IDs mismatch | Compare DB vs BigQuery | 15 min |
| Slow (>10s) | Query optimization | Reduce date range | 5 min |
| 401 Unauthorized | JWT expired | Refresh browser / re-login | 1 min |
| 500 Internal Error | Edge function crash | Check logs for stack trace | 10 min |

---

## Emergency Recovery

### If Dashboard V2 Is Completely Broken

#### Step 1: Check Edge Function Status
```bash
npx supabase functions list | grep bigquery-aso-data
```

If status is not "ACTIVE", redeploy:
```bash
npx supabase functions deploy bigquery-aso-data
```

#### Step 2: Check Edge Function Logs
https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions

Look for:
- Recent errors
- Stack traces
- Failed requests

#### Step 3: Verify Configuration

```bash
# Check secrets exist
npx supabase secrets list

# Should show:
# BIGQUERY_CREDENTIALS
# BIGQUERY_PROJECT_ID
```

#### Step 4: Test BigQuery Access Manually

Use BigQuery console:
https://console.cloud.google.com/bigquery

Run test query:
```sql
SELECT COUNT(*) as row_count
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE date >= CURRENT_DATE() - 7
```

Expected: Should return a number (not error)

#### Step 5: Restore from Working Version

```bash
# Find last working commit
git log --oneline | head -20

# Restore edge function from that commit
git checkout <commit-hash> -- supabase/functions/bigquery-aso-data/index.ts

# Redeploy
npx supabase functions deploy bigquery-aso-data
```

---

## Contact & Support

**Pipeline Owner:** Yodel Mobile Development Team

**Critical Issues:**
1. Check this documentation first
2. Check edge function logs
3. Run diagnostic scripts
4. Contact team if unresolved

**Documentation Location:**
- Main docs: `docs/BIGQUERY_PIPELINE.md` (this file)
- Fix summary: `BIGQUERY_FIX_SUMMARY.md`
- Audit report: `AUDIT_FINDINGS.md`

---

## Appendix

### A. BigQuery Schema

**Table:** `aso-reporting-1.client_reports.aso_all_apple`

| Column | Type | Description |
|--------|------|-------------|
| date | DATE | Data date |
| app_id | STRING | App Store app ID |
| client | STRING | Alternative app ID field |
| traffic_source | STRING | Source (App_Store_Search, App_Store_Browse, etc.) |
| impressions | INTEGER | Number of impressions |
| downloads | INTEGER | Number of downloads |
| product_page_views | INTEGER | Number of product page views |

**Partitioning:** By date (recommended for performance)
**Location:** EU (multi-region)
**Size:** ~10GB (as of Nov 2025)

### B. Service Account Permissions

**Service Account:** `bigquery-reader@aso-reporting-1.iam.gserviceaccount.com`

**Required Roles:**
- `roles/bigquery.dataViewer` - Read data from tables
- `roles/bigquery.jobUser` - Execute queries

**Grant Permissions:**
```bash
gcloud projects add-iam-policy-binding aso-reporting-1 \
  --member="serviceAccount:bigquery-reader@aso-reporting-1.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding aso-reporting-1 \
  --member="serviceAccount:bigquery-reader@aso-reporting-1.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

### C. Performance Optimization Tips

1. **Use smaller date ranges** - Query only what you need
2. **Cache aggressively** - Increase TTL for stable data
3. **Partition BigQuery tables** - By date for faster queries
4. **Index frequently queried columns** - app_id, traffic_source
5. **Use clustering** - On app_id for better query performance
6. **Monitor costs** - BigQuery charges by data scanned

### D. Monitoring & Alerts

**Key Metrics to Monitor:**
- Edge function error rate (< 1%)
- Average response time (< 5s)
- BigQuery query cost (< $10/day)
- Cache hit rate (> 50%)

**Set up alerts for:**
- 5xx errors from edge function
- Response time > 10s
- BigQuery API errors
- Sudden cost increases

---

**End of Documentation**

Last updated: November 27, 2025
Version: 1.0
