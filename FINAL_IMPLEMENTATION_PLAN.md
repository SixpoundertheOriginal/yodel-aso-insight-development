# Final Implementation Plan - Agency-Client Support

**Date:** November 7, 2025
**Decision:** Option A - Reviews Page stays INDEPENDENT per org
**Scope:** Dashboard V2 / BigQuery analytics ONLY

---

## 📋 Executive Summary

### What We're Fixing:
**Dashboard V2 is broken for Yodel Mobile (agency) users because they can't access client organization apps from BigQuery.**

### Why It's Broken:
1. Yodel Mobile is an AGENCY that manages client organizations
2. `agency_clients` table EXISTS and has relationships configured
3. BigQuery apps belong to CLIENT organizations (not Yodel Mobile)
4. Edge Function doesn't check `agency_clients` table
5. Yodel Mobile gets 0 apps → Dashboard V2 fails

### Solution:
**Add agency-client relationship support to BigQuery Edge Function ONLY.**
- Reviews page stays independent (each org manages own competitor lists)
- Dashboard V2 gets agency support (agency sees client BigQuery apps)

---

## 🎯 Scope Boundaries

### ✅ IN SCOPE (Dashboard V2 / BigQuery):
| Component | Type | Action |
|-----------|------|--------|
| `bigquery-aso-data` Edge Function | Edge Function | Add agency_clients query |
| `org_app_access` table | Database (Optional) | RLS update for safety |

### ❌ OUT OF SCOPE (Reviews Page stays independent):
| Component | Type | Reason |
|-----------|------|--------|
| `monitored_apps` table | Database | Each org manages own list |
| `app_competitors` table | Database | Each org manages own competitors |
| `review_cache` table | Database | Each org caches own reviews |
| `useMonitoredApps` hook | Frontend | No changes needed |
| `useAppCompetitors` hook | Frontend | No changes needed |
| Reviews page components | Frontend | Works as-is |

---

## 🔍 Final System Audit

### Current State

#### Yodel Mobile (Agency):
```
Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
Name: Yodel Mobile
Type: AGENCY
```

#### Managed Client Organizations:
```sql
SELECT * FROM agency_clients WHERE agency_org_id = '7cccba3f...';

Result:
- Demo Analytics Organization (dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f)
- Demo Analytics (550e8400-e29b-41d4-a716-446655440002)
```

#### Apps in BigQuery:
```
org_app_access:
- Yodel Mobile: 0 apps ❌
- Demo Analytics Organization: 23 apps ✅
- Demo Analytics: ? apps ✅
```

---

## 🔧 Required Changes

### Change 1: Edge Function (CRITICAL)

**File:** `supabase/functions/bigquery-aso-data/index.ts`
**Lines:** 269-283 (after `resolvedOrgId` is set)

#### Current Code (Lines 269-283):
```typescript
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .eq("organization_id", resolvedOrgId)  // ❌ Only checks Yodel Mobile
  .is("detached_at", null);
```

#### New Code (Replacement):
```typescript
// 🎯 [AGENCY SUPPORT] Check if this organization is an agency
log(requestId, "[AGENCY] Checking for agency relationships");

const { data: managedClients, error: agencyError } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)
  .eq("is_active", true);

if (agencyError) {
  log(requestId, "[AGENCY] Error checking agency status", agencyError);
}

// Build list of organizations to query (self + managed clients)
let organizationsToQuery = [resolvedOrgId];
if (managedClients && managedClients.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];

  log(requestId, "[AGENCY] Agency mode enabled", {
    agency_org_id: resolvedOrgId,
    managed_client_count: clientOrgIds.length,
    client_org_ids: clientOrgIds,
    total_orgs_to_query: organizationsToQuery.length
  });
}

// [ACCESS] Get app access for ALL organizations (agency + managed clients)
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)  // ✅ Query all orgs
  .is("detached_at", null);

if (accessError) {
  log(requestId, "[ACCESS] Failed to check app access", accessError);
  return new Response(
    JSON.stringify({ error: "Failed to validate app access", details: accessError.message }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

const allowedAppIds = (accessData ?? []).map((item) => item.app_id).filter((id): id is string => Boolean(id));

log(requestId, "[ACCESS] App access validated", {
  organizations_queried: organizationsToQuery.length,
  is_agency: managedClients && managedClients.length > 0,
  requested_apps: Array.isArray(requestedAppIds) ? requestedAppIds.length : 0,
  allowed_apps: allowedAppIds.length,
  apps: allowedAppIds,
});
```

**Key Changes:**
1. Query `agency_clients` table for managed client orgs
2. Build array of organization IDs (agency + clients)
3. Change `.eq()` to `.in()` to query multiple orgs
4. Add comprehensive logging for debugging

---

### Change 2: RLS Policy (OPTIONAL - Safety Layer)

**File:** `supabase/migrations/20251107200000_add_agency_rls_org_app_access.sql`

**Purpose:** Add RLS safety layer (Edge Function uses service role, so this is defensive)

```sql
-- ==============================================================================
-- Add Agency Support to org_app_access RLS
-- Date: November 7, 2025
-- Purpose: Allow agency users to see client organization apps
-- ==============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users see their org app access" ON org_app_access;

-- Create enhanced policy with agency support
CREATE POLICY "Users see org and agency client app access"
ON org_app_access FOR SELECT
USING (
  organization_id IN (
    -- User's direct organization
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()

    UNION

    -- Client organizations (if user is in agency)
    SELECT ac.client_org_id
    FROM agency_clients ac
    JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
    WHERE ur.user_id = auth.uid()
      AND ac.is_active = true
  )
  OR EXISTS (
    -- Super admin bypass
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Verify policy exists
DO $$
BEGIN
  RAISE NOTICE '✅ Agency RLS policy created for org_app_access';
END $$;
```

**Note:** This is optional because Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. But it's good practice for:
1. Defensive security (in case service role isn't used)
2. Frontend queries (if any directly access org_app_access)
3. Future-proofing

---

## 📊 Expected Results After Fix

### Before Fix:
```
User: cli@yodelmobile.com
Login → usePermissions() → Yodel Mobile org
Navigate to /dashboard-v2
  ↓
Edge Function called with org_id = Yodel Mobile
  ↓
Query: org_app_access WHERE org_id = Yodel Mobile
  ↓
Result: 0 apps ❌
  ↓
Dashboard V2: "No apps attached to this organization" ❌
```

### After Fix:
```
User: cli@yodelmobile.com
Login → usePermissions() → Yodel Mobile org
Navigate to /dashboard-v2
  ↓
Edge Function called with org_id = Yodel Mobile
  ↓
Check: agency_clients WHERE agency_org_id = Yodel Mobile
Found: 2 client orgs
  ↓
Query: org_app_access WHERE org_id IN (Yodel Mobile, Client1, Client2)
  ↓
Result: 23+ apps from client orgs ✅
  ↓
Dashboard V2: Shows BigQuery data for all client apps ✅
```

---

## ✅ What Stays the Same (Reviews Page)

### Reviews Page Flow (Unchanged):
```
User: cli@yodelmobile.com (Yodel Mobile org)
Navigate to /growth-accelerators/reviews
  ↓
Search for any App Store app (uses scraper)
  ↓
Add to monitoring
  ↓
INSERT INTO monitored_apps (organization_id = Yodel Mobile, ...)
  ↓
monitored_apps: Shows only Yodel Mobile's apps ✅
```

### Why This is Correct:
- Each org maintains independent competitor watch list
- Yodel Mobile monitors their competitors
- Client orgs monitor their competitors
- No data sharing between orgs for Reviews
- Clean separation of concerns

---

## 🧪 Testing Plan

### Test 1: Dashboard V2 - Agency Access
**Goal:** Verify Yodel Mobile sees client org apps

**Steps:**
1. Login as `cli@yodelmobile.com`
2. Navigate to `/dashboard-v2`
3. Observe console logs for `[AGENCY]` messages
4. Verify dashboard loads with data

**Expected Results:**
```
Console:
✅ [AGENCY] Checking for agency relationships
✅ [AGENCY] Agency mode enabled
   - managed_client_count: 2
   - client_org_ids: [dbdb0cc5..., 550e8400...]
   - total_orgs_to_query: 3
✅ [ACCESS] App access validated
   - organizations_queried: 3
   - is_agency: true
   - allowed_apps: 23

Dashboard:
✅ Shows ASO metrics
✅ Shows charts with data
✅ App selector populated
✅ No errors
```

---

### Test 2: Dashboard V2 - Non-Agency Access
**Goal:** Verify non-agency orgs still work

**Steps:**
1. Login as user from Demo Analytics Organization
2. Navigate to `/dashboard-v2`
3. Observe console logs

**Expected Results:**
```
Console:
✅ [AGENCY] Checking for agency relationships
   (No managed clients found)
✅ [ACCESS] App access validated
   - organizations_queried: 1
   - is_agency: false
   - allowed_apps: 23

Dashboard:
✅ Shows their own apps only
✅ Works as before
```

---

### Test 3: Reviews Page - Independent Operation
**Goal:** Verify Reviews page unaffected

**Steps:**
1. Login as `cli@yodelmobile.com`
2. Navigate to `/growth-accelerators/reviews`
3. Search and add an app to monitoring
4. Check monitored apps list

**Expected Results:**
```
✅ Search works (iTunes scraper)
✅ Can add any App Store app
✅ App saved under Yodel Mobile org
✅ Monitored apps shows only Yodel Mobile apps
✅ Does NOT show client org monitored apps
✅ Behavior unchanged
```

---

### Test 4: Edge Function Logging
**Goal:** Verify agency detection and logging

**Command:**
```bash
supabase functions logs bigquery-aso-data --tail
```

**Expected Output:**
```
[AGENCY] Checking for agency relationships
[AGENCY] Agency mode enabled
  agency_org_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
  managed_client_count: 2
  client_org_ids: [dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f, 550e8400-e29b-41d4-a716-446655440002]
[ACCESS] App access validated
  organizations_queried: 3
  is_agency: true
  allowed_apps: 23
[BIGQUERY] Query completed
  rowCount: 150
```

---

## 🚨 Risk Assessment

### Low Risk:
✅ **Code Change:** Additive only (doesn't break existing functionality)
✅ **Scope:** Single Edge Function (bigquery-aso-data)
✅ **Fallback:** If agency_clients query fails, falls back to single org
✅ **Testing:** Easy to test both agency and non-agency scenarios
✅ **Rollback:** Simple Edge Function redeployment

### Potential Issues & Mitigations:

#### Issue 1: Query Performance
**Risk:** Querying 3 orgs instead of 1
**Mitigation:**
- Still fast (indexed on organization_id)
- Typical: 1-3 client orgs per agency
- BigQuery query is the bottleneck, not Postgres

#### Issue 2: Empty Response Transform
**Risk:** Empty data gets transformed to processed format
**Status:** ALREADY HANDLED in previous fix (commit 466f2c0)
- Hook handles empty responses
- Returns default processed structure

#### Issue 3: Wrong apps returned
**Risk:** Agency sees apps they shouldn't
**Mitigation:**
- RLS policy (if applied) provides safety
- agency_clients table controls relationships
- is_active flag allows disabling access

---

## 📁 Files to Modify

### Required:
1. ✅ `supabase/functions/bigquery-aso-data/index.ts` (lines 269-283)

### Optional:
2. ⚠️ `supabase/migrations/20251107200000_add_agency_rls_org_app_access.sql` (new file)

### Not Modified:
- ❌ `src/hooks/useMonitoredApps.ts` - No changes (Reviews independent)
- ❌ `src/hooks/useAppCompetitors.ts` - No changes (Reviews independent)
- ❌ `src/pages/growth-accelerators/reviews.tsx` - No changes
- ❌ `supabase/migrations/*_monitored_apps.sql` - No changes
- ❌ `supabase/migrations/*_app_competitors.sql` - No changes

---

## 🎯 Implementation Steps

### Step 1: Prepare (5 minutes)
```bash
# 1. Create feature branch
git checkout -b feat/agency-bigquery-support

# 2. Backup current Edge Function (optional)
cp supabase/functions/bigquery-aso-data/index.ts supabase/functions/bigquery-aso-data/index.ts.backup

# 3. Create migration file (if using RLS)
touch supabase/migrations/20251107200000_add_agency_rls_org_app_access.sql
```

---

### Step 2: Implement Changes (10 minutes)

**A. Update Edge Function**
```bash
# Edit file
nano supabase/functions/bigquery-aso-data/index.ts

# Apply changes at lines 269-283
# (See "Change 1" section above for exact code)
```

**B. Create Migration (Optional)**
```bash
# Add RLS policy SQL
# (See "Change 2" section above for exact SQL)
```

---

### Step 3: Deploy (5 minutes)

**Deploy Edge Function:**
```bash
supabase functions deploy bigquery-aso-data
```

**Deploy Migration (if created):**
```bash
supabase db push
```

---

### Step 4: Test (10 minutes)

**A. Test Agency User:**
```bash
# Login as cli@yodelmobile.com
# Navigate to /dashboard-v2
# Verify data loads
```

**B. Check Logs:**
```bash
supabase functions logs bigquery-aso-data --tail
# Look for [AGENCY] messages
```

**C. Test Non-Agency:**
```bash
# Login as non-agency user
# Verify Dashboard V2 still works
```

**D. Test Reviews Page:**
```bash
# Login as any user
# Navigate to /growth-accelerators/reviews
# Verify independent operation
```

---

### Step 5: Verify & Commit (5 minutes)

```bash
# Verify all tests pass
# Check console for errors
# Test both agency and non-agency users

# Commit changes
git add supabase/functions/bigquery-aso-data/index.ts
git add supabase/migrations/20251107200000_add_agency_rls_org_app_access.sql # if created
git commit -m "feat: add agency-client support to Dashboard V2 BigQuery access

- Add agency_clients relationship check to bigquery-aso-data Edge Function
- Query apps from agency + managed client organizations
- Add comprehensive logging for agency mode detection
- Optional: Add RLS policy for org_app_access (defensive security)

Impact:
- Dashboard V2 now works for Yodel Mobile (agency) users
- Agency sees BigQuery apps from all managed client organizations
- Reviews page unaffected (remains independent per org)

Tested:
- Agency user (Yodel Mobile): ✅ Sees 23+ apps from clients
- Non-agency user: ✅ Sees own apps only
- Reviews page: ✅ Independent operation maintained

Ref: FINAL_IMPLEMENTATION_PLAN.md"
```

---

## 📊 Success Criteria

### ✅ Definition of Done:

1. **Dashboard V2 Works for Agency:**
   - [ ] Yodel Mobile users can access /dashboard-v2
   - [ ] See apps from Demo Analytics Organization
   - [ ] See apps from Demo Analytics
   - [ ] Charts display data
   - [ ] No console errors

2. **Non-Agency Users Unaffected:**
   - [ ] Demo Analytics Organization users see their apps
   - [ ] Other orgs work as before
   - [ ] No breaking changes

3. **Reviews Page Independent:**
   - [ ] Yodel Mobile sees only their monitored apps
   - [ ] Client orgs see only their monitored apps
   - [ ] Can add/remove apps normally
   - [ ] No cross-org data leakage

4. **Logging Comprehensive:**
   - [ ] Console shows [AGENCY] messages
   - [ ] Can identify agency vs non-agency requests
   - [ ] App count matches expectations

5. **Code Quality:**
   - [ ] Clear comments explaining agency logic
   - [ ] Error handling for agency_clients query
   - [ ] Backward compatible (works with or without agency)

---

## 🔄 Rollback Plan

**If something goes wrong:**

### Quick Rollback (2 minutes):
```bash
# Revert to previous Edge Function version
supabase functions deploy bigquery-aso-data --restore-version <previous-version-id>
```

### Full Rollback (5 minutes):
```bash
# Revert code changes
git revert HEAD

# Redeploy previous version
supabase functions deploy bigquery-aso-data

# Rollback migration (if applied)
supabase db reset --version <previous-migration>
```

---

## 📚 Documentation Updates

After successful deployment:

1. **Update ARCHITECTURE.md:**
   - Document agency-client model
   - Explain Dashboard V2 vs Reviews separation

2. **Update app-discovery-system.md:**
   - Add agency_clients table documentation
   - Explain BigQuery app discovery for agencies

3. **Create AGENCY_MODEL.md:**
   - Complete agency-client architecture guide
   - How to add new agency relationships
   - Troubleshooting guide

---

## 🎯 Summary

### What Gets Fixed:
✅ **Dashboard V2** - Agency users see client org BigQuery apps

### What Stays Unchanged:
✅ **Reviews Page** - Independent per org (correct behavior)

### Implementation Complexity:
- **Low** - Single Edge Function change
- **~30 minutes** total implementation time
- **Low risk** - Additive, backward compatible

### Files Modified:
- **1 required** - Edge Function
- **1 optional** - Migration (RLS policy)

### Testing:
- **4 test scenarios** - All documented
- **Easy to verify** - Console logs + UI checks

---

## ✅ Final Checklist

**Pre-Implementation:**
- [ ] Read and understand FINAL_IMPLEMENTATION_PLAN.md
- [ ] Review exact code changes (lines 269-283)
- [ ] Understand agency vs non-agency behavior
- [ ] Confirm Reviews page should stay independent
- [ ] Backup current Edge Function (optional)

**Implementation:**
- [ ] Create feature branch
- [ ] Update bigquery-aso-data Edge Function
- [ ] Create RLS migration (optional)
- [ ] Deploy Edge Function
- [ ] Deploy migration (if created)

**Testing:**
- [ ] Test as Yodel Mobile user
- [ ] Test as non-agency user
- [ ] Check Edge Function logs
- [ ] Verify Reviews page unaffected
- [ ] Check console for errors

**Post-Implementation:**
- [ ] Commit changes with descriptive message
- [ ] Update documentation
- [ ] Monitor logs for issues
- [ ] Close related issues/tickets

---

**Status:** ✅ READY FOR IMPLEMENTATION
**Estimated Time:** 30 minutes
**Risk Level:** LOW
**Confidence:** HIGH

---

**Next Action:** Review this plan, confirm approach, then proceed with implementation.
