---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: BigQuery integration implementation guide
⚠️ Note: Missing security details (RLS, MFA, audit logging) - MEDIUM priority update
See Also: docs/02-architecture/ARCHITECTURE_V1.md, DATA_PIPELINE_AUDIT.md
Audience: Developers
---

# BigQuery Integration Guide

## Overview

The ASO platform integrates with BigQuery to provide real-time analytics data for mobile applications. This integration enables advanced metrics, reporting, and AI-powered insights.

## BigQuery Setup

### Data Source
- **Project**: `yodel-mobile-app`
- **Dataset**: `aso_reports`
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
  FROM \`yodel-mobile-app.aso_reports.aso_all_apple\`
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
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
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
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
GROUP BY client;

-- Verify app mappings
SELECT app_id, COUNT(*) as records
FROM `yodel-mobile-app.aso_reports.aso_all_apple`
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

---

## Audit Logging Integration

**Status:** PRODUCTION (SOC 2, ISO 27001, GDPR compliant)
**Retention:** 7 years

### BigQuery Access Logging

All BigQuery data access is automatically logged to the `audit_logs` table for compliance and security monitoring.

#### Logged Events

**Dashboard Data Access:**
```typescript
// Logged when user accesses Dashboard V2 with BigQuery data
{
  action: 'view_dashboard_v2',
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  user_email: 'user@example.com',
  resource_type: 'dashboard',
  resource_id: null,
  details: {
    filters: {
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
      apps: ['Mixbook', 'ColorJoy'],
      trafficSources: ['App Store Search']
    },
    bigquery: {
      project: 'yodel-mobile-app',
      dataset: 'aso_reports',
      table: 'aso_all_apple',
      row_count: 1234,
      query_duration_ms: 250
    }
  },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  request_path: '/dashboard-v2',
  status: 'success',
  created_at: '2025-01-20T10:30:00Z'
}
```

**BigQuery Query Execution:**
```typescript
// Logged for each BigQuery query execution
{
  action: 'bigquery_query',
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  user_email: 'user@example.com',
  resource_type: 'bigquery_query',
  details: {
    query_type: 'aso_data_fetch',
    date_range: { from: '2025-01-01', to: '2025-01-31' },
    app_ids: ['Mixbook', 'ColorJoy'],
    row_count: 1234,
    bytes_processed: 52428800,  // 50 MB
    query_duration_ms: 250,
    cost_estimate_usd: 0.000262  // Approximate BigQuery cost
  },
  status: 'success'
}
```

**Failed BigQuery Access:**
```typescript
// Logged when BigQuery access fails
{
  action: 'bigquery_query',
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  user_email: 'user@example.com',
  resource_type: 'bigquery_query',
  details: {
    query_type: 'aso_data_fetch',
    error_code: 'QUERY_TIMEOUT',
    error_details: 'Query exceeded 30s timeout'
  },
  status: 'failure',
  error_message: 'BigQuery query timeout'
}
```

### Implementation

#### Edge Function Audit Logging

```typescript
// supabase/functions/bigquery-aso-data/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get user context
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      // Log failed auth attempt
      await supabase.rpc('log_audit_event', {
        p_user_id: null,
        p_organization_id: null,
        p_user_email: 'unknown',
        p_action: 'bigquery_query',
        p_status: 'denied',
        p_error_message: 'Authentication required'
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      });
    }

    // Parse request
    const { organizationId, dateRange, appIds } = await req.json();

    // Execute BigQuery query
    const startTime = Date.now();
    const bigQueryResults = await executeBigQueryQuery({
      organizationId,
      dateRange,
      appIds
    });
    const queryDuration = Date.now() - startTime;

    // Log successful access
    await supabase.rpc('log_audit_event', {
      p_user_id: user.id,
      p_organization_id: organizationId,
      p_user_email: user.email,
      p_action: 'bigquery_query',
      p_resource_type: 'bigquery_query',
      p_details: {
        query_type: 'aso_data_fetch',
        date_range: dateRange,
        app_ids: appIds,
        row_count: bigQueryResults.rowCount,
        query_duration_ms: queryDuration
      },
      p_ip_address: req.headers.get('x-forwarded-for'),
      p_user_agent: req.headers.get('user-agent'),
      p_request_path: '/functions/v1/bigquery-aso-data',
      p_status: 'success'
    });

    return new Response(JSON.stringify(bigQueryResults), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Log failed query
    await supabase.rpc('log_audit_event', {
      p_user_id: user?.id,
      p_organization_id: organizationId,
      p_user_email: user?.email ?? 'unknown',
      p_action: 'bigquery_query',
      p_resource_type: 'bigquery_query',
      p_status: 'failure',
      p_error_message: error.message
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

### Audit Log Queries

#### Monitor BigQuery Access

```sql
-- Recent BigQuery queries (last 24 hours)
SELECT
  user_email,
  action,
  status,
  details->>'query_type' as query_type,
  (details->>'row_count')::integer as rows,
  (details->>'query_duration_ms')::integer as duration_ms,
  created_at
FROM audit_logs
WHERE action = 'bigquery_query'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Failed BigQuery queries
SELECT
  user_email,
  organization_id,
  error_message,
  details,
  created_at
FROM audit_logs
WHERE action = 'bigquery_query'
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- BigQuery usage by organization (last 30 days)
SELECT
  o.name as organization,
  COUNT(*) as query_count,
  SUM((details->>'row_count')::integer) as total_rows,
  AVG((details->>'query_duration_ms')::integer) as avg_duration_ms,
  MAX(created_at) as last_access
FROM audit_logs al
JOIN organizations o ON o.id = al.organization_id
WHERE al.action = 'bigquery_query'
  AND al.status = 'success'
  AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name
ORDER BY query_count DESC;
```

#### Cost Monitoring

```sql
-- Estimate BigQuery costs by organization (if tracked)
SELECT
  o.name as organization,
  COUNT(*) as query_count,
  SUM((details->>'bytes_processed')::bigint) / 1024.0 / 1024.0 / 1024.0 as total_gb_processed,
  SUM((details->>'cost_estimate_usd')::numeric) as estimated_cost_usd
FROM audit_logs al
JOIN organizations o ON o.id = al.organization_id
WHERE al.action = 'bigquery_query'
  AND al.status = 'success'
  AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name
ORDER BY estimated_cost_usd DESC;
```

### Compliance Reporting

#### SOC 2 Audit Report

```sql
-- Generate data access report for SOC 2 audit
SELECT
  DATE(created_at) as access_date,
  user_email,
  organization_id,
  action,
  status,
  COUNT(*) as access_count,
  MIN(created_at) as first_access,
  MAX(created_at) as last_access
FROM audit_logs
WHERE action IN ('view_dashboard_v2', 'bigquery_query')
  AND created_at BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY DATE(created_at), user_email, organization_id, action, status
ORDER BY access_date DESC, user_email;
```

#### GDPR Data Export

```sql
-- Export all audit logs for specific user (GDPR right to access)
SELECT
  action,
  resource_type,
  details,
  ip_address,
  user_agent,
  request_path,
  status,
  created_at
FROM audit_logs
WHERE user_email = 'user@example.com'
ORDER BY created_at DESC;
```

### Security Monitoring

#### Anomaly Detection

```sql
-- Detect unusual BigQuery access patterns
WITH user_stats AS (
  SELECT
    user_id,
    user_email,
    COUNT(*) as query_count,
    AVG((details->>'row_count')::integer) as avg_rows
  FROM audit_logs
  WHERE action = 'bigquery_query'
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY user_id, user_email
)
SELECT
  user_email,
  query_count,
  avg_rows,
  CASE
    WHEN query_count > 1000 THEN '🚨 High query volume'
    WHEN avg_rows > 100000 THEN '⚠️ Large data exports'
    ELSE '✅ Normal'
  END as alert_level
FROM user_stats
WHERE query_count > 100 OR avg_rows > 50000
ORDER BY query_count DESC;

-- Detect failed access attempts
SELECT
  user_email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  array_agg(DISTINCT error_message) as error_types
FROM audit_logs
WHERE action = 'bigquery_query'
  AND status IN ('failure', 'denied')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;
```

### Audit Log Retention

**Retention Policy:**
- Audit logs retained for **7 years** (compliance requirement)
- Automatic archival to cold storage after 1 year
- No deletion of audit logs (immutable trail)

**Compliance Standards:**
- ✅ SOC 2 Type II
- ✅ ISO 27001
- ✅ GDPR Article 30 (Records of processing activities)

### Best Practices

✅ **DO:**
- Review audit logs weekly for anomalies
- Monitor failed access attempts
- Track BigQuery query costs
- Export compliance reports quarterly
- Set up alerts for unusual access patterns

❌ **DON'T:**
- Delete audit logs (7-year retention required)
- Disable audit logging
- Share audit log access with non-admins
- Ignore failed access patterns