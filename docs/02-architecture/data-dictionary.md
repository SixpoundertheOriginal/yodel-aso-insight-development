---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Complete data dictionary for ASO analytics data (fields, metrics, formulas, quality notes)
See Also: docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md
See Also: docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md
Audience: Data Scientists, Analysts, Data Engineers, Product Managers
---

# ASO Analytics Data Dictionary

## Overview

This data dictionary provides complete definitions, formulas, and quality notes for all ASO (App Store Optimization) data available in the Yodel ASO Insight platform.

**Primary Data Source:** BigQuery
**Project:** `yodel-mobile-app`
**Dataset:** `aso_reports`
**Table:** `aso_all_apple`
**Refresh Schedule:** Daily (See [data-lineage.md](./data-lineage.md))

---

## Table of Contents

1. [Raw Data Fields](#raw-data-fields)
2. [Core Metrics](#core-metrics)
3. [Calculated Metrics](#calculated-metrics)
4. [Derived Metrics](#derived-metrics)
5. [Dimensions](#dimensions)
6. [Traffic Source Values](#traffic-source-values)
7. [Data Quality Notes](#data-quality-notes)
8. [Known Limitations](#known-limitations)
9. [Metric Calculation Examples](#metric-calculation-examples)

---

## Raw Data Fields

### Table: `aso_all_apple`

| Field Name | Type | Nullable | Description | Example Value | Source |
|------------|------|----------|-------------|---------------|--------|
| `date` | DATE | No | Reporting date for metrics | `2024-11-14` | App Store Connect API |
| `app_id` | STRING | Yes* | Application identifier (primary) | `"Mixbook"` | App Store Connect API |
| `client` | STRING | Yes* | Client/organization name (fallback) | `"Client One"` | App Store Connect API |
| `traffic_source` | STRING | No | Marketing channel/acquisition source | `"App Store Search"` | App Store Connect API |
| `impressions` | INTEGER | No | Product page impressions | `15000` | App Store Connect API |
| `product_page_views` | INTEGER | No | Distinct product page views | `5000` | App Store Connect API |
| `downloads` | INTEGER | No | App installations/downloads | `750` | App Store Connect API |
| `conversion_rate` | FLOAT | No | Pre-calculated conversion rate | `0.15` (15%) | Calculated in BigQuery |

**Notes:**
- *Either `app_id` OR `client` must be non-null (coalesced in queries)
- All numeric fields default to 0 if null
- `conversion_rate` is calculated as `downloads / product_page_views` using SAFE_DIVIDE

---

## Core Metrics

### Impressions

**Definition:** The number of times an app's product page was displayed in the App Store.

**Business Meaning:** Measures brand awareness and discoverability. Higher impressions indicate better visibility in search results, browse categories, and referrals.

**Calculation:** Direct from BigQuery (no transformation)

**Aggregation:** SUM across selected date range, apps, and traffic sources

**Formula:**
```sql
SELECT SUM(impressions) as total_impressions
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date BETWEEN @start_date AND @end_date
  AND COALESCE(app_id, client) IN UNNEST(@app_ids);
```

**Granularity:**
- By date (daily)
- By app (per application)
- By traffic source (per channel)

**Quality Score:** ✅ High (direct from API, reliable)

**Typical Range:**
- Small apps: 1,000 - 10,000/day
- Medium apps: 10,000 - 100,000/day
- Large apps: 100,000 - 1,000,000+/day

**Known Issues:**
- None. This is a reliable metric from Apple's API.

---

### Product Page Views (PPV)

**Definition:** The number of distinct views of an app's product page. A user viewing the same page multiple times in one session counts as one view.

**Business Meaning:** Measures user interest and engagement. PPV indicates how many users actively chose to view the full product page after seeing an impression.

**Calculation:** Direct from BigQuery (no transformation)

**Aggregation:** SUM across selected date range, apps, and traffic sources

**Formula:**
```sql
SELECT SUM(product_page_views) as total_ppv
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date BETWEEN @start_date AND @end_date
  AND COALESCE(app_id, client) IN UNNEST(@app_ids);
```

**Relationship to Impressions:**
- PPV ≤ Impressions (always)
- Impression-to-PPV Rate = (PPV / Impressions) * 100
- Typical ratio: 20-40% (varies by traffic source)

**Granularity:**
- By date (daily)
- By app (per application)
- By traffic source (per channel)

**Quality Score:** ✅ High (direct from API, reliable)

**Typical Range:**
- Small apps: 500 - 5,000/day
- Medium apps: 5,000 - 50,000/day
- Large apps: 50,000 - 500,000+/day

**Known Issues:**
- None. This is a reliable metric from Apple's API.

---

### Downloads (Installs)

**Definition:** The number of first-time app installations. Re-installations by the same user are NOT counted.

**Business Meaning:** The most critical conversion metric. Measures how many users completed the full funnel from impression → view → install.

**Calculation:** Direct from BigQuery (no transformation)

**Aggregation:** SUM across selected date range, apps, and traffic sources

**Formula:**
```sql
SELECT SUM(downloads) as total_downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date BETWEEN @start_date AND @end_date
  AND COALESCE(app_id, client) IN UNNEST(@app_ids);
```

**Alias:** `installs` (used interchangeably in frontend)

**Granularity:**
- By date (daily)
- By app (per application)
- By traffic source (per channel)

**Quality Score:** ✅ High (direct from API, reliable)

**Typical Range:**
- Small apps: 50 - 500/day
- Medium apps: 500 - 5,000/day
- Large apps: 5,000 - 50,000+/day

**Known Issues:**
- Does NOT include re-installations
- Does NOT include updates
- Does NOT track uninstalls

---

### Conversion Rate (Pre-calculated)

**Definition:** The percentage of product page views that resulted in a download. Pre-calculated in BigQuery.

**Business Meaning:** Measures product page effectiveness. High CVR indicates compelling screenshots, descriptions, and ratings.

**Calculation:** Calculated in BigQuery using SAFE_DIVIDE

**Formula:**
```sql
SELECT
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `yodel-mobile-app.aso_reports.aso_all_apple`;
```

**Output Format:** Decimal (0.0 to 1.0)
- Example: `0.15` = 15% conversion rate

**Re-calculation in Frontend:**
```typescript
const cvr = product_page_views > 0
  ? (downloads / product_page_views) * 100  // Convert to percentage
  : 0;
```

**Quality Score:** ✅ High (derived from reliable metrics)

**Typical Range:**
- Poor: < 5%
- Average: 5-15%
- Good: 15-25%
- Excellent: > 25%

**Known Issues:**
- Can be 0 if product_page_views = 0 (rare edge case)
- SAFE_DIVIDE ensures no division by zero errors

---

## Calculated Metrics

These metrics are calculated in the frontend data transformation layer (not stored in BigQuery).

### Impressions-to-Download CVR

**Definition:** The percentage of impressions that resulted in a download (full funnel).

**Business Meaning:** Measures overall funnel efficiency from awareness to conversion.

**Calculation:** Client-side calculation in `calculateSummary()`

**Formula:**
```typescript
const impressions_cvr = impressions > 0
  ? (downloads / impressions) * 100
  : 0;
```

**Example:**
```
Impressions: 100,000
Downloads: 5,000
Impressions CVR = (5,000 / 100,000) * 100 = 5.0%
```

**Typical Range:**
- Poor: < 2%
- Average: 2-5%
- Good: 5-8%
- Excellent: > 8%

**Interpretation:**
- Low CVR + High impressions = Poor visibility or targeting
- High CVR + Low impressions = Good targeting, need more visibility

---

### PPV-to-Download CVR

**Definition:** The percentage of product page views that resulted in a download (same as pre-calculated conversion_rate, but expressed as percentage).

**Business Meaning:** Measures product page conversion effectiveness.

**Calculation:** Client-side calculation in `calculateSummary()`

**Formula:**
```typescript
const product_page_cvr = product_page_views > 0
  ? (downloads / product_page_views) * 100
  : 0;
```

**Example:**
```
Product Page Views: 50,000
Downloads: 7,500
PPV CVR = (7,500 / 50,000) * 100 = 15.0%
```

**Typical Range:** (Same as Conversion Rate above)
- Poor: < 5%
- Average: 5-15%
- Good: 15-25%
- Excellent: > 25%

---

### Period-over-Period Delta

**Definition:** The percentage change in a metric compared to the previous period.

**Business Meaning:** Measures growth or decline trends over time.

**Calculation:** Client-side calculation in `usePeriodComparison()` hook

**Formula:**
```typescript
const delta = previous_value > 0
  ? ((current_value - previous_value) / previous_value) * 100
  : 0;
```

**Example:**
```
Current Period Downloads: 10,000
Previous Period Downloads: 8,000
Delta = ((10,000 - 8,000) / 8,000) * 100 = +25.0%
```

**Output Format:**
- Positive delta: `+25.0%` (growth)
- Negative delta: `-15.0%` (decline)
- Zero delta: `0.0%` (no change)

**Special Cases:**
- If previous_value = 0 and current_value > 0: Delta = `+100%` (new metric)
- If previous_value > 0 and current_value = 0: Delta = `-100%` (complete drop)

**Quality Score:** ⚠️ Medium (depends on comparison period selection)

**Known Issues:**
- Sensitive to outliers in small datasets
- Can be misleading if comparison period had unusual activity
- Demo mode normalizes deltas to 0.1-8% range (prevents unrealistic values)

---

## Derived Metrics

These are advanced metrics calculated from core metrics to provide deeper insights.

### Impression-to-PPV Rate

**Definition:** The percentage of impressions that converted to product page views.

**Business Meaning:** Measures initial interest and click-through effectiveness.

**Formula:**
```typescript
const impression_to_ppv_rate = impressions > 0
  ? (product_page_views / impressions) * 100
  : 0;
```

**Example:**
```
Impressions: 100,000
Product Page Views: 30,000
Impression-to-PPV Rate = (30,000 / 100,000) * 100 = 30.0%
```

**Typical Range:**
- Poor: < 20%
- Average: 20-40%
- Good: 40-60%
- Excellent: > 60%

**Interpretation:**
- Low rate = Poor icon, title, or ratings
- High rate = Strong visual appeal and positioning

---

### Reach Efficiency

**Definition:** Downloads per 1,000 impressions (eCPM equivalent for organic).

**Business Meaning:** Measures overall funnel efficiency at scale.

**Formula:**
```typescript
const reach_efficiency = impressions > 0
  ? (downloads / impressions) * 1000
  : 0;
```

**Example:**
```
Impressions: 100,000
Downloads: 5,000
Reach Efficiency = (5,000 / 100,000) * 1000 = 50 downloads per 1K impressions
```

**Typical Range:**
- Poor: < 20 downloads/1K
- Average: 20-50 downloads/1K
- Good: 50-80 downloads/1K
- Excellent: > 80 downloads/1K

---

### Stability Score

**Definition:** Measures the consistency of daily downloads over a period (lower coefficient of variation = more stable).

**Business Meaning:** Helps identify seasonal patterns, volatility, and predictability of performance.

**Calculation:** Calculated in `calculateStabilityScore()` function

**Formula:**
```typescript
const mean = downloads.reduce((sum, val) => sum + val, 0) / downloads.length;
const variance = downloads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / downloads.length;
const stdDev = Math.sqrt(variance);
const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 0;

const stabilityScore = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));
```

**Output:** 0-100 score
- 0-30: Highly volatile
- 30-60: Moderate volatility
- 60-80: Stable
- 80-100: Very stable

**Interpretation:**
- Low score = Unpredictable performance, high sensitivity to external factors
- High score = Consistent performance, good for forecasting

---

## Dimensions

### Date Dimension

**Field:** `date`
**Type:** DATE (YYYY-MM-DD)
**Granularity:** Daily
**Range:** January 2024 - Present

**Available Operations:**
- Filter by date range (BETWEEN)
- Group by date (daily aggregation)
- Order by date (chronological sorting)

**Special Handling:**
- Missing dates are filled with zeros in frontend (complete date range generation)
- Time zone: UTC (no conversion)

**Example Query:**
```sql
WHERE date BETWEEN '2024-11-01' AND '2024-11-30'
```

---

### App Dimension

**Field:** `COALESCE(app_id, client) AS app_id`
**Type:** STRING
**Granularity:** Per application

**Values:** Dynamic (discovered from data)
- Example: `"Mixbook"`, `"ColorJoy"`, `"com.example.app"`

**Available Operations:**
- Filter by app list (IN UNNEST)
- Group by app
- Count distinct apps

**Access Control:**
- Users only see apps in `org_app_access` table
- Agency users see managed client apps
- Super admins see all apps (must select org first)

**Example Query:**
```sql
WHERE COALESCE(app_id, client) IN UNNEST(['Mixbook', 'ColorJoy'])
```

---

### Traffic Source Dimension

**Field:** `traffic_source`
**Type:** STRING
**Granularity:** Per channel

**Standard Values:** (See [Traffic Source Values](#traffic-source-values) section)
- `"App Store Search"`
- `"Web Referrer"`
- `"App Referrer"`
- `"Apple Search Ads"`
- `"App Store Browse"`
- `"Other"`

**Available Operations:**
- Filter by traffic source list (IN)
- Group by traffic source
- Order by metric volume

**Dynamic Discovery:**
- Available traffic sources queried from actual data
- Returned in Edge Function response as `meta.available_traffic_sources`

**Example Query:**
```sql
WHERE traffic_source IN ('App Store Search', 'Web Referrer')
```

---

## Traffic Source Values

### Standard Traffic Sources

| Value | Display Name | Description | Typical Volume |
|-------|--------------|-------------|----------------|
| `"App Store Search"` | App Store Search | Users who found app via keyword search | 40-60% of total |
| `"Web Referrer"` | Web Referrer | Users coming from external websites | 10-20% of total |
| `"App Referrer"` | App Referrer | Users coming from other apps | 5-15% of total |
| `"Apple Search Ads"` | Apple Search Ads | Paid search advertising | 0-30% of total |
| `"App Store Browse"` | App Store Browse | Users browsing categories/charts | 10-20% of total |
| `"Other"` | Other | Miscellaneous sources | 5-10% of total |

### Traffic Source Groups (Two-Path Analysis)

**Search Path:**
- `"App Store Search"`
- `"Apple Search Ads"`

**Browse Path:**
- `"App Store Browse"`
- `"Web Referrer"`
- `"App Referrer"`
- `"Other"`

**Purpose:** Compare intent-driven (Search) vs discovery-driven (Browse) acquisition.

---

## Data Quality Notes

### High Quality Metrics ✅

**Impressions, Product Page Views, Downloads, Conversion Rate**
- **Source:** App Store Connect API (official Apple data)
- **Refresh:** Daily (24-hour delay)
- **Completeness:** 100% (all apps, all dates)
- **Accuracy:** Very high (Apple's internal tracking)

**Recommendation:** Use these metrics confidently for reporting and analysis.

---

### Missing/Unavailable Metrics ❌

The following fields exist in data models but are NOT populated:

| Field | Reason | Workaround |
|-------|--------|------------|
| `revenue` | Not available from App Store Connect API | Always `0` |
| `sessions` | Not tracked by Apple for organic traffic | Always `0` |
| `country` | Not in BigQuery table schema | Use third-party analytics |
| `device` | Not in BigQuery table schema | Use third-party analytics |
| `os_version` | Not in BigQuery table schema | Use third-party analytics |
| `app_version` | Not in BigQuery table schema | Use third-party analytics |

**Impact:**
- No revenue attribution for organic downloads
- No geographic segmentation
- No device/OS breakdown
- No version-specific analysis

**Mitigation:**
- Integrate with third-party analytics (Firebase, Mixpanel, Amplitude) for deeper insights
- Revenue data can be imported separately if needed

---

### Known Data Quality Issues

#### Issue 1: Delayed Data Refresh

**Description:** BigQuery data has a 24-48 hour delay from actual events.

**Impact:** Dashboard shows data up to 2 days ago, not real-time.

**Severity:** Low (acceptable for ASO analytics)

**Workaround:** Display "Data as of [date]" notice in UI

---

#### Issue 2: Sparse Date Coverage

**Description:** BigQuery only returns dates with non-zero data.

**Impact:** Charts can have gaps if no activity on certain days.

**Severity:** Low (handled in frontend)

**Mitigation:**
```typescript
// Generate complete date range in filterTimeseries()
const allDates = generateDateRange(startDate, endDate);
allDates.forEach(date => {
  grouped[date] = { date, impressions: 0, downloads: 0, ... };
});
```

---

#### Issue 3: Traffic Source Name Variations

**Description:** Traffic source names may vary slightly between data exports.

**Impact:** Filtering and grouping may miss variations.

**Severity:** Low (standardized in queries)

**Mitigation:**
```sql
-- Always use COALESCE for consistent naming
COALESCE(app_id, client) AS app_id
```

---

## Known Limitations

### 1. No Keyword-Level Data

**What's Missing:** Individual keyword rankings and performance

**Why:** Not included in App Store Connect API data available in BigQuery

**Impact:**
- Cannot track "which keywords drive the most downloads"
- Cannot optimize for specific keywords
- Cannot monitor keyword ranking changes

**Alternatives:**
- Use third-party ASO tools (App Annie, Sensor Tower, Mobile Action)
- Manually track priority keywords

**Related Tables:** `keyword_rankings` table exists but is empty (placeholder for future)

---

### 2. No Competitor Benchmarking

**What's Missing:** Competitor app performance data

**Why:** Apple does not share competitor data via API

**Impact:**
- Cannot compare CVR to category average
- Cannot identify market leaders
- Cannot detect competitive threats

**Alternatives:**
- Manual competitor research
- Third-party ASO tools with estimated data

**Related Tables:** `competitor_intelligence` tables exist but are sparse

---

### 3. No Anomaly Detection

**What's Missing:** Automated outlier and anomaly flagging

**Why:** Not computed in data pipeline (future enhancement)

**Impact:**
- Users must manually spot unusual spikes or drops
- No proactive alerting for performance issues

**Future Enhancement:** Planned for V2 with ML-based anomaly detection

---

### 4. No Predictive Analytics

**What's Missing:** Forecasting and trend projection

**Why:** No ML pipeline implemented yet

**Impact:**
- Cannot predict future download trends
- Cannot estimate impact of planned changes

**Future Enhancement:** Planned for V2 with ML-based forecasting

---

### 5. No Cohort or Retention Metrics

**What's Missing:** User cohort analysis, retention rates, LTV

**Why:** Not available from App Store Connect API

**Impact:**
- Cannot track "how many users from Nov 1 are still active 30 days later"
- Cannot calculate lifetime value

**Alternatives:**
- Integrate with Firebase Analytics, Mixpanel, or Amplitude for post-install behavior

---

## Metric Calculation Examples

### Example 1: Summary Metrics for Single App

**Scenario:** Calculate summary metrics for "Mixbook" app from Nov 1-14, 2024

**Query:**
```sql
SELECT
  SUM(impressions) as total_impressions,
  SUM(product_page_views) as total_ppv,
  SUM(downloads) as total_downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 as ppv_cvr,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(impressions), 0)) * 100 as impressions_cvr
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-14';
```

**Expected Result:**
```json
{
  "total_impressions": 420000,
  "total_ppv": 140000,
  "total_downloads": 21000,
  "ppv_cvr": 15.0,
  "impressions_cvr": 5.0
}
```

---

### Example 2: Traffic Source Breakdown

**Scenario:** Calculate metrics by traffic source for "Mixbook" app

**Query:**
```sql
SELECT
  traffic_source,
  SUM(impressions) as impressions,
  SUM(product_page_views) as ppv,
  SUM(downloads) as downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 as cvr
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-14'
GROUP BY traffic_source
ORDER BY downloads DESC;
```

**Expected Result:**
```json
[
  {
    "traffic_source": "App Store Search",
    "impressions": 200000,
    "ppv": 80000,
    "downloads": 12000,
    "cvr": 15.0
  },
  {
    "traffic_source": "Web Referrer",
    "impressions": 100000,
    "ppv": 30000,
    "downloads": 4500,
    "cvr": 15.0
  },
  {
    "traffic_source": "App Store Browse",
    "impressions": 80000,
    "ppv": 20000,
    "downloads": 3000,
    "cvr": 15.0
  }
]
```

---

### Example 3: Daily Time Series

**Scenario:** Calculate daily metrics for trend analysis

**Query:**
```sql
SELECT
  date,
  SUM(impressions) as impressions,
  SUM(downloads) as downloads,
  SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(impressions), 0)) * 100 as cvr
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-14'
GROUP BY date
ORDER BY date ASC;
```

**Expected Result:**
```json
[
  {
    "date": "2024-11-01",
    "impressions": 30000,
    "downloads": 1500,
    "cvr": 5.0
  },
  {
    "date": "2024-11-02",
    "impressions": 32000,
    "downloads": 1600,
    "cvr": 5.0
  },
  ...
]
```

**Frontend Enhancement:** Missing dates are filled with zeros to prevent chart gaps.

---

### Example 4: Period Comparison

**Scenario:** Calculate delta between current period (Nov 1-14) and previous period (Oct 18-31)

**Current Period Query:**
```sql
SELECT
  'current' as period,
  SUM(downloads) as downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-11-01' AND '2024-11-14';
```

**Previous Period Query:**
```sql
SELECT
  'previous' as period,
  SUM(downloads) as downloads
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE COALESCE(app_id, client) = 'Mixbook'
  AND date BETWEEN '2024-10-18' AND '2024-10-31';
```

**Delta Calculation (Frontend):**
```typescript
const current_downloads = 21000;
const previous_downloads = 19500;
const delta = ((21000 - 19500) / 19500) * 100; // = +7.69%
```

---

## Related Documentation

- **BigQuery Schema Reference:** [docs/03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md](../../03-features/dashboard-v2/BIGQUERY_SCHEMA_AND_METRICS_MAP.md)
- **Data Pipeline Audit:** [docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md](../../03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md)
- **BigQuery Query Examples:** [docs/04-api-reference/bigquery-query-examples.md](../../04-api-reference/bigquery-query-examples.md) (P2.4 - to be created)
- **Data Lineage:** [docs/02-architecture/data-lineage.md](./data-lineage.md) (P2.4 - to be created)
- **Data Pipeline Monitoring:** [docs/05-workflows/data-pipeline-monitoring.md](../../05-workflows/data-pipeline-monitoring.md) (P2.4 - to be created)

---

**Document Version:** 1.0
**Last Updated:** January 20, 2025
**Maintained By:** Data Engineering Team
