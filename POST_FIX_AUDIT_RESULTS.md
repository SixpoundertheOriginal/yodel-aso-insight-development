# Post-Fix Audit Results

**Date**: 2025-11-08
**Context**: After commit bf201f6 ("fix: resolve SQL errors and improve auth timing")
**Status**: 🟡 **PARTIALLY RESOLVED** - New issues discovered

---

## ✅ Successfully Fixed (Commit bf201f6)

### 1. Table Name Mismatch ✅
- **Was**: `org_feature_entitlements` does not exist (SQL error 42P01)
- **Fixed**: Updated to `organization_features` (11 occurrences in featureAccessService)
- **Result**: Feature access now queries correct table
- **Impact**: No more SQL errors, dynamic feature flags work

### 2. Auth Timing Guard ✅
- **Was**: Premature "No authenticated user" warnings during page load
- **Fixed**: Added `authLoading` check in `useAsoDataWithFallback`
- **Result**: Hook waits for auth to complete before querying
- **Impact**: Clean logs, no confusing warnings

### 3. Logging Consolidation ✅
- **Was**: Mixed `debugLog` and `logger` calls
- **Fixed**: All fallback logs now use `logger.fallback()`
- **Result**: Consistent logging across system
- **Impact**: Production-ready (silent unless flags enabled)

---

## 🔴 NEW ISSUES DISCOVERED

### Issue 1: `org_users_deprecated` Permission Denied (42501)

**Error Log:**
```
permission denied for table org_users_deprecated
```

**Root Cause Analysis:**

✅ **NOT in RLS policies** - All policies correctly use `user_roles`:
- ✅ `apps` table: Uses `user_roles` in RLS policy (migration 20251108200000)
- ✅ `agency_clients`: Uses `user_roles` (migration 20251107300000, 20251108000000)
- ✅ `org_app_access`: Uses `user_roles` (migration 20251108100000)

❌ **FOUND IN: Query joins or view definitions**

**Investigation Path:**
1. **Check if `apps` table has foreign key to `org_users_deprecated`**
   - Unlikely - table schema should reference `organizations` or `user_roles`

2. **Check if Supabase client auto-generates joins**
   - `useUserProfile` queries:
     ```typescript
     .select(`
       *,
       organizations!profiles_organization_id_fkey(name, ...),
       user_roles(role, organization_id)
     `)
     ```
   - This is CORRECT - queries `user_roles`, not `org_users`

3. **Check if `useBigQueryApps` query triggers implicit join**
   - Queries: `.from('apps').select('*').eq('organization_id', orgId)`
   - This is SIMPLE query - no joins

4. **Hypothesis: Stale view or cached query plan**
   - Supabase may have cached old view definition that references deprecated table
   - OR: Database has stale materialized view

**Source Chain:**
```
TopBar.tsx (line 89)
  ↓ passes profile?.organization_id
BigQueryAppSelector.tsx (line 27)
  ↓ calls useBigQueryApps(organizationId)
useBigQueryApps.ts (line 22)
  ↓ queries: supabase.from('apps').select('*').eq('organization_id', orgId)
  ↓ RLS policy executes: user_roles lookup
  ↓ ERROR: permission denied for table org_users_deprecated
```

**Why This Happens:**
- RLS policy on `apps` table is CORRECT (uses `user_roles`)
- BUT: Something in the query execution path references deprecated table
- LIKELY: Cached view definition or implicit foreign key constraint

**Fix Path:**
1. ✅ Check `apps` table schema in Supabase dashboard
2. ✅ Run `REFRESH MATERIALIZED VIEW` if any exist
3. ✅ Clear Supabase connection pool / restart database
4. ⚠️ IF PERSISTS: Drop and recreate `apps` table RLS policies

---

### Issue 2: Cross-Org Context Mismatch (403 Forbidden)

**Error Log:**
```
GET ...organization_id=eq.dbdb0cc5... 403 (Forbidden)
```

**Current User Context:**
- **Correct Org**: `7cccba3f-0a8f-446f-9dba-86e9cb68c92b` (Yodel Mobile)
- **Wrong Org in Query**: `dbdb0cc5-...` (Unknown/Demo org)

**Root Cause:**

**Source of `organizationId` in `BigQueryAppSelector`:**
```typescript
// TopBar.tsx line 89
<BigQueryAppSelector
  organizationId={profile?.organization_id}
  ...
/>
```

**Where `profile` comes from:**
```typescript
// TopBar.tsx line 17
const { profile, isLoading: profileLoading } = useUserProfile();
```

**What `useUserProfile` queries:**
```typescript
// useUserProfile.ts line 24
const { data: profile } = await supabase
  .from('profiles')
  .select('*, organizations!...fkey(...), user_roles(...)')
  .eq('id', user.id)
  .single();
```

**Hypothesis:**
1. **localStorage/sessionStorage has stale org ID**
   - React Query may cache profile with old org ID
   - User switched orgs but cache not invalidated

2. **Profile table has wrong organization_id**
   - Check: `SELECT * FROM profiles WHERE id = '8920ac57-63da-4f8e-9970-719be1e2569c'`
   - Expected: `organization_id = '7cccba3f...'` (Yodel Mobile)
   - Actual: `organization_id = 'dbdb0cc5...'` (wrong)

3. **useUserProfile returns stale data**
   - Query key: `['user-profile']` - no dependencies
   - Cache may persist across sessions

**Why 403 Happens:**
1. `useUserProfile` returns profile with `organization_id = 'dbdb0cc5...'`
2. TopBar passes this to `BigQueryAppSelector`
3. `useBigQueryApps` queries: `.eq('organization_id', 'dbdb0cc5...')`
4. RLS policy checks: "Does current user belong to org `dbdb0cc5`?"
5. Answer: NO (user belongs to `7cccba3f...`)
6. Result: 403 Forbidden

**Fix Path:**
1. ✅ **IMMEDIATE**: Clear React Query cache on org change
   ```typescript
   // When user changes org or logs in
   queryClient.invalidateQueries({ queryKey: ['user-profile'] });
   queryClient.invalidateQueries({ queryKey: ['bigquery-apps'] });
   ```

2. ✅ **SAFE**: Use `usePermissions` instead of `useUserProfile` for org ID
   ```typescript
   // TopBar.tsx
   const { permissions } = usePermissions();
   const organizationId = permissions?.org_id;
   ```

3. ⚠️ **VERIFY**: Check database for stale profile data
   ```sql
   SELECT id, email, organization_id
   FROM profiles
   WHERE id = '8920ac57-63da-4f8e-9970-719be1e2569c';

   -- Should return: organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
   ```

---

### Issue 3: BigQuery Fallback Triggered

**Error Log:**
```
Error fetching data Error: BigQuery request failed
⚠️ [Fallback] BigQuery failed, using mock data
```

**Expected Behavior:**
- BigQuery returns 0 rows (no data for date range)
- This is EXPECTED per user confirmation: "big query maybe is empty becuse of the app selsctore and dates"

**Current Behavior:**
- BigQuery request FAILS (returns error, not empty dataset)
- Fallback triggered (mock data shown)

**Root Cause:**

**Hypothesis 1: Service Account Auth Issue**
- Edge Function may not have valid BigQuery credentials
- Or: Credentials don't have access to specific dataset

**Hypothesis 2: Dataset Mapping Issue**
- Organization ID `7cccba3f...` not mapped to BigQuery dataset
- Edge Function can't find dataset for this org

**Hypothesis 3: Cross-Org ID Mismatch (Same as Issue 2)**
- If Edge Function receives `organizationId = 'dbdb0cc5...'`
- It queries wrong BigQuery dataset (or dataset doesn't exist)
- Returns 403 or "dataset not found"

**Fix Path:**
1. ✅ **FIX ISSUE 2 FIRST** - Ensure correct org ID passed to Edge Function

2. ✅ **VERIFY Edge Function Logs**
   ```bash
   supabase functions logs bigquery-aso-data --limit 50
   ```
   Look for:
   - What `organizationId` does Edge Function receive?
   - What error does BigQuery return? (403? 404? Invalid dataset?)

3. ✅ **TEST Edge Function Directly**
   ```bash
   curl -X POST https://<supabase-url>/functions/v1/bigquery-aso-data \
     -H "Authorization: Bearer $ANON_KEY" \
     -d '{
       "organizationId": "7cccba3f-0a8f-446f-9dba-86e9cb68c92b",
       "dateRange": {...},
       "trafficSources": []
     }'
   ```

4. ⚠️ **VERIFY Service Account**
   - Check Edge Function environment variables
   - Ensure `BIGQUERY_SERVICE_ACCOUNT` is set
   - Verify service account has `bigquery.dataViewer` role

---

## 🎯 Recommended Fix Order

### Priority 1: Cross-Org Context Mismatch (CRITICAL)

**This is the ROOT CAUSE of Issues 1, 2, and 3**

**Why:**
- If `profile?.organization_id` returns wrong org (`dbdb0cc5...`)
- ALL subsequent queries use wrong org ID
- RLS policies block access (403)
- BigQuery queries fail (wrong dataset)

**Fix Implementation:**

**Option A: Use `usePermissions` instead of `useUserProfile`** ✅ RECOMMENDED
```typescript
// TopBar.tsx
import { usePermissions } from '@/hooks/usePermissions';

const TopBar: React.FC = React.memo(() => {
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const organizationId = permissions?.org_id;

  return (
    <BigQueryAppSelector
      organizationId={organizationId}
      selectedApps={selectedApps}
      onSelectionChange={setSelectedApps}
    />
  );
});
```

**Why This Works:**
- `usePermissions` queries `user_permissions_unified` view
- View uses `user_roles` table (SSOT)
- Returns CURRENT org ID from active session
- No stale cache issues

**Option B: Force cache invalidation on mount** ⚠️ BACKUP
```typescript
// TopBar.tsx
const queryClient = useQueryClient();

useEffect(() => {
  // Invalidate profile cache to ensure fresh data
  queryClient.invalidateQueries({ queryKey: ['user-profile'] });
}, []);
```

**Why This Works:**
- Forces fresh query from database
- Clears any stale cached data
- BUT: Adds extra query on every mount

**Option C: Fix `useUserProfile` query key** ⚠️ RISKY
```typescript
// useUserProfile.ts
queryKey: ['user-profile', user?.id], // Add user ID as dependency
```

**Why This Works:**
- Cache keyed by user ID
- Different users get different cache entries
- BUT: May break existing code that relies on global cache

---

### Priority 2: Verify Database State

**Check if profile table has correct org ID:**
```sql
-- Expected query result
SELECT id, email, organization_id
FROM profiles
WHERE id = '8920ac57-63da-4f8e-9970-719be1e2569c';

-- Should return:
-- organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
```

**If wrong org ID in database:**
```sql
-- FIX: Update profile to correct org
UPDATE profiles
SET organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
WHERE id = '8920ac57-63da-4f8e-9970-719be1e2569c';
```

---

### Priority 3: Clear `org_users_deprecated` Reference

**This may self-resolve after fixing Priority 1**

If persists after org ID fix:

**Option A: Restart Supabase connection pool**
```bash
# In Supabase dashboard: Settings → Database → Connection Pooler → Restart
```

**Option B: Manually verify no views reference deprecated table**
```sql
-- Check all views for deprecated table reference
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE definition LIKE '%org_users_deprecated%'
  AND schemaname = 'public';
```

**Option C: Drop and recreate RLS policies (LAST RESORT)**
```sql
-- Only if above fails
DROP POLICY IF EXISTS org_access_apps ON public.apps;

CREATE POLICY org_access_apps
ON public.apps
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
  OR public.is_super_admin_db()
);
```

---

## ✅ Success Criteria

After implementing fixes:

1. **No 403 Forbidden errors**
   ```
   ❌ GET ...organization_id=eq.dbdb0cc5... 403
   ✅ GET ...organization_id=eq.7cccba3f... 200
   ```

2. **No `org_users_deprecated` errors**
   ```
   ❌ permission denied for table org_users_deprecated
   ✅ (no SQL errors)
   ```

3. **BigQuery returns data OR empty dataset (not error)**
   ```
   ❌ Error fetching data Error: BigQuery request failed
   ✅ [ENTERPRISE-ANALYTICS] Data received: 0 rows (expected)
   ```

4. **Correct org ID in all logs**
   ```
   ✅ [usePermissions] Loaded org=7cccba3f..., role=org_admin
   ✅ [BigQueryAppSelector] org=7cccba3f..., apps=8
   ✅ [ENTERPRISE-ANALYTICS] Fetching org=7cccba3f...
   ```

---

## 📊 Current System State

### Healthy Components ✅
- Auth / Permissions: `usePermissions` returns correct org (`7cccba3f...`)
- Sidebar / RBAC: Routes correctly filtered by role
- Feature Access: Queries `organization_features` table (fixed)
- Logging: Clean, production-ready (silent unless flags enabled)

### Broken Components 🔴
- TopBar → BigQueryAppSelector: Uses wrong org ID from `useUserProfile`
- useBigQueryApps: Queries with wrong org ID → 403
- BigQuery Edge Function: Receives wrong org ID → dataset not found

### Root Cause 🎯
**Single Point of Failure: `useUserProfile` returns stale/wrong `organization_id`**

All downstream components inherit this incorrect org ID.

---

## 🚀 Next Steps

1. **Implement Priority 1 Fix** (Option A: Use `usePermissions`)
   - Update `TopBar.tsx` to use `usePermissions` instead of `useUserProfile`
   - Test with correct org ID (`7cccba3f...`)

2. **Verify Database State** (Priority 2)
   - Query profiles table to confirm org ID
   - Update if wrong

3. **Test End-to-End Flow**
   - Check logs for correct org ID
   - Verify no 403 errors
   - Confirm BigQuery returns empty dataset (not error)

4. **Monitor `org_users_deprecated` Error**
   - If persists after org ID fix, investigate views
   - May require Supabase restart or policy recreation

---

**Status**: 🟡 Ready for implementation
**Risk**: LOW (code-only change to TopBar.tsx)
**Breaking Changes**: NONE
**Estimated Time**: 15 minutes
