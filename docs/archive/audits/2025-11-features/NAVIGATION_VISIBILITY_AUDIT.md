# Navigation Visibility Audit
## Why Legacy Components Are Not Showing in Navigation Menu

**Audit Date:** 2025-01-13
**Issue:** Navigation items like "Strategic Audit Engine" and other AI tools are not visible
**Root Cause:** Multi-layer access control system with conflicting role and route restrictions

---

## Executive Summary

Your navigation items are hidden due to a **three-layer access control system** that's more restrictive than intended:

1. **Route-Level Restrictions** - Most AI tools are in `SUPER_ADMIN_ONLY_ROUTES`
2. **Feature-Level Restrictions** - Role-based feature access (org_admin has limited features)
3. **Navigation Filtering** - Combines both route AND feature checks

**The Problem:** Even though you granted SUPER_ADMIN role to igor@yodelmobile.com, the navigation might still be filtering based on the ORG_ADMIN role if that's the first role in the array.

---

## Current Navigation Structure

### What Exists in AppSidebar.tsx

The navigation is organized into **5 sections**:

#### 1. Performance Intelligence (Always Visible)
- ✅ **Performance Dashboard** (`/dashboard-v2`) - No restrictions
- ✅ **Conversion Rate** (`/dashboard/conversion-rate`) - Feature: `conversion_intelligence`

#### 2. AI Command Center (SUPER_ADMIN ONLY)
- ❌ **Strategic Audit Engine** (`/aso-ai-hub`) - Feature: `aso_chat`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️
  - **Feature Access:** org_admin has `aso_ai_hub` in ROLE_FEATURE_DEFAULTS
  - **Visible to:** super_admin only (due to route restriction)

- ❌ **AI Visibility Optimizer** (`/chatgpt-visibility-audit`) - Feature: `competitive_intelligence`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️
  - **Feature Access:** org_admin does NOT have this feature
  - **Visible to:** super_admin only

#### 3. Growth Accelerators (Mixed Access)
- ❌ **Strategy Brain** (`/aso-knowledge-engine`) - Feature: `aso_chat`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ❌ **Metadata Optimizer** (`/metadata-copilot`) - Feature: `ai_metadata_generator`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ❌ **Opportunity Scanner** (`/growth-gap-copilot`) - Feature: `keyword_intelligence`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ❌ **Feature Maximizer** (`/featuring-toolkit`) - Feature: `keyword_intelligence`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ❌ **Creative Analysis** (`/creative-analysis`) - Feature: `creative_review`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ❌ **Web Rank (Apps)** (`/growth/web-rank-apps`) - Feature: `keyword_intelligence`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ✅ **Keyword Intelligence** (`/growth-accelerators/keywords`) - Feature: `keyword_intelligence`
  - **Route:** `DEFAULT_ORG_USER_ROUTES` ✅
  - **Visible to:** All org users

- ✅ **Competitor Overview** (`/growth-accelerators/competitor-overview`) - Feature: `keyword_intelligence`
  - **Route:** `DEFAULT_ORG_USER_ROUTES` ✅
  - **Visible to:** All org users

- ✅ **Reviews** (`/growth-accelerators/reviews`) - Custom filtering
  - **Route:** `DEFAULT_ORG_USER_ROUTES` ✅
  - **Visible to:** All org users (with custom feature check)

#### 4. Control Center (Admin Access)
- ❌ **App Intelligence** (`/app-discovery`) - Feature: `app_discovery`
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ❌ **Portfolio Manager** (`/apps`) - No feature key
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

- ✅ **System Control** (`/admin`) - SUPER_ADMIN only
  - Visible when `isSuperAdmin === true`

- ✅ **User Management** (`/admin/users`) - ORG_ADMIN only
  - Visible when `isOrganizationAdmin === true && !isSuperAdmin`

#### 5. Account (User Settings)
- ✅ **Profile** (`/profile`) - Always visible
- ✅ **Preferences** (`/settings`) - Only for igor@yodelmobile.com
  - **Route:** `SUPER_ADMIN_ONLY_ROUTES` ⚠️

---

## Three-Layer Access Control System

### Layer 1: Route-Level Access (defaultOrgRoutes.ts)

```typescript
// DEFAULT_ORG_USER_ROUTES - All org users can access
[
  '/dashboard-v2',
  '/dashboard/conversion-rate',
  '/growth-accelerators/keywords',
  '/growth-accelerators/reviews',
  '/growth-accelerators/theme-impact',
  '/growth-accelerators/competitor-overview',
  '/profile',
  '/dashboard',
]

// ORG_ADMIN_ADDITIONAL_ROUTES - ORG_ADMIN gets these extra
[
  '/admin/users',
  '/admin/placeholder',
]

// SUPER_ADMIN_ONLY_ROUTES - Only super admins
[
  '/admin',                         // System Control
  '/aso-ai-hub',                    // Strategic Audit Engine ⚠️
  '/chatgpt-visibility-audit',      // AI Visibility Optimizer ⚠️
  '/aso-knowledge-engine',          // Strategy Brain ⚠️
  '/metadata-copilot',              // Metadata Optimizer ⚠️
  '/growth-gap-copilot',            // Opportunity Scanner ⚠️
  '/featuring-toolkit',             // Feature Maximizer ⚠️
  '/creative-analysis',             // Creative Analysis ⚠️
  '/growth/web-rank-apps',          // Web Rank Apps ⚠️
  '/app-discovery',                 // App Intelligence ⚠️
  '/apps',                          // Portfolio Manager ⚠️
  '/settings',                      // Preferences ⚠️
]
```

**Impact:** If a route is in `SUPER_ADMIN_ONLY_ROUTES`, it won't appear in navigation unless `isSuperAdmin === true`.

### Layer 2: Feature-Level Access (features.ts)

```typescript
// ROLE_FEATURE_DEFAULTS
super_admin: [ALL FEATURES],  // ✅

org_admin: [
  // Performance Intelligence - Full access
  'executive_dashboard',
  'analytics',
  'conversion_intelligence',
  'performance_intelligence',
  'predictive_forecasting',

  // AI Command Center - LIMITED (no strategic_audit_engine) ⚠️
  'aso_ai_hub',  // ✅ Has this
  'ai_metadata_generator',  // ✅ Has this
  // Missing: 'strategic_audit_engine', 'chatgpt_visibility_audit'

  // Growth Accelerators - Full access
  'keyword_intelligence',
  'competitive_intelligence',
  'creative_review',
  'app_discovery',
  'aso_chat',
  'market_intelligence',
  'reviews_public_rss_enabled',
  'creative_analysis',
  'keyword_rank_tracking',
  'visibility_optimizer',

  // Control Center - LIMITED (no system_control) ⚠️
  'app_intelligence',
  'portfolio_manager',

  // Account - Full access
  'profile_management',
  'preferences',
],

aso_manager: [
  'analytics',
  'performance_intelligence',
  'aso_ai_hub',  // ✅ Has AI Hub
  'ai_metadata_generator',
  'keyword_intelligence',
  'competitive_intelligence',
  'creative_review',
  'aso_chat',
  'profile_management',
  'preferences',
],

analyst: [
  'analytics',
  'conversion_intelligence',
  'competitive_intelligence',
  'keyword_intelligence',
  'profile_management',
  'preferences',
],

viewer: [
  'analytics',
  'app_intelligence',
  'profile_management',
  'preferences',
],
```

**Impact:** Even if route is allowed, feature access is checked via `featureEnabledForRole()`.

### Layer 3: Navigation Filtering (AppSidebar.tsx)

```typescript
// Line 165-226: Determine current role
const { isSuperAdmin, isOrganizationAdmin, roles = [] } = usePermissions();
const role = (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';

// Line 225: Get allowed routes based on role
const routes = getAllowedRoutes({ isDemoOrg, role, organizationId, orgAccessLevel, isSuperAdmin });

// Line 241-247: Filter navigation items
const filterOptions = { isDemoOrg, isSuperAdmin, routes, hasFeature };
const filteredAnalyticsItems = filterNavigationByRoutes(analyticsItems, filterOptions);
const filteredAiToolsItems = filterNavigationByRoutes(aiToolsItems, filterOptions);
const filteredAiCopilotsItems = filterNavigationByRoutes(aiCopilotsItems, filterOptions);
const filteredControlCenterItems = filterNavigationByRoutes(controlCenterItems, filterOptions);

// Line 284-320: Additional feature-based filtering
filteredAiToolsItems = filteredAiToolsItems.filter(item => {
  if (item.url === '/aso-ai-hub') {
    return featureEnabledForRole(PLATFORM_FEATURES.ASO_AI_HUB, currentUserRole);
  }
  if (item.url === '/chatgpt-visibility-audit') {
    return featureEnabledForRole(PLATFORM_FEATURES.CHATGPT_VISIBILITY_AUDIT, currentUserRole);
  }
  return true;
});
```

**The Filtering Logic** (from `filterNavigationByRoutes` in `src/utils/navigation.ts`):

```typescript
export function filterNavigationByRoutes(
  items: NavigationItem[],
  options: FilterOptions
): NavigationItem[] {
  return items.filter(item => {
    // 1. Super admin bypass - see everything
    if (options.isSuperAdmin) {
      return true;
    }

    // 2. Check if route is in allowed routes
    if (!options.routes.includes(item.url)) {
      return false;  // ❌ BLOCKED HERE
    }

    // 3. Check feature access (if featureKey defined)
    if (item.featureKey && !options.hasFeature(item.featureKey)) {
      return false;  // ❌ OR BLOCKED HERE
    }

    return true;  // ✅ Show item
  });
}
```

**Impact:** Navigation items must pass BOTH route check AND feature check (unless super admin).

---

## Root Cause Analysis

### Why Items Are Not Visible

**Scenario 1: User is logged in as igor@yodelmobile.com with SUPER_ADMIN role**

Expected:
- `isSuperAdmin === true`
- Should see ALL navigation items

Actual (Potential Issue):
- If `usePermissions()` returns `roles = ['ORG_ADMIN', 'SUPER_ADMIN']`
- Then `roles[0]` is `'ORG_ADMIN'`
- Then `getAllowedRoutes()` is called with `role='ORG_ADMIN'` but `isSuperAdmin=true`
- **This should work** because `getAllowedRoutes` checks `isSuperAdmin` first (line 115 in allowedRoutes.ts)

**Scenario 2: usePermissions() hook is not detecting super admin**

Check:
```typescript
// In usePermissions hook - how is isSuperAdmin determined?
const isSuperAdmin = data?.some(
  (perm) => perm.role === 'SUPER_ADMIN' && perm.org_id === null
) ?? false;
```

Potential issues:
- If `user_permissions_unified` view doesn't return super admin permission
- If hook is caching old permissions
- If role comparison is case-sensitive ('SUPER_ADMIN' vs 'super_admin')

**Scenario 3: Feature gating is blocking items**

Even with route access, items like "AI Visibility Optimizer" check:
```typescript
featureEnabledForRole(PLATFORM_FEATURES.CHATGPT_VISIBILITY_AUDIT, currentUserRole)
```

If `currentUserRole` is determined as 'org_admin' instead of 'super_admin', this returns false.

---

## Questions for You

Before I can pinpoint the exact issue, I need to understand your current setup:

### 1. What is your current login user?
- Are you logged in as **igor@yodelmobile.com**?
- Or a different user account?

### 2. What navigation items DO you currently see?
Looking at your menu right now, which of these sections are visible:
- ✅ Performance Intelligence (Dashboard, Conversion Rate)?
- ✅ AI Command Center (any items)?
- ✅ Growth Accelerators (which ones)?
- ✅ Control Center (which ones)?
- ✅ Account (Profile, Preferences)?

### 3. Which items are MISSING that you expect to see?
Specifically, you mentioned "audit engine" - do you mean:
- **"Strategic Audit Engine"** (which goes to `/aso-ai-hub`)?
- Or something else?

What other items are missing?

### 4. What items WERE visible before?
When were they visible? What changed?
- Was this before we granted SUPER_ADMIN role today?
- Or were they missing even before?

### 5. Browser Console Check
Can you open browser console (F12) and run:
```javascript
// Check permissions
const { data } = await supabase
  .from('user_permissions_unified')
  .select('*')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id);

console.log('Permissions:', data);
console.log('Is Super Admin:', data?.some(p => p.is_super_admin));
```

What does this return?

### 6. Organization Type
Which organization are you viewing?
- Is it a demo organization?
- What is `organizations.access_level` for this org?
- Check with:
  ```javascript
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, access_level, settings')
    .single();
  console.log('Current org:', org);
  ```

### 7. Design Intent
Before we fix, I need to understand your desired behavior:

**For igor@yodelmobile.com (SUPER_ADMIN):**
- Should see ALL navigation items? (All AI tools, all admin features)
- Or should see ORG_ADMIN items only?

**For other ORG_ADMIN users (not super admin):**
- Should they see AI Command Center tools (Strategic Audit Engine, AI Visibility Optimizer)?
- Or should those be super admin-only?

**For other roles (ASO_MANAGER, ANALYST, VIEWER):**
- What should they see?

---

## Likely Fixes (After You Answer Questions)

Based on your answers, the fix will likely be one of these:

### Fix 1: Super Admin Not Being Detected
**If:** `isSuperAdmin` is false even though you have the role
**Fix:** Clear localStorage/cookies, sign out, sign back in

### Fix 2: Need to Move Routes Out of SUPER_ADMIN_ONLY
**If:** You want ORG_ADMIN users to see AI tools
**Fix:** Move routes from `SUPER_ADMIN_ONLY_ROUTES` to `ORG_ADMIN_ADDITIONAL_ROUTES` or `DEFAULT_ORG_USER_ROUTES`

### Fix 3: Feature Access Mismatch
**If:** Routes are allowed but feature access blocks items
**Fix:** Update `ROLE_FEATURE_DEFAULTS` in features.ts to include missing features

### Fix 4: Organization Access Level Override
**If:** Organization has `access_level='reporting_only'`
**Fix:** Update organization record:
```sql
UPDATE organizations
SET access_level = 'full'
WHERE id = '<your-org-id>';
```

### Fix 5: Role Array Order Issue
**If:** Super admin role is not first in roles array
**Fix:** Update `usePermissions` hook to prioritize super admin role

---

## Files That Control Navigation Visibility

1. **src/components/AppSidebar.tsx** (Lines 68-148)
   - Defines navigation items and their feature keys

2. **src/config/defaultOrgRoutes.ts**
   - Defines which routes each role can access

3. **src/config/allowedRoutes.ts** (Lines 75-133)
   - `getAllowedRoutes()` function determines route access

4. **src/constants/features.ts** (Lines 178-232)
   - `ROLE_FEATURE_DEFAULTS` defines which features each role has

5. **src/utils/navigation.ts**
   - `filterNavigationByRoutes()` applies filtering logic

6. **src/hooks/usePermissions.ts**
   - Returns `isSuperAdmin`, `isOrganizationAdmin`, `roles`

---

## Next Steps

**Please answer the 7 questions above** so I can:
1. Identify the exact root cause
2. Provide the specific fix needed
3. Make code changes only if necessary and approved

Once I understand your current state and desired behavior, I'll either:
- Provide a quick configuration fix (no code changes)
- Or propose targeted code changes to unblock navigation items

---

**Status:** Waiting for user input before proceeding
