# ASO Organic Visibility Cards Showing 0 - Debug Analysis

**Date:** November 8, 2025
**Status:** 🔍 **ANALYZING ROOT CAUSE**

---

## 🐛 Issue Description

**User Report:**
> ASO Organic Visibility cards always show 0:
> - App Store Search: Impressions 0, Downloads 0, CVR 0.00%
> - App Store Browse: Impressions 0, Downloads 0, CVR 0.00%

**Location:** Dashboard V2 top section (lines 390-410 in ReportingDashboardV2.tsx)

---

## 🔍 Code Analysis

### ASO Metrics Calculation (Lines 141-199)

```typescript
const asoMetrics = useMemo(() => {
  if (!data?.rawData) {
    return {
      search: { impressions: 0, downloads: 0, cvr: 0 },
      browse: { impressions: 0, downloads: 0, cvr: 0 }
    };
  }

  console.log('🎯 [ASO-METRICS] Calculating from raw data:', data.rawData.length, 'rows');

  // Filter for Search traffic
  const searchData = data.rawData.filter((row: any) =>
    row.traffic_source === 'App_Store_Search'  // ← Looking for exact match
  );

  // Filter for Browse traffic
  const browseData = data.rawData.filter((row: any) =>
    row.traffic_source === 'App_Store_Browse'  // ← Looking for exact match
  );

  const calculateMetrics = (rows: any[]) => {
    const totals = rows.reduce((acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      downloads: acc.downloads + (row.downloads || 0)
    }), { impressions: 0, downloads: 0 });

    const cvr = totals.impressions > 0
      ? (totals.downloads / totals.impressions) * 100
      : 0;

    return {
      impressions: totals.impressions,
      downloads: totals.downloads,
      cvr
    };
  };

  const searchMetrics = calculateMetrics(searchData);
  const browseMetrics = calculateMetrics(browseData);

  console.log('🎯 [ASO-METRICS] Search:', {
    rows: searchData.length,
    impressions: searchMetrics.impressions,
    downloads: searchMetrics.downloads,
    cvr: searchMetrics.cvr.toFixed(2) + '%'
  });

  console.log('🎯 [ASO-METRICS] Browse:', {
    rows: browseData.length,
    impressions: browseMetrics.impressions,
    downloads: browseMetrics.downloads,
    cvr: browseMetrics.cvr.toFixed(2) + '%'
  });

  return {
    search: searchMetrics,
    browse: browseMetrics
  };
}, [data?.rawData]);
```

---

## 🎯 Root Cause Hypothesis

### Possible Cause 1: traffic_source is NULL

**Scenario:**
```typescript
// Edge Function returns data but traffic_source is NULL for all rows
rawData = [
  { date: '2025-10-08', app_id: '102228831', traffic_source: null, impressions: 1000, ... },
  { date: '2025-10-08', app_id: '102228831', traffic_source: null, impressions: 500, ... }
]

// Filter results in empty arrays
searchData = []  // ← No rows match 'App_Store_Search'
browseData = []  // ← No rows match 'App_Store_Browse'

// Metrics calculate to 0
searchMetrics = { impressions: 0, downloads: 0, cvr: 0 }
browseMetrics = { impressions: 0, downloads: 0, cvr: 0 }
```

**Why this might be happening:**
- BigQuery table `aso_all_apple` might not have `traffic_source` column
- We added it to SELECT but column doesn't exist in table schema
- BigQuery returns NULL for non-existent columns

### Possible Cause 2: traffic_source has different values

**Scenario:**
```typescript
// BigQuery returns different traffic_source values
rawData = [
  { date: '2025-10-08', app_id: '102228831', traffic_source: 'search', ... },
  { date: '2025-10-08', app_id: '102228831', traffic_source: 'browse', ... }
]

// Filters expect exact case-sensitive match
searchData = []  // ← 'search' !== 'App_Store_Search'
browseData = []  // ← 'browse' !== 'App_Store_Browse'
```

### Possible Cause 3: BigQuery Query Failed

**Scenario:**
- Edge Function SELECT statement includes `traffic_source`
- Column doesn't exist in BigQuery table
- Query fails or returns no rows
- Frontend receives empty rawData

---

## 🔍 Diagnostic Steps

### Step 1: Check Console Logs

**Look for these logs in browser console:**
```javascript
✅ Expected (working):
🎯 [ASO-METRICS] Calculating from raw data: 11 rows
🎯 [ASO-METRICS] Search: { rows: 5, impressions: 5000, downloads: 50, cvr: '1.00%' }
🎯 [ASO-METRICS] Browse: { rows: 6, impressions: 3000, downloads: 30, cvr: '1.00%' }

❌ Broken (current):
🎯 [ASO-METRICS] Calculating from raw data: 11 rows
🎯 [ASO-METRICS] Search: { rows: 0, impressions: 0, downloads: 0, cvr: '0.00%' }
🎯 [ASO-METRICS] Browse: { rows: 0, impressions: 0, downloads: 0, cvr: '0.00%' }

Or worse:
🎯 [ASO-METRICS] Calculating from raw data: 0 rows
```

### Step 2: Check rawData Structure

**Add debug log to see actual traffic_source values:**
```typescript
console.log('🔍 [DEBUG] First 3 rows:', data.rawData.slice(0, 3));
console.log('🔍 [DEBUG] Unique traffic_sources:',
  Array.from(new Set(data.rawData.map(r => r.traffic_source)))
);
```

### Step 3: Check Edge Function Response

**Look for Edge Function logs:**
```
[BIGQUERY] Query completed
  rowCount: 11
  firstRow: { date: '2025-10-08', app_id: '102228831', traffic_source: ?, ... }
```

**Check if `traffic_source` is present and what its value is.**

### Step 4: Verify BigQuery Table Schema

**Query BigQuery directly to check if column exists:**
```sql
SELECT column_name, data_type
FROM `project.client_reports.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'aso_all_apple'
ORDER BY ordinal_position;
```

**Expected columns:**
- date
- app_id (or client)
- traffic_source ← Need to verify this exists
- impressions
- product_page_views
- downloads

---

## 💡 Likely Root Cause

Based on the timing (broke after traffic source fix), the most likely cause is:

**The BigQuery table `aso_all_apple` does NOT have a `traffic_source` column.**

**Evidence:**
1. We added `traffic_source` to SELECT statement
2. BigQuery doesn't fail when selecting non-existent columns (returns NULL)
3. All rows have `traffic_source: null`
4. Filter finds 0 rows matching 'App_Store_Search' or 'App_Store_Browse'
5. ASO cards show 0

**Why traffic source filter still works:**
- The dimensions query also returns empty array: `availableTrafficSources = []`
- Or returns NULL values which are filtered out by `.filter(Boolean)`
- Filter shows "No data" for all sources (which user might not have noticed initially)

---

## 🔧 Solution Options

### Option 1: Use Correct BigQuery Table (Recommended)

**Issue:** We might be querying the wrong table.

**Action:**
1. Check if there's a different BigQuery table with traffic_source data
2. Common table names:
   - `aso_all_apple_detailed` (with traffic_source)
   - `aso_apple_source_breakdown`
   - `app_analytics_by_source`

**Implementation:**
```typescript
// Use correct table in Edge Function
const query = `
  SELECT
    date,
    app_id,
    traffic_source,  -- Column exists in this table
    impressions,
    product_page_views,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_all_apple_detailed\`  -- ← Different table
  WHERE app_id IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
  ORDER BY date DESC
`;
```

### Option 2: Aggregate from Base Table

**Issue:** `aso_all_apple` doesn't have traffic_source breakdown.

**Action:** Aggregate total metrics without traffic_source filtering.

**Implementation:**
```typescript
// In Dashboard V2, calculate ASO metrics from totals
const asoMetrics = useMemo(() => {
  if (!data?.rawData) {
    return {
      search: { impressions: 0, downloads: 0, cvr: 0 },
      browse: { impressions: 0, downloads: 0, cvr: 0 }
    };
  }

  // If no traffic_source data, split totals evenly or show aggregated
  const hasTrafficSource = data.rawData.some(row => row.traffic_source);

  if (!hasTrafficSource) {
    // Fallback: Show total metrics (not split by source)
    const totals = data.rawData.reduce((acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      downloads: acc.downloads + (row.downloads || 0)
    }), { impressions: 0, downloads: 0 });

    const cvr = totals.impressions > 0
      ? (totals.downloads / totals.impressions) * 100
      : 0;

    return {
      search: { ...totals, cvr },  // Show totals in Search card
      browse: { impressions: 0, downloads: 0, cvr: 0 }  // Hide Browse or show 0
    };
  }

  // Normal filtering if traffic_source exists
  const searchData = data.rawData.filter(row =>
    row.traffic_source === 'App_Store_Search'
  );
  // ... rest of existing logic
}, [data?.rawData]);
```

### Option 3: Join with Source Breakdown Table

**Issue:** Need to enrich base table data with traffic_source.

**Action:** JOIN `aso_all_apple` with a traffic_source breakdown table.

**Implementation:**
```sql
SELECT
  a.date,
  a.app_id,
  ts.traffic_source,
  a.impressions * ts.source_percentage as impressions,
  a.product_page_views * ts.source_percentage as product_page_views,
  a.downloads * ts.source_percentage as downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM \`${projectId}.client_reports.aso_all_apple\` a
LEFT JOIN \`${projectId}.client_reports.traffic_source_breakdown\` ts
  ON a.app_id = ts.app_id AND a.date = ts.date
WHERE a.app_id IN UNNEST(@app_ids)
  AND a.date BETWEEN @start_date AND @end_date
```

### Option 4: Remove traffic_source from Query (Quick Rollback)

**Issue:** Table doesn't have column, causing NULL values.

**Action:** Remove `traffic_source` from SELECT, hide ASO cards.

**Implementation:**
```typescript
// Revert Edge Function to original query
const query = `
  SELECT
    date,
    COALESCE(app_id, client) AS app_id,
    -- traffic_source,  ← Remove this line
    impressions,
    product_page_views,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_all_apple\`
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
  ORDER BY date DESC
`;
```

---

## 🎯 Recommended Approach

**Step 1: Verify Table Schema**
- Check if `aso_all_apple` has `traffic_source` column
- If not, find which table has traffic_source data

**Step 2: Choose Solution Based on Finding:**

**If `aso_all_apple` HAS traffic_source:**
- Issue is data quality (all NULL values)
- Check BigQuery data directly
- Might need to fix data pipeline

**If `aso_all_apple` does NOT have traffic_source:**
- Find correct table with traffic_source data
- Update Edge Function to use correct table
- Or implement Option 2 (fallback to totals)

**If NO table has traffic_source:**
- Implement Option 2 (show aggregated totals)
- Hide Browse card or show "Coming soon"
- Or split metrics 50/50 as estimate

---

## 🧪 Immediate Debug Actions

1. **Check browser console for:**
   ```
   🎯 [ASO-METRICS] Calculating from raw data: X rows
   🎯 [ASO-METRICS] Search: { rows: 0, ... }
   ```

2. **Add debug log to Dashboard V2:**
   ```typescript
   console.log('🔍 [DEBUG] Sample rawData:', data?.rawData?.[0]);
   console.log('🔍 [DEBUG] Has traffic_source?',
     data?.rawData?.some(r => r.traffic_source !== null)
   );
   ```

3. **Check Edge Function logs:**
   ```
   [BIGQUERY] Query completed
     firstRow: { ..., traffic_source: ??? }
   ```

4. **Test BigQuery table directly:**
   ```sql
   SELECT *
   FROM `project.client_reports.aso_all_apple`
   LIMIT 1;
   ```
   Check if result has `traffic_source` column.

---

**Created:** November 8, 2025
**Status:** 🔍 **AWAITING DEBUG INFO**
**Next:** User to check console logs or provide BigQuery table schema
