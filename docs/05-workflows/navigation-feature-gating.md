---
Status: ACTIVE
Version: v2.0
Last Updated: 2025-01-20
Purpose: Navigation visibility and feature gating implementation guide
See Also: docs/02-architecture/system-design/authorization-v1.md (V1 authorization)
See Also: docs/02-architecture/ARCHITECTURE_V1.md (role-based access control)
Audience: Developers
---

# Navigation Feature Gating

## Overview

Navigation visibility in Yodel ASO Insight is controlled by a multi-layered system that determines which menu items users can see based on their role, organization type, and feature access. This document describes the V1 implementation of navigation gating.

**Key Components:**
- `filterNavigationByRoutes` utility (src/utils/navigation.ts)
- `getAllowedRoutes` function (src/services/authz.ts)
- `usePermissions` hook (src/hooks/usePermissions.ts) - PRIMARY authorization method
- AppSidebar component (src/components/AppSidebar.tsx)

**Authorization Method:** V1 role-based access control (no feature flags in V1)

---

## Table of Contents

1. [Navigation Gating Logic](#navigation-gating-logic)
2. [Implementation Details](#implementation-details)
3. [Role-Based Navigation Rules](#role-based-navigation-rules)
4. [Code Examples](#code-examples)
5. [Testing Navigation Access](#testing-navigation-access)
6. [Troubleshooting](#troubleshooting)

---

## Navigation Gating Logic

### Three-Layer Check System

Navigation visibility is determined by applying **three sequential checks** to each menu item before rendering:

#### Check 1: Route Allowance

**Purpose:** Verify user has access to the route based on their role

**Implementation:** `getAllowedRoutes(user, org)` function

**Logic:**
```typescript
const allowedRoutes = await getAllowedRoutes(user, org);
// Returns array of allowed paths, e.g., ['/dashboard-v2', '/growth-accelerators/reviews', ...]
```

**Rules:**
- `SUPER_ADMIN` → Access to all routes (including `/admin`)
- `ORG_ADMIN` → Access to org-level routes (no `/admin`)
- `ASO_MANAGER` → Access to ASO features (dashboards, reviews, keyword tracking)
- `ANALYST` → Read-only access to dashboards
- `VIEWER` → Limited read-only access
- `CLIENT` → Minimal access (client portal only)

---

#### Check 2: Demo Organization Bypass

**Purpose:** Demo organizations bypass feature flag checks (V2 planned feature)

**Implementation:**
```typescript
const isDemo = org?.settings?.demo_mode === true || org?.slug === 'next';
if (isDemo) {
  // Skip feature flag check, but still respect route allowance
  return allowedRoutes.includes(navItem.path);
}
```

**Why Demo Bypass?**
- Demo orgs need access to all features for showcasing
- Feature flags (V2 planned) should not restrict demo users
- Route allowance still enforced (role-based security)

**Demo Detection:**
- Server truth: `organizations.settings.demo_mode = true`
- Fallback: `organizations.slug = 'next'` (legacy)
- Frontend uses `admin-whoami` Edge Function response

---

#### Check 3: Feature Access Check (V2 Planned)

**Purpose:** Non-demo orgs require both route allowance AND feature entitlement

**V1 Status:** ❌ NOT IMPLEMENTED (no feature flags in V1)

**V2 Planned Logic:**
```typescript
// V2 PLANNED (not in current production)
if (!isDemo) {
  const hasFeature = userFeatures.includes(navItem.requiredFeature);
  return allowedRoutes.includes(navItem.path) && hasFeature;
}
```

**Why Not in V1?**
- V1 uses role-based access only
- Feature flags are V2 planned feature
- See [docs/04-api-reference/feature-permissions.md](../../04-api-reference/feature-permissions.md)

---

#### Check 4: Super Admin Bypass

**Purpose:** Super admins with platform settings permission bypass all checks

**Implementation:**
```typescript
const { canManagePlatform } = usePermissions();
if (canManagePlatform) {
  // Bypass all checks, show all navigation items
  return true;
}
```

**Platform Settings Permission:**
- Granted to: `SUPER_ADMIN` role with `organization_id IS NULL`
- Checked via: `usePermissions()` hook → `user_permissions_unified` view
- UI indicator: Platform-wide access badge in header

---

## Implementation Details

### File: src/utils/navigation.ts

**Function:** `filterNavigationByRoutes()`

**Location:** src/utils/navigation.ts:26-78

**Signature:**
```typescript
export function filterNavigationByRoutes(
  navigationItems: NavigationItem[],
  allowedRoutes: string[],
  isDemo: boolean,
  userFeatures: string[],
  isSuperAdmin: boolean
): NavigationItem[]
```

**Parameters:**
| Parameter | Type | Source | Description |
|-----------|------|--------|-------------|
| `navigationItems` | `NavigationItem[]` | Hardcoded | All possible navigation items |
| `allowedRoutes` | `string[]` | `getAllowedRoutes()` | Routes user can access (role-based) |
| `isDemo` | `boolean` | `admin-whoami` Edge Function | True if demo organization |
| `userFeatures` | `string[]` | V2 planned | Feature entitlements (empty in V1) |
| `isSuperAdmin` | `boolean` | `usePermissions()` | True if SUPER_ADMIN |

**Return Value:** Filtered array of `NavigationItem[]` that user can see

**Algorithm:**
```typescript
export function filterNavigationByRoutes(
  navigationItems: NavigationItem[],
  allowedRoutes: string[],
  isDemo: boolean,
  userFeatures: string[],
  isSuperAdmin: boolean
): NavigationItem[] {
  // Super admin bypass
  if (isSuperAdmin) {
    return navigationItems;
  }

  return navigationItems.filter(item => {
    // Check 1: Route allowance
    const routeAllowed = allowedRoutes.includes(item.path);
    if (!routeAllowed) {
      return false;
    }

    // Check 2: Demo bypass (skip feature check)
    if (isDemo) {
      return true;
    }

    // Check 3: Feature access (V2 planned - not in V1)
    // In V1, this is always true (no feature flags)
    const featureRequired = item.requiredFeature;
    if (featureRequired) {
      // V2: Check if user has feature entitlement
      // V1: Always true (no feature flags)
      return userFeatures.includes(featureRequired) || true; // V1 bypass
    }

    return true;
  });
}
```

---

### File: src/services/authz.ts

**Function:** `getAllowedRoutes()`

**Location:** src/services/authz.ts:120-185

**Signature:**
```typescript
export async function getAllowedRoutes(
  user: User,
  org: Organization
): Promise<string[]>
```

**Implementation:**
```typescript
export async function getAllowedRoutes(user: User, org: Organization): Promise<string[]> {
  const { data: permissions } = await supabase
    .from('user_permissions_unified')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', org.id)
    .single();

  const role = permissions?.role;

  switch (role) {
    case 'SUPER_ADMIN':
      return [
        '/dashboard-v2',
        '/growth-accelerators/reviews',
        '/admin', // Only SUPER_ADMIN can access
        '/admin/users',
        '/admin/organizations',
        '/aso-ai-hub',
        // ... all routes
      ];

    case 'ORG_ADMIN':
      return [
        '/dashboard-v2',
        '/growth-accelerators/reviews',
        '/aso-ai-hub',
        // ... org-level routes (no /admin)
      ];

    case 'ASO_MANAGER':
      return [
        '/dashboard-v2',
        '/growth-accelerators/reviews',
        '/aso-ai-hub', // ASO features only
      ];

    case 'ANALYST':
      return [
        '/dashboard-v2', // Read-only dashboard access
      ];

    case 'VIEWER':
      return [
        '/dashboard-v2', // Limited read-only
      ];

    case 'CLIENT':
      return [
        '/client-portal', // Client-specific portal
      ];

    default:
      return ['/dashboard-v2']; // Fallback: basic dashboard access
  }
}
```

**Caching:**
- Result cached for 2 minutes in React Query
- Cache key: `['allowed-routes', user.id, org.id]`
- Invalidated on role change or org switch

---

### File: src/components/AppSidebar.tsx

**Component:** `AppSidebar`

**Location:** src/components/AppSidebar.tsx:141-180

**Usage:**
```typescript
export function AppSidebar() {
  const { user } = useAuth();
  const { org, isDemo } = useOrganization();
  const { canManagePlatform } = usePermissions(); // PRIMARY authorization

  // Get allowed routes from authz service
  const { data: allowedRoutes = [] } = useQuery({
    queryKey: ['allowed-routes', user?.id, org?.id],
    queryFn: () => getAllowedRoutes(user, org),
    enabled: !!user && !!org
  });

  // Get user features (V2 planned - empty in V1)
  const userFeatures: string[] = []; // V1: No feature flags

  // Filter navigation items
  const visibleNavItems = filterNavigationByRoutes(
    ALL_NAVIGATION_ITEMS,
    allowedRoutes,
    isDemo,
    userFeatures,
    canManagePlatform
  );

  return (
    <aside className="sidebar">
      {visibleNavItems.map(item => (
        <NavLink key={item.path} to={item.path}>
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
```

---

## Role-Based Navigation Rules

### Navigation Matrix

| Navigation Item | Path | SUPER_ADMIN | ORG_ADMIN | ASO_MANAGER | ANALYST | VIEWER | CLIENT |
|-----------------|------|-------------|-----------|-------------|---------|--------|--------|
| **Dashboard V2** | `/dashboard-v2` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Reviews** | `/growth-accelerators/reviews` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ASO AI Hub** | `/aso-ai-hub` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Admin Panel** | `/admin` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User Management** | `/admin/users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Org Management** | `/admin/organizations` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Client Portal** | `/client-portal` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

**Legend:**
- ✅ = Access granted
- ❌ = Access denied (route filtered from navigation)

---

## Code Examples

### Example 1: Add New Navigation Item

**Step 1:** Define navigation item in `src/constants/navigation.ts`
```typescript
export const NEW_FEATURE_NAV: NavigationItem = {
  path: '/new-feature',
  label: 'New Feature',
  icon: <NewFeatureIcon />,
  requiredFeature: 'new_feature', // V2 planned - not enforced in V1
};
```

**Step 2:** Add route allowance rule in `getAllowedRoutes()`
```typescript
case 'ORG_ADMIN':
  return [
    '/dashboard-v2',
    '/new-feature', // ← Add here
    // ... other routes
  ];
```

**Step 3:** Create route in `src/App.tsx`
```typescript
<Route path="/new-feature" element={<ProtectedRoute><NewFeaturePage /></ProtectedRoute>} />
```

**Step 4:** Test navigation filtering
```typescript
// User with ORG_ADMIN role should see "New Feature" in sidebar
// User with ANALYST role should NOT see it
```

---

### Example 2: Check Route Access Programmatically

**Use Case:** Show/hide UI element based on route access

```typescript
import { useQuery } from '@tanstack/react-query';
import { getAllowedRoutes } from '@/services/authz';
import { useAuth, useOrganization } from '@/hooks';

export function ConditionalFeature() {
  const { user } = useAuth();
  const { org } = useOrganization();

  const { data: allowedRoutes = [] } = useQuery({
    queryKey: ['allowed-routes', user?.id, org?.id],
    queryFn: () => getAllowedRoutes(user, org),
    enabled: !!user && !!org
  });

  const canAccessNewFeature = allowedRoutes.includes('/new-feature');

  if (!canAccessNewFeature) {
    return null; // Hide feature if not allowed
  }

  return (
    <div>
      <Link to="/new-feature">Go to New Feature</Link>
    </div>
  );
}
```

---

### Example 3: Debug Navigation Filtering

**Console Log Helper:**
```typescript
console.log('=== Navigation Filtering Debug ===');
console.log('User:', user?.email);
console.log('Org:', org?.name);
console.log('Role:', permissions?.role);
console.log('Is Demo:', isDemo);
console.log('Is Super Admin:', canManagePlatform);
console.log('Allowed Routes:', allowedRoutes);
console.log('Visible Nav Items:', visibleNavItems.map(item => item.path));
console.log('===================================');
```

**Expected Output (ORG_ADMIN):**
```
=== Navigation Filtering Debug ===
User: admin@example.com
Org: Example Organization
Role: ORG_ADMIN
Is Demo: false
Is Super Admin: false
Allowed Routes: ['/dashboard-v2', '/growth-accelerators/reviews', '/aso-ai-hub']
Visible Nav Items: ['/dashboard-v2', '/growth-accelerators/reviews', '/aso-ai-hub']
===================================
```

---

## Testing Navigation Access

### Manual Testing Checklist

**Test Case 1: SUPER_ADMIN Access**
- [ ] Login as SUPER_ADMIN user
- [ ] Verify all navigation items visible (including `/admin`)
- [ ] Verify no 403 errors when navigating to any route

**Test Case 2: ORG_ADMIN Access**
- [ ] Login as ORG_ADMIN user
- [ ] Verify org-level navigation items visible
- [ ] Verify `/admin` NOT visible in sidebar
- [ ] Verify 403 error if navigating to `/admin` directly (URL bar)

**Test Case 3: Demo Organization**
- [ ] Login as user in demo organization
- [ ] Verify all features visible (regardless of feature flags)
- [ ] Verify route allowance still enforced (role-based)

**Test Case 4: Role Change**
- [ ] Login as ANALYST
- [ ] Admin upgrades user to ASO_MANAGER
- [ ] Refresh page
- [ ] Verify new navigation items appear (e.g., `/growth-accelerators/reviews`)

---

### Automated Testing

**Test File:** `src/utils/navigation.test.ts`

```typescript
import { filterNavigationByRoutes } from './navigation';
import { NAVIGATION_ITEMS } from '@/constants/navigation';

describe('filterNavigationByRoutes', () => {
  it('shows all items for super admin', () => {
    const result = filterNavigationByRoutes(
      NAVIGATION_ITEMS,
      [], // Empty allowedRoutes (shouldn't matter)
      false, // Not demo
      [], // No features
      true // Is super admin
    );

    expect(result).toEqual(NAVIGATION_ITEMS); // All items visible
  });

  it('filters by route allowance for ORG_ADMIN', () => {
    const allowedRoutes = ['/dashboard-v2', '/growth-accelerators/reviews'];

    const result = filterNavigationByRoutes(
      NAVIGATION_ITEMS,
      allowedRoutes,
      false,
      [],
      false
    );

    expect(result).toHaveLength(2);
    expect(result.map(item => item.path)).toEqual(allowedRoutes);
  });

  it('bypasses feature check for demo org', () => {
    const allowedRoutes = ['/dashboard-v2'];

    const result = filterNavigationByRoutes(
      NAVIGATION_ITEMS,
      allowedRoutes,
      true, // Demo org
      [], // No features (but should be bypassed)
      false
    );

    expect(result).toHaveLength(1); // Route allowed, feature check bypassed
  });
});
```

---

## Troubleshooting

### Issue 1: Navigation Item Not Appearing

**Symptoms:**
- User expects to see navigation item but it's hidden
- User has correct role but item not visible

**Diagnosis:**
```typescript
// Add debug logging in AppSidebar.tsx
console.log('Navigation Debug:', {
  user: user?.email,
  role: permissions?.role,
  allowedRoutes,
  isDemo,
  canManagePlatform,
  visibleNavItems: visibleNavItems.map(i => i.path)
});
```

**Common Causes:**
1. **Route not in allowedRoutes for user's role**
   - Solution: Add route to `getAllowedRoutes()` for appropriate role(s)

2. **User role not updated in database**
   - Solution: Check `user_roles` table, update if needed

3. **React Query cache stale**
   - Solution: Hard refresh (Cmd+Shift+R) or invalidate cache

4. **Feature flag blocking (V2 planned)**
   - V1 Status: Should not occur (no feature flags in V1)

---

### Issue 2: Super Admin Not Seeing All Items

**Symptoms:**
- SUPER_ADMIN user missing navigation items
- `canManagePlatform` returning false

**Diagnosis:**
```sql
-- Check user role and org assignment
SELECT
  u.email,
  ur.role,
  ur.organization_id
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@example.com';
```

**Expected Result (for SUPER_ADMIN):**
```
email              | role         | organization_id
-------------------|--------------|----------------
admin@example.com  | SUPER_ADMIN  | NULL
```

**Solution:**
- `organization_id` MUST be `NULL` for platform-level SUPER_ADMIN
- If `organization_id` is set, user is org-level admin, not platform admin

---

### Issue 3: Demo Organization Not Bypassing Checks

**Symptoms:**
- Demo org users not seeing all features
- Feature flags enforced on demo org

**Diagnosis:**
```sql
-- Check demo mode setting
SELECT
  id,
  name,
  slug,
  settings->'demo_mode' AS demo_mode
FROM organizations
WHERE slug = 'next';
```

**Expected Result:**
```
id   | name | slug | demo_mode
-----|------|------|----------
uuid | Next | next | true
```

**Solution:**
```sql
-- Enable demo mode
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{demo_mode}',
  'true'::jsonb
)
WHERE slug = 'next';
```

---

## Related Documentation

- **V1 Authorization Guide:** [docs/02-architecture/system-design/authorization-v1.md](../../02-architecture/system-design/authorization-v1.md)
- **V1 Architecture:** [docs/02-architecture/ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md)
- **Feature Permissions (V2 Planned):** [docs/04-api-reference/feature-permissions.md](../../04-api-reference/feature-permissions.md)
- **usePermissions Hook:** src/hooks/usePermissions.ts (PRIMARY authorization method)
- **getAllowedRoutes Function:** src/services/authz.ts

---

**Document Version:** 2.0
**Last Updated:** January 20, 2025
**Maintained By:** Frontend Engineering Team
