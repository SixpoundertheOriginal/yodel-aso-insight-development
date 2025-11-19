# App Discovery System

## Overview

The App Discovery system automatically discovers and maps mobile applications from BigQuery to organizations within the ASO platform. It enables multi-tenant access to app analytics data with proper organization scoping.

## Architecture

### Data Flow
```
BigQuery (aso_all_apple) → app-discovery function → org_app_access table → Dashboard
```

### Key Components
1. **BigQuery Source**: `aso-reporting-1.client_reports.aso_all_apple`
2. **Edge Function**: `/functions/app-discovery/index.ts`
3. **Mapping Table**: `org_app_access` (organization ↔ app relationships)
4. **Dashboard Integration**: App selector and analytics filtering

## Data Model

### BigQuery Structure
- `client`: Organization identifier (e.g., "Client_One", "Client_Two")
- `app_id`: Individual application identifier
- One client can have multiple apps

### Database Mapping
```sql
CREATE TABLE org_app_access (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  organization_id UUID NOT NULL,
  attached_at TIMESTAMPTZ DEFAULT NOW(),
  detached_at TIMESTAMPTZ,
  UNIQUE(app_id, organization_id)
);
```

## Authentication

The app-discovery function requires **service role authentication**:

```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-discovery \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Important**: User JWT tokens will result in 401 Unauthorized errors.

## Super Admin Workflow

Super admins must select an organization context before app analytics will function:

1. **Organization Selection**: Choose organization from dashboard
2. **App Discovery**: System maps apps to selected organization
3. **Analytics Access**: KPI cards and charts filter by organization's apps

### Organization Context Issue
- Super admins have `organizationId: null` by default
- Must explicitly select organization for data filtering
- Without organization context, BigQuery cannot scope data properly

## Implementation Steps

### 1. Deploy App Discovery Function
```bash
supabase functions deploy app-discovery
```

### 2. Populate Organization Mappings
```sql
-- Example: Map apps to organizations
INSERT INTO org_app_access (app_id, organization_id)
SELECT app_id, org_id FROM your_app_org_mapping;
```

### 3. Configure Dashboard
- App selector displays discovered apps
- Analytics automatically filter by selected apps
- Organization context enforced for data scoping

## API Response Format

```json
{
  "success": true,
  "discovered_apps": [
    {
      "app_id": "example_app",
      "client": "Client_One", 
      "record_count": 1000,
      "date_range": {
        "start": "2023-01-01",
        "end": "2024-01-01"
      }
    }
  ],
  "total_apps": 8
}
```

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Use service role key, not user JWT
2. **0 Apps Discovered**: Check BigQuery table name and org_app_access mappings
3. **Data Not Filtering**: Ensure organization context is selected for super admins
4. **Missing Apps**: Verify org_app_access table has correct app_id mappings

### Debug Steps
1. Check function logs: `supabase functions logs app-discovery`
2. Verify BigQuery connectivity and data
3. Confirm org_app_access table population
4. Test organization selection in dashboard