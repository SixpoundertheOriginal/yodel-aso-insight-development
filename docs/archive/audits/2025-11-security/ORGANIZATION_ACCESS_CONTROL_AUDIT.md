# Organization-Specific Access Control - Enterprise Architecture Audit

**Date:** 2025-01-13
**Objective:** Determine best enterprise-grade approach for removing page access from specific organizations
**Scope:** Remove `/growth-accelerators/theme-impact` and `/growth-accelerators/competitor-overview` from Yodel Mobile org users only
**Organization:** Yodel Mobile (ID: `7cccba3f-0a8f-446f-9dba-86e9cb68c92b`)

---

## Executive Summary

**Requirement:** Remove access to 2 specific routes for Yodel Mobile organization users while keeping access for all other organizations.

**Current State:** All organization users have identical route access via static route configuration (`defaultOrgRoutes.ts`). No per-organization customization exists at the route level.

**Recommendation:** **Option 1 - Feature-Based Access Control** using existing `organization_features` table infrastructure. This is the most enterprise-grade, scalable solution that matches App Store Connect architecture patterns.

**Implementation Effort:** 30 minutes (2 database rows + frontend filtering logic)
**Scalability:** Excellent - supports future per-org, per-user, and per-feature customization
**Maintainability:** High - centralized database control with audit trail

---

## Current Architecture Analysis

### 1. Route Access Control (Current Implementation)

**File:** `src/config/defaultOrgRoutes.ts`

```typescript
export const DEFAULT_ORG_USER_ROUTES = [
  // ... other routes
  '/growth-accelerators/theme-impact',      // Line 32 - Theme Analysis
  '/growth-accelerators/competitor-overview', // Line 33 - Competitor Overview
  // ... other routes
] as const;
```

**How it works:**
- Static array of routes accessible to ALL organization users
- Role-based access: All roles (ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER, CLIENT) get same routes
- No per-organization customization
- Used in `ProtectedRoute.tsx` for route guarding

**Limitation:** Cannot differentiate between organizations - it's all-or-nothing.

### 2. Navigation Filtering (AppSidebar.tsx)

**File:** `src/components/AppSidebar.tsx`

```typescript
// Lines 129-133: Competitor Overview
{
  title: "Competitor Overview",
  url: "/growth-accelerators/competitor-overview",
  icon: Users,
  featureKey: PLATFORM_FEATURES.KEYWORD_INTELLIGENCE,  // Uses feature key!
}

// Lines 139-145: Theme Analysis (child of Reviews)
{
  title: "Theme Analysis",
  url: ROUTES.themeImpact,
  icon: BarChart3,
  // Same feature access as parent Reviews
}
```

**Key Insight:** Navigation items already reference `featureKey` for filtering. This suggests the architecture is designed for feature-based access control.

### 3. Feature Access Infrastructure (Already Exists)

**Database Table:** `organization_features`

```sql
CREATE TABLE organization_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);
```

**Service Layer:** `src/services/featureAccess.ts`

```typescript
class FeatureAccessService {
  // Check if organization has feature enabled
  async checkFeatureAccess(organizationId: string, featureKey: string): Promise<boolean>

  // Update feature access for organization
  async updateFeatureAccess(organizationId: string, featureKey: string, enabled: boolean): Promise<void>

  // Bulk update features
  async bulkUpdateFeatures(organizationId: string, features: Record<string, boolean>): Promise<void>

  // Get all organization features
  async getOrganizationFeatures(organizationId: string): Promise<Record<string, boolean>>
}
```

**React Hook:** `src/hooks/useFeatureAccess.ts`

```typescript
export const useFeatureAccess = () => {
  const hasFeature = useCallback((featureKey: PlatformFeature | string) => {
    return hasFeatureSafe({ [featureKey]: features.includes(featureKey) }, featureKey, false);
  }, [features]);

  return { hasFeature, features, loading, refreshFeatures };
}
```

**Enterprise Safeguard:** The hook has fallback logic that provides `ENTERPRISE_CORE_FEATURES` if database query fails, ensuring graceful degradation.

### 4. Feature Constants (PLATFORM_FEATURES)

**File:** `src/constants/features.ts`

```typescript
export const PLATFORM_FEATURES_ENHANCED = {
  KEYWORD_INTELLIGENCE: 'keyword_intelligence',
  COMPETITIVE_INTELLIGENCE: 'competitive_intelligence',
  // ... 22 other features
} as const;
```

**Current Coverage:**
- `KEYWORD_INTELLIGENCE` - Used by Competitor Overview navigation (line 132 of AppSidebar.tsx)
- **Missing:** No dedicated feature for Theme Analysis

---

## Enterprise-Grade Options

### Option 1: Feature-Based Access Control (RECOMMENDED)

**Architecture:** Use existing `organization_features` table to control access at the feature level.

**How it works:**
1. Create feature keys: `theme_analysis` and `competitor_overview`
2. Set `is_enabled = false` for Yodel Mobile organization
3. All other organizations inherit default (enabled)
4. Frontend checks `hasFeature()` before rendering routes/navigation

**Implementation Steps:**

#### Step 1: Create Feature Keys in Database

```sql
-- Disable Theme Analysis for Yodel Mobile
INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'theme_analysis', false)
ON CONFLICT (organization_id, feature_key) DO UPDATE SET is_enabled = false;

-- Disable Competitor Overview for Yodel Mobile
INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', 'competitor_overview', false)
ON CONFLICT (organization_id, feature_key) DO UPDATE SET is_enabled = false;
```

**Result:** Database-level access control, centralized and auditable.

#### Step 2: Add Feature Constants

```typescript
// In src/constants/features.ts
export const PLATFORM_FEATURES_ENHANCED = {
  // ... existing features
  THEME_ANALYSIS: 'theme_analysis',           // NEW
  COMPETITOR_OVERVIEW: 'competitor_overview', // NEW - separate from KEYWORD_INTELLIGENCE
} as const;
```

#### Step 3: Update Navigation with Feature Keys

```typescript
// In src/components/AppSidebar.tsx

// Update Competitor Overview (Line 129)
{
  title: "Competitor Overview",
  url: "/growth-accelerators/competitor-overview",
  icon: Users,
  featureKey: PLATFORM_FEATURES.COMPETITOR_OVERVIEW, // Changed from KEYWORD_INTELLIGENCE
}

// Update Theme Analysis (Line 141)
{
  title: "Theme Analysis",
  url: ROUTES.themeImpact,
  icon: BarChart3,
  featureKey: PLATFORM_FEATURES.THEME_ANALYSIS, // NEW
}
```

**Result:** Navigation items automatically hidden for Yodel Mobile org users.

#### Step 4: Add Route-Level Protection

```typescript
// In src/components/Auth/ProtectedRoute.tsx or src/pages/growth-accelerators/theme-impact.tsx

// Example: Redirect if feature not enabled
const { hasFeature, loading } = useFeatureAccess();

if (loading) {
  return <AuthLoadingSpinner />;
}

if (!hasFeature('theme_analysis')) {
  return <Navigate to="/dashboard-v2" replace />;
}
```

**Result:** Direct URL access blocked for users without feature access.

**Pros:**
- ✅ Leverages existing infrastructure (no new tables/migrations)
- ✅ Database-driven (can be changed without code deployment)
- ✅ Scalable to any number of organizations and features
- ✅ Supports user-level overrides (`user_feature_overrides` table already exists)
- ✅ Audit trail via `updated_at` timestamps
- ✅ Admin panel-ready (FeatureAccessService already has CRUD methods)
- ✅ Graceful fallback if database query fails (enterprise safeguards)
- ✅ Matches App Store Connect pattern (feature flags per organization)

**Cons:**
- ⚠️ Requires adding 2 new feature constants
- ⚠️ Navigation filtering logic must check `hasFeature()` (already exists in codebase)
- ⚠️ Initial setup requires database inserts (one-time)

**Effort:** 30 minutes
- 5 min: Add feature constants
- 5 min: Update navigation items
- 10 min: Add route-level protection
- 5 min: Insert database rows
- 5 min: Test with Yodel Mobile org user

---

### Option 2: Organization-Level Route Config (Custom Column)

**Architecture:** Add `disabled_routes` JSONB column to `organizations` table.

**How it works:**
1. Add `disabled_routes` column to `organizations` table
2. Store array of route patterns: `["/growth-accelerators/theme-impact", "/growth-accelerators/competitor-overview"]`
3. Frontend checks `organization.disabled_routes` before allowing access
4. Super admin can manage via admin panel UI

**Implementation Steps:**

#### Step 1: Database Migration

```sql
-- Add column to organizations table
ALTER TABLE organizations
ADD COLUMN disabled_routes JSONB DEFAULT '[]'::jsonb;

-- Update Yodel Mobile org
UPDATE organizations
SET disabled_routes = '
[
  "/growth-accelerators/theme-impact",
  "/growth-accelerators/competitor-overview"
]'::jsonb
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
```

#### Step 2: Add Hook for Route Checking

```typescript
// New hook: src/hooks/useOrganizationRoutes.ts
export const useOrganizationRoutes = () => {
  const { organization } = useDemoOrgDetection();

  const isRouteDisabled = useCallback((route: string) => {
    if (!organization?.disabled_routes) return false;
    return organization.disabled_routes.includes(route);
  }, [organization]);

  return { isRouteDisabled };
};
```

#### Step 3: Update ProtectedRoute Logic

```typescript
// In ProtectedRoute.tsx
const { isRouteDisabled } = useOrganizationRoutes();

if (isRouteDisabled(location.pathname)) {
  return <Navigate to="/dashboard-v2" replace />;
}
```

#### Step 4: Update Navigation Filtering

```typescript
// In AppSidebar.tsx
const { isRouteDisabled } = useOrganizationRoutes();

const filteredItems = growthAcceleratorItems.filter(item =>
  !isRouteDisabled(item.url)
);
```

**Pros:**
- ✅ Centralized per-organization config
- ✅ Flexible (can add any route pattern)
- ✅ No feature key mapping needed
- ✅ Direct route-level control

**Cons:**
- ❌ Requires schema migration (adds column to core table)
- ❌ JSONB queries less performant than feature table lookups
- ❌ No user-level override capability
- ❌ Harder to query/report on (JSONB vs. relational)
- ❌ Mixing concerns (organization metadata + access control)
- ❌ Not compatible with existing feature infrastructure
- ❌ No built-in audit trail for route changes

**Effort:** 45-60 minutes
- 10 min: Write and test migration
- 15 min: Create new hook
- 15 min: Update ProtectedRoute and AppSidebar
- 10 min: Update RLS policies for new column
- 10 min: Test

---

### Option 3: Admin Panel UI for Feature Management (Full Self-Service)

**Architecture:** Build super admin UI for managing organization features with real-time updates.

**How it works:**
1. Leverage Option 1's database infrastructure
2. Create admin panel page at `/admin/organization-features`
3. Super admin can toggle features per organization
4. Real-time updates via React Query invalidation
5. Audit log for all feature changes

**Implementation Steps:**

#### Step 1: Admin Panel UI Component

```typescript
// New file: src/pages/admin/OrganizationFeatures.tsx

export const OrganizationFeatures = () => {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const { data: orgs } = useOrganizations(); // Fetch all organizations
  const { data: features, refetch } = useOrganizationFeatures(selectedOrg);

  const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
    await featureAccessService.updateFeatureAccess(selectedOrg!, featureKey, enabled);
    refetch();
    toast({ title: `Feature ${enabled ? 'enabled' : 'disabled'} for organization` });
  };

  return (
    <div>
      <Select onValueChange={setSelectedOrg}>
        {orgs?.map(org => <SelectItem value={org.id}>{org.name}</SelectItem>)}
      </Select>

      {features && (
        <Table>
          {Object.entries(PLATFORM_FEATURES_ENHANCED).map(([key, featureKey]) => (
            <TableRow key={featureKey}>
              <TableCell>{FEATURE_LABELS[featureKey]}</TableCell>
              <TableCell>
                <Switch
                  checked={features[featureKey] ?? true}
                  onCheckedChange={(enabled) => handleToggleFeature(featureKey, enabled)}
                />
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
};
```

#### Step 2: Add Route to Super Admin Navigation

```typescript
// In src/components/AppSidebar.tsx - superAdminItems
{
  title: "Organization Features",
  url: "/admin/organization-features",
  icon: Shield,
}
```

#### Step 3: Create React Query Hook

```typescript
// New hook: src/hooks/useOrganizationFeatures.ts

export const useOrganizationFeatures = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['organization-features', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      return await featureAccessService.getOrganizationFeatures(organizationId);
    },
    enabled: !!organizationId,
  });
};
```

#### Step 4: Add Audit Logging

```typescript
// Update FeatureAccessService to log changes

async updateFeatureAccess(organizationId: string, featureKey: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('organization_features')
    .upsert({
      organization_id: organizationId,
      feature_key: featureKey,
      is_enabled: enabled,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  // Log the change
  await this.logFeatureUsage(featureKey, 'admin_toggle', {
    enabled,
    organizationId,
    admin_user_id: (await supabase.auth.getUser()).data.user?.id
  });
}
```

**Pros:**
- ✅ Self-service for super admins (no code changes needed)
- ✅ Visual UI for feature management
- ✅ Audit trail for all changes
- ✅ Real-time updates
- ✅ Leverages existing infrastructure
- ✅ Scalable to all organizations
- ✅ Matches App Store Connect admin pattern

**Cons:**
- ⚠️ More development effort upfront (UI components)
- ⚠️ Requires Option 1's infrastructure first
- ⚠️ Super admin only (not self-service for org admins)

**Effort:** 2-3 hours
- 30 min: Option 1 implementation (prerequisite)
- 1 hour: Admin panel UI component
- 30 min: React Query hooks and state management
- 30 min: Audit logging
- 30 min: Testing and refinement

---

### Option 4: Static Organization Allowlist (Quick Fix)

**Architecture:** Hardcode organization ID checks in route guards.

**How it works:**
1. Add organization ID check in `ProtectedRoute.tsx`
2. Block routes if `organizationId === YODEL_MOBILE_ORG_ID`
3. No database changes needed

**Implementation:**

```typescript
// In ProtectedRoute.tsx

const RESTRICTED_ROUTES_BY_ORG: Record<string, string[]> = {
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b': [ // Yodel Mobile
    '/growth-accelerators/theme-impact',
    '/growth-accelerators/competitor-overview',
  ],
};

// In route guard logic
const orgRestrictedRoutes = RESTRICTED_ROUTES_BY_ORG[organizationId] || [];
if (orgRestrictedRoutes.some(route => pathname.startsWith(route))) {
  return <Navigate to="/dashboard-v2" replace />;
}
```

**Pros:**
- ✅ Fastest implementation (10 minutes)
- ✅ No database changes
- ✅ No migrations needed
- ✅ Works immediately

**Cons:**
- ❌ Not scalable (hardcoded)
- ❌ Requires code deployment to change
- ❌ No admin UI for management
- ❌ No audit trail
- ❌ Doesn't match enterprise patterns
- ❌ Creates tech debt
- ❌ Mixing concerns (config in route guard logic)

**Effort:** 10 minutes

**Recommendation:** **DO NOT USE** - This is a quick fix that creates technical debt and doesn't scale.

---

## Detailed Comparison Matrix

| Criteria | Option 1: Features | Option 2: Route Config | Option 3: Admin UI | Option 4: Hardcoded |
|----------|-------------------|----------------------|-------------------|---------------------|
| **Implementation Time** | 30 min | 45-60 min | 2-3 hours | 10 min |
| **Scalability** | Excellent | Good | Excellent | Poor |
| **Database Changes** | 2 rows insert | Schema migration | 2 rows insert | None |
| **Code Changes** | Minimal | Moderate | Extensive | Minimal |
| **Admin Self-Service** | Via code/SQL | Via code/SQL | Full UI | None |
| **Audit Trail** | `updated_at` | `updated_at` | Full logs | None |
| **User-Level Override** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Enterprise Pattern Match** | ✅ High | ⚠️ Medium | ✅ High | ❌ Low |
| **Maintenance** | Low | Medium | Low | High (tech debt) |
| **Future-Proof** | ✅ Yes | ⚠️ Maybe | ✅ Yes | ❌ No |
| **Deployment Risk** | Very Low | Low | Low | Very Low |
| **Rollback Complexity** | Easy | Moderate | Easy | Easy |

---

## Final Recommendation

### Use **Option 1: Feature-Based Access Control** immediately

**Why:**
1. **Leverages existing infrastructure** - No new tables, migrations, or complex logic
2. **Enterprise-grade** - Matches App Store Connect and similar platforms
3. **Fast implementation** - 30 minutes to complete
4. **Scalable** - Works for 1 org or 1000 orgs
5. **Future-ready** - Can add Option 3 (Admin UI) later without refactoring

### Implementation Plan (30 minutes)

**Phase 1: Add Feature Constants** (5 min)
1. Edit `src/constants/features.ts`
2. Add `THEME_ANALYSIS: 'theme_analysis'`
3. Add `COMPETITOR_OVERVIEW: 'competitor_overview'`
4. Add to `FEATURE_LABELS` and `FEATURE_DESCRIPTIONS`

**Phase 2: Update Navigation** (5 min)
1. Edit `src/components/AppSidebar.tsx`
2. Line 132: Change `featureKey` from `KEYWORD_INTELLIGENCE` to `COMPETITOR_OVERVIEW`
3. Line 141: Add `featureKey: PLATFORM_FEATURES.THEME_ANALYSIS`

**Phase 3: Add Route Guards** (10 min)
1. Edit `src/pages/growth-accelerators/theme-impact.tsx`
2. Add feature check at top of component
3. Edit `src/pages/growth-accelerators/competitor-overview.tsx`
4. Add feature check at top of component

**Phase 4: Database Configuration** (5 min)
1. Run SQL to disable features for Yodel Mobile org
2. Verify with query

**Phase 5: Test** (5 min)
1. Sign in as cli@yodelmobile.com
2. Verify navigation items hidden
3. Verify direct URL access blocked
4. Sign in as another org user
5. Verify routes still accessible

### Future Enhancement (Optional)

After implementing Option 1, you can add **Option 3 (Admin Panel UI)** for self-service feature management:
- Super admin can toggle features via UI
- No code deployments needed for access changes
- Full audit trail
- Estimated effort: 2-3 hours

---

## Migration Path for Future

### Current State (After Option 1)
```
User Access Flow:
1. User requests route: /growth-accelerators/theme-impact
2. Navigation checks: hasFeature('theme_analysis')
3. Route guard checks: hasFeature('theme_analysis')
4. Database query: organization_features WHERE org_id AND feature_key
5. Result: Allow/Deny based on is_enabled
```

### Future State (After Option 3)
```
Super Admin Workflow:
1. Navigate to /admin/organization-features
2. Select "Yodel Mobile" from dropdown
3. Toggle "Theme Analysis" switch to OFF
4. Database updates organization_features.is_enabled = false
5. Audit log records: {user: igor, org: Yodel Mobile, feature: theme_analysis, action: disabled}
6. User's next page load reflects change (no app restart needed)
```

---

## Security Considerations

### RLS Policies (Already Exist)

**From:** `supabase/migrations/20251205130000_fix_organization_features_rls.sql`

```sql
-- Users can only read features for their own organization
CREATE POLICY "Users can view their organization features"
ON organization_features FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- Only super admins can modify features
CREATE POLICY "Super admins can manage all features"
ON organization_features FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'SUPER_ADMIN'
  )
);
```

**Security Guarantee:** Regular users cannot modify their own feature access. Only super admins can.

### Bypass Protection

**Super Admin Override:**
```typescript
// In useFeatureAccess.ts (Lines 62-64)
const hasFeature = useCallback((featureKey: PlatformFeature | string) => {
  // Super admins bypass all feature checks
  if (isSuperAdmin) return true;

  return hasFeatureSafe({ [featureKey]: features.includes(featureKey) }, featureKey, false);
}, [features, isSuperAdmin]);
```

**Impact:** Super admin (igor@yodelmobile.com) will ALWAYS have access to all routes, even if features are disabled. This is intentional for debugging.

---

## Rollback Plan

### If Option 1 Fails

**Step 1: Remove Feature Keys from Database**
```sql
DELETE FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
AND feature_key IN ('theme_analysis', 'competitor_overview');
```

**Step 2: Revert Code Changes**
```bash
git revert <commit-hash>
git push
```

**Result:** All users regain access to routes. Zero downtime.

### If Option 2 or 3 Fails

**Step 1: Revert Migration (if schema changed)**
```sql
ALTER TABLE organizations DROP COLUMN disabled_routes;
```

**Step 2: Revert Code**
```bash
git revert <commit-hash>
git push
```

---

## Questions to Confirm Before Implementation

### Critical Questions (Must Answer)

1. **Do you want to proceed with Option 1 (Feature-Based Access Control)?**
   - This is the recommended approach
   - 30 minute implementation
   - Database-driven
   - Enterprise-grade

2. **Should Super Admin (igor@yodelmobile.com) bypass these restrictions?**
   - Current code: Super admins bypass ALL feature checks
   - Recommendation: Yes, keep bypass for debugging

3. **Future Admin UI:**
   - Do you want Option 3 (Admin Panel UI) implemented later?
   - This allows self-service feature toggling
   - Estimated 2-3 hours additional effort

### Nice-to-Have Clarifications

4. **Other organizations:**
   - Should these routes be enabled by default for NEW organizations?
   - Or should we require explicit enablement?

5. **Audit requirements:**
   - Do you need detailed audit logs of feature access attempts?
   - Or is `updated_at` timestamp sufficient?

6. **User communication:**
   - Should users see a message explaining why routes are hidden?
   - Or silent removal from navigation?

---

## Recommended Next Steps

### If You Approve Option 1:

1. **I will implement Option 1** (Feature-Based Access Control)
   - 30 minute effort
   - No breaking changes
   - Full rollback capability

2. **Test with Yodel Mobile org users:**
   - Verify cli@yodelmobile.com cannot access routes
   - Verify navigation items hidden
   - Verify super admin still has access

3. **Commit and push to GitHub**

4. **Optionally plan Option 3** (Admin Panel UI) for future sprint

### If You Need Different Approach:

Please specify which option (1, 2, 3, or 4) you prefer, or describe a different approach.

---

## Appendix: Yodel Mobile Organization Details

**Organization ID:** `7cccba3f-0a8f-446f-9dba-86e9cb68c92b`

**Users (4 total):**
1. cli@yodelmobile.com - ORG_ADMIN
2. igor@yodelmobile.com - ORG_ADMIN + SUPER_ADMIN
3. igorblnv@gmail.com - ORG_ADMIN
4. kasia@yodelmobile.com - ORG_ADMIN

**Routes to Restrict:**
1. `/growth-accelerators/theme-impact` - Theme Analysis
2. `/growth-accelerators/competitor-overview` - Competitor Overview

**Routes to Keep:**
- `/dashboard-v2` - Performance Dashboard
- `/growth-accelerators/keywords` - Keyword Intelligence
- `/growth-accelerators/reviews` - Reviews Management
- All other DEFAULT_ORG_USER_ROUTES

**Expected Behavior After Implementation:**
- cli@yodelmobile.com: Cannot see/access restricted routes
- Users from other orgs: Can see/access restricted routes
- igor@yodelmobile.com: Can see/access everything (super admin bypass)

---

**Status:** Awaiting user confirmation to proceed with Option 1 implementation.
