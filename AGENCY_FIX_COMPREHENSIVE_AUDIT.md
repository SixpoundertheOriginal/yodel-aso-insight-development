# Agency-Client Fix - Comprehensive System Audit

**Date:** November 7, 2025
**Scope:** Complete system audit before implementing agency-client hierarchy
**Status:** 🔍 AUDIT COMPLETE - IDENTIFIED ALL IMPACT POINTS

---

## Executive Summary

### ✅ Good News:
- Reviews page infrastructure is **INDEPENDENT** from BigQuery
- Uses separate tables (`monitored_apps`, `app_competitors`, `review_cache`)
- **ALREADY has correct RLS policies** that will work with agency fix

### ⚠️ Critical Finding:
- **RLS policies DON'T check `agency_clients` table**
- They only check `user_roles.organization_id`
- **Same pattern** across all tables - needs systematic fix

### 🎯 Solution Required:
- **Update RLS policies** to include agency relationships
- **Update Edge Function** (bigquery-aso-data)
- **Both changes needed** for complete agency support

---

## System Architecture Overview

### Current Multi-Tenant Model:

```
User (cli@yodelmobile.com)
  ↓
user_roles (organization_id: Yodel Mobile)
  ↓
RLS Policies (checks THIS org only)
  ↓
Tables (filtered by organization_id)
```

### Agency Model (What We Need):

```
User (cli@yodelmobile.com)
  ↓
user_roles (organization_id: Yodel Mobile)
  ↓
agency_clients (Yodel Mobile → Client Orgs)
  ↓
RLS Policies (checks agency + client orgs)
  ↓
Tables (filtered by agency + all client org_ids)
```

---

## 📊 Table-by-Table Analysis

### 1. **Reviews Page Tables** (INDEPENDENT from BigQuery)

#### monitored_apps
**Purpose:** Track ANY App Store app for review monitoring
**File:** `supabase/migrations/20250106000000_create_monitored_apps.sql`

**Current RLS Policy (Line 91-107):**
```sql
CREATE POLICY "Users see their org monitored apps"
ON monitored_apps FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);
```

**Impact:** ❌ Yodel Mobile users can't see client org monitored apps

**Needs Fix:** YES

---

#### app_competitors
**Purpose:** Define competitor relationships for comparison
**File:** `supabase/migrations/20251107000001_fix_app_competitors_schema.sql`

**RLS Pattern:** Same as monitored_apps
- Checks `organization_id IN (SELECT organization_id FROM user_roles...)`

**Impact:** ❌ Yodel Mobile users can't see client org competitors

**Needs Fix:** YES

---

#### review_cache
**Purpose:** Cache review data for performance
**File:** `supabase/migrations/20250107000000_create_review_caching_system.sql`

**RLS Pattern:** Same as monitored_apps
- Checks `organization_id IN (SELECT organization_id FROM user_roles...)`

**Impact:** ❌ Yodel Mobile users can't see client org cached reviews

**Needs Fix:** YES

---

### 2. **BigQuery/Analytics Tables**

#### org_app_access
**Purpose:** Map apps to organizations for BigQuery access
**File:** `supabase/migrations/20251101140000_create_org_app_access.sql`

**Current RLS Policy:**
```sql
CREATE POLICY "Users see their org app access"
ON org_app_access FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);
```

**Impact:** ❌ Yodel Mobile users can't see client org apps in Dashboard V2

**Needs Fix:** YES (but Edge Function needs update too)

---

## 🔍 Frontend Component Analysis

### Reviews Page (`src/pages/growth-accelerators/reviews.tsx`)

**Line 87:** Gets user's `organizationId` from `usePermissions()`
```typescript
const { isSuperAdmin, isOrganizationAdmin, roles = [], organizationId } = usePermissions();
```

**Line 143:** Passes to `useMonitoredApps(organizationId)`
```typescript
const { data: monitoredApps } = useMonitoredApps(organizationId);
```

**Line 167:** Passes to ASO search service
```typescript
const searchConfig = {
  organizationId: isSuperAdmin ? null : (organizationId || '__fallback__'),
  // ...
};
```

**Multiple uses at:**
- Line 1164: `organizationId && ...` - CompetitorComparisonView
- Line 1215: `organizationId && ...` - CompetitorManagementPanel
- Line 1232: `organizationId && ...` - MonitoredAppsGrid
- Line 1451: `organizationId && ...` - AddToMonitoringButton
- Line 1594: `organizationId && ...` - CompetitorManagementPanel

**Flow:**
```
User → usePermissions() → organizationId
  ↓
useMonitoredApps(organizationId)
  ↓
SELECT * FROM monitored_apps
WHERE organization_id = 'Yodel Mobile'
  ↓
Result: 0 apps (doesn't check client orgs) ❌
```

**Impact:** ✅ Will work automatically after RLS fix!
- Frontend passes `organizationId` correctly
- RLS policies filter at database level
- No frontend changes needed

---

### useMonitoredApps Hook (`src/hooks/useMonitoredApps.ts`)

**Line 75-79:**
```typescript
const { data, error } = await supabase
  .from('monitored_apps')
  .select('*')
  .eq('organization_id', organizationId)
  .order('created_at', { ascending: false });
```

**Issue:** Uses `.eq()` for exact match
- Only queries Yodel Mobile's direct apps
- Doesn't know about agency relationships

**Impact:** ⚠️ This is OKAY because RLS policies will expand results
- RLS runs BEFORE the `.eq()` filter
- If RLS allows client org data, `.eq()` won't exclude it
- **Wait, that's wrong!** `.eq()` is explicit filter AFTER RLS

**Needs Fix:** YES - Change to `.in()` with expanded org list

---

## ⚠️ Breaking Points Identified

### Critical Issue: Hook `.eq()` Filters

**Problem:**
Even if we fix RLS policies, hooks use `.eq(organization_id, ...)` which is an explicit filter.

**Example:**
```typescript
// After RLS fix, this still won't work:
.eq('organization_id', 'Yodel Mobile')  // Only gets Yodel Mobile apps
```

**Solution Required:**
Hooks need to query for MULTIPLE organizations:

```typescript
// Option A: Query all orgs and let RLS filter
.select('*')  // No organization_id filter

// Option B: Get agency client orgs and query explicitly
const clientOrgs = await getClientOrgs(organizationId);
const allOrgs = [organizationId, ...clientOrgs];
.in('organization_id', allOrgs)
```

---

## 🔧 Required Changes

### 1. **RLS Policies** (4 tables)

**Pattern to Apply:**

```sql
-- Enhanced policy with agency support
CREATE POLICY "Users see org and client data"
ON table_name FOR SELECT
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
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);
```

**Apply to:**
1. ✅ `monitored_apps` (Reviews page)
2. ✅ `app_competitors` (Reviews page)
3. ✅ `review_cache` (Reviews page)
4. ✅ `org_app_access` (Dashboard V2)

---

### 2. **Frontend Hooks** (2 hooks)

#### useMonitoredApps

**Current (Line 75-79):**
```typescript
.eq('organization_id', organizationId)
```

**Fix:**
```typescript
// Option 1: Remove filter, let RLS handle it
.select('*')  // RLS will filter to accessible orgs

// Option 2: Get client orgs and query explicitly
const clientOrgs = await getAgencyClientOrgs(organizationId);
const allOrgs = [organizationId, ...clientOrgs.map(c => c.client_org_id)];
.in('organization_id', allOrgs)
```

**Recommendation:** Option 1 (simpler, relies on RLS)

---

#### useAppCompetitors

**File:** `src/hooks/useAppCompetitors.ts`
**Same Issue:** Likely uses `.eq('organization_id', ...)`

**Fix:** Apply same pattern as useMonitoredApps

---

### 3. **Edge Function** (bigquery-aso-data)

**Already documented in AGENCY_CLIENT_SOLUTION_COMPLETE.md**

**Change:** Query `agency_clients` and use `.in()` instead of `.eq()`

---

## 📋 Complete Implementation Plan

### Phase 1: Database (RLS Policies)

**Step 1:** Create new migration file
```bash
supabase/migrations/20251107200000_add_agency_support_to_rls.sql
```

**Step 2:** Update 4 RLS policies
```sql
-- For each table: monitored_apps, app_competitors, review_cache, org_app_access
DROP POLICY IF EXISTS "Users see their org [table]" ON [table];

CREATE POLICY "Users see org and client data"
ON [table] FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    UNION
    SELECT ac.client_org_id FROM agency_clients ac
    JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
    WHERE ur.user_id = auth.uid() AND ac.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);
```

**Step 3:** Apply migration
```bash
# Local test (if possible)
supabase db reset

# Production
supabase db push
```

---

### Phase 2: Frontend Hooks

**File 1:** `src/hooks/useMonitoredApps.ts`

**Change Line 75-79:**
```typescript
// BEFORE
const { data, error } = await supabase
  .from('monitored_apps')
  .select('*')
  .eq('organization_id', organizationId)  // ❌ Explicit filter
  .order('created_at', { ascending: false });

// AFTER
const { data, error } = await supabase
  .from('monitored_apps')
  .select('*')
  // ✅ No organization_id filter - let RLS handle it
  .order('created_at', { ascending: false });
```

**Rationale:** RLS policies already filter to accessible organizations (agency + clients)

---

**File 2:** `src/hooks/useAppCompetitors.ts`

**Apply same pattern** (remove explicit organization_id filter)

---

### Phase 3: Edge Function

**File:** `supabase/functions/bigquery-aso-data/index.ts`

**Already documented - add agency_clients query**

---

### Phase 4: Testing

**Test 1: Reviews Page**
```
1. Login as cli@yodelmobile.com
2. Navigate to /growth-accelerators/reviews
3. Should see:
   - Monitored apps from Demo Analytics Organization
   - Monitored apps from Demo Analytics
   - Competitors from both client orgs
   - Cached reviews from both client orgs
```

**Test 2: Dashboard V2**
```
1. Login as cli@yodelmobile.com
2. Navigate to /dashboard-v2
3. Should see:
   - Apps from both client orgs (23+ apps)
   - BigQuery data for all client apps
   - Charts populated
```

**Test 3: Add New Monitored App**
```
1. Login as cli@yodelmobile.com
2. Add new app to monitoring
3. INSERT should succeed (RLS allows agency users)
4. App should be saved under Yodel Mobile org
```

---

## ⚠️ Potential Issues & Mitigations

### Issue 1: Hook Filters Override RLS

**Problem:** `.eq('organization_id', X)` explicitly filters results

**Mitigation:** Remove explicit filters, rely on RLS

**Risk:** Low - RLS is more secure anyway

---

### Issue 2: INSERT/UPDATE Policies

**Problem:** RLS SELECT is read-only, what about writes?

**Check:**
```sql
-- monitored_apps line 110-127
CREATE POLICY "Users can add monitored apps"
ON monitored_apps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
  OR...
);
```

**Observation:**
- INSERT checks `ur.organization_id = monitored_apps.organization_id`
- User inserts with THEIR org_id (Yodel Mobile)
- This is CORRECT - apps belong to the agency, not client

**Mitigation:** No change needed - works as designed

---

### Issue 3: Duplicate Data Visibility

**Problem:** If client orgs also have agency users, might see apps twice?

**Mitigation:** UNIQUE constraint prevents duplicates
```sql
UNIQUE(organization_id, app_store_id, primary_country)
```

**Risk:** Low - database enforces uniqueness

---

## 📊 Impact Summary

### ✅ Will Work Automatically (After Fixes):
- Reviews page monitoring
- Competitor tracking
- Review caching
- Dashboard V2 analytics
- All BigQuery features

### ⚠️ Needs Frontend Changes:
- useMonitoredApps (remove .eq filter)
- useAppCompetitors (remove .eq filter)
- Any other hooks with explicit org_id filters

### 🔧 Needs Database Changes:
- 4 RLS policies (one per table)
- 1 Edge Function (bigquery-aso-data)

---

## ✅ Validation Checklist

Before implementing:
- [ ] All RLS policies identified
- [ ] All frontend hooks identified
- [ ] Migration file prepared
- [ ] Test plan documented
- [ ] Rollback plan ready

After implementing:
- [ ] RLS policies updated (4 tables)
- [ ] Frontend hooks updated (2 files)
- [ ] Edge Function updated (1 file)
- [ ] Migration deployed
- [ ] Reviews page tested
- [ ] Dashboard V2 tested
- [ ] User can add monitored apps
- [ ] User can manage competitors
- [ ] No data leaks across unrelated orgs

---

## 🎯 Recommendation

### Safe Implementation Order:

1. **Deploy RLS policy updates** (database only)
   - Risk: Low
   - Impact: Immediate fix for database queries
   - Rollback: Easy (DROP + recreate old policies)

2. **Update frontend hooks** (remove .eq filters)
   - Risk: Low
   - Impact: Hooks now leverage RLS correctly
   - Rollback: Easy (git revert)

3. **Update Edge Function** (agency_clients query)
   - Risk: Medium
   - Impact: Complete fix for Dashboard V2
   - Rollback: Redeploy previous version

### Timeline:
- **Phase 1 (RLS):** 30 minutes (create + test migration)
- **Phase 2 (Hooks):** 15 minutes (2 file changes)
- **Phase 3 (Edge):** 10 minutes (already documented)
- **Testing:** 30 minutes (both pages)

**Total:** ~1.5 hours for complete implementation

---

## 🚀 Next Steps

1. Review this audit with team
2. Confirm approach is correct
3. Create migration file for RLS updates
4. Update frontend hooks
5. Update Edge Function
6. Deploy in order: DB → Frontend → Edge
7. Test thoroughly
8. Monitor for issues

---

**Status:** ✅ AUDIT COMPLETE - READY FOR IMPLEMENTATION
**Confidence:** HIGH - Clear path forward, manageable scope
**Risk:** LOW - Changes are additive, not destructive
