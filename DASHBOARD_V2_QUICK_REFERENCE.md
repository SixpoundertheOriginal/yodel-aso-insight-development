# Dashboard V2: Quick Reference Guide

## Component Hierarchy

```
ReportingDashboardV2 (Main Page)
├── Filter Bar
│   ├── DateRangePicker
│   ├── CompactAppSelector
│   └── CompactTrafficSourceSelector
├── KPI Cards Row
│   ├── AsoMetricCard (Search)
│   └── AsoMetricCard (Browse)
├── Total Cards Row
│   ├── TotalMetricCard (Impressions)
│   └── TotalMetricCard (Downloads)
└── Charts Section
    ├── KpiTrendChart
    ├── TrafficSourceComparisonChart
    └── ConversionFunnelChart
```

## Data Flow

**User Filters → State Update → useEnterpriseAnalytics Refetch → Edge Function → BigQuery**

1. User selects date/app/source
2. React state updates
3. Query key changes, React Query refetches
4. Edge function invoked with validated org context
5. BigQuery returns rows (main query + dimensions query)
6. Client-side filtering applied (traffic sources only)
7. Components render with processed data

## File Locations

| Component | Path |
|-----------|------|
| Main Page | `src/pages/ReportingDashboardV2.tsx` |
| Metric Cards | `src/components/AsoMetricCard.tsx`, `TotalMetricCard.tsx` |
| Charts | `src/components/analytics/{KpiTrendChart,TrafficSourceComparisonChart,ConversionFunnelChart}.tsx` |
| Filters | `src/components/{DateRangePicker,CompactAppSelector,CompactTrafficSourceSelector}.tsx` |
| Data Hook | `src/hooks/useEnterpriseAnalytics.ts` |
| Edge Function | `supabase/functions/bigquery-aso-data/index.ts` |
| Types | `src/types/aso.ts` |
| AI Features | `src/components/DashboardAiInsights/` + `src/hooks/useEnhancedAsoInsights.ts` |

## Key Props & Interfaces

### useEnterpriseAnalytics
```typescript
const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
  organizationId: string;
  dateRange: { start: string; end: string };
  trafficSources?: string[];
  appIds?: string[];
});
```

### Response Data
```typescript
{
  rawData: BigQueryDataPoint[];
  processedData: {
    summary: { impressions, downloads, product_page_views, cvr }
    timeseries: TimeSeriesPoint[]
    traffic_sources: TrafficSource[]
  }
  meta: {
    available_traffic_sources: string[]
    all_accessible_app_ids: string[]
    raw_rows: number
    query_duration_ms: number
  }
}
```

## Caching Strategy

- **Cache Key:** `['enterprise-analytics', orgId, dateStart, dateEnd, appIds]`
- **Stale Time:** 5 minutes
- **GC Time:** 10 minutes
- **Traffic sources:** NOT cached (client-side filtering)

## Performance

| Operation | Time |
|-----------|------|
| Edge Function Auth + Org Check | 50-100ms |
| BigQuery Main Query | 100-300ms |
| Dimensions Query | 50-200ms |
| Client-side Filter | <50ms |
| **Total Dashboard Load** | **500-1000ms** |

## Security & Access Control

1. **User Authentication:** Supabase auth required
2. **Role Validation:** Checks is_super_admin RPC + user_roles table
3. **Org Scope:** Users can only access their own organization
4. **Agency Support:** Managers can access managed client orgs
5. **App Access:** RLS on org_app_access table enforces allowed apps
6. **Audit Logging:** All data access logged to audit_events table

## Known Limitations

- No trend comparison (vs previous period)
- No delta calculations in MetricsData
- No anomaly detection
- No forecasting
- AI insights disabled by default (feature flag)
- Filter state not persisted across sessions
- Traffic source filtering client-side only (can't optimize backend)

## Feature Flags

- `isAIInsightsEnabled(isSuperAdmin)` - Controls AI insights generation
- Default: Disabled for regular users, available for super admins

## Common Tasks

### Add a New Chart
1. Create component in `src/components/analytics/`
2. Accept `data: BigQueryDataPoint[]` and `isLoading?: boolean`
3. Import and add to dashboard template
4. Wire up data from `useEnterpriseAnalytics.data.rawData`

### Add a New Filter
1. Add state to ReportingDashboardV2
2. Create component in `src/components/`
3. Pass available options from `useEnterpriseAnalytics` metadata
4. Update edge function if server-side filtering needed

### Change Data Source
1. Modify BigQuery query in `bigquery-aso-data/index.ts`
2. Update response types in `useEnterpriseAnalytics.ts`
3. Update chart components to use new fields
4. Adjust metric calculations if needed

### Deploy Changes
1. Test locally with real data
2. Push to main branch
3. Edge function auto-deployed via Supabase
4. Components auto-deployed via Vercel/deployment pipeline
5. Clear browser cache if needed (stale data cached 5 min)

## Debugging Tips

**Check Console Logs:**
```
[ENTERPRISE-ANALYTICS] - Hook logs
[bigquery-aso-data] - Edge function logs (server-side)
[DASHBOARD-V2] - Component logs
```

**Trace Data Flow:**
1. Open DevTools → Network tab
2. Filter for "bigquery-aso-data" function call
3. Check request body (org_id, date_range, app_ids)
4. Check response (data array, meta, available sources)
5. Open React DevTools → useEnterpriseAnalytics hook
6. Check data, isLoading, error state

**Performance Issues:**
- Dashboard slow? Check if calendar picker with 1000+ apps
- Charts lag? Check if data > 1000 rows
- Filters slow? Check if BigQuery query taking >1s
- UI stale? Clear React Query cache: `queryClient.invalidateQueries(['enterprise-analytics'])`

---

## Related Documentation

- Main Audit Report: `DASHBOARD_V2_AUDIT.md`
- BigQuery Schema: Ask data team for aso_all_apple table docs
- Supabase Setup: Check .env.local for BIGQUERY_CREDENTIALS
- Feature Flags: Check `src/constants/features.ts`

