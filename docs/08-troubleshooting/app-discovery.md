# Troubleshooting App Discovery

## Common Issues and Solutions

### 1. 401 Unauthorized Error

**Symptom**: `{"error":"Unauthorized"}` when calling app-discovery function

**Cause**: Using user JWT token instead of service role key

**Solution**:
```bash
# Use service role key, not user JWT
curl -X POST https://[project].supabase.co/functions/v1/app-discovery \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Debug Steps**:
1. Verify service role key in Supabase dashboard
2. Check function logs: `supabase functions logs app-discovery`
3. Ensure environment variables are set correctly

### 2. Zero Apps Discovered

**Symptom**: Function returns `{"discovered_apps": [], "total_apps": 0}`

**Possible Causes**:
- Incorrect BigQuery table reference
- Missing org_app_access mappings
- BigQuery authentication issues

**Solution**:
```sql
-- Check if org_app_access table exists and has data
SELECT COUNT(*) FROM org_app_access;

-- Verify BigQuery table structure
SELECT app_id, client, COUNT(*) 
FROM `aso-reporting-1.client_reports.aso_all_apple` 
GROUP BY app_id, client 
LIMIT 10;
```

**Debug Steps**:
1. Test BigQuery connectivity directly
2. Verify table name: `aso-reporting-1.client_reports.aso_all_apple`
3. Check if org_app_access table exists and is populated

### 3. Data Not Filtering in Dashboard

**Symptom**: KPI cards show same values regardless of app selection

**Cause**: Super admin lacks organization context (`organizationId: null`)

**Solution**:
Super admin must select an organization from the dashboard before app data will filter properly.

**Debug Steps**:
```typescript
// Check organization context in browser console
console.log('Organization ID:', selectedOrganizationId);
console.log('Selected Apps:', selectedApps);
```

**Visual Indicator**:
Dashboard shows yellow warning when organization context is missing.

### 4. Missing BigQuery Data

**Symptom**: Apps discovered but no analytics data available

**Possible Causes**:
- App IDs don't match between discovery and analytics queries
- Date range issues
- Organization mapping problems

**Solution**:
```sql
-- Verify app data exists for specific date range
SELECT app_id, MIN(date), MAX(date), COUNT(*)
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE app_id = 'your_app_id'
GROUP BY app_id;
```

### 5. Function Deployment Issues

**Symptom**: Function not accessible or returning errors after deployment

**Solution**:
```bash
# Redeploy with verbose logging
supabase functions deploy app-discovery --debug

# Check function status
supabase functions list
```

**Common Issues**:
- Environment variables not set in Supabase dashboard
- BigQuery service account key malformed
- Function timeout due to large datasets

### 6. Organization Mapping Errors

**Symptom**: Apps discovered but not appearing in organization's app list

**Cause**: Missing or incorrect org_app_access mappings

**Solution**:
```sql
-- Check existing mappings
SELECT oa.app_id, o.name as org_name
FROM org_app_access oa
JOIN organizations o ON oa.organization_id = o.id;

-- Add missing mappings
INSERT INTO org_app_access (app_id, organization_id)
VALUES ('your_app_id', 'your_org_uuid');
```

## Debugging Checklist

### Pre-deployment
- [ ] BigQuery service account configured
- [ ] Supabase secrets set correctly
- [ ] org_app_access table exists
- [ ] Organization exists in database

### Function Testing
- [ ] Use service role key for authentication
- [ ] Check function logs for errors
- [ ] Verify BigQuery table accessibility
- [ ] Test with known good data

### Dashboard Integration
- [ ] Organization context selected (for super admin)
- [ ] App selector shows discovered apps
- [ ] BigQuery data request includes correct parameters
- [ ] Network requests succeed without errors

### Data Validation
- [ ] Apps exist in BigQuery with expected structure
- [ ] org_app_access mappings are correct
- [ ] Date ranges align with available data
- [ ] Analytics queries return expected results

## Log Analysis

### Function Logs
```bash
# View recent app-discovery logs
supabase functions logs app-discovery --follow

# Look for these patterns:
# - BigQuery authentication success/failure
# - Query execution time and results
# - Organization mapping lookups
# - Error stack traces
```

### Browser Console
```javascript
// Debug BigQuery requests
console.log('BigQuery request:', requestBody);
console.log('Organization context:', organizationId);
console.log('Selected apps:', selectedApps);
```

### Database Queries
```sql
-- Check function execution history
SELECT * FROM edge_functions_audit 
WHERE function_name = 'app-discovery' 
ORDER BY created_at DESC;

-- Verify organization context
SELECT u.email, ur.organization_id, o.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN organizations o ON ur.organization_id = o.id
WHERE u.email = 'admin@example.com';
```

## Performance Issues

### Slow App Discovery
- Optimize BigQuery query with date partitioning
- Add indexes on frequently queried columns
- Implement query result caching
- Use LIMIT clause for testing

### Dashboard Loading Delays
- Check network requests in browser dev tools
- Verify React Query caching is working
- Optimize component re-renders
- Consider pagination for large app lists

## Emergency Procedures

### Function Unavailable
1. Check Supabase status page
2. Verify function deployment status
3. Rollback to previous version if needed
4. Contact Supabase support if platform issue

### Data Inconsistency
1. Compare BigQuery data with dashboard results
2. Check org_app_access mappings
3. Verify date range parameters
4. Clear caches and retry requests

### Authentication Failures
1. Regenerate service role key if compromised
2. Update Supabase secrets
3. Redeploy affected functions
4. Test with new credentials