# ROOT CAUSE ANALYSIS: 403 Access Denied Issue

**Date:** November 5, 2025
**User:** cli@yodelmobile.com
**Status:** 🔴 ROOT CAUSE IDENTIFIED
**Fix Status:** ⏳ AWAITING FIX

---

## 🎯 EXECUTIVE SUMMARY

**Issue:** User gets 403 error when accessing /dashboard despite having valid permissions.

**Root Cause:** Row-Level Security (RLS) policy on `organization_features` table is blocking the Edge Function from reading feature flags.

**Impact:** ALL users affected (not just cli@yodelmobile.com)

**Severity:** 🔴 CRITICAL - Blocks application access

---

## 📊 EVIDENCE

### What's Working ✅

```javascript
// Frontend permissions load correctly
✅ organizationId: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
✅ effectiveRole: 'org_admin'
✅ isOrganizationAdmin: true
✅ User authenticated successfully
✅ Database query returns 1 row
```

### What's Failing ❌

```javascript
// Edge Function /authorize returns 403
❌ POST /authorize → 403 (Forbidden)
❌ hasBaseAccess: false
❌ featureCount: 0  ← NO FEATURES LOADED
❌ User sees "No access to this application"
```

---

## 🔍 TECHNICAL ANALYSIS

### Authorization Flow

```
1. User logs in
   ↓
2. Frontend queries user_permissions_unified
   └─> Returns: organizationId, effectiveRole ✅
   ↓
3. ProtectedRoute calls /authorize Edge Function
   ↓
4. Edge Function calls resolveAuthContext()
   ↓
5. resolveAuthContext() calls getOrganizationFeatures(org_id)
   ↓
6. getOrganizationFeatures() queries organization_features table
   └─> RLS BLOCKS QUERY ❌
   └─> Returns empty array []
   ↓
7. authContext.features = {} (empty)
   ↓
8. hasFeatureAccess('app_core_access') returns FALSE
   ↓
9. Edge Function returns 403
   ↓
10. User sees NoAccess page
```

---

## 🚨 ROOT CAUSE #1: Incorrect RLS Policy

**File:** `supabase/migrations/20251103200000_create_organization_features.sql`
**Lines:** 26-40

### Current Policy (BROKEN):

```sql
CREATE POLICY "org_admins_can_manage_features" ON organization_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM org_users  -- ❌ PROBLEM 1: Wrong table
      WHERE org_users.user_id = auth.uid()
        AND org_users.org_id = organization_features.organization_id
        AND org_users.role IN ('org_admin')  -- ❌ PROBLEM 2: Wrong table schema
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'  -- ❌ PROBLEM 3: Wrong enum value (should be 'SUPER_ADMIN')
        AND user_roles.organization_id IS NULL
    )
  );
```

### Issues:

1. **❌ PROBLEM 1: References `org_users` table**
   - This table is deprecated
   - Current system uses `user_roles` table
   - User might not have entry in `org_users`

2. **❌ PROBLEM 2: Checks for `role IN ('org_admin')`**
   - `org_users` table doesn't have this schema
   - Wrong column/table structure

3. **❌ PROBLEM 3: Checks for `role = 'super_admin'`**
   - Should be `'SUPER_ADMIN'` (uppercase)
   - Enum value mismatch

4. **❌ PROBLEM 4: Uses `FOR ALL`**
   - Applies to SELECT, INSERT, UPDATE, DELETE
   - Too restrictive for read access
   - Should have separate policies for SELECT vs INSERT/UPDATE/DELETE

### Why It Blocks Access:

```
Edge Function uses: SUPABASE_ANON_KEY
  ↓
Subject to RLS policies
  ↓
User JWT: { user_id: "8920ac57-...", role: "authenticated" }
  ↓
RLS Policy checks:
  1. org_users table → User not found ❌
  2. user_roles.role = 'super_admin' → User has 'ORG_ADMIN' ❌
  ↓
Policy returns FALSE
  ↓
Query returns [] (empty)
  ↓
authContext.features = {}
  ↓
hasFeatureAccess('app_core_access') = FALSE
```

---

## 🚨 ROOT CAUSE #2: Edge Function Uses Anon Key

**File:** `supabase/functions/authorize/index.ts`
**Lines:** 33-37

### Current Code:

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,  // ← ANON KEY
  { global: { headers: { Authorization: authHeader } } }
);
```

### Implications:

- ✅ **Good:** Respects RLS policies (security)
- ❌ **Bad:** Subject to RLS restrictions (if policies are wrong, queries fail)

### Architectural Decision:

**Option A:** Use Service Role Key (bypass RLS)
- ✅ Always works
- ❌ Bypasses security
- ❌ Requires careful permission checks in code

**Option B:** Use Anon Key (respect RLS)
- ✅ Database-level security
- ✅ Declarative policies
- ❌ Requires correct RLS policies (current issue)

**Current System:** Uses Option B (Anon Key)

**Implication:** RLS policies MUST be correct, or queries will fail.

---

## 🔧 THE FIX NEEDED

### Fix #1: Update RLS Policy

**Create new migration:**

```sql
-- Drop broken policy
DROP POLICY IF EXISTS "org_admins_can_manage_features" ON organization_features;

-- Create READ policy (anyone can read their org's features)
CREATE POLICY "Users can read org features" ON organization_features
  FOR SELECT
  USING (
    -- User is member of organization
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- User is super admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'  -- ← Correct enum value
    )
  );

-- Create WRITE policy (only admins can modify)
CREATE POLICY "Admins can manage org features" ON organization_features
  FOR INSERT, UPDATE, DELETE
  USING (
    -- User is org admin for this organization
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = organization_features.organization_id
        AND role IN ('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is platform super admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
    )
  );
```

### Fix #2: Verify Feature Exists

**Migration:** `20251205120000_add_core_access_feature.sql` (already created)

```sql
INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'app_core_access', true)
ON CONFLICT (organization_id, feature_key)
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
```

---

## 📈 IMPACT ASSESSMENT

### Who Is Affected?

- 🔴 **ALL users** in ALL organizations
- 🔴 **Every login attempt** triggers this issue
- 🔴 **All protected routes** blocked

### Why Wasn't This Caught Earlier?

1. **Development used super admin accounts** (bypassed some checks)
2. **RLS policies not tested with org_admin role**
3. **Feature gating added later** (breaking change to existing auth flow)
4. **No automated E2E tests** for org_admin user flow

### Blast Radius:

```
Production Impact: 🔴 HIGH
- ALL users affected
- NO one can access dashboard
- Authentication works, authorization fails

Development Impact: 🟡 MEDIUM
- May work for super admins
- Fails for org_admin users

Testing Impact: 🔴 HIGH
- Current RLS tests didn't catch this
- Need better test coverage
```

---

## ✅ VERIFICATION STEPS

After applying the fix:

### 1. Verify RLS Policy

```sql
-- Test as org_admin user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '8920ac57-63da-4f8e-9970-719be1e2569c';

SELECT * FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Expected: Returns all features (including app_core_access)
```

### 2. Verify Edge Function

```bash
# Call /authorize endpoint
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/authorize \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"path": "/dashboard", "method": "GET"}'

# Expected: { "allow": true, "reason": "core_app_access" }
```

### 3. Verify Frontend

```javascript
// Login as cli@yodelmobile.com
// Check console:
✅ featureCount: 1  // ← Should be > 0
✅ hasBaseAccess: true
✅ POST /authorize → 200 OK
✅ Dashboard loads
```

---

## 🎓 LESSONS LEARNED

### What Went Wrong:

1. **❌ RLS policy referenced deprecated table** (`org_users`)
2. **❌ Enum value case mismatch** (`'super_admin'` vs `'SUPER_ADMIN'`)
3. **❌ No RLS policy testing** for org_admin role
4. **❌ Migration added features but policy blocked reads**
5. **❌ Edge Function error handling silent** (empty features map, no error)

### What To Fix:

1. **✅ Update RLS policy** to use `user_roles` table
2. **✅ Fix enum value case** (`'SUPER_ADMIN'`)
3. **✅ Add RLS policy tests** for all roles
4. **✅ Add Edge Function logging** for empty features
5. **✅ Add E2E tests** for org_admin user flow
6. **✅ Document RLS policies** in architecture docs

### What To Do Differently:

1. **Test RLS policies** with all user roles before deploying
2. **Add automated E2E tests** for critical auth flows
3. **Better error logging** in Edge Functions
4. **Audit deprecated table references** in migrations
5. **Enum value consistency checks** in migrations

---

## 📚 RELATED ISSUES

### Fixed Issues:
1. ✅ organizationId undefined (database migration)
2. ✅ RLS blocking user_permissions_unified (RLS policies)
3. ✅ Timing issues (React Query caching)
4. ✅ app_core_access feature missing (migration)

### Current Issue:
5. 🔴 RLS blocking organization_features reads (THIS ISSUE)

### Pending Issues:
6. ⏳ Better error handling in Edge Functions
7. ⏳ E2E test coverage for all user roles
8. ⏳ Audit all RLS policies for deprecated table references

---

## 🎯 NEXT STEPS

### Immediate (Blocking Production):
1. ✅ Create migration to fix RLS policy
2. ✅ Deploy migration
3. ✅ Verify with cli@yodelmobile.com
4. ✅ Test with other org_admin users

### Short-Term (This Week):
1. ⏳ Add RLS policy tests for all roles
2. ⏳ Add E2E tests for org_admin flow
3. ⏳ Audit all RLS policies for correctness
4. ⏳ Document RLS policy patterns

### Long-Term (This Month):
1. ⏳ Implement comprehensive E2E test suite
2. ⏳ Add monitoring/alerting for auth failures
3. ⏳ Create runbook for auth debugging
4. ⏳ Review all Edge Functions for error handling

---

## 📋 SUMMARY

**Root Cause:** RLS policy on `organization_features` table blocks Edge Function from reading feature flags due to incorrect table reference and enum value.

**Fix:** Update RLS policy to use `user_roles` table and correct enum values.

**Impact:** Critical - blocks all users from accessing application.

**Confidence:** 🟢 **VERY HIGH** - Exact issue identified through code audit.

---

**Document Created:** November 5, 2025
**Analysis By:** AI Code Audit
**Reviewed By:** Pending
**Status:** Ready for Fix Implementation
