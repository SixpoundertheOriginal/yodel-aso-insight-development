# Diagnose Route Access Issue - Step-by-Step

**Date**: 2025-11-09
**Issue**: Console shows `routes=6` instead of `routes=~40`
**Status**: 🔴 **ACTIVE ISSUE**

---

## 🎯 Quick Diagnosis (5 Minutes)

Run these commands **in order** and share the results.

---

### Step 1: Check Database access_level Column

```bash
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -c "
SELECT
  id,
  name,
  access_level,
  subscription_tier,
  settings
FROM organizations
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
"
```

**Expected Output**:
```
id                                    | name         | access_level | subscription_tier | settings
--------------------------------------+--------------+--------------+-------------------+----------
7cccba3f-0a8f-446f-9dba-86e9cb68c92b | Yodel Mobile | full         | free              | {...}
```

**If access_level is NULL or 'reporting_only'**: ← **THIS IS THE ISSUE**

---

### Step 2: Check Migration Status

```bash
supabase migration list | grep grant_yodel_mobile_full_access
```

**Expected Output**:
```
20251109060000_grant_yodel_mobile_full_access.sql | Applied
```

**If shows "Pending" or not listed**: ← **MIGRATION NOT APPLIED**

---

### Step 3: Check TypeScript Types

```bash
grep -A 10 "export type Organizations" src/integrations/supabase/types.ts | grep access_level
```

**Expected Output**:
```
access_level?: string | null
```

**If NO output**: ← **TYPES NOT GENERATED**

---

### Step 4: Check React Query Cache (Browser Console)

**In browser console, run**:
```javascript
const profile = queryClient.getQueryData(['user-profile']);
console.log('=== PROFILE DEBUG ===');
console.log('Full profile:', profile);
console.log('Organizations:', profile?.organizations);
console.log('Access level:', profile?.organizations?.access_level);
console.log('Expected: "full", Got:', profile?.organizations?.access_level);
```

**Expected Output**:
```
Access level: "full"
```

**If "reporting_only" or undefined**: ← **CACHE STALE OR COLUMN MISSING**

---

### Step 5: Check getAllowedRoutes Logic (Browser Console)

**In browser console, run**:
```javascript
// Get current values
const { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    organizations!profiles_organization_id_fkey(name, subscription_tier, slug, settings, access_level)
  `)
  .eq('id', '8920ac57-63da-4f8e-9970-719be1e2569c')
  .single();

console.log('=== DIRECT QUERY DEBUG ===');
console.log('Query result:', profile);
console.log('Organizations:', profile?.organizations);
console.log('Access level from DB:', profile?.organizations?.access_level);
```

**Expected Output**:
```
Access level from DB: "full"
```

**If undefined**: ← **COLUMN NOT IN QUERY OR DOESN'T EXIST**

---

## 🔍 Diagnosis Decision Tree

```
Step 1 Result?
  ↓
  ├─ access_level = 'full' → Go to Step 3 (types issue)
  │
  ├─ access_level = 'reporting_only' → Go to Step 2 (migration issue)
  │
  ├─ access_level = NULL → Go to Step 2 (column exists but no value)
  │
  └─ Column doesn't exist → CRITICAL: Migration 20251109060000 not applied
```

---

## 🔧 Fix Based on Diagnosis

### Fix 1: If access_level = 'reporting_only' or NULL

**Issue**: Value not set correctly

**Fix**:
```sql
UPDATE organizations
SET access_level = 'full'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
```

**Verify**:
```sql
SELECT access_level FROM organizations
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
-- Should show: full
```

**Then**: Hard refresh browser (Cmd+Shift+R)

---

### Fix 2: If Migration Not Applied

**Issue**: Migration 20251109060000 not applied

**Fix**:
```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -f supabase/migrations/20251109060000_grant_yodel_mobile_full_access.sql
```

**Verify**:
```bash
supabase migration list | grep grant_yodel_mobile_full_access
# Should show: Applied
```

**Then**: Restart dev server and hard refresh browser

---

### Fix 3: If Types Missing access_level

**Issue**: TypeScript types not regenerated after migration

**Fix**:
```bash
# Regenerate types from database
supabase gen types typescript --db-url "$DATABASE_URL" > src/integrations/supabase/types.ts

# Restart dev server
npm run dev:frontend
```

**Verify**:
```bash
grep "access_level" src/integrations/supabase/types.ts
# Should show: access_level?: string | null
```

**Then**: Hard refresh browser

---

### Fix 4: If Cache Stale

**Issue**: React Query cache has old value

**Fix (Browser Console)**:
```javascript
// Clear and refetch
queryClient.invalidateQueries(['user-profile']);
await queryClient.refetchQueries(['user-profile']);

// Verify
const profile = queryClient.getQueryData(['user-profile']);
console.log('New access_level:', profile?.organizations?.access_level);
// Should show: "full"
```

**Or**: Hard refresh browser (Cmd+Shift+R)

---

## 📊 Verification After Fix

### 1. Check Console Logs

**Should Show**:
```
[Sidebar] Loaded: org=7cccba3f..., role=ORGANIZATION_ADMIN, routes=~40
                                                              ^^^^^^^^
                                                          SHOULD BE ~40!
```

**If Still Shows routes=6**: Issue not fixed, re-run diagnosis

---

### 2. Check Navigation Menu

**Should See**:
- Overview
- Dashboard
- Dashboard V2
- Conversion Analysis
- Insights
- ASO AI Hub
- **Keywords** ← Should be visible
- **Reviews** ← Should be visible
- Competitor Overview
- And 30+ more pages

**If Missing Keywords/Reviews**: Issue not fixed

---

### 3. Database Verification

```sql
SELECT
  o.name,
  o.access_level,
  COUNT(DISTINCT nav.route_path) as accessible_routes
FROM organizations o
CROSS JOIN LATERAL (
  SELECT unnest(ARRAY[
    '/dashboard-v2',
    '/dashboard/executive',
    '/growth-accelerators/keywords',
    '/growth-accelerators/reviews',
    '/overview',
    '/dashboard',
    '/conversion-analysis'
    -- ... all routes would be listed here
  ]) as route_path
  WHERE o.access_level = 'full'
    OR route_path IN (
      '/dashboard-v2',
      '/dashboard/executive',
      '/dashboard/analytics',
      '/dashboard/conversion-rate',
      '/growth-accelerators/keywords',
      '/growth-accelerators/reviews'
    )
) nav
WHERE o.id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
GROUP BY o.name, o.access_level;
```

**Expected**:
```
name         | access_level | accessible_routes
-------------+--------------+------------------
Yodel Mobile | full         | ~40
```

---

## 🎯 Most Likely Root Cause

Based on console logs showing `routes=6`, the most likely issue is:

**Hypothesis 1 (80% probability)**: `access_level` column exists but value is `'reporting_only'` instead of `'full'`

**Evidence**:
- User has correct role (org_admin) ✅
- Permissions loaded correctly ✅
- But routes=6 (which is DEMO_REPORTING_ROUTES) ❌

**Logic in getAllowedRoutes**:
```typescript
// Line 63-65
if (orgAccessLevel === 'reporting_only') {
  return [...DEMO_REPORTING_ROUTES];  // ← Returns 6 routes
}
```

**Fix**: Run Step 1 SQL command to check value, then UPDATE to 'full'

---

**Hypothesis 2 (15% probability)**: Migration not applied, column doesn't exist

**Evidence**: Would need Step 1 to confirm

**Fix**: Apply migration via `supabase db push`

---

**Hypothesis 3 (5% probability)**: TypeScript types missing column

**Evidence**: Would need Step 3 to confirm

**Fix**: Regenerate types

---

## 📋 Complete Fix Workflow

**Recommended Order**:

```bash
# 1. Check database value
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -c "
SELECT access_level FROM organizations
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
"

# 2. If NOT 'full', update it
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -c "
UPDATE organizations
SET access_level = 'full'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
"

# 3. Verify migration applied
supabase migration list | grep grant_yodel_mobile_full_access

# 4. If NOT applied, apply it
supabase db push

# 5. Regenerate TypeScript types
supabase gen types typescript --db-url "$DATABASE_URL" > src/integrations/supabase/types.ts

# 6. Restart dev server
npm run dev:frontend

# 7. In browser: Hard refresh
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 8. Verify console shows: routes=~40
```

---

## ✅ Success Criteria

**Fixed When**:
1. ✅ Database shows: `access_level = 'full'`
2. ✅ Migration shows: Applied
3. ✅ TypeScript types include: `access_level?: string | null`
4. ✅ Console shows: `routes=~40`
5. ✅ Navigation shows: Keywords and Reviews pages
6. ✅ Can access all dashboard pages

---

**Status**: 🔴 **DIAGNOSIS PENDING**
**Next Step**: Run Step 1 SQL command and share output
**Priority**: CRITICAL (blocking full platform access)
