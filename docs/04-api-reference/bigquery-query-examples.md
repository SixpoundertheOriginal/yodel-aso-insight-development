---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Common BigQuery query patterns, performance optimization, and cost estimation
See Also: docs/02-architecture/data-dictionary.md
See Also: docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md
Audience: Data Engineers, Analysts, Developers
---

# BigQuery Query Examples & Best Practices

## Overview

This document provides production-ready BigQuery query examples for ASO data analysis, along with performance optimization techniques and cost estimation guidance.

**Target Audience:** Data engineers, analysts, and developers working with BigQuery ASO data

**Table:** `yodel-mobile-app.aso_reports.aso_all_apple`

---

## Table of Contents

1. [Common Query Patterns](#common-query-patterns)
2. [Performance Optimization](#performance-optimization)
3. [Cost Estimation](#cost-estimation)
4. [Advanced Queries](#advanced-queries)
5. [Query Troubleshooting](#query-troubleshooting)

---

## Common Query Patterns

### Query 1: Summary Metrics for Single App

**Use Case:** Calculate total impressions, downloads, and CVR for one app in a date range

**Query:**
```sql
SELECT
  COALESCE(app_id, client) AS app_name,
  COUNT(DISTINCT date) AS days_active,
  SUM(impressions) AS total_impressions,
  SUM(product_page_views) AS total_ppv,
  SUM(downloads) AS total_downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 AS ppv_cvr,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(impressions), 0)) * 100 AS impressions_cvr,
  ROUND(AVG(downloads), 2) AS avg_daily_downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY app_name;
```

**Expected Output:**
```
app_name   | days_active | total_impressions | total_ppv | total_downloads | ppv_cvr | impressions_cvr | avg_daily_downloads
-----------|-------------|-------------------|-----------|-----------------|---------|-----------------|--------------------
Mixbook    | 30          | 1200000           | 400000    | 60000           | 15.00   | 5.00            | 2000.00
```

**Cost Estimate:** ~$0.01 per query (200 KB scanned)

**Performance:** < 1 second

**Optimization Tips:**
- Use `BETWEEN` for date filtering (enables partition pruning)
- Use `COALESCE(app_id, client)` for consistent app identification
- Use `SAFE_DIVIDE` to prevent division by zero errors

---

### Query 2: Traffic Source Breakdown

**Use Case:** Compare performance across different traffic sources

**Query:**
```sql
SELECT
  traffic_source,
  SUM(impressions) AS impressions,
  SUM(product_page_views) AS ppv,
  SUM(downloads) AS downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 AS cvr,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(impressions), 0)) * 100 AS impressions_cvr,
  ROUND(SAFE_DIVIDE(SUM(downloads), NULLIF(COUNT(DISTINCT date), 0)), 2) AS avg_daily_downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY traffic_source
ORDER BY downloads DESC;
```

**Expected Output:**
```
traffic_source     | impressions | ppv    | downloads | cvr   | impressions_cvr | avg_daily_downloads
-------------------|-------------|--------|-----------|-------|-----------------|--------------------
App Store Search   | 600000      | 200000 | 30000     | 15.00 | 5.00            | 1000.00
Web Referrer       | 300000      | 100000 | 15000     | 15.00 | 5.00            | 500.00
App Store Browse   | 200000      | 70000  | 10000     | 14.29 | 5.00            | 333.33
Apple Search Ads   | 100000      | 30000  | 5000      | 16.67 | 5.00            | 166.67
```

**Cost Estimate:** ~$0.01 per query (200 KB scanned)

**Performance:** < 1 second

**Business Insight:** Use this to identify which traffic sources have the highest CVR and should receive more investment.

---

### Query 3: Daily Time Series

**Use Case:** Generate daily metrics for trend analysis and charting

**Query:**
```sql
SELECT
  date,
  SUM(impressions) AS impressions,
  SUM(product_page_views) AS ppv,
  SUM(downloads) AS downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 AS cvr
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY date
ORDER BY date ASC;
```

**Expected Output:**
```
date       | impressions | ppv   | downloads | cvr
-----------|-------------|-------|-----------|------
2024-11-01 | 40000       | 13000 | 2000      | 15.38
2024-11-02 | 42000       | 14000 | 2100      | 15.00
2024-11-03 | 38000       | 12500 | 1875      | 15.00
...
```

**Cost Estimate:** ~$0.01 per query (200 KB scanned)

**Performance:** < 1 second

**Frontend Enhancement:** Missing dates should be filled with zeros in frontend to prevent chart gaps.

---

### Query 4: Multi-App Comparison

**Use Case:** Compare performance across multiple apps

**Query:**
```sql
SELECT
  COALESCE(app_id, client) AS app_name,
  SUM(impressions) AS impressions,
  SUM(downloads) AS downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(impressions), 0)) * 100 AS impressions_cvr,
  ROUND(SAFE_DIVIDE(SUM(downloads), NULLIF(COUNT(DISTINCT date), 0)), 2) AS avg_daily_downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN ('Mixbook', 'ColorJoy', 'AnotherApp')
  AND date BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY app_name
ORDER BY downloads DESC;
```

**Expected Output:**
```
app_name    | impressions | downloads | impressions_cvr | avg_daily_downloads
------------|-------------|-----------|-----------------|--------------------
Mixbook     | 1200000     | 60000     | 5.00            | 2000.00
ColorJoy    | 800000      | 32000     | 4.00            | 1066.67
AnotherApp  | 400000      | 16000     | 4.00            | 533.33
```

**Cost Estimate:** ~$0.015 per query (300 KB scanned)

**Performance:** < 1.5 seconds

**Use IN UNNEST for Better Performance:**
```sql
WHERE COALESCE(app_id, client) IN UNNEST(['Mixbook', 'ColorJoy', 'AnotherApp'])
```

---

### Query 5: Week-over-Week Growth

**Use Case:** Calculate weekly performance and compare to previous week

**Query:**
```sql
WITH weekly_metrics AS (
  SELECT
    EXTRACT(WEEK FROM date) AS week_number,
    MIN(date) AS week_start,
    MAX(date) AS week_end,
    SUM(downloads) AS downloads
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE COALESCE(app_id, client) = 'Mixbook'
    AND date BETWEEN '2024-10-01' AND '2024-11-30'
  GROUP BY week_number
  ORDER BY week_number
)
SELECT
  week_start,
  week_end,
  downloads AS current_week_downloads,
  LAG(downloads) OVER (ORDER BY week_number) AS previous_week_downloads,
  ROUND(
    SAFE_DIVIDE(
      downloads - LAG(downloads) OVER (ORDER BY week_number),
      NULLIF(LAG(downloads) OVER (ORDER BY week_number), 0)
    ) * 100,
    2
  ) AS wow_growth_pct
FROM weekly_metrics
ORDER BY week_start;
```

**Expected Output:**
```
week_start | week_end   | current_week_downloads | previous_week_downloads | wow_growth_pct
-----------|------------|------------------------|-------------------------|---------------
2024-10-07 | 2024-10-13 | 14000                  | NULL                    | NULL
2024-10-14 | 2024-10-20 | 15000                  | 14000                   | +7.14
2024-10-21 | 2024-10-27 | 16500                  | 15000                   | +10.00
```

**Cost Estimate:** ~$0.02 per query (400 KB scanned)

**Performance:** < 2 seconds

**Window Function:** `LAG()` retrieves value from previous row without self-join

---

### Query 6: Top Traffic Sources by Date

**Use Case:** Find which traffic source drives the most downloads each day

**Query:**
```sql
WITH daily_sources AS (
  SELECT
    date,
    traffic_source,
    SUM(downloads) AS downloads,
    ROW_NUMBER() OVER (PARTITION BY date ORDER BY SUM(downloads) DESC) AS rank
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE COALESCE(app_id, client) = 'Mixbook'
    AND date BETWEEN '2024-11-01' AND '2024-11-30'
  GROUP BY date, traffic_source
)
SELECT
  date,
  traffic_source AS top_source,
  downloads AS top_source_downloads
FROM daily_sources
WHERE rank = 1
ORDER BY date;
```

**Expected Output:**
```
date       | top_source         | top_source_downloads
-----------|--------------------|-----------------------
2024-11-01 | App Store Search   | 1200
2024-11-02 | App Store Search   | 1250
2024-11-03 | Web Referrer       | 1100
```

**Cost Estimate:** ~$0.015 per query (300 KB scanned)

**Performance:** < 1.5 seconds

**Use Case:** Identify shifts in primary acquisition channel over time

---

### Query 7: Conversion Funnel Analysis

**Use Case:** Analyze drop-off at each funnel stage

**Query:**
```sql
SELECT
  'Impressions' AS funnel_stage,
  SUM(impressions) AS count,
  100.0 AS pct_of_top,
  NULL AS drop_off_pct
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30'

UNION ALL

SELECT
  'Product Page Views' AS funnel_stage,
  SUM(product_page_views) AS count,
  SAFE_DIVIDE(SUM(product_page_views), NULLIF(SUM(impressions), 0)) * 100 AS pct_of_top,
  (1 - SAFE_DIVIDE(SUM(product_page_views), NULLIF(SUM(impressions), 0))) * 100 AS drop_off_pct
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30'

UNION ALL

SELECT
  'Downloads' AS funnel_stage,
  SUM(downloads) AS count,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(impressions), 0)) * 100 AS pct_of_top,
  (1 - SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0))) * 100 AS drop_off_pct
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30';
```

**Expected Output:**
```
funnel_stage         | count    | pct_of_top | drop_off_pct
---------------------|----------|------------|-------------
Impressions          | 1200000  | 100.00     | NULL
Product Page Views   | 400000   | 33.33      | 66.67
Downloads            | 60000    | 5.00       | 85.00
```

**Cost Estimate:** ~$0.03 per query (600 KB scanned)

**Performance:** < 2 seconds

**Insight:** Shows where users drop off in the acquisition funnel

---

### Query 8: Available Traffic Sources Discovery

**Use Case:** Find all traffic sources with data in date range (used by Edge Function)

**Query:**
```sql
SELECT DISTINCT traffic_source
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(['Mixbook', 'ColorJoy'])
  AND date BETWEEN '2024-11-01' AND '2024-11-30'
  AND traffic_source IS NOT NULL
ORDER BY traffic_source;
```

**Expected Output:**
```
traffic_source
--------------------
App Referrer
App Store Browse
App Store Search
Apple Search Ads
Other
Web Referrer
```

**Cost Estimate:** ~$0.01 per query (200 KB scanned)

**Performance:** < 1 second

**Use Case:** Dynamically populate traffic source filter dropdown in UI

---

### Query 9: Search vs Browse Performance

**Use Case:** Compare "Search" (intent-driven) vs "Browse" (discovery-driven) traffic

**Query:**
```sql
SELECT
  CASE
    WHEN traffic_source IN ('App Store Search', 'Apple Search Ads') THEN 'Search'
    WHEN traffic_source IN ('App Store Browse', 'Web Referrer', 'App Referrer', 'Other') THEN 'Browse'
    ELSE 'Unknown'
  END AS traffic_path,
  SUM(impressions) AS impressions,
  SUM(product_page_views) AS ppv,
  SUM(downloads) AS downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 AS ppv_cvr
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY traffic_path
ORDER BY downloads DESC;
```

**Expected Output:**
```
traffic_path | impressions | ppv    | downloads | ppv_cvr
-------------|-------------|--------|-----------|--------
Search       | 700000      | 230000 | 35000     | 15.22
Browse       | 500000      | 170000 | 25000     | 14.71
```

**Cost Estimate:** ~$0.01 per query (200 KB scanned)

**Performance:** < 1 second

**Business Insight:**
- High Search CVR = Good keyword targeting
- High Browse CVR = Strong visual assets (icon, screenshots)

---

### Query 10: Rolling 7-Day Average

**Use Case:** Smooth daily volatility with rolling average

**Query:**
```sql
WITH daily_metrics AS (
  SELECT
    date,
    SUM(downloads) AS downloads
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE COALESCE(app_id, client) = 'Mixbook'
    AND date BETWEEN '2024-10-25' AND '2024-11-30'
  GROUP BY date
)
SELECT
  date,
  downloads AS daily_downloads,
  ROUND(AVG(downloads) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS rolling_7day_avg
FROM daily_metrics
ORDER BY date;
```

**Expected Output:**
```
date       | daily_downloads | rolling_7day_avg
-----------|-----------------|------------------
2024-11-01 | 2000            | 1950.00
2024-11-02 | 2100            | 1975.00
2024-11-03 | 1900            | 1966.67
```

**Cost Estimate:** ~$0.015 per query (300 KB scanned)

**Performance:** < 1.5 seconds

**Use Case:** Identify true trends vs daily noise

---

## Performance Optimization

### Optimization 1: Date Partitioning

**Problem:** Full table scans are expensive and slow

**Solution:** Always filter by date to enable partition pruning

**Bad Query (Full Table Scan):**
```sql
-- ❌ Scans entire table (expensive!)
SELECT * FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook';
```
**Cost:** ~$5 per query (1 TB scanned)

**Good Query (Partition Pruning):**
```sql
-- ✅ Only scans relevant partitions
SELECT * FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-30';
```
**Cost:** ~$0.01 per query (200 KB scanned)

**Performance Improvement:** 500x faster, 500x cheaper

---

### Optimization 2: Use UNNEST for IN Clauses

**Problem:** `IN (val1, val2, ...)` can be slow for large lists

**Solution:** Use `IN UNNEST([val1, val2, ...])` for better performance

**Bad Query:**
```sql
-- ❌ Slower for large lists
WHERE COALESCE(app_id, client) IN ('App1', 'App2', 'App3', ...);
```

**Good Query:**
```sql
-- ✅ Faster with UNNEST
WHERE COALESCE(app_id, client) IN UNNEST(['App1', 'App2', 'App3', ...]);
```

**Performance Improvement:** 10-30% faster for lists > 10 items

---

### Optimization 3: Aggregate Before Joining

**Problem:** Joining large tables before aggregation is inefficient

**Solution:** Aggregate in CTEs first, then join smaller result sets

**Bad Query:**
```sql
-- ❌ Join first, aggregate later (slow)
SELECT
  t1.app_id,
  SUM(t1.downloads) + SUM(t2.revenue) AS total
FROM large_table1 t1
JOIN large_table2 t2 ON t1.app_id = t2.app_id
GROUP BY t1.app_id;
```

**Good Query:**
```sql
-- ✅ Aggregate first, join smaller tables
WITH aggregated1 AS (
  SELECT app_id, SUM(downloads) AS downloads
  FROM large_table1
  GROUP BY app_id
),
aggregated2 AS (
  SELECT app_id, SUM(revenue) AS revenue
  FROM large_table2
  GROUP BY app_id
)
SELECT
  a1.app_id,
  a1.downloads + a2.revenue AS total
FROM aggregated1 a1
JOIN aggregated2 a2 ON a1.app_id = a2.app_id;
```

**Performance Improvement:** 2-5x faster for large tables

---

### Optimization 4: Use SAFE_DIVIDE for Division

**Problem:** Division by zero causes query failures

**Solution:** Always use `SAFE_DIVIDE` or explicit null checks

**Bad Query:**
```sql
-- ❌ Can fail with division by zero error
SELECT downloads / product_page_views AS cvr;
```

**Good Query:**
```sql
-- ✅ Returns NULL instead of error
SELECT SAFE_DIVIDE(downloads, product_page_views) AS cvr;

-- OR with explicit zero check
SELECT
  CASE
    WHEN product_page_views > 0 THEN downloads / product_page_views
    ELSE 0
  END AS cvr;
```

**Best Practice:** Use `SAFE_DIVIDE` in production queries

---

### Optimization 5: Limit Result Rows

**Problem:** Returning millions of rows is slow and expensive

**Solution:** Use `LIMIT` for exploratory queries, pagination for production

**Exploratory Query:**
```sql
-- ✅ Limit for testing
SELECT *
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date BETWEEN '2024-11-01' AND '2024-11-30'
LIMIT 1000;
```

**Production Query (Pagination):**
```sql
-- ✅ Paginate with OFFSET
SELECT *
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date BETWEEN '2024-11-01' AND '2024-11-30'
ORDER BY date DESC
LIMIT 100 OFFSET 0;  -- Page 1: rows 0-99
-- LIMIT 100 OFFSET 100;  -- Page 2: rows 100-199
```

**Performance Improvement:** 10-100x faster for large result sets

---

## Cost Estimation

### BigQuery Pricing Model

**On-Demand Pricing:** $5 per TB scanned (default)

**Flat-Rate Pricing:** $10,000/month for unlimited queries (large orgs only)

**Free Tier:** First 1 TB/month free (shared across entire project)

---

### Cost Calculation Formula

```
Query Cost = (Bytes Scanned / 1,000,000,000,000) * $5
```

**Example:**
- Bytes scanned: 200,000,000 (200 MB)
- Cost: (200,000,000 / 1,000,000,000,000) * $5 = $0.001

---

### Cost Estimates by Query Type

| Query Type | Typical Data Scanned | Cost per Query | Monthly Cost (1000 queries) |
|------------|----------------------|----------------|----------------------------|
| Single app, 30 days | 200 KB | $0.001 | $1.00 |
| Multi-app (10 apps), 30 days | 2 MB | $0.01 | $10.00 |
| Agency (30 apps), 90 days | 20 MB | $0.10 | $100.00 |
| Full table scan (no date filter) | 1 TB | $5.00 | $5,000.00 |
| Time series (30 days) | 200 KB | $0.001 | $1.00 |
| Traffic source breakdown | 200 KB | $0.001 | $1.00 |

**Current Production Cost (with caching):** ~$12-25/month

**Without Caching:** ~$100-150/month (5-7x more queries)

---

### Cost Optimization Tips

#### Tip 1: Cache Frequently Used Queries

**Recommendation:** Implement 30-second cache in Edge Function (already implemented)

**Savings:** 60-70% cost reduction (cached queries = $0)

---

#### Tip 2: Use Materialized Views

**Recommendation:** Pre-aggregate daily summaries for common queries

**Example:**
```sql
CREATE MATERIALIZED VIEW `yodel-mobile-app.aso_reports.daily_app_summary`
AS
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  SUM(impressions) AS impressions,
  SUM(downloads) AS downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
GROUP BY date, app_id;
```

**Savings:** 80-90% cost reduction for aggregated queries

**Trade-off:** Slight data staleness (refreshes every 1-4 hours)

---

#### Tip 3: Partition by Date

**Recommendation:** Ensure table is partitioned by `date` column (already implemented)

**Savings:** 10-100x cost reduction (only scans relevant partitions)

**Verification:**
```sql
SELECT * FROM `yodel-mobile-app.aso_reports.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'aso_all_apple';
```

---

#### Tip 4: Use Approximate Aggregations

**Recommendation:** Use `APPROX_COUNT_DISTINCT` instead of `COUNT(DISTINCT)` for large datasets

**Example:**
```sql
-- ✅ Faster and cheaper (less accurate)
SELECT APPROX_COUNT_DISTINCT(COALESCE(app_id, client)) AS approx_app_count
FROM `yodel-mobile-app.aso_reports.aso_all_apple`;

-- ❌ Slower and more expensive (exact)
SELECT COUNT(DISTINCT COALESCE(app_id, client)) AS exact_app_count
FROM `yodel-mobile-app.aso_reports.aso_all_apple`;
```

**Savings:** 2-5x cost reduction for large datasets

**Accuracy:** 98-99% accurate (acceptable for most use cases)

---

## Advanced Queries

### Advanced Query 1: Cohort Analysis (Simulated)

**Use Case:** Track download cohorts over time (requires external cohort table)

**Query:**
```sql
-- Note: Requires cohort_retention table (not currently available)
WITH cohorts AS (
  SELECT
    DATE_TRUNC(date, WEEK) AS cohort_week,
    SUM(downloads) AS cohort_size
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE COALESCE(app_id, client) = 'Mixbook'
    AND date BETWEEN '2024-10-01' AND '2024-11-30'
  GROUP BY cohort_week
)
SELECT
  cohort_week,
  cohort_size,
  LAG(cohort_size, 1) OVER (ORDER BY cohort_week) AS previous_cohort_size,
  ROUND(
    SAFE_DIVIDE(
      cohort_size - LAG(cohort_size, 1) OVER (ORDER BY cohort_week),
      NULLIF(LAG(cohort_size, 1) OVER (ORDER BY cohort_week), 0)
    ) * 100,
    2
  ) AS week_over_week_growth
FROM cohorts
ORDER BY cohort_week;
```

**Status:** Requires retention data (not in current schema)

**Future Enhancement:** Integrate with Firebase/Mixpanel for true cohort analysis

---

### Advanced Query 2: Anomaly Detection (Statistical)

**Use Case:** Flag days with abnormal download volumes

**Query:**
```sql
WITH daily_downloads AS (
  SELECT
    date,
    SUM(downloads) AS downloads
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE COALESCE(app_id, client) = 'Mixbook'
    AND date BETWEEN '2024-10-01' AND '2024-11-30'
  GROUP BY date
),
stats AS (
  SELECT
    AVG(downloads) AS mean,
    STDDEV(downloads) AS stddev
  FROM daily_downloads
)
SELECT
  d.date,
  d.downloads,
  s.mean,
  s.stddev,
  (d.downloads - s.mean) / NULLIF(s.stddev, 0) AS z_score,
  CASE
    WHEN ABS((d.downloads - s.mean) / NULLIF(s.stddev, 0)) > 2 THEN '🚨 Anomaly'
    ELSE 'Normal'
  END AS status
FROM daily_downloads d
CROSS JOIN stats s
ORDER BY date;
```

**Expected Output:**
```
date       | downloads | mean  | stddev | z_score | status
-----------|-----------|-------|--------|---------|----------
2024-11-01 | 2000      | 1950  | 150    | 0.33    | Normal
2024-11-15 | 3500      | 1950  | 150    | 10.33   | 🚨 Anomaly
```

**Use Case:** Automated alerting for unusual performance changes

---

### Advanced Query 3: Forecasting (Linear Regression)

**Use Case:** Predict next week's downloads based on trend

**Query:**
```sql
WITH daily_metrics AS (
  SELECT
    date,
    SUM(downloads) AS downloads,
    ROW_NUMBER() OVER (ORDER BY date) AS day_number
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE COALESCE(app_id, client) = 'Mixbook'
    AND date BETWEEN '2024-10-01' AND '2024-11-30'
  GROUP BY date
),
regression AS (
  SELECT
    CORR(day_number, downloads) * (STDDEV_POP(downloads) / NULLIF(STDDEV_POP(day_number), 0)) AS slope,
    AVG(downloads) - (CORR(day_number, downloads) * (STDDEV_POP(downloads) / NULLIF(STDDEV_POP(day_number), 0)) * AVG(day_number)) AS intercept
  FROM daily_metrics
)
SELECT
  DATE_ADD('2024-11-30', INTERVAL 7 DAY) AS forecast_date,
  ROUND(r.intercept + (r.slope * (SELECT MAX(day_number) + 7 FROM daily_metrics)), 0) AS forecasted_downloads
FROM regression r;
```

**Status:** Basic linear regression (not ML-based)

**Future Enhancement:** Use BigQuery ML for advanced forecasting

---

## Query Troubleshooting

### Issue 1: "Resources Exceeded" Error

**Symptom:** Query fails with "Resources exceeded during query execution"

**Cause:** Query processing too much data or complex computation

**Solution:**
- Reduce date range
- Filter by fewer apps
- Add `LIMIT` to result set
- Break into smaller queries with CTEs

---

### Issue 2: Slow Query Performance

**Symptom:** Query takes > 10 seconds

**Diagnosis:**
```sql
-- Check query plan and bytes processed
-- (available in BigQuery console after execution)
```

**Solutions:**
- Add date filtering (partition pruning)
- Remove unnecessary columns from SELECT
- Use `LIMIT` for large result sets
- Consider materialized views for repeated queries

---

### Issue 3: Division by Zero Errors

**Symptom:** Query fails with "division by zero" error

**Solution:**
```sql
-- Always use SAFE_DIVIDE
SELECT SAFE_DIVIDE(downloads, product_page_views) AS cvr;

-- OR explicit null check
SELECT
  CASE
    WHEN product_page_views > 0 THEN downloads / product_page_views
    ELSE 0
  END AS cvr;
```

---

### Issue 4: NULL Values in Aggregations

**Symptom:** Unexpected NULL results in SUM/AVG

**Solution:**
```sql
-- Use COALESCE to handle NULLs
SELECT
  SUM(COALESCE(downloads, 0)) AS total_downloads,
  AVG(COALESCE(conversion_rate, 0)) AS avg_cvr
FROM `yodel-mobile-app.aso_reports.aso_all_apple`;
```

---

## Related Documentation

- **Data Dictionary:** [docs/02-architecture/data-dictionary.md](../../02-architecture/data-dictionary.md)
- **BigQuery Schema Reference:** [docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md](../../03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md)
- **Data Pipeline Monitoring:** [docs/05-workflows/data-pipeline-monitoring.md](../../05-workflows/data-pipeline-monitoring.md) (P2.4 - to be created)
- **Data Lineage:** [docs/02-architecture/data-lineage.md](../../02-architecture/data-lineage.md) (P2.4 - to be created)

---

**Document Version:** 1.0
**Last Updated:** January 20, 2025
**Maintained By:** Data Engineering Team
