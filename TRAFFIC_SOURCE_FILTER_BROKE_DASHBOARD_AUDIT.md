# Traffic Source Filter Breaking Dashboard V2 - Root Cause Analysis

**Date:** November 8, 2025
**Status:** 🔴 **CRITICAL - DASHBOARD BROKEN**
**Severity:** HIGH - ASO metrics showing zero values

---

## 🚨 What Broke

### Symptoms:
1. **ASO Metric Cards showing ZEROS:**
   - Search card: 0 impressions, 0 downloads, 0% CVR
   - Browse card: 0 impressions, 0 downloads, 0% CVR
   - Total metrics: 0 impressions, 0 downloads

2. **Console Logs Show:**
   ```
   🎯 [ASO-METRICS] Calculating from raw data: 1148 rows
   🔍 [DEBUG] First row sample: {date: '2025-10-27', app_id: '102228831', traffic_source: null, ...}
   🔍 [DEBUG] Unique traffic_sources: [null]
   🔍 [DEBUG] Has traffic_source? false
   🎯 [ASO-METRICS] Search: { rows: 0, impressions: 0, downloads: 0, cvr: '0.00%' }
   🎯 [ASO-METRICS] Browse: { rows: 0, impressions: 0, downloads: 0, cvr: '0.00%' }
   ```

3. **Data is Present But Unusable:**
   - BigQuery returns 1148 rows of data
   - `traffic_source` field is `null` in ALL rows
   - Dashboard filters fail because they depend on `traffic_source`

---

## 🔍 Root Cause Analysis

### The Breaking Change

**File:** `supabase/functions/bigquery-aso-data/index.ts`

**What Changed:**
```typescript
// BEFORE (Working - used aso_all_apple table):
const query = `
  SELECT
    date,
    COALESCE(app_id, client) AS app_id,
    impressions,
    product_page_views,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_all_apple\`
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
  ORDER BY date DESC
`;

// AFTER (Broken - tries to use aso_apple_source_type table):
const query = `
  SELECT
    date,
    COALESCE(app_id, client) AS app_id,
    source_type as traffic_source,  // ← Added this column
    impressions,
    product_page_views,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_apple_source_type\`  // ← Changed table
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
  ORDER BY date DESC
`;
```

### The Core Problem

**TABLE MISMATCH:**
1. **`aso_all_apple`** (original table):
   - ✅ Has data for all apps (1148 rows returned)
   - ❌ Does NOT have `traffic_source` breakdown
   - ✅ Aggregated metrics (one row per app per date)

2. **`aso_apple_source_type`** (new table):
   - ❌ Either doesn't exist OR has different schema
   - ❌ Either empty OR missing the apps we're querying
   - ✅ Should have `source_type` column (traffic source breakdown)
   - ✅ Should have multiple rows per app per date (one per traffic source)

### Why Traffic Source is NULL

**There are 3 possible scenarios:**

#### Scenario 1: Table Doesn't Exist
```sql
-- Query runs against non-existent table
-- BigQuery doesn't error (because of graceful degradation?)
-- Returns empty/null results
```

#### Scenario 2: Table Has Different Schema
```sql
-- aso_apple_source_type exists but doesn't have source_type column
-- Column is named differently (e.g., traffic_source, traffic_type, source)
-- SELECT source_type returns NULL for all rows
```

#### Scenario 3: Table is Empty for These Apps
```sql
-- aso_apple_source_type exists with correct schema
-- But doesn't have data for apps: 102228831, 1603183848, etc.
-- Query returns 0 rows OR falls back somehow to aso_all_apple without source_type
```

### Row Mapping Mismatch

**File:** `supabase/functions/bigquery-aso-data/index.ts:100`

```typescript
// Row mapper EXPECTS 7 columns (with traffic_source):
const [date, appId, trafficSource, impressions, productPageViews, downloads, conversionRate] = row.f;

// But if BigQuery falls back to aso_all_apple (which has 6 columns):
// Actual columns: [date, appId, impressions, productPageViews, downloads, conversionRate]
//
// Mapping becomes:
// date = date ✅
// appId = appId ✅
// trafficSource = impressions ❌ (wrong column!)
// impressions = productPageViews ❌
// productPageViews = downloads ❌
// downloads = conversionRate ❌
// conversionRate = undefined ❌
```

**THIS IS THE SMOKING GUN!**

The column count mismatch causes:
- `traffic_source` to read the wrong column (impressions value)
- All numeric values to shift by one position
- Data to be completely corrupted

---

## 🎯 Evidence Supporting Column Mismatch Theory

### Evidence 1: Console Logs
```javascript
🔍 [DEBUG] First row sample: {
  date: '2025-10-27',
  app_id: '102228831',
  traffic_source: null,  // ← Should be a string like 'App_Store_Search'
  impressions: 0,        // ← Should be a number like 15234
  downloads: 0
}
```

**If traffic_source is null:**
- Either `aso_apple_source_type` doesn't have the data
- OR the query is falling back to `aso_all_apple` which doesn't have `source_type` column
- Row mapper is reading from wrong column positions

### Evidence 2: Row Count
```
📊 [TOTAL-METRICS] Calculated: { impressions: 0, downloads: 0, rows: 1148 }
```

**1148 rows returned** suggests:
- ✅ BigQuery query succeeded (didn't fail completely)
- ✅ Data exists (1148 rows is substantial)
- ❌ But data mapping is broken (all zeros)

This points to **column mismatch** rather than missing data.

### Evidence 3: Available Traffic Sources Query

The Edge Function also runs a separate dimensions query:
```typescript
const dimensionsQuery = `
  SELECT DISTINCT source_type as traffic_source
  FROM \`${projectId}.client_reports.aso_apple_source_type\`
  WHERE COALESCE(app_id, client) IN UNNEST(@all_app_ids)
    AND date BETWEEN @start_date AND @end_date
    AND source_type IS NOT NULL
`;
```

**If this query returns empty array:**
- Confirms `aso_apple_source_type` is either missing or has no data for these apps

**If this query returns values:**
- Suggests main query is using wrong table/column

---

## 🔧 What Was the Intent?

### Original Goal (from TRAFFIC_SOURCE_FILTER_FIX_COMPLETE.md):
1. Add `traffic_source` column to BigQuery response
2. Support traffic source filtering in the UI
3. Show accurate "Has data" indicators for each traffic source

### Implementation Approach Taken:
1. ✅ Switch from `aso_all_apple` → `aso_apple_source_type` table
2. ✅ Add `source_type as traffic_source` to SELECT
3. ✅ Update row mapper to expect 7 columns (added trafficSource)
4. ✅ Add separate dimensions query for available traffic sources
5. ❌ **MISSED: Verify aso_apple_source_type table exists and has data**
6. ❌ **MISSED: Add fallback logic if aso_apple_source_type is unavailable**
7. ❌ **MISSED: Test with real data before deployment**

---

## 🚨 Impact Assessment

### Data Integrity: ✅ SAFE
- No data corruption in BigQuery
- No writes to database
- Read-only query failure

### User Experience: 🔴 BROKEN
- Dashboard V2 completely unusable
- All ASO metrics show zeros
- Traffic source filter shows "No data"
- Charts show no data

### Affected Users:
- ✅ All Yodel Mobile users (cli@yodelmobile.com, igor@yodelmobile.com)
- ✅ Anyone accessing `/dashboard-v2` route
- ❌ Other dashboards/features not affected (use different data sources)

### Production Status: 🔴 DOWN
- Dashboard V2: **BROKEN**
- Reviews Page: **WORKING** (different data source)
- Legacy Dashboard: **Unknown** (if exists)

---

## 🔍 Diagnostic Steps Needed

### Step 1: Verify BigQuery Table Exists
```sql
-- Check if aso_apple_source_type table exists
SELECT table_name
FROM `vertere-yodel.client_reports.INFORMATION_SCHEMA.TABLES`
WHERE table_name = 'aso_apple_source_type';
```

### Step 2: Check Table Schema
```sql
-- If table exists, check its schema
SELECT column_name, data_type
FROM `vertere-yodel.client_reports.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'aso_apple_source_type';
```

### Step 3: Check Data Availability
```sql
-- Check if table has data for our apps
SELECT
  COALESCE(app_id, client) as app_id,
  source_type,
  COUNT(*) as row_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM `vertere-yodel.client_reports.aso_apple_source_type`
WHERE COALESCE(app_id, client) IN (
  '102228831',      -- Rego
  '1603183848',     -- Cashalo
  '1522127658',     -- Tala PH
  '1530449900',     -- Tala MX
  '1535381614',     -- Tala KE
  '1626966642',     -- Tala IN
  '6443488574',     -- Yodel
  '587617473'       -- Weee!
)
AND date >= '2024-10-01'
GROUP BY app_id, source_type
ORDER BY app_id, source_type;
```

### Step 4: Compare Table Structures
```sql
-- Compare aso_all_apple vs aso_apple_source_type
-- See what columns each has
SELECT 'aso_all_apple' as table_name, column_name, data_type
FROM `vertere-yodel.client_reports.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'aso_all_apple'

UNION ALL

SELECT 'aso_apple_source_type' as table_name, column_name, data_type
FROM `vertere-yodel.client_reports.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'aso_apple_source_type'
ORDER BY table_name, ordinal_position;
```

---

## 💡 Likely Solutions

### Solution 1: Revert to Original Table (Quick Fix)
**If `aso_apple_source_type` doesn't exist or has no data:**

1. Revert Edge Function to use `aso_all_apple` table
2. Remove `traffic_source` from SELECT
3. Update row mapper to expect 6 columns (remove trafficSource)
4. Remove dimensions query (not needed without traffic_source)
5. Remove traffic source filter from UI (feature unavailable)

**Impact:**
- ✅ Dashboard works again
- ❌ Lose traffic source filtering feature
- ✅ Same behavior as before the change

### Solution 2: Use Both Tables (Hybrid Approach)
**If `aso_apple_source_type` exists but has limited data:**

1. Try `aso_apple_source_type` first
2. If empty/fails, fall back to `aso_all_apple`
3. Dynamically adjust row mapper based on response
4. Only show traffic source filter if breakdown data available

**Implementation:**
```typescript
// Try aso_apple_source_type first
const hasSourceTypeData = await checkTableHasData('aso_apple_source_type', appIds);

const query = hasSourceTypeData
  ? buildQueryWithTrafficSource()  // 7 columns
  : buildQueryWithoutTrafficSource();  // 6 columns

const rows = mapRows(response, hasSourceTypeData);
```

### Solution 3: Aggregate from aso_apple_source_type
**If `aso_apple_source_type` exists and has data:**

1. Verify table has data for ALL 8 apps
2. Check `source_type` column exists
3. Fix any query/mapping bugs
4. Deploy with proper testing

---

## 📋 Recommended Action Plan

### Immediate (Stop the Bleeding):
1. ✅ **DO NOT make code changes** (per user request)
2. ✅ Run diagnostic queries to verify table existence
3. ✅ Document findings in this audit
4. ✅ Present options to user

### Short-term (Fix Dashboard):
1. Choose solution based on diagnostic results
2. Implement fix with proper testing
3. Deploy to production
4. Verify metrics show correct values

### Long-term (Prevent Recurrence):
1. Add BigQuery table validation before deployment
2. Add integration tests for Edge Function
3. Add data validation checks (detect all-zero metrics)
4. Document BigQuery table dependencies
5. Add monitoring/alerts for metric anomalies

---

## 🎯 Key Takeaways

### What Went Wrong:
1. ❌ Changed BigQuery table without verifying it exists
2. ❌ Changed row mapper without verifying column count
3. ❌ No fallback logic for missing table
4. ❌ No testing with real data before deployment
5. ❌ No validation to detect all-zero metrics

### What Should Have Happened:
1. ✅ Check if `aso_apple_source_type` table exists in BigQuery
2. ✅ Verify it has data for target apps and date range
3. ✅ Add conditional logic to use appropriate table
4. ✅ Test with real data in staging
5. ✅ Add metrics validation (alert on all-zeros)

### Why This Is Critical:
- Dashboard V2 is the main analytics interface
- ASO metrics are core business value
- All-zero metrics erode user trust
- Silent failures are worse than loud errors

---

## 🔍 Next Steps

### User to Decide:
1. Run diagnostic queries in BigQuery console
2. Share results with development team
3. Choose solution based on table availability
4. Approve fix implementation

### Development Team:
1. Wait for diagnostic results
2. Implement chosen solution
3. Add comprehensive testing
4. Deploy with monitoring

---

**Created:** November 8, 2025
**Status:** ⏸️ **AWAITING DIAGNOSTICS**
**Next:** Run BigQuery diagnostic queries to determine table status
