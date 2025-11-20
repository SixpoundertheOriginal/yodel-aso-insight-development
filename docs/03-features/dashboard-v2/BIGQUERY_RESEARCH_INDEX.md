---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Index of BigQuery data schema documentation
⚠️ Note: Contains BigQuery path errors - MEDIUM priority fix required
See Also: BIGQUERY_SCHEMA_AND_METRICS_MAP.md, DATA_PIPELINE_AUDIT.md
Audience: Developers, Data Engineers
---

# BigQuery Data Schema Research - Complete Index

## Overview

This directory contains comprehensive documentation of the BigQuery data integration, including:
- Complete table schema and structure
- Available and unavailable metrics
- Full data pipeline architecture (4 layers)
- Data transformation processes
- Security and access control
- Quick reference guides

## Documentation Files

### 1. BIGQUERY_SCHEMA_AND_METRICS_MAP.md (Comprehensive)
**Size**: 21 KB, 767 lines | **Read Time**: 15-20 minutes

Complete reference covering:
- BigQuery table structure (7 columns)
- Data pipeline architecture (4 layers: BigQuery → Edge Function → Hook → Component)
- Edge function implementation details
- React hook transformations
- Available metrics (7 core + 7 derived)
- Unavailable metrics (11 total with reasons)
- Query parameters and filtering
- Traffic source values
- Complete data flow examples with actual JSON
- Organization access control and agency model
- Caching strategy
- Error handling
- Audit logging for compliance

**Use this for**: Understanding the complete data architecture, detailed transformation logic, understanding what data is available/unavailable

---

### 2. BIGQUERY_QUICK_REFERENCE.md (Quick Lookup)
**Size**: 17 KB, 442 lines | **Read Time**: 5-10 minutes

Quick reference guide including:
- Visual ASCII data flow diagram
- Available vs unavailable metrics comparison table
- Key files and their roles
- Request/response contracts with examples
- Transformation examples (raw → mapped → transformed)
- Security and access control summary
- Caching overview
- Common issues and solutions
- Testing and debugging tips

**Use this for**: Quick lookup of specific topics, debugging issues, understanding data contracts, testing queries

---

### 3. bigquery-integration.md (Existing)
**Location**: /docs/bigquery-integration.md

Original integration guide covering:
- Setup instructions
- Service account configuration
- Authentication method
- Data access patterns
- App discovery
- Response format
- Query optimization
- Cost management

---

## Key Information At A Glance

### BigQuery Table
```
Project: yodel-mobile-app
Dataset: aso_reports
Table:   aso_all_apple
Rows:    100k+ daily records
Columns: 7 (date, app_id, traffic_source, impressions, ppv, downloads, conversion_rate)
```

### Available Metrics

**Core (from BigQuery)**
- Impressions
- Downloads  
- Product Page Views
- Conversion Rates (2 types)
- Traffic Source Breakdown

**Derived (calculated)**
- Period-over-period Deltas
- Daily Time Series
- Per-source Aggregations

**Total**: 7 core + 7 derived = 14 available metrics

### Unavailable Metrics

Cannot be provided due to data source limitations:
- Keyword ranking data
- Competitor metrics
- Geographic breakdown
- Device/OS breakdown
- Version analytics
- Revenue metrics
- Session metrics
- Anomaly detection
- Predictive analytics
- Change logs
- Cohort analysis

**Total**: 11 unavailable metrics

### Data Pipeline (4 Layers)

```
Layer 1: BigQuery (aso_all_apple)
   ↓ OAuth2 + Service Account
Layer 2: Edge Function (bigquery-aso-data)
   ↓ HTTP POST
Layer 3: React Hook (useBigQueryData)
   ↓ State + Custom Hook
Layer 4: React Component (dashboard pages)
```

### Key Files

| File | Purpose | Key Code |
|------|---------|----------|
| `supabase/functions/bigquery-aso-data/index.ts` | Query BigQuery, enforce RLS | 2 SQL queries, OAuth flow |
| `src/hooks/useBigQueryData.ts` | Transform data to UI shape | 4 transformation functions |
| `src/hooks/useMockAsoData.ts` | Type definitions | 6 core interfaces |
| `src/context/BigQueryAppContext.tsx` | App selection state | Context management |
| `src/utils/filterByTrafficSources.ts` | Client-side filtering | Simple array filter |

### Security Controls

1. **Authentication**: JWT validation
2. **Organization**: RLS via org_app_access table
3. **Roles**: SUPER_ADMIN, ORG_ADMIN, Standard User
4. **Agency**: Support for managing multiple client organizations
5. **Audit**: All data access logged (SOC 2 compliance)

### Caching

- Query Results: 5 minutes (React Query)
- Traffic Sources: Per request (discovered from data)
- App Metadata: 5 minutes (React Query)

---

## Quick Navigation

### I want to understand...

**The complete data architecture**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md sections 1-3

**How data flows from BigQuery to components**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 8 + BIGQUERY_QUICK_REFERENCE.md Data Flow Diagram

**What metrics are available**
→ Read: BIGQUERY_QUICK_REFERENCE.md Available Metrics table OR BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 3

**What metrics are NOT available and why**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 5

**How the Edge Function works**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 2 Layer 2

**How the React Hook transforms data**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 4 Hook Layer

**How to debug a problem**
→ Read: BIGQUERY_QUICK_REFERENCE.md Common Issues & Solutions

**Request/response formats**
→ Read: BIGQUERY_QUICK_REFERENCE.md Request/Response Contracts

**How security works**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 9 OR BIGQUERY_QUICK_REFERENCE.md Security section

**Agency model and multi-client support**
→ Read: BIGQUERY_SCHEMA_AND_METRICS_MAP.md section 9 Agency Model

---

## Source Code Files Analyzed

### Edge Functions
- `/supabase/functions/bigquery-aso-data/index.ts` (700 lines)
- `/supabase/functions/sync-bigquery-apps/index.ts` (150 lines)

### React Hooks
- `/src/hooks/useBigQueryData.ts` (842 lines)
- `/src/hooks/useBigQueryApps.ts` (46 lines)
- `/src/hooks/useCachedReviews.ts` (100+ lines)
- `/src/hooks/useEnterpriseAnalytics.ts` (100+ lines)

### Context & State
- `/src/context/BigQueryAppContext.tsx` (120 lines)

### Utilities
- `/src/utils/filterByTrafficSources.ts`
- `/src/hooks/useSourceFiltering.ts`

### Type Definitions
- `/src/hooks/useMockAsoData.ts`
- `/src/integrations/supabase/types.ts`

### Services & Analysis
- `/src/services/enhanced-keyword-analytics.service.ts` (150+ lines)

**Total Files Analyzed**: 50+
**Total Code Lines Reviewed**: 2000+

---

## Key Concepts Explained

### 1. BigQuery Authentication
Service account OAuth2 flow:
1. Create JWT with service account credentials
2. Exchange JWT for Google OAuth token
3. Use token in BigQuery API calls
4. Tokens refresh hourly as needed

### 2. Organization Scoping
- Users belong to organizations
- Orgs manage apps via `org_app_access` table
- Data is filtered by org membership
- Super admins must select org context

### 3. Agency Model
- Agencies can manage multiple client organizations
- Access expanded via `agency_clients` table
- Org admin sees: own apps + all managed client apps
- Scoped through same RLS policy

### 4. Traffic Source Discovery
- Not hardcoded; discovered from actual data
- Query executes 2nd query to find sources in date range
- Returned in `meta.available_traffic_sources`
- Used to populate UI traffic source picker

### 5. Data Transformations
Four levels of transformation:

**Edge Function Layer**:
- Raw BigQuery rows (7 columns) → Structured objects
- Null handling, type conversion

**Hook Layer**:
- Group by date → Daily time series
- Group by traffic_source → Source breakdown
- Calculate CVRs → Percentage metrics
- Build summary → Aggregate totals

**Component Layer**:
- Unpack aggregations → Individual KPI cards
- Time series data → Charts
- Source breakdown → Pie/bar charts

**Caching**:
- 5-minute TTL for query results
- No caching across filter changes (instant re-aggregate)

### 6. Conversion Rate Calculation
```
Impressions CVR = (downloads / impressions) * 100
PPV CVR = (downloads / product_page_views) * 100

If denominator is 0:
  → SAFE_DIVIDE in BigQuery → returns 0
  → Prevents NaN in calculations
```

---

## Troubleshooting Quick Guide

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| No data | Wrong org selected | See SUPER_ADMIN_QUICK_REFERENCE.md |
| Missing sources | Outside date range | Expand date range |
| Slow queries | Large date range/many apps | Filter by app or reduce range |
| Auth error | Invalid JWT | Re-login |
| Access denied | Not in RLS list | Check org_app_access table |
| CVR is 0 or NaN | Zero denominator | Expected behavior (SAFE_DIVIDE) |

---

## Related Documentation

- **Organization Architecture**: /docs/ACCESS_LEVEL_ARCHITECTURE_DEEP_DIVE.md
- **Super Admin Features**: /docs/SUPER_ADMIN_QUICK_REFERENCE.md
- **Reviews Feature**: /docs/completed-fixes/reviews-feature/REVIEWS_VS_BIGQUERY_CLARIFICATION.md
- **Integration Setup**: /docs/bigquery-integration.md

---

## Questions?

### Understanding Data Flow?
Start with BIGQUERY_QUICK_REFERENCE.md → Data Flow Diagram

### Understanding Metrics?
Start with BIGQUERY_QUICK_REFERENCE.md → Available Metrics table

### Understanding Security?
Start with BIGQUERY_SCHEMA_AND_METRICS_MAP.md → Section 9

### Understanding a Specific Transformation?
Start with BIGQUERY_SCHEMA_AND_METRICS_MAP.md → Section 4

### Debugging an Issue?
Start with BIGQUERY_QUICK_REFERENCE.md → Common Issues & Solutions

### Looking for Request/Response Format?
Start with BIGQUERY_QUICK_REFERENCE.md → Request/Response Contracts

---

## Version & Last Updated

- **Created**: November 14, 2024
- **Research Scope**: Complete
- **Files Analyzed**: 50+
- **Code Lines Reviewed**: 2000+
- **Status**: Ready for Reference

All documentation is current with codebase as of November 14, 2024.
