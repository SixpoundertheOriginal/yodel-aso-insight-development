# BigQuery Integration Guide

## Overview

The ASO platform integrates with BigQuery to provide real-time analytics data for mobile applications. This integration enables advanced metrics, reporting, and AI-powered insights.

## BigQuery Setup

### Data Source
- **Project**: `aso-reporting-1`
- **Dataset**: `client_reports`
- **Table**: `aso_all_apple`

### Schema Structure
```sql
-- Key fields used by the platform
app_id: STRING          -- Application identifier
client: STRING          -- Organization/client name
impressions: INTEGER    -- App store impressions
downloads: INTEGER      -- App downloads
conversion_rate: FLOAT  -- Download/impression ratio
date: DATE             -- Metric date
```

## Authentication & Access

### Service Account Setup
1. Create BigQuery service account in Google Cloud Console
2. Grant necessary permissions:
   - `BigQuery Data Viewer`
   - `BigQuery Job User`
3. Download service account key JSON
4. Configure in Supabase secrets as `BIGQUERY_SERVICE_ACCOUNT_KEY`

### Supabase Configuration
```bash
# Set BigQuery credentials
supabase secrets set BIGQUERY_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

## Data Access Patterns

### Organization Scoping
Data is filtered by organization context:

```typescript
// BigQuery query with organization filtering
const query = `
  SELECT app_id, impressions, downloads, date
  FROM \`aso-reporting-1.client_reports.aso_all_apple\`
  WHERE client IN (${organizationApps.map(app => `'${app}'`).join(',')})
    AND date BETWEEN @startDate AND @endDate
`;
```

### App Discovery Query
```sql
SELECT DISTINCT 
  app_id,
  client,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM `aso-reporting-1.client_reports.aso_all_apple`
GROUP BY app_id, client
ORDER BY record_count DESC
```

## Edge Function Integration

### BigQuery Data Function
`/functions/bigquery-aso-data/index.ts` handles analytics requests:

```typescript
// Request format
{
  organizationId: "uuid",
  selectedApps: ["app1", "app2"],
  dateRange: {
    from: "2024-01-01",
    to: "2024-01-31"
  },
  metrics: ["impressions", "downloads"]
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "kpi_summary": {
      "total_impressions": 1000000,
      "total_downloads": 50000,
      "avg_conversion_rate": 0.05
    },
    "time_series": [
      {
        "date": "2024-01-01",
        "impressions": 10000,
        "downloads": 500
      }
    ]
  }
}
```

## Data Processing Pipeline

### Real-time Sync
1. **Data Ingestion**: BigQuery receives raw app store data
2. **App Discovery**: Platform discovers new apps via scheduled function
3. **Organization Mapping**: Apps mapped to organizations in `org_app_access`
4. **Analytics Access**: Dashboard queries filtered data by organization

### Caching Strategy
- **Query Results**: Cached for 5 minutes to reduce BigQuery costs
- **App Metadata**: Cached until app discovery runs again
- **Organization Mappings**: Cached in React Context

## Performance Optimization

### Query Optimization
- Use date partitioning for time-based queries
- Implement query result caching
- Batch multiple metric requests
- Use parameterized queries to prevent injection

### Cost Management
- Set query job timeouts
- Implement query complexity limits
- Monitor BigQuery usage and costs
- Use streaming for real-time updates only when necessary

## Super Admin Considerations

### Organization Context Requirement
Super admins must select an organization before BigQuery data will load:

```typescript
// Check organization context
if (!selectedOrganizationId) {
  return { error: "Organization context required for data access" };
}
```

### Cross-Organization Access
Super admins can switch between organizations to view different app portfolios without needing separate authentication.

## Troubleshooting

### Common Issues
1. **Query Timeout**: Optimize date ranges and add indexes
2. **No Data Returned**: Check organization context and app mappings
3. **Authentication Errors**: Verify service account permissions
4. **Rate Limits**: Implement exponential backoff

### Debug Queries
```sql
-- Check data availability
SELECT client, COUNT(*) as apps, MAX(date) as latest_data
FROM `aso-reporting-1.client_reports.aso_all_apple`
GROUP BY client;

-- Verify app mappings
SELECT app_id, COUNT(*) as records
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE client = 'Client_One'
GROUP BY app_id;
```

## Security Considerations

### Data Access Control
- Service account has minimal required permissions
- Queries are parameterized to prevent injection
- Organization-based data isolation enforced
- Audit logging for all BigQuery access

### Compliance
- Data residency considerations for international clients
- GDPR compliance for user data handling
- Retention policies aligned with platform requirements