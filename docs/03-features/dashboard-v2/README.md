---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Dashboard V2 documentation overview
Audience: Developers, Data Engineers, Product Managers
---

# Dashboard V2 Documentation

BigQuery-powered analytics dashboard (PRODUCTION).

## Overview

Dashboard V2 is the primary analytics interface showing ASO metrics from BigQuery data.

**Status:** ✅ PRODUCTION
**Data Source:** BigQuery (`yodel-mobile-app.aso_reports.aso_all_apple`)
**Features:**
- KPI trend charts (Search, Browse)
- Traffic source comparison
- Conversion funnel analysis
- Delta calculations (period-over-period)
- Agency-aware multi-tenant architecture

## Core Documentation

### ⭐ Canonical References

1. **[DATA_PIPELINE_AUDIT.md](./DATA_PIPELINE_AUDIT.md)** - Complete pipeline audit
   - **Lines:** 1,269
   - **Last Updated:** Jan 20, 2025
   - **Accuracy:** 9/10
   - **Use For:** Understanding complete data flow from BigQuery → UI

### BigQuery Documentation

2. **[BIGQUERY_SCHEMA_AND_METRICS_MAP.md](./BIGQUERY_SCHEMA_AND_METRICS_MAP.md)** - Schema reference
   - **Lines:** 767
   - **Last Updated:** Jan 20, 2025
   - **Use For:** Understanding BigQuery table structure, available metrics

3. **[BIGQUERY_QUICK_REFERENCE.md](./BIGQUERY_QUICK_REFERENCE.md)** - Quick reference
   - **Last Updated:** Jan 20, 2025
   - **Use For:** Quick data flow overview, troubleshooting guide

4. **[BIGQUERY_RESEARCH_INDEX.md](./BIGQUERY_RESEARCH_INDEX.md)** - Documentation index
   - **Use For:** Navigation to all BigQuery documentation

5. **[bigquery-integration.md](./bigquery-integration.md)** - Integration guide
   - **Use For:** BigQuery setup, authentication, query patterns

### Component Documentation

6. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Dashboard V2 quick reference
   - **Use For:** Component hierarchy, React Query cache keys, state management

## Quick Start

**Understand Dashboard V2 in 30 minutes:**
1. Read DATA_PIPELINE_AUDIT.md Executive Summary (5 min)
2. Skim BIGQUERY_SCHEMA_AND_METRICS_MAP.md (10 min)
3. Review QUICK_REFERENCE.md component hierarchy (5 min)
4. Check BIGQUERY_QUICK_REFERENCE.md data flow diagram (10 min)

## Data Flow Summary

```
BigQuery (yodel-mobile-app.aso_reports.aso_all_apple)
  ↓
Edge Function (/functions/v1/bigquery-aso-data)
  ↓
React Hook (useBigQueryData.ts)
  ↓
Dashboard Component (ReportingDashboardV2.tsx)
```

**See:** [DATA_PIPELINE_AUDIT.md](./DATA_PIPELINE_AUDIT.md) for complete data flow

## Available Metrics

**Core Metrics (from BigQuery):**
- Impressions
- Downloads
- Product Page Views (PPV)
- Conversion Rates (Impressions CVR, PPV CVR)
- Traffic Source Breakdown
- Period-over-period Deltas

**Traffic Sources:**
- App Store Search
- Web Referrer
- App Referrer
- Apple Search Ads
- App Store Browse
- Other

**See:** [BIGQUERY_SCHEMA_AND_METRICS_MAP.md](./BIGQUERY_SCHEMA_AND_METRICS_MAP.md) for complete metric definitions

## Related Documentation

- **Architecture:** [ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md)
- **BigQuery Setup:** [bigquery-integration.md](./bigquery-integration.md)
- **API Reference:** [docs/04-api-reference/](../../04-api-reference/)
- **Workflows:** [docs/05-workflows/](../../05-workflows/)

## Target Audience

- **Developers** - Implementation details, component structure
- **Data Engineers** - Pipeline understanding, query optimization
- **Product Managers** - Feature capabilities, available metrics
