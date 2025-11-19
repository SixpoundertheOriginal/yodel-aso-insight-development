# Database Views and Edge Functions - Complete Inventory

**Generated:** November 13, 2025
**Repository:** yodel-aso-insight
**Scope:** All database views, Edge Functions, and organization filtering logic

---

## EXECUTIVE SUMMARY

### Key Findings

1. **Database Views: 5 Main Views**
   - `user_permissions_unified` - CRITICAL: Single source of truth for permissions
   - `vw_critical_themes` - Product theme analysis dashboard
   - `vw_competitor_benchmark_matrix` - Competitive analysis
   - `vw_feature_gap_opportunities` - Feature gap identification
   - `audit_logs_recent` - Security monitoring (last 24 hours)

2. **Edge Functions: 9 Admin Functions**
   - All located in `supabase/functions/admin-*`
   - Implement multi-level access control (super_admin > org_admin > user)
   - Use unified `user_permissions_unified` view for permission resolution

3. **Organization Filtering Pattern**
   - PRIMARY: RLS (Row Level Security) policies at database level
   - SECONDARY: Edge Function access control checks
   - UNIFIED: All use `user_permissions_unified` view

4. **Security Architecture**
   - Role-based access control (RBAC) via `user_roles` table
   - Super admin check via `is_super_admin()` RPC function
   - Organization membership via `user_roles` table
   - Audit logging for sensitive operations

---

## PART 1: DATABASE VIEWS

### 1. `user_permissions_unified` - CRITICAL SSOT (Single Source of Truth)

**Location:** `/supabase/migrations/20251109050000_restore_user_permissions_unified_view.sql`

**Purpose:** Centralized permission resolution for all authentication

**Schema:**
```sql
CREATE VIEW public.user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,
  ur.role::text AS role,
  'user_roles'::text AS role_source,
  (ur.organization_id IS NULL) AS is_platform_role,
  o.name AS org_name,
  o.slug AS org_slug,
  ur.created_at AS resolved_at,
  (ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
  (ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NOT NULL) AS is_org_scoped_role,
  CASE
    WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
    WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
    WHEN ur.role::text = 'ASO_MANAGER' THEN 'aso_manager'
    WHEN ur.role::text = 'ANALYST' THEN 'analyst'
    WHEN ur.role::text = 'VIEWER' THEN 'viewer'
    ELSE 'viewer'
  END AS effective_role
FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;
```

**Organization Filtering:**
- Joins with `user_roles` table to restrict to user's organizations
- Includes organization metadata (name, slug) for frontend display
- Normalized role values for frontend consistency
- Boolean flags for permission checks

**RLS Policies:** Protected by `user_roles` table RLS
- Users can only see their own roles
- Service role (Edge Functions) has full access

**Used By:**
- `supabase/functions/_shared/auth-utils.ts` (resolveUserPermissions function)
- All admin Edge Functions for permission resolution
- Frontend `usePermissions` hook

---

### 2. `vw_critical_themes` - Product Insights Dashboard

**Location:** `/supabase/migrations/20250111000000_create_theme_impact_scoring.sql` (lines 153-188)

**Purpose:** Quick access to high-impact user-reported themes

**Schema:**
```sql
CREATE OR REPLACE VIEW vw_critical_themes AS
SELECT
  tis.id,
  tis.monitored_app_id,
  tis.organization_id,
  ma.app_name,
  tis.theme,
  tis.theme_category,
  tis.impact_score,
  tis.impact_level,
  tis.urgency,
  tis.mention_count,
  tis.avg_sentiment,
  tis.trend_direction,
  tis.week_over_week_change,
  tis.recommended_action,
  tis.potential_rating_impact,
  tis.analysis_date,
  tis.last_seen_date
FROM theme_impact_scores tis
JOIN monitored_apps ma ON tis.monitored_app_id = ma.id
WHERE
  tis.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    tis.urgency IN ('immediate', 'high')
    OR tis.impact_score > 75
    OR (tis.trend_direction = 'rising' AND tis.impact_score > 50)
  )
ORDER BY
  CASE tis.urgency
    WHEN 'immediate' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  tis.impact_score DESC;
```

**Organization Filtering:**
- Filters via `organization_id` column in underlying `theme_impact_scores` table
- Shows only themes from user's own organization's apps

**RLS Policies:**
- `theme_impact_scores` table has RLS:
  ```sql
  CREATE POLICY "Users see their org theme scores"
  ON theme_impact_scores FOR SELECT
  USING (
    organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );
  ```

**Admin Access:** Super admins can see all organizations' themes

---

### 3. `vw_competitor_benchmark_matrix` - Competitive Analysis

**Location:** `/supabase/migrations/20250110000000_competitive_analysis_phase1.sql` (lines 118-176)

**Purpose:** Latest competitor metrics with percentile rankings

**Key Features:**
- Tracks latest snapshots for each competitor
- Calculates percentile ranks within comparison set
- Shows rating, sentiment, review velocity metrics

**Organization Filtering:**
- Via `organization_id` in underlying `competitor_metrics_snapshots` table
- Only shows competitors for user's organization's apps

**RLS Implementation:** Same as theme_impact_scores table

---

### 4. `vw_feature_gap_opportunities` - Feature Gap Analysis

**Location:** `/supabase/migrations/20250110000000_competitive_analysis_phase1.sql` (lines 183-200+)

**Purpose:** Identify feature gaps vs competitors ranked by opportunity score

**Organization Filtering:**
- Via `organization_id` in `feature_sentiment_analysis` table
- Filtered to gaps where `is_gap = TRUE`

**RLS:** Protected by `feature_sentiment_analysis` table RLS policies

---

### 5. `audit_logs_recent` - Security Monitoring

**Location:** `/supabase/migrations/20251109010000_create_audit_logs.sql` (lines 313-337)

**Purpose:** Recent audit logs (last 24 hours) for security monitoring

**Schema:**
```sql
CREATE OR REPLACE VIEW public.audit_logs_recent AS
SELECT
  al.id,
  al.user_email,
  o.name as organization_name,
  al.action,
  al.resource_type,
  al.status,
  al.created_at,
  al.ip_address,
  CASE
    WHEN al.status = 'denied' THEN '🔴 DENIED'
    WHEN al.status = 'failure' THEN '⚠️ FAILED'
    ELSE '✅ SUCCESS'
  END as status_display
FROM audit_logs al
LEFT JOIN organizations o ON al.organization_id = o.id
WHERE al.created_at > now() - interval '24 hours'
ORDER BY al.created_at DESC;
```

**Organization Filtering:**
- Via `organization_id` in `audit_logs` table
- Shows actions for user's organization

**RLS Policies:**
```sql
CREATE POLICY "users_view_own_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('org_admin', 'super_admin')
    )
  )
);
```

---

## PART 2: SUPABASE EDGE FUNCTIONS

All Edge Functions are located in `/supabase/functions/`

### Admin Functions (9 total)

#### 1. `admin-dashboard-metrics`
**File:** `/supabase/functions/admin-dashboard-metrics/index.ts`
**Purpose:** Aggregate system metrics for admin dashboard

**Access Control:**
- No explicit auth check in current implementation (MOCK ONLY)
- Status: Placeholder implementation

**Organization Filtering:** None (platform-wide metrics)

---

#### 2. `admin-organizations`
**File:** `/supabase/functions/admin-organizations/index.ts` (10.5 KB)
**Purpose:** Manage organizations (CRUD operations)

**Access Control:**
```typescript
// Check if super admin
const { data: isSA } = await supabase.rpc("is_super_admin");

// GET: List organizations
if (!isSA) {
  // restrict to caller orgs
  const { data: orgs } = await supabase.from("user_roles")
    .select("organization_id")
    .eq("user_id", uid);
  const ids = (orgs || []).map((r: any) => r.organization_id);
  query = query.in("id", ids);
} else if (orgFilter) {
  // Super admin filtering by specific org
  query = query.eq("id", orgFilter);
}
```

**Methods:**
- `GET /` - List organizations (restricted to user's orgs unless super admin)
- `POST /` - Create organization (super admin only)
- `PUT /:id` - Update organization (org admin or super admin)
- `DELETE /:id` - Delete organization (super admin only)

**Audit Logging:** Yes, logs all modifications

---

#### 3. `admin-users`
**File:** `/supabase/functions/admin-users/index.ts` (14+ KB)
**Purpose:** Manage user accounts and roles

**Access Control:**
```typescript
const { data: userRes } = await supabase.auth.getUser();
const uid = userRes?.user?.id;

const { data: isSA } = await supabase.rpc("is_super_admin");
const isOrgAdmin = async (orgId: string) => {
  const { data } = await supabase.from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("organization_id", orgId);
  return (data || []).some((r: any) => 
    ["ORG_ADMIN", "SUPER_ADMIN"].includes(r.role)
  );
};
```

**Methods:**
- `GET /` - List users (org-scoped)
- `POST /` - Create user with role assignment
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user

**Canonical Field Handling:**
- Prefers `user_id` over `id` for consistency
- Returns both for backward compatibility

**Audit Logging:** All user modifications logged

---

#### 4. `admin-features`
**File:** `/supabase/functions/admin-features/index.ts` (14.8 KB)
**Purpose:** Manage feature flags and entitlements

**Access Control:**
```typescript
// Extract user from token
const { data: { user }, error: userError } = 
  await supabaseAdmin.auth.getUser(token);

// Check super admin
const { data: isSuperAdmin } = 
  await supabaseAdmin.rpc('is_super_admin', { user_id: user.id });
```

**Actions:**
- `list_platform_features` - List all features (super admin only)
- `list_organization_features` - List org's features
- `toggle_organization_feature` - Enable/disable for org
- `create_user_override` - Override feature for specific user
- `delete_user_override` - Remove user override

**Organization Filtering:**
- Platform features: super admin only
- Organization features: org admin + super admin

---

#### 5. `admin-ui-permissions`
**File:** `/supabase/functions/admin-ui-permissions/index.ts` (3.4 KB)
**Purpose:** Manage UI route permissions per organization

**Access Control:**
```typescript
// Check membership or super admin
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", uid)
  .eq("organization_id", orgId);

const isMember = (roles || []).length > 0;
const { data: sa } = await supabase.rpc("is_super_admin");

if (!isMember && !sa) return json({ error: "forbidden" }, 403);

// verify admin for modifications
const isAdmin = sa || (roles || [])
  .some((r: any) => ["ORG_ADMIN", "SUPER_ADMIN"].includes(r.role));
```

**Methods:**
- `GET` - Get UI permissions for user + org
- `PUT` - Update UI permissions (admin only)

**Organization Scoping:** Via org_id parameter

---

#### 6. `admin-recent-activity`
**File:** `/supabase/functions/admin-recent-activity/index.ts` (2.7 KB)
**Purpose:** Fetch recent system activity for admin dashboard

**Access Control:**
```typescript
const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
  user_id: user.user.id 
});
if (!isSuperAdmin) throw new Error('Super admin access required');
```

**Access Level:** Super admin only

**Queries:**
- Recent organizations (sorted by creation date)
- Recent users
- Formats as activity feed

---

#### 7. `admin-health`
**File:** `/supabase/functions/admin-health/index.ts` (1.2 KB)
**Purpose:** System health check endpoint

**Status:** Placeholder/mock implementation

---

#### 8. `admin-whoami`
**File:** `/supabase/functions/admin-whoami/index.ts`
**Purpose:** Get current authenticated user's info

**Access Control:** Requires authentication only

---

#### 9. `admin-users-invite`
**File:** `/supabase/functions/admin-users-invite/index.ts`
**Purpose:** Send user invitations

**Status:** Exists but full implementation not reviewed

---

### Key Integration Pattern: `auth-utils.ts`

**File:** `/supabase/functions/_shared/auth-utils.ts` (300 lines)

**Core Functions:**

1. **`resolveUserPermissions(supabase, user_id, requested_org_id?)`**
   - Queries `user_permissions_unified` view
   - Returns user's permissions with organization context
   - Supports permission escalation for super admins

2. **`resolveAuthContext(supabase, requested_org_id?)`**
   - Complete auth context with user + permissions
   - Loads organization features + demo status
   - Returns: `{ user, permissions, hasOrgAccess, features, isDemo }`

3. **`requireOrgAccess(authContext, requiredRoles?)`**
   - Standard authorization check
   - Validates org access + role requirements

4. **`hasFeatureAccess(authContext, feature_key)`**
   - Checks if user has access to feature flag
   - Super admins bypass all checks

---

## PART 3: ORGANIZATION FILTERING PATTERNS

### Pattern 1: Row Level Security (RLS) - PRIMARY

**Applied to these tables:**

1. **organizations**
   ```sql
   CREATE POLICY "users_see_own_organization"
   ON public.organizations
   FOR SELECT
   TO authenticated
   USING (
     id IN (
       SELECT organization_id
       FROM user_roles
       WHERE user_id = auth.uid()
     )
     OR EXISTS (
       SELECT 1
       FROM user_roles
       WHERE user_id = auth.uid()
         AND role = 'super_admin'
     )
   );
   ```

2. **user_roles**
   ```sql
   CREATE POLICY "Users can view own role"
   ON public.user_roles
   FOR SELECT
   TO authenticated
   USING (user_id = auth.uid());
   ```

3. **theme_impact_scores**
   ```sql
   CREATE POLICY "Users see their org theme scores"
   ON theme_impact_scores FOR SELECT
   USING (
     organization_id IN (
       SELECT ur.organization_id
       FROM user_roles ur
       WHERE ur.user_id = auth.uid()
     )
     OR EXISTS (
       SELECT 1
       FROM user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role = 'SUPER_ADMIN'
     )
   );
   ```

4. **audit_logs**
   ```sql
   CREATE POLICY "users_view_own_audit_logs"
   ON public.audit_logs
   FOR SELECT
   TO authenticated
   USING (
     user_id = auth.uid()
     OR (
       organization_id IN (
         SELECT organization_id
         FROM user_roles
         WHERE user_id = auth.uid()
           AND role IN ('org_admin', 'super_admin')
       )
     )
   );
   ```

### Pattern 2: Edge Function Access Control - SECONDARY

**Typical Pattern:**
```typescript
// 1. Authenticate user
const { data: user } = await supabase.auth.getUser();
if (!user?.user) return json({ error: "unauthorized" }, 401);

// 2. Check super admin
const { data: isSA } = await supabase.rpc("is_super_admin");

// 3. Check organization membership
const { data: roles } = await supabase
  .from("user_roles")
  .select("role, organization_id")
  .eq("user_id", uid);

// 4. Check specific permission
const isOrgAdmin = roles.some(r => ["ORG_ADMIN", "SUPER_ADMIN"].includes(r.role));

// 5. Enforce access
if (!isSA && !isOrgAdmin) return json({ error: "forbidden" }, 403);
```

### Pattern 3: Query-Level Filtering

**Applied in Edge Functions:**
```typescript
// For non-super-admins: restrict to their orgs
if (!isSA) {
  const { data: orgs } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", uid);
  const orgIds = orgs.map(r => r.organization_id);
  
  query = query.in("organization_id", orgIds);
}
```

---

## PART 4: ADMIN-SPECIFIC FEATURES

### Super Admin Functions
- `is_super_admin()` RPC - Check if user is platform super admin
- Access to all organizations
- Can bypass all RLS policies (via service role)
- Can view all audit logs
- Can manage platform features

### Org Admin Functions
- Can manage users in their organization
- Can view audit logs for their organization
- Can toggle organization-specific features
- Cannot see other organizations' data

### RLS Service Role Access

Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` for:
- Admin operations bypassing RLS
- Agency expansion queries
- Audit log insertions
- Cross-organization admin tasks

**Policies:**
```sql
CREATE POLICY "service_role_full_access"
ON <table>
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## PART 5: SUMMARY TABLE

| Component | Location | Organization Filtering | Access Control | Admin Only |
|-----------|----------|----------------------|-----------------|-----------|
| user_permissions_unified | migration 20251109050000 | Via user_roles | View RLS | No |
| vw_critical_themes | migration 20250111000000 | Table RLS | View RLS | Super Admin sees all |
| vw_competitor_benchmark_matrix | migration 20250110000000 | Table RLS | View RLS | No |
| vw_feature_gap_opportunities | migration 20250110000000 | Table RLS | View RLS | No |
| audit_logs_recent | migration 20251109010000 | Table RLS | View RLS | Org Admin+ can see all |
| admin-organizations | supabase/functions/ | User role check | Super Admin > Org Admin | Yes |
| admin-users | supabase/functions/ | User role check | Super Admin > Org Admin | Yes |
| admin-features | supabase/functions/ | RPC check | Super Admin only | Yes |
| admin-ui-permissions | supabase/functions/ | Query parameter | Org Member check | Org Admin for PUT |
| admin-recent-activity | supabase/functions/ | None (platform-wide) | Super Admin only | Yes |

---

## PART 6: SECURITY AUDIT FINDINGS

### Strengths
1. ✅ Unified permission view (`user_permissions_unified`) - single source of truth
2. ✅ RLS policies on critical tables (organizations, user_roles, audit_logs)
3. ✅ Audit logging infrastructure for compliance
4. ✅ Consistent access control pattern across Edge Functions
5. ✅ Service role separation for admin operations
6. ✅ Super admin distinction from org admin

### Observations
1. ⚠️ Some Edge Functions check RLS-protected tables instead of relying solely on RLS
   - This is defensive programming (good)
   - Double-checks at application layer

2. ⚠️ Enum case inconsistency handled at view level
   - Database stores: UPPERCASE (ORG_ADMIN)
   - View returns: lowercase (org_admin)
   - Frontend expects: lowercase
   - Currently works but adds complexity

3. ⚠️ Agency client relationships may bypass basic org scoping
   - `expandAgencyAccess()` in auth-utils extends org access
   - Should verify this is intentional

4. ⚠️ Some older functions still reference `is_superadmin` JWT claim
   - Being phased out in favor of database check
   - Migration 20251108200000 removes JWT-based super admin

---

## QUICK REFERENCE: ACCESSING FILTERED DATA

### For Frontend (usePermissions Hook)
```typescript
// Query user_permissions_unified (protected by user_roles RLS)
const { data: permissions } = await supabase
  .from('user_permissions_unified')
  .select('*')
  .eq('user_id', user.id);
```

### For Edge Functions (Service Role)
```typescript
// Use auth-utils for consistent permission resolution
import { resolveAuthContext } from './_shared/auth-utils';

const authContext = await resolveAuthContext(supabase, requestedOrgId);
if (!authContext?.hasOrgAccess) {
  return json({ error: "forbidden" }, 403);
}

// Query data for user's organization(s)
const { data } = await supabase
  .from('table')
  .select('*')
  .in('organization_id', [authContext.permissions.org_id]);
```

### For Admin Operations
```typescript
// Check super admin
const { data: isSA } = await supabase.rpc("is_super_admin");

if (!isSA) {
  return json({ error: "super admin required" }, 403);
}

// Can now query across all organizations
const { data: allOrgs } = await supabase
  .from('organizations')
  .select('*');
```

---

## RECOMMENDATIONS

1. **Standardize View Naming:** All analytics views should have `vw_` prefix for consistency
2. **Document RLS Policy Purpose:** Add inline comments explaining each policy's intent
3. **Consolidate Enum Values:** Decide on UPPERCASE vs lowercase at database schema level
4. **Test RLS Bypass:** Verify service_role policies work as expected in production
5. **Monitor Audit Logs:** Set up alerts for suspicious access patterns
6. **Review Agency Relationships:** Document agency expansion access model
7. **Supabase Dashboard Integration:** Expose critical views in admin dashboard

---

