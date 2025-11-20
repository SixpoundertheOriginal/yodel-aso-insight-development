---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Troubleshooting section overview
Audience: Developers, Support Engineers
---

# Troubleshooting Documentation

Common issues, solutions, and debugging guides for Yodel ASO Insight.

## Overview

This section contains troubleshooting guides for common issues and debugging procedures.

## Contents

### App Discovery

- **[app-discovery.md](./app-discovery.md)** - App discovery troubleshooting
  - BigQuery app discovery issues
  - Organization app access problems
  - Missing apps in dropdown

### Common Issues

- **[common-issues/](./common-issues/)** - Common issues directory
  - (Additional troubleshooting docs to be added)

## Common Issues

### BigQuery Connection

**Issue:** "No data returned" from BigQuery

**Solutions:**
1. Check organization context (Super Admin must select org)
2. Verify `org_app_access` RLS policy
3. Check BigQuery credentials in Edge Function secrets
4. Verify correct project/dataset: `yodel-mobile-app.aso_reports`

**See:** [BIGQUERY_QUICK_REFERENCE.md](../03-features/dashboard-v2/BIGQUERY_QUICK_REFERENCE.md)

### Authentication

**Issue:** User cannot log in

**Solutions:**
1. Check Supabase auth status
2. Verify user exists in `user_roles` table
3. Check MFA requirements (admin users)
4. Verify email confirmation status

**See:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)

### Permissions

**Issue:** User cannot access feature

**Solutions:**
1. Check user role in `user_roles` table
2. Verify permissions in `user_permissions_unified` view
3. Check feature flags in `organization_features` table
4. Review RLS policies for table access

**See:** [feature-permissions.md](../04-api-reference/feature-permissions.md)

## Quick Debugging Steps

1. **Check Console:** Browser DevTools console for errors
2. **Check Network:** Network tab for failed API calls
3. **Check Logs:** Supabase Edge Function logs
4. **Check Database:** Query relevant tables directly

## Related Documentation

- **Getting Started:** [installation.md](../01-getting-started/installation.md#troubleshooting)
- **Local Development:** [local-development.md](../01-getting-started/local-development.md#troubleshooting)
- **BigQuery:** [BIGQUERY_QUICK_REFERENCE.md](../03-features/dashboard-v2/BIGQUERY_QUICK_REFERENCE.md)
- **Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)

## Target Audience

- **Developers** - Debugging production issues
- **Support Engineers** - Troubleshooting user problems
- **QA Engineers** - Identifying and reporting bugs
