# UPPERCASE Revert - Side Effect Analysis

**Date**: 2025-11-09
**Status**: 🔴 **CRITICAL - User Lost Access to Keywords & Reviews**
**User**: cli@yodelmobile.com (Yodel Mobile ORG_ADMIN)

---

## 🚨 **Reported Issue**

After reverting roles to UPPERCASE (migration 20251109040000), the Yodel Mobile org admin user lost access to:
- Keywords page (`/growth-accelerators/keywords`)
- Reviews page (`/growth-accelerators/reviews`)

**Symptoms:**
- User is being redirected
- Pages "not visible in md" (navigation menu)
- Console shows only 6 routes accessible
- No 403 errors (RLS is working)

---

## 📊 **Console Log Analysis**

### **Key Console Logs:**

```
[usePermissions] Loaded org=7cccba3f..., role=ORG_ADMIN, superAdmin=false
```

```
[Sidebar] Loaded: org=7cccba3f..., role=ORGANIZATION_ADMIN, routes=6,
          items=Analytics:1 AI:0 Control:0
```

### **What This Tells Us:**

1. **usePermissions returns**: `role=ORG_ADMIN`
2. **Sidebar transforms to**: `role=ORGANIZATION_ADMIN`
3. **Routes count**: 6 (exactly matches DEMO_REPORTING_ROUTES)
4. **Navigation items**: Only Analytics visible

---

## 🔍 **Root Cause Investigation**

### **Step 1: What Changed?**

**Migration 20251109040000:**
- Changed database values: `'org_admin'` → `'ORG_ADMIN'`
- This was CORRECT per architecture docs

**Problem:**
The view and frontend code may not be handling UPPERCASE correctly.

---

### **Step 2: Role Flow Through System**

#### **Database Layer:**
```sql
-- After migration 20251109040000
SELECT role FROM user_roles WHERE user_id = '8920ac57...';
-- Returns: 'ORG_ADMIN' (UPPERCASE)
```

#### **View Layer (user_permissions_unified):**
```sql
-- From migration 20251205000000
CASE
  WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
  WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'  -- Should match!
  WHEN ur.role::text = 'ASO_MANAGER' THEN 'aso_manager'
  ...
END AS effective_role
```

**Expected**: View should return `effective_role = 'org_admin'` (lowercase)

**Question**: Is the view returning the correct value?

---

#### **usePermissions Layer:**

**File**: `src/hooks/usePermissions.ts:182`

```typescript
effectiveRole: primaryPermission?.effective_role || 'viewer',
```

**Expected**: Should receive `'org_admin'` from view
**Console shows**: `role=ORG_ADMIN`

**🚨 MISMATCH**: Console shows UPPERCASE but view should return lowercase!

**Possible Causes:**
1. View is NOT normalizing correctly
2. usePermissions is using `role` instead of `effective_role`
3. Fallback path is being used

---

#### **Sidebar Transformation:**

**File**: `src/components/AppSidebar.tsx:190-191`

```typescript
const role =
  (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';
```

**Logic:**
1. Takes `roles[0]` from usePermissions
2. Converts to UPPERCASE
3. Replaces `'ORG_'` with `'ORGANIZATION_'`

**Example (Expected Flow):**
- Input from view: `'org_admin'` (lowercase)
- After toUpperCase(): `'ORG_ADMIN'`
- After replace: `'ORGANIZATION_ADMIN'` ✅

**Example (Current Flow - if view returns UPPERCASE):**
- Input from view: `'ORG_ADMIN'` (already uppercase!)
- After toUpperCase(): `'ORG_ADMIN'` (no change)
- After replace: `'ORGANIZATION_ADMIN'` ✅

**Result**: Transformation SHOULD still work!

---

### **Step 3: Route Access Control**

**File**: `src/config/allowedRoutes.ts`

```typescript
export function getAllowedRoutes({
  isDemoOrg,
  role,
  organizationId,
  orgAccessLevel
}: {...}): string[] {
  // PHASE 2: Database-driven organization-level restriction
  if (orgAccessLevel === 'reporting_only') {
    return [...DEMO_REPORTING_ROUTES];  // 6 routes
  }

  // PHASE 1: Fallback if access_level not loaded
  if (organizationId && REPORTING_ONLY_ORGS.includes(organizationId) && !orgAccessLevel) {
    return [...DEMO_REPORTING_ROUTES];  // 6 routes
  }

  // Demo organizations get reporting routes only
  if (isDemoOrg) return [...DEMO_REPORTING_ROUTES];

  // VIEWER and CLIENT roles get reporting routes only
  if (role === 'VIEWER' || role === 'CLIENT') return [...DEMO_REPORTING_ROUTES];

  // All other cases: full app access
  return [...DEMO_REPORTING_ROUTES, ...FULL_APP];
}
```

**Yodel Mobile Org ID**: `'7cccba3f-0a8f-446f-9dba-86e9cb68c92b'`

**Line 46**:
```typescript
const REPORTING_ONLY_ORGS = [
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', // Yodel Mobile
];
```

**Line 68-70 Logic:**
```typescript
if (organizationId && REPORTING_ONLY_ORGS.includes(organizationId) && !orgAccessLevel) {
  return [...DEMO_REPORTING_ROUTES];  // Returns ONLY 6 routes
}
```

**DEMO_REPORTING_ROUTES (Line 1-10):**
```typescript
export const DEMO_REPORTING_ROUTES = [
  '/dashboard-v2',                      // 1
  '/dashboard/executive',               // 2
  '/dashboard/analytics',               // 3
  '/dashboard/conversion-rate',         // 4
  '/growth-accelerators/keywords',      // 5 ✅ INCLUDED
  '/growth-accelerators/reviews'        // 6 ✅ INCLUDED
] as const;
```

**Console shows**: `routes=6` ✅ MATCHES

**🤔 CONTRADICTION**:
- Keywords and Reviews ARE in DEMO_REPORTING_ROUTES
- Console shows 6 routes (correct count)
- But user says Keywords and Reviews are NOT visible

---

## 🎯 **Hypothesis: Navigation Filtering**

**Possibility**: Routes are allowed, but navigation menu is filtered differently.

**Check**: Does AppSidebar filter navigation items based on additional logic?

**File**: `src/components/AppSidebar.tsx`

Let me check the navigation items filtering...

---

## 🔍 **Navigation Menu Items**

**Console shows**:
```
items=Analytics:1 AI:0 Control:0
```

**Breakdown:**
- Analytics items: 1 visible
- AI items: 0 visible
- Control items: 0 visible

**🚨 PROBLEM**: No "Growth Accelerators" category showing!

**Expected Categories:**
- Analytics (Dashboard V2, etc.)
- Growth Accelerators (Keywords, Reviews)
- AI Tools
- Control Center

**Question**: Where are the Growth Accelerators navigation items?

---

## 🔍 **Checking Navigation Structure**

Need to check how AppSidebar builds navigation items:
- Does it have a "Growth Accelerators" section?
- Is that section being filtered out?
- Is there a separate permission check for navigation vs. routes?

**Key files to check:**
1. `src/components/AppSidebar.tsx` - Navigation item rendering
2. Look for navigation config/structure
3. Check if items are filtered by feature flags or additional permissions

---

## 📊 **Summary of Findings**

### **What's Working:**
✅ RLS policies fixed (no 403 errors)
✅ Database has UPPERCASE roles
✅ View CASE statement includes both cases
✅ Sidebar role transformation works
✅ `getAllowedRoutes` returns 6 routes including Keywords and Reviews

### **What's Broken:**
❌ User cannot access Keywords page
❌ User cannot access Reviews page
❌ Navigation menu doesn't show these pages
❌ Console shows `AI:0` and `Control:0` (unexpected)

### **The Mismatch:**
**Console Log**:
```
[usePermissions] Loaded ... role=ORG_ADMIN
```

**Expected (from view)**:
```
effective_role = 'org_admin' (lowercase)
```

**🚨 KEY QUESTION**: Why is usePermissions returning `ORG_ADMIN` (UPPERCASE) when the view should return `org_admin` (lowercase)?

---

## 🎯 **Next Investigation Steps**

### **1. Verify View Output**
Query the database directly to see what `user_permissions_unified` returns:

```sql
SELECT
  user_id,
  org_id,
  role,           -- Raw role from database
  effective_role  -- Normalized role from CASE
FROM user_permissions_unified
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';
```

**Expected**:
- `role`: `'ORG_ADMIN'` (raw from database)
- `effective_role`: `'org_admin'` (normalized by CASE)

**If different**: View is broken

---

### **2. Check usePermissions Data**
Add console.log in usePermissions to see raw data from view:

```typescript
// In usePermissions.ts:~Line 141
console.log('🔍 Raw permissions from view:', allPermissions);
console.log('🔍 Primary permission:', primaryPermission);
console.log('🔍 Effective role:', primaryPermission?.effective_role);
```

---

### **3. Check Navigation Item Filtering**
Find where AppSidebar filters navigation items and check why Growth Accelerators items are hidden.

---

## 🎯 **Hypothesis**

**Most Likely Cause**:
The `user_permissions_unified` view is returning `role = 'ORG_ADMIN'` in BOTH the `role` and `effective_role` columns, instead of normalizing `effective_role` to lowercase.

**Why?**:
The view's CASE statement might not be matching `'ORG_ADMIN'` correctly after our migration.

**Check**:
Look at the deployed view definition vs. what's in the migration file.

---

## 🔧 **Potential Fixes** (NO CODE CHANGES YET)

### **Option A: View is Broken**
If the view is NOT normalizing correctly:
- Re-deploy the view from migration 20251205000000
- OR update view to handle UPPERCASE correctly

### **Option B: usePermissions is Using Wrong Field**
If usePermissions is reading `role` instead of `effective_role`:
- Update usePermissions to use `effective_role`

### **Option C: Navigation Filter is Too Restrictive**
If navigation items are filtered beyond route access:
- Update navigation filtering logic

---

**Status**: 🔍 Investigation in progress
**Next Step**: Query database to verify view output
**Priority**: HIGH (user blocked from features)
