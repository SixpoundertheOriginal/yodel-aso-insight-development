# Troubleshooting Guide

**Yodel ASO Insight Platform**
**Last Updated**: 2025-11-09
**Current System Status**: See `CURRENT_SYSTEM_STATUS.md` for current state

This guide covers common issues and their solutions based on actual production problems we've encountered.

---

## ℹ️ Understanding Yodel Mobile Access (Important Context)

**Yodel Mobile Configuration**:
- Access Level: `'reporting_only'`
- Routes: 6-7 pages (analytics/reporting only)
- **This is CORRECT** for internal reporting tool use case

**If you see `routes=6` in console**:
```
[Sidebar] Loaded: org=7cccba3f..., role=ORGANIZATION_ADMIN, routes=6
```

✅ **This is NORMAL and CORRECT** for Yodel Mobile users

**Why**: Yodel Mobile uses platform as internal analytics tool, not full platform management.

**See**: `YODEL_MOBILE_CORRECT_CONTEXT.md` for complete explanation

---

## 🚨 Critical Issues (General)

### Issue 1: User Can Only Access Limited Routes (When Full Access Expected)

**Note**: For Yodel Mobile, `routes=6` is CORRECT. This issue applies to other organizations that should have full access.

**Symptoms**:
```
Console: [Sidebar] Loaded: routes=6
Navigation: Only shows Dashboard, Analytics, few pages
Missing: Keywords, Reviews, and 30+ other pages
```

**Root Causes** (3 possibilities):

#### Cause 1A: access_level Not Set to 'full'

**Check**:
```sql
SELECT name, access_level FROM organizations
WHERE id = '[your-org-id]';
```

**Should Show**: `access_level = 'full'`

**If Shows**: `access_level = 'reporting_only'` or `NULL`

**Fix**:
```sql
UPDATE organizations
SET access_level = 'full'
WHERE id = '[your-org-id]';
```

**Verify**:
```bash
# Hard refresh browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Console should show: routes=~40
```

**Migration Reference**: `20251109060000_grant_yodel_mobile_full_access.sql`

---

#### Cause 1B: React Query Cache Stale

**Symptoms**: Database shows `access_level = 'full'` but frontend still shows 6 routes

**Check**:
```javascript
// In browser console
const profile = queryClient.getQueryData(['user-profile']);
console.log('Cached access_level:', profile?.organizations?.access_level);
```

**If Shows**: `'reporting_only'` or `undefined` (stale cache)

**Fix**:
```javascript
// Option 1: Invalidate and refetch
queryClient.invalidateQueries(['user-profile']);
await queryClient.refetchQueries(['user-profile']);

// Option 2: Hard refresh browser
// Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

#### Cause 1C: TypeScript Types Not Updated

**Symptoms**:
- Database has `access_level` column ✅
- Migration applied ✅
- Frontend still doesn't see it ❌

**Check**:
```bash
grep "access_level" src/integrations/supabase/types.ts
```

**If NOT Found**: TypeScript types outdated

**Fix**:
```bash
# Regenerate types from database
supabase gen types typescript --db-url "$DATABASE_URL" > src/integrations/supabase/types.ts

# Restart dev server
npm run dev:frontend
```

**Why This Happens**: Column added via migration, but types not regenerated. TypeScript filters out unknown columns.

---

### Issue 2: User Lost Access to Keywords and Reviews Pages

**Symptoms**:
```
Console: [Sidebar] Loaded: routes=6
Previously: Had access, now redirected
Error: None (just missing from navigation)
```

**Root Cause**: `user_permissions_unified` view destroyed or broken

**Check**:
```sql
-- Check if view exists
SELECT * FROM user_permissions_unified
WHERE user_id = '[your-user-id]';
```

**Should Return**:
```json
{
  "role": "ORG_ADMIN",
  "effective_role": "org_admin",      ← lowercase
  "is_org_admin": true,               ← boolean flag
  "is_super_admin": false,
  "org_name": "Yodel Mobile"
}
```

**If Returns**:
```json
{
  "role": "ORG_ADMIN",
  "effective_role": "ORG_ADMIN",      ← NOT NORMALIZED!
  "is_org_admin": false,              ← WRONG!
  // Missing boolean flags
}
```

**Problem**: View not normalizing roles correctly

**Fix**:
```bash
# Restore view from migration
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -f supabase/migrations/20251109050000_restore_user_permissions_unified_view.sql

# Or run SQL directly:
```

```sql
DROP VIEW IF EXISTS user_permissions_unified;

CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,
  ur.role::text AS role,
  'user_roles'::text AS role_source,
  (ur.organization_id IS NULL) AS is_platform_role,
  o.name AS org_name,
  o.slug AS org_slug,
  ur.created_at AS resolved_at,
  -- Boolean flags (handle both UPPERCASE and lowercase)
  (ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
  (ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NOT NULL) AS is_org_scoped_role,
  -- Normalized role (lowercase for frontend)
  CASE
    WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
    WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
    WHEN ur.role::text = 'ASO_MANAGER' THEN 'aso_manager'
    WHEN ur.role::text = 'ANALYST' THEN 'analyst'
    WHEN ur.role::text = 'VIEWER' THEN 'viewer'
    ELSE 'viewer'
  END AS effective_role
FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;
```

**Verify**:
```sql
SELECT * FROM user_permissions_unified WHERE user_id = auth.uid();

-- Should show: is_org_admin = true, effective_role = 'org_admin'
```

**Why This Happens**: Migration 20251108220000 accidentally destroyed the view by removing the CASE normalization.

---

### Issue 3: RLS 403 Forbidden Errors

**Symptoms**:
```
Console: POST /rest/v1/monitored_apps 403 (Forbidden)
Error: "new row violates row-level security policy"
Tables affected: monitored_apps, app_competitors, org_app_access
```

**Root Cause**: Role enum case mismatch

**Check**:
```sql
-- Check user's role value
SELECT user_id, role FROM user_roles
WHERE user_id = '[your-user-id]';
```

**Should Return**: `role = 'ORG_ADMIN'` (UPPERCASE)

**If Returns**: `role = 'org_admin'` (lowercase)

**Problem**: RLS policies check for UPPERCASE values, but database has lowercase

**Fix**:
```sql
-- Update to UPPERCASE
UPDATE user_roles
SET role = 'ORG_ADMIN'::app_role
WHERE role::text = 'org_admin';

UPDATE user_roles
SET role = 'SUPER_ADMIN'::app_role
WHERE role::text = 'super_admin';

-- Also update helper function
CREATE OR REPLACE FUNCTION is_super_admin_db()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'::app_role  -- UPPERCASE
  );
$$;
```

**Migration Reference**: `20251109040000_revert_to_uppercase_roles.sql`

**Why This Happens**: Database enum values are UPPERCASE by design. View normalizes to lowercase for frontend. RLS policies must use UPPERCASE.

---

## 🟡 Common Issues

### Issue 4: BigQuery Returns 0 Rows

**Symptoms**:
```
Console:
  Raw Rows: 0
  Query Duration: 1656ms
  Available Traffic Sources: 0
Dashboard: "No data available for selected period"
```

**Is This An Error?**: **NO** ✅ (Usually expected)

**Why This Is Normal**:
1. Date range (default: last 30 days) may have no data
2. Client apps may not have recent activity
3. BigQuery query succeeded (1.6s is normal response time)
4. Empty result set ≠ broken integration

**How to Verify Query Working**:
```
✅ Query Duration: ~1500-2000ms (normal)
✅ No JavaScript errors in console
✅ Dashboard loads without crashing
✅ Date picker functional
```

**If Actually Broken** (rare):
- ❌ Error: "BigQuery request failed"
- ❌ No Query Duration logged
- ❌ Edge Function 404 or 500 error
- ❌ Console shows actual error message

**Debugging Real Errors**:
```bash
# Check Edge Function deployed
supabase functions list
# Should show: bigquery-aso-data

# Check Edge Function logs
supabase functions logs bigquery-aso-data

# Test direct Edge Function call
curl -X POST \
  https://[project].supabase.co/functions/v1/bigquery-aso-data \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"[org-id]","startDate":"2025-01-01","endDate":"2025-11-09"}'
```

---

### Issue 5: Keyword Job 404 Errors

**Symptoms**:
```
Console:
  GET /functions/v1/schedule-keyword-job 404 (Not Found)
  GET /functions/v1/keyword-job-status 404 (Not Found)
```

**Is This An Error?**: **NO** ✅ (Expected)

**Why This Is Normal**:
- Keyword tracking job system not yet deployed to production
- Edge Functions exist locally but not on hosted Supabase
- Feature planned for future implementation
- UI shows "feature in development" message

**What to Do**: Nothing - this is expected behavior

**If You Need Keyword Jobs**:
```bash
# Deploy keyword job functions
supabase functions deploy schedule-keyword-job
supabase functions deploy keyword-job-status

# Verify deployment
supabase functions list
```

---

### Issue 6: Debug Logs Repeated Multiple Times

**Symptoms**:
```
Console:
  ReviewManagement - Debug Info: {...}  (x8 times)
  [Component] Loaded  (x4 times)
```

**Is This An Error?**: **NO** ✅ (React development mode)

**Why This Happens**:
1. React StrictMode causes double-mounting in development
2. Component re-renders trigger useEffect multiple times
3. Only happens in dev mode (not production)

**How to Reduce**:
```typescript
// Option 1: Throttle logs with useRef
const hasLogged = useRef(false);

useEffect(() => {
  if (!hasLogged.current) {
    console.log('[Component] Debug info:', data);
    hasLogged.current = true;
  }
}, [data]);

// Option 2: Feature flag gating
if (localStorage.getItem('DEBUG_REVIEWS') === 'true') {
  console.log('[Reviews] Debug info:', data);
}
```

**To Enable Debug Logs**:
```javascript
// In browser console
localStorage.setItem('DEBUG_REVIEWS', 'true');
// Reload page
```

**To Disable**:
```javascript
localStorage.removeItem('DEBUG_REVIEWS');
```

---

### Issue 7: Can't Add App to Monitoring

**Symptoms**:
```
Error: POST /rest/v1/monitored_apps 403 (Forbidden)
Message: "new row violates row-level security policy"
```

**Root Cause**: Usually role enum case mismatch (see Issue 3)

**Check RLS Policy**:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'monitored_apps'
  AND cmd = 'INSERT';
```

**Should Use**: UPPERCASE enum values in policy
```sql
-- Correct policy
CREATE POLICY "Users can add apps to monitor"
ON monitored_apps FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')  -- UPPERCASE
  )
);
```

**If Policy Uses lowercase**: Need to update policy or revert roles to UPPERCASE

---

### Issue 8: Can't Add Competitors

**Symptoms**:
```
Error: POST /rest/v1/app_competitors 403 (Forbidden)
Or: "No apps tagged as competitor"
```

**Two Possible Causes**:

#### 8A: RLS Policy Issue
Same as Issue 7 - check role enum case

#### 8B: Junction Table Missing
**Check**:
```sql
SELECT COUNT(*) FROM app_competitors;
```

**If Error**: "relation does not exist"

**Fix**:
```bash
# Apply migration
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -f supabase/migrations/20251107000000_create_app_competitors.sql
```

**Migration Creates**:
- `app_competitors` table
- RLS policies
- Indexes

---

## 🔧 Database Issues

### Issue 9: Migration Failed to Apply

**Symptoms**:
```
Error: invalid input value for enum app_role: "CLIENT"
Or: column "access_level" does not exist
```

**Check Migration Status**:
```bash
supabase migration list
```

**Shows**:
```
  20251109040000_revert_to_uppercase_roles.sql  [Applied]
  20251109050000_restore_view.sql               [Pending]  ← Not applied
  20251109060000_grant_full_access.sql          [Applied]
```

**Fix**:
```bash
# Apply pending migrations
supabase db push

# Or apply specific migration
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -f supabase/migrations/20251109050000_restore_view.sql
```

**If Migration Has Syntax Error**:
1. Check migration file for SQL errors
2. Test SQL in database client first
3. Fix migration file
4. Reapply

---

### Issue 10: View Returns Wrong Data

**Symptoms**:
```sql
SELECT * FROM user_permissions_unified;
-- Returns: is_org_admin = false (should be true)
```

**Check View Definition**:
```sql
\d+ user_permissions_unified
-- Shows view definition
```

**Should Include**:
- CASE statement normalizing roles to lowercase
- Boolean flags: `is_org_admin`, `is_super_admin`
- Join with organizations table

**If View Broken**: Re-create from migration (see Issue 2)

---

## 🌐 Frontend Issues

### Issue 11: React Query Not Refetching

**Symptoms**:
- Database updated ✅
- Hard refresh doesn't help ❌
- Still showing old data

**Force Refetch**:
```javascript
// In browser console
queryClient.invalidateQueries(['user-profile']);
await queryClient.refetchQueries(['user-profile']);

// Or clear all cache
queryClient.clear();
```

**Check Stale Time**:
```typescript
// In useUserProfile hook
staleTime: 5 * 60 * 1000,  // 5 minutes
// Data won't refetch until 5 min elapsed
```

**Reduce for Development**:
```typescript
staleTime: import.meta.env.DEV ? 30 * 1000 : 5 * 60 * 1000,
// Dev: 30 seconds, Prod: 5 minutes
```

---

### Issue 12: Navigation Doesn't Update After Role Change

**Symptoms**:
- Role updated in database ✅
- User still sees old navigation ❌

**Cause**: AppSidebar caches allowed routes

**Fix**:
```javascript
// Hard refresh to reload AppSidebar
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

// Or invalidate cache
queryClient.invalidateQueries(['user-profile']);
```

**Verify**:
```javascript
// Console should show
[Sidebar] Loaded: routes=~40  // Updated
```

---

## 🔐 Authentication Issues

### Issue 13: User Can't Log In

**Symptoms**:
```
Error: "Invalid login credentials"
Or: Endless loading spinner
```

**Check Email Verified**:
```sql
SELECT email, email_confirmed_at
FROM auth.users
WHERE email = '[user-email]';
```

**If `email_confirmed_at` is NULL**:
```sql
-- Manually verify (for development)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = '[user-email]';
```

**Check User Exists**:
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = '[user-email]';
```

**If User Doesn't Exist**: User needs to sign up

---

### Issue 14: User Has No Organization

**Symptoms**:
- Can log in ✅
- Gets redirected to "No organization" page ❌

**Check Assignment**:
```sql
SELECT * FROM user_roles
WHERE user_id = '[user-id]';
```

**If Empty**: User not assigned to organization

**Fix**:
```sql
INSERT INTO user_roles (user_id, organization_id, role)
VALUES (
  '[user-id]',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  -- Yodel Mobile
  'ORG_ADMIN'::app_role
);
```

**Verify**:
```sql
SELECT * FROM user_permissions_unified
WHERE user_id = '[user-id]';
-- Should show org_name, is_org_admin = true
```

---

## 📊 Data Issues

### Issue 15: App Not Showing in App Picker

**For Agencies** (like Yodel Mobile):
**This is NORMAL** ✅

**Why**:
- Agency doesn't "own" apps
- Apps belong to clients
- Apps accessed via BigQuery directly
- `org_app_access` table should be empty

**For Client Organizations**:
**Check**:
```sql
SELECT * FROM org_app_access
WHERE organization_id = '[org-id]';
```

**If Empty**: Apps need to be connected

**Add App**:
```sql
INSERT INTO org_app_access (organization_id, app_store_id, app_name)
VALUES (
  '[org-id]',
  '1000928831',
  'Client App Name'
);
```

---

## 🔍 Diagnostic Commands

### Quick Health Check

```sql
-- 1. Check user permissions
SELECT * FROM user_permissions_unified WHERE user_id = auth.uid();

-- 2. Check organization access level
SELECT name, access_level, subscription_tier
FROM organizations
WHERE id = (SELECT org_id FROM user_permissions_unified WHERE user_id = auth.uid());

-- 3. Check feature flags
SELECT feature_key, is_enabled
FROM organization_features
WHERE organization_id = (SELECT org_id FROM user_permissions_unified WHERE user_id = auth.uid())
ORDER BY feature_key;

-- 4. Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('monitored_apps', 'app_competitors', 'user_roles')
ORDER BY tablename, cmd;
```

### Frontend Debug Commands

```javascript
// Check React Query state
console.log('Profile:', queryClient.getQueryData(['user-profile']));
console.log('All queries:', queryClient.getQueryCache().getAll());

// Check Supabase client
console.log('Supabase:', supabase);
console.log('User:', await supabase.auth.getUser());

// Test permission query
const { data, error } = await supabase
  .from('user_permissions_unified')
  .select('*')
  .single();
console.log('Permissions:', { data, error });

// Test access_level query
const { data: org } = await supabase
  .from('organizations')
  .select('access_level')
  .eq('id', '[org-id]')
  .single();
console.log('Access level:', org?.access_level);
```

---

## 📋 Debugging Checklist

**When Something Breaks**:

1. ✅ Check console for errors
2. ✅ Check Network tab for 403/404/500 errors
3. ✅ Run SQL health check (see above)
4. ✅ Check migration status (`supabase migration list`)
5. ✅ Verify user_permissions_unified view exists
6. ✅ Check role enum case (UPPERCASE in database)
7. ✅ Hard refresh browser (Cmd+Shift+R)
8. ✅ Check React Query cache
9. ✅ Verify TypeScript types up to date
10. ✅ Check related documentation in `docs/`

**Before Making Changes**:

1. ✅ Read `CURRENT_SYSTEM_STATUS.md`
2. ✅ Understand expected behavior (0 rows may be normal)
3. ✅ Check if issue already documented here
4. ✅ Test fix in development first
5. ✅ Create migration if changing database
6. ✅ Update TypeScript types if adding columns

---

## 🆘 Still Stuck?

**Review Documentation**:
- `CURRENT_SYSTEM_STATUS.md` - Current working state
- `ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md` - Official architecture
- `YODEL_MOBILE_AGENCY_CONTEXT_ANALYSIS.md` - Business model
- `docs/architecture/` - System design
- `docs/completed-fixes/` - Historical issue resolutions

**Check Logs**:
```bash
# Edge Function logs
supabase functions logs [function-name]

# Database logs (if local)
supabase db logs

# Frontend console
# Open DevTools → Console
```

**Common Patterns**:
1. **routes=6 instead of ~40**: access_level or view issue
2. **403 RLS errors**: Enum case mismatch (UPPERCASE vs lowercase)
3. **0 rows returned**: Often expected (date range has no data)
4. **404 on Edge Functions**: Feature not deployed yet
5. **View returns wrong data**: View definition broken
6. **Can't access page**: Feature flag not enabled

---

**Last Updated**: 2025-11-09
**Based On**: Actual production issues and resolutions from Nov 2025 session
