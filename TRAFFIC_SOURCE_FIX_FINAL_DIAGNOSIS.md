# Traffic Source Filter - Final Diagnosis & Fix

**Date:** November 8, 2025
**Status:** 🎯 **ROOT CAUSE IDENTIFIED**

---

## 🎯 THE ISSUE: Wrong Table Name

### What the Code Uses:
```typescript
FROM `${projectId}.client_reports.aso_apple_source_type`  // ❌ DOES NOT EXIST
```

### What Actually Exists in BigQuery:
```sql
FROM `${projectId}.client_reports.aso_organic_apple`  // ✅ CORRECT TABLE
```

**This is why ALL traffic_source values are NULL!**

The query is trying to read from a non-existent table, causing:
- Either silent failure → falls back to some default behavior
- OR query returns empty/malformed results
- Row mapper gets wrong column count → data corruption

---

## 📊 Correct Table Schema: `aso_organic_apple`

```
| Column         | Type   | Mode     |
|----------------|--------|----------|
| date           | DATE   | NULLABLE |
| client         | STRING | NULLABLE |  ← Note: uses 'client' not 'app_id'
| traffic_source | STRING | NULLABLE |  ✅ This is what we need!
| impressions    | FLOAT  | NULLABLE |
| downloads      | FLOAT  | NULLABLE |
```

---

## 🔍 Key Differences from Current Implementation

### Column Naming:
- ❌ Code expects: `app_id` or uses `COALESCE(app_id, client)`
- ✅ Table has: **`client`** (no app_id column)
- 🔧 Fix: Use `client` directly

### Column Count:
- ❌ Code expects: 7 columns (date, app_id, traffic_source, impressions, product_page_views, downloads, conversion_rate)
- ✅ Table has: **5 columns** (date, client, traffic_source, impressions, downloads)
- 🔧 Fix: Adjust row mapper to 5 columns

### Missing Columns:
- ❌ Code expects: `product_page_views`, `conversion_rate`
- ✅ Table has: **ONLY impressions and downloads**
- 🔧 Fix: Calculate CVR from downloads/impressions

### Traffic Source Column:
- ✅ Column name is correct: `traffic_source`
- ✅ Column exists and should have values

---

## 🚨 Why Dashboard Shows Zeros

### Current Query (BROKEN):
```sql
SELECT
  date,
  COALESCE(app_id, client) AS app_id,  -- ❌ app_id doesn't exist
  source_type as traffic_source,        -- ❌ source_type doesn't exist
  impressions,
  product_page_views,                   -- ❌ doesn't exist
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `${projectId}.client_reports.aso_apple_source_type`  -- ❌ table doesn't exist
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
  AND date BETWEEN @start_date AND @end_date
ORDER BY date DESC
```

### Problems:
1. **Table name wrong:** `aso_apple_source_type` → should be `aso_organic_apple`
2. **Column name wrong:** `source_type` → should be `traffic_source`
3. **Missing columns:** `product_page_views` doesn't exist in this table
4. **Wrong app ID field:** Uses `COALESCE(app_id, client)` but only `client` exists

---

## ✅ Correct Query Should Be:

```sql
SELECT
  date,
  client AS app_id,                     -- ✅ Use client column
  traffic_source,                       -- ✅ Column exists as-is
  impressions,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(impressions, 0)) as conversion_rate  -- ✅ CVR from downloads/impressions
FROM `${projectId}.client_reports.aso_organic_apple`  -- ✅ Correct table name
WHERE client IN UNNEST(@app_ids)        -- ✅ Use client field
  AND date BETWEEN @start_date AND @end_date
  AND traffic_source IS NOT NULL        -- ✅ Filter out null traffic sources
ORDER BY date DESC
```

### Returns 6 columns:
1. `date`
2. `app_id` (aliased from `client`)
3. `traffic_source`
4. `impressions`
5. `downloads`
6. `conversion_rate` (calculated)

---

## 🔧 Required Code Changes

### File: `supabase/functions/bigquery-aso-data/index.ts`

### Change 1: Fix Table Name (Line ~412)
```typescript
// BEFORE:
FROM \`${projectId}.client_reports.aso_apple_source_type\`

// AFTER:
FROM \`${projectId}.client_reports.aso_organic_apple\`
```

### Change 2: Fix Query Columns (Lines ~409-425)
```typescript
// BEFORE:
const query = `
  SELECT
    date,
    COALESCE(app_id, client) AS app_id,
    source_type as traffic_source,
    impressions,
    product_page_views,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_apple_source_type\`
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
  ORDER BY date DESC
`;

// AFTER:
const query = `
  SELECT
    date,
    client AS app_id,
    traffic_source,
    impressions,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(impressions, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_organic_apple\`
  WHERE client IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
    AND traffic_source IS NOT NULL
  ORDER BY date DESC
`;
```

### Change 3: Fix Row Mapper (Lines ~99-111)
```typescript
// BEFORE (expects 7 columns):
return rows.map((row) => {
  const [date, appId, trafficSource, impressions, productPageViews, downloads, conversionRate] = row.f;
  return {
    date: date?.v ?? null,
    app_id: appId?.v ?? null,
    traffic_source: trafficSource?.v ?? null,
    impressions: impressions?.v ? Number(impressions.v) : 0,
    product_page_views: productPageViews?.v ? Number(productPageViews.v) : 0,
    downloads: downloads?.v ? Number(downloads.v) : 0,
    conversion_rate: conversionRate?.v ? Number(conversionRate.v) : 0,
  };
});

// AFTER (expects 6 columns):
return rows.map((row) => {
  const [date, appId, trafficSource, impressions, downloads, conversionRate] = row.f;
  return {
    date: date?.v ?? null,
    app_id: appId?.v ?? null,
    traffic_source: trafficSource?.v ?? null,
    impressions: impressions?.v ? Number(impressions.v) : 0,
    product_page_views: 0,  // Not available in aso_organic_apple table
    downloads: downloads?.v ? Number(downloads.v) : 0,
    conversion_rate: conversionRate?.v ? Number(conversionRate.v) : 0,
  };
});
```

### Change 4: Fix Dimensions Query (Lines ~490-515)
```typescript
// BEFORE:
const dimensionsQuery = `
  SELECT DISTINCT source_type as traffic_source
  FROM \`${projectId}.client_reports.aso_apple_source_type\`
  WHERE COALESCE(app_id, client) IN UNNEST(@all_app_ids)
    AND date BETWEEN @start_date AND @end_date
    AND source_type IS NOT NULL
`;

// AFTER:
const dimensionsQuery = `
  SELECT DISTINCT traffic_source
  FROM \`${projectId}.client_reports.aso_organic_apple\`
  WHERE client IN UNNEST(@all_app_ids)
    AND date BETWEEN @start_date AND @end_date
    AND traffic_source IS NOT NULL
`;
```

---

## 🧪 Testing After Fix

### Expected Behavior:

1. **Data Returns Successfully:**
   ```javascript
   console.log('📊 [BIGQUERY] Query successful', {
     rawRows: 1148,  // Should still return ~1148 rows
     firstRow: {
       date: '2025-10-27',
       app_id: '102228831',
       traffic_source: 'App Store Search',  // ✅ Now has value!
       impressions: 15234,
       downloads: 456,
       conversion_rate: 0.0299
     }
   });
   ```

2. **ASO Metrics Show Values:**
   ```javascript
   🎯 [ASO-METRICS] Search: {
     rows: 574,
     impressions: 1234567,    // ✅ Real values
     downloads: 45678,        // ✅ Real values
     cvr: '3.70%'            // ✅ Real percentage
   }

   🎯 [ASO-METRICS] Browse: {
     rows: 574,
     impressions: 987654,     // ✅ Real values
     downloads: 23456,        // ✅ Real values
     cvr: '2.37%'            // ✅ Real percentage
   }
   ```

3. **Traffic Source Filter Works:**
   ```javascript
   📊 [BIGQUERY] Available traffic sources fetched: {
     sources: ['App Store Search', 'App Store Browse'],  // ✅ Real values
     count: 2
   }
   ```

4. **Dashboard Cards Show Data:**
   - Search card: Shows actual impressions, downloads, CVR
   - Browse card: Shows actual impressions, downloads, CVR
   - Total metrics: Shows aggregated values
   - Charts: Show trend lines with real data

---

## ⚠️ Important Notes

### 1. Product Page Views Not Available
The `aso_organic_apple` table **does NOT have `product_page_views`**. This means:
- ❌ Can't show PPV metrics in dashboard
- ❌ Can't calculate CVR as downloads/PPV
- ✅ Can calculate CVR as downloads/impressions (still valid metric)

**Impact:**
- Some dashboard cards that expect `product_page_views` will show 0 or need to be hidden
- CVR calculation changes from `downloads/product_page_views` → `downloads/impressions`
- This is a business decision: Is impressions-based CVR acceptable?

### 2. Traffic Source Values
Expected values in the `traffic_source` column:
- `"App Store Search"` (or similar)
- `"App Store Browse"` (or similar)

**Check actual values in table:**
```sql
SELECT DISTINCT traffic_source, COUNT(*) as count
FROM `vertere-yodel.client_reports.aso_organic_apple`
WHERE client IN ('102228831', '1603183848')
  AND date >= '2024-10-01'
GROUP BY traffic_source
ORDER BY count DESC;
```

### 3. Client vs App ID
The table uses `client` not `app_id`. The values should be the same (e.g., '102228831'), but:
- Make sure `client` column contains the same IDs as your `org_app_access.app_id`
- Test with known app IDs to verify data returns

---

## 📋 Summary

### The Problem:
1. ❌ Wrong table name: `aso_apple_source_type` (doesn't exist)
2. ❌ Wrong column name: `source_type` (doesn't exist)
3. ❌ Wrong column count: Expected 7, table has 5 base columns
4. ❌ Wrong app ID field: Used `COALESCE(app_id, client)`, only `client` exists

### The Solution:
1. ✅ Use correct table: `aso_organic_apple`
2. ✅ Use correct column: `traffic_source`
3. ✅ Adjust row mapper: Expect 6 columns (5 base + 1 calculated)
4. ✅ Use correct field: `client` for app filtering
5. ✅ Handle missing PPV: Set to 0 or remove from UI

### Expected Outcome:
- ✅ Dashboard shows real data
- ✅ ASO metrics cards populated with actual values
- ✅ Traffic source filter works with real sources
- ✅ Charts show trends
- ⚠️ Product page views = 0 (not available in this table)

---

## 🎯 Next Steps

### Immediate:
1. Apply the 4 code changes listed above
2. Deploy Edge Function
3. Test dashboard with real user
4. Verify traffic_source values are correct

### Follow-up:
1. Decide if impressions-based CVR is acceptable
2. Update UI to handle missing PPV data
3. Add validation to prevent wrong table names
4. Document BigQuery table dependencies

---

**Created:** November 8, 2025
**Status:** ✅ **READY FOR FIX**
**Next:** Apply code changes and deploy
