---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Data pipeline monitoring, freshness SLAs, alerting, and quality checks
See Also: docs/02-architecture/data-lineage.md
See Also: docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md
Audience: Data Engineers, DevOps, Platform Engineers
---

# Data Pipeline Monitoring Guide

## Overview

This document defines monitoring procedures, SLAs, alerting rules, and quality checks for the ASO data pipeline from App Store Connect → BigQuery → Dashboard V2.

**Primary Pipeline:** App Store Connect API → BigQuery → Edge Function → Frontend
**Criticality:** HIGH (powers production Dashboard V2)
**Monitoring Level:** Production

---

## Table of Contents

1. [Data Freshness SLAs](#data-freshness-slas)
2. [Pipeline Components](#pipeline-components)
3. [Health Checks](#health-checks)
4. [Alerting Rules](#alerting-rules)
5. [Data Quality Checks](#data-quality-checks)
6. [Troubleshooting Playbook](#troubleshooting-playbook)
7. [Metrics & Dashboards](#metrics--dashboards)

---

## Data Freshness SLAs

### SLA Definition

**Target Data Freshness:** Data for date `D` should be available by `D+1 09:00 UTC`

**Example:**
- Date: November 14, 2024 (Wednesday)
- Expected availability: November 15, 2024 09:00 UTC
- SLA breach: November 15, 2024 12:00 UTC (3+ hours late)

**SLA Compliance Target:** 95% of days meet freshness SLA

**Measured Weekly:** Monday 00:00 UTC - Sunday 23:59 UTC

---

### Data Latency Expectations

| Pipeline Stage | Expected Latency | Max Acceptable Latency | Notes |
|----------------|------------------|------------------------|-------|
| **App Store Connect API → Raw Data** | 12-24 hours | 48 hours | Apple's processing delay |
| **Raw Data → BigQuery** | 1-2 hours | 4 hours | Data ingestion pipeline |
| **BigQuery → Edge Function** | Real-time | 5 seconds | API query latency |
| **Edge Function → Frontend** | Real-time | 2 seconds | Network + rendering |
| **Total End-to-End** | 13-26 hours | 48 hours | App Store Connect to Dashboard |

**Critical:** If data for `D-2` (2 days ago) is still missing, trigger high-priority alert.

---

### Freshness Check Query

**Query to check latest available date:**
```sql
SELECT
  MAX(date) AS latest_date,
  DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) AS days_behind
FROM `yodel-mobile-app.aso_reports.aso_all_apple`;
```

**Expected Output (Healthy):**
```
latest_date | days_behind
------------|------------
2025-01-19  | 1
```

**SLA Status:**
- `days_behind = 1` → ✅ On time (expected 24-hour delay)
- `days_behind = 2` → ⚠️ Warning (2 days behind)
- `days_behind >= 3` → 🚨 Critical (SLA breach)

---

## Pipeline Components

### Component 1: App Store Connect API

**Description:** Apple's official API for app analytics data

**Monitoring Endpoints:** None (third-party service)

**Health Indicators:**
- Data continues to arrive in BigQuery daily
- No error logs in ingestion pipeline

**Failure Symptoms:**
- No new data for 48+ hours
- BigQuery table `latest_date` not updating

**Owner:** Apple (external dependency)

**Escalation:** Cannot escalate directly; monitor via ingestion pipeline health

---

### Component 2: BigQuery Table (`aso_all_apple`)

**Description:** Raw ASO data storage

**Monitoring Endpoints:**
- BigQuery INFORMATION_SCHEMA queries
- Table metadata API

**Health Indicators:**
```sql
-- Check table exists and has recent data
SELECT
  table_name,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), TIMESTAMP_MILLIS(creation_time), HOUR) AS hours_since_creation,
  row_count,
  size_bytes
FROM `yodel-mobile-app.aso_reports.__TABLES__`
WHERE table_id = 'aso_all_apple';
```

**Expected Output:**
```
table_name    | hours_since_creation | row_count | size_bytes
--------------|----------------------|-----------|------------
aso_all_apple | 720 (30 days)        | 5000000   | 500000000
```

**Failure Symptoms:**
- Table not found (deleted or renamed)
- Zero rows
- Size not growing over time

**Owner:** Data Engineering Team

**Escalation:** #data-engineering Slack channel

---

### Component 3: Edge Function (`bigquery-aso-data`)

**Description:** Supabase Edge Function for BigQuery query execution

**Monitoring Endpoints:**
- `supabase functions logs bigquery-aso-data`
- Edge Function invocation metrics (Supabase dashboard)

**Health Indicators:**
```bash
# Check recent invocations
supabase functions logs bigquery-aso-data --tail 50

# Look for:
# ✅ "Query successful" logs
# ✅ Query duration < 2 seconds
# ❌ "BigQuery authentication failed" errors
# ❌ "RLS policy blocked access" errors
```

**Health Check Query:**
```bash
# Invoke health check endpoint
curl -X POST https://[project-ref].supabase.co/functions/v1/bigquery-aso-data \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test-org-id",
    "date_range": {"start": "2025-01-15", "end": "2025-01-19"}
  }'
```

**Expected Response (Healthy):**
```json
{
  "data": [...],
  "meta": {
    "query_duration_ms": 450,
    "row_count": 42,
    "cache_hit": false
  }
}
```

**Failure Symptoms:**
- 500 errors
- Query duration > 5 seconds
- Zero rows returned for known apps
- "BigQuery credentials not configured" error

**Owner:** Backend Engineering Team

**Escalation:** #backend-eng Slack channel

---

### Component 4: React Query Cache

**Description:** Client-side caching layer (30-minute TTL)

**Monitoring Endpoints:**
- Browser DevTools → Network tab
- React Query DevTools (development)

**Health Indicators:**
```typescript
// Check cache status in component
const { data, isLoading, error, dataUpdatedAt } = useEnterpriseAnalytics(...);

console.log('Cache age:', Date.now() - dataUpdatedAt, 'ms');
console.log('Cache stale:', Date.now() - dataUpdatedAt > 30 * 60 * 1000);
```

**Expected Behavior:**
- First load: Network request (200-600ms)
- Subsequent loads: Cache hit (~5-10ms)
- After 30 minutes: Stale, refetch in background

**Failure Symptoms:**
- Cache always empty (no data persisted)
- Cache never expires (stale data)
- Excessive network requests (cache not working)

**Owner:** Frontend Engineering Team

**Escalation:** #frontend-eng Slack channel

---

### Component 5: Dashboard V2 UI

**Description:** Frontend visualization layer

**Monitoring Endpoints:**
- Browser console errors
- Sentry error tracking (if configured)

**Health Indicators:**
```typescript
// Check for React errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Check for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
```

**Expected Behavior:**
- Dashboard loads within 2 seconds
- Charts render without errors
- Filters update instantly

**Failure Symptoms:**
- Blank dashboard
- "No data available" despite data in BigQuery
- Chart rendering errors
- Infinite loading spinners

**Owner:** Frontend Engineering Team

**Escalation:** #frontend-eng Slack channel

---

## Health Checks

### Health Check 1: Data Freshness

**Frequency:** Hourly (every hour on the hour)

**Check:**
```sql
SELECT
  MAX(date) AS latest_date,
  DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) AS days_behind,
  CASE
    WHEN DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) <= 1 THEN 'Healthy'
    WHEN DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) = 2 THEN 'Warning'
    ELSE 'Critical'
  END AS status
FROM `yodel-mobile-app.aso_reports.aso_all_apple`;
```

**Alert Conditions:**
- `status = 'Warning'` → Slack notification to #data-engineering
- `status = 'Critical'` → PagerDuty alert to on-call engineer

---

### Health Check 2: Row Count Growth

**Frequency:** Daily at 10:00 UTC

**Check:**
```sql
WITH daily_counts AS (
  SELECT
    date,
    COUNT(*) AS row_count
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY date
)
SELECT
  date,
  row_count,
  LAG(row_count) OVER (ORDER BY date) AS previous_row_count,
  SAFE_DIVIDE(
    row_count - LAG(row_count) OVER (ORDER BY date),
    NULLIF(LAG(row_count) OVER (ORDER BY date), 0)
  ) * 100 AS pct_change
FROM daily_counts
ORDER BY date DESC
LIMIT 1;
```

**Alert Conditions:**
- `row_count = 0` → 🚨 Critical (no data ingested)
- `pct_change < -50%` → ⚠️ Warning (significant drop)
- `pct_change > +200%` → ⚠️ Warning (suspicious spike)

---

### Health Check 3: Edge Function Response Time

**Frequency:** Every 15 minutes

**Check:**
```bash
#!/bin/bash
# health-check-edge-function.sh

START_TIME=$(date +%s%N)

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" \
  -X POST https://[project-ref].supabase.co/functions/v1/bigquery-aso-data \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test-org-id",
    "date_range": {"start": "2025-01-15", "end": "2025-01-19"}
  }')

HTTP_CODE=$(echo $RESPONSE | cut -d: -f1)
RESPONSE_TIME=$(echo $RESPONSE | cut -d: -f2)

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: HTTP $HTTP_CODE"
  exit 1
fi

if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
  echo "WARNING: Slow response (${RESPONSE_TIME}s)"
  exit 2
fi

echo "OK: HTTP $HTTP_CODE in ${RESPONSE_TIME}s"
exit 0
```

**Alert Conditions:**
- `HTTP_CODE != 200` → 🚨 Critical (function failing)
- `RESPONSE_TIME > 5.0s` → ⚠️ Warning (slow performance)

---

### Health Check 4: Cache Hit Rate

**Frequency:** Hourly

**Check:**
```bash
# Extract cache hit rate from Edge Function logs
supabase functions logs bigquery-aso-data --tail 100 | \
  grep "cache_hit" | \
  jq -r '.cache_hit' | \
  awk '{sum+=$1; count++} END {print "Cache hit rate:", (sum/count)*100 "%"}'
```

**Expected Output:**
```
Cache hit rate: 65.5%
```

**Alert Conditions:**
- `cache_hit_rate < 30%` → ⚠️ Warning (cache not effective)
- `cache_hit_rate = 0%` → 🚨 Critical (cache broken)

---

## Alerting Rules

### Alert Levels

| Level | Description | Notification | Response Time |
|-------|-------------|--------------|---------------|
| **INFO** | Informational only | Slack #data-monitoring | No action required |
| **WARNING** | Degraded performance | Slack #data-engineering | Investigate within 4 hours |
| **CRITICAL** | Service disruption | PagerDuty + Slack | Immediate response (< 15 min) |

---

### Alert Rule 1: Data Freshness SLA Breach

**Trigger:** `days_behind >= 3`

**Severity:** CRITICAL

**Notification:**
- PagerDuty: On-call data engineer
- Slack: #data-engineering, #incidents

**Message:**
```
🚨 CRITICAL: ASO data freshness SLA breach

Latest data: 2025-01-16
Expected: 2025-01-19
Days behind: 3

Impact: Dashboard V2 showing stale data
Runbook: https://docs.yodel.com/runbooks/data-freshness-breach
```

**Runbook:** See [Troubleshooting Playbook](#troubleshooting-playbook) below

---

### Alert Rule 2: Edge Function Failure Rate > 5%

**Trigger:** `(failed_invocations / total_invocations) > 0.05` in last 15 minutes

**Severity:** CRITICAL

**Notification:**
- PagerDuty: On-call backend engineer
- Slack: #backend-eng, #incidents

**Message:**
```
🚨 CRITICAL: BigQuery Edge Function failure rate exceeded threshold

Failure rate: 12.5% (25 / 200 requests)
Time window: 2025-01-20 10:45 - 11:00 UTC
Common errors:
  - "BigQuery authentication failed" (15 occurrences)
  - "Timeout" (10 occurrences)

Runbook: https://docs.yodel.com/runbooks/edge-function-failures
```

---

### Alert Rule 3: Query Response Time > 5 seconds

**Trigger:** `p95_response_time > 5000ms` in last 15 minutes

**Severity:** WARNING

**Notification:**
- Slack: #backend-eng

**Message:**
```
⚠️ WARNING: BigQuery queries are slow

P95 response time: 6.2 seconds
P50 response time: 3.1 seconds
Time window: 2025-01-20 10:45 - 11:00 UTC

Possible causes:
  - Large date range queries
  - BigQuery quota exhausted
  - Network latency

Runbook: https://docs.yodel.com/runbooks/slow-queries
```

---

### Alert Rule 4: Zero Rows Returned for Known App

**Trigger:** Query for known app returns `row_count = 0`

**Severity:** WARNING

**Notification:**
- Slack: #data-engineering

**Message:**
```
⚠️ WARNING: Zero rows returned for known app

App ID: Mixbook
Date range: 2025-01-15 to 2025-01-19
Organization: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b

Possible causes:
  - App detached from organization
  - RLS policy blocking access
  - Data not ingested for this app

Runbook: https://docs.yodel.com/runbooks/zero-rows
```

---

## Data Quality Checks

### Quality Check 1: Null Value Rate

**Description:** Ensure critical fields are not null

**Frequency:** Daily at 10:00 UTC

**Check:**
```sql
SELECT
  COUNTIF(date IS NULL) AS null_dates,
  COUNTIF(COALESCE(app_id, client) IS NULL) AS null_apps,
  COUNTIF(traffic_source IS NULL) AS null_traffic_sources,
  COUNTIF(impressions IS NULL) AS null_impressions,
  COUNTIF(downloads IS NULL) AS null_downloads,
  COUNT(*) AS total_rows,
  ROUND(COUNTIF(date IS NULL) / COUNT(*) * 100, 2) AS null_date_pct
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY);
```

**Acceptable Thresholds:**
- `null_date_pct = 0%` → ✅ Healthy (dates never null)
- `null_date_pct > 0%` → 🚨 Critical (data corruption)

**Alert:** If any critical field has > 1% null rate, trigger WARNING alert

---

### Quality Check 2: Conversion Rate Sanity Check

**Description:** Ensure conversion rates are within realistic bounds

**Frequency:** Daily at 10:00 UTC

**Check:**
```sql
WITH cvr_check AS (
  SELECT
    COALESCE(app_id, client) AS app_id,
    SAFE_DIVIDE(SUM(downloads), NULLIF(SUM(product_page_views), 0)) * 100 AS cvr
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
  GROUP BY app_id
)
SELECT
  app_id,
  cvr,
  CASE
    WHEN cvr < 1 THEN 'Very Low'
    WHEN cvr BETWEEN 1 AND 5 THEN 'Low'
    WHEN cvr BETWEEN 5 AND 25 THEN 'Normal'
    WHEN cvr BETWEEN 25 AND 50 THEN 'High'
    ELSE 'Suspicious'
  END AS status
FROM cvr_check
WHERE cvr > 50 OR cvr < 0.1
ORDER BY cvr DESC;
```

**Acceptable Range:** 1% - 50%

**Alert Conditions:**
- `cvr > 50%` → ⚠️ Warning (suspiciously high, possible data error)
- `cvr < 0.1%` → ⚠️ Warning (suspiciously low, possible issue)

---

### Quality Check 3: Duplicate Row Detection

**Description:** Ensure no duplicate rows for same date + app + traffic_source

**Frequency:** Daily at 10:00 UTC

**Check:**
```sql
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  COUNT(*) AS duplicate_count
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
WHERE date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
GROUP BY date, app_id, traffic_source
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

**Expected:** Zero duplicates

**Alert:** If `duplicate_count > 0`, trigger WARNING alert

---

### Quality Check 4: Data Volume Anomalies

**Description:** Detect unusual spikes or drops in row count

**Frequency:** Daily at 10:00 UTC

**Check:**
```sql
WITH daily_counts AS (
  SELECT
    date,
    COUNT(*) AS row_count
  FROM `yodel-mobile-app.aso_reports.aso_all_apple`
  WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
  GROUP BY date
),
stats AS (
  SELECT
    AVG(row_count) AS mean,
    STDDEV(row_count) AS stddev
  FROM daily_counts
)
SELECT
  d.date,
  d.row_count,
  s.mean,
  s.stddev,
  (d.row_count - s.mean) / NULLIF(s.stddev, 0) AS z_score,
  CASE
    WHEN ABS((d.row_count - s.mean) / NULLIF(s.stddev, 0)) > 3 THEN '🚨 Anomaly'
    WHEN ABS((d.row_count - s.mean) / NULLIF(s.stddev, 0)) > 2 THEN '⚠️ Warning'
    ELSE 'Normal'
  END AS status
FROM daily_counts d
CROSS JOIN stats s
WHERE d.date = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY);
```

**Alert Conditions:**
- `z_score > 3` → 🚨 Critical (3+ standard deviations from mean)
- `z_score > 2` → ⚠️ Warning (2-3 standard deviations from mean)

---

## Troubleshooting Playbook

### Issue 1: Data Freshness SLA Breach

**Symptoms:**
- Latest data is 3+ days old
- Dashboard showing stale metrics

**Diagnosis Steps:**

1. **Check BigQuery table directly:**
   ```sql
   SELECT MAX(date) AS latest_date
   FROM `yodel-mobile-app.aso_reports.aso_all_apple`;
   ```

2. **Check data ingestion pipeline logs:**
   - Review ingestion job logs in GCP
   - Look for failed jobs or errors

3. **Check App Store Connect API status:**
   - Visit [Apple Developer System Status](https://developer.apple.com/system-status/)
   - Look for App Store Connect API outages

**Resolution:**

If **BigQuery table is up-to-date but Edge Function returns stale data:**
- Clear Edge Function cache
- Restart Edge Function

If **BigQuery table is stale:**
- Check data ingestion pipeline configuration
- Manually trigger ingestion job if automated job failed
- Contact Data Engineering team

**Escalation:**
- If unable to resolve in 1 hour, escalate to Data Engineering Lead

---

### Issue 2: Edge Function 500 Errors

**Symptoms:**
- Dashboard fails to load
- 500 errors in browser console
- Edge Function logs show errors

**Diagnosis Steps:**

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs bigquery-aso-data --tail 50
   ```

2. **Look for common errors:**
   - "BigQuery authentication failed" → Credentials expired
   - "Timeout" → Query too slow or BigQuery quota exceeded
   - "RLS policy blocked access" → User lacks permissions

3. **Test Edge Function directly:**
   ```bash
   curl -X POST https://[project-ref].supabase.co/functions/v1/bigquery-aso-data \
     -H "Authorization: Bearer $TEST_USER_JWT" \
     -H "Content-Type: application/json" \
     -d '{"org_id": "test-org", "date_range": {"start": "2025-01-15", "end": "2025-01-19"}}'
   ```

**Resolution:**

If **BigQuery authentication failed:**
- Rotate BigQuery service account credentials
- Update environment variables in Edge Function

If **Timeout errors:**
- Reduce date range in query
- Check BigQuery quota usage
- Consider adding pagination

If **RLS policy errors:**
- Verify user has org_app_access entries
- Check agency_clients relationships

**Escalation:**
- If unable to resolve in 30 minutes, escalate to Backend Engineering Lead

---

### Issue 3: Slow Query Performance

**Symptoms:**
- Dashboard takes > 5 seconds to load
- Edge Function response time > 5 seconds
- User complaints about slowness

**Diagnosis Steps:**

1. **Check BigQuery query duration:**
   ```sql
   -- In BigQuery console, check query history
   -- Look for queries > 2 seconds
   ```

2. **Check Edge Function logs for query duration:**
   ```bash
   supabase functions logs bigquery-aso-data | grep "query_duration_ms"
   ```

3. **Identify query patterns:**
   - Large date ranges (> 90 days)
   - Many apps (> 20)
   - Full table scans (no date filter)

**Resolution:**

**If large date range:**
- Add pagination to Edge Function
- Return max 90 days of data

**If too many apps:**
- Limit app selection to 20 apps max
- Show warning in UI

**If cache not working:**
- Verify cache implementation
- Check cache hit rate in logs

**Escalation:**
- If unable to resolve in 2 hours, escalate to Backend Engineering Lead

---

## Metrics & Dashboards

### Recommended Monitoring Dashboard

**Tool:** Grafana, Datadog, or similar

**Panels:**

1. **Data Freshness**
   - Metric: `days_behind`
   - Visualization: Single stat with threshold colors
   - Thresholds: Green (≤1), Yellow (2), Red (≥3)

2. **Edge Function Invocations**
   - Metric: `invocations_per_minute`
   - Visualization: Time series line chart
   - Alert: If drops to 0 for 15+ minutes

3. **Edge Function Error Rate**
   - Metric: `(errors / total_requests) * 100`
   - Visualization: Time series line chart
   - Alert: If exceeds 5%

4. **Query Response Time**
   - Metrics: `p50_response_time`, `p95_response_time`, `p99_response_time`
   - Visualization: Time series line chart with multiple lines
   - Alert: If p95 > 5 seconds

5. **Cache Hit Rate**
   - Metric: `(cache_hits / total_requests) * 100`
   - Visualization: Time series line chart
   - Alert: If drops below 30%

6. **BigQuery Costs**
   - Metric: `bigquery_cost_usd_per_day`
   - Visualization: Bar chart (daily)
   - Alert: If exceeds $50/day

---

### Key Performance Indicators (KPIs)

| KPI | Target | Warning | Critical |
|-----|--------|---------|----------|
| **Data Freshness** | ≤ 1 day behind | 2 days behind | ≥ 3 days behind |
| **Edge Function Uptime** | 99.9% | 99.5% | < 99% |
| **Query Response Time (p95)** | < 2 seconds | 2-5 seconds | > 5 seconds |
| **Cache Hit Rate** | > 60% | 30-60% | < 30% |
| **SLA Compliance** | 95%+ days on time | 90-95% | < 90% |
| **Daily BigQuery Cost** | < $5 | $5-$20 | > $20 |

---

## Related Documentation

- **Data Dictionary:** [docs/02-architecture/data-dictionary.md](../../02-architecture/data-dictionary.md)
- **BigQuery Query Examples:** [docs/04-api-reference/bigquery-query-examples.md](../../04-api-reference/bigquery-query-examples.md)
- **Data Lineage:** [docs/02-architecture/data-lineage.md](../../02-architecture/data-lineage.md) (P2.4 - to be created)
- **Data Pipeline Audit:** [docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md](../../03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md)

---

**Document Version:** 1.0
**Last Updated:** January 20, 2025
**Maintained By:** Data Engineering Team, DevOps Team
