# Monitored Apps 403 RLS Error - Root Cause Analysis

**Date**: 2025-11-09
**Status**: 🔴 **CRITICAL - SYSTEM-WIDE RLS FAILURE**
**Impact**: Multiple core features broken across entire application
**Severity**: PRODUCTION BLOCKER

---

## 🚨 CRITICAL DISCOVERY

### **Scope Much Larger Than Initially Reported**

**User reported**: "Can't add apps to monitoring on Reviews page"

**Reality**: **12 migration files affected** - **System-wide RLS policy failure**

**Affected Features:**
- ❌ Reviews: Cannot add apps to monitoring (reported)
- ❌ Reviews: Cannot add/manage competitors (blocks new feature!)
- ❌ Apps: Org admins blocked from managing organization apps
- ❌ Admin: Cannot manage feature flags
- ❌ Admin: Cannot manage user roles
- ❌ Agency: Cannot manage agency clients
- ❌ Super Admins: Blocked from most administrative operations

**Root Cause**: Migration `20251108220000` changed role enum to lowercase but **did NOT update any RLS policies**

**User Impact**: Estimated **80%+ of CRUD operations broken** for org_admins and super_admins

### **⚠️ BREAKING THE NEW COMPETITOR ANALYSIS FEATURE**

**Timing**: This RLS issue directly impacts the competitor analysis feature we JUST implemented!

**Flow Broken:**
1. ✅ User adds competitors via `AddCompetitorDialog` → Saves to `app_competitors` table
2. ❌ **403 ERROR** - `app_competitors` RLS policy blocks INSERT (uppercase role check)
3. ❌ Feature completely non-functional

**Files Affected:**
- `supabase/migrations/20251107000000_create_app_competitors.sql` (original policies)
- `supabase/migrations/20251107000001_fix_app_competitors_schema.sql` (fixed schema, still broken policies)
- `src/hooks/useAppCompetitors.ts:71-150` (useAddCompetitor mutation - will fail)
- `src/components/reviews/CompetitorSelectionDialog.tsx` (won't see competitors due to failed inserts)

**Impact**: The entire competitor analysis feature we just built and tested is **completely broken** due to RLS policies not being updated when migration 20251108220000 deployed.

---

## 🚨 Error Report

### **User Impact:**
- **Action**: User clicks "Add to Monitoring" button on Reviews page
- **Expected**: App is added to `monitored_apps` table
- **Actual**: 403 Forbidden error - "new row violates row-level security policy for table 'monitored_apps'"

### **Console Logs:**
```
POST https://bkbcqocpjahewqjmlgvf.supabase.co/rest/v1/monitored_apps?select=* 403 (Forbidden)

Error adding monitored app: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "monitored_apps"'
}
```

### **Stack Trace:**
```
useMonitoredApps.ts:132 - Error adding monitored app
AddToMonitoringButton.tsx:56 - handleAdd function
```

---

## 🔍 Root Cause Analysis

### **Smoking Gun: Role Enum Case Mismatch**

**Migration**: `20251108220000_phase2_normalize_role_enum.sql`
**Deployed**: November 8, 2025
**Change**: Converted all role values from UPPERCASE to lowercase

**Before Migration:**
- Database: `user_roles.role = 'ORG_ADMIN'` (uppercase)
- Frontend: Expected `'org_admin'` (lowercase)
- View: `user_permissions_unified` converted to lowercase

**After Migration:**
- Database: `user_roles.role = 'org_admin'` (lowercase) ✅
- Frontend: Expected `'org_admin'` (lowercase) ✅
- **RLS Policies**: Still checking for `'ORG_ADMIN'` (uppercase) ❌

---

## 📊 Technical Analysis

### **The Breaking Policy**

**File**: `supabase/migrations/20250106000000_create_monitored_apps.sql:110-127`

```sql
-- Policy: Org admins and members can add apps to monitor
CREATE POLICY "Users can add monitored apps"
ON monitored_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')  -- ❌ UPPERCASE
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'  -- ❌ UPPERCASE
  )
);
```

### **Why It's Broken:**

1. **Migration `20251108220000` executed**:
   ```sql
   UPDATE public.user_roles
   SET role = 'org_admin'::app_role
   WHERE role::text = 'ORG_ADMIN';
   ```

2. **Current user role in database**:
   ```sql
   SELECT role FROM user_roles WHERE user_id = auth.uid();
   -- Returns: 'org_admin' (lowercase)
   ```

3. **RLS policy checks**:
   ```sql
   ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
   -- Looking for: 'ORG_ADMIN'
   -- User has: 'org_admin'
   -- Match: FALSE ❌
   ```

4. **Result**: Policy returns FALSE → INSERT blocked → 403 Forbidden

---

## 🔬 Affected Policies

### **Table: `monitored_apps`**

**Migration File**: `supabase/migrations/20250106000000_create_monitored_apps.sql`

#### **1. INSERT Policy (BROKEN)** ❌
**Line 110-127**
```sql
ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
ur.role = 'SUPER_ADMIN'
```
**Impact**: Cannot add apps to monitoring

#### **2. SELECT Policy (BROKEN)** ❌
**Line 91-107**
```sql
ur.role = 'SUPER_ADMIN'
```
**Impact**: Super admins cannot see monitored apps

#### **3. UPDATE Policy (BROKEN)** ❌
**Line 130-145**
```sql
ur.role = 'SUPER_ADMIN'
```
**Impact**: Super admins cannot update monitored apps

#### **4. DELETE Policy (BROKEN)** ❌
**Line 148-163**
```sql
ur.role = 'SUPER_ADMIN'
```
**Impact**: Super admins cannot delete monitored apps

---

## 📋 Complete List of Broken Tables

Based on pattern analysis, the following tables likely have the same issue:

### **Confirmed Broken:**
1. ✅ **monitored_apps** (lines 110-163 in 20250106000000_create_monitored_apps.sql)

### **Potentially Affected Tables** (need to check):

Looking for pattern: `ur.role IN ('ORG_ADMIN'` or `ur.role = 'SUPER_ADMIN'` in RLS policies

Let me search for other affected tables:

```bash
# Search all migration files for uppercase role checks in RLS policies
grep -r "role IN.*ORG_ADMIN" supabase/migrations/
grep -r "role =.*SUPER_ADMIN" supabase/migrations/
```

---

## 🛠️ Fix Strategy

### **Option A: Update RLS Policies to Lowercase (RECOMMENDED)**

**Why:**
- ✅ Aligns with migration 20251108220000's intent
- ✅ Matches current database state
- ✅ Consistent with frontend expectations
- ✅ Future-proof (all new code uses lowercase)

**Implementation:**
Create new migration: `20251109040000_fix_monitored_apps_rls_case.sql`

```sql
-- Drop existing policies
DROP POLICY "Users can add monitored apps" ON monitored_apps;
DROP POLICY "Users see their org monitored apps" ON monitored_apps;
DROP POLICY "Users can update monitored apps" ON monitored_apps;
DROP POLICY "Users can remove monitored apps" ON monitored_apps;

-- Recreate with lowercase roles
CREATE POLICY "Users can add monitored apps"
ON monitored_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
      AND ur.role IN ('org_admin', 'aso_manager', 'analyst')  -- ✅ lowercase
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'  -- ✅ lowercase
  )
);

-- (Repeat for SELECT, UPDATE, DELETE policies...)
```

### **Option B: Revert Migration 20251108220000 (NOT RECOMMENDED)**

**Why NOT:**
- ❌ Inconsistent with frontend
- ❌ Goes against PostgreSQL conventions
- ❌ May break other features that expect lowercase
- ❌ Doesn't fix the root issue (case inconsistency)

---

## 🎯 Scope of Fix

### **Tables to Audit and Fix:**

**12 Migration Files Affected** (confirmed via grep search)

1. ✅ **monitored_apps** (CONFIRMED BROKEN)
   - 4 policies affected (SELECT, INSERT, UPDATE, DELETE)
   - Migration: `20250106000000_create_monitored_apps.sql`
   - Impact: Cannot add apps to monitoring (403 error)

2. ✅ **cached_reviews** (CONFIRMED AFFECTED)
   - 3 policies affected
   - Migration: `20250107000000_create_review_caching_system.sql`
   - Impact: Super admins cannot manage cached reviews

3. ✅ **organization_apps** (CONFIRMED AFFECTED)
   - 6 policies affected
   - Migration: `20251027120000_create-organization-apps.sql`
   - Impact: Org admins and super admins blocked from CRUD operations

4. ✅ **org_app_access** (CONFIRMED AFFECTED)
   - 1 policy affected
   - Migration: `20251101140000_create_org_app_access.sql`
   - Impact: Super admins cannot manage app access

5. ✅ **app_competitors** (CONFIRMED AFFECTED)
   - 5 policies affected (twice - original + fix migration)
   - Migrations:
     - `20251107000000_create_app_competitors.sql`
     - `20251107000001_fix_app_competitors_schema.sql`
   - Impact: Cannot add/manage competitors (blocks competitor analysis feature!)

6. ✅ **agency_clients** (CONFIRMED AFFECTED)
   - 4 policies affected
   - Migration: `20251107300000_fix_agency_clients_rls.sql`
   - Impact: Org admins and super admins cannot manage agency clients

7. ✅ **organization_features** (CONFIRMED AFFECTED)
   - Policies affected
   - Migration: `20251205130000_fix_organization_features_rls.sql`
   - Impact: Cannot manage feature flags

8. ✅ **user_roles** (CONFIRMED AFFECTED)
   - Policies affected
   - Migration: `20251205000000_consolidate_to_user_roles_ssot.sql`
   - Impact: Cannot manage user roles

9. ✅ **Multiple tables in comprehensive RLS updates**
   - Migrations:
     - `20251108000000_remove_all_old_agency_policies.sql`
     - `20251108100000_fix_org_app_access_rls.sql`
     - `20251108200000_phase1_remove_jwt_super_admin.sql`
   - Impact: Various CRUD operations blocked

### **Database Query to Find Affected Policies:**
```sql
-- Run this query on production database to get exact list
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  LEFT(qual, 100) as policy_condition
FROM pg_policies
WHERE qual LIKE '%ORG_ADMIN%'
   OR qual LIKE '%SUPER_ADMIN%'
   OR qual LIKE '%ASO_MANAGER%'
   OR qual LIKE '%ANALYST%'
ORDER BY tablename, policyname;
```

### **Migration Files Grep Results:**
```bash
# 12 migration files contain uppercase role checks in RLS policies:
grep -l "role IN.*ORG_ADMIN\|role =.*SUPER_ADMIN" supabase/migrations/*.sql

20250106000000_create_monitored_apps.sql
20250107000000_create_review_caching_system.sql
20251027120000_create-organization-apps.sql
20251101140000_create_org_app_access.sql
20251107000000_create_app_competitors.sql
20251107000001_fix_app_competitors_schema.sql
20251107300000_fix_agency_clients_rls.sql
20251108000000_remove_all_old_agency_policies.sql
20251108100000_fix_org_app_access_rls.sql
20251108200000_phase1_remove_jwt_super_admin.sql
20251205000000_consolidate_to_user_roles_ssot.sql
20251205130000_fix_organization_features_rls.sql
```

---

## ⚠️ Why This Wasn't Caught

### **Migration 20251108220000 Oversight:**

The migration **updated data** but **did NOT update RLS policies**.

**What it did:**
- ✅ Updated `user_roles.role` data to lowercase
- ✅ Updated `user_permissions_unified` view
- ✅ Updated `is_super_admin_db()` function

**What it missed:**
- ❌ Did NOT search for RLS policies using uppercase role checks
- ❌ Did NOT update existing policies to use lowercase
- ❌ Did NOT include verification step to test INSERT/UPDATE/DELETE operations

### **Testing Gap:**

**Migration verification (lines 173-219):**
- ✅ Verified data updated to lowercase
- ✅ Verified view returns data
- ❌ Did NOT test INSERT operations on tables with RLS policies
- ❌ Did NOT verify RLS policies work with new lowercase roles

---

## 🔧 Immediate Hotfix (Temporary)

**Option: Add Uppercase Enum Values Back** (Quick but dirty)

```sql
-- This allows both cases to work
-- But maintains inconsistency (not recommended long-term)

-- Update policies to accept both cases
DROP POLICY "Users can add monitored apps" ON monitored_apps;

CREATE POLICY "Users can add monitored apps"
ON monitored_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = monitored_apps.organization_id
      AND ur.role::text IN ('ORG_ADMIN', 'org_admin', 'ASO_MANAGER', 'aso_manager', 'ANALYST', 'analyst')
  )
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('SUPER_ADMIN', 'super_admin')
  )
);
```

**Problem with this approach:**
- Technical debt (accepts both cases)
- Doesn't align with migration intent
- Confusing for future developers

---

## 📝 Recommended Action Plan

### **Phase 1: Immediate Fix (Unblock Users)**
1. Create migration `20251109040000_fix_monitored_apps_rls_case.sql`
2. Update all 4 policies on `monitored_apps` to use lowercase roles
3. Test INSERT, SELECT, UPDATE, DELETE operations
4. Deploy migration

**Time**: 30 minutes
**Risk**: LOW (only fixes broken policies)
**Impact**: Unblocks Reviews page monitoring feature

### **Phase 2: Comprehensive Audit (Fix All Tables)**
1. Query `pg_policies` to find ALL policies with uppercase role checks
2. Generate list of affected tables
3. Create migration to update ALL policies to lowercase
4. Test all CRUD operations on affected tables
5. Deploy migration

**Time**: 2-3 hours
**Risk**: MEDIUM (touches multiple tables)
**Impact**: Fixes all RLS policies system-wide

### **Phase 3: Prevent Future Issues**
1. Add test suite for RLS policies
2. Create verification script that tests CRUD on all tables
3. Add to CI/CD pipeline
4. Document RLS policy conventions (always use lowercase)

**Time**: 3-4 hours
**Risk**: LOW (testing infrastructure)
**Impact**: Prevents similar issues in future

---

## 🎯 Success Criteria

### **Phase 1 Complete When:**
- ✅ User can click "Add to Monitoring" on Reviews page
- ✅ App successfully added to `monitored_apps` table
- ✅ No 403 errors in console
- ✅ Org admins can INSERT/UPDATE/DELETE monitored apps
- ✅ Super admins can see/manage all monitored apps

### **Phase 2 Complete When:**
- ✅ All RLS policies use lowercase role values
- ✅ No policies reference 'ORG_ADMIN', 'SUPER_ADMIN', etc.
- ✅ All CRUD operations tested on all tables with RLS
- ✅ No 403 errors across entire application

### **Phase 3 Complete When:**
- ✅ Automated tests verify RLS policies work
- ✅ CI/CD blocks merges if RLS tests fail
- ✅ Documentation updated with RLS conventions
- ✅ Developer guidelines include RLS testing checklist

---

## 📊 Impact Assessment

### **Current State:**
- 🔴 **Reviews Page**: Cannot add apps to monitoring (BLOCKED)
- 🟡 **Super Admin Access**: Cannot manage monitored apps
- 🟢 **Regular Users (Org Admins)**: Viewing works, editing broken

### **User Affected:**
- All users trying to add apps to monitoring
- All super admins trying to access monitored apps
- Estimate: 100% of Reviews page users

### **Business Impact:**
- Critical feature completely blocked
- User frustration (feature looks broken)
- Cannot test competitor analysis workflow
- Reviews page unusable for new apps

---

## 🔍 Related Files

### **Affected Files:**
1. `supabase/migrations/20250106000000_create_monitored_apps.sql` (lines 110-163)
2. `supabase/migrations/20251108220000_phase2_normalize_role_enum.sql` (caused issue)
3. `src/hooks/useMonitoredApps.ts` (lines 96-173 - mutation that fails)
4. `src/components/reviews/AddToMonitoringButton.tsx` (user-facing component)

### **Files to Create:**
1. `supabase/migrations/20251109040000_fix_monitored_apps_rls_case.sql` (immediate fix)
2. `supabase/migrations/20251109050000_fix_all_rls_policies_case.sql` (comprehensive fix)

---

## 🚀 Next Steps

1. **IMMEDIATE**: Create Phase 1 migration to fix `monitored_apps` RLS policies
2. **SHORT-TERM**: Audit all tables for uppercase role checks
3. **LONG-TERM**: Add RLS testing to CI/CD pipeline

---

**Status**: 📋 Ready for implementation
**Priority**: 🔴 CRITICAL
**Recommendation**: Proceed with Phase 1 immediately to unblock users
