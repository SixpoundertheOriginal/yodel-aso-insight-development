# Demo Mode Removal Plan

**Date**: 2025-11-12
**Status**: Ready for Implementation
**Priority**: Medium (Legacy cleanup, improves maintainability)

---

## Executive Summary

Demo mode is a legacy feature that restricted access to certain routes for "demo organizations". It caused a critical bug where ORG_ADMIN users couldn't access the User Management panel because their organization was marked as a demo org.

**Key Findings**:
- 17 files contain demo mode references (69 total occurrences)
- Database schema has NO `settings` column (already broken)
- Demo mode currently only activates for `slug === 'next'`
- No SQL migrations reference demo_mode
- Safe to remove without database changes

---

## Impact Analysis

### Critical Finding: Demo Mode Already Broken

The `useUserProfile` hook attempts to select a `settings` column that **doesn't exist** in the database:

```typescript
// src/hooks/useUserProfile.ts:28
organizations!profiles_organization_id_fkey(name, subscription_tier, slug, settings, access_level)
```

But the database schema shows:
```typescript
// src/integrations/supabase/types.ts:813-823
organizations: {
  Row: {
    created_at: string
    deleted_at: string | null
    domain: string | null
    id: string
    name: string
    slug: string
    subscription_tier: string | null
    updated_at: string
    // NO settings field!
  }
}
```

This means `organization?.settings?.demo_mode` is **always undefined**, and demo mode only activates via the hardcoded slug check: `slug === 'next'`.

---

## Files Affected (17 Total)

### Category 1: SAFE TO DELETE (No Dependencies)

These files can be completely removed:

1. **src/components/GlobalDemoIndicator.tsx**
   - Purpose: Shows "Demo Mode" badge in UI
   - Usage: NOT USED anywhere (grep found no imports)
   - Action: DELETE FILE

2. **src/components/demo/DemoAppSelectorOverlay.tsx**
   - Purpose: App picker modal for demo organizations
   - Usage: Only imported by DemoGrowthAcceleratorsLayout (which is also unused)
   - Action: DELETE FILE

3. **src/layouts/DemoGrowthAcceleratorsLayout.tsx**
   - Purpose: Wrapper layout for demo org pages
   - Usage: NOT USED anywhere (grep found no imports)
   - Action: DELETE FILE

4. **src/context/DemoSelectedAppContext.tsx**
   - Purpose: Context for storing demo org's selected app
   - Usage: Only used by DemoGrowthAcceleratorsLayout and DemoAppSelectorOverlay
   - Action: DELETE FILE

5. **src/config/demoKeywords.ts**
   - Purpose: Demo keyword data for "Next" app
   - Usage: NOT USED anywhere
   - Action: DELETE FILE

6. **src/config/demoPresets.ts**
   - Purpose: Demo app presets
   - Usage: NOT USED anywhere
   - Action: DELETE FILE

---

### Category 2: REFACTOR REQUIRED (Remove Demo Logic)

These files need demo mode logic removed:

#### 7. **src/hooks/useDemoOrgDetection.ts**
**Current Code**:
```typescript
export const useDemoOrgDetection = () => {
  const { profile, isLoading } = useUserProfile();
  const organization = profile?.organizations;
  const isDemoOrg = Boolean(organization?.settings?.demo_mode) ||
                    organization?.slug?.toLowerCase() === 'next';

  return { isDemoOrg, organization, loading: isLoading };
};
```

**Action**: DELETE ENTIRE FILE (only used for demo mode detection)

---

#### 8. **src/hooks/useUserProfile.ts**
**Current Code** (line 28):
```typescript
organizations!profiles_organization_id_fkey(name, subscription_tier, slug, settings, access_level)
```

**Problem**: Selects non-existent `settings` column

**Fix**:
```typescript
organizations!profiles_organization_id_fkey(name, subscription_tier, slug, access_level)
```

**Also Update Type Definition** (lines 7-10):
```typescript
// BEFORE
type UserProfile = Tables<'profiles'> & {
  organizations: (Pick<Tables<'organizations'>, 'name' | 'subscription_tier' | 'slug'> & {
    settings: { demo_mode?: boolean } | null;
  }) | null;
  user_roles: Pick<Tables<'user_roles'>, 'role' | 'organization_id'>[];
};

// AFTER
type UserProfile = Tables<'profiles'> & {
  organizations: (Pick<Tables<'organizations'>, 'name' | 'subscription_tier' | 'slug'> & {
    access_level?: string | null;
  }) | null;
  user_roles: Pick<Tables<'user_roles'>, 'role' | 'organization_id'>[];
};
```

---

#### 9. **src/config/allowedRoutes.ts**
**Current Code** (lines 12-21, 90-92):
```typescript
export const DEMO_REPORTING_ROUTES = [
  '/dashboard-v2',
  '/dashboard/executive',
  '/dashboard/analytics',
  '/dashboard/conversion-rate',
  '/growth-accelerators/keywords',
  '/growth-accelerators/reviews'
] as const;

// In getAllowedRoutes():
if (isDemoOrg) {
  return [...DEMO_REPORTING_ROUTES];
}
```

**Action**:
1. DELETE `DEMO_REPORTING_ROUTES` constant (lines 12-21)
2. REMOVE `isDemoOrg` parameter from `getAllowedRoutes()` function signature
3. DELETE demo org check (lines 90-92)

**Updated Function Signature**:
```typescript
// BEFORE
export function getAllowedRoutes({
  isDemoOrg,
  role,
  organizationId,
  orgAccessLevel,
  isSuperAdmin = false,
}: {
  isDemoOrg: boolean;
  role: Role;
  organizationId?: string | null;
  orgAccessLevel?: OrgAccessLevel | null;
  isSuperAdmin?: boolean;
}): string[] {
  if (isDemoOrg) {
    return [...DEMO_REPORTING_ROUTES];
  }
  // ...
}

// AFTER
export function getAllowedRoutes({
  role,
  organizationId,
  orgAccessLevel,
  isSuperAdmin = false,
}: {
  role: Role;
  organizationId?: string | null;
  orgAccessLevel?: OrgAccessLevel | null;
  isSuperAdmin?: boolean;
}): string[] {
  // Directly proceed to enterprise model (no demo check)
  // ...
}
```

---

#### 10. **src/components/AppSidebar.tsx**
**Current Code**:
```typescript
const { isDemoOrg } = useDemoOrgDetection();

// Line 220
const routes = getAllowedRoutes({ isDemoOrg, role, organizationId, orgAccessLevel, isSuperAdmin });
```

**Action**:
1. REMOVE `useDemoOrgDetection` import
2. REMOVE `isDemoOrg` from hook call
3. REMOVE `isDemoOrg` from `getAllowedRoutes()` call

**Updated Code**:
```typescript
// REMOVE: const { isDemoOrg } = useDemoOrgDetection();

// Line 220 (updated)
const routes = getAllowedRoutes({ role, organizationId, orgAccessLevel, isSuperAdmin });
```

---

#### 11. **src/components/Auth/ProtectedRoute.tsx**
**Current Code**:
```typescript
const { isDemoOrg } = useDemoOrgDetection();

// Line 58
const allowed = getAllowedRoutes({
  isDemoOrg,
  role,
  organizationId,
  orgAccessLevel: null,
  isSuperAdmin
});
```

**Action**:
1. REMOVE `useDemoOrgDetection` import
2. REMOVE `isDemoOrg` from hook call
3. REMOVE `isDemoOrg` from `getAllowedRoutes()` call

**Updated Code**:
```typescript
// REMOVE: const { isDemoOrg } = useDemoOrgDetection();

// Line 58 (updated)
const allowed = getAllowedRoutes({
  role,
  organizationId,
  orgAccessLevel: null,
  isSuperAdmin
});
```

---

#### 12. **src/context/AsoDataContext.tsx**
**Current Code** (lines 36-37, 83-84, 107-108):
```typescript
interface AsoDataContextType {
  // ...
  isDemo?: boolean;
  isDemoOrg?: boolean;
}

// In hook usage:
const { isDemo, isDemoOrg } = useAsoDataWithFallback(...)

// In context value:
isDemo,
isDemoOrg
```

**Action**:
1. REMOVE `isDemo` and `isDemoOrg` from interface
2. REMOVE from hook destructuring
3. REMOVE from context value
4. REMOVE from dependencies array (line 121-122)
5. REMOVE logger call (line 127)

**Note**: The `isDemo` flag from BigQuery is still useful (indicates demo data from BigQuery), keep only in `useAsoDataWithFallback`, but don't expose to context.

---

#### 13. **src/hooks/useAsoDataWithFallback.ts**
**Current Code**:
```typescript
import { useDemoOrgDetection } from './useDemoOrgDetection';

const { isDemoOrg } = useDemoOrgDetection();

// Line 163
setDataSourceStatus(isDemoOrg ? 'demo-data' : 'bigquery-failed-fallback');

// Line 172, 185, 197
isDemo: isDemoOrg

// Line 222 (return statement)
isDemoOrg
```

**Action**:
1. REMOVE `useDemoOrgDetection` import and hook call
2. REMOVE `isDemoOrg` from interface (line 23)
3. REMOVE `isDemoOrg` from all isDemo assignments (use BigQuery's isDemo flag only)
4. REMOVE `isDemoOrg` from return statement

**Keep**: `bigQueryResult.isDemo` - This indicates actual demo data from BigQuery, not organization status

**Updated Logic**:
```typescript
// Line 163 (updated)
setDataSourceStatus('bigquery-failed-fallback'); // Remove isDemoOrg check

// Lines 172, 185, 197 (updated)
isDemo: false // Or use bigQueryResult.isDemo if in BigQuery success path
```

---

#### 14-18. **Growth Accelerator Pages**

Files:
- src/pages/growth-accelerators/keywords.tsx
- src/pages/growth-accelerators/reviews.tsx
- src/pages/growth-accelerators/AppReviewDetailsPage.tsx
- src/pages/growth-accelerators/competitor-overview.tsx

**Pattern**: These pages likely import `DemoGrowthAcceleratorsLayout` or reference demo mode

**Action**:
1. Find and remove any `DemoGrowthAcceleratorsLayout` wrapper usage
2. Remove any `useDemoOrgDetection` imports
3. Search for any demo-specific conditional rendering

---

#### 19. **src/pages/preview.tsx**
**Action**: Check for demo mode references and remove

---

#### 20. **src/utils/navigation.ts**
**Action**: Check for demo mode references and remove

---

#### 21. **src/hooks/index.ts**
**Action**:
1. REMOVE export of `useDemoOrgDetection`
2. REMOVE export of any demo-related hooks

---

## Database Changes

**GOOD NEWS**: No database migrations needed!

The `settings` column was never created in the database, so we don't need to:
- Drop columns
- Migrate data
- Update RLS policies

The only reference to `demo_mode` was in application code trying to read a non-existent column.

---

## Implementation Steps

### Phase 1: Delete Unused Files (SAFE)
```bash
# Delete 6 completely unused files
rm src/components/GlobalDemoIndicator.tsx
rm src/components/demo/DemoAppSelectorOverlay.tsx
rm src/layouts/DemoGrowthAcceleratorsLayout.tsx
rm src/context/DemoSelectedAppContext.tsx
rm src/config/demoKeywords.ts
rm src/config/demoPresets.ts
rm src/hooks/useDemoOrgDetection.ts
```

### Phase 2: Update Core Configuration
1. Edit `src/config/allowedRoutes.ts`
   - Remove DEMO_REPORTING_ROUTES
   - Remove isDemoOrg parameter
   - Remove demo org check

2. Edit `src/hooks/useUserProfile.ts`
   - Remove settings from select query
   - Update type definition

### Phase 3: Update Route Guards
1. Edit `src/components/AppSidebar.tsx`
   - Remove useDemoOrgDetection
   - Update getAllowedRoutes call

2. Edit `src/components/Auth/ProtectedRoute.tsx`
   - Remove useDemoOrgDetection
   - Update getAllowedRoutes call

### Phase 4: Update Data Contexts
1. Edit `src/context/AsoDataContext.tsx`
   - Remove isDemoOrg from interface
   - Remove from context value

2. Edit `src/hooks/useAsoDataWithFallback.ts`
   - Remove useDemoOrgDetection
   - Remove isDemoOrg references
   - Keep BigQuery isDemo flag (different purpose)

### Phase 5: Clean Up Pages
1. Search all growth accelerator pages for demo references
2. Remove any DemoGrowthAcceleratorsLayout wrappers
3. Remove useDemoOrgDetection imports

### Phase 6: Update Barrel Exports
1. Edit `src/hooks/index.ts`
   - Remove useDemoOrgDetection export

---

## Testing Plan

### 1. Route Access Testing
**Test**: ORG_ADMIN can access User Management
```
- Login as cli@yodelmobile.com
- Navigate to sidebar
- Verify "User Management" link appears
- Click and verify /admin/users loads
```

### 2. SUPER_ADMIN Access
**Test**: SUPER_ADMIN has full access
```
- Login as super admin
- Verify "System Control" link appears
- Verify access to all admin routes
```

### 3. Regular User Access
**Test**: Regular users have default access
```
- Login as regular org user
- Verify dashboard, growth accelerators accessible
- Verify admin routes blocked
```

### 4. Data Loading
**Test**: BigQuery data loads correctly
```
- Navigate to Dashboard V2
- Verify all apps load (not just first one)
- Verify data displays correctly
```

### 5. Organization Switching
**Test**: Multi-org users can switch
```
- Login as multi-org user
- Switch between organizations
- Verify access permissions update correctly
```

---

## Rollback Plan

If issues arise, we can rollback by:
1. Restore deleted files from git history
2. Revert changes to modified files
3. No database rollback needed (no schema changes)

**Git Commands**:
```bash
# Restore specific file
git checkout HEAD~1 -- src/hooks/useDemoOrgDetection.ts

# Revert entire commit
git revert <commit-hash>
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking route access | Low | High | Comprehensive testing of all role types |
| Data loading issues | Very Low | Medium | BigQuery isDemo flag preserved |
| Missing demo features | None | None | Demo mode already non-functional |
| Database errors | None | None | No schema changes |

**Overall Risk**: LOW - Demo mode is already broken, we're just cleaning up dead code

---

## Success Criteria

- [ ] All 17 files updated or deleted
- [ ] No TypeScript errors
- [ ] All route access tests pass
- [ ] ORG_ADMIN can access User Management
- [ ] SUPER_ADMIN has full access
- [ ] Regular users have correct access
- [ ] BigQuery data loads correctly
- [ ] No console errors related to demo mode
- [ ] Build passes
- [ ] All existing functionality works

---

## Post-Implementation

### Documentation Updates
1. Update USER_MANAGEMENT_GUIDE.md to remove demo mode references
2. Update any onboarding docs that mention demo mode
3. Add note to changelog about demo mode removal

### Code Quality
1. Run linter to ensure code style consistency
2. Remove any orphaned imports
3. Verify no unused variables remain

### Monitoring
1. Monitor error logs for 24 hours post-deployment
2. Watch for any route access issues
3. Track user feedback

---

## Notes

- Demo mode was designed to restrict access for specific organizations
- It caused the ORG_ADMIN user management bug (main reason for removal)
- Database never implemented settings column (already broken)
- Only one hardcoded slug check remains: `slug === 'next'`
- BigQuery's `isDemo` flag is different (indicates demo data source) and should be preserved
- No production users are currently using demo mode features

---

## Approval

- [ ] Technical Lead Review
- [ ] QA Testing Complete
- [ ] Stakeholder Approval
- [ ] Scheduled for Deployment

---

**End of Plan**
