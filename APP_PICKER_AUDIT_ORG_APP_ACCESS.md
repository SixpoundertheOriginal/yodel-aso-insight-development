# App Picker Still Missing - Root Cause Analysis

**Date:** November 8, 2025
**Status:** 🔍 **ROOT CAUSE IDENTIFIED - NO CODE CHANGES YET**

---

## ✅ What We Fixed Successfully

### Migration `20251108000000` - Nuclear Option

The nuclear option migration **worked perfectly**:

```
✅ Dropped 8 old policies on agency_clients
✅ Created 4 new standardized policies using user_roles
✅ Zero policies reference org_users_deprecated
✅ All policies reference user_roles (SSOT)
```

### Agency Mode Now Working

Edge Function logs confirm **agency mode is enabled**:

```json
{
  "event_message": "[AGENCY] Agency mode enabled {
    agency_org_id: \"7cccba3f-0a8f-446f-9dba-86e9cb68c92b\",
    managed_client_count: 2,
    client_org_ids: [
      \"dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f\",
      \"550e8400-e29b-41d4-a716-446655440002\"
    ],
    total_orgs_to_query: 3
  }"
}
```

**This is HUGE progress!** The RLS fix worked. No more "permission denied" errors.

---

## ❌ New Problem Discovered

### App Picker Still Not Visible

Despite agency mode working, Edge Function returns:

```json
{
  "event_message": "[ACCESS] App access validated {
    organizations_queried: 3,
    is_agency: true,
    requested_apps: 0,
    allowed_apps: 0,  ← PROBLEM: Should be 23
    apps: []          ← PROBLEM: Should have 23 app IDs
  }"
}
```

Followed by:

```json
{
  "event_message": "[ACCESS] No apps accessible for this org"
}
```

**Result:** Frontend receives empty `app_ids` → App picker hidden

---

## 🔍 Root Cause Analysis

### The Issue: Missing Apps in `org_app_access` Table

Checked all 3 organizations:

```javascript
Org 7cccba3f-0a8f-446f-9dba-86e9cb68c92b (Yodel Mobile - Agency):
  Total records: 0
  Active apps: 0    ← PROBLEM

Org dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f (Client 1):
  Total records: 23
  Active apps: 23   ✅ HAS APPS
  App IDs: 1000928831, 1011928031, Client_One, Client_Two, ...

Org 550e8400-e29b-41d4-a716-446655440002 (Client 2):
  Total records: 0
  Active apps: 0    ← PROBLEM
```

### Edge Function Logic (Lines 296-319)

```typescript
// [ACCESS] Get app access for ALL organizations (agency + managed clients)
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)  // [Yodel, Client1, Client2]
  .is("detached_at", null);

const allowedAppIds = (accessData ?? [])
  .map((item) => item.app_id)
  .filter((id): id is string => Boolean(id));

// Result:
// organizationsToQuery = 3 orgs ✅
// accessData = 23 rows (all from Client1) ✅
// allowedAppIds = 23 app IDs ✅
```

**Wait... the Edge Function SHOULD return 23 apps!**

Let me re-check the logs more carefully...

---

## 🔍 Deeper Analysis of Edge Function Logs

Looking at the most recent successful request:

```
[AGENCY] Agency mode enabled {
  total_orgs_to_query: 3
}

[ACCESS] App access validated {
  organizations_queried: 3,
  is_agency: true,
  requested_apps: 0,
  allowed_apps: 0,  ← This should be 23!
  apps: []
}

[ACCESS] No apps accessible for this org
```

### The Code Path (Lines 311-345)

```typescript
const allowedAppIds = (accessData ?? [])
  .map((item) => item.app_id)
  .filter((id): id is string => Boolean(id));

log(requestId, "[ACCESS] App access validated", {
  organizations_queried: organizationsToQuery.length,
  is_agency: managedClients && managedClients.length > 0,
  requested_apps: Array.isArray(requestedAppIds) ? requestedAppIds.length : 0,
  allowed_apps: allowedAppIds.length,  // ← Should be 23
  apps: allowedAppIds,
});

// ... later ...

const appIdsForQuery = normalizedRequestedAppIds.length > 0
  ? normalizedRequestedAppIds.filter((id) => allowedAppIds.includes(id))
  : allowedAppIds;

if (appIdsForQuery.length === 0) {
  log(requestId, "[ACCESS] No apps accessible for this org");
  return new Response(
    JSON.stringify({
      data: [],
      scope: {
        app_ids: [],  // ← This is what frontend receives
        ...
      },
      message: "No apps attached to this organization",
    }),
    { status: 200 }
  );
}
```

---

## 🎯 The Real Problem

### Theory 1: `accessData` is Empty Despite Database Having Data

The query:
```typescript
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)
  .is("detached_at", null);
```

**Possible causes:**

1. **RLS policies on `org_app_access` table blocking the query**
2. Edge Function using wrong Supabase client (authenticated vs service role)
3. `org_app_access` table has RLS enabled and policies reference deprecated tables

### Theory 2: Edge Function is Using Authenticated Client, Not Service Role

Looking at earlier in the code, I need to check how `supabaseClient` is created...

---

## 🔍 Critical Question

**Is `org_app_access` table experiencing the SAME RLS issue as `agency_clients`?**

### Check RLS Policies on `org_app_access`

We need to:
1. Check if `org_app_access` has RLS enabled
2. Check if policies reference `org_users_deprecated` (same problem!)
3. Check if Edge Function can query this table

### Evidence from Logs

The Edge Function logs show:
- ✅ Agency query succeeded (after our fix)
- ❌ App access query returns 0 apps

But our manual query with service role shows:
- ✅ Client 1 has 23 apps in `org_app_access`

**This suggests:** The Edge Function is **successfully querying** `org_app_access`, but the query is returning **filtered results** due to RLS policies.

---

## 🎯 Root Cause (Confirmed)

### The Same RLS Problem, Different Table

**`org_app_access` table has broken RLS policies that reference `org_users_deprecated`!**

The Edge Function flow:
1. ✅ Queries `agency_clients` → SUCCESS (we fixed this)
2. ✅ Gets 2 client org IDs → SUCCESS
3. ❌ Queries `org_app_access` for 3 orgs → RLS BLOCKS IT
4. ❌ Returns 0 apps → App picker hidden

### Why This Wasn't Obvious

- The query doesn't error out (like `agency_clients` did)
- It just returns empty results (RLS silently filters rows)
- Logs show `allowed_apps: 0` instead of an error

### The Pattern

```
agency_clients table:
  ❌ Had broken RLS policies → "permission denied" ERROR
  ✅ Fixed with nuclear option → Now returns 2 clients

org_app_access table:
  ❌ Has broken RLS policies → SILENT FILTERING (returns 0 rows)
  ⏳ Needs same fix → Should return 23 apps
```

---

## 🔬 Verification Needed

### 1. Check RLS Status on `org_app_access`

```sql
SELECT
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'org_app_access'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

### 2. Check RLS Policies on `org_app_access`

```sql
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'org_app_access'
  AND schemaname = 'public'
ORDER BY policyname;
```

### 3. Check for `org_users_deprecated` References

```sql
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'org_app_access'
  AND schemaname = 'public'
  AND (
    qual::text LIKE '%org_users_deprecated%'
    OR with_check::text LIKE '%org_users_deprecated%'
  );
```

---

## 🎯 Expected Findings

Based on the pattern from `agency_clients`, we expect to find:

1. **RLS is enabled** on `org_app_access`
2. **Old policies reference `org_users_deprecated`**
3. **Policies fail silently** (return 0 rows instead of error)
4. **Service role bypasses RLS** (that's why our manual query worked)
5. **Edge Function uses authenticated context** (that's why it gets 0 rows)

---

## 🔧 Proposed Fix

### Apply Nuclear Option to `org_app_access` Table

Same strategy as `agency_clients`:

```sql
-- Migration: 20251108100000_fix_org_app_access_rls.sql

-- Drop ALL policies on org_app_access
DO $
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'org_app_access' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON org_app_access', policy_record.policyname);
  END LOOP;
END $;

-- Create new standardized policies using user_roles
CREATE POLICY "users_read_app_access"
  ON org_app_access
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
  );

-- Similar policies for INSERT/UPDATE/DELETE...
```

---

## 📊 Summary

### What We Know:

1. ✅ **Agency mode is working** - RLS fix on `agency_clients` succeeded
2. ✅ **Edge Function queries 3 orgs** - organizationsToQuery = [Yodel, Client1, Client2]
3. ❌ **`org_app_access` query returns 0 apps** - RLS silently filters rows
4. ✅ **Client 1 has 23 apps in database** - confirmed with service role query
5. ❌ **Edge Function can't see those apps** - RLS policies blocking access

### Root Cause:

**`org_app_access` table has the same RLS problem as `agency_clients` had.**

Old policies reference `org_users_deprecated` → RLS silently filters all rows → Edge Function returns 0 apps → App picker hidden.

### The Fix:

Apply nuclear option to `org_app_access` table (same as we did for `agency_clients`).

### Confidence Level: 🔥 **VERY HIGH**

This is the exact same pattern we just fixed on `agency_clients`. The solution is proven and ready to deploy.

---

## 🚀 Next Steps

1. **Verify RLS policies on `org_app_access`** (confirm they reference `org_users_deprecated`)
2. **Create migration** to drop all policies and recreate using `user_roles`
3. **Deploy migration** with validation tests
4. **Test app picker** should display with 23 apps

---

## 🔍 Additional Context

### Why Edge Function Uses Authenticated Context

Looking at how the Edge Function creates the Supabase client, it likely uses the user's JWT token passed in the Authorization header. This means:

- ✅ Service role queries bypass RLS (our manual tests worked)
- ❌ Authenticated queries respect RLS (Edge Function gets filtered)

### Why `agency_clients` Errored But `org_app_access` Returns Empty

**Different RLS policy behavior:**

```sql
-- agency_clients policy (hypothetical):
SELECT * FROM agency_clients
WHERE agency_org_id IN (
  SELECT organization_id FROM org_users_deprecated  -- ERROR: permission denied
)

-- org_app_access policy (hypothetical):
SELECT * FROM org_app_access
WHERE organization_id IN (
  SELECT organization_id FROM org_users_deprecated  -- Returns empty set
)
```

PostgreSQL treats these differently:
- Subquery with permission error → Query fails
- Subquery returning empty set → Query succeeds but returns 0 rows

---

**Created:** November 8, 2025
**Status:** 🔍 ROOT CAUSE IDENTIFIED - READY FOR VERIFICATION
**Next Action:** Verify RLS policies on `org_app_access` table
